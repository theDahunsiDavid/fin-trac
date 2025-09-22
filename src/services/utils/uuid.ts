/**
 * UUID Utility Functions
 *
 * Provides cross-browser compatible UUID generation for FinTrac.
 * Falls back to a custom implementation for browsers that don't support crypto.randomUUID().
 */

/**
 * Generates a UUID v4 compatible with all browsers
 *
 * Uses crypto.randomUUID() when available (modern browsers),
 * falls back to a mathematical implementation for older browsers.
 *
 * @returns A valid UUID v4 string
 */
export function generateUUID(): string {
  // Use native crypto.randomUUID if available (modern browsers)
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback implementation for browsers that don't support crypto.randomUUID
  // This generates a valid UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generates a prefixed UUID for specific entity types
 *
 * @param prefix - The prefix to add (e.g., "transaction", "category")
 * @returns A prefixed UUID string
 */
export function generatePrefixedUUID(prefix: string): string {
  return `${prefix}_${generateUUID()}`;
}

/**
 * Validates if a string is a valid UUID format
 *
 * @param uuid - The string to validate
 * @returns True if the string matches UUID v4 format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Generates a transaction-specific UUID
 *
 * @returns A UUID prefixed with "transaction_"
 */
export function generateTransactionId(): string {
  return generatePrefixedUUID("transaction");
}

/**
 * Generates a category-specific UUID
 *
 * @returns A UUID prefixed with "category_"
 */
export function generateCategoryId(): string {
  return generatePrefixedUUID("category");
}
