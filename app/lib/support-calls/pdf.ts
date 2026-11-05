import fs from 'fs';
import path from 'path';
import { excessMinutes, formatLabourDisplay } from './labour';
import { INTERNAL_TRAVEL_RATE_ZAR } from './constants';

/* Server-side PDF builders for job cards and finance reports (jsPDF + Think Digital logo). */

let cachedLogoDataUrl: string | null | undefined;

function thinkDigitalLogoDataUrl(): string | null {
  if (cachedLogoDataUrl !== undefined) return cachedLogoDataUrl;
  try {
    const logoPath = path.join(process.cwd(), 'public', 'think-digital-logo.png');
    const buf = fs.readFileSync(logoPath);
    cachedLogoDataUrl = `data:image/png;base64,${buf.toString('base64')}`;
  } catch {
    cachedLogoDataUrl = null;
  }
  return cachedLogoDataUrl;
}

type Row = Record<string, unknown>;

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 14;
const LINE = 5;

function s(v: unknown): string {
  if (v === null || v === undefined || v === '') return '-';
  return String(v).replace(/[—–]/g, '-').replace(/[^\x20-\x7E\u00A0-\u00FF\n]/g, '');
}

function fmtDt(v: unknown): string {
  if (!v) return '-';
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg', hour12: false });
}

function money(v: unknown): string {
  const n = Number(v);
  return Number.isFinite(n) ? `R ${n.toFixed(2)}` : '-';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Doc = any;

class Writer {
  y = MARGIN;
  constructor(public doc: Doc) {}

  private ensure(h: number) {
    if (this.y + h > PAGE_H - MARGIN) {
      this.doc.addPage();
      this.y = MARGIN;
    }
  }

  brandHeader(text: string, sub?: string) {
    const logo = thinkDigitalLogoDataUrl();
    if (logo) {
      try {
        this.doc.addImage(logo, 'PNG', MARGIN, this.y, 48, 14);
      } catch {
        /* ignore logo embed failure */
      }
      this.y += 16;
    }
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(11);
    this.doc.setTextColor(30, 58, 95);
    this.doc.text('Think Digital', MARGIN, this.y + 4);
    this.doc.setTextColor(0);
    this.y += 8;
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(16);
    this.doc.text(s(text), MARGIN, this.y + 6);
    this.y += 9;
    if (sub) {
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(9);
      this.doc.setTextColor(100);
      this.doc.text(s(sub), MARGIN, this.y + 3);
      this.doc.setTextColor(0);
      this.y += 6;
    }
    this.doc.setDrawColor(14, 165, 233);
    this.doc.line(MARGIN, this.y, PAGE_W - MARGIN, this.y);
    this.y += 4;
  }

  title(text: string, sub?: string) {
    this.brandHeader(text, sub);
  }

  heading(text: string) {
    this.ensure(12);
    this.y += 3;
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(11);
    this.doc.text(s(text), MARGIN, this.y + 4);
    this.y += 7;
  }

  kv(label: string, value: unknown) {
    this.doc.setFontSize(9);
    const lines: string[] = this.doc.splitTextToSize(s(value), PAGE_W - MARGIN * 2 - 42);
    this.ensure(lines.length * LINE + 1);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(`${label}:`, MARGIN, this.y + 4);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(lines, MARGIN + 42, this.y + 4);
    this.y += lines.length * LINE + 1;
  }

  para(text: unknown, indent = 0) {
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9);
    const lines: string[] = this.doc.splitTextToSize(s(text), PAGE_W - MARGIN * 2 - indent);
    for (const line of lines) {
      this.ensure(LINE);
      this.doc.text(line, MARGIN + indent, this.y + 4);
      this.y += LINE;
    }
    this.y += 1;
  }

  rule() {
    this.ensure(3);
    this.doc.setDrawColor(203, 213, 225);
    this.doc.line(MARGIN, this.y + 1, PAGE_W - MARGIN, this.y + 1);
    this.y += 3;
  }

  image(dataUrl: string, w: number, h: number) {
    this.ensure(h + 4);
    try {
      this.doc.addImage(dataUrl, 'PNG', MARGIN, this.y, w, h);
    } catch {
      this.para('[signature image could not be embedded]');
    }
    this.y += h + 2;
  }
}

