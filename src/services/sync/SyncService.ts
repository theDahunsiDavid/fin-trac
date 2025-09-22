/**
 * Sync Service for FinTrac
 *
 * Provides bidirectional synchronization between local Dexie database and CouchDB.
 * This service handles the orchestration of sync operations, change tracking,
 * conflict resolution, and error handling.
 *
 * Phase 1: One-way sync (Dexie -> CouchDB) ✅
 * - Tracks local changes since last sync
 * - Uploads new/modified documents to CouchDB
 * - Maintains sync status and metadata
 * - Handles errors and retries
 *
 * Phase 2: Bidirectional sync (Dexie <-> CouchDB) ✅
 * - Downloads changes from CouchDB to local database
 * - Merges remote changes with local data
 * - Handles basic conflict resolution
 * - Maintains separate sync sequences for each direction
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
  bidirectional?: boolean; // Enable bidirectional sync
  downloadOnly?: boolean; // Only download changes from CouchDB
  uploadOnly?: boolean; // Only upload changes to CouchDB
  conflictResolution?: "remote-wins" | "local-wins" | "manual"; // Conflict resolution strategy
}

export interface SyncStatus {
  lastSync: string | null;
  isRunning: boolean;
  error: string | null;
  documentsUploaded: number;
  documentsDownloaded: number;
  documentsTotal: number;
  progress: number; // 0-100
  syncDirection: "upload" | "download" | "both" | "idle";
}

export interface SyncResult {
  success: boolean;
  documentsUploaded: number;
  documentsDownloaded: number;
  conflictsResolved: number;
  errors: string[];
  timestamp: string;
}

export interface SyncMetadata {
  lastUploadSequence: string;
  lastDownloadSequence: string;
  lastUploadTimestamp: string;
  lastDownloadTimestamp: string;
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
      bidirectional: true,
      downloadOnly: false,
      uploadOnly: false,
      conflictResolution: "remote-wins",
      ...config,
    };

    this.couchClient = new CouchDBClient(this.config);

    this.syncStatus = {
      lastSync: null,
      isRunning: false,
      error: null,
      documentsUploaded: 0,
      documentsDownloaded: 0,
      documentsTotal: 0,
      progress: 0,
      syncDirection: "idle",
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
   * Performs bidirectional sync between Dexie and CouchDB
   */
  async sync(): Promise<SyncResult> {
    if (this.syncStatus.isRunning) {
      throw new Error("Sync is already running");
    }

    this.updateSyncStatus({
      isRunning: true,
      error: null,
      documentsUploaded: 0,
      documentsDownloaded: 0,
      documentsTotal: 0,
      progress: 0,
      syncDirection: "both",
    });

    const result: SyncResult = {
      success: false,
      documentsUploaded: 0,
      documentsDownloaded: 0,
      conflictsResolved: 0,
      errors: [],
      timestamp: new Date().toISOString(),
    };

    try {
      const syncType = this.config.downloadOnly
        ? "download-only"
        : this.config.uploadOnly
          ? "upload-only"
          : this.config.bidirectional
            ? "bidirectional"
            : "upload-only";

      console.log(`Starting ${syncType} sync...`);

      // Phase 1: Upload local changes to CouchDB (if enabled)
      if (!this.config.downloadOnly) {
        this.updateSyncStatus({ syncDirection: "upload" });
        await this.performUploadSync(result);
      }

      // Phase 2: Download remote changes from CouchDB (if enabled)
      if (this.config.bidirectional || this.config.downloadOnly) {
        this.updateSyncStatus({ syncDirection: "download" });
        await this.performDownloadSync(result);
      }

      // Update sync metadata
      await this.updateSyncMetadata();

      result.success = result.errors.length === 0;

      this.updateSyncStatus({
        isRunning: false,
        lastSync: result.timestamp,
        error: result.errors.length > 0 ? result.errors[0] : null,
        progress: 100,
        syncDirection: "idle",
      });

      console.log(
        `${syncType} sync completed: ${result.documentsUploaded} uploaded, ${result.documentsDownloaded} downloaded, ${result.conflictsResolved} conflicts resolved, ${result.errors.length} errors`,
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
   * Performs upload sync (local -> CouchDB)
   */
  private async performUploadSync(result: SyncResult): Promise<void> {
    const localDocuments = await this.getLocalDocumentsForSync();

    if (localDocuments.length === 0) {
      console.log("No local documents to upload");
      return;
    }

    console.log(`Uploading ${localDocuments.length} local changes...`);

    this.updateSyncStatus({
      documentsTotal: localDocuments.length,
    });

    const batches = this.createBatches(localDocuments, this.config.batchSize!);

    for (const batch of batches) {
      try {
        await this.syncBatch(batch);
        result.documentsUploaded += batch.length;

        const progress = Math.round(
          (result.documentsUploaded / localDocuments.length) * 50, // 50% for upload phase
        );
        this.updateSyncStatus({
          documentsUploaded: result.documentsUploaded,
          progress,
        });
      } catch (error) {
        const errorMessage = `Upload batch failed: ${(error as Error).message}`;
        result.errors.push(errorMessage);
        console.error(errorMessage, error);
      }
    }
  }

  /**
   * Performs download sync (CouchDB -> local)
   */
  private async performDownloadSync(result: SyncResult): Promise<void> {
    const remoteChanges = await this.getRemoteChanges();

    if (remoteChanges.length === 0) {
      console.log("No remote changes to download");
      return;
    }

    console.log(`Downloading ${remoteChanges.length} remote changes...`);

    this.updateSyncStatus({
      documentsTotal: result.documentsUploaded + remoteChanges.length,
    });

    const batches = this.createBatches(remoteChanges, this.config.batchSize!);

    for (const batch of batches) {
      try {
        const conflicts = await this.applyRemoteChanges(batch);
        result.documentsDownloaded += batch.length;
        result.conflictsResolved += conflicts;

        const progress = Math.round(
          50 + (result.documentsDownloaded / remoteChanges.length) * 50, // 50% offset + 50% for download phase
        );
        this.updateSyncStatus({
          documentsDownloaded: result.documentsDownloaded,
          progress,
        });
      } catch (error) {
        const errorMessage = `Download batch failed: ${(error as Error).message}`;
        result.errors.push(errorMessage);
        console.error(errorMessage, error);
      }
    }
  }

  /**
   * Gets local documents that need to be synced
   */
  private async getLocalDocumentsForSync(): Promise<CouchDBDocument[]> {
    const syncMetadata = await this.loadSyncMetadata();
    const lastSyncTime =
      syncMetadata?.lastUploadTimestamp || "1970-01-01T00:00:00.000Z";

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
   * Gets remote changes that need to be applied locally
   */
  private async getRemoteChanges(): Promise<CouchDBDocument[]> {
    const syncMetadata = await this.loadSyncMetadata();
    const since = syncMetadata?.lastDownloadSequence || "0";

    try {
      const changes = await this.couchClient.getChanges({
        since,
        include_docs: true,
        limit: 1000, // Reasonable limit for each sync
      });

      // Filter out deleted documents and only include our document types
      const validChanges = changes.results.filter(
        (change) =>
          !change.deleted &&
          change.doc &&
          (change.doc.type === "transaction" || change.doc.type === "category"),
      );

      return validChanges.map((change) => change.doc!);
    } catch (error) {
      console.error("Failed to fetch remote changes:", error);
      throw new Error(
        `Failed to fetch remote changes: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Applies remote changes to local database
   */
  private async applyRemoteChanges(
    remoteDocs: CouchDBDocument[],
  ): Promise<number> {
    let conflictsResolved = 0;

    for (const remoteDoc of remoteDocs) {
      try {
        if (remoteDoc.type === "transaction") {
          await this.applyRemoteTransaction(remoteDoc);
        } else if (remoteDoc.type === "category") {
          await this.applyRemoteCategory(remoteDoc);
        }
      } catch (error) {
        // Handle conflicts based on configuration
        const conflictResult = await this.resolveConflict(remoteDoc, error);
        if (conflictResult.resolved) {
          conflictsResolved++;
        }
      }
    }

    // Emit event to trigger React component updates
    this.emitDataChangeEvent("download", conflictsResolved > 0);

    return conflictsResolved;
  }

  /**
   * Resolves conflicts based on configuration strategy
   */
  private async resolveConflict(
    remoteDoc: CouchDBDocument,
    error: unknown,
  ): Promise<{ resolved: boolean; strategy: string }> {
    const strategy = this.config.conflictResolution || "remote-wins";

    console.warn(
      `Conflict detected for ${remoteDoc._id}, using strategy: ${strategy}`,
      error,
    );

    switch (strategy) {
      case "remote-wins":
        // Force apply remote version
        if (remoteDoc.type === "transaction") {
          await this.forceApplyRemoteTransaction(remoteDoc);
        } else if (remoteDoc.type === "category") {
          await this.forceApplyRemoteCategory(remoteDoc);
        }
        return { resolved: true, strategy };

      case "local-wins":
        // Keep local version, ignore remote
        console.log(`Keeping local version for ${remoteDoc._id}`);
        return { resolved: true, strategy };

      case "manual":
        // Log conflict for manual resolution later
        console.error(
          `Manual conflict resolution required for ${remoteDoc._id}`,
          { remoteDoc, error },
        );
        // For now, fall back to remote-wins
        if (remoteDoc.type === "transaction") {
          await this.forceApplyRemoteTransaction(remoteDoc);
        } else if (remoteDoc.type === "category") {
          await this.forceApplyRemoteCategory(remoteDoc);
        }
        return { resolved: true, strategy: "manual-fallback-remote" };

      default:
        console.error(`Unknown conflict resolution strategy: ${strategy}`);
        return { resolved: false, strategy: "unknown" };
    }
  }

  /**
   * Applies a remote transaction to local database
   */
  private async applyRemoteTransaction(
    remoteDoc: CouchDBDocument,
  ): Promise<void> {
    const transaction = remoteDoc.data as Transaction;
    const localId = transaction.id;

    // Check if transaction exists locally
    const existing = await db.transactions.get(localId);

    if (existing) {
      // Compare timestamps to determine which version is newer
      const remoteUpdated = new Date(transaction.updatedAt);
      const localUpdated = new Date(existing.updatedAt);

      if (remoteUpdated > localUpdated) {
        // Remote is newer, update local
        await db.transactions.put(transaction);
        console.log(`Updated local transaction: ${localId}`);
        this.emitDataChangeEvent("transaction-updated");
      }
      // If local is newer or equal, skip (local changes take precedence)
    } else {
      // New transaction from remote
      await db.transactions.add(transaction);
      console.log(`Added new transaction from remote: ${localId}`);
      this.emitDataChangeEvent("transaction-added");
    }
  }

  /**
   * Applies a remote category to local database
   */
  private async applyRemoteCategory(remoteDoc: CouchDBDocument): Promise<void> {
    const category = remoteDoc.data as Category;
    const localId = category.id;

    // Check if category exists locally
    const existing = await db.categories.get(localId);

    if (existing) {
      // For categories, only update if remote has updatedAt field and is newer
      if (category.updatedAt && existing.updatedAt) {
        const remoteUpdated = new Date(category.updatedAt);
        const localUpdated = new Date(existing.updatedAt);

        if (remoteUpdated > localUpdated) {
          await db.categories.put(category);
          console.log(`Updated local category: ${localId}`);
          this.emitDataChangeEvent("category-updated");
        }
      }
    } else {
      // New category from remote
      await db.categories.add(category);
      console.log(`Added new category from remote: ${localId}`);
      this.emitDataChangeEvent("category-added");
    }
  }

  /**
   * Force applies remote transaction (conflict resolution)
   */
  private async forceApplyRemoteTransaction(
    remoteDoc: CouchDBDocument,
  ): Promise<void> {
    const transaction = remoteDoc.data as Transaction;
    await db.transactions.put(transaction);
    console.log(`Force applied remote transaction: ${transaction.id}`);
    this.emitDataChangeEvent("transaction-conflict-resolved");
  }

  /**
   * Force applies remote category (conflict resolution)
   */
  private async forceApplyRemoteCategory(
    remoteDoc: CouchDBDocument,
  ): Promise<void> {
    const category = remoteDoc.data as Category;
    await db.categories.put(category);
    console.log(`Force applied remote category: ${category.id}`);
    this.emitDataChangeEvent("category-conflict-resolved");
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
    const currentTime = new Date().toISOString();

    // Get the latest sequence from CouchDB
    let latestSequence = "0";
    try {
      const info = await this.couchClient.getInfo();
      latestSequence = info.update_seq;
    } catch (error) {
      console.warn("Failed to get latest sequence from CouchDB:", error);
    }

    const metadata: SyncMetadata = {
      lastUploadSequence: latestSequence,
      lastDownloadSequence: latestSequence,
      lastUploadTimestamp: currentTime,
      lastDownloadTimestamp: currentTime,
      version: "2.0.0", // Phase 2
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
   * Clears the current error state
   */
  clearError(): void {
    this.syncStatus.error = null;
    this.updateSyncStatus({});
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
   * Emits data change events to trigger React component updates
   */
  private emitDataChangeEvent(eventType: string, hasConflicts?: boolean): void {
    if (typeof window !== "undefined") {
      const eventDetail = {
        eventType,
        timestamp: new Date().toISOString(),
        hasConflicts: hasConflicts || false,
      };

      // Emit specific event for fine-grained listening
      window.dispatchEvent(
        new CustomEvent(`sync-${eventType}`, {
          detail: eventDetail,
        }),
      );

      // Emit general data change event for broad listeners
      window.dispatchEvent(
        new CustomEvent("sync-data-updated", {
          detail: eventDetail,
        }),
      );

      console.log(`Emitted data change event: ${eventType}`);
    }
  }

  /**
   * Cleans up resources
   */
  destroy(): void {
    this.stopAutoSync();
  }
}
