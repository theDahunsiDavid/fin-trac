import { createLocalDB, SyncStatus } from "../pouchdb/config";
import { getSyncService, type SyncService } from "../pouchdb/syncService";
import type { Transaction } from "../../features/transactions/types";
import type { ITransactionRepository } from "./ITransactionRepository";

// PouchDB document interface
interface PouchDBDocument extends Transaction {
  _id: string;
  _rev?: string;
}

// Conflict resolution strategies
export const ConflictResolution = {
  LAST_WRITE_WINS: "last_write_wins",
  MERGE_CHANGES: "merge_changes",
  MANUAL_RESOLUTION: "manual_resolution",
} as const;

export type ConflictResolution =
  (typeof ConflictResolution)[keyof typeof ConflictResolution];

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
  private syncService: SyncService | undefined;
  private conflictResolution: ConflictResolution =
    ConflictResolution.LAST_WRITE_WINS;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  constructor(enableSync = true) {
    this.initPromise = this.initialize(enableSync);
  }

  /**
   * Initialize the database and sync service asynchronously
   */
  private async initialize(enableSync: boolean): Promise<void> {
    if (this.initialized) return;

    this.db = await createLocalDB();
    await this.initializeIndexes();

    // Initialize sync service if enabled
    if (enableSync) {
      this.syncService = getSyncService({ enableSync: true });
      this.setupConflictHandlers();
    }

    this.initialized = true;
  }

  /**
   * Ensure the repository is initialized before any operation
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise;
    }
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
    await this.ensureInitialized();
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

    try {
      await this.db.put(doc);
      return newTransaction;
    } catch (error) {
      // Handle conflicts during creation
      if (this.isConflictError(error)) {
        return await this.resolveConflictOnCreate(doc, newTransaction);
      }
      throw error;
    }
  }

  /**
   * Retrieves all transactions from the database, ordered by date (newest first).
   */
  async getAll(): Promise<Transaction[]> {
    await this.ensureInitialized();
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
    await this.ensureInitialized();
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
    await this.ensureInitialized();
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

      // Handle conflicts during update
      if (this.isConflictError(error)) {
        return await this.resolveConflictOnUpdate(id, updates);
      }

      throw error;
    }
  }

  /**
   * Deletes a transaction from the database.
   */
  async delete(id: string): Promise<void> {
    await this.ensureInitialized();
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
    await this.ensureInitialized();
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
    await this.ensureInitialized();
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
    await this.ensureInitialized();
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
    await this.ensureInitialized();
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
    await this.ensureInitialized();
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
    await this.ensureInitialized();
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
    await this.ensureInitialized();
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
    await this.ensureInitialized();
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

  /**
   * Gets the sync service instance.
   */
  getSyncService(): SyncService | undefined {
    return this.syncService;
  }

  /**
   * Enable or disable sync for this repository.
   */
  setSyncEnabled(enabled: boolean): void {
    if (enabled && !this.syncService) {
      this.syncService = getSyncService({ enableSync: true });
      this.setupConflictHandlers();
    } else if (!enabled && this.syncService) {
      this.syncService.stopSync();
    }
  }

  /**
   * Force a manual sync with the remote database.
   */
  async forceSync(): Promise<void> {
    await this.ensureInitialized();
    if (!this.syncService) {
      throw new Error("Sync is not enabled for this repository");
    }

    await this.syncService.forcSync();
  }

  /**
   * Get current sync status and statistics.
   */
  getSyncStatus(): {
    isEnabled: boolean;
    stats?: {
      docsRead: number;
      docsWritten: number;
      pending: number;
      lastSync?: Date;
      status: SyncStatus;
    };
    state?: {
      status: SyncStatus;
      lastSync?: Date;
      error?: string;
      docsRead: number;
      docsWritten: number;
      pending: number;
      isOnline: boolean;
      retryCount: number;
    };
  } {
    if (!this.syncService) {
      return { isEnabled: false };
    }

    return {
      isEnabled: true,
      stats: this.syncService.getSyncStats(),
      state: this.syncService.getState(),
    };
  }

  /**
   * Set up conflict resolution handlers.
   */
  private setupConflictHandlers(): void {
    if (!this.syncService) return;

    // Listen for sync events to handle conflicts
    this.syncService.onSyncEvent((event) => {
      if (event.status === "error" && event.error) {
        console.warn("Sync error:", event.error);
      }
    });
  }

  /**
   * Check if an error is a conflict error.
   */
  private isConflictError(error: unknown): boolean {
    return !!(
      error &&
      typeof error === "object" &&
      ((error as { name?: string }).name === "conflict" ||
        (error as { status?: number }).status === 409 ||
        (error as { message?: string }).message?.includes("conflict"))
    );
  }

  /**
   * Resolve conflict during document creation.
   */
  private async resolveConflictOnCreate(
    doc: PouchDBDocument,
    transaction: Transaction,
  ): Promise<Transaction> {
    try {
      // Generate a new ID to avoid conflicts
      const newId = crypto.randomUUID();
      const newDoc = {
        ...doc,
        _id: newId,
        id: newId,
      };

      await this.db.put(newDoc);
      return { ...transaction, id: newId };
    } catch (error) {
      console.error("Failed to resolve create conflict:", error);
      throw error;
    }
  }

  /**
   * Resolve conflict during document update.
   */
  private async resolveConflictOnUpdate(
    id: string,
    updates: Partial<Omit<Transaction, "id" | "createdAt">>,
  ): Promise<Transaction> {
    try {
      // Get the latest version and retry the update
      const latestDoc = await this.db.get(id);
      const now = new Date().toISOString();

      let resolvedDoc: PouchDBDocument;

      switch (this.conflictResolution) {
        case ConflictResolution.LAST_WRITE_WINS:
          resolvedDoc = {
            ...latestDoc,
            ...updates,
            updatedAt: now,
          } as PouchDBDocument;
          break;

        case ConflictResolution.MERGE_CHANGES:
          // Simple merge strategy - could be enhanced
          resolvedDoc = {
            ...latestDoc,
            ...updates,
            updatedAt: now,
            // Keep track of conflict resolution
            _conflictResolved: true,
            _conflictResolvedAt: now,
          } as PouchDBDocument;
          break;

        default:
          throw new Error(
            `Unsupported conflict resolution strategy: ${this.conflictResolution}`,
          );
      }

      await this.db.put(resolvedDoc);
      return this.mapDocToTransaction(resolvedDoc as PouchDBDocument);
    } catch (error) {
      console.error("Failed to resolve update conflict:", error);
      throw error;
    }
  }

  /**
   * Set conflict resolution strategy.
   */
  setConflictResolution(strategy: ConflictResolution): void {
    this.conflictResolution = strategy;
  }

  /**
   * Get current conflict resolution strategy.
   */
  getConflictResolution(): ConflictResolution {
    return this.conflictResolution;
  }
}
