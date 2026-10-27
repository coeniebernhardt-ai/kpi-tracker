export const TECHNICAL_STATUSES = [
  'new',
  'acknowledgement_pending',
  'in_triage',
  'remote_resolution',
  'awaiting_assignment',
  'awaiting_acceptance',
  'scheduled',
  'on_site',
  'awaiting_parts_quote_escalation',
  'return_visit_required',
  'repair_and_testing',
  'job_card_required',
  'job_card_correction_required',
  'ready_to_invoice',
  'awaiting_customer_confirmation',
  'closed',
  'cancelled',
] as const;

export type TechnicalStatus = (typeof TECHNICAL_STATUSES)[number];

export const INVOICING_STATUSES = [
  'not_ready',
  'ready_to_invoice',
  'preparing_invoice',
  'awaiting_charge_review',
  'awaiting_additional_approval',
  'invoice_issued',
  'payment_outstanding',
  'partially_paid',
  'paid',
  'disputed',
  'voided',
] as const;

export type InvoicingStatus = (typeof INVOICING_STATUSES)[number];

export const TERMINAL_TECHNICAL: TechnicalStatus[] = ['closed', 'cancelled'];

export type ServiceCallPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type JobCardStatus = 'draft' | 'submitted' | 'returned' | 'accepted';

export type ServiceCall = {
  id: string;
  service_call_number: string;
  ticket_id: string | null;
  created_by: string | null;
  reported_by: string | null;
  coordinator_id: string | null;
  assigned_technician_id: string | null;
  coordinator_role_label: string | null;
  client: string | null;
  site_name: string | null;
  estate_or_building: string | null;
  cml_location: string | null;
  location: 'on-site' | 'remote' | null;
  title: string;
  description: string | null;
  category: string | null;
  fault_summary: string | null;
  priority: ServiceCallPriority;
  contract_ref: string | null;
  technical_status: TechnicalStatus;
  invoicing_status: InvoicingStatus;
  acknowledged_at: string | null;
  assigned_at: string | null;
  accepted_at: string | null;
  eta_at: string | null;
  arrived_at: string | null;
  resolved_at: string | null;
  job_card_approved_at: string | null;
  ready_to_invoice_at: string | null;
  closed_at: string | null;
  cancelled_at: string | null;
  remote_fix_possible: boolean | null;
  remote_diagnosis: string | null;
  remote_resolution: string | null;
  escalation_reason: string | null;
  parts_required: boolean | null;
  quotation_required: boolean | null;
  quotation_notes: string | null;
  customer_signoff_obtained: boolean | null;
  customer_signoff_notes: string | null;
  customer_feedback: string | null;
  confirmation_exception_reason: string | null;
  knowledge_notes: string | null;
  recurring_fault: boolean | null;
  invoice_number: string | null;
  invoice_issued_at: string | null;
  invoice_amount: number | null;
  amount_paid: number | null;
  payment_status_note: string | null;
  dispute_notes: string | null;
  cancel_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type ServiceCallVisit = {
  id: string;
  service_call_id: string;
  visit_number: number;
  scheduled_at: string | null;
  eta_at: string | null;
  arrived_at: string | null;
  departed_at: string | null;
  diagnosis: string | null;
  work_performed: string | null;
  test_results: string | null;
  parts_used: unknown;
  parts_none: boolean | null;
  labour_minutes: number | null;
  return_visit_required: boolean | null;
  return_visit_reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ServiceCallJobCard = {
  id: string;
  service_call_id: string;
  status: JobCardStatus;
  diagnosis: string | null;
  work_performed: string | null;
  labour_minutes: number | null;
  parts_used: unknown;
  parts_none: boolean | null;
  test_results: string | null;
  evidence_notes: string | null;
  evidence_exception: string | null;
  customer_signoff_obtained: boolean | null;
  customer_signoff_notes: string | null;
  signoff_exception: string | null;
  checklist_json: Record<string, unknown> | null;
  correction_notes: string | null;
  submitted_by: string | null;
  reviewed_by: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ServiceCallAuditEntry = {
  id: string;
  service_call_id: string;
  action: string;
  from_technical_status: string | null;
  to_technical_status: string | null;
  from_invoicing_status: string | null;
  to_invoicing_status: string | null;
  actor_id: string | null;
  reason: string | null;
  payload_json: Record<string, unknown> | null;
  created_at: string;
};

export type CreateServiceCallInput = {
  title: string;
  description?: string;
  ticket_id?: string | null;
  client?: string;
  site_name?: string;
  estate_or_building?: string;
  cml_location?: string;
  location?: 'on-site' | 'remote';
  category?: string;
  fault_summary?: string;
  priority?: ServiceCallPriority;
  contract_ref?: string;
  coordinator_id?: string | null;
  coordinator_role_label?: string;
  assigned_technician_id?: string | null;
};
