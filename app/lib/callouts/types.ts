export type CalloutRecordStatus =
  | 'draft'
  | 'processing'
  | 'needs_review'
  | 'approved'
  | 'archived';

export type CalloutDocType = 'job_card' | 'invoice';

export type CalloutDocumentProcessingStatus =
  | 'queued'
  | 'ocr'
  | 'extracted'
  | 'enriched'
  | 'failed';

export type CalloutJobType =
  | 'preprocess'
  | 'ocr_extract'
  | 'match_and_flag'
  | 'ai_enrich'
  | 'reindex_search';

export type CalloutJobStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'dead_letter';

export type CalloutFlagStatus = 'open' | 'approved' | 'rejected' | 'false_positive';

export type CalloutLinkType = 'auto_exact_ref' | 'manual';

export type CalloutFieldSource = 'extraction' | 'manual' | 'ai_suggestion_accepted';

export interface Contractor {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
}

export interface CalloutRecord {
  id: string;
  contractor_id: string;
  status: CalloutRecordStatus;
  primary_job_card_number: string | null;
  primary_site_name: string | null;
  service_date: string | null;
  total_billed: number | null;
  compliance_score: number | null;
  compliance_breakdown_json: Record<string, unknown>;
  ai_summary: string | null;
  fault_classification: string[];
  created_at: string;
  updated_at: string;
  contractors?: Contractor;
}

export interface CalloutDocument {
  id: string;
  callout_record_id: string | null;
  contractor_id: string;
  doc_type: CalloutDocType;
  upload_batch_id: string | null;
  storage_path: string;
  file_name: string;
  file_hash_sha256: string;
  page_count: number | null;
  scan_quality_score: number | null;
  processing_status: CalloutDocumentProcessingStatus;
  uploaded_at: string;
  source: 'manual' | 'bulk_import';
}

export interface CalloutFlag {
  id: string;
  callout_record_id: string;
  document_id: string | null;
  flag_type: string;
  severity: string;
  title: string;
  detail_json: Record<string, unknown>;
  rule_id: string | null;
  ai_generated: boolean;
  status: CalloutFlagStatus;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
}

export interface CalloutAuditEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  payload_json: Record<string, unknown>;
  user_id: string | null;
  created_at: string;
}

export const CALLOUT_STORAGE_BUCKET = 'callout-documents';

export const FIELD_KEYS = [
  'service_date',
  'job_card_number',
  'invoice_number',
  'referenced_job_card_number',
  'site_name',
  'site_location',
  'technician_name',
  'hours_worked',
  'work_description',
  'materials_used',
  'labour_charges',
  'travel_charges',
  'subtotal',
  'vat',
  'total',
  'po_number',
  'signature_present',
  'vat_number',
] as const;

export type CalloutFieldKey = (typeof FIELD_KEYS)[number];
