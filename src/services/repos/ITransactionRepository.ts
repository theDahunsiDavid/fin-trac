import type { Transaction } from "../../features/transactions/types";

/**
 * Transaction Repository Interface
 *
 * Defines the contract for transaction data operations.
 * This interface allows switching between different implementations
 * (Dexie vs PouchDB) without changing the consuming code.
 */
export interface ITransactionRepository {
  /**
   * Create a new transaction
   * @param transaction Transaction data (without id, createdAt, updatedAt)
   * @returns Promise resolving to the created transaction with generated id and timestamps
   */
  create(
    transaction: Omit<Transaction, "id" | "createdAt" | "updatedAt">,
  ): Promise<Transaction>;

  /**
   * Get all transactions
   * @returns Promise resolving to array of all transactions
   */
  getAll(): Promise<Transaction[]>;

  /**
   * Get a transaction by ID
   * @param id Transaction ID
   * @returns Promise resolving to the transaction or undefined if not found
   */
  getById(id: string): Promise<Transaction | undefined>;

  /**
   * Update a transaction
   * @param id Transaction ID
   * @param updates Partial transaction data to update
   * @returns Promise resolving to the updated transaction
   */
  update(
    id: string,
    updates: Partial<Omit<Transaction, "id" | "createdAt">>,
  ): Promise<Transaction>;

  /**
   * Delete a transaction
   * @param id Transaction ID
   * @returns Promise resolving to void
   */
  delete(id: string): Promise<void>;

  /**
   * Get transactions by date range
   * @param startDate Start date (ISO string)
   * @param endDate End date (ISO string)
   * @returns Promise resolving to array of transactions in the date range
   */
  getByDateRange(startDate: string, endDate: string): Promise<Transaction[]>;

  /**
   * Get transactions by category
   * @param category Category name
   * @returns Promise resolving to array of transactions in the category
   */
  getByCategory(category: string): Promise<Transaction[]>;

  /**
   * Get transactions by type (credit or debit)
   * @param type Transaction type
   * @returns Promise resolving to array of transactions of the specified type
   */
  getByType(type: "credit" | "debit"): Promise<Transaction[]>;

  /**
   * Search transactions by description
   * @param query Search query string
   * @returns Promise resolving to array of transactions matching the query
   */
  searchByDescription(query: string): Promise<Transaction[]>;

  /**
   * Get total count of transactions
   * @returns Promise resolving to the total number of transactions
   */
  count(): Promise<number>;

  /**
   * Clear all transactions (used for testing/migration)
   * @returns Promise resolving to void
   */
  clear(): Promise<void>;

  /**
   * Bulk create transactions (used for migration/import)
   * @param transactions Array of transactions to create
   * @returns Promise resolving to array of created transactions
   */
  bulkCreate(
    transactions: Omit<Transaction, "id" | "createdAt" | "updatedAt">[],
  ): Promise<Transaction[]>;

  /**
   * Get database info and status
   * @returns Promise resolving to database information
   */
  getInfo(): Promise<{
    name: string;
    totalTransactions: number;
    implementation: "dexie" | "pouchdb";
    lastModified?: string;
  }>;
}
