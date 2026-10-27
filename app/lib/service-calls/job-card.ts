import type { ServiceCallJobCard } from './types';

export type JobCardValidationResult = {
  ok: boolean;
  missing: string[];
};

/** Required fields before a job card can be accepted / call marked ready to invoice. */
export function validateJobCardForAccept(
  card: Partial<ServiceCallJobCard> | null | undefined
): JobCardValidationResult {
  const missing: string[] = [];
  if (!card) {
    return { ok: false, missing: ['Job card missing'] };
  }
  if (!card.diagnosis?.trim()) missing.push('Diagnosis');
  if (!card.work_performed?.trim()) missing.push('Work performed');
  if (card.labour_minutes == null || Number(card.labour_minutes) < 0) missing.push('Labour / time spent');
  const hasParts =
    card.parts_none === true ||
    (Array.isArray(card.parts_used) && card.parts_used.length > 0) ||
    (typeof card.parts_used === 'string' && String(card.parts_used).trim().length > 0);
  if (!hasParts) missing.push('Parts used (or mark none)');
  if (!card.test_results?.trim()) missing.push('Test results');
  const hasEvidence = Boolean(card.evidence_notes?.trim() || card.evidence_exception?.trim());
  if (!hasEvidence) missing.push('Evidence notes or evidence exception');
  const hasSignoff =
    card.customer_signoff_obtained === true || Boolean(card.signoff_exception?.trim());
  if (!hasSignoff) missing.push('Customer sign-off or exception reason');

  return { ok: missing.length === 0, missing };
}

export function validateJobCardForSubmit(
  card: Partial<ServiceCallJobCard> | null | undefined
): JobCardValidationResult {
  // Same rules on submit so incomplete cards are returned early
  return validateJobCardForAccept(card);
}
