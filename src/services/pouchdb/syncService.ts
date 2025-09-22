/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  createLocalDB,
  createRemoteDB,
  SYNC_CONFIG,
  SyncStatus,
  type SyncEvent,
  type SyncHandler,
  type Database,
  checkRemoteDatabase,
  ensureRemoteDatabase,
} from "./config";

// Sync state interface
export interface SyncState {
  status: SyncStatus;
  lastSync?: Date;
  error?: string;
  docsRead: number;
  docsWritten: number;
  pending: number;
  isOnline: boolean;
  retryCount: number;
  lastEvent?: SyncEvent;
}

// Sync configuration options
export interface SyncOptions {
  live?: boolean;
  retry?: boolean;
  continuous?: boolean;
  enableSync?: boolean;
  heartbeat?: number;
  timeout?: number;
  batchSize?: number;
}

// Event listener type
export type SyncEventListener = (event: SyncEvent) => void;

/**
 * Service for managing PouchDB sync with CouchDB
 *
 * This service handles bidirectional synchronization between local PouchDB
 * and remote CouchDB, including connection management, conflict resolution,
 * and sync status tracking.
 */
export class SyncService {
  private localDB: Database;
  private remoteDB: Database | null = null;
  private syncHandler: SyncHandler | null = null;
  private eventListeners: SyncEventListener[] = [];
  private state: SyncState;
  private retryTimeout: number | null = null;
  private maxRetries = 5;
  private retryDelay = 1000; // Start with 1 second

  private initialized = false;
  private initPromise: Promise<void> | null = null;

  constructor(options: SyncOptions = {}) {
    // Initialize sync state
    this.state = {
      status: SyncStatus.DISCONNECTED,
      docsRead: 0,
      docsWritten: 0,
      pending: 0,
      isOnline: navigator.onLine,
      retryCount: 0,
    };

    // Start async initialization
    this.initPromise = this.initialize(options);
  }

  /**
   * Initialize the sync service asynchronously
   */
  private async initialize(options: SyncOptions): Promise<void> {
    if (this.initialized) return;

    this.localDB = await createLocalDB();

    // Listen for online/offline events
    this.setupNetworkListeners();

    // Auto-start sync if enabled
    if (options.enableSync !== false) {
      await this.startSync(options);
    }

    this.initialized = true;
  }

  /**
   * Ensure the service is initialized before any operation
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise;
    }
  }

  /**
   * Subscribe to sync events
   */
  public onSyncEvent(listener: SyncEventListener): () => void {
    this.eventListeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.eventListeners.indexOf(listener);
      if (index > -1) {
        this.eventListeners.splice(index, 1);
      }
    };
  }

  /**
   * Get current sync state
   */
  public getState(): SyncState {
    return { ...this.state };
  }

  /**
   * Start synchronization with remote database
   */
  public async startSync(options: SyncOptions = {}): Promise<void> {
    await this.ensureInitialized();
    try {
      // Check if we're online
      if (!navigator.onLine) {
        this.emitEvent({
          status: SyncStatus.PAUSED,
          message: "Offline - sync will resume when connection is restored",
          timestamp: Date.now(),
        });
        return;
      }

      // Update status to connecting
      this.emitEvent({
        status: SyncStatus.CONNECTING,
        message: "Connecting to remote database...",
        timestamp: Date.now(),
      });

      // Ensure remote database exists
      const remoteResult = await ensureRemoteDatabase();
      if (!remoteResult.success) {
        throw new Error(
          remoteResult.error || "Failed to connect to remote database",
        );
      }

      // Create remote database connection
      this.remoteDB = await createRemoteDB();

      // Test the connection
      await (this.remoteDB as any).info();

      // Configure sync options
      const syncOptions = {
        ...SYNC_CONFIG,
        ...options,
      };

      // Start bidirectional sync
      this.syncHandler = (this.localDB as any).sync(this.remoteDB, syncOptions);

      // Set up event handlers
      this.setupSyncEventHandlers();

      // Reset retry count on successful connection
      this.state.retryCount = 0;

      this.emitEvent({
        status: SyncStatus.CONNECTED,
        message: "Connected to remote database",
        timestamp: Date.now(),
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown sync error";

      this.emitEvent({
        status: SyncStatus.ERROR,
        message: errorMessage,
        error: error instanceof Error ? error : new Error(errorMessage),
        timestamp: Date.now(),
      });

      // Implement retry logic
      this.scheduleRetry();
    }
  }

  /**
   * Stop synchronization
   */
  public stopSync(): void {
    if (this.syncHandler) {
      (this.syncHandler as any).cancel();
      this.syncHandler = null;
    }

    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }

    this.emitEvent({
      status: SyncStatus.DISCONNECTED,
      message: "Sync stopped",
      timestamp: Date.now(),
    });
  }

  /**
   * Restart synchronization
   */
  public async restartSync(options: SyncOptions = {}): Promise<void> {
    await this.ensureInitialized();
    this.stopSync();
    await this.startSync(options);
  }

  /**
   * Force a one-time sync
   */
  public async forcSync(): Promise<void> {
    await this.ensureInitialized();
    if (!this.remoteDB) {
      throw new Error("No remote database connection");
    }

    try {
      this.emitEvent({
        status: SyncStatus.SYNCING,
        message: "Starting manual sync...",
        timestamp: Date.now(),
      });

      // Perform one-time sync
      await (this.localDB as any).sync(this.remoteDB, {
        ...SYNC_CONFIG,
        live: false,
        retry: false,
      });

      this.emitEvent({
        status: SyncStatus.CONNECTED,
        message: "Manual sync completed",
        timestamp: Date.now(),
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Manual sync failed";

      this.emitEvent({
        status: SyncStatus.ERROR,
        message: errorMessage,
        error: error instanceof Error ? error : new Error(errorMessage),
        timestamp: Date.now(),
      });

      throw error;
    }
  }

  /**
   * Check connection to remote database
   */
  public async checkConnection(): Promise<boolean> {
    await this.ensureInitialized();
    try {
      if (!this.remoteDB) {
        return false;
      }
      await (this.remoteDB as any).info();
      return true;
    } catch (error) {
      console.warn("Connection check failed:", error);
      return false;
    }
  }

  /**
   * Get sync statistics
   */
  public getSyncStats(): {
    docsRead: number;
    docsWritten: number;
    pending: number;
    lastSync?: Date;
    status: SyncStatus;
  } {
    return {
      docsRead: this.state.docsRead,
      docsWritten: this.state.docsWritten,
      pending: this.state.pending,
      lastSync: this.state.lastSync,
      status: this.state.status,
    };
  }

  /**
   * Destroy the service and clean up resources
   */
  public async destroy(): Promise<void> {
    await this.ensureInitialized();
    this.stopSync();
    this.eventListeners = [];

    // Remove network listeners
    window.removeEventListener("online", this.handleOnline);
    window.removeEventListener("offline", this.handleOffline);
  }

  /**
   * Set up sync event handlers
   */
  private setupSyncEventHandlers(): void {
    if (!this.syncHandler) return;

    (this.syncHandler as any)
      .on(
        "change",
        (info: { change: { docs_read?: number; docs_written?: number } }) => {
          this.state.docsRead += info.change.docs_read || 0;
          this.state.docsWritten += info.change.docs_written || 0;
          this.state.lastSync = new Date();

          this.emitEvent({
            status: SyncStatus.SYNCING,
            message: `Syncing: ${info.change.docs_read || 0} read, ${info.change.docs_written || 0} written`,
            docsRead: info.change.docs_read || 0,
            docsWritten: info.change.docs_written || 0,
            timestamp: Date.now(),
          });
        },
      )
      .on("paused", (err?: Error) => {
        if (err) {
          this.emitEvent({
            status: SyncStatus.ERROR,
            message: "Sync paused due to error",
            error: err instanceof Error ? err : new Error(String(err)),
            timestamp: Date.now(),
          });
        } else {
          this.emitEvent({
            status: SyncStatus.PAUSED,
            message: "Sync paused",
            timestamp: Date.now(),
          });
        }
      })
      .on("active", () => {
        this.emitEvent({
          status: SyncStatus.SYNCING,
          message: "Sync resumed",
          timestamp: Date.now(),
        });
      })
      .on("denied", (err: Error) => {
        this.emitEvent({
          status: SyncStatus.DENIED,
          message: "Sync denied - check permissions",
          error: err instanceof Error ? err : new Error(String(err)),
          timestamp: Date.now(),
        });
      })
      .on(
        "complete",
        (info: {
          docs_read?: number;
          docs_written?: number;
          pull?: any;
          push?: any;
        }) => {
          this.emitEvent({
            status: SyncStatus.CONNECTED,
            message: "Sync completed",
            docsRead: info.docs_read || 0,
            docsWritten: info.docs_written || 0,
            timestamp: Date.now(),
          });
        },
      )
      .on("error", (err: Error) => {
        this.emitEvent({
          status: SyncStatus.ERROR,
          message: "Sync error occurred",
          error: err instanceof Error ? err : new Error(String(err)),
          timestamp: Date.now(),
        });

        this.scheduleRetry();
      });
  }

  /**
   * Set up network event listeners
   */
  private setupNetworkListeners(): void {
    this.handleOnline = this.handleOnline.bind(this);
    this.handleOffline = this.handleOffline.bind(this);

    window.addEventListener("online", this.handleOnline);
    window.addEventListener("offline", this.handleOffline);
  }

  /**
   * Handle online event
   */
  private handleOnline(): void {
    this.state.isOnline = true;

    this.emitEvent({
      status: SyncStatus.CONNECTING,
      message: "Connection restored - resuming sync...",
      timestamp: Date.now(),
    });

    // Resume sync when connection is restored
    this.startSync();
  }

  /**
   * Handle offline event
   */
  private handleOffline(): void {
    this.state.isOnline = false;

    this.emitEvent({
      status: SyncStatus.PAUSED,
      message: "Connection lost - sync paused",
      timestamp: Date.now(),
    });
  }

  /**
   * Schedule a retry with exponential backoff
   */
  private scheduleRetry(): void {
    if (this.state.retryCount >= this.maxRetries) {
      this.emitEvent({
        status: SyncStatus.ERROR,
        message: `Max retries (${this.maxRetries}) exceeded. Sync stopped.`,
        timestamp: Date.now(),
      });
      return;
    }

    const delay = this.retryDelay * Math.pow(2, this.state.retryCount);
    this.state.retryCount++;

    this.emitEvent({
      status: SyncStatus.CONNECTING,
      message: `Retrying in ${delay / 1000} seconds... (attempt ${this.state.retryCount}/${this.maxRetries})`,
      timestamp: Date.now(),
    });

    this.retryTimeout = window.setTimeout(() => {
      this.startSync();
    }, delay);
  }

  /**
   * Emit sync event to all listeners
   */
  private emitEvent(event: SyncEvent): void {
    // Update internal state
    this.state.status = event.status;
    if (event.error) {
      this.state.error = event.error.message;
    }
    if (event.docsRead !== undefined) {
      this.state.docsRead += event.docsRead;
    }
    if (event.docsWritten !== undefined) {
      this.state.docsWritten += event.docsWritten;
    }
    if (event.pending !== undefined) {
      this.state.pending = event.pending;
    }
    this.state.lastEvent = event;

    // Notify all listeners
    this.eventListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error("Error in sync event listener:", error);
      }
    });
  }
}

// Singleton instance for app-wide sync management
let syncServiceInstance: SyncService | null = null;

/**
 * Get singleton sync service instance
 */
export const getSyncService = (options?: SyncOptions): SyncService => {
  if (!syncServiceInstance) {
    syncServiceInstance = new SyncService(options);
  }
  return syncServiceInstance;
};

/**
 * Destroy singleton instance
 */
export const destroySyncService = async (): Promise<void> => {
  if (syncServiceInstance) {
    await syncServiceInstance.destroy();
    syncServiceInstance = null;
  }
};

/**
 * Check if sync is available (remote database is accessible)
 */
export const isSyncAvailable = async (): Promise<boolean> => {
  try {
    return await checkRemoteDatabase();
  } catch (error) {
    console.warn("Sync availability check failed:", error);
    return false;
  }
};
