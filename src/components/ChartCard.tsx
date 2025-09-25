import React from "react";
import { Card } from "./Card";

interface ChartCardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

/**
 * Specialized ChartCard component for displaying charts and data visualizations.
 *
 * Provides consistent layout and formatting for chart components like line graphs,
 * bar charts, and other data visualizations. Built on top of the base Card component
 * with appropriate dimensions and optional title display.
 *
 * Features:
 * - Full width with flexible height for chart display
 * - Optional title header with consistent typography
 * - Built on base Card component for consistent styling
 * - Customizable dimensions via className prop
 * - Handles any chart component as children
 *
 * Assumptions:
 * - Chart components handle their own responsive behavior
 * - Card component provides consistent base styling
 * - Children components are chart or visualization elements
 *
 * Edge cases:
 * - Renders without title if not provided
 * - Handles any type of chart content via children
 * - Gracefully combines custom className with base styles
 *
 * Connections:
 * - Uses base Card component for consistent styling
 * - Container for DashboardChart and other chart components
 * - Part of the shared components system for UI consistency
 */
export const ChartCard: React.FC<ChartCardProps> = ({
  children,
  title,
  className = "",
}) => {
  return (
    <Card className={`w-full min-h-80 ${className}`}>
      {title && (
        <h3 className="text-base font-medium text-gray-900 mb-4">{title}</h3>
      )}
      <div className="w-full h-full">{children}</div>
    </Card>
  );
};
