import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardChart } from './DashboardChart';
import type { Transaction } from '../../transactions/types';

// Mock Recharts components
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children, data }: { children: React.ReactNode; data: unknown }) => <div data-testid="line-chart" data-data={JSON.stringify(data)}>{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ReferenceLine: () => <div data-testid="reference-line" />,
}));

describe('DashboardChart', () => {
  it('renders chart components', () => {
    const transactions: Transaction[] = [
      {
        id: '1',
        date: '2023-01-01',
        description: 'Income',
        amount: 1000,
        currency: 'NGN',
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
        currency: 'NGN',
        type: 'debit',
        category: 'Food',
        createdAt: '2023-01-02T00:00:00Z',
        updatedAt: '2023-01-02T00:00:00Z',
      },
    ];

    render(<DashboardChart transactions={transactions} balance={800} />);

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    expect(screen.getByTestId('line')).toBeInTheDocument();
    expect(screen.getByTestId('x-axis')).toBeInTheDocument();
    expect(screen.getByTestId('y-axis')).toBeInTheDocument();
    expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    expect(screen.getByTestId('reference-line')).toBeInTheDocument();
  });

  it('calculates running balance data correctly', () => {
    const transactions: Transaction[] = [
      {
        id: '1',
        date: '2023-01-01',
        description: 'Income',
        amount: 500,
        currency: 'NGN',
        type: 'credit',
        category: 'Salary',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      },
      {
        id: '2',
        date: '2023-01-02',
        description: 'Expense',
        amount: 100,
        currency: 'NGN',
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
        currency: 'NGN',
        type: 'credit',
        category: 'Freelance',
        createdAt: '2023-01-03T00:00:00Z',
        updatedAt: '2023-01-03T00:00:00Z',
      },
    ];

    render(<DashboardChart transactions={transactions} balance={700} />);

    const chart = screen.getByTestId('line-chart');
    const data = JSON.parse(chart.getAttribute('data-data') || '[]');

    expect(data).toEqual([
      { date: new Date('2023-01-01').toLocaleDateString(), amount: 500 },
      { date: new Date('2023-01-02').toLocaleDateString(), amount: 400 },
      { date: new Date('2023-01-03').toLocaleDateString(), amount: 700 },
    ]);
  });

  it('handles empty transactions array', () => {
    render(<DashboardChart transactions={[]} balance={0} />);

    const chart = screen.getByTestId('line-chart');
    const data = JSON.parse(chart.getAttribute('data-data') || '[]');

    expect(data).toEqual([]);
  });

  it('sorts transactions by date', () => {
    const transactions: Transaction[] = [
      {
        id: '2',
        date: '2023-01-03',
        description: 'Later transaction',
        amount: 100,
        currency: 'NGN',
        type: 'credit',
        category: 'Test',
        createdAt: '2023-01-03T00:00:00Z',
        updatedAt: '2023-01-03T00:00:00Z',
      },
      {
        id: '1',
        date: '2023-01-01',
        description: 'Earlier transaction',
        amount: 200,
        currency: 'NGN',
        type: 'credit',
        category: 'Test',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      },
    ];

    render(<DashboardChart transactions={transactions} balance={300} />);

    const chart = screen.getByTestId('line-chart');
    const data = JSON.parse(chart.getAttribute('data-data') || '[]');

    expect(data[0].amount).toBe(200); // First transaction (earlier date)
    expect(data[1].amount).toBe(300); // Running balance after second transaction
  });
});