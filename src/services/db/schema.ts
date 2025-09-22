/**
 * Database Schema Definitions for FinTrac Personal Finance Tracker
 *
 * Defines the core data models, validation rules, and type guards for FinTrac's
 * local-first personal finance tracking system. These schemas ensure data consistency
 * across IndexedDB (via Dexie.js) and CouchDB sync operations while providing
 * strict type safety and validation for financial data integrity.
 *
 * Why this module exists:
 * - Financial data requires strict validation to prevent calculation errors
 * - Cross-device sync needs consistent data structures between storage systems
 * - Type safety prevents runtime errors with sensitive financial information
 * - Validation schemas catch data corruption early in the data flow
 * - Default categories provide immediate usability for new users
 * - Schema versioning supports future database migrations
 */

/**
 * Core transaction entity representing a single financial transaction in FinTrac
 *
 * This is the primary data structure in FinTrac, representing all user financial
 * activity. Each transaction must maintain strict data integrity for accurate
 * financial tracking and reliable cross-device synchronization.
 *
 * Why this structure is designed this way:
 * - ID field enables consistent identification across devices during sync
 * - ISO date format ensures timezone-safe storage and consistent sorting
 * - Separate amount and currency fields support multi-currency tracking
 * - Credit/debit types enable proper double-entry accounting principles
 * - Timestamp fields support conflict resolution during sync operations
 * - Tags provide flexible categorization beyond primary category
 *
 * Sync considerations:
 * - All fields serialize consistently between IndexedDB and CouchDB
 * - UUID IDs prevent primary key conflicts during bidirectional sync
 * - ISO timestamps enable proper conflict resolution algorithms
 * - Required fields ensure data completeness across all devices
 *
 * Data integrity requirements:
 * - Amount must be positive number with max 2 decimal places
 * - Date must be valid ISO 8601 format for reliable parsing
 * - Currency must follow ISO 4217 three-letter standard
 * - Description and category required for meaningful financial tracking
 * - Timestamps must be valid ISO datetime strings
 */
export interface Transaction {
  /** Unique identifier for cross-device sync (UUID format recommended) */
  id: string;
  /** Transaction date in ISO 8601 format (YYYY-MM-DD) for timezone safety */
  date: string;
  /** Human-readable transaction description for user identification */
  description: string;
  /** Transaction amount as positive number (currency-agnostic) */
  amount: number;
  /** ISO 4217 three-letter currency code (USD, EUR, GBP, etc.) */
  currency: string;
  /** Transaction type for proper accounting classification */
  type: "credit" | "debit";
  /** Primary category for transaction organization and analytics */
  category: string;
  /** Optional tags for flexible transaction labeling and filtering */
  tags?: string[];
  /** ISO datetime when transaction record was created (audit trail) */
  createdAt: string;
  /** ISO datetime when transaction record was last modified (sync conflict resolution) */
  updatedAt: string;
}

/**
 * Category entity for organizing and visualizing transactions in FinTrac
 *
 * Categories provide the primary organizational structure for transactions,
 * enabling meaningful financial analytics and budget tracking. The color
 * system ensures consistent visual representation across charts and UI elements.
 *
 * Why this structure supports FinTrac's goals:
 * - Simple name-based categorization matches user mental models
 * - Color coding enhances visual recognition in charts and lists
 * - Tailwind color integration ensures consistent UI theming
 * - Minimal structure allows for future extension without breaking changes
 *
 * Design considerations:
 * - Colors use Tailwind CSS classes for consistent UI integration
 * - Category names are user-defined for personalized financial tracking
 * - Simple structure enables efficient chart rendering and analytics
 * - ID field supports referential integrity with transactions
 */
export interface Category {
  /** Unique identifier for category reference in transactions */
  id: string;
  /** User-defined category name for transaction organization */
  name: string;
  /** Tailwind CSS color class for consistent UI visualization */
  color: string;
  /** ISO datetime when category record was created (audit trail) */
  createdAt?: string;
  /** ISO datetime when category record was last modified (sync conflict resolution) */
  updatedAt?: string;
}

/**
 * Comprehensive validation rules for transaction data integrity
 *
 * These validation constants ensure that all transaction data meets FinTrac's
 * strict requirements for financial accuracy and system compatibility. They
 * prevent data corruption and provide consistent validation across the application.
 *
 * Why these specific validation rules:
 * - Amount limits prevent unrealistic values that could indicate errors
 * - String length limits prevent UI overflow and database performance issues
 * - Pattern matching ensures data format consistency for reliable parsing
 * - Type constraints enable proper accounting and analytics calculations
 *
 * Financial data considerations:
 * - Maximum amount prevents accidental entry of unrealistic values
 * - Minimum amount ensures meaningful financial tracking (no zero amounts)
 * - Decimal precision limited to standard currency precision (2 places)
 * - Currency codes follow international standards for multi-currency support
 */
