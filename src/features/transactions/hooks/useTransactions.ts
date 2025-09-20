import { useState, useEffect } from 'react';
import type { Transaction } from '../types';
import { TransactionRepository } from '../../../services/repos/TransactionRepository';

const repo = new TransactionRepository();

/**
 * Custom hook for managing transaction state and operations in the FinTrac app.
 *
 * This hook is vital for the app's data flow, providing a React-friendly interface to the transaction repository. It handles fetching, caching, and updating transactions locally, ensuring the UI stays in sync with the IndexedDB storage without external API calls.
 *
 * Assumptions:
 * - TransactionRepository is properly initialized and handles all database interactions.
 * - Component using this hook will handle loading states appropriately.
 *
 * Edge cases:
 * - Handles fetch errors by logging them, preventing app crashes.
 * - Refetches all transactions after adding to ensure consistency.
 * - Loading state prevents premature renders during initial data load.
 *
 * Connections:
 * - Uses TransactionRepository for all CRUD operations.
 * - Provides data to useDashboardData hook for chart visualization.
 * - Used by TransactionForm to add new transactions and update the list.
 */
export const useTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    /**
     * Fetches all transactions from the local database on hook mount.
     *
     * This function initializes the transaction list by querying IndexedDB, ensuring the app displays existing data immediately. It's necessary for the local-first architecture, providing offline access to previously stored transactions.
     *
     * Assumptions:
     * - Database is accessible and TransactionRepository.getAll() succeeds.
     * - Errors are logged but don't prevent the app from functioning.
     *
     * Edge cases:
     * - If fetch fails, transactions remain empty, allowing the app to continue with add operations.
     * - Loading state is set to false regardless of success/failure to unblock UI.
     *
     * Connections:
     * - Calls TransactionRepository.getAll() to retrieve data.
     * - Updates the transactions state, which is consumed by components like DashboardChart.
     */
    const fetchTransactions = async () => {
      try {
        const data = await repo.getAll();
        setTransactions(data);
      } catch (error) {
        console.error('Failed to fetch transactions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  /**
   * Adds a new transaction to the database and refreshes the local state.
   *
   * This method is essential for user-driven data entry, allowing real-time updates to the transaction list. It ensures data persistence and immediate UI feedback, core to the app's interactive experience.
   *
   * Assumptions:
   * - Transaction data is validated before calling this function.
   * - Repository handles ID generation and timestamps.
   *
   * Edge cases:
   * - Errors during addition are logged, but state isn't updated if creation fails.
   * - Refetches all transactions to ensure consistency, even if inefficient for large datasets.
   *
   * Connections:
   * - Calls TransactionRepository.create() to persist data.
   * - Refetches data to update useDashboardData and other dependent hooks.
   * - Triggered by TransactionForm submission.
   */
  const addTransaction = async (transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await repo.create(transaction);
      // Refresh transactions
      const data = await repo.getAll();
      setTransactions(data);
    } catch (error) {
      console.error('Failed to add transaction:', error);
    }
  };

  return { transactions, loading, addTransaction };
};