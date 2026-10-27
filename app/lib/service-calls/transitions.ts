import type { InvoicingStatus, TechnicalStatus } from './types';

const TECH_TRANSITIONS: Record<TechnicalStatus, TechnicalStatus[]> = {
  new: ['acknowledgement_pending', 'in_triage', 'cancelled'],
  acknowledgement_pending: ['in_triage', 'cancelled'],
  in_triage: ['remote_resolution', 'awaiting_assignment', 'cancelled'],
  remote_resolution: ['job_card_required', 'cancelled'],
  awaiting_assignment: ['awaiting_acceptance', 'cancelled'],
  awaiting_acceptance: ['scheduled', 'awaiting_assignment', 'cancelled'],
  scheduled: ['on_site', 'awaiting_assignment', 'cancelled'],
  on_site: [
    'repair_and_testing',
    'awaiting_parts_quote_escalation',
    'return_visit_required',
    'job_card_required',
    'cancelled',
  ],
  awaiting_parts_quote_escalation: ['awaiting_assignment', 'scheduled', 'cancelled'],
  return_visit_required: ['awaiting_assignment', 'awaiting_acceptance', 'scheduled', 'cancelled'],
  repair_and_testing: ['job_card_required', 'return_visit_required', 'cancelled'],
  job_card_required: ['job_card_correction_required', 'ready_to_invoice', 'cancelled'],
  job_card_correction_required: ['job_card_required', 'ready_to_invoice', 'cancelled'],
  ready_to_invoice: ['awaiting_customer_confirmation', 'closed', 'cancelled'],
  awaiting_customer_confirmation: ['closed', 'cancelled'],
  closed: [],
  cancelled: [],
};

const INVOICE_TRANSITIONS: Record<InvoicingStatus, InvoicingStatus[]> = {
  not_ready: ['ready_to_invoice', 'voided'],
  ready_to_invoice: ['preparing_invoice', 'voided'],
  preparing_invoice: ['awaiting_charge_review', 'voided'],
  awaiting_charge_review: ['awaiting_additional_approval', 'invoice_issued', 'voided'],
  awaiting_additional_approval: ['invoice_issued', 'voided'],
  invoice_issued: ['payment_outstanding', 'partially_paid', 'paid', 'disputed', 'voided'],
  payment_outstanding: ['partially_paid', 'paid', 'disputed', 'voided'],
  partially_paid: ['paid', 'payment_outstanding', 'disputed', 'voided'],
  paid: ['disputed'],
  disputed: ['payment_outstanding', 'partially_paid', 'paid', 'voided'],
  voided: [],
};

export function canTransitionTechnical(from: TechnicalStatus, to: TechnicalStatus): boolean {
  if (from === to) return true;
  return TECH_TRANSITIONS[from]?.includes(to) ?? false;
}

export function canTransitionInvoicing(from: InvoicingStatus, to: InvoicingStatus): boolean {
  if (from === to) return true;
  return INVOICE_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTechnicalTransition(from: TechnicalStatus, to: TechnicalStatus): void {
  if (!canTransitionTechnical(from, to)) {
    throw new Error(`Invalid technical status transition: ${from} → ${to}`);
  }
}

export function assertInvoicingTransition(from: InvoicingStatus, to: InvoicingStatus): void {
  if (!canTransitionInvoicing(from, to)) {
    throw new Error(`Invalid invoicing status transition: ${from} → ${to}`);
  }
}

export const TECHNICAL_STATUS_LABELS: Record<TechnicalStatus, string> = {
  new: 'New',
  acknowledgement_pending: 'Acknowledgement pending',
  in_triage: 'In triage',
  remote_resolution: 'Remote resolution',
  awaiting_assignment: 'Awaiting assignment',
  awaiting_acceptance: 'Awaiting acceptance',
  scheduled: 'Scheduled',
  on_site: 'On site',
  awaiting_parts_quote_escalation: 'Awaiting parts / quote / escalation',
  return_visit_required: 'Return visit required',
  repair_and_testing: 'Repair and testing',
  job_card_required: 'Job card required',
  job_card_correction_required: 'Job card correction required',
  ready_to_invoice: 'Ready to invoice',
  awaiting_customer_confirmation: 'Awaiting customer confirmation',
  closed: 'Closed',
  cancelled: 'Cancelled',
};

export const INVOICING_STATUS_LABELS: Record<InvoicingStatus, string> = {
  not_ready: 'Not ready',
  ready_to_invoice: 'Ready to invoice',
  preparing_invoice: 'Preparing invoice',
  awaiting_charge_review: 'Awaiting charge review',
  awaiting_additional_approval: 'Awaiting additional approval',
  invoice_issued: 'Invoice issued',
  payment_outstanding: 'Payment outstanding',
  partially_paid: 'Partially paid',
  paid: 'Paid',
  disputed: 'Disputed',
  voided: 'Voided',
};