async function newDoc(): Promise<Doc> {
  const mod = await import('jspdf');
  const JsPdf = (mod as unknown as { jsPDF: new (opts?: unknown) => Doc }).jsPDF;
  return new JsPdf({ unit: 'mm', format: 'a4' });
}

function toBuffer(doc: Doc): Buffer {
  return Buffer.from(doc.output('arraybuffer') as ArrayBuffer);
}

function writeVisits(w: Writer, visits: Row[], opts: { money: boolean; names: Record<string, string> }) {
  if (!visits.length) {
    w.para('No visits recorded.');
    return;
  }
  for (const v of visits) {
    const who =
      v.party_type === 'external'
        ? `Partner visit`
        : opts.names[String(v.assignment_id)] || 'Team member';
    w.para(`Visit #${v.visit_number} - ${who} - ${s(v.visit_date)}`);
    w.kv('Arrived', fmtDt(v.arrived_at));
    w.kv('Departed', fmtDt(v.departed_at));
    if (v.labour_minutes != null) {
      w.kv('Labour', formatLabourDisplay(Number(v.labour_minutes)).replace(/—/g, '-'));
      if (excessMinutes(Number(v.labour_minutes)) > 0) {
        w.kv('Excess minutes', excessMinutes(Number(v.labour_minutes)));
      }
    }
    if (opts.money) {
      if (v.travel_km != null) {
        w.kv('Travel', `${v.travel_km} km @ R${INTERNAL_TRAVEL_RATE_ZAR.toFixed(2)}/km = ${money(v.travel_amount_zar)}`);
      }
      if (v.external_travel_cost_zar != null) w.kv('External travel cost', money(v.external_travel_cost_zar));
    }
    w.kv('Diagnosis', v.diagnosis);
    w.kv('Work performed', v.work_performed);
    w.kv('Test results', v.test_results);
    if (v.incomplete) {
      w.kv('Status', `INCOMPLETE - ${s(v.incomplete_reason)}`);
      if (v.dependency_notes) w.kv('Dependency', v.dependency_notes);
    }
    w.rule();
  }
}

function writeHardware(w: Writer, items: Row[]) {
  if (!items.length) {
    w.para('No hardware recorded.');
    return;
  }
  for (const h of items) {
    const parts = [`${s(h.quantity)} x ${s(h.description)}`];
    if (h.make_model) parts.push(`(${s(h.make_model)})`);
    w.para(parts.join(' '));
    if (h.old_equipment || h.new_equipment) {
      w.para(`Replaced: ${s(h.old_equipment)} -> ${s(h.new_equipment)}`, 4);
    }
    if (h.old_mac || h.new_mac) w.para(`MAC: ${s(h.old_mac)} -> ${s(h.new_mac)}`, 4);
    if (h.serial_number) w.para(`Serial: ${s(h.serial_number)}`, 4);
    if (h.replacement_reason) w.para(`Reason: ${s(h.replacement_reason)}`, 4);
  }
}

export type JobCardPdfInput = {
  sc: Row;
  version: number;
  visits: Row[];
  hardware: Row[];
  memberNames: Record<string, string>; // assignment_id -> name
  signature?: { signer_name: string; signer_position?: string | null; signer_company?: string | null; signed_at: string; signature_data: string } | null;
};

