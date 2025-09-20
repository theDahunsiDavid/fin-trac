import { useMemo } from 'react';
import { useTransactions } from '../../transactions/hooks/useTransactions';

/**
 * Custom hook that processes transaction data for dashboard visualization.
 *
 * This hook transforms raw transaction data into a format suitable for charting, enabling the app to display financial trends. It's necessary for decoupling data processing from UI rendering, improving performance and maintainability in the dashboard feature.
 *
 * Assumptions:
 * - useTransactions provides a list of transactions with date and amount fields.
 * - Data is memoized to prevent unnecessary recalculations on re-renders.
 *
 * Edge cases:
 * - If no transactions exist, returns an empty array, allowing charts to handle empty states.
 * - Assumes date and amount are always present and valid.
 *
 * Connections:
 * - Depends on useTransactions for raw data.
 * - Provides processed data to DashboardChart component for rendering line charts.
 * - Part of the dashboard feature module, supporting visual analytics.
 */
export const useDashboardData = () => {
  const { transactions } = useTransactions();

  const data = useMemo(() => {
    return transactions.map(t => ({
      date: t.date,
      amount: t.amount
    }));
  }, [transactions]);

  return { data };
};