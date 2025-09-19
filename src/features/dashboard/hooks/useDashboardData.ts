import { useMemo } from 'react';
import { useTransactions } from '../../transactions/hooks/useTransactions';

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