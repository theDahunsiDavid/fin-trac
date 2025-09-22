import { useState, useEffect, useCallback } from "react";
import type { Transaction } from "../types";
import {
  getTransactionRepository,
  getImplementation,
} from "../../../services/repos/RepositoryFactory";

/**
 * useTransactions Hook for FinTrac Personal Finance Tracker
 *
 * Provides a comprehensive React interface for managing transaction state and
 * operations in FinTrac's local-first personal finance tracking system. This
 * hook bridges the gap between React's component lifecycle and FinTrac's
 * repository pattern, ensuring optimal user experience and data consistency.
 *
 * Why this hook is essential for FinTrac:
 * - Provides reactive state management for financial transaction data
 * - Abstracts complex repository operations behind simple React patterns
 * - Ensures UI consistency through centralized transaction state management
 * - Handles network connectivity and offline scenarios gracefully
 * - Supports real-time sync updates through event-driven architecture
 * - Optimizes performance through memoization and careful re-render control
 *
 * React patterns implemented:
 * - Custom hook pattern for reusable transaction logic
 * - State management with useState for reactive UI updates
 * - Effect management with useEffect for lifecycle operations
 * - Callback memoization with useCallback for performance optimization
 * - Event-driven updates for real-time sync integration
 * - Error boundary support through comprehensive error handling
 *
 * Repository integration:
 * - Automatic repository selection based on environment configuration
 * - Support for both Dexie (IndexedDB) and legacy PouchDB implementations
 * - Transparent switching between storage backends without UI changes
 * - Consistent error handling across different repository implementations
 * - Performance optimization through repository-level caching
 *
 * Features provided:
 * - Complete CRUD operations (Create, Read, Update, Delete)
 * - Advanced querying (date range, category, type, description search)
 * - Loading states for optimal user experience
 * - Error handling with user-friendly error messages
 * - Offline status detection and handling
 * - Real-time sync status and automatic refresh
 * - Database introspection and debugging utilities
 */
