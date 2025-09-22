/**
 * Sync Service for FinTrac
 *
 * Provides one-way synchronization from local Dexie database to CouchDB.
 * This service handles the orchestration of sync operations, change tracking,
 * conflict resolution, and error handling.
 *
 * Phase 1: One-way sync (Dexie -> CouchDB)
 * - Tracks local changes since last sync
 * - Uploads new/modified documents to CouchDB
 * - Maintains sync status and metadata
 * - Handles errors and retries
 *
 * Future phases will add bidirectional sync and conflict resolution.
 */

import {
  CouchDBClient,
  type CouchDBConfig,
  type CouchDBDocument,
  type CouchDBBulkResponse,
} from "./CouchDBClient";
import { db } from "../db/db";
import type { Transaction, Category } from "../../features/transactions/types";

export interface SyncConfig extends CouchDBConfig {
  syncInterval?: number; // Auto-sync interval in milliseconds
  batchSize?: number; // Number of documents to sync in one batch
  retryAttempts?: number;
  retryDelay?: number;
}

export interface SyncStatus {
  lastSync: string | null;
  isRunning: boolean;
  error: string | null;
  documentsUploaded: number;
  documentsTotal: number;
  progress: number; // 0-100
}

export interface SyncResult {
  success: boolean;
  documentsUploaded: number;
  errors: string[];
  timestamp: string;
}

export interface SyncMetadata {
  lastSyncSequence: string;
  lastSyncTimestamp: string;
  version: string;
}

export class SyncService {
  private couchClient: CouchDBClient;
  private config: SyncConfig;
  private syncStatus: SyncStatus;
  private autoSyncInterval?: NodeJS.Timeout;
  private readonly SYNC_METADATA_KEY = "sync_metadata";
  private readonly SYNC_STATUS_KEY = "sync_status";

  constructor(config: SyncConfig) {
    this.config = {
      syncInterval: 30000, // 30 seconds default
      batchSize: 50,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config,
    };

    this.couchClient = new CouchDBClient(this.config);

    this.syncStatus = {
      lastSync: null,
      isRunning: false,
      error: null,
      documentsUploaded: 0,
      documentsTotal: 0,
      progress: 0,
    };

    this.loadSyncStatus();
  }

  /**
   * Initializes the sync service and sets up CouchDB database
   */
  async initialize(): Promise<boolean> {
    try {
      // Validate connection
      const validation = await this.couchClient.validateConnection();
      if (!validation.connected) {
        throw new Error(`CouchDB connection failed: ${validation.error}`);
      }

      // Check if database exists before trying to create it
      const dbExists = await this.couchClient.checkDatabase();
      if (!dbExists) {
        await this.couchClient.createDatabase();
      }

      // Load existing sync metadata
      await this.loadSyncMetadata();

      console.log("Sync service initialized successfully");
      return true;
    } catch (error) {
      console.error("Failed to initialize sync service:", error);
      this.updateSyncStatus({ error: (error as Error).message });
      return false;
    }
  }

  /**
   * Performs a one-way sync from Dexie to CouchDB
   */
  async sync(): Promise<SyncResult> {
    if (this.syncStatus.isRunning) {
      throw new Error("Sync is already running");
    }

    this.updateSyncStatus({
      isRunning: true,
      error: null,
      documentsUploaded: 0,
      documentsTotal: 0,
      progress: 0,
    });

    const result: SyncResult = {
      success: false,
      documentsUploaded: 0,
      errors: [],
      timestamp: new Date().toISOString(),
    };

    try {
      // Get all local documents that need syncing
      const localDocuments = await this.getLocalDocumentsForSync();

      this.updateSyncStatus({
        documentsTotal: localDocuments.length,
      });

      if (localDocuments.length === 0) {
        console.log("No documents to sync");
        result.success = true;
        this.updateSyncStatus({
          isRunning: false,
          progress: 100,
          lastSync: result.timestamp,
        });
        return result;
      }

      // Process documents in batches
      const batches = this.createBatches(
        localDocuments,
        this.config.batchSize!,
      );

      for (const batch of batches) {
        try {
          await this.syncBatch(batch);
          result.documentsUploaded += batch.length;

          const progress = Math.round(
            (result.documentsUploaded / localDocuments.length) * 100,
          );
          this.updateSyncStatus({
            documentsUploaded: result.documentsUploaded,
            progress,
          });
        } catch (error) {
          const errorMessage = `Batch sync failed: ${(error as Error).message}`;
          result.errors.push(errorMessage);
          console.error(errorMessage, error);
        }
      }

      // Update sync metadata
      await this.updateSyncMetadata();

      result.success = result.errors.length === 0;

      this.updateSyncStatus({
        isRunning: false,
        lastSync: result.timestamp,
        error: result.errors.length > 0 ? result.errors[0] : null,
        progress: 100,
      });

      console.log(
        `Sync completed: ${result.documentsUploaded} documents uploaded, ${result.errors.length} errors`,
      );
    } catch (error) {
      const errorMessage = `Sync failed: ${(error as Error).message}`;
      result.errors.push(errorMessage);

      this.updateSyncStatus({
        isRunning: false,
        error: errorMessage,
      });

      console.error("Sync failed:", error);
    }

    return result;
  }

