import { useState, useEffect, useCallback, useRef } from "react";
import {
  SyncService,
  type SyncStatus,
  type SyncResult,
} from "../services/sync";
import { syncConfig } from "../services/sync/SyncConfig";

// Singleton to prevent multiple sync service instances
let globalSyncService: SyncService | null = null;

let initializationPromise: Promise<boolean> | null = null;

export interface CouchDBSyncState {
  // Connection status
  isEnabled: boolean;
  isConnected: boolean;
  isInitialized: boolean;

  // Sync status
  syncStatus: SyncStatus;
  isRunning: boolean;
  lastSync: string | null;

  // Progress tracking
  documentsUploaded: number;
  documentsDownloaded: number;
  documentsTotal: number;
  progress: number;
  syncDirection: "upload" | "download" | "both" | "idle";

  // Error handling
  error: string | null;

  // Remote info
  remoteInfo: {
    name: string;
    docCount: number;
    updateSeq: string;
    connected: boolean;
  } | null;
}

export interface CouchDBSyncOperations {
  // Core operations
  initialize: () => Promise<boolean>;
  sync: () => Promise<SyncResult>;
  startAutoSync: () => void;
  stopAutoSync: () => void;

  // Connection management
  checkConnection: () => Promise<boolean>;
  refreshRemoteInfo: () => Promise<void>;

  // Status management
  refreshStatus: () => void;
  clearError: () => void;
}

export interface UseCouchDBSyncReturn
  extends CouchDBSyncState,
    CouchDBSyncOperations {
  // Configuration
  config: ReturnType<typeof syncConfig.getConfig>;
}

/**
 * React hook for managing CouchDB synchronization
 *
 * This hook provides a complete interface for managing one-way sync
 * from local Dexie database to CouchDB. It handles initialization,
 * sync operations, status monitoring, and error management.
 *
 * @param autoInit - Whether to automatically initialize on mount (default: true)
 * @param autoStart - Whether to start auto-sync after initialization (default: false)
 */
