import type { InvoicingStatus, ServiceCall, TechnicalStatus } from './types';

export type ViewerRole = 'admin' | 'assignee' | 'creator' | 'viewer';

export type NextActionKind =
  | 'start_triage'
  | 'remote_resolve'
  | 'needs_dispatch'
  | 'accept_assignment'
  | 'mark_on_site'
  | 'log_visit'
  | 'return_visit'
  | 'await_quote'
  | 'decide_quote'
  | 'submit_job_card'
  | 'accept_job_card'
  | 'return_job_card'
  | 'await_customer'
  | 'close_technical'
  | 'link_ticket'
  | 'admin_assign'
  | 'admin_override'
  | 'admin_invoice'
  | 'none';

export type NextActionPlan = {
  primary: NextActionKind;
  secondary: NextActionKind[];
  label: string;
  description: string;
  blockedReason?: string;
};

export function resolveViewerRole(
  sc: Pick<ServiceCall, 'assigned_technician_id' | 'created_by'>,
  userId: string,
  isAdmin: boolean
): ViewerRole {
  if (isAdmin) return 'admin';
  if (sc.assigned_technician_id === userId) return 'assignee';
  if (sc.created_by === userId) return 'creator';
  return 'viewer';
}

export function resolveNextAction(
  sc: ServiceCall,
  role: ViewerRole,
  opts?: { hasPendingQuote?: boolean; hasSubmittedJobCard?: boolean }
): NextActionPlan {
  const status = sc.technical_status as TechnicalStatus;
  const pendingQuote = opts?.hasPendingQuote === true;
  const submittedJc = opts?.hasSubmittedJobCard === true;
  const canOperate = role === 'admin' || role === 'assignee' || role === 'creator';
  const secondary: NextActionKind[] = [];

  if (!canOperate && role === 'viewer') {
    return {
      primary: 'none',
      secondary: [],
      label: 'View only',
      description: 'You can view this service call but cannot change it.',
      blockedReason: 'Not assigned or creator',
    };
  }

  if (status === 'closed' || status === 'cancelled') {
    const plan: NextActionPlan = {
      primary: 'none',
      secondary: role === 'admin' ? ['admin_invoice'] : [],
      label: status === 'closed' ? 'Technically closed' : 'Cancelled',
      description: 'No further technical actions required.',
    };
    return plan;
  }

  if (pendingQuote && (role === 'assignee' || role === 'admin' || role === 'creator')) {
    return {
      primary: 'decide_quote',
      secondary: role === 'admin' ? ['admin_override'] : [],
      label: 'Decide on supplier quote',
      description: 'Approve or reject the pending supplier quotation. First valid decision wins.',
    };
  }

  switch (status) {
    case 'new':
    case 'acknowledgement_pending':
      return {
        primary: 'start_triage',
        secondary: ['remote_resolve', 'needs_dispatch', !sc.ticket_id ? 'link_ticket' : 'none'].filter(
          (k) => k !== 'none'
        ) as NextActionKind[],
        label: 'Start triage',
        description: 'Review the call and choose remote resolution or on-site dispatch.',
      };
    case 'in_triage':
      return {
        primary: 'remote_resolve',
        secondary: ['needs_dispatch'],
        label: 'Triage decision',
        description: 'Can this be fixed remotely, or does it need a site visit?',
      };
    case 'remote_resolution':
      return {
        primary: 'submit_job_card',
        secondary: [],
        label: 'Submit job card',
        description: 'Remote work is recorded — complete and submit the job card.',
      };
    case 'awaiting_assignment':
      if (role === 'admin') {
        return {
          primary: 'admin_assign',
          secondary: ['admin_override'],
          label: 'Assign technician',
          description: 'Select an authorised member for this service call.',
        };
      }
      return {
        primary: 'none',
        secondary: [],
        label: 'Awaiting assignment',
        description: 'An admin must assign a technician.',
        blockedReason: 'Waiting for admin assignment',
      };
    case 'awaiting_acceptance':
      if (role === 'assignee' || role === 'admin') {
        return {
          primary: 'accept_assignment',
          secondary: role === 'admin' ? ['admin_assign', 'admin_override'] : [],
          label: 'Accept assignment',
          description: 'Confirm you will take this call and set an ETA if known.',
        };
      }
      return {
        primary: 'none',
        secondary: [],
        label: 'Awaiting acceptance',
        description: 'Waiting for the assigned technician to accept.',
        blockedReason: 'Only the assigned technician can accept',
      };
    case 'scheduled':
      return {
        primary: 'mark_on_site',
        secondary: ['log_visit'],
        label: 'Mark on site',
        description: 'Record arrival when you reach the site.',
      };
    case 'on_site':
    case 'repair_and_testing':
      return {
        primary: 'log_visit',
        secondary: ['return_visit', 'await_quote', 'submit_job_card'],
        label: 'Record visit / work',
        description: 'Log diagnosis, work performed, or request a quote / return visit.',
      };
    case 'awaiting_parts_quote_escalation':
      return {
        primary: pendingQuote ? 'decide_quote' : 'await_quote',
        secondary: ['log_visit'],
        label: pendingQuote ? 'Decide quote' : 'Add supplier quote',
        description: pendingQuote
          ? 'A quote is pending your decision.'
          : 'Capture a supplier quotation to continue.',
      };
    case 'return_visit_required':
      if (role === 'admin') {
        secondary.push('admin_assign');
      }
      return {
        primary: role === 'assignee' || role === 'admin' ? 'accept_assignment' : 'none',
        secondary,
        label: 'Schedule return visit',
        description: 'Accept/schedule the return visit under the same service call ID.',
      };
    case 'job_card_required':
      if (submittedJc && (role === 'assignee' || role === 'admin' || role === 'creator')) {
        return {
          primary: 'accept_job_card',
          secondary: ['return_job_card', 'submit_job_card'],
          label: 'Review job card',
          description: 'Accept the submitted job card or return it for correction.',
        };
      }
      return {
        primary: 'submit_job_card',
        secondary: [],
        label: 'Submit job card',
        description: 'Complete required job-card fields and submit for validation.',
      };
    case 'job_card_correction_required':
      return {
        primary: 'submit_job_card',
        secondary: [],
        label: 'Correct and resubmit job card',
        description: 'Address the correction notes and resubmit.',
      };
    case 'ready_to_invoice':
      return {
        primary: 'await_customer',
        secondary: ['close_technical', ...(role === 'admin' ? (['admin_invoice'] as NextActionKind[]) : [])],
        label: 'Ready to invoice',
        description: 'Technical work is validated. Confirm customer sign-off or close technically.',
      };
    case 'awaiting_customer_confirmation':
      return {
        primary: 'close_technical',
        secondary: role === 'admin' ? ['admin_override'] : [],
        label: 'Close technically',
        description: 'Record confirmation or an exception reason, then close.',
      };
    default:
      return {
        primary: 'none',
        secondary: role === 'admin' ? ['admin_override'] : [],
        label: 'In progress',
        description: `Status: ${status}`,
      };
  }
}

export function canEditInvoicing(role: ViewerRole): boolean {
  return role === 'admin';
}

export type InvoicingAction = InvoicingStatus;