  /**
   * Gets local documents that need to be synced
   */
  private async getLocalDocumentsForSync(): Promise<CouchDBDocument[]> {
    const syncMetadata = await this.loadSyncMetadata();
    const lastSyncTime =
      syncMetadata?.lastSyncTimestamp || "1970-01-01T00:00:00.000Z";

    // Get all transactions modified since last sync
    const transactions = await db.transactions
      .where("updatedAt")
      .above(lastSyncTime)
      .toArray();

    // Get all categories modified since last sync (only if they have updatedAt field)
    const categories = await db.categories
      .where("updatedAt")
      .above(lastSyncTime)
      .toArray();

    // Filter out categories without updatedAt field (backward compatibility)
    const validCategories = categories.filter((cat) => cat.updatedAt);

    // Convert to CouchDB documents
    const documents: CouchDBDocument[] = [
      ...transactions.map(this.transactionToCouchDoc),
      ...validCategories.map(this.categoryToCouchDoc),
    ];

    return documents;
  }

  /**
   * Syncs a batch of documents to CouchDB
   */
  private async syncBatch(documents: CouchDBDocument[]): Promise<void> {
    let results: CouchDBBulkResponse[];

    console.log(
      `Syncing batch of ${documents.length} documents:`,
      documents.map((d) => d._id),
    );

    // For efficiency, try bulk upload first and handle conflicts
    // This avoids unnecessary 404 checks for new documents
    try {
      results = await this.couchClient.bulkDocs(documents);

      // Check if any documents had conflicts and retry those with proper revisions
      const conflictedDocs = results
        .map((result, index) => ({ result, doc: documents[index] }))
        .filter(({ result }) => result.error === "conflict")
        .map(({ doc }) => doc);

      if (conflictedDocs.length > 0) {
        console.log(
          `Resolving ${conflictedDocs.length} document conflicts by fetching current revisions:`,
          conflictedDocs.map((d) => d._id),
        );

        // Get current revisions for conflicted documents
        const documentsWithRevs = await Promise.all(
          conflictedDocs.map(async (doc) => {
            const existingDoc = await this.couchClient.getDocument(doc._id);
            if (existingDoc) {
              doc._rev = existingDoc._rev;
            }
            return doc;
          }),
        );

        // Retry the conflicted documents with proper revisions
        const retryResults = await this.couchClient.bulkDocs(documentsWithRevs);

        // Update the results array with retry results for conflicted documents
        let retryIndex = 0;
        for (let i = 0; i < results.length; i++) {
          if (results[i].error === "conflict") {
            results[i] = retryResults[retryIndex++];
          }
        }
      }
    } catch (error) {
      // Fallback to the original approach if bulk upload fails entirely
      console.warn(
        "Bulk upload failed, falling back to revision check approach for documents:",
        documents.map((d) => d._id),
        error,
      );

      const documentsWithRevs = await Promise.all(
        documents.map(async (doc) => {
          const existingDoc = await this.couchClient.getDocument(doc._id);
          if (existingDoc) {
            doc._rev = existingDoc._rev;
          }
          return doc;
        }),
      );

      results = await this.couchClient.bulkDocs(documentsWithRevs);
    }

    // Check for errors in bulk operation
    const errors = results.filter((result) => !result.ok);
    if (errors.length > 0) {
      throw new Error(
        `Bulk sync failed for ${errors.length} documents: ${errors.map((e) => e.reason).join(", ")}`,
      );
    }
  }

