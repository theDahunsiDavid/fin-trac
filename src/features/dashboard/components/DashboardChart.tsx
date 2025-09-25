import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { Transaction } from "../../transactions/types";

interface DashboardChartProps {
  transactions: Transaction[];
  balance: number;
}

/**
 * Renders a responsive line chart displaying transaction amounts over time.
 *
 * This component is key to the app's data visualization capabilities, providing users with visual insights into their financial patterns. It uses Recharts for rendering, ensuring interactive and accessible charts that align with the app's emerald color scheme. Now receives transaction data as props to maintain single source of truth for data management.
 *
 * Assumptions:
 * - transactions prop provides an array of Transaction objects with date and amount properties.
 * - balance prop provides the current calculated balance for line coloring.
 * - Recharts library is available and configured correctly.
 * - Parent component manages all data fetching and state updates.
 *
 * Edge cases:
 * - Handles empty data arrays gracefully, showing an empty chart.
 * - Y-axis is formatted as NGN currency, assuming all transactions use this currency.
 * - Responsive container adapts to different screen sizes.
 * - Chart data is memoized to prevent unnecessary recalculations on re-renders.
 *
 * Connections:
 * - Consumes data from parent component props instead of useDashboardData hook.
 * - Displays transaction trends, complementing the TransactionForm for data entry.
 * - Integrated into App.tsx as part of the dashboard section with prop-based data flow.
 * - No direct hook dependencies, ensuring clean separation of concerns.
 */
export const DashboardChart: React.FC<DashboardChartProps> = ({
  transactions,
  balance,
}) => {
  // Chart data - running balance over time, memoized for performance
  const data = useMemo(() => {
    let runningBalance = 0;
    return transactions
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((t) => {
        runningBalance += t.type === "credit" ? t.amount : -t.amount;
        return {
          date: new Date(t.date).toLocaleDateString(),
          amount: runningBalance,
        };
      });
  }, [transactions]);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={false} />
        <YAxis
          tickFormatter={(value) => {
            if (value === 0) return "₦0";
            if (Math.abs(value) >= 1000) {
              return `₦${(value / 1000).toFixed(0)}K`;
            }
            return `₦${value}`;
          }}
          tick={{ fontSize: 12 }}
        />
        {/* Add reference line at zero */}
        <ReferenceLine y={0} stroke="#374151" strokeDasharray="3 3" />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="amount"
          stroke={balance >= 0 ? "#10b981" : "#ef4444"}
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