export const TRANSACTION_VALIDATION = {
  /** Maximum transaction amount to prevent unrealistic values ($999M) */
  AMOUNT_MAX: 999999999,
  /** Minimum transaction amount to ensure meaningful financial tracking */
  AMOUNT_MIN: 0.01,
  /** Maximum description length to prevent UI overflow and performance issues */
  DESCRIPTION_MAX_LENGTH: 500,
  /** Minimum description length to ensure meaningful transaction identification */
  DESCRIPTION_MIN_LENGTH: 1,
  /** Maximum category name length for UI consistency and performance */
  CATEGORY_MAX_LENGTH: 100,
  /** ISO 4217 currency code pattern (3 uppercase letters) */
  CURRENCY_PATTERN: /^[A-Z]{3}$/,
  /** ISO 8601 date pattern (YYYY-MM-DD) for consistent date handling */
  DATE_PATTERN: /^\d{4}-\d{2}-\d{2}$/,
  /** Valid transaction types for proper accounting classification */
  VALID_TYPES: ["credit", "debit"] as const,
} as const;

/**
 * Validation rules for category data integrity and UI consistency
 *
 * Ensures category data meets FinTrac's requirements for user interface
 * consistency and proper data organization. Categories are core to the
 * user experience and must maintain strict validation standards.
 *
 * Why these validation rules matter:
 * - Name length limits prevent UI layout issues in forms and charts
 * - Color pattern matching ensures Tailwind CSS compatibility
 * - Consistent validation prevents category-related display errors
 * - Length requirements ensure categories have meaningful names
 */
export const CATEGORY_VALIDATION = {
  /** Maximum category name length for UI consistency */
  NAME_MAX_LENGTH: 100,
  /** Minimum category name length to ensure meaningful categorization */
  NAME_MIN_LENGTH: 1,
  /** Tailwind CSS color class pattern (e.g., 'blue-500', 'emerald-400') */
  COLOR_PATTERN: /^[a-z-]+(-\d+)?$/,
} as const;

/**
 * Type guard for validating transaction type enum values
 *
 * Provides runtime validation that transaction type fields contain only
 * valid credit/debit values. Essential for maintaining data integrity
 * during form submission and data import operations.
 *
 * Why this type guard is necessary:
 * - Runtime validation prevents invalid type values from corrupting data
 * - TypeScript type narrowing enables better type safety in consuming code
 * - Form validation can use this for real-time user feedback
 * - Data import operations can validate external data integrity
 *
 * Connects to:
 * - Transaction form validation for user input
 * - Data import utilities for external file processing
 * - Repository layer validation before database operations
 * - API validation for data received from external sources
 *
 * @param type - String value to validate as transaction type
 * @returns True if value is valid transaction type, with type narrowing
 */
export const isValidTransactionType = (
  type: string,
): type is Transaction["type"] => {
  return TRANSACTION_VALIDATION.VALID_TYPES.includes(
    type as Transaction["type"],
  );
};

/**
 * Validates currency code format for multi-currency transaction support
 *
 * Ensures currency codes follow ISO 4217 standard for international
 * compatibility and proper financial data handling. Critical for users
 * who track expenses in multiple currencies.
 *
 * Why currency validation is essential:
 * - International users need multi-currency support for travel/business
 * - Invalid currency codes break formatting and display functions
 * - ISO 4217 compliance ensures compatibility with financial APIs
 * - Consistent format enables proper currency conversion in future features
 *
 * Connects to:
 * - Transaction forms for currency selection validation
 * - Currency formatting utilities for display consistency
 * - Data import operations for validating external financial data
 * - Multi-currency analytics and reporting features
 *
 * @param currency - Currency code string to validate
 * @returns True if currency follows ISO 4217 format (3 uppercase letters)
 */
export const isValidCurrency = (currency: string): boolean => {
  return TRANSACTION_VALIDATION.CURRENCY_PATTERN.test(currency);
};

/**
 * Validates date string format for consistent transaction date handling
 *
 * Ensures all transaction dates follow ISO 8601 format for reliable
 * parsing, sorting, and cross-device synchronization. Date consistency
 * is critical for accurate financial timeline tracking.
 *
 * Why strict date validation matters:
 * - Consistent date format enables reliable chronological sorting
 * - ISO format prevents timezone-related data corruption during sync
 * - Valid dates ensure proper chart rendering and analytics
 * - Date validation prevents user input errors that break calculations
 *
 * Connects to:
 * - Transaction forms for date input validation
 * - Data import utilities for validating external date formats
 * - Chart components that depend on valid date ordering
 * - Sync operations that compare transaction timestamps
 *
 * Edge cases handled:
 * - Invalid date strings that match format but represent impossible dates
 * - Date strings with correct format but invalid month/day combinations
 * - Leap year validation for February 29th dates
 *
 * @param date - Date string to validate in YYYY-MM-DD format
 * @returns True if date is valid ISO 8601 format and represents real date
 */
