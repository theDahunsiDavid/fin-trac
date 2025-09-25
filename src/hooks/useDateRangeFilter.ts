import { useState, useMemo } from 'react';
import type { Transaction } from '../features/transactions/types';

export type DateRange = 'all-time' | '7-days' | '30-days' | '90-days' | 'custom';

interface CustomDateRange {
  from: string;
  to: string;
}

export const useDateRangeFilter = (transactions: Transaction[]) => {
  const [dateRange, setDateRange] = useState<DateRange>('all-time');
  const [customRange, setCustomRange] = useState<CustomDateRange>({
    from: '',
    to: ''
  });

  const filteredTransactions = useMemo(() => {
    if (dateRange === 'all-time') return transactions;

    const now = new Date();
    let startDate: Date;

    if (dateRange === 'custom') {
      if (!customRange.from || !customRange.to) return transactions;
      startDate = new Date(customRange.from);
      const endDate = new Date(customRange.to);
      return transactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate >= startDate && transactionDate <= endDate;
      });
    }

    // Predefined ranges
    const days = dateRange === '7-days' ? 7 : dateRange === '30-days' ? 30 : 90;
    startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return transactions.filter(t => new Date(t.date) >= startDate);
  }, [transactions, dateRange, customRange]);

  return {
    filteredTransactions,
    dateRange,
    setDateRange,
    customRange,
    setCustomRange
  };
};
