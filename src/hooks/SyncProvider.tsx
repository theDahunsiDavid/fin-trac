import React, { useEffect, useState, useCallback } from "react";
import {
  SyncService,
  type SyncStatus,
  type SyncResult,
} from "../services/sync";
import { syncConfig } from "../services/sync/SyncConfig";
import { SyncContext, type SyncContextType } from "./SyncContext";

interface SyncProviderProps {
  children: React.ReactNode;
}

export const SyncProvider: React.FC<SyncProviderProps> = ({ children }) => {
  const [syncService, setSyncService] = useState<SyncService | null>(null);
  const [state, setState] = useState<{
    isEnabled: boolean;
    isConnected: boolean;
    isInitialized: boolean;
    syncStatus: SyncStatus;
    isRunning: boolean;
    lastSync: string | null;
    documentsUploaded: number;
    documentsTotal: number;
    progress: number;
    error: string | null;
    remoteInfo: {
      name: string;
      docCount: number;
      updateSeq: string;
      connected: boolean;
    } | null;
  }>({
    isEnabled: false,
    isConnected: false,
    isInitialized: false,
    syncStatus: {
      lastSync: null,
      isRunning: false,
      error: null,
      documentsUploaded: 0,
      documentsTotal: 0,
      progress: 0,
    } as SyncStatus,
    isRunning: false,
    lastSync: null,
    documentsUploaded: 0,
    documentsTotal: 0,
    progress: 0,
    error: null,
    remoteInfo: null,
  });

  const config = syncConfig.getConfig();

  /**
   * Initialize the sync service (singleton)
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

    // Don't reinitialize if already done
    if (syncService && state.isInitialized) {
      return true;
    }

    try {
      const newSyncService = new SyncService(config);
      const success = await newSyncService.initialize();

      if (success) {
        setSyncService(newSyncService);

        setState((prev) => ({
          ...prev,
          isEnabled: true,
          isInitialized: true,
          error: null,
        }));

        // Check initial connection
        const connected = await newSyncService.checkConnection();
        setState((prev) => ({
          ...prev,
          isConnected: connected,
        }));

        // Get initial remote info if connected
        if (connected) {
          const remoteInfo = await newSyncService.getRemoteInfo();
          setState((prev) => ({
            ...prev,
            remoteInfo,
          }));
        }

        return true;
      } else {
        setState((prev) => ({
          ...prev,
          isEnabled: false,
          error: "Failed to initialize sync service",
        }));
        return false;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown initialization error";
      setState((prev) => ({
        ...prev,
        isEnabled: false,
        error: errorMessage,
      }));
      return false;
    }
  }, [config, syncService, state.isInitialized]);

  /**
   * Perform manual sync
   */
  const sync = useCallback(async (): Promise<SyncResult> => {
    if (!syncService) {
      throw new Error("Sync service not initialized");
    }

    if (state.isRunning) {
      throw new Error("Sync is already running");
    }

    try {
      const result = await syncService.sync();

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
  }, [syncService, state.isRunning]);

  /**
   * Start automatic sync
   */
  const startAutoSync = useCallback(() => {
    if (!syncService) {
      console.warn("Cannot start auto-sync: service not initialized");
      return;
    }

    syncService.startAutoSync();
  }, [syncService]);

  /**
   * Stop automatic sync
   */
  const stopAutoSync = useCallback(() => {
    if (syncService) {
      syncService.stopAutoSync();
    }
  }, [syncService]);

  /**
   * Check connection to CouchDB
   */
  const checkConnection = useCallback(async (): Promise<boolean> => {
    if (!syncService) {
      return false;
    }

    try {
      const connected = await syncService.checkConnection();
      setState((prev) => ({
        ...prev,
        isConnected: connected,
      }));
      return connected;
    } catch {
      setState((prev) => ({
        ...prev,
        isConnected: false,
      }));
      return false;
    }
  }, [syncService]);

  /**
   * Refresh remote database information
   */
  const refreshRemoteInfo = useCallback(async () => {
    if (!syncService) {
      return;
    }

    try {
      const remoteInfo = await syncService.getRemoteInfo();
      setState((prev) => ({
        ...prev,
        remoteInfo,
        isConnected: !!remoteInfo,
      }));
    } catch {
      setState((prev) => ({
        ...prev,
        remoteInfo: null,
        isConnected: false,
      }));
    }
  }, [syncService]);

  /**
   * Refresh sync status from service
   */
  const refreshStatus = useCallback(() => {
    if (!syncService) {
      return;
    }

    const syncStatus = syncService.getSyncStatus();
    setState((prev) => ({
      ...prev,
      syncStatus,
      isRunning: syncStatus.isRunning,
      lastSync: syncStatus.lastSync,
      documentsUploaded: syncStatus.documentsUploaded,
      documentsTotal: syncStatus.documentsTotal,
      progress: syncStatus.progress,
      error: syncStatus.error,
    }));
  }, [syncService]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState((prev) => ({
      ...prev,
      error: null,
    }));
  }, []);

  /**
   * Auto-initialize on mount if config is available
   */
  useEffect(() => {
    if (config && !state.isInitialized) {
      initialize();
    }
  }, [config, state.isInitialized, initialize]);

  /**
   * Setup periodic status refresh
   */
  useEffect(() => {
    if (syncService && state.isInitialized) {
      const interval = setInterval(() => {
        refreshStatus();
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [syncService, state.isInitialized, refreshStatus]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (syncService) {
        syncService.destroy();
      }
    };
  }, [syncService]);

  const contextValue: SyncContextType = {
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

  return (
    <SyncContext.Provider value={contextValue}>{children}</SyncContext.Provider>
  );
};