export const useCouchDBSync = (
  autoInit = true,
  autoStart = false,
): UseCouchDBSyncReturn => {
  // Internal state
  const [state, setState] = useState<CouchDBSyncState>({
    isEnabled: false,
    isConnected: false,
    isInitialized: false,
    syncStatus: {
      lastSync: null,
      isRunning: false,
      error: null,
      documentsUploaded: 0,
      documentsDownloaded: 0,
      documentsTotal: 0,
      progress: 0,
      syncDirection: "idle",
    },
    isRunning: false,
    lastSync: null,
    documentsUploaded: 0,
    documentsDownloaded: 0,
    documentsTotal: 0,
    progress: 0,
    syncDirection: "idle",
    error: null,
    remoteInfo: null,
  });

  // Refs for cleanup and persistence
  const syncServiceRef = useRef<SyncService | null>(null);
  const statusIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get configuration
  const config = syncConfig.getConfig();

  /**
   * Initialize the sync service with auto-retry logic
   */
  const initialize = useCallback(async (): Promise<boolean> => {
    if (!config) {
      setState((prev) => ({
        ...prev,
        isEnabled: false,
        error: "Sync is not configured. Please check environment variables.",
      }));
      return false;
    }

    // Return existing instance if available
    if (globalSyncService) {
      syncServiceRef.current = globalSyncService;
      setState((prev) => ({
        ...prev,
        isEnabled: true,
        isInitialized: true,
        error: null,
      }));

      // Check connection and get remote info silently with retry
      try {
        const connected = await retryOperation(
          () => globalSyncService!.checkConnection(),
          2,
          500,
        );
        setState((prev) => ({
          ...prev,
          isConnected: connected,
        }));

        if (connected) {
          const remoteInfo = await globalSyncService.getRemoteInfo();
          setState((prev) => ({
            ...prev,
            remoteInfo,
          }));
        }
      } catch (error) {
        console.warn("Failed to check existing sync service:", error);
      }

      return true;
    }

    // Return existing initialization promise if one is running
    if (initializationPromise) {
      return await initializationPromise;
    }

    // Create new initialization promise with retry logic
    initializationPromise = (async () => {
      // Double-check after promise creation (race condition protection)
      if (globalSyncService) {
        return true;
      }

      const maxRetries = 3;
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          setState((prev) => ({
            ...prev,
            error:
              attempt === 1
                ? null
                : `Connecting... (attempt ${attempt}/${maxRetries})`,
          }));

          const syncService = new SyncService(config);
          const success = await syncService.initialize();

          if (success) {
            globalSyncService = syncService;
            syncServiceRef.current = syncService;

            setState((prev) => ({
              ...prev,
              isEnabled: true,
              isInitialized: true,
              error: null,
            }));

            // Check initial connection with retry
            const connected = await retryOperation(
              () => syncService.checkConnection(),
              2,
              500,
            );
            setState((prev) => ({
              ...prev,
              isConnected: connected,
            }));

            // Get initial remote info if connected
            if (connected) {
              const remoteInfo = await syncService.getRemoteInfo();
              setState((prev) => ({
                ...prev,
                remoteInfo,
                error: null, // Clear any errors since connection and remote info worked
              }));
            } else if (attempt === maxRetries) {
              // Only show "ready to sync" message after all retries
              setState((prev) => ({
                ...prev,
                error: null, // Don't show error for configured but not connected
              }));
            }

            return true;
          } else {
            throw new Error("Failed to initialize sync service");
          }
        } catch (error) {
          lastError =
            error instanceof Error ? error : new Error("Unknown error");
          console.warn(
            `Sync initialization attempt ${attempt} failed:`,
            lastError,
          );

          if (attempt < maxRetries) {
            // Wait with exponential backoff before retry
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }

      // All retries failed
      const errorMessage = lastError?.message || "Unknown initialization error";
      const isConnectionError =
        errorMessage.includes("fetch") ||
        errorMessage.includes("network") ||
        errorMessage.includes("CORS") ||
        errorMessage.includes("connection");

      setState((prev) => ({
        ...prev,
        isEnabled: !isConnectionError, // Still enabled if it's just a connection issue
        isInitialized: !isConnectionError, // Consider initialized if config is valid
        error: isConnectionError ? null : errorMessage, // Don't show connection errors as failures
      }));

      return false;
    })();

    return await initializationPromise;
  }, [config]);

  /**
   * Utility function for retrying operations with exponential backoff
   */
  const retryOperation = async <T>(
    operation: () => Promise<T>,
    maxRetries: number,
    baseDelay: number,
  ): Promise<T> => {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Unknown error");

        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  };

  /**
   * Perform manual sync
   */
  const sync = useCallback(async (): Promise<SyncResult> => {
    const serviceToUse = syncServiceRef.current || globalSyncService;
    if (!serviceToUse) {
      throw new Error("Sync service not initialized");
    }

    if (state.isRunning) {
      throw new Error("Sync is already running");
    }

    try {
      const result = await serviceToUse.sync();

      // Update state with result
      setState((prev) => ({
        ...prev,
        lastSync: result.timestamp,
        error: result.errors.length > 0 ? result.errors[0] : null,
      }));

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Sync failed";
      setState((prev) => ({
        ...prev,
        error: errorMessage,
      }));
      throw error;
    }
  }, [state.isRunning]);

  /**
   * Start automatic sync
   */
  const startAutoSync = useCallback(() => {
    const serviceToUse = syncServiceRef.current || globalSyncService;
    if (!serviceToUse) {
      console.warn("Cannot start auto-sync: service not initialized");
      return;
    }

    serviceToUse.startAutoSync();
  }, []);

  /**
   * Stop automatic sync
   */
  const stopAutoSync = useCallback(() => {
    const serviceToUse = syncServiceRef.current || globalSyncService;
    if (serviceToUse) {
      serviceToUse.stopAutoSync();
    }
  }, []);

  /**
   * Check connection to CouchDB
   */
  const checkConnection = useCallback(async (): Promise<boolean> => {
    const serviceToUse = syncServiceRef.current || globalSyncService;
    if (!serviceToUse) {
      return false;
    }

    try {
      const connected = await serviceToUse.checkConnection();
      setState((prev) => ({
        ...prev,
        isConnected: connected,
        error: connected ? null : prev.error, // Clear error if connected
      }));
      return connected;
    } catch {
      setState((prev) => ({
        ...prev,
        isConnected: false,
      }));
      return false;
    }
  }, []);

  /**
   * Refresh remote database information
   */
  const refreshRemoteInfo = useCallback(async () => {
    const serviceToUse = syncServiceRef.current || globalSyncService;
    if (!serviceToUse) {
      return;
    }

    try {
      const remoteInfo = await serviceToUse.getRemoteInfo();
      setState((prev) => ({
        ...prev,
        remoteInfo,
        isConnected: !!remoteInfo,
        error: remoteInfo ? null : prev.error, // Clear error if remote info retrieved
      }));
    } catch {
      setState((prev) => ({
        ...prev,
        remoteInfo: null,
        isConnected: false,
      }));
    }
  }, []);

  /**
   * Refresh sync status from service
   */
  const refreshStatus = useCallback(() => {
    const serviceToUse = syncServiceRef.current || globalSyncService;
    if (!serviceToUse) {
      return;
    }

    const syncStatus = serviceToUse.getSyncStatus();
    setState((prev) => ({
      ...prev,
      syncStatus,
      isRunning: syncStatus.isRunning,
      lastSync: syncStatus.lastSync,
      documentsUploaded: syncStatus.documentsUploaded,
      documentsDownloaded: syncStatus.documentsDownloaded,
      documentsTotal: syncStatus.documentsTotal,
      progress: syncStatus.progress,
      syncDirection: syncStatus.syncDirection,
      error: syncStatus.error,
    }));
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    // Clear error in the sync service itself
    const serviceToUse = syncServiceRef.current || globalSyncService;
    if (serviceToUse) {
      serviceToUse.clearError();
    }

    setState((prev) => ({
      ...prev,
      error: null,
    }));
  }, []);

  /**
   * Setup periodic status refresh
   */
  useEffect(() => {
    if (state.isInitialized) {
      statusIntervalRef.current = setInterval(() => {
        refreshStatus();
      }, 1000); // Refresh every second when sync might be running

      return () => {
        if (statusIntervalRef.current) {
          clearInterval(statusIntervalRef.current);
        }
      };
    }
  }, [state.isInitialized, refreshStatus]);

  /**
   * Initialize on mount if autoInit is enabled
   */
  useEffect(() => {
    if (autoInit && !state.isInitialized) {
      initialize().then((success) => {
        if (success && autoStart && syncConfig.shouldAutoStart()) {
          startAutoSync();
        }
      });
    }
  }, [autoInit, autoStart, state.isInitialized, initialize, startAutoSync]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      // Don't destroy the global sync service, just clean up intervals
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
      }
      // Clear local reference
      syncServiceRef.current = null;
    };
  }, []);

  return {
    // State
    ...state,

    // Operations
    initialize,
    sync,
    startAutoSync,
    stopAutoSync,
    checkConnection,
    refreshRemoteInfo,
    refreshStatus,
    clearError,

    // Configuration
    config,
  };
};