  /**
   * Converts a Transaction to CouchDB document format
   */
  private transactionToCouchDoc(transaction: Transaction): CouchDBDocument {
    return {
      _id: `transaction:${transaction.id}`,
      type: "transaction",
      data: transaction,
    };
  }

  /**
   * Converts a Category to CouchDB document format
   */
  private categoryToCouchDoc(category: Category): CouchDBDocument {
    return {
      _id: `category:${category.id}`,
      type: "category",
      data: category,
    };
  }

  /**
   * Creates batches from array of documents
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Loads sync metadata from local storage
   */
  private async loadSyncMetadata(): Promise<SyncMetadata | null> {
    try {
      const stored = localStorage.getItem(this.SYNC_METADATA_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error("Failed to load sync metadata:", error);
      return null;
    }
  }

  /**
   * Updates sync metadata in local storage
   */
  private async updateSyncMetadata(): Promise<void> {
    const metadata: SyncMetadata = {
      lastSyncSequence: "0", // Will be used in future bidirectional sync
      lastSyncTimestamp: new Date().toISOString(),
      version: "1.0.0",
    };

    try {
      localStorage.setItem(this.SYNC_METADATA_KEY, JSON.stringify(metadata));
    } catch (error) {
      console.error("Failed to update sync metadata:", error);
    }
  }

  /**
   * Loads sync status from local storage
   */
  private loadSyncStatus(): void {
    try {
      const stored = localStorage.getItem(this.SYNC_STATUS_KEY);
      if (stored) {
        const savedStatus = JSON.parse(stored);
        this.syncStatus = {
          ...this.syncStatus,
          ...savedStatus,
          isRunning: false, // Always reset running state on load
        };
      }
    } catch (error) {
      console.error("Failed to load sync status:", error);
    }
  }

  /**
   * Updates sync status and saves to local storage
   */
  private updateSyncStatus(updates: Partial<SyncStatus>): void {
    this.syncStatus = { ...this.syncStatus, ...updates };

    try {
      localStorage.setItem(
        this.SYNC_STATUS_KEY,
        JSON.stringify(this.syncStatus),
      );
    } catch (error) {
      console.error("Failed to save sync status:", error);
    }
  }

  /**
   * Gets current sync status
   */
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * Starts automatic sync at configured interval
   */
  startAutoSync(): void {
    if (this.autoSyncInterval) {
      this.stopAutoSync();
    }

    this.autoSyncInterval = setInterval(async () => {
      if (!this.syncStatus.isRunning) {
        try {
          await this.sync();
        } catch (error) {
          console.error("Auto-sync failed:", error);
        }
      }
    }, this.config.syncInterval);

    console.log(
      `Auto-sync started with interval: ${this.config.syncInterval}ms`,
    );
  }

  /**
   * Stops automatic sync
   */
  stopAutoSync(): void {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = undefined;
      console.log("Auto-sync stopped");
    }
  }

  /**
   * Checks if CouchDB is accessible
   */
  async checkConnection(): Promise<boolean> {
    try {
      const validation = await this.couchClient.validateConnection();
      return validation.connected;
    } catch {
      return false;
    }
  }

  /**
   * Gets CouchDB database information
   */
  async getRemoteInfo(): Promise<{
    name: string;
    docCount: number;
    updateSeq: string;
    connected: boolean;
  } | null> {
    try {
      const info = await this.couchClient.getInfo();
      return {
        name: info.db_name,
        docCount: info.doc_count,
        updateSeq: info.update_seq,
        connected: true,
      };
    } catch {
      return null;
    }
  }

  /**
   * Cleans up resources
   */
  destroy(): void {
    this.stopAutoSync();
  }
}
