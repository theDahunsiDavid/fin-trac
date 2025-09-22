/**
 * Date Utility Functions for FinTrac Personal Finance Tracker
 *
 * Provides consistent date handling across FinTrac's local-first architecture.
 * These utilities ensure date consistency between local IndexedDB storage and
 * remote CouchDB sync, while providing user-friendly date formatting for the UI.
 *
 * Why this module exists:
 * - FinTrac stores all dates in ISO 8601 format for sync consistency
 * - Users need localized date displays in their preferred format
 * - Cross-device sync requires standardized date serialization
 * - Charts and analytics need consistent date parsing for grouping
 * - Transaction timestamps must be preserved accurately across sync operations
 */

/**
 * Formats an ISO date string into a localized date string for display
 *
 * This is the primary date display function in FinTrac, converting stored ISO dates
 * into user-friendly formats. Since FinTrac stores all dates in ISO 8601 format
 * for sync consistency, this function bridges the gap between storage and presentation.
 *
 * Why this function is critical in FinTrac:
 * - Transactions display dates in user's preferred locale/format
 * - Dashboard charts need consistent date labels for X-axis
 * - Transaction lists require readable date columns
 * - Date filtering components need formatted date displays
 * - Mobile users expect native date formatting conventions
 *
 * Connects to:
 * - TransactionForm components for displaying selected dates
 * - Transaction list views for showing transaction dates
 * - DashboardChart for formatting chart axis labels
 * - Date picker components for showing current selections
 *
 * Assumptions:
 * - Input is a valid ISO 8601 date string from the database
 * - User's browser supports toLocaleDateString() API
 * - System locale settings are appropriate for the user
 * - Date-only display is sufficient (no time component needed)
 *
 * Edge cases handled:
 * - Invalid date strings display as "Invalid Date" (browser default)
 * - Null/undefined inputs will throw (caller should validate)
 * - Different locales will show different date formats automatically
 * - Timezone differences are ignored (displays local interpretation)
 *
 * @param date - ISO 8601 date string from FinTrac database
 * @returns Human-readable date string in user's locale format
 */
export const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString();
};

/**
 * Formats an ISO date string into a localized date and time string
 *
 * Provides full timestamp formatting for detailed views and audit trails in FinTrac.
 * This is essential for showing creation/modification times and supporting user
 * confidence in data synchronization across devices.
 *
 * Why this function is needed in FinTrac:
 * - Transaction metadata displays (created/updated timestamps)
 * - Sync debugging and conflict resolution interfaces
 * - Detailed transaction views with full temporal context
 * - Audit trails for understanding when data changes occurred
 * - User verification that sync operations completed successfully
 *
 * Connects to:
 * - Transaction detail modals showing creation/update times
 * - Sync status components displaying last sync timestamps
 * - Debug views for troubleshooting sync conflicts
 * - Data export features that include full timestamps
 *
 * Assumptions:
 * - Input is a valid ISO 8601 datetime string with timezone info
 * - User's browser supports toLocaleString() API
 * - Both date and time information are relevant to the user
 * - System locale provides appropriate datetime formatting
 *
 * Edge cases handled:
 * - Invalid datetime strings display as "Invalid Date"
 * - Timezone conversion happens automatically based on user's system
 * - Different locales show different datetime formats (12h vs 24h, etc.)
 * - Seconds precision may vary based on browser/locale settings
 *
 * @param date - ISO 8601 datetime string from FinTrac database
 * @returns Human-readable datetime string in user's locale format
 */
export const formatDateTime = (date: string): string => {
  return new Date(date).toLocaleString();
};
