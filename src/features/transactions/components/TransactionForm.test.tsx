import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TransactionForm } from './TransactionForm';

// Mock the confetti helper: jsdom has no canvas 2D context, and the module
// side effect should stay out of these tests.
vi.mock('../utils', () => ({
  celebrateCredit: vi.fn(),
  elementToConfettiOrigin: vi.fn(() => ({ x: 0.5, y: 0.5 })),
}));

import { celebrateCredit } from '../utils';

describe('TransactionForm', () => {
  const mockAddTransaction = vi.fn();
  const mockOnComplete = vi.fn();
  const mockDebitCelebrated = vi.fn();

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

  it('celebrates with confetti when a credit transaction is added', async () => {
    const user = userEvent.setup();
    render(
      <TransactionForm
        addTransaction={mockAddTransaction}
        onComplete={mockOnComplete}
        onDebitCelebrated={mockDebitCelebrated}
      />
    );

    await user.type(screen.getByPlaceholderText('Description'), 'Income');
    await user.type(screen.getByPlaceholderText('Amount'), '5000');
    await user.selectOptions(screen.getAllByRole('combobox')[0], 'credit');

    await user.click(screen.getByRole('button', { name: 'Add Transaction' }));

    await waitFor(() => {
      expect(celebrateCredit).toHaveBeenCalledTimes(1);
    });
    expect(celebrateCredit).toHaveBeenCalledWith({ x: 0.5, y: 0.5 });
    // Credit must not launch the debit flight.
    expect(mockDebitCelebrated).not.toHaveBeenCalled();
  });

  it('launches the debit flight when a debit transaction is added', async () => {
    const user = userEvent.setup();
    render(
      <TransactionForm
        addTransaction={mockAddTransaction}
        onComplete={mockOnComplete}
        onDebitCelebrated={mockDebitCelebrated}
      />
    );

    await user.type(screen.getByPlaceholderText('Description'), 'Rent');
    await user.type(screen.getByPlaceholderText('Amount'), '1250');
    await user.selectOptions(screen.getAllByRole('combobox')[0], 'debit');

    await user.click(screen.getByRole('button', { name: 'Add Transaction' }));

    await waitFor(() => {
      expect(mockDebitCelebrated).toHaveBeenCalledTimes(1);
    });
    // Node formats NGN with the code, not the ₦ symbol (browsers show ₦), so
    // assert the amount loosely.
    expect(mockDebitCelebrated).toHaveBeenCalledWith({
      origin: { x: 0.5, y: 0.5 },
      amount: expect.stringMatching(/1,250\.00/),
    });
    // The debit path must not fire the credit confetti.
    expect(celebrateCredit).not.toHaveBeenCalled();
  });

  it('does not celebrate when a debit transaction is added', async () => {
    const user = userEvent.setup();
    render(
      <TransactionForm
        addTransaction={mockAddTransaction}
        onComplete={mockOnComplete}
      />
    );

    await user.type(screen.getByPlaceholderText('Description'), 'Rent');
    await user.type(screen.getByPlaceholderText('Amount'), '100');
    await user.selectOptions(screen.getAllByRole('combobox')[0], 'debit');

    await user.click(screen.getByRole('button', { name: 'Add Transaction' }));

    await waitFor(() => {
      expect(mockAddTransaction).toHaveBeenCalled();
    });
    expect(celebrateCredit).not.toHaveBeenCalled();
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