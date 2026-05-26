/**
 * Optional email dropbox for contractor PDFs (Phase 3).
 * Wire a cron or mailbox poller to POST attachments to /api/callouts/email-ingest.
 */
export const CALLOUT_EMAIL_INGEST_ENABLED =
  process.env.ENABLE_CALLOUT_EMAIL_INGEST === 'true';

export const CALLOUT_EMAIL_MAILBOX = process.env.CALLOUT_EMAIL_MAILBOX ?? '';
