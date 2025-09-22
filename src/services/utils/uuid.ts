/**
 * UUID Utility Functions for FinTrac
 *
 * Provides cross-browser compatible UUID generation for FinTrac's local-first architecture.
 * These UUIDs are critical for maintaining data consistency across devices during sync
 * operations and ensuring unique identification in both local IndexedDB and remote CouchDB.
 *
 * Why this module exists:
 * - FinTrac needs globally unique identifiers for transactions and categories
 * - UUIDs prevent conflicts during bidirectional sync between devices
 * - Fallback ensures compatibility with older browsers/PWA environments
 * - Prefixed IDs help with debugging and data organization in CouchDB views
 */

/**
 * Generates a UUID v4 compatible with all browsers for FinTrac entities
 *
 * This is the core function for creating unique identifiers in FinTrac. Every transaction
 * and category needs a globally unique ID that won't conflict during sync operations
 * between multiple devices. The UUID format ensures mathematical uniqueness even when
 * multiple devices create records simultaneously while offline.
 *
 * Why this function is critical:
 * - Prevents primary key conflicts during CouchDB sync operations
 * - Ensures data integrity in offline-first scenarios
 * - Compatible with CouchDB's document ID requirements
 * - Enables conflict-free collaborative editing across devices
 *
 * Assumptions:
 * - Modern browsers support crypto.randomUUID() for cryptographically secure randomness
 * - Fallback Math.random() provides sufficient uniqueness for personal finance use case
 * - Generated UUIDs will be used as primary keys in both Dexie and CouchDB
 *
 * Edge cases handled:
 * - Browsers without crypto.randomUUID() support (older versions)
 * - Environments where crypto object is undefined
 * - Maintains UUID v4 format compliance for CouchDB compatibility
 *
 * @returns A valid UUID v4 string suitable for use as document IDs in FinTrac
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
 * Generates a prefixed UUID for specific entity types in FinTrac
 *
 * Prefixed UUIDs help with data organization and debugging in FinTrac's sync system.
 * They make it easier to identify document types in CouchDB views and logs, and help
 * developers understand data flow during troubleshooting.
 *
 * Why prefixes matter in FinTrac:
 * - Enables type-based filtering in CouchDB design documents
 * - Simplifies debugging sync conflicts by showing entity type
 * - Allows for entity-specific replication rules if needed in future
 * - Makes database inspection more human-readable
 *
 * Assumptions:
 * - Prefix will be a valid string for use in document IDs
 * - Underscore separator won't conflict with UUID format
 * - Prefixes will remain consistent across app versions
 *
 * Edge cases:
 * - Empty prefix results in underscore-prefixed UUID (still valid)
 * - Special characters in prefix could cause CouchDB issues (caller responsibility)
 *
 * @param prefix - The prefix to add (e.g., "transaction", "category")
 * @returns A prefixed UUID string for use as entity identifier
 */
export function generatePrefixedUUID(prefix: string): string {
  return `${prefix}_${generateUUID()}`;
}

/**
 * Validates if a string is a valid UUID format for FinTrac data integrity
 *
 * Input validation is crucial in FinTrac to prevent data corruption during sync operations.
 * Invalid UUIDs could cause sync failures or data loss, especially when syncing with
 * CouchDB which has strict document ID requirements.
 *
 * Why validation is critical in FinTrac:
 * - Prevents storing invalid IDs that would break sync operations
 * - Catches data corruption early in the import/export process
 * - Ensures compatibility with CouchDB document ID constraints
 * - Helps maintain data integrity during manual data entry or CSV imports
 *
 * Assumptions:
 * - Input follows UUID v4 format specification
 * - Case-insensitive matching is acceptable for user convenience
 * - Only standard UUID format is accepted (no custom formats)
 *
 * Edge cases handled:
 * - Null or undefined input returns false
 * - Empty string returns false
 * - Non-string input would need type checking by caller
 * - Mixed case UUIDs are accepted
 *
 * @param uuid - The string to validate
 * @returns True if the string matches UUID v4 format, false otherwise
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Generates a transaction-specific UUID for FinTrac transaction records
 *
 * Transactions are the core data entity in FinTrac, representing all financial activity.
 * This function provides a standardized way to create transaction IDs that are easily
 * identifiable in logs and database views, which is essential for debugging sync issues
 * and understanding data flow across devices.
 *
 * Why transaction-specific IDs matter:
 * - Enables quick identification of transaction documents in CouchDB
 * - Supports transaction-specific replication strategies if needed
 * - Makes error logs more readable during sync troubleshooting
 * - Allows for transaction-focused database maintenance operations
 *
 * Connects to:
 * - TransactionRepository for creating new transaction records
 * - SyncService for replicating transaction data across devices
 * - Transaction forms for generating IDs before saving
 *
 * Assumptions:
 * - "transaction" prefix is stable across app versions
 * - Generated IDs will be used immediately for transaction creation
 * - No collision detection needed due to UUID randomness
 *
 * @returns A UUID prefixed with "transaction_" for use as transaction primary key
 */
export function generateTransactionId(): string {
  return generatePrefixedUUID("transaction");
}

/**
 * Generates a category-specific UUID for FinTrac category records
 *
 * Categories organize transactions in FinTrac and need stable, unique identifiers that
 * sync reliably across devices. Users may create categories on different devices, so
 * collision-free ID generation is critical for maintaining category consistency.
 *
 * Why category-specific IDs matter:
 * - Prevents category duplication during device sync operations
 * - Enables category-based filtering in CouchDB design documents
 * - Supports referential integrity between transactions and categories
 * - Makes category management more reliable in multi-device scenarios
 *
 * Connects to:
 * - CategoryRepository for creating new category records
 * - Transaction forms for associating transactions with categories
 * - Dashboard components for category-based financial analysis
 * - SyncService for maintaining category consistency across devices
 *
 * Assumptions:
 * - "category" prefix is stable across app versions
 * - Categories are relatively few in number compared to transactions
 * - Generated IDs will be used for foreign key relationships
 *
 * @returns A UUID prefixed with "category_" for use as category primary key
 */
export function generateCategoryId(): string {
  return generatePrefixedUUID("category");
}