/**
 * Hook for sync status monitoring only
 * Useful for components that only need to display sync status
 */
export const useCouchDBSyncStatus = () => {
  const {
    isEnabled,
    isConnected,
    isInitialized,
    syncStatus,
    isRunning,
    lastSync,
    documentsUploaded,
    documentsDownloaded,
    documentsTotal,
    progress,
    syncDirection,
    error,
    remoteInfo,
    config,
  } = useCouchDBSync(true, false); // Auto-init but don't auto-start

  return {
    isEnabled,
    isConnected,
    isInitialized,
    syncStatus,
    isRunning,
    lastSync,
    documentsUploaded,
    documentsDownloaded,
    documentsTotal,
    progress,
    syncDirection,
    error,
    remoteInfo,
    config,
    hasError: !!error,
    isConfigured: !!config,
    canSync: isEnabled && isConnected && !isRunning,
  };
};

/**
 * Hook for sync operations only
 * Useful for components that need to trigger sync actions
 */
export const useCouchDBSyncOperations = () => {
  const {
    initialize,
    sync,
    startAutoSync,
    stopAutoSync,
    checkConnection,
    refreshRemoteInfo,
    refreshStatus,
    clearError,
  } = useCouchDBSync(false, false); // Don't auto-init or auto-start

  return {
    initialize,
    sync,
    startAutoSync,
    stopAutoSync,
    checkConnection,
    refreshRemoteInfo,
    refreshStatus,
    clearError,
  };
};
