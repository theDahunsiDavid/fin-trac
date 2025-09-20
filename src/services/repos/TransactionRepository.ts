import { db } from "../db/db";
import type { Transaction } from "../../features/transactions/types";

/**
 * Repository class for transaction CRUD operations using IndexedDB.
 *
 * This class encapsulates all database interactions for transactions, providing a clean API for the business logic layer. It's essential for the app's data access pattern, ensuring separation of concerns and testability in the local-first architecture.
 *
 * Assumptions:
 * - FinTracDB instance is properly initialized.
 * - Transaction type matches the database schema.
 *
 * Edge cases:
 * - All operations are asynchronous, handling IndexedDB's async nature.
 * - Errors from Dexie are propagated to callers for handling.
 *
 * Connections:
 * - Used by useTransactions hook for state management.
 * - Supports TransactionForm for adding data and DashboardChart for displaying it.
 */
export class TransactionRepository {
  /**
   * Retrieves all transactions from the database.
   *
   * This method fetches the complete transaction history, enabling full data display in the UI. It's necessary for initializing the app state and ensuring users see all their recorded transactions.
   *
   * Assumptions:
   * - Database is accessible and contains valid transaction data.
   * - Caller handles the returned array appropriately.
   *
   * Edge cases:
   * - Returns empty array if no transactions exist.
   * - Orders results as per IndexedDB default (insertion order).
   *
   * Connections:
   * - Called by useTransactions on mount and after additions.
   * - Provides data for dashboard visualizations and transaction lists.
   */
  async getAll(): Promise<Transaction[]> {
    return await db.transactions.toArray();
  }

  /**
   * Creates a new transaction in the database.
   *
   * This method adds user-entered transactions to persistent storage, generating unique IDs and timestamps. It's crucial for data entry workflows, ensuring each transaction is uniquely identifiable and timestamped.
   *
   * Assumptions:
   * - Input transaction data is validated before calling.
   * - crypto.randomUUID() is available in the browser.
   *
   * Edge cases:
   * - Generates new UUID for each transaction to prevent conflicts.
   * - Sets both createdAt and updatedAt to current time for new records.
   *
   * Connections:
   * - Called by useTransactions.addTransaction from TransactionForm.
   * - Triggers data refresh, updating DashboardChart with new data points.
   */
  async create(
    transaction: Omit<Transaction, "id" | "createdAt" | "updatedAt">,
  ): Promise<void> {
    const now = new Date().toISOString();
    await db.transactions.add({
      ...transaction,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Updates an existing transaction in the database.
   *
   * This method allows editing of transaction details, updating the modified timestamp. It's necessary for maintaining accurate financial records, supporting corrections or additional information.
   *
   * Assumptions:
   * - Transaction with given ID exists in the database.
   * - Updates object contains valid fields.
   *
   * Edge cases:
   * - Only updates provided fields, preserving others.
   * - Always updates updatedAt timestamp to track modifications.
   *
   * Connections:
   * - Intended for future edit functionality in transaction management.
   * - Would trigger state updates similar to create operations.
   */
  async update(
    id: string,
    updates: Partial<Omit<Transaction, "id" | "createdAt">>,
  ): Promise<void> {
    const now = new Date().toISOString();
    await db.transactions.update(id, { ...updates, updatedAt: now });
  }

  /**
   * Deletes a transaction from the database.
   *
   * This method removes transactions permanently, supporting data cleanup or error corrections. It's essential for user control over their financial data in a local-first app.
   *
   * Assumptions:
   * - Transaction with given ID exists.
   * - Deletion is intentional and authorized.
   *
   * Edge cases:
   * - No-op if ID doesn't exist, avoiding errors.
   * - Permanent deletion with no recovery mechanism.
   *
   * Connections:
   * - Intended for future delete functionality in transaction lists.
   * - Would require state refresh to update UI after deletion.
   */
  async delete(id: string): Promise<void> {
    await db.transactions.delete(id);
  }

  /**
   * Retrieves transactions within a specific date range.
   *
   * This method filters transactions by date, enabling dashboard analytics for specific time periods. It's essential for displaying monthly, weekly, or custom date range reports in the dashboard.
   *
   * Assumptions:
   * - Dates are provided in ISO 8601 format.
   * - startDate and endDate are valid date strings.
   *
   * Edge cases:
   * - Returns empty array if no transactions exist in the date range.
   * - Includes transactions on both start and end dates (inclusive range).
   *
   * Connections:
   * - Used by dashboard hooks for filtered analytics.
   * - Supports time-based chart visualizations.
   */
  async getTransactionsByDateRange(
    startDate: string,
    endDate: string,
  ): Promise<Transaction[]> {
    return await db.transactions
      .where("date")
      .between(startDate, endDate, true, true)
      .toArray();
  }

  /**
   * Retrieves transactions filtered by type (credit or debit).
   *
   * This method separates income from expenses, enabling focused analysis of transaction types. It's necessary for calculating totals and displaying category-specific insights in the dashboard.
   *
   * Assumptions:
   * - Type parameter is either 'credit' or 'debit'.
   * - All transactions have a valid type field.
   *
   * Edge cases:
   * - Returns empty array if no transactions of specified type exist.
   * - Maintains insertion order for consistent UI display.
   *
   * Connections:
   * - Used by useDashboardData for income/expense calculations.
   * - Supports filtered views and analytics.
   */
  async getTransactionsByType(
    type: "credit" | "debit",
  ): Promise<Transaction[]> {
    return await db.transactions.where("type").equals(type).toArray();
  }

  /**
   * Retrieves transactions filtered by category.
   *
   * This method enables category-specific analysis, supporting spending insights by category. It's useful for understanding spending patterns and budget tracking by category.
   *
   * Assumptions:
   * - Category parameter matches existing transaction categories.
   * - All transactions have a valid category field.
   *
   * Edge cases:
   * - Returns empty array if no transactions in the specified category exist.
   * - Case-sensitive category matching.
   *
   * Connections:
   * - Supports future category-based analytics and reports.
   * - Used for spending breakdown by category visualizations.
   */
  async getTransactionsByCategory(category: string): Promise<Transaction[]> {
    return await db.transactions.where("category").equals(category).toArray();
  }

  /**
   * Retrieves recent transactions limited by count.
   *
   * This method fetches the most recent transactions for dashboard display. It's essential for showing recent activity without loading the entire transaction history.
   *
   * Assumptions:
   * - Transactions are ordered by date in descending order.
   * - Limit parameter is a positive number.
   *
   * Edge cases:
   * - Returns all transactions if limit exceeds total count.
   * - Returns empty array if no transactions exist.
   *
   * Connections:
   * - Used by dashboard for recent activity displays.
   * - Supports performance optimization for large transaction datasets.
   */
  async getRecentTransactions(limit: number = 10): Promise<Transaction[]> {
    return await db.transactions
      .orderBy("date")
      .reverse()
      .limit(limit)
      .toArray();
  }
}
