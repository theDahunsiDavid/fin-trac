import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useDashboardData } from '../hooks/useDashboardData';

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
  const { data } = useDashboardData();

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis
          tickFormatter={(value) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(value)}
          ticks={[0, 20000, 40000, 60000, 80000, 100000]}
        />
        <Tooltip />
        <Line type="monotone" dataKey="amount" stroke="#10b981" />
      </LineChart>
    </ResponsiveContainer>
  );
};