/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Alternative PouchDB setup that works around spark-md5 ES module issues
 *
 * This module provides a robust PouchDB initialization that handles the
 * spark-md5 import conflicts by using dynamic imports and fallback strategies.
 */

let PouchDB: unknown;
let PouchDBFind: unknown;
let isInitialized = false;
let initError: Error | null = null;

// Fallback MD5 implementation if spark-md5 fails
function simpleMD5(str: string): string {
  // Simple hash function for fallback (not cryptographically secure)
  let hash = 0;
  if (str.length === 0) return hash.toString();
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

// Mock SparkMD5 if the real one fails
const mockSparkMD5 = {
  hash: simpleMD5,
  hashBinary: simpleMD5,
  ArrayBuffer: {
    hash: (buffer: ArrayBuffer) =>
      simpleMD5(String.fromCharCode(...new Uint8Array(buffer))),
  },
};

/**
 * Initialize PouchDB with spark-md5 workaround
 */
export async function initializePouchDB(): Promise<{
  success: boolean;
  error?: string;
}> {
  if (isInitialized) {
    return { success: !initError, error: initError?.message };
  }

  try {
    // Try to fix spark-md5 globally before PouchDB loads
    if (typeof window !== "undefined" && !window.SparkMD5) {
      try {
        // Try dynamic import first
        const sparkMD5Module = await import("spark-md5");
        window.SparkMD5 = sparkMD5Module.default || sparkMD5Module;
      } catch (sparkError) {
        console.warn("Failed to load spark-md5, using fallback:", sparkError);
        // Use mock implementation
        window.SparkMD5 = mockSparkMD5;
      }
    }

    // Now try to load PouchDB
    const pouchModule = await import("pouchdb");
    PouchDB = pouchModule.default || pouchModule;

    // Load find plugin
    const findModule = await import("pouchdb-find");
    PouchDBFind = findModule.default || findModule;

    // Install find plugin
    if (PouchDB && PouchDBFind) {
      (PouchDB as any).plugin(PouchDBFind);
    }

    isInitialized = true;
    console.log("PouchDB initialized successfully with spark-md5 workaround");

    return { success: true };
  } catch (error) {
    initError = error instanceof Error ? error : new Error(String(error));
    console.error("Failed to initialize PouchDB:", initError);

    return {
      success: false,
      error: `PouchDB initialization failed: ${initError.message}`,
    };
  }
}

/**
 * Get PouchDB constructor (must call initializePouchDB first)
 */
export function getPouchDB(): unknown {
  if (!isInitialized || initError) {
    throw new Error("PouchDB not initialized. Call initializePouchDB() first.");
  }
  return PouchDB;
}

/**
 * Check if PouchDB is available and working
 */
export function isPouchDBAvailable(): boolean {
  return isInitialized && !initError && !!PouchDB;
}

/**
 * Get initialization status
 */
export function getPouchDBStatus(): {
  initialized: boolean;
  available: boolean;
  error?: string;
  hasSparkMD5: boolean;
  hasFindPlugin: boolean;
} {
  const hasSparkMD5 = typeof window !== "undefined" && !!window.SparkMD5;
  const hasFindPlugin =
    !!PouchDB && typeof (PouchDB as any).find === "function";

  return {
    initialized: isInitialized,
    available: isPouchDBAvailable(),
    error: initError?.message,
    hasSparkMD5,
    hasFindPlugin,
  };
}

/**
 * Create a PouchDB database instance with error handling
 */
export async function createPouchDatabase(
  name: string,
  options: Record<string, unknown> = {},
): Promise<unknown> {
  if (!isPouchDBAvailable()) {
    const initResult = await initializePouchDB();
    if (!initResult.success) {
      throw new Error(initResult.error || "Failed to initialize PouchDB");
    }
  }

  try {
    const db = new (PouchDB as any)(name, options);

    // Test basic functionality
    await db.info();

    return db;
  } catch (error) {
    throw new Error(
      `Failed to create PouchDB database: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Reset PouchDB initialization (for testing)
 */
export function resetPouchDBState(): void {
  isInitialized = false;
  initError = null;
  PouchDB = undefined;
  PouchDBFind = undefined;
}

// Global type declarations for TypeScript
declare global {
  interface Window {
    SparkMD5: any;
  }
}
