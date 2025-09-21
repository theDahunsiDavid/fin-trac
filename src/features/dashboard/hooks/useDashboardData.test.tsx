import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDashboardData } from './useDashboardData';
import type { Transaction } from '../../transactions/types';

// Mock useTransactions
const mockUseTransactions = vi.fn();

vi.mock('../../transactions/hooks/useTransactions', () => ({
  useTransactions: () => mockUseTransactions(),
}));

describe('useDashboardData', () => {
  it('calculates balance correctly', () => {
    const transactions: Transaction[] = [
      {
        id: '1',
        date: '2023-01-01',
        description: 'Income',
        amount: 1000,
        currency: 'USD',
        type: 'credit',
        category: 'Salary',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      },
      {
        id: '2',
        date: '2023-01-02',
        description: 'Expense',
        amount: 200,
        currency: 'USD',
        type: 'debit',
        category: 'Food',
        createdAt: '2023-01-02T00:00:00Z',
        updatedAt: '2023-01-02T00:00:00Z',
      },
    ];

    mockUseTransactions.mockReturnValue({ transactions });

    const { result } = renderHook(() => useDashboardData());

    expect(result.current.balance).toBe(800);
    expect(result.current.totalIncome).toBe(1000);
    expect(result.current.totalExpenses).toBe(200);
    expect(result.current.transactionCount).toBe(2);
  });

  it('handles empty transactions', () => {
    mockUseTransactions.mockReturnValue({ transactions: [] });

    const { result } = renderHook(() => useDashboardData());

    expect(result.current.balance).toBe(0);
    expect(result.current.totalIncome).toBe(0);
    expect(result.current.totalExpenses).toBe(0);
    expect(result.current.data).toEqual([]);
    expect(result.current.transactionCount).toBe(0);
  });

  it('calculates running balance over time', () => {
    const transactions: Transaction[] = [
      {
        id: '1',
        date: '2023-01-01',
        description: 'Income 1',
        amount: 500,
        currency: 'USD',
        type: 'credit',
        category: 'Salary',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      },
      {
        id: '2',
        date: '2023-01-02',
        description: 'Expense 1',
        amount: 100,
        currency: 'USD',
        type: 'debit',
        category: 'Food',
        createdAt: '2023-01-02T00:00:00Z',
        updatedAt: '2023-01-02T00:00:00Z',
      },
      {
        id: '3',
        date: '2023-01-03',
        description: 'Income 2',
        amount: 300,
        currency: 'USD',
        type: 'credit',
        category: 'Freelance',
        createdAt: '2023-01-03T00:00:00Z',
        updatedAt: '2023-01-03T00:00:00Z',
      },
    ];

    mockUseTransactions.mockReturnValue({ transactions });

    const { result } = renderHook(() => useDashboardData());

    expect(result.current.data).toEqual([
      { date: new Date('2023-01-01').toLocaleDateString(), amount: 500 },
      { date: new Date('2023-01-02').toLocaleDateString(), amount: 400 },
      { date: new Date('2023-01-03').toLocaleDateString(), amount: 700 },
    ]);
  });

  it('only includes credit transactions in totalIncome', () => {
    const transactions: Transaction[] = [
      {
        id: '1',
        date: '2023-01-01',
        description: 'Income',
        amount: 1000,
        currency: 'USD',
        type: 'credit',
        category: 'Salary',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      },
      {
        id: '2',
        date: '2023-01-01',
        description: 'Refund (credit)',
        amount: 50,
        currency: 'USD',
        type: 'credit',
        category: 'Refund',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      },
    ];

    mockUseTransactions.mockReturnValue({ transactions });

    const { result } = renderHook(() => useDashboardData());

    expect(result.current.totalIncome).toBe(1050);
  });

  it('only includes debit transactions in totalExpenses', () => {
    const transactions: Transaction[] = [
      {
        id: '1',
        date: '2023-01-01',
        description: 'Food',
        amount: 50,
        currency: 'USD',
        type: 'debit',
        category: 'Food',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      },
      {
        id: '2',
        date: '2023-01-01',
        description: 'Transport',
        amount: 25,
        currency: 'USD',
        type: 'debit',
        category: 'Transport',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      },
    ];

    mockUseTransactions.mockReturnValue({ transactions });

    const { result } = renderHook(() => useDashboardData());

    expect(result.current.totalExpenses).toBe(75);
  });
});