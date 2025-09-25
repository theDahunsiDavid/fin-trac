import React from "react";
import { Card } from "./Card";

interface SummaryCardProps {
  title: string;
  value: number;
  description: string;
  variant?: "positive" | "negative" | "neutral";
  format?: "currency" | "percentage";
}

/**
 * Specialized SummaryCard component for displaying dashboard metrics.
 *
 * Provides consistent layout and formatting for financial summary data like
 * balance, income, and expenses. Built on top of the base Card component
 * with fixed dimensions and structured content layout.
 *
 * Features:
 * - Consistent dimensions across all summary cards
 * - Automatic currency formatting for NGN
 * - Visual variants for positive/negative/neutral values
 * - Left-aligned text layout with title, value, and description
 * - Handles large numbers with proper formatting
 *
 * Assumptions:
 * - All monetary values are in NGN currency
 * - Value prop is always a number (can be positive, negative, or zero)
 * - Card component provides consistent base styling
 *
 * Edge cases:
 * - Handles negative values with proper formatting and color coding
 * - Large numbers are formatted with appropriate separators
 * - Zero values are treated as neutral
 *
 * Connections:
 * - Uses base Card component for consistent styling
 * - Displays data from useDashboardData hook calculations
 * - Part of dashboard layout alongside charts and other metrics
 */
export const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  value,
  description,
  variant = "neutral",
  format = "currency",
}) => {
  const formatValue = (amount: number) => {
    if (format === "percentage") {
      return `${amount.toFixed(1)}%`;
    }
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getValueColor = () => {
    if (variant === "positive") return "text-emerald-600";
    if (variant === "negative") return "text-rose-600";
    return "text-gray-900";
  };

  return (
    <Card className="w-64 h-32">
      <div className="flex flex-col justify-between h-full">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>

        <div className={`text-1x1 font-bold ${getValueColor()}`}>
          {formatValue(value)}
        </div>

        <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
      </div>
    </Card>
  );
};
