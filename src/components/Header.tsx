import React from "react";

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
 * - Button click handlers will be added when functionality is implemented
 *
 * Edge cases:
 * - Responsive design handles various screen sizes
 * - Buttons are styled for hover states
 */
export const Header: React.FC = () => {
  const handleInflowClick = () => {
    // TODO: Implement quick inflow transaction entry
    console.log("Inflow button clicked");
  };

  const handleSpendClick = () => {
    // TODO: Implement quick spend transaction entry
    console.log("Spend button clicked");
  };

  return (
    <header className="flex items-center justify-between mb-8">
      <h1 className="text-3xl font-bold text-gray-600">FinTrac</h1>

      <div className="flex gap-3">
        <button
          onClick={handleInflowClick}
          className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
        >
          Inflow
        </button>
        <button
          onClick={handleSpendClick}
          className="px-4 py-2 bg-rose-400 text-white rounded hover:bg-rose-500 transition-colors"
        >
          Spend
        </button>
      </div>
    </header>
  );
};
