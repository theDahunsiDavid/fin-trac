import React from "react";

interface HeaderProps {
  onInflowClick: () => void;
  onSpendClick: () => void;
  onSyncClick: () => void;
}

/**
 * Header component for FinTrac application.
 *
 * Provides the main navigation header with app logo and quick action buttons
 * for common transaction types. Designed to be reused across all pages.
 *
 * Features:
 * - Left-aligned app logo
 * - Quick action buttons for Inflow and Spend transactions
 * - Responsive layout using flexbox
 *
 * Assumptions:
 * - Tailwind CSS classes are available for styling
 * - Parent component provides click handlers for modal opening
 *
 * Edge cases:
 * - Responsive design handles various screen sizes
 * - Buttons are styled for hover states
 *
 * Connections:
 * - Triggers modal opening via props from parent component
 * - Inflow button opens transaction modal with credit type
 * - Spend button opens transaction modal with debit type
 */
export const Header: React.FC<HeaderProps> = ({
  onInflowClick,
  onSpendClick,
  onSyncClick,
}) => {
  // Simple sync status check - could be enhanced to use actual sync hook
  const syncEnabled = import.meta.env.VITE_SYNC_ENABLED === "true";

  // Determine sync button appearance based on status
  const getSyncButtonStyle = () => {
    if (!syncEnabled) {
      return "text-gray-400"; // Disabled/disconnected
    }
    // Could add more states here: syncing (yellow), connected (green), etc.
    return "text-blue-500"; // Default connected state
  };
  return (
    <header className="flex items-center justify-between mb-8">
      <h1 className="text-xl font-bold text-gray-620">FinTrac</h1>

      <div className="flex items-center gap-3">
        {/* Sync Button */}
        <button
          onClick={onSyncClick}
          className={`p-2 rounded hover:bg-gray-100 transition-colors ${getSyncButtonStyle()}`}
          title={syncEnabled ? "Open sync settings" : "Sync disabled"}
        >
          <span className="text-lg">☁️</span>
        </button>

        {/* Transaction Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onInflowClick}
            className="px-4 py-2 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700 transition-colors"
          >
            Inflow
          </button>
          <button
            onClick={onSpendClick}
            className="px-4 py-2 bg-emerald-50 text-gray-800 text-sm border border-gray-300 rounded hover:bg-emerald-100 transition-colors"
          >
            Spend
          </button>
        </div>
      </div>
    </header>
  );
};
