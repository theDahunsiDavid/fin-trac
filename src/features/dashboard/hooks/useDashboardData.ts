import { useMemo } from "react";
import { useTransactions } from "../../transactions/hooks/useTransactions";

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

  // Calculate current balance (credits - debits)
  const balance = useMemo(() => {
    return transactions.reduce((total, transaction) => {
      return transaction.type === "credit"
        ? total + transaction.amount
        : total - transaction.amount;
    }, 0);
  }, [transactions]);

  // Calculate total income (all credit transactions)
  const totalIncome = useMemo(() => {
    return transactions
      .filter((t) => t.type === "credit")
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  // Calculate total expenses (all debit transactions)
  const totalExpenses = useMemo(() => {
    return transactions
      .filter((t) => t.type === "debit")
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  // Chart data - running balance over time
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

  return {
    balance,
    totalIncome,
    totalExpenses,
    data,
    transactionCount: transactions.length,
  };
};