export const isValidDate = (date: string): boolean => {
  if (!TRANSACTION_VALIDATION.DATE_PATTERN.test(date)) {
    return false;
  }
  const parsedDate = new Date(date);
  return !isNaN(parsedDate.getTime());
};

/**
 * Default category set for immediate FinTrac usability
 *
 * Provides a comprehensive starter set of financial categories that cover
 * common personal finance tracking needs. These categories enable immediate
 * productivity for new users while demonstrating the color-coding system.
 *
 * Why these specific categories were chosen:
 * - Cover the most common personal expense and income types
 * - Provide clear examples of FinTrac's categorization system
 * - Use distinct colors from the approved chart palette
 * - Enable immediate transaction tracking without setup overhead
 * - Demonstrate both expense (debit) and income (credit) categorization
 *
 * Color palette alignment:
 * - Uses colors from FinTrac's design system (emerald, blue, amber, rose)
 * - Ensures chart readability with distinct color choices
 * - Maintains accessibility with sufficient color contrast
 * - Provides visual consistency with other UI elements
 *
 * Category selection rationale:
 * - Food: Universal expense category for all users
 * - Transport: Common recurring expense for most lifestyles
 * - Entertainment: Discretionary spending for lifestyle tracking
 * - Shopping: General retail purchases and consumer goods
 * - Health: Medical and wellness expenses for comprehensive tracking
 * - Income: Primary credit category for salary and other income
 * - Bills: Recurring expenses like utilities and subscriptions
 * - Other: Catch-all category for uncategorized transactions
 *
 * Connects to:
 * - Database initialization scripts for new user setup
 * - Category repository for seeding default data
 * - User onboarding flows for immediate usability
 * - Chart components for demonstrating color-coded analytics
 */
export const DEFAULT_CATEGORIES: Omit<Category, "id">[] = [
  { name: "Food", color: "emerald-400" },
  { name: "Transport", color: "blue-400" },
  { name: "Entertainment", color: "amber-400" },
  { name: "Shopping", color: "rose-400" },
  { name: "Health", color: "green-400" },
  { name: "Income", color: "emerald-600" },
  { name: "Bills", color: "red-400" },
  { name: "Other", color: "gray-400" },
];

/**
 * Input type for creating new transactions without generated fields
 *
 * Represents the data required from users when creating new transactions,
 * excluding system-generated fields like ID and timestamps. This type
 * ensures forms collect all necessary data while preventing users from
 * setting system-managed fields.
 *
 * Why this type is structured this way:
 * - Excludes ID which must be generated by the system for sync safety
 * - Excludes timestamps which are automatically managed by repositories
 * - Includes all user-controllable fields for complete transaction data
 * - Provides type safety for form submission and validation
 *
 * Used by:
 * - Transaction forms for type-safe user input handling
 * - Repository create methods for transaction insertion
 * - Data import utilities for processing external transaction data
 * - API endpoints that accept new transaction data
 */
export type TransactionInput = Omit<
  Transaction,
  "id" | "createdAt" | "updatedAt"
>;

/**
 * Input type for creating new categories without generated ID
 *
 * Represents the minimal data required for category creation, excluding
 * the system-generated ID field. Ensures category forms collect necessary
 * data while maintaining system control over unique identifiers.
 */
export type CategoryInput = Omit<Category, "id">;

/**
 * Update type for modifying existing transactions
 *
 * Allows partial updates to transaction fields while protecting immutable
 * system fields. The createdAt timestamp is preserved to maintain audit
 * trail integrity, while updatedAt is managed by the repository layer.
 *
 * Why these fields are protected:
 * - ID must remain constant for sync consistency across devices
 * - CreatedAt preserves original transaction creation time for audit trails
 * - UpdatedAt is automatically managed by repository update operations
 *
 * Used by:
 * - Transaction edit forms for partial field updates
 * - Repository update methods for safe transaction modification
 * - Bulk edit operations that modify multiple transactions
 * - Sync conflict resolution for merging transaction changes
 */
export type TransactionUpdate = Partial<Omit<Transaction, "id" | "createdAt">>;

/**
 * Update type for modifying existing categories
 *
 * Allows partial updates to category fields while protecting the unique
 * identifier. Categories are simpler entities with fewer constraints than
 * transactions, but ID protection remains critical for referential integrity.
 */
export type CategoryUpdate = Partial<Omit<Category, "id">>;
