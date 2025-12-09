'use client';

/**
 * Security utilities for request validation and protection
 */

// Allowed origins for API requests
const ALLOWED_ORIGINS = [
  'https://kpi-tracker-six.vercel.app',
  'https://kpi-tracker.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
];

/**
 * Validate request origin
 */
export function validateOrigin(origin: string | null): boolean {
  if (!origin) {
    // Same-origin requests don't have origin header
    return typeof window !== 'undefined';
  }

  return ALLOWED_ORIGINS.includes(origin);
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate UUID format
 */
export function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate ticket number format
 */
export function validateTicketNumber(ticketNumber: string): boolean {
  // Format: AVATAR-YYYYMMDD-XXX
  const ticketRegex = /^[A-Z]{2}-\d{8}-\d{3}$/;
  return ticketRegex.test(ticketNumber);
}

/**
 * Validate file upload
 */
export function validateFileUpload(file: File, options?: {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
}): { valid: boolean; error?: string } {
  const maxSize = options?.maxSize || 5 * 1024 * 1024; // 5MB default
  const allowedTypes = options?.allowedTypes || ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  if (file.size > maxSize) {
    return { valid: false, error: `File size exceeds ${maxSize / 1024 / 1024}MB limit` };
  }

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'File type not allowed' };
  }

  // Check file name for suspicious patterns
  if (/[<>:"/\\|?*]/.test(file.name)) {
    return { valid: false, error: 'Invalid file name' };
  }

  return { valid: true };
}

/**
 * Generate CSRF token (simple implementation)
 * In production, use a more robust solution
 */
export function generateCSRFToken(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate CSRF token
 */
export function validateCSRFToken(token: string, storedToken: string | null): boolean {
  if (!token || !storedToken) {
    return false;
  }
  return token === storedToken;
}

/**
 * Rate limiting helper (client-side)
 */
const requestTimestamps: Map<string, number[]> = new Map();

export function checkClientRateLimit(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const timestamps = requestTimestamps.get(key) || [];
  
  // Remove old timestamps
  const recentTimestamps = timestamps.filter(timestamp => now - timestamp < windowMs);
  
  if (recentTimestamps.length >= maxRequests) {
    return false;
  }
  
  recentTimestamps.push(now);
  requestTimestamps.set(key, recentTimestamps);
  
  return true;
}

/**
 * Validate request payload structure
 */
export function validateRequestPayload<T>(
  payload: unknown,
  schema: {
    required?: string[];
    maxLength?: Record<string, number>;
    types?: Record<string, string>;
  }
): { valid: boolean; error?: string; data?: T } {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Invalid payload format' };
  }

  const obj = payload as Record<string, unknown>;

  // Check required fields
  if (schema.required) {
    for (const field of schema.required) {
      if (!(field in obj) || obj[field] === null || obj[field] === undefined) {
        return { valid: false, error: `Missing required field: ${field}` };
      }
    }
  }

  // Check field lengths
  if (schema.maxLength) {
    for (const [field, maxLen] of Object.entries(schema.maxLength)) {
      if (field in obj && typeof obj[field] === 'string' && obj[field].length > maxLen) {
        return { valid: false, error: `Field ${field} exceeds maximum length of ${maxLen}` };
      }
    }
  }

  // Check field types
  if (schema.types) {
    for (const [field, expectedType] of Object.entries(schema.types)) {
      if (field in obj) {
        const actualType = typeof obj[field];
        if (actualType !== expectedType) {
          return { valid: false, error: `Field ${field} must be of type ${expectedType}` };
        }
      }
    }
  }

  return { valid: true, data: payload as T };
}
