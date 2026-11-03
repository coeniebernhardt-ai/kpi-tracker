import type { SupportCall } from './types';

export type WorkflowStage =
  | 'logged'
  | 'awaiting_assignment'
  | 'awaiting_acknowledgement'
  | 'in_progress'
  | 'awaiting_dependency'
  | 'awaiting_quote_decision'
  | 'contributions_pending'
  | 'contributions_in_review'
  | 'job_card_pending'
  | 'awaiting_signature'
  | 'ready_for_finance'
  | 'closed'
  | 'cancelled';

/** Flags derived from related tables (counts / existence), supplied by the caller. */
export type WorkflowFlags = {
  hasAssignments?: boolean;
  /** Every assignee has acknowledged. */
  allAcknowledged?: boolean;
  /** At least one visit has been logged. */
  hasVisits?: boolean;
  /** Any visit marked incomplete / awaiting a dependency. */
  hasOpenDependency?: boolean;
  /** Any quote with status 'pending'. */
  hasPendingQuote?: boolean;
  /** Assignees whose contribution is still draft/returned/missing. */
  contributionsOutstanding?: boolean;
  /** Any contribution in 'submitted' state awaiting manager review. */
  contributionsAwaitingReview?: boolean;
  /** A job card (non-superseded) exists. */
  hasJobCard?: boolean;
  jobCardStatus?: 'draft' | 'ready' | 'awaiting_signature' | 'signed' | 'superseded' | null;
  /** A signature exception was recorded for the current job card. */
  hasSignatureException?: boolean;
  /** Finance handover recorded as sent. */
  financeSent?: boolean;
};

export type WorkflowResolution = {
  stage: WorkflowStage;
  nextAction: string;
};

export function resolveWorkflowStage(
  sc: Pick<SupportCall, 'overall_status'> & Partial<Pick<SupportCall, 'workflow_stage'>>,
  flags: WorkflowFlags = {}
): WorkflowResolution {
  if (sc.overall_status === 'cancelled') {
    return { stage: 'cancelled', nextAction: 'Cancelled — no further action' };
  }
  if (sc.overall_status === 'closed') {
    return { stage: 'closed', nextAction: 'Closed — no further action' };
  }

  if (!flags.hasAssignments) {
    return { stage: 'awaiting_assignment', nextAction: 'Assign a team member' };
  }
  if (flags.allAcknowledged === false) {
    return { stage: 'awaiting_acknowledgement', nextAction: 'Assignee to acknowledge the call' };
  }
  if (!flags.hasVisits) {
    return { stage: 'in_progress', nextAction: 'Log the first visit' };
  }
  if (flags.hasPendingQuote) {
    return { stage: 'awaiting_quote_decision', nextAction: 'Decide on the pending quote' };
  }
  if (flags.hasOpenDependency) {
    return { stage: 'awaiting_dependency', nextAction: 'Follow up on the outstanding dependency' };
  }
  if (flags.contributionsOutstanding) {
    return { stage: 'contributions_pending', nextAction: 'Assignees to submit their contributions' };
  }
  if (flags.contributionsAwaitingReview) {
    return { stage: 'contributions_in_review', nextAction: 'Review submitted contributions' };
  }
  if (!flags.hasJobCard || flags.jobCardStatus === 'draft' || flags.jobCardStatus === 'superseded') {
    return { stage: 'job_card_pending', nextAction: 'Generate the job card' };
  }
  if (flags.jobCardStatus === 'ready' || flags.jobCardStatus === 'awaiting_signature') {
    if (flags.hasSignatureException) {
      return { stage: 'ready_for_finance', nextAction: 'Send finance handover' };
    }
    return { stage: 'awaiting_signature', nextAction: 'Obtain customer signature' };
  }
  if (flags.jobCardStatus === 'signed') {
    return flags.financeSent
      ? { stage: 'ready_for_finance', nextAction: 'Close the support call' }
      : { stage: 'ready_for_finance', nextAction: 'Send finance handover' };
  }

  return { stage: 'in_progress', nextAction: 'Continue work' };
}
