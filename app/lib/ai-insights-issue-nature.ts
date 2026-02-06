/**
 * AI Insights – issue nature classification (READ-ONLY, derived from ticket text).
 * Converts unstructured issue/resolution text into a single structured dimension.
 * Deterministic, keyword-based; explainable and auditable. Source tickets are never modified.
 */

/** Fixed taxonomy for "issue nature". No hardware/software or client-specific labels. */
export const ISSUE_NATURE_TAXONOMY = [
  'Access provisioning failure',
  'Permission mismatch',
  'Onboarding workflow failure',
  'Configuration error',
  'Device pairing issue',
  'Network instability',
  'Integration or API failure',
  'Credentials or authentication',
  'Other',
] as const;

export type IssueNatureLabel = (typeof ISSUE_NATURE_TAXONOMY)[number];

/** Default when no keyword matches (auditable: we did not infer a specific nature). */
export const ISSUE_NATURE_DEFAULT: IssueNatureLabel = 'Other';

/**
 * Keyword rules: each label maps to lowercased phrases that indicate that nature.
 * First match wins (order matters for overlapping terms). Explainable: classification
 * is "matched keyword set X" for label Y.
 */
const KEYWORD_RULES: { label: IssueNatureLabel; keywords: string[] }[] = [
  { label: 'Access provisioning failure', keywords: ['access provis', 'provisioning fail', 'cannot grant access', 'access not granted', 'failed to provision', 'provision access'] },
  { label: 'Permission mismatch', keywords: ['permission deni', 'access deni', 'permission mismatch', 'insufficient permission', 'no permission', 'not allowed to', 'forbidden'] },
  { label: 'Onboarding workflow failure', keywords: ['onboarding', 'new user setup', 'setup fail', 'onboard', 'new employee', 'account setup'] },
  { label: 'Configuration error', keywords: ['config', 'misconfig', 'setting', 'incorrect setting', 'wrong config', 'configuration'] },
  { label: 'Device pairing issue', keywords: ['pairing', 'pair device', 'device not pair', 'bluetooth', 'device pair', 'reader pair'] },
  { label: 'Network instability', keywords: ['network', 'connectivity', 'connection drop', 'timeout', 'unreachable', 'dns', 'latency'] },
  { label: 'Integration or API failure', keywords: ['api', 'integration', 'sync fail', 'webhook', 'connection to system', 'third party'] },
  { label: 'Credentials or authentication', keywords: ['login fail', 'password', 'credential', 'auth fail', 'cannot log', 'authenticate', 'mfa', '2fa'] },
];

/**
 * Classify ticket text into a single issue nature label. Deterministic and repeatable.
 * Uses keyword matching only; no AI. Raw text is not stored on the ticket.
 * @param issue - Ticket issue/description text
 * @param resolution - Optional resolution text (helps disambiguate)
 * @returns One of ISSUE_NATURE_TAXONOMY; "Other" if no match
 */
export function classifyIssueNature(
  issue: string | null | undefined,
  resolution?: string | null
): IssueNatureLabel {
  const combined = [issue, resolution].filter(Boolean).join(' ').toLowerCase();
  if (!combined.trim()) return ISSUE_NATURE_DEFAULT;

  for (const { label, keywords } of KEYWORD_RULES) {
    if (keywords.some((k) => combined.includes(k))) return label;
  }
  return ISSUE_NATURE_DEFAULT;
}
