import { createLocalDB } from "../pouchdb/config";
import type { Transaction } from "../../features/transactions/types";
import type { ITransactionRepository } from "./ITransactionRepository";

// PouchDB document interface
interface PouchDBDocument extends Transaction {
  _id: string;
  _rev?: string;
}

/**
 * PouchDB implementation of Transaction Repository
 *
 * This class implements the ITransactionRepository interface using PouchDB
 * for local-first data storage with optional CouchDB sync capabilities.
 * It provides all transaction CRUD operations with proper indexing and
 * Mango query support.
 */
export class PouchDBTransactionRepository implements ITransactionRepository {
  private db: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  constructor() {
    this.db = createLocalDB();
    this.initializeIndexes();
  }

  /**
   * Initialize database indexes for efficient queries
   */
  private async initializeIndexes(): Promise<void> {
    try {
      // Create compound indexes for sort + filter operations
      await this.db.createIndex({
        index: { fields: ["date"] },
      });

      await this.db.createIndex({
        index: { fields: ["type", "date"] },
      });

      await this.db.createIndex({
        index: { fields: ["category", "date"] },
      });

      await this.db.createIndex({
        index: { fields: ["createdAt"] },
      });

      await this.db.createIndex({
        index: { fields: ["updatedAt"] },
      });

      await this.db.createIndex({
        index: { fields: ["description"] },
      });
    } catch (error) {
      console.warn("Failed to create PouchDB indexes:", error);
    }
  }

  /**
   * Creates a new transaction in the database.
   */
  async create(
    transaction: Omit<Transaction, "id" | "createdAt" | "updatedAt">,
  ): Promise<Transaction> {
    const now = new Date().toISOString();
    const newTransaction: Transaction = {
      ...transaction,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };

    // PouchDB documents need _id field
    const doc = {
      _id: newTransaction.id,
      ...newTransaction,
    };

    await this.db.put(doc);
    return newTransaction;
  }

