/**
 * Formats an ISO date string into a localized date string.
 *
 * This utility provides human-readable date formatting for display purposes, improving UX by showing dates in the user's locale. It's essential for transaction lists and charts where dates need clear presentation.
 *
 * Assumptions:
 * - Input is a valid ISO 8601 date string.
 * - Browser supports toLocaleDateString().
 *
 * Edge cases:
 * - Invalid dates may display as "Invalid Date".
 * - Locale defaults to user's system settings.
 *
 * Connections:
 * - Used for displaying transaction dates in lists and forms.
 * - Supports date axes in DashboardChart.
 */
export const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString();
};

/**
 * Formats an ISO date string into a localized date and time string.
 *
 * This function offers detailed timestamp formatting for audit trails or detailed views, providing full temporal context. It's necessary for showing when transactions were created or modified.
 *
 * Assumptions:
 * - Input is a valid ISO 8601 date string.
 * - Browser supports toLocaleString().
 *
 * Edge cases:
 * - Invalid dates display as "Invalid Date".
 * - Includes both date and time for comprehensive information.
 *
 * Connections:
 * - Used for detailed transaction views or logs.
 * - Supports metadata display in transaction management features.
 */
export const formatDateTime = (date: string): string => {
  return new Date(date).toLocaleString();
};