import { normalizeExternalRef } from './normalize';
import { cleanIso, cleanStr, parsePriority } from './server';

const TEXT_FIELDS = [
  'report_method',
  'reporter_name',
  'reporter_organisation',
  'reporter_email',
  'reporter_phone',
  'reporter_contact',
  'client_houston_userid',
  'operational_description',
  'client',
  'site_name',
  'estate_or_building',
  'cml_location',
  'onsite_location',
  'responsible_name',
  'responsible_position',
  'responsible_organisation',
  'responsible_email',
  'responsible_phone',
] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+]?[\d\s().-]{7,}$/;

/** Classify a single Reporter Contact value as email or phone. */
export function classifyReporterContact(raw: string | null | undefined): {
  contact: string | null;
  email: string | null;
  phone: string | null;
  error?: string;
} {
  const contact = cleanStr(raw, 200);
  if (!contact) return { contact: null, email: null, phone: null };
  if (EMAIL_RE.test(contact)) return { contact, email: contact, phone: null };
  if (PHONE_RE.test(contact.replace(/\s/g, ''))) return { contact, email: null, phone: contact };
  return {
    contact,
    email: null,
    phone: null,
    error:
      'Reporter Contact must be a valid email address or telephone number (only one is required).',
  };
}

/** Apply reporter_contact onto values, mirroring into reporter_email or reporter_phone. */
export function applyReporterContact(
  values: Record<string, unknown>,
  body: Record<string, unknown>,
  opts?: { require?: boolean }
): string | undefined {
  if (!('reporter_contact' in body) && !opts?.require) return undefined;
  const classified = classifyReporterContact(
    (body.reporter_contact as string | undefined) ?? (values.reporter_contact as string | null)
  );
  if (classified.error) return classified.error;
  if (opts?.require && !classified.contact) {
    return 'Support Call cannot be submitted. Enter a Reporter Contact (email or telephone) before continuing.';
  }
  if ('reporter_contact' in body || classified.contact) {
    values.reporter_contact = classified.contact;
    values.reporter_email = classified.email;
    values.reporter_phone = classified.phone;
  }
  return undefined;
}

const UUID_FIELDS = ['client_id', 'estate_id', 'cml_location_id', 'onsite_location_id'] as const;

const REF_FIELDS = [
  'supplier_invoice_number',
  'third_party_job_card_number',
  'po_number',
  'external_quote_reference',
] as const;

/**
 * Parses an intake/site/priority payload. Only keys PRESENT in the body are returned
 * (so it is safe for PATCH). `original_description` is deliberately never accepted here.
 */
export function parseIntake(body: Record<string, unknown>): {
  values: Record<string, unknown>;
  error?: string;
} {
  const values: Record<string, unknown> = {};

  for (const f of TEXT_FIELDS) {
    if (f in body) values[f] = cleanStr(body[f], f === 'operational_description' ? 20000 : 500);
  }

  for (const f of UUID_FIELDS) {
    if (f in body) {
      const raw = body[f];
      if (raw === null || raw === '' || raw === undefined) values[f] = null;
      else if (typeof raw === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw)) {
        values[f] = raw;
      } else {
        return { values, error: `${f} must be a UUID or empty` };
      }
    }
  }

  if ('reported_at' in body) values.reported_at = cleanIso(body.reported_at);

  if ('location' in body) {
    const loc = body.location;
    if (loc === null || loc === '' || loc === undefined) values.location = null;
    else if (loc === 'on-site' || loc === 'remote') values.location = loc;
    else return { values, error: "location must be 'on-site' or 'remote'" };
  }

  if ('priority' in body) {
    const p = parsePriority(body.priority, 'Medium');
    if (typeof body.priority === 'string' && p.toLowerCase() !== body.priority.trim().toLowerCase()) {
      return { values, error: 'priority must be Critical, High, Medium or Low' };
    }
    values.priority = p;
  }

  for (const f of REF_FIELDS) {
    if (f in body) {
      const raw = cleanStr(body[f], 200);
      values[f] = raw;
      values[`${f}_norm`] = normalizeExternalRef(raw);
    }
  }

  const contactErr = applyReporterContact(values, body);
  if (contactErr) return { values, error: contactErr };

  return { values };
}