  /**
   * Retrieves all transactions from the database, ordered by date (newest first).
   */
  async getAll(): Promise<Transaction[]> {
    try {
      const result = await this.db.find({
        selector: {},
        sort: [{ date: "desc" }],
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return result.docs.map((doc: any) =>
        this.mapDocToTransaction(doc as PouchDBDocument),
      );
    } catch (error) {
      console.warn("PouchDB find failed, falling back to allDocs:", error);
      // Fallback to allDocs if find fails
      const result = await this.db.allDocs({ include_docs: true });
      const transactions = result.rows
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((row: any) => row.doc && !row.id.startsWith("_design/"))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((row: any) => this.mapDocToTransaction(row.doc as PouchDBDocument))
        .sort(
          (a: Transaction, b: Transaction) =>
            new Date(b.date).getTime() - new Date(a.date).getTime(),
        );

      return transactions;
    }
  }

  /**
   * Retrieves a transaction by its ID.
   */
  async getById(id: string): Promise<Transaction | undefined> {
    try {
      const doc = await this.db.get(id);
      return this.mapDocToTransaction(doc as PouchDBDocument);
    } catch (error: unknown) {
      if ((error as { name?: string }).name === "not_found") {
        return undefined;
      }
      throw error;
    }
  }

  /**
   * Updates an existing transaction in the database.
   */
  async update(
    id: string,
    updates: Partial<Omit<Transaction, "id" | "createdAt">>,
  ): Promise<Transaction> {
    try {
      const existingDoc = await this.db.get(id);
      const now = new Date().toISOString();

      const updatedDoc = {
        ...existingDoc,
        ...updates,
        updatedAt: now,
      };

      await this.db.put(updatedDoc);
      return this.mapDocToTransaction(updatedDoc as PouchDBDocument);
    } catch (error: unknown) {
      if ((error as { name?: string }).name === "not_found") {
        throw new Error(`Transaction with id ${id} not found`);
      }
      throw error;
    }
  }

  /**
   * Deletes a transaction from the database.
   */
  async delete(id: string): Promise<void> {
    try {
      const doc = await this.db.get(id);
      await this.db.remove(doc);
    } catch (error: unknown) {
      if ((error as { name?: string }).name === "not_found") {
        // Already deleted or doesn't exist - consider this success
        return;
      }
      throw error;
    }
  }

  /**
   * Retrieves transactions within a specific date range.
   */
  async getByDateRange(
    startDate: string,
    endDate: string,
  ): Promise<Transaction[]> {
    try {
      const result = await this.db.find({
        selector: {
          date: {
            $gte: startDate,
            $lte: endDate,
          },
        },
        sort: [{ date: "desc" }],
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return result.docs.map((doc: any) =>
        this.mapDocToTransaction(doc as PouchDBDocument),
      );
    } catch (error) {
      console.warn("PouchDB date range query failed, using fallback:", error);
      // Fallback: get all and filter in memory
      const allTransactions = await this.getAll();
      return allTransactions.filter(
        (transaction) =>
          transaction.date >= startDate && transaction.date <= endDate,
      );
    }
  }

  /**
   * Retrieves transactions filtered by category.
   */
  async getByCategory(category: string): Promise<Transaction[]> {
    try {
      const result = await this.db.find({
        selector: { category },
        sort: [{ category: "asc", date: "desc" }],
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return result.docs.map((doc: any) =>
        this.mapDocToTransaction(doc as PouchDBDocument),
      );
    } catch (error) {
      console.warn("PouchDB category query failed, using fallback:", error);
      // Fallback: get all and filter in memory
      const allTransactions = await this.getAll();
      return allTransactions.filter(
        (transaction) => transaction.category === category,
      );
    }
  }

  /**
   * Retrieves transactions filtered by type (credit or debit).
   */
  async getByType(type: "credit" | "debit"): Promise<Transaction[]> {
    try {
      const result = await this.db.find({
        selector: { type },
        sort: [{ type: "asc", date: "desc" }],
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return result.docs.map((doc: any) =>
        this.mapDocToTransaction(doc as PouchDBDocument),
      );
    } catch (error) {
      console.warn("PouchDB type query failed, using fallback:", error);
      // Fallback: get all and filter in memory
      const allTransactions = await this.getAll();
      return allTransactions.filter((transaction) => transaction.type === type);
    }
  }

  /**
   * Searches transactions by description using case-insensitive partial matching.
   */
  async searchByDescription(query: string): Promise<Transaction[]> {
    try {
      // PouchDB doesn't support case-insensitive text search easily
      // We'll use a regex approach or fallback to memory filtering
      const result = await this.db.find({
        selector: {
          description: {
            $regex: new RegExp(query, "i"),
          },
        },
        sort: [{ date: "desc" }],
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return result.docs.map((doc: any) =>
        this.mapDocToTransaction(doc as PouchDBDocument),
      );
    } catch (error) {
      console.warn("PouchDB text search failed, using fallback:", error);
      // Fallback: get all and filter in memory
      const allTransactions = await this.getAll();
      const lowerQuery = query.toLowerCase();
      return allTransactions.filter((transaction) =>
        transaction.description.toLowerCase().includes(lowerQuery),
      );
    }
  }

  /**
   * Gets the total count of transactions.
   */
  async count(): Promise<number> {
    try {
      const result = await this.db.find({
        selector: {},
        fields: ["_id"],
      });

      return result.docs.length;
    } catch (error) {
      console.warn("PouchDB count failed, using allDocs:", error);
      // Fallback to allDocs
      const result = await this.db.allDocs();
      // Filter out design documents
      const transactionDocs = result.rows.filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (row: any) => !row.id.startsWith("_design/"),
      );
      return transactionDocs.length;
    }
  }

  /**
   * Clears all transactions from the database.
   */
  async clear(): Promise<void> {
    const result = await this.db.allDocs();
    const docsToDelete = result.rows
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((row: any) => !row.id.startsWith("_design/"))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((row: any) => ({
        _id: row.id,
        _rev: row.value.rev,
        _deleted: true,
      }));

    if (docsToDelete.length > 0) {
      await this.db.bulkDocs(docsToDelete);
    }
  }

  /**
   * Bulk creates multiple transactions.
   */
  async bulkCreate(
    transactions: Omit<Transaction, "id" | "createdAt" | "updatedAt">[],
  ): Promise<Transaction[]> {
    const now = new Date().toISOString();
    const newTransactions: Transaction[] = transactions.map((transaction) => ({
      ...transaction,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    }));

    // Convert to PouchDB documents
    const docs = newTransactions.map((transaction) => ({
      _id: transaction.id,
      ...transaction,
    }));

    await this.db.bulkDocs(docs);
    return newTransactions;
  }

  /**
   * Gets database information and status.
   */
  async getInfo(): Promise<{
    name: string;
    totalTransactions: number;
    implementation: "dexie" | "pouchdb";
    lastModified?: string;
  }> {
    const totalTransactions = await this.count();

    // Get the most recent transaction to determine last modified
    let lastModified: string | undefined;
    try {
      // Use fallback approach since sorting by updatedAt may fail
      const allTransactions = await this.getAll();
      if (allTransactions.length > 0) {
        // Sort by updatedAt in memory to find most recent
        const sortedTransactions = allTransactions.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );
        lastModified = sortedTransactions[0].updatedAt;
      }
    } catch (error) {
      console.warn("Failed to get last modified date:", error);
    }

    return {
      name: "fintrac-pouchdb",
      totalTransactions,
      implementation: "pouchdb",
      lastModified,
    };
  }

  /**
   * Maps a PouchDB document to a Transaction object.
   */
  private mapDocToTransaction(doc: PouchDBDocument): Transaction {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, _rev, ...transaction } = doc;
    return {
      ...transaction,
      id: _id,
    };
  }

  /**
   * Gets the underlying PouchDB instance for advanced operations.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getDatabase(): any {
    return this.db;
  }
}
