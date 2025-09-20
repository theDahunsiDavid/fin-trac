import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Flexible base Card component for FinTrac application.
 *
 * Provides consistent styling with white background, shadow, and rounded corners.
 * Designed to be reusable across different use cases including summary cards
 * and chart containers with customizable dimensions.
 *
 * Features:
 * - White background with subtle shadow
 * - Rounded corners for modern appearance
 * - Flexible dimensions via className prop
 * - Consistent padding and styling
 *
 * Assumptions:
 * - Tailwind CSS classes are available for styling
 * - Children content handles its own internal layout
 *
 * Edge cases:
 * - Handles any type of child content
 * - Gracefully combines custom className with base styles
 *
 * Connections:
 * - Used by SummaryCard for consistent dashboard metrics display
 * - Used by chart components for flexible container sizing
 * - Part of the shared components system for UI consistency
 */
export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-100 p-6 ${className}`}>
      {children}
    </div>
  );
};