export async function buildJobCardPdf(input: JobCardPdfInput): Promise<Buffer> {
  const { sc } = input;
  const doc = await newDoc();
  const w = new Writer(doc);
  w.title(`Job Card ${s(sc.support_call_number)}`, `Version ${input.version} - generated ${fmtDt(new Date().toISOString())}`);

  w.heading('Customer & site');
  w.kv('Client', sc.client);
  w.kv('Estate / building', sc.estate_or_building);
  w.kv('CML location', sc.cml_location);
  w.kv('On-site location', sc.onsite_location || sc.site_name);
  w.kv('Location type', sc.location);
  w.kv('Responsible person', [sc.responsible_name, sc.responsible_position, sc.responsible_organisation].filter(Boolean).join(', ') || '-');

  w.heading('Reported issue');
  w.kv('Reported', fmtDt(sc.reported_at));
  w.para(sc.original_description);
  if (sc.operational_description) {
    w.kv('Operational notes', sc.operational_description);
  }

  w.heading('Work carried out');
  writeVisits(w, input.visits, { money: false, names: input.memberNames });

  w.heading('Hardware');
  writeHardware(w, input.hardware);

  w.heading('Customer acceptance');
  if (input.signature) {
    w.kv('Signed by', input.signature.signer_name);
    w.kv('Position', input.signature.signer_position);
    w.kv('Company', input.signature.signer_company);
    w.kv('Signed at', fmtDt(input.signature.signed_at));
    if (input.signature.signature_data.startsWith('data:image/png')) {
      w.image(input.signature.signature_data, 70, 28);
    }
  } else {
    w.para('Awaiting customer signature.');
  }

  return toBuffer(doc);
}

export type FinanceReportInput = {
  sc: Row;
  version: number;
  visits: Row[];
  hardware: Row[];
  quotes: Row[];
  memberNames: Record<string, string>;
  jobCardVersion: number | null;
  signedBy: string | null;
  signatureException: Row | null;
};

export async function buildFinanceReportPdf(input: FinanceReportInput): Promise<Buffer> {
  const { sc } = input;
  const doc = await newDoc();
  const w = new Writer(doc);
  w.title(`Finance Handover ${s(sc.support_call_number)}`, `Version ${input.version} - generated ${fmtDt(new Date().toISOString())}`);

  w.heading('Summary');
  w.kv('Client', sc.client);
  w.kv('Site', sc.site_name);
  w.kv('Priority', sc.priority);
  w.kv('Supplier invoice', sc.supplier_invoice_number);
  w.kv('Third-party job card', sc.third_party_job_card_number);
  w.kv('PO number', sc.po_number);
  w.kv('External quote ref', sc.external_quote_reference);
  w.kv('Job card', input.jobCardVersion ? `Version ${input.jobCardVersion}` : '-');
  if (input.signedBy) w.kv('Signed by', input.signedBy);
  if (input.signatureException) {
    w.kv('Signature not obtained', `${s(input.signatureException.reason)} - ${s(input.signatureException.explanation)}`);
  }

  w.heading('Labour & travel (internal reimbursement rate R5.80/km)');
  const internal = input.visits.filter((v) => v.party_type === 'internal');
  const totalMinutes = internal.reduce((n, v) => n + (Number(v.labour_minutes) || 0), 0);
  const totalExcess = internal.reduce((n, v) => n + excessMinutes(Number(v.labour_minutes) || 0), 0);
  const totalTravel = internal.reduce((n, v) => n + (Number(v.travel_amount_zar) || 0), 0);
  const externalTravel = input.visits
    .filter((v) => v.party_type === 'external')
    .reduce((n, v) => n + (Number(v.external_travel_cost_zar) || 0), 0);
  w.kv('Internal labour (minutes)', totalMinutes);
  w.kv('Excess minutes (beyond first hour)', totalExcess);
  w.kv('Internal travel total', money(totalTravel));
  w.kv('External travel cost (as supplied)', money(externalTravel));
  w.para('No labour fee has been calculated; labour is reported in minutes only.');

  w.heading('Quotes');
  if (!input.quotes.length) w.para('No quotes recorded.');
  for (const q of input.quotes) {
    w.para(
      `${s(q.supplier_name)} rev ${s(q.revision)} - ${money(q.amount)} ${s(q.currency)} - ${s(q.status).toUpperCase()}${q.quote_reference ? ` (ref ${s(q.quote_reference)})` : ''}`
    );
  }

  w.heading('Visits');
  writeVisits(w, input.visits, { money: true, names: input.memberNames });

  w.heading('Hardware');
  writeHardware(w, input.hardware);

  return toBuffer(doc);
}
