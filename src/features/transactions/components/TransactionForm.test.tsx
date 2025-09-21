import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TransactionForm } from './TransactionForm';

describe('TransactionForm', () => {
  const mockAddTransaction = vi.fn();
  const mockOnComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form fields correctly', () => {
    render(
      <TransactionForm
        addTransaction={mockAddTransaction}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.getByPlaceholderText('Description')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Amount')).toBeInTheDocument();
    expect(screen.getAllByRole('combobox')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Add Transaction' })).toBeInTheDocument();
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    render(
      <TransactionForm
        addTransaction={mockAddTransaction}
        onComplete={mockOnComplete}
      />
    );

    await user.type(screen.getByPlaceholderText('Description'), 'Test transaction');
    await user.type(screen.getByPlaceholderText('Amount'), '100.50');
    const selects = screen.getAllByRole('combobox');
    await user.selectOptions(selects[0], 'credit'); // type select
    await user.selectOptions(selects[1], 'Transport'); // category select

    await user.click(screen.getByRole('button', { name: 'Add Transaction' }));

    await waitFor(() => {
      expect(mockAddTransaction).toHaveBeenCalledWith({
        description: 'Test transaction',
        amount: 100.50,
        currency: 'NGN',
        type: 'credit',
        category: 'Transport',
        date: expect.any(String), // Date will be generated
      });
    });

    expect(mockOnComplete).toHaveBeenCalled();
  });

  it('does not submit form with empty description', async () => {
    const user = userEvent.setup();
    render(
      <TransactionForm
        addTransaction={mockAddTransaction}
        onComplete={mockOnComplete}
      />
    );

    await user.type(screen.getByPlaceholderText('Amount'), '100');
    await user.click(screen.getByRole('button', { name: 'Add Transaction' }));

    expect(mockAddTransaction).not.toHaveBeenCalled();
    expect(mockOnComplete).not.toHaveBeenCalled();
  });

  it('does not submit form with empty amount', async () => {
    const user = userEvent.setup();
    render(
      <TransactionForm
        addTransaction={mockAddTransaction}
        onComplete={mockOnComplete}
      />
    );

    await user.type(screen.getByPlaceholderText('Description'), 'Test');
    await user.click(screen.getByRole('button', { name: 'Add Transaction' }));

    expect(mockAddTransaction).not.toHaveBeenCalled();
    expect(mockOnComplete).not.toHaveBeenCalled();
  });

  it('resets form after successful submission', async () => {
    const user = userEvent.setup();
    render(
      <TransactionForm
        addTransaction={mockAddTransaction}
        onComplete={mockOnComplete}
      />
    );

    await user.type(screen.getByPlaceholderText('Description'), 'Test transaction');
    await user.type(screen.getByPlaceholderText('Amount'), '50');
    await user.selectOptions(screen.getAllByRole('combobox')[0], 'debit');

    await user.click(screen.getByRole('button', { name: 'Add Transaction' }));

    await waitFor(() => {
      expect(mockAddTransaction).toHaveBeenCalled();
    });

    expect(screen.getByPlaceholderText('Description')).toHaveValue('');
    expect((screen.getByPlaceholderText('Amount') as HTMLInputElement).value).toBe('');
    expect(screen.getAllByRole('combobox')[0]).toHaveValue('debit'); // initialType
    expect(screen.getAllByRole('combobox')[1]).toHaveValue('Food'); // reset to default
  });

  it('uses initialType prop', () => {
    render(
      <TransactionForm
        addTransaction={mockAddTransaction}
        initialType="credit"
      />
    );

    expect(screen.getAllByRole('combobox')[0]).toHaveValue('credit');
  });

  it('calls onComplete when provided', async () => {
    const user = userEvent.setup();
    render(
      <TransactionForm
        addTransaction={mockAddTransaction}
        onComplete={mockOnComplete}
      />
    );

    await user.type(screen.getByPlaceholderText('Description'), 'Test');
    await user.type(screen.getByPlaceholderText('Amount'), '100');
    await user.click(screen.getByRole('button', { name: 'Add Transaction' }));

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalled();
    });
  });
});