import { db } from '../db/db';
import type { Transaction } from '../../features/transactions/types';

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
  async create(transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
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
  async update(id: string, updates: Partial<Omit<Transaction, 'id' | 'createdAt'>>): Promise<void> {
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
}