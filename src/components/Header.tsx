import React from "react";

interface HeaderProps {
  onInflowClick: () => void;
  onSpendClick: () => void;
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
}) => {
  return (
    <header className="flex items-center justify-between mb-12">
      <h1 className="text-xl font-light text-gray-620">fintrac</h1>

      <div className="flex items-center gap-3">
        <button
          onClick={onInflowClick}
          className="px-4 py-2 bg-[#163300] text-white text-sm rounded hover:bg-[#1f4400] transition-colors"
        >
          We're <em className="text-[#9fe870]">Rich!</em>
        </button>
        <button
          onClick={onSpendClick}
          className="px-4 py-2 bg-[#fbfdfb] text-gray-800 text-sm border border-gray-300 rounded hover:bg-[#f3f7f1] transition-colors"
        >
          Poverty
        </button>
      </div>
    </header>
  );
};
