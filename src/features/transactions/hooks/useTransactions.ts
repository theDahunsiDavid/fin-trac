import { useState, useEffect, useCallback } from "react";
import type { Transaction } from "../types";
import {
  getTransactionRepository,
  getImplementation,
} from "../../../services/repos/RepositoryFactory";

/**
 * Custom hook for managing transaction state and operations in the FinTrac app.
 *
 * This hook provides a React-friendly interface to the transaction repository with support
 * for both Dexie and PouchDB implementations. It handles fetching, caching, and updating
 * transactions locally, ensuring the UI stays in sync with the chosen storage backend.
 *
 * Features:
 * - Automatic repository selection based on environment configuration
 * - Loading states for async operations
 * - Error handling with user-friendly error states
 * - Offline status detection
 * - Enhanced CRUD operations
 * - Real-time sync status (when using PouchDB)
 */
export const useTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [operationLoading, setOperationLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [dbImplementation, setDbImplementation] = useState<"dexie" | "pouchdb">(
    "dexie",
  );

  // Get repository instance
  const repo = getTransactionRepository();

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Set database implementation on mount
  useEffect(() => {
    setDbImplementation(getImplementation());
  }, []);

  /**
   * Fetches all transactions from the database
   */
  const fetchTransactions = useCallback(async () => {
    try {
      setError(null);
      const data = await repo.getAll();
      setTransactions(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch transactions";
      console.error("Failed to fetch transactions:", err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [repo]);

  // Initial data fetch
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  /**
   * Adds a new transaction to the database
   */
  const addTransaction = useCallback(
    async (
      transaction: Omit<Transaction, "id" | "createdAt" | "updatedAt">,
    ): Promise<Transaction | null> => {
      try {
        setOperationLoading(true);
        setError(null);

        const newTransaction = await repo.create(transaction);

        // Update local state
        setTransactions((prev) => [newTransaction, ...prev]);

        return newTransaction;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to add transaction";
        console.error("Failed to add transaction:", err);
        setError(errorMessage);
        return null;
      } finally {
        setOperationLoading(false);
      }
    },
    [repo],
  );

  /**
   * Updates an existing transaction
   */
  const updateTransaction = useCallback(
    async (
      id: string,
      updates: Partial<Omit<Transaction, "id" | "createdAt">>,
    ): Promise<Transaction | null> => {
      try {
        setOperationLoading(true);
        setError(null);

        const updatedTransaction = await repo.update(id, updates);

        // Update local state
        setTransactions((prev) =>
          prev.map((t) => (t.id === id ? updatedTransaction : t)),
        );

        return updatedTransaction;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update transaction";
        console.error("Failed to update transaction:", err);
        setError(errorMessage);
        return null;
      } finally {
        setOperationLoading(false);
      }
    },
    [repo],
  );

  /**
   * Deletes a transaction
   */
  const deleteTransaction = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        setOperationLoading(true);
        setError(null);

        await repo.delete(id);

        // Update local state
        setTransactions((prev) => prev.filter((t) => t.id !== id));

        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to delete transaction";
        console.error("Failed to delete transaction:", err);
        setError(errorMessage);
        return false;
      } finally {
        setOperationLoading(false);
      }
    },
    [repo],
  );

  /**
   * Gets transactions by date range
   */
  const getTransactionsByDateRange = useCallback(
    async (startDate: string, endDate: string): Promise<Transaction[]> => {
      try {
        setError(null);
        return await repo.getByDateRange(startDate, endDate);
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to fetch transactions by date range";
        console.error("Failed to fetch transactions by date range:", err);
        setError(errorMessage);
        return [];
      }
    },
    [repo],
  );

  /**
   * Gets transactions by category
   */
  const getTransactionsByCategory = useCallback(
    async (category: string): Promise<Transaction[]> => {
      try {
        setError(null);
        return await repo.getByCategory(category);
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to fetch transactions by category";
        console.error("Failed to fetch transactions by category:", err);
        setError(errorMessage);
        return [];
      }
    },
    [repo],
  );

  /**
   * Gets transactions by type
   */
  const getTransactionsByType = useCallback(
    async (type: "credit" | "debit"): Promise<Transaction[]> => {
      try {
        setError(null);
        return await repo.getByType(type);
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to fetch transactions by type";
        console.error("Failed to fetch transactions by type:", err);
        setError(errorMessage);
        return [];
      }
    },
    [repo],
  );

  /**
   * Searches transactions by description
   */
  const searchTransactions = useCallback(
    async (query: string): Promise<Transaction[]> => {
      try {
        setError(null);
        return await repo.searchByDescription(query);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to search transactions";
        console.error("Failed to search transactions:", err);
        setError(errorMessage);
        return [];
      }
    },
    [repo],
  );

  /**
   * Refreshes transactions from the database
   */
  const refreshTransactions = useCallback(async () => {
    setLoading(true);
    await fetchTransactions();
  }, [fetchTransactions]);

  /**
   * Gets database info and status
   */
  const getDatabaseInfo = useCallback(async () => {
    try {
      return await repo.getInfo();
    } catch (err) {
      console.error("Failed to get database info:", err);
      return null;
    }
  }, [repo]);

  /**
   * Clears all transactions (primarily for testing)
   */
  const clearAllTransactions = useCallback(async (): Promise<boolean> => {
    try {
      setOperationLoading(true);
      setError(null);

      await repo.clear();
      setTransactions([]);

      return true;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to clear transactions";
      console.error("Failed to clear transactions:", err);
      setError(errorMessage);
      return false;
    } finally {
      setOperationLoading(false);
    }
  }, [repo]);

  return {
    // Data
    transactions,

    // Status
    loading,
    operationLoading,
    error,
    isOffline,
    dbImplementation,

    // CRUD Operations
    addTransaction,
    updateTransaction,
    deleteTransaction,

    // Query Operations
    getTransactionsByDateRange,
    getTransactionsByCategory,
    getTransactionsByType,
    searchTransactions,

    // Utility Operations
    refreshTransactions,
    getDatabaseInfo,
    clearAllTransactions,

    // Error Management
    clearError: () => setError(null),
  };
};
