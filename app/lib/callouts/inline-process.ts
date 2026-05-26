import type { SupabaseClient } from '@supabase/supabase-js';
import { CALLOUT_STORAGE_BUCKET } from './types';
import { extractFieldsFromText, extractPdfText } from './extract-text';
import { normalizeJobCardRef } from './normalize';

type DocRow = {
  id: string;
  contractor_id: string;
  doc_type: 'job_card' | 'invoice';
  callout_record_id: string | null;
  storage_path: string;
  file_name: string;
};

export async function processCalloutDocumentInline(
  admin: SupabaseClient,
  documentId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { data: doc, error: docErr } = await admin
    .from('callout_documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (docErr || !doc) return { ok: false, error: 'Document not found' };
  const document = doc as DocRow;

  await admin.from('callout_documents').update({ processing_status: 'ocr' }).eq('id', documentId);

  const { data: fileData, error: dlErr } = await admin.storage
    .from(CALLOUT_STORAGE_BUCKET)
    .download(document.storage_path);

  if (dlErr || !fileData) {
    await admin.from('callout_documents').update({ processing_status: 'failed' }).eq('id', documentId);
    return { ok: false, error: dlErr?.message || 'Download failed' };
  }

  const buffer = Buffer.from(await fileData.arrayBuffer());
  let ocrText = '';
  let pageCount = 1;
  try {
    const extracted = await extractPdfText(buffer);
    ocrText = extracted.text;
    pageCount = extracted.pageCount;
  } catch (e) {
    await admin.from('callout_documents').update({ processing_status: 'failed' }).eq('id', documentId);
    return { ok: false, error: e instanceof Error ? e.message : 'PDF parse failed' };
  }

  const confidence = ocrText.trim().length > 50 ? 0.85 : 0.45;

  const { data: template } = await admin
    .from('contractor_extraction_templates')
    .select('version, config_json')
    .eq('contractor_id', document.contractor_id)
    .eq('doc_type', document.doc_type)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const config = (template?.config_json ?? {}) as { regex?: Record<string, string>; job_card_prefix?: string };
  const fields = extractFieldsFromText(ocrText, config, document.doc_type);

  const { data: extraction, error: extErr } = await admin
    .from('callout_extractions')
    .insert({
      document_id: documentId,
      template_version: template?.version ?? null,
      extractor_version: 'inline-1.0.0',
      raw_json: { fields, page_count: pageCount },
      ocr_text: ocrText,
      ocr_confidence_avg: confidence,
    })
    .select('id')
    .single();

  if (extErr || !extraction) {
    await admin.from('callout_documents').update({ processing_status: 'failed' }).eq('id', documentId);
    return { ok: false, error: extErr?.message || 'Extraction insert failed' };
  }

  for (const [key, val] of Object.entries(fields)) {
    const text = String(val);
    let numeric: number | null = null;
    const n = parseFloat(text.replace(/[R,\s]/gi, ''));
    if (Number.isFinite(n)) numeric = n;

    const { data: existingFv } = await admin
      .from('callout_field_values')
      .select('id, source')
      .eq('document_id', documentId)
      .eq('field_key', key)
      .maybeSingle();

    const row = {
      document_id: documentId,
      field_key: key,
      value_text: text,
      value_numeric: numeric,
      last_extraction_id: extraction.id,
      updated_at: new Date().toISOString(),
    };

    if (existingFv?.id) {
      await admin
        .from('callout_field_values')
        .update({
          ...row,
          source: existingFv.source === 'manual' ? 'manual' : 'extraction',
        })
        .eq('id', existingFv.id);
    } else {
      await admin.from('callout_field_values').insert({ ...row, source: 'extraction' });
    }
  }

  await admin
    .from('callout_documents')
    .update({
      processing_status: 'extracted',
      page_count: pageCount,
      scan_quality_score: confidence,
    })
    .eq('id', documentId);

  let recordId = document.callout_record_id;

  if (document.doc_type === 'invoice') {
    const ref = normalizeJobCardRef(fields.referenced_job_card_number);
    if (ref) {
      const { data: jcFields } = await admin
        .from('callout_field_values')
        .select('document_id, value_text')
        .eq('field_key', 'job_card_number');

      let jobCardDocId: string | null = null;
      for (const row of jcFields ?? []) {
        if (normalizeJobCardRef(row.value_text) === ref) {
          const { data: jcDoc } = await admin
            .from('callout_documents')
            .select('id, contractor_id')
            .eq('id', row.document_id)
            .eq('contractor_id', document.contractor_id)
            .maybeSingle();
          if (jcDoc) {
            jobCardDocId = jcDoc.id;
            break;
          }
        }
      }

      if (jobCardDocId) {
        const { data: jcDocFull } = await admin.from('callout_documents').select('callout_record_id').eq('id', jobCardDocId).single();
        recordId = jcDocFull?.callout_record_id ?? recordId;
        if (!recordId) {
          const { data: newRec } = await admin
            .from('callout_records')
            .insert({
              contractor_id: document.contractor_id,
              status: 'processing',
              primary_job_card_number: fields.referenced_job_card_number,
            })
            .select('id')
            .single();
          recordId = newRec?.id ?? null;
        }
        if (recordId) {
          await admin.from('callout_documents').update({ callout_record_id: recordId }).eq('id', documentId);
          await admin.from('callout_documents').update({ callout_record_id: recordId }).eq('id', jobCardDocId);
          await admin.from('callout_document_links').upsert(
            {
              callout_record_id: recordId,
              job_card_document_id: jobCardDocId,
              invoice_document_id: documentId,
              link_type: 'auto_exact_ref',
              link_evidence: { referenced_job_card_number: fields.referenced_job_card_number, normalized: ref },
            },
            { onConflict: 'invoice_document_id' },
          );
        }
      } else if (!recordId) {
        const { data: newRec } = await admin
          .from('callout_records')
          .insert({ contractor_id: document.contractor_id, status: 'needs_review' })
          .select('id')
          .single();
        recordId = newRec?.id ?? null;
        await admin.from('callout_documents').update({ callout_record_id: recordId }).eq('id', documentId);
        if (recordId) {
          await insertFlag(admin, recordId, documentId, 'missing_job_card_reference', 'high', 'No matching job card for invoice reference', 'RULE_MISSING_JC_REF');
        }
      }
    } else if (!recordId) {
      const { data: newRec } = await admin
        .from('callout_records')
        .insert({ contractor_id: document.contractor_id, status: 'needs_review' })
        .select('id')
        .single();
      recordId = newRec?.id ?? null;
      await admin.from('callout_documents').update({ callout_record_id: recordId }).eq('id', documentId);
      if (recordId) {
        await insertFlag(admin, recordId, documentId, 'missing_job_card_reference', 'high', 'Invoice missing job card reference', 'RULE_MISSING_JC_REF');
      }
    }
  } else {
    if (!recordId) {
      const { data: newRec } = await admin
        .from('callout_records')
        .insert({
          contractor_id: document.contractor_id,
          status: 'processing',
          primary_job_card_number: fields.job_card_number ?? null,
          primary_site_name: fields.site_name ?? null,
        })
        .select('id')
        .single();
      recordId = newRec?.id ?? null;
      await admin.from('callout_documents').update({ callout_record_id: recordId }).eq('id', documentId);
    }
  }

  if (recordId) {
    const score = computeCompliance(fields, document.doc_type, confidence);
    await admin
      .from('callout_records')
      .update({
        compliance_score: score,
        status: score < 60 ? 'needs_review' : 'processing',
        primary_job_card_number: fields.job_card_number ?? fields.referenced_job_card_number ?? undefined,
        primary_site_name: fields.site_name ?? undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', recordId);

    if (fields.signature_present === 'false' && document.doc_type === 'job_card') {
      await insertFlag(admin, recordId, documentId, 'missing_signature', 'medium', 'Job card signature not detected', 'RULE_MISSING_SIGNATURE');
    }
  }

  await admin.from('callout_documents').update({ processing_status: 'enriched' }).eq('id', documentId);

  await admin.from('callout_audit_log').insert({
    entity_type: 'document',
    entity_id: documentId,
    action: 'extraction.completed',
    payload_json: { mode: 'inline', extraction_id: extraction.id },
  });

  return { ok: true };
}

function computeCompliance(
  fields: Record<string, string>,
  docType: string,
  scanQuality: number,
): number {
  let score = 100;
  if (fields.signature_present === 'false' && docType === 'job_card') score -= 15;
  if (scanQuality < 0.5) score -= 20;
  else if (scanQuality < 0.7) score -= 10;
  if (docType === 'invoice' && !fields.vat_number) score -= 10;
  if (!fields.work_description?.trim()) score -= 10;
  if (!fields.po_number) score -= 5;
  return Math.max(0, Math.min(100, score));
}

async function insertFlag(
  admin: SupabaseClient,
  recordId: string,
  documentId: string,
  flagType: string,
  severity: string,
  title: string,
  ruleId: string,
) {
  await admin.from('callout_flags').insert({
    callout_record_id: recordId,
    document_id: documentId,
    flag_type: flagType,
    severity,
    title,
    rule_id: ruleId,
    status: 'open',
  });
}