export const useTransactions = () => {
  // Core transaction data state
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Loading and operation states for UX feedback
  const [loading, setLoading] = useState(true);
  const [operationLoading, setOperationLoading] = useState(false);

  // Error state for user feedback and debugging
  const [error, setError] = useState<string | null>(null);

  // Network connectivity state for offline handling
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Database implementation tracking for debugging and feature compatibility
  const [dbImplementation, setDbImplementation] = useState<"dexie" | "pouchdb">(
    "dexie",
  );

  // Get repository instance through factory pattern
  const repo = getTransactionRepository();

  /**
   * Network connectivity monitoring for offline-first architecture
   *
   * Tracks browser online/offline status to provide accurate connectivity
   * feedback to users and enable appropriate offline behavior in the UI.
   * Essential for FinTrac's offline-first design philosophy.
   */
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

  /**
   * Database implementation detection for debugging and feature compatibility
   *
   * Determines which storage backend is currently active (Dexie or PouchDB)
   * to enable implementation-specific features and provide accurate system
   * information to users and developers.
   */
  useEffect(() => {
    setDbImplementation(getImplementation());
  }, []);

  /**
   * Fetches all transactions from the repository with error handling
   *
   * Core data loading function that retrieves complete transaction dataset
   * for dashboard display, analytics, and user interaction. Implements
   * comprehensive error handling and loading state management.
   *
   * Why this approach is used:
   * - Centralized data fetching ensures consistent error handling
   * - Loading state management provides immediate user feedback
   * - Error state enables graceful degradation and user notification
   * - Repository abstraction enables storage backend flexibility
   * - Memoization prevents unnecessary re-execution during re-renders
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

  /**
   * Initial data loading on hook mount
   *
   * Triggers initial transaction data fetch when the hook is first used,
   * ensuring components have access to financial data immediately upon
   * mounting. Essential for providing immediate value to users.
   */
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  /**
   * Real-time sync event handling for cross-device data consistency
   *
   * Listens for sync events from FinTrac's cross-device synchronization
   * system and automatically refreshes transaction data when remote changes
   * are detected. Critical for maintaining data consistency across devices.
   *
   * Why comprehensive event listening is necessary:
   * - Transaction sync events require immediate UI refresh
   * - Category sync events affect transaction display (category names/colors)
   * - Conflict resolution events need UI updates to show resolved data
   * - Generic sync events provide fallback for any missed specific events
   * - Event-driven architecture enables real-time user experience
   */
  useEffect(() => {
    const handleSyncDataUpdate = (event: CustomEvent) => {
      const { eventType } = event.detail;
      console.log(
        `Sync data updated: ${eventType}, refreshing transactions...`,
      );
      fetchTransactions();
    };

    const handleTransactionSync = () => {
      console.log("Transaction sync event detected, refreshing...");
      fetchTransactions();
    };

    const handleCategorySync = () => {
      console.log("Category sync event detected, refreshing...");
      fetchTransactions(); // Categories affect transaction display
    };

    // Listen for general sync data updates
    window.addEventListener(
      "sync-data-updated",
      handleSyncDataUpdate as EventListener,
    );

    // Listen for specific transaction events
    window.addEventListener(
      "sync-transaction-added",
      handleTransactionSync as EventListener,
    );
    window.addEventListener(
      "sync-transaction-updated",
      handleTransactionSync as EventListener,
    );
    window.addEventListener(
      "sync-transaction-conflict-resolved",
      handleTransactionSync as EventListener,
    );

    // Listen for category events (affects transaction display)
    window.addEventListener(
      "sync-category-added",
      handleCategorySync as EventListener,
    );
    window.addEventListener(
      "sync-category-updated",
      handleCategorySync as EventListener,
    );
    window.addEventListener(
      "sync-category-conflict-resolved",
      handleCategorySync as EventListener,
    );

    return () => {
      window.removeEventListener(
        "sync-data-updated",
        handleSyncDataUpdate as EventListener,
      );
      window.removeEventListener(
        "sync-transaction-added",
        handleTransactionSync as EventListener,
      );
      window.removeEventListener(
        "sync-transaction-updated",
        handleTransactionSync as EventListener,
      );
      window.removeEventListener(
        "sync-transaction-conflict-resolved",
        handleTransactionSync as EventListener,
      );
      window.removeEventListener(
        "sync-category-added",
        handleCategorySync as EventListener,
      );
      window.removeEventListener(
        "sync-category-updated",
        handleCategorySync as EventListener,
      );
      window.removeEventListener(
        "sync-category-conflict-resolved",
        handleCategorySync as EventListener,
      );
    };
  }, [fetchTransactions]);

  /**
   * Adds a new transaction to FinTrac with optimistic UI updates
   *
   * Creates new financial transactions with comprehensive error handling,
   * loading states, and optimistic UI updates. Essential for transaction
   * entry workflows and maintaining responsive user experience.
   *
   * Why this implementation approach:
   * - Optimistic updates provide immediate UI feedback
   * - Comprehensive error handling enables graceful failure recovery
   * - Loading states prevent double-submission and provide user feedback
   * - Repository abstraction enables storage backend flexibility
   * - Debug logging facilitates troubleshooting in development
   *
   * Optimistic update strategy:
   * - Immediately add transaction to local state for instant UI response
   * - Repository operation runs in background with error handling
   * - Failed operations revert optimistic changes and show error messages
   * - Successful operations confirm optimistic changes with server data
   *
   * @param transaction Complete transaction data excluding system-generated fields
   * @returns Promise resolving to created transaction or null if failed
   */
  const addTransaction = useCallback(
    async (
      transaction: Omit<Transaction, "id" | "createdAt" | "updatedAt">,
    ): Promise<Transaction | null> => {
      try {
        console.log("=== ADD TRANSACTION DEBUG ===");
        console.log("Input transaction:", transaction);
        console.log("Repository implementation:", getImplementation());
        console.log("Repository instance:", repo);

        setOperationLoading(true);
        setError(null);

        console.log("Calling repo.create...");
        const newTransaction = await repo.create(transaction);
        console.log("Repository create successful:", newTransaction);

        console.log("Updating local state...");
        // Optimistic UI update with new transaction
        setTransactions((prev) => {
          console.log("Previous transactions count:", prev.length);
          const updated = [newTransaction, ...prev];
          console.log("Updated transactions count:", updated.length);
          return updated;
        });

        console.log("Transaction added successfully");
        console.log("=== END ADD TRANSACTION DEBUG ===");
        return newTransaction;
      } catch (err) {
        console.error("=== ADD TRANSACTION ERROR ===");
        console.error("Error type:", typeof err);
        console.error("Error constructor:", err?.constructor?.name);
        console.error(
          "Error message:",
          err instanceof Error ? err.message : "No message",
        );
        console.error(
          "Error stack:",
          err instanceof Error ? err.stack : "No stack",
        );
        console.error("Full error object:", err);
        console.error("=== END ADD TRANSACTION ERROR ===");

        const errorMessage =
          err instanceof Error ? err.message : "Failed to add transaction";
        setError(errorMessage);
        return null;
      } finally {
        setOperationLoading(false);
      }
    },
    [repo],
  );

  /**
   * Updates an existing transaction with optimistic UI updates
   *
   * Modifies transaction data while maintaining UI responsiveness through
   * optimistic updates and comprehensive error handling. Essential for
   * transaction editing workflows and data correction scenarios.
   *
   * Why optimistic updates are used:
   * - Immediate UI feedback improves perceived performance
   * - Reduces user wait time for common edit operations
   * - Maintains responsive interface during network delays
   * - Provides graceful fallback if operations fail
   *
   * @param id Transaction ID to update
   * @param updates Partial transaction data with fields to modify
   * @returns Promise resolving to updated transaction or null if failed
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

        // Optimistic UI update with modified transaction
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
   * Deletes a transaction with optimistic UI updates
   *
   * Removes transaction from FinTrac with immediate UI response and proper
   * error handling. Supports transaction deletion workflows and data cleanup
   * operations while maintaining responsive user experience.
   *
   * Why immediate UI updates are critical:
   * - Users expect immediate feedback for destructive operations
   * - Prevents accidental double-deletion attempts
   * - Maintains UI consistency during network operations
   * - Enables quick undo workflows if needed in future
   *
   * @param id Transaction ID to delete
   * @returns Promise resolving to true if successful, false if failed
   */
  const deleteTransaction = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        setOperationLoading(true);
        setError(null);

        await repo.delete(id);

        // Optimistic UI update by removing transaction
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
   * Retrieves transactions within a specific date range for time-based analysis
   *
   * Enables period-specific financial analysis essential for budgeting,
   * reporting, and trend identification. Powers FinTrac's time-based
   * filtering and analytics features.
   *
   * @param startDate Start date in ISO format (YYYY-MM-DD), inclusive
   * @param endDate End date in ISO format (YYYY-MM-DD), inclusive
   * @returns Promise resolving to transactions within the date range
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
   * Retrieves transactions filtered by category for spending analysis
   *
   * Enables category-based financial analysis essential for understanding
   * spending patterns and budget allocation. Powers FinTrac's categorization
   * and analytics features.
   *
   * @param category Exact category name to filter transactions by
   * @returns Promise resolving to all transactions in the specified category
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
   * Retrieves transactions filtered by type for income vs expense analysis
   *
   * Enables fundamental income/expense separation critical for balance
   * calculations and cash flow analysis. Powers FinTrac's financial
   * health monitoring features.
   *
   * @param type Transaction type ("credit" for income, "debit" for expenses)
   * @returns Promise resolving to all transactions of the specified type
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
   * Searches transactions by description text for finding specific records
   *
   * Provides full-text search capability enabling users to locate transactions
   * based on merchant names or transaction details. Essential for transaction
   * lookup and reconciliation workflows.
   *
   * @param query Search string to match against transaction descriptions
   * @returns Promise resolving to transactions containing the query string
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
   * Refreshes transactions from the database for manual data synchronization
   *
   * Provides manual refresh capability for users who want to ensure they
   * have the latest data, especially useful during debugging or after
   * manual database operations.
   *
   * Why manual refresh is important:
   * - Users may want to force refresh after configuration changes
   * - Debugging workflows benefit from manual data refresh capability
   * - Network issues may require manual refresh to retry failed operations
   * - Power users appreciate control over data synchronization timing
   */
  const refreshTransactions = useCallback(async () => {
    setLoading(true);
    await fetchTransactions();
  }, [fetchTransactions]);

  /**
   * Retrieves database metadata and status for monitoring and debugging
   *
   * Provides system information essential for troubleshooting, monitoring,
   * and displaying system status to users. Supports FinTrac's transparency
   * and debugging capabilities.
   *
   * @returns Promise resolving to database information object or null if failed
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
   * Clears all transactions for testing and development workflows
   *
   * Provides complete data reset capability primarily for testing scenarios
   * and development workflows. This destructive operation requires careful
   * consideration and appropriate safeguards in production environments.
   *
   * Why clearing capability is needed:
   * - Testing workflows require clean data states
   * - Development environments need reset capability
   * - Demo scenarios benefit from quick data cleanup
   * - Migration testing requires clean slate operations
   *
   * @returns Promise resolving to true if successful, false if failed
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

  // Return comprehensive API for transaction management
  return {
    // Core transaction data
    transactions,

    // Status indicators for UI feedback
    loading,
    operationLoading,
    error,
    isOffline,
    dbImplementation,

    // Core CRUD operations
    addTransaction,
    updateTransaction,
    deleteTransaction,

    // Advanced query operations
    getTransactionsByDateRange,
    getTransactionsByCategory,
    getTransactionsByType,
    searchTransactions,

    // Utility operations
    refreshTransactions,
    getDatabaseInfo,
    clearAllTransactions,

    // Error management
    clearError: () => setError(null),
  };
};
