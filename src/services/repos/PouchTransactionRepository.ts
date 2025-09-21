import { BasePouchRepository } from "../pouchdb/BasePouchRepository";
import type { Transaction } from "../../features/transactions/types";
import type { PouchTransaction } from "../pouchdb/schema";
import {
  transactionToPouchDoc,
  pouchDocToTransaction,
} from "../pouchdb/schema";

/**
 * PouchDB-based repository class for transaction CRUD operations.
 *
 * This class provides the same interface as the Dexie TransactionRepository but uses PouchDB
 * for local-first storage with optional CouchDB sync capabilities. It maintains compatibility
 * with the existing business logic while enabling offline-first functionality.
 *
 * Key differences from Dexie implementation:
 * - Uses PouchDB document-based storage instead of relational tables
 * - Supports automatic document versioning and conflict resolution
 * - Enables bi-directional sync with remote CouchDB instances
 * - Documents include _id and _rev fields for PouchDB compatibility
 *
 * Assumptions:
 * - PouchDB is available globally from CDN
 * - All transactions include required fields (id, date, description, amount, etc.)
 * - Document IDs are unique and follow UUID format
 *
 * Edge cases:
 * - Handles PouchDB document conflicts during updates
 * - Manages document deletion with proper revision handling
 * - Filters out PouchDB internal documents (starting with _)
 *
 * Connections:
 * - Drop-in replacement for existing TransactionRepository
 * - Used by useTransactions hook for state management
 * - Supports future sync functionality with CouchDB
 */
export class PouchTransactionRepository extends BasePouchRepository<Transaction> {
  private readonly TRANSACTION_PREFIX = "transaction_";
  private readonly DOC_TYPE = "transaction";

  /**
   * Validates transaction document data before database operations.
   * Ensures all required fields are present and valid.
   *
   * @param data Partial transaction data to validate
   * @throws Error if validation fails
   */
  protected validateDocument(data: Partial<Transaction>): void {
    if (
      data.amount !== undefined &&
      (typeof data.amount !== "number" || data.amount < 0)
    ) {
      throw new Error("Transaction amount must be a positive number");
    }

    if (data.type !== undefined && !["credit", "debit"].includes(data.type)) {
      throw new Error('Transaction type must be either "credit" or "debit"');
    }

    if (data.date !== undefined && !data.date) {
      throw new Error("Transaction date is required");
    }

    if (data.description !== undefined && !data.description.trim()) {
      throw new Error("Transaction description is required");
    }

    if (data.category !== undefined && !data.category.trim()) {
      throw new Error("Transaction category is required");
    }

    if (data.currency !== undefined && !data.currency.trim()) {
      throw new Error("Transaction currency is required");
    }
  }

  /**
   * Converts PouchDB document to Transaction model.
   *
   * @param doc PouchDB document
   * @returns Transaction Application model
   */
  protected convertToAppModel(doc: PouchTransaction): Transaction {
    return pouchDocToTransaction(doc);
  }

  /**
   * Converts Transaction model to PouchDB document.
   *
   * @param model Transaction model
   * @returns PouchTransaction PouchDB document
   */
  protected convertToPouchDoc(model: Transaction): PouchTransaction {
    const pouchDoc = transactionToPouchDoc(model);
    // Ensure proper document ID format
    if (!pouchDoc._id.startsWith(this.TRANSACTION_PREFIX)) {
      pouchDoc._id = `${this.TRANSACTION_PREFIX}${model.id}`;
    }
    return pouchDoc;
  }

  /**
   * Ensures date index exists for efficient date range queries.
   */
  private async ensureDateIndex(): Promise<void> {
    await this.ensureIndex(
      { fields: ["docType", "date"] },
      "transaction-date-index",
    );
  }

  /**
   * Ensures type index exists for efficient type filtering.
   */
  private async ensureTypeIndex(): Promise<void> {
    await this.ensureIndex(
      { fields: ["docType", "type"] },
      "transaction-type-index",
    );
  }

  /**
   * Ensures category index exists for efficient category filtering.
   */
  private async ensureCategoryIndex(): Promise<void> {
    await this.ensureIndex(
      { fields: ["docType", "category"] },
      "transaction-category-index",
    );
  }

  /**
   * Retrieves all transactions from PouchDB.
   *
   * Fetches all transaction documents from the local PouchDB instance, filtering out
   * any PouchDB internal documents. Orders by date for consistent UI display.
   *
   * Returns:
   * - Array of Transaction objects without PouchDB metadata
   * - Empty array if no transactions exist
   *
   * Edge cases:
   * - Filters out _design documents and other PouchDB internals
   * - Sorts by date to maintain consistent ordering
   */
  async getAll(): Promise<Transaction[]> {
    return this.executeWithErrorHandling(async () => {
      const startkey = `${this.TRANSACTION_PREFIX}`;
      const endkey = `${this.TRANSACTION_PREFIX}\ufff0`;

      const transactions = await this.getAllByKeyRange(startkey, endkey);

      // Sort by date for consistent ordering (newest first)
      return transactions.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
    }, "getAll");
  }

