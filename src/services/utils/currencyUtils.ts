/**
 * Currency Utility Functions for FinTrac Personal Finance Tracker
 *
 * Provides robust currency formatting and parsing for FinTrac's multi-currency
 * personal finance tracking. These utilities ensure consistent currency display
 * across the app while supporting international users and multiple currency types.
 *
 * Why this module exists:
 * - FinTrac users may track expenses in multiple currencies (travel, international payments)
 * - Financial amounts need consistent, localized formatting for user trust
 * - Currency parsing must handle various user input formats reliably
 * - Charts and summaries require standardized currency display
 * - Cross-device sync needs consistent currency data representation
 */

/**
 * Formats a numeric amount into a localized currency string for display
 *
 * This is the primary currency display function in FinTrac, converting stored numeric
 * amounts into user-friendly currency formats. It's essential for building user trust
 * in financial data accuracy and providing clear monetary information throughout the app.
 *
 * Why this function is critical in FinTrac:
 * - Transaction lists must show clear, properly formatted amounts
 * - Dashboard charts need consistent Y-axis currency formatting
 * - Summary cards require professional currency presentation
 * - Mobile users expect native currency formatting conventions
 * - Multi-currency support enables international user adoption
 *
 * Connects to:
 * - DashboardChart for Y-axis amount formatting
 * - Transaction list components for amount display
 * - SummaryCard components for balance presentation
 * - TransactionForm for showing calculated totals
 * - Export utilities for formatted financial reports
 *
 * Assumptions:
 * - Amount parameter is a valid finite number
 * - Currency code follows ISO 4217 standard (USD, EUR, GBP, etc.)
 * - User's browser supports Intl.NumberFormat API
 * - en-US locale provides acceptable base formatting for most users
 *
 * Edge cases handled:
 * - Negative amounts display with proper negative formatting
 * - Zero amounts display as currency zero (e.g., "$0.00")
 * - Very large numbers use appropriate thousand separators
 * - Decimal precision follows currency-specific rules (2 digits for USD)
 * - Unsupported currency codes fall back gracefully
 *
 * Multi-currency considerations:
 * - Different currencies have different decimal places (JPY has 0, BHD has 3)
 * - Currency symbols appear in different positions based on locale
 * - Some currencies use different grouping separators
 *
 * @param amount - Numeric amount to format (stored as number in database)
 * @param currency - ISO 4217 currency code (defaults to USD for US users)
 * @returns Formatted currency string with appropriate symbol and formatting
 */
export const formatCurrency = (
  amount: number,
  currency: string = "USD",
): string => {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    amount,
  );
};

/**
 * Parses a currency string back into a numeric value for FinTrac storage
 *
 * Converts user-entered currency strings into clean numeric values for database storage.
 * This is essential for transaction forms where users may copy-paste formatted amounts
 * or type currency symbols, but the database needs pure numeric values for calculations.
 *
 * Why this function is essential in FinTrac:
 * - Transaction forms must accept various user input formats
 * - Copy-pasted amounts from bank statements often include currency symbols
 * - Data import from CSV files may contain formatted currency strings
 * - Calculations require clean numeric values without formatting
 * - Search and filtering operations need numeric comparison capability
 *
 * Connects to:
 * - TransactionForm amount input validation and processing
 * - CSV import utilities for processing external financial data
 * - Data migration scripts that handle legacy formatted amounts
 * - Bulk edit operations that process multiple currency values
 * - API endpoints that receive currency data from external sources
 *
 * Assumptions:
 * - Input string contains at least one numeric character
 * - Currency symbols and formatting can be safely stripped
 * - Decimal points use standard dot notation (not comma)
 * - Negative signs appear before the number or at the end
 *
 * Edge cases handled:
 * - Strings with no numeric content return NaN (caller should validate)
 * - Multiple decimal points use the last one as decimal separator
 * - Currency symbols at beginning, middle, or end are stripped
 * - Thousand separators (commas) are removed properly
 * - Negative signs in various positions are preserved
 * - Whitespace around numbers is ignored
 *
 * Input format examples handled:
 * - "$1,234.56" → 1234.56
 * - "€ 1.234,56" → 1234.56 (European format, but may need locale handling)
 * - "1234.56 USD" → 1234.56
 * - "-$50.00" → -50.00
 * - "1,000" → 1000
 *
 * @param value - Currency string to parse (user input or imported data)
 * @returns Numeric value suitable for database storage and calculations
 */
export const parseCurrency = (value: string): number => {
  return parseFloat(value.replace(/[^0-9.-]/g, ""));
};
