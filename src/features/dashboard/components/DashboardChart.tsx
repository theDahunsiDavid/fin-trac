import React from "react";
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
import { useDashboardData } from "../hooks/useDashboardData";

/**
 * Renders a responsive line chart displaying transaction amounts over time.
 *
 * This component is key to the app's data visualization capabilities, providing users with visual insights into their financial patterns. It uses Recharts for rendering, ensuring interactive and accessible charts that align with the app's emerald color scheme.
 *
 * Assumptions:
 * - useDashboardData provides an array of objects with date and amount properties.
 * - Recharts library is available and configured correctly.
 *
 * Edge cases:
 * - Handles empty data arrays gracefully, showing an empty chart.
 * - Y-axis is formatted as NGN currency, assuming all transactions use this currency.
 * - Responsive container adapts to different screen sizes.
 *
 * Connections:
 * - Consumes data from useDashboardData hook.
 * - Displays transaction trends, complementing the TransactionForm for data entry.
 * - Integrated into App.tsx as part of the dashboard section.
 */
export const DashboardChart: React.FC = () => {
  const { data, balance } = useDashboardData();

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis
          tickFormatter={(value) =>
            new Intl.NumberFormat("en-NG", {
              style: "currency",
              currency: "NGN",
              signDisplay: "always",
            }).format(value)
          }
          // ticks={[0, 20000, 40000, 60000, 80000, 100000]}
        />
        // Add reference line at zero
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