  /**
   * Creates a new transaction in PouchDB.
   *
   * Adds a new transaction document with auto-generated ID and timestamps.
   * Uses "transaction_" prefix for document ID to enable efficient querying.
   *
   * Parameters:
   * - transaction: Transaction data without id, createdAt, updatedAt
   *
   * Edge cases:
   * - Generates UUID with "transaction_" prefix for PouchDB compatibility
   * - Sets both createdAt and updatedAt to current timestamp
   * - Handles PouchDB write conflicts by rethrowing errors
   */
  async create(
    transaction: Omit<Transaction, "id" | "createdAt" | "updatedAt">,
  ): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      const now = new Date().toISOString();
      const id = crypto.randomUUID();

      const newTransaction: Transaction = {
        ...transaction,
        id,
        createdAt: now,
        updatedAt: now,
      };

      await this.createDocument(newTransaction);
    }, "create");
  }

  /**
   * Updates an existing transaction in PouchDB.
   *
   * Retrieves the current document, applies updates, and saves with new revision.
   * PouchDB requires the current _rev for successful updates to prevent conflicts.
   *
   * Parameters:
   * - id: Transaction ID (without "transaction_" prefix)
   * - updates: Partial transaction data to update
   *
   * Edge cases:
   * - Fetches current document to get latest _rev
   * - Updates only provided fields, preserving others
   * - Handles document not found and conflict errors
   */
  async update(
    id: string,
    updates: Partial<Omit<Transaction, "id" | "createdAt">>,
  ): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      const docId = `${this.TRANSACTION_PREFIX}${id}`;
      await this.updateDocument(docId, updates);
    }, "update");
  }

  /**
   * Deletes a transaction from PouchDB.
   *
   * Removes a transaction document by marking it as deleted. PouchDB maintains
   * deletion history for sync purposes but filters deleted docs from queries.
   *
   * Parameters:
   * - id: Transaction ID (without "transaction_" prefix)
   *
   * Edge cases:
   * - Fetches current document to get _rev for deletion
   * - Handles document not found gracefully
   * - PouchDB soft-deletes for sync compatibility
   */
  async delete(id: string): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      const docId = `${this.TRANSACTION_PREFIX}${id}`;
      await this.deleteDocument(docId);
    }, "delete");
  }

  /**
   * Retrieves transactions within a specific date range.
   *
   * Uses PouchDB's find plugin to query transactions by date range.
   * Creates an index on the date field for efficient querying.
   *
   * Parameters:
   * - startDate: ISO 8601 date string (inclusive)
   * - endDate: ISO 8601 date string (inclusive)
   *
   * Returns:
   * - Array of transactions within the date range
   * - Empty array if no matches found
   */
  async getTransactionsByDateRange(
    startDate: string,
    endDate: string,
  ): Promise<Transaction[]> {
    return this.executeWithErrorHandling(async () => {
      // Ensure date index exists
      await this.ensureDateIndex();

      const transactions = await this.findDocuments(
        {
          docType: this.DOC_TYPE,
          date: {
            $gte: startDate,
            $lte: endDate,
          },
        },
        ["date"],
      );

      return transactions.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
    }, "getTransactionsByDateRange");
  }

  /**
   * Retrieves transactions filtered by type (credit or debit).
   *
   * Uses PouchDB find to filter transactions by type field.
   * Maintains consistent ordering by date.
   */
  async getTransactionsByType(
    type: "credit" | "debit",
  ): Promise<Transaction[]> {
    return this.executeWithErrorHandling(async () => {
      await this.ensureTypeIndex();

      const transactions = await this.findDocuments(
        {
          docType: this.DOC_TYPE,
          type: type,
        },
        ["date"],
      );

      return transactions.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
    }, "getTransactionsByType");
  }

  /**
   * Retrieves transactions filtered by category.
   *
   * This method enables category-specific analysis, supporting spending insights by category.
   * It's useful for understanding spending patterns and budget tracking by category.
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
    return this.executeWithErrorHandling(async () => {
      await this.ensureCategoryIndex();

      const transactions = await this.findDocuments(
        {
          docType: this.DOC_TYPE,
          category: category,
        },
        ["date"],
      );

      return transactions.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
    }, "getTransactionsByCategory");
  }

  /**
   * Retrieves recent transactions limited by count.
   *
   * This method fetches the most recent transactions for dashboard display. It's essential
   * for showing recent activity without loading the entire transaction history.
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
    return this.executeWithErrorHandling(async () => {
      await this.ensureDateIndex();

      const transactions = await this.findDocuments(
        {
          docType: this.DOC_TYPE,
        },
        ["date"],
        limit,
      );

      return transactions;
    }, "getRecentTransactions");
  }

  /**
   * Gets transaction statistics for monitoring and debugging.
   * Useful for understanding database performance and data volume.
   *
   * @returns Promise<object> Statistics about transactions
   */
  async getTransactionStats(): Promise<{
    total: number;
    creditCount: number;
    debitCount: number;
    totalCredits: number;
    totalDebits: number;
  }> {
    return this.executeWithErrorHandling(async () => {
      const transactions = await this.getAll();

      const stats = transactions.reduce(
        (acc, transaction) => {
          acc.total++;
          if (transaction.type === "credit") {
            acc.creditCount++;
            acc.totalCredits += transaction.amount;
          } else {
            acc.debitCount++;
            acc.totalDebits += transaction.amount;
          }
          return acc;
        },
        {
          total: 0,
          creditCount: 0,
          debitCount: 0,
          totalCredits: 0,
          totalDebits: 0,
        },
      );

      return stats;
    }, "getTransactionStats");
  }
}
