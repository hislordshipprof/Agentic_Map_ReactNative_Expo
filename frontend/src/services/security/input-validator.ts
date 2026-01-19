/**
 * Input Validator - Agentic Mobile Map
 *
 * Validates and sanitizes user input before sending to backend.
 * Prevents injection attacks and ensures data integrity.
 *
 * Security features:
 * - XSS prevention
 * - SQL injection prevention (even though backend should also validate)
 * - Length limits
 * - Character filtering
 * - URL validation
 */

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  sanitized: string;
  error?: string;
}

/**
 * Dangerous patterns to detect
 */
const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // Script tags
  /javascript:/gi, // JavaScript protocol
  /on\w+\s*=/gi, // Event handlers (onclick, onerror, etc.)
  /data:/gi, // Data URLs
  /vbscript:/gi, // VBScript protocol
  /<iframe/gi, // iframes
  /<object/gi, // object tags
  /<embed/gi, // embed tags
];

/**
 * SQL-like patterns (defense in depth)
 */
const SQL_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b)/gi,
  /(-{2}|\/\*|\*\/)/g, // SQL comments
  /(;|\||&&)/g, // Command chaining
];

/**
 * InputValidator class
 */
class InputValidatorService {
  /**
   * Maximum lengths for different input types
   */
  private readonly MAX_LENGTHS = {
    utterance: 500,
    name: 100,
    address: 300,
    query: 200,
    email: 254,
    phone: 20,
  };

  /**
   * Validate and sanitize a user utterance (main input)
   */
  validateUtterance(input: string): ValidationResult {
    if (!input || typeof input !== 'string') {
      return { isValid: false, sanitized: '', error: 'Input is required' };
    }

    // Trim and check length
    let sanitized = input.trim();
    if (sanitized.length === 0) {
      return { isValid: false, sanitized: '', error: 'Input cannot be empty' };
    }

    if (sanitized.length > this.MAX_LENGTHS.utterance) {
      return {
        isValid: false,
        sanitized: sanitized.substring(0, this.MAX_LENGTHS.utterance),
        error: `Input exceeds maximum length of ${this.MAX_LENGTHS.utterance} characters`,
      };
    }

    // Check for dangerous patterns
    const dangerousMatch = this.containsDangerousPatterns(sanitized);
    if (dangerousMatch) {
      return {
        isValid: false,
        sanitized: this.sanitizeHtml(sanitized),
        error: 'Input contains potentially unsafe content',
      };
    }

    // Basic sanitization (escape HTML entities)
    sanitized = this.escapeHtml(sanitized);

    // Normalize whitespace
    sanitized = this.normalizeWhitespace(sanitized);

    return { isValid: true, sanitized };
  }

  /**
   * Validate a place name or search query
   */
  validateSearchQuery(input: string): ValidationResult {
    if (!input || typeof input !== 'string') {
      return { isValid: false, sanitized: '', error: 'Search query is required' };
    }

    let sanitized = input.trim();
    if (sanitized.length === 0) {
      return { isValid: false, sanitized: '', error: 'Search query cannot be empty' };
    }

    if (sanitized.length > this.MAX_LENGTHS.query) {
      sanitized = sanitized.substring(0, this.MAX_LENGTHS.query);
    }

    // Remove special characters except common ones for places
    sanitized = sanitized.replace(/[^\w\s\-\.\,\'\&\#]/g, '');

    // Normalize whitespace
    sanitized = this.normalizeWhitespace(sanitized);

    return { isValid: true, sanitized };
  }

  /**
   * Validate coordinates
   */
  validateCoordinates(lat: number, lng: number): ValidationResult {
    const isValidLat = typeof lat === 'number' && lat >= -90 && lat <= 90;
    const isValidLng = typeof lng === 'number' && lng >= -180 && lng <= 180;

    if (!isValidLat || !isValidLng) {
      return {
        isValid: false,
        sanitized: '',
        error: 'Invalid coordinates',
      };
    }

    // Round to reasonable precision (6 decimal places = ~0.1m accuracy)
    const sanitizedLat = Math.round(lat * 1000000) / 1000000;
    const sanitizedLng = Math.round(lng * 1000000) / 1000000;

    return {
      isValid: true,
      sanitized: `${sanitizedLat},${sanitizedLng}`,
    };
  }

  /**
   * Validate URL (for photo URLs, etc.)
   */
  validateUrl(url: string): ValidationResult {
    if (!url || typeof url !== 'string') {
      return { isValid: false, sanitized: '', error: 'URL is required' };
    }

    const trimmed = url.trim();

    // Only allow http/https protocols
    const urlPattern = /^https?:\/\/[^\s<>\"{}|\\^`\[\]]+$/i;
    if (!urlPattern.test(trimmed)) {
      return { isValid: false, sanitized: '', error: 'Invalid URL format' };
    }

    // Check for dangerous patterns in URL
    if (this.containsDangerousPatterns(trimmed)) {
      return { isValid: false, sanitized: '', error: 'URL contains unsafe content' };
    }

    return { isValid: true, sanitized: trimmed };
  }

  /**
   * Check if input contains dangerous patterns
   */
  private containsDangerousPatterns(input: string): boolean {
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(input)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if input contains SQL-like patterns
   */
  containsSqlPatterns(input: string): boolean {
    for (const pattern of SQL_PATTERNS) {
      if (pattern.test(input)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Escape HTML entities
   */
  private escapeHtml(input: string): string {
    const htmlEntities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
    };

    return input.replace(/[&<>"'/]/g, (char) => htmlEntities[char] || char);
  }

  /**
   * Remove HTML tags completely
   */
  private sanitizeHtml(input: string): string {
    return input.replace(/<[^>]*>/g, '');
  }

  /**
   * Normalize whitespace
   */
  private normalizeWhitespace(input: string): string {
    return input.replace(/\s+/g, ' ').trim();
  }

  /**
   * Create a safe object for logging (redact sensitive fields)
   */
  redactForLogging<T extends Record<string, unknown>>(
    obj: T,
    sensitiveFields: string[] = ['password', 'token', 'accessToken', 'refreshToken', 'apiKey', 'secret']
  ): T {
    const redacted = { ...obj };
    for (const field of sensitiveFields) {
      if (field in redacted) {
        redacted[field as keyof T] = '[REDACTED]' as T[keyof T];
      }
    }
    return redacted;
  }
}

/**
 * Singleton instance
 */
export const InputValidator = new InputValidatorService();

export default InputValidator;
