import { createContext } from "react";
import type { SyncResult } from "../services/sync";
import { syncConfig } from "../services/sync/SyncConfig";

export interface SyncContextType {
  // Connection status
  isEnabled: boolean;
  isConnected: boolean;
  isInitialized: boolean;

  // Sync status
  syncStatus: {
    lastSync: string | null;
    isRunning: boolean;
    error: string | null;
    documentsUploaded: number;
    documentsTotal: number;
    progress: number;
  };
  isRunning: boolean;
  lastSync: string | null;

  // Progress tracking
  documentsUploaded: number;
  documentsTotal: number;
  progress: number;

  // Error handling
  error: string | null;

  // Remote info
  remoteInfo: {
    name: string;
    docCount: number;
    updateSeq: string;
    connected: boolean;
  } | null;

  // Operations
  initialize: () => Promise<boolean>;
  sync: () => Promise<SyncResult>;
  startAutoSync: () => void;
  stopAutoSync: () => void;
  checkConnection: () => Promise<boolean>;
  refreshRemoteInfo: () => Promise<void>;
  refreshStatus: () => void;
  clearError: () => void;

  // Configuration
  config: ReturnType<typeof syncConfig.getConfig>;
}

export const SyncContext = createContext<SyncContextType | null>(null);
