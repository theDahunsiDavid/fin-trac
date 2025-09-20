/**
 * Formats a numeric amount into a localized currency string.
 *
 * This utility is vital for displaying financial amounts in a user-friendly format, ensuring consistency across the app's UI. It leverages Intl.NumberFormat for proper localization and currency symbols.
 *
 * Assumptions:
 * - Amount is a valid number.
 * - Currency code is supported by the browser's Intl API.
 *
 * Edge cases:
 * - Defaults to 'USD' if no currency provided.
 * - Handles negative amounts and decimals appropriately.
 *
 * Connections:
 * - Used in DashboardChart for Y-axis formatting.
 * - Supports display of transaction amounts in forms and lists.
 */
export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
};

/**
 * Parses a currency string back into a numeric value.
 *
 * This function strips currency symbols and formatting to extract the raw numeric value, enabling form inputs and calculations. It's necessary for converting user-entered currency strings into usable numbers.
 *
 * Assumptions:
 * - Input string contains a valid numeric value with possible currency symbols.
 * - Non-numeric characters are safely removable.
 *
 * Edge cases:
 * - Returns NaN if no numeric content found.
 * - Handles various currency formats and symbols.
 *
 * Connections:
 * - Used in TransactionForm for amount input processing.
 * - Supports data entry workflows requiring numeric conversion.
 */
export const parseCurrency = (value: string): number => {
  return parseFloat(value.replace(/[^0-9.-]/g, ''));
};