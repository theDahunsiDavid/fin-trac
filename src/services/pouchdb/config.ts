/* eslint-disable @typescript-eslint/no-explicit-any */
// Type definitions that are safe to import statically
export type Database = unknown; // Will be properly typed when PouchDB is loaded
export type SyncHandler = unknown; // Will be properly typed when PouchDB is loaded

// Sync status enumeration
export const SyncStatus = {
  DISCONNECTED: "disconnected",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  SYNCING: "syncing",
  PAUSED: "paused",
  ERROR: "error",
  DENIED: "denied",
} as const;

export type SyncStatus = (typeof SyncStatus)[keyof typeof SyncStatus];

// Sync event types
export interface SyncEvent {
  status: SyncStatus;
  message?: string;
  error?: Error;
  docsRead?: number;
  docsWritten?: number;
  pending?: number;
  lastSeq?: number;
  timestamp: number;
}

// Local database configuration
export const POUCHDB_CONFIG = {
  name: "fintrac",
  options: {
    auto_compaction: true,
    revs_limit: 10,
  },
};

// Remote CouchDB configuration
export const REMOTE_COUCHDB_CONFIG = {
  url: import.meta.env.VITE_COUCHDB_URL || "http://localhost:5984/fintrac",
  options: {
    live: true,
    retry: true,
    continuous: true,
    auth: {
      username: import.meta.env.VITE_COUCHDB_USERNAME || "admin",
      password: import.meta.env.VITE_COUCHDB_PASSWORD || "password",
    },
  },
};

// Sync configuration
export const SYNC_CONFIG = {
  live: true,
  retry: true,
  continuous: true,
  heartbeat: 10000, // 10 seconds
  timeout: 20000, // 20 seconds
  batch_size: 100,
  batches_limit: 10,
};

// Cache for dynamically loaded PouchDB
let PouchDBClass: unknown = null;
let pouchdbLoaded = false;
let loadingPromise: Promise<unknown> | null = null;

/**
 * Dynamically load PouchDB and its plugins to avoid import issues
 */
async function loadPouchDB(): Promise<unknown> {
  if (pouchdbLoaded && PouchDBClass) {
    return PouchDBClass;
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    try {
      console.log("Loading PouchDB...");

      // Dynamic import of PouchDB
      const PouchDBModule = await import("pouchdb");
      const PouchDBFindModule = await import("pouchdb-find");

      // Handle different export styles
      const PouchDB = PouchDBModule.default || PouchDBModule;
      const PouchDBFind = PouchDBFindModule.default || PouchDBFindModule;

      // Add the find plugin to PouchDB
      PouchDB.plugin(PouchDBFind);

      // Enable debugging in development
      if (import.meta.env.DEV && PouchDB.debug) {
        PouchDB.debug.enable("pouchdb:find");
      }

      PouchDBClass = PouchDB;
      pouchdbLoaded = true;

      console.log("PouchDB loaded successfully");
      return PouchDB;
    } catch (error) {
      console.error("Failed to load PouchDB:", error);
      throw new Error(
        `PouchDB loading failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  })();

  return loadingPromise;
}

/**
 * Get PouchDB constructor (loads it if needed)
 */
export async function getPouchDB(): Promise<unknown> {
  return await loadPouchDB();
}

/**
 * Create local database instance
 */
export const createLocalDB = async (): Promise<Database> => {
  const PouchDB = await getPouchDB();
  const db = new (PouchDB as any)(POUCHDB_CONFIG.name, POUCHDB_CONFIG.options);
  return db;
};

/**
 * Create remote database instance
 */
export const createRemoteDB = async (): Promise<Database> => {
  const PouchDB = await getPouchDB();
  const remoteUrl = `${REMOTE_COUCHDB_CONFIG.url}`;

  return new (PouchDB as any)(remoteUrl, {
    skip_setup: true, // Don't try to create the database
    auth: REMOTE_COUCHDB_CONFIG.options.auth,
  });
};

/**
 * Check if PouchDB find plugin is available
 */
export const hasFindPlugin = async (): Promise<boolean> => {
  try {
    const PouchDB = await getPouchDB();
    const testDb = new (PouchDB as any)("test-find-plugin", {
      adapter: "memory",
    });
    const hasFind = typeof testDb.find === "function";
    await (testDb as any).destroy();
    return hasFind;
  } catch (error) {
    console.warn("Error checking find plugin:", error);
    return false;
  }
};

/**
 * Helper function for querying documents with find
 */
export const findDocuments = async (
  db: Database,
  selector: Record<string, unknown>,
  options: Record<string, unknown> = {},
): Promise<unknown> => {
  const hasFind = await hasFindPlugin();
  if (!hasFind) {
    throw new Error("PouchDB find plugin is not available");
  }

  return await (db as any).find({
    selector,
    ...options,
  });
};

/**
 * Connection testing utility
 */
export const testCouchDBConnection = async (): Promise<{
  success: boolean;
  error?: string;
  info?: Record<string, unknown>;
}> => {
  try {
    const remoteDb = await createRemoteDB();
    const info = await (remoteDb as any).info();

    return {
      success: true,
      info: info as unknown as Record<string, unknown>,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Development helper
 */
export const getPouchDBStatus = async () => {
  try {
    const PouchDB = await getPouchDB();
    const hasFind = await hasFindPlugin();

    return {
      available: true,
      findPlugin: hasFind,
      version: (PouchDB as any).version,
      localDbName: POUCHDB_CONFIG.name,
      remoteDbUrl: REMOTE_COUCHDB_CONFIG.url,
      message: "PouchDB enabled with CouchDB sync support",
    };
  } catch (error) {
    return {
      available: false,
      findPlugin: false,
      version: "unknown",
      localDbName: POUCHDB_CONFIG.name,
      remoteDbUrl: REMOTE_COUCHDB_CONFIG.url,
      message: `PouchDB unavailable: ${error instanceof Error ? error.message : "Unknown error"}`,
      error: error,
    };
  }
};

/**
 * Database cleanup utility
 */
export const destroyLocalDB = async (): Promise<void> => {
  try {
    const db = await createLocalDB();
    await (db as any).destroy();
    console.log("Local database destroyed successfully");
  } catch (error) {
    console.warn("Error destroying local database:", error);
  }
};

/**
 * Check if remote database exists
 */
export const checkRemoteDatabase = async (): Promise<boolean> => {
  try {
    const remoteDb = await createRemoteDB();
    await (remoteDb as any).info();
    return true;
  } catch (error) {
    console.warn("Remote database check failed:", error);
    return false;
  }
};

/**
 * Create remote database if it doesn't exist
 */
export const ensureRemoteDatabase = async (): Promise<{
  success: boolean;
  created?: boolean;
  error?: string;
}> => {
  try {
    // First check if it exists
    const exists = await checkRemoteDatabase();
    if (exists) {
      return { success: true, created: false };
    }

    // Try to create it by putting a test document and then removing it
    const remoteDb = await createRemoteDB();
    const testDoc = {
      _id: "_test_creation",
      test: true,
      createdAt: new Date().toISOString(),
    };

    try {
      await (remoteDb as any).put(testDoc);
      const retrievedDoc = await (remoteDb as any).get(testDoc._id);
      await (remoteDb as any).remove(retrievedDoc._id, retrievedDoc._rev);
      return { success: true, created: true };
    } catch (createError) {
      return {
        success: false,
        error: `Failed to create remote database: ${createError instanceof Error ? createError.message : "Unknown error"}`,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Check if PouchDB is available without loading it
 */
export const isPouchDBAvailable = (): boolean => {
  return pouchdbLoaded && PouchDBClass !== null;
};

/**
 * Reset PouchDB loading state (useful for testing)
 */
export const resetPouchDBState = (): void => {
  PouchDBClass = null;
  pouchdbLoaded = false;
  loadingPromise = null;
};
