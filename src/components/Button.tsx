import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
}

/**
 * Renders a styled button component with primary or secondary variants.
 *
 * This component is essential for maintaining consistent UI across the FinTrac app, providing a standardized way to handle user interactions like form submissions or navigation. It uses Tailwind CSS classes for styling, aligning with the app's design system that emphasizes emerald for primary actions.
 *
 * Assumptions:
 * - The parent component will provide children (text or icons) for the button content.
 * - onClick handler is optional for cases where the button is purely decorative or handled by form submission.
 *
 * Edge cases:
 * - If variant is not provided, defaults to 'primary' for main actions.
 * - Handles hover states automatically through CSS transitions.
 *
 * Connections:
 * - Used in TransactionForm for submitting new transactions, ensuring consistent call-to-action styling.
 * - Integrates with the app's Tailwind-based design system for responsive and accessible UI.
 */
export const Button: React.FC<ButtonProps> = ({ children, onClick, variant = 'primary' }) => {
  const baseClasses = 'px-4 py-2 rounded font-medium transition-colors';
  const variantClasses = variant === 'primary' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300';

  return (
    <button className={`${baseClasses} ${variantClasses}`} onClick={onClick}>
      {children}
    </button>
  );
};