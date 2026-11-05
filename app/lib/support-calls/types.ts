/** Types mirroring SUPPORT_CALLS_SCHEMA.sql. Timestamps/dates are ISO strings; NUMERIC columns are numbers. */

export type SupportCallPriority = 'Critical' | 'High' | 'Medium' | 'Low';
export type SupportCallOverallStatus = 'draft' | 'open' | 'closed' | 'cancelled';
export type SupportCallLocation = 'on-site' | 'remote';
export type NotificationCheckpointStatus = 'pending' | 'complete' | 'attempted';
export type CancelTicketAction = 'close' | 'leave_open';

export type SupportPartner = {
  id: string;
  company_name: string;
  contact_person: string | null;
  email: string | null;
  telephone: string | null;
  category: string | null;
  notes: string | null;
  is_active: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type SupportCall = {
  id: string;
  support_call_number: string;
  ticket_id: string | null;
  hto_owner_id: string;
  created_by: string | null;
  priority: SupportCallPriority;
  overall_status: SupportCallOverallStatus;
  workflow_stage: string;

  report_method: string | null;
  reporter_name: string | null;
  reporter_organisation: string | null;
  reporter_email: string | null;
  reporter_phone: string | null;
  /** Single contact: email or telephone */
  reporter_contact: string | null;
  client_houston_userid: string | null;
  eta_sent_event_id: string | null;
  eta_sent_at: string | null;
  eta_sent_by: string | null;
  partner_required?: boolean;
  partner_required_at?: string | null;
  partner_required_by?: string | null;
  partner_required_reason?: string | null;
  reported_at: string | null;
  original_description: string;
  operational_description: string | null;

  client: string | null;
  site_name: string | null;
  estate_or_building: string | null;
  cml_location: string | null;
  onsite_location: string | null;
  client_id: string | null;
  estate_id: string | null;
  cml_location_id: string | null;
  onsite_location_id: string | null;
  location: SupportCallLocation | null;
  responsible_name: string | null;
  responsible_position: string | null;
  responsible_organisation: string | null;
  responsible_email: string | null;
  responsible_phone: string | null;

  initial_notification_status: NotificationCheckpointStatus;
  eta_notification_status: NotificationCheckpointStatus;

  supplier_invoice_number: string | null;
  third_party_job_card_number: string | null;
  po_number: string | null;
  external_quote_reference: string | null;
  supplier_invoice_number_norm: string | null;
  third_party_job_card_number_norm: string | null;
  po_number_norm: string | null;
  external_quote_reference_norm: string | null;

  cancel_reason: string | null;
  cancel_explanation: string | null;
  cancel_ticket_action: CancelTicketAction | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  closed_at: string | null;
  closed_by: string | null;
  created_at: string;
  updated_at: string;
};

export type SupportCallAssignment = {
  id: string;
  support_call_id: string;
  member_id: string;
  is_lead: boolean;
  assigned_by: string | null;
  assigned_at: string;
  acknowledged_at: string | null;
  started_work_at: string | null;
  first_update_at: string | null;
  first_submitted_at: string | null;
  work_completed_at: string | null;
  work_completed_by: string | null;
  referred_to_partner?: boolean;
  referral_reason?: string | null;
  completion_category?: 'completed' | 'completed_referred_to_partner' | null;
};

export type SupportCallPartner = {
  id: string;
  support_call_id: string;
  partner_id: string | null;
  is_once_off: boolean;
  company_name: string;
  contact_person: string | null;
  email: string | null;
  telephone: string | null;
  category: string | null;
  notes: string | null;
  assigned_by: string | null;
  assigned_at: string;
  arrival_confirmed_at: string | null;
  work_completed_at: string | null;
  work_completed_by: string | null;
  arrival_confirmed_by: string | null;
};

export type CommunicationKind = 'initial_notification' | 'eta_notification' | 'partner_contact' | 'other';
export type CommunicationOutcome = 'complete' | 'attempted';
export type CommunicationMethod = 'Email' | 'Telephone' | 'WhatsApp' | 'Other';

export type SupportCallCommunication = {
  id: string;
  support_call_id: string;
  kind: CommunicationKind;
  outcome: CommunicationOutcome;
  method: CommunicationMethod;
  recipient_name: string | null;
  recipient_contact: string | null;
  eta_at: string | null;
  communicated_at: string;
  notes: string | null;
  failure_reason: string | null;
  confirmed: boolean;
  actor_id: string | null;
  created_at: string;
};

export type SupportCallEtaEvent = {
  id: string;
  support_call_id: string;
  assignment_id: string | null;
  partner_assignment_id: string | null;
  previous_eta: string | null;
  new_eta: string;
  source: string | null;
  notes: string | null;
  actor_id: string | null;
  created_at: string;
};

export type VisitPartyType = 'internal' | 'external';

export type SupportCallVisit = {
  id: string;
  support_call_id: string;
  visit_number: number;
  party_type: VisitPartyType;
  assignment_id: string | null;
  partner_assignment_id: string | null;
  visit_date: string | null;
  arrived_at: string | null;
  departed_at: string | null;
  labour_minutes: number | null;
  travel_km: number | null;
  travel_amount_zar: number | null;
  external_travel_cost_zar: number | null;
  diagnosis: string | null;
  work_performed: string | null;
  test_results: string | null;
  incomplete: boolean;
  incomplete_reason: string | null;
  dependency_notes: string | null;
  expected_follow_up_date: string | null;
  next_action_party: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type SupportCallHardwareItem = {
  id: string;
  support_call_id: string;
  visit_id: string | null;
  description: string;
  make_model: string | null;
  quantity: number | null;
  old_equipment: string | null;
  new_equipment: string | null;
  old_mac: string | null;
  new_mac: string | null;
  serial_number: string | null;
  replacement_reason: string | null;
  document_id: string | null;
  created_by: string | null;
  created_at: string;
};

export type ContributionStatus = 'draft' | 'submitted' | 'returned' | 'approved';

export type SupportCallContribution = {
  id: string;
  support_call_id: string;
  assignment_id: string;
  revision: number;
  status: ContributionStatus;
  summary: string | null;
  confirmed_accurate: boolean;
  correction_notes: string | null;
  referred_to_partner?: boolean;
  referral_reason?: string | null;
  completion_category?: 'completed' | 'completed_referred_to_partner' | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  payload_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type QuoteStatus = 'pending' | 'approved' | 'rejected' | 'superseded';
export type QuoteNextStep = 'revise_same_supplier' | 'different_supplier';

export type SupportCallQuote = {
  id: string;
  support_call_id: string;
  partner_assignment_id: string | null;
  revision: number;
  supplier_name: string;
  quote_reference: string | null;
  quote_date: string | null;
  description: string | null;
  amount: number | null;
  currency: string | null;
  status: QuoteStatus;
  decision_by: string | null;
  decision_at: string | null;
  decision_reason: string | null;
  next_step: QuoteNextStep | null;
  document_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type SupportCallDocument = {
  id: string;
  support_call_id: string;
  doc_type: string;
  storage_path: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  related_visit_id: string | null;
  related_quote_id: string | null;
  related_job_card_id: string | null;
  uploaded_by: string | null;
  created_at: string;
};

export type JobCardStatus = 'draft' | 'ready' | 'awaiting_signature' | 'signed' | 'superseded';

export type SupportCallJobCard = {
  id: string;
  support_call_id: string;
  version: number;
  status: JobCardStatus;
  pdf_storage_path: string | null;
  signed_pdf_storage_path: string | null;
  generated_by: string | null;
  generated_at: string | null;
  locked_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SupportCallSigningToken = {
  id: string;
  support_call_id: string;
  job_card_id: string;
  token_hash: string;
  expires_at: string;
  revoked_at: string | null;
  used_at: string | null;
  created_by: string | null;
  created_at: string;
};

export type SupportCallSignature = {
  id: string;
  support_call_id: string;
  job_card_id: string;
  signer_name: string;
  signer_position: string | null;
  signer_company: string | null;
  signature_data: string;
  confirmed: boolean;
  signed_at: string;
  ip_hint: string | null;
};

export type SignatureExceptionReason = 'Unavailable' | 'Refused' | 'Disputed work' | 'Other';

export type SupportCallSignatureException = {
  id: string;
  support_call_id: string;
  job_card_id: string | null;
  reason: SignatureExceptionReason;
  interaction_at: string;
  method: string | null;
  explanation: string;
  actor_id: string | null;
  created_at: string;
};

export type SupportCallFinanceHandover = {
  id: string;
  support_call_id: string;
  version: number;
  report_storage_path: string | null;
  generated_by: string | null;
  generated_at: string | null;
  downloaded_at: string | null;
  downloaded_by: string | null;
  sent_confirmed: boolean;
  sent_at: string | null;
  sent_by: string | null;
  finance_recipient: string | null;
  communication_method: string | null;
  email_subject: string | null;
  notes: string | null;
  created_at: string;
};

export type SupportCallAuditEvent = {
  id: string;
  support_call_id: string;
  ticket_id: string | null;
  related_id: string | null;
  actor_id: string | null;
  actor_role: string | null;
  event_type: string;
  previous_value: unknown | null;
  new_value: unknown | null;
  reason: string | null;
  source: string | null;
  created_at: string;
};

export type SupportCallDuplicateDecision = {
  id: string;
  support_call_id: string | null;
  actor_id: string | null;
  reason: string;
  match_criteria: Record<string, unknown>;
  matched_support_call_ids: string[];
  created_at: string;
};
