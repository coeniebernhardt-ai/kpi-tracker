/**
 * Server-only: safe API error handling. Never expose stack traces or internal messages in production.
 * Use in API route catch blocks for 500 responses.
 */

const isProduction =
  process.env.NODE_ENV === 'production' ||
  process.env.VERCEL_ENV === 'production';

/**
 * Returns a safe error message for API JSON response.
 * Production: always "Internal server error". Development: err.message (no stack).
 */
export function getSafeErrorMessage(err: unknown): string {
  if (!isProduction && err instanceof Error) {
    return err.message;
  }
  return 'Internal server error';
}

/**
 * Use when logging errors server-side. Never log full error in production (no stack, no message with secrets).
 */
export function logSafeError(context: string, err: unknown): void {
  if (isProduction) {
    console.error(context);
  } else if (err instanceof Error) {
    console.error(context, err.message);
  } else {
    console.error(context, err);
  }
}

export { isProduction };
