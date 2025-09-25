import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCouchDBSync } from "./useCouchDBSync";
import type { SyncStatus, SyncResult } from "../services/sync/SyncService";

// Mock the SyncService constructor and instance
const mockSyncServiceInstance = {
  initialize: vi.fn(),
  sync: vi.fn(),
  startAutoSync: vi.fn(),
  stopAutoSync: vi.fn(),
  checkConnection: vi.fn(),
  getSyncStatus: vi.fn(),
  getRemoteInfo: vi.fn(),
  clearError: vi.fn(),
  hasPendingRemoteChanges: vi.fn(),
};

// Mock the SyncService class
vi.mock("../services/sync/SyncService", () => ({
  SyncService: vi.fn().mockImplementation(() => mockSyncServiceInstance),
}));

// Mock the sync config service
vi.mock("../services/sync/SyncConfig", () => ({
  syncConfig: {
    getConfig: vi.fn().mockReturnValue({
      url: "http://localhost:5984",
      database: "fintrac-test",
      username: "testuser",
      password: "testpass",
      syncInterval: 30000,
      batchSize: 50,
      retryAttempts: 3,
      retryDelay: 1000,
      timeout: 10000,
      bidirectional: true,
      downloadOnly: false,
      uploadOnly: false,
      conflictResolution: "remote-wins",
    }),
    isSyncEnabled: vi.fn().mockReturnValue(true),
    shouldAutoStart: vi.fn().mockReturnValue(false),
    validateConfig: vi.fn().mockReturnValue({ valid: true, errors: [] }),
  },
}));

describe("useCouchDBSync - Core Functionality", () => {
  const mockConfig = {
    url: "http://localhost:5984",
    database: "fintrac-test",
    username: "testuser",
    password: "testpass",
    syncInterval: 30000,
    batchSize: 50,
    retryAttempts: 3,
    retryDelay: 1000,
    timeout: 10000,
    bidirectional: true,
    downloadOnly: false,
    uploadOnly: false,
    conflictResolution: "remote-wins" as const,
  };

  const mockSyncStatus: SyncStatus = {
    lastSync: null,
    isRunning: false,
    error: null,
    documentsUploaded: 0,
    documentsDownloaded: 0,
    documentsTotal: 0,
    progress: 0,
    syncDirection: "idle",
  };

  const mockSyncResult: SyncResult = {
    success: true,
    documentsUploaded: 5,
    documentsDownloaded: 3,
    conflictsResolved: 0,
    errors: [],
    timestamp: "2024-01-15T10:30:00.000Z",
  };

  const mockRemoteInfo = {
    name: "fintrac-test",
    docCount: 100,
    updateSeq: "150-abc",
    connected: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset global singleton state by reimporting the module
    vi.resetModules();

    // Set up default successful mocks
    mockSyncServiceInstance.initialize.mockResolvedValue(true);
    mockSyncServiceInstance.sync.mockResolvedValue(mockSyncResult);
    mockSyncServiceInstance.checkConnection.mockResolvedValue(true);
    mockSyncServiceInstance.getSyncStatus.mockReturnValue(mockSyncStatus);
    mockSyncServiceInstance.getRemoteInfo.mockResolvedValue(mockRemoteInfo);
    mockSyncServiceInstance.hasPendingRemoteChanges.mockResolvedValue(false);
    mockSyncServiceInstance.startAutoSync.mockImplementation(() => {});
    mockSyncServiceInstance.stopAutoSync.mockImplementation(() => {});
    mockSyncServiceInstance.clearError.mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("Basic Initialization", () => {
    it("should initialize with default state", () => {
      const { result } = renderHook(() => useCouchDBSync(false, false));

      expect(result.current.isEnabled).toBe(false);
      expect(result.current.isConnected).toBe(false);
      expect(result.current.isInitialized).toBe(false);
      expect(result.current.isRunning).toBe(false);
      expect(result.current.lastSync).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.progress).toBe(0);
      expect(result.current.syncDirection).toBe("idle");
    });

    it("should not auto-initialize when autoInit is false", () => {
      const { result } = renderHook(() => useCouchDBSync(false, false));

      expect(result.current.isInitialized).toBe(false);
      expect(mockSyncServiceInstance.initialize).not.toHaveBeenCalled();
    });

    it("should expose sync configuration", () => {
      const { result } = renderHook(() => useCouchDBSync(false, false));

      expect(result.current.config).toEqual(mockConfig);
    });
  });

  describe("Manual Operations", () => {
    it("should allow manual initialization", async () => {
      const { result } = renderHook(() => useCouchDBSync(false, false));

      expect(result.current.isInitialized).toBe(false);

      let success = false;
      await act(async () => {
        success = await result.current.initialize();
      });

      expect(success).toBe(true);
      expect(result.current.isInitialized).toBe(true);
      expect(mockSyncServiceInstance.initialize).toHaveBeenCalled();
    });

    it("should perform manual sync after initialization", async () => {
      const { result } = renderHook(() => useCouchDBSync(false, false));

      // Initialize first
      await act(async () => {
        await result.current.initialize();
      });

      let syncResult: SyncResult | null = null;
      await act(async () => {
        syncResult = await result.current.sync();
      });

      expect(syncResult).toEqual(mockSyncResult);
      expect(mockSyncServiceInstance.sync).toHaveBeenCalled();
      expect(result.current.lastSync).toBe(mockSyncResult.timestamp);
    });

    it("should check connection after initialization", async () => {
      const { result } = renderHook(() => useCouchDBSync(false, false));

      // Initialize first
      await act(async () => {
        await result.current.initialize();
      });

      let connected = false;
      await act(async () => {
        connected = await result.current.checkConnection();
      });

      expect(connected).toBe(true);
      expect(result.current.isConnected).toBe(true);
      expect(mockSyncServiceInstance.checkConnection).toHaveBeenCalled();
    });

    it("should refresh remote info after initialization", async () => {
      const { result } = renderHook(() => useCouchDBSync(false, false));

      // Initialize first
      await act(async () => {
        await result.current.initialize();
      });

      await act(async () => {
        await result.current.refreshRemoteInfo();
      });

      expect(result.current.remoteInfo).toEqual(mockRemoteInfo);
      expect(result.current.isConnected).toBe(true);
      expect(mockSyncServiceInstance.getRemoteInfo).toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("should handle initialization failure", async () => {
      // Clear all mocks and reset modules to ensure clean state
      vi.clearAllMocks();
      vi.resetModules();

      // Set up the failure mock before importing
      mockSyncServiceInstance.initialize.mockResolvedValue(false);
      mockSyncServiceInstance.sync.mockResolvedValue(mockSyncResult);
      mockSyncServiceInstance.checkConnection.mockResolvedValue(true);
      mockSyncServiceInstance.getSyncStatus.mockReturnValue(mockSyncStatus);
      mockSyncServiceInstance.getRemoteInfo.mockResolvedValue(mockRemoteInfo);
      mockSyncServiceInstance.hasPendingRemoteChanges.mockResolvedValue(false);
      mockSyncServiceInstance.startAutoSync.mockImplementation(() => {});
      mockSyncServiceInstance.stopAutoSync.mockImplementation(() => {});
      mockSyncServiceInstance.clearError.mockImplementation(() => {});

      // Import fresh hook with failure mock in place
      const { useCouchDBSync: freshHook } = await import("./useCouchDBSync");
      const { result } = renderHook(() => freshHook(false, false));

      let success = true;
      await act(async () => {
        success = await result.current.initialize();
      });

      // The hook returns false on failure but may still set isEnabled/isInitialized
      // based on whether it considers the error a connection issue or config issue
      expect(success).toBe(false);
      expect(result.current.error).toBeTruthy();
    });

    it("should handle sync failure", async () => {
      const errorMessage = "Sync failed";
      mockSyncServiceInstance.sync.mockRejectedValueOnce(
        new Error(errorMessage),
      );

      const { result } = renderHook(() => useCouchDBSync(false, false));

      // Initialize first
      await act(async () => {
        await result.current.initialize();
      });

      await act(async () => {
        try {
          await result.current.sync();
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toBe(errorMessage);
        }
      });

      expect(result.current.error).toBe(errorMessage);
    });

    it("should handle connection check failure", async () => {
      const { result } = renderHook(() => useCouchDBSync(false, false));

      // Initialize first
      await act(async () => {
        await result.current.initialize();
      });

      // Now mock the connection failure for subsequent calls
      mockSyncServiceInstance.checkConnection.mockResolvedValue(false);

      let connected = true;
      await act(async () => {
        connected = await result.current.checkConnection();
      });

      expect(connected).toBe(false);
      expect(result.current.isConnected).toBe(false);
    });

    it("should prevent sync when not initialized", async () => {
      // Clear mocks to ensure no global service exists
      vi.clearAllMocks();
      vi.resetModules();

      const { useCouchDBSync: freshHook } = await import("./useCouchDBSync");
      const { result } = renderHook(() => freshHook(false, false));

      await act(async () => {
        try {
          await result.current.sync();
          expect(true).toBe(false); // Should not reach here
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toBe("Sync service not initialized");
        }
      });
    });

    it("should clear error state", async () => {
      const { result } = renderHook(() => useCouchDBSync(false, false));

      // Initialize first
      await act(async () => {
        await result.current.initialize();
      });

      // Set an error first
      await act(async () => {
        try {
          mockSyncServiceInstance.sync.mockRejectedValueOnce(
            new Error("Test error"),
          );
          await result.current.sync();
        } catch {
          // Expected error
        }
      });

      expect(result.current.error).toBe("Test error");

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
      expect(mockSyncServiceInstance.clearError).toHaveBeenCalled();
    });
  });

  describe("Auto-Sync Management", () => {
    it("should allow manual auto-sync start after initialization", async () => {
      const { result } = renderHook(() => useCouchDBSync(false, false));

      // Initialize first
      await act(async () => {
        await result.current.initialize();
      });

      act(() => {
        result.current.startAutoSync();
      });

      expect(mockSyncServiceInstance.startAutoSync).toHaveBeenCalled();
    });

    it("should allow manual auto-sync stop after initialization", async () => {
      const { result } = renderHook(() => useCouchDBSync(false, false));

      // Initialize first
      await act(async () => {
        await result.current.initialize();
      });

      act(() => {
        result.current.stopAutoSync();
      });

      expect(mockSyncServiceInstance.stopAutoSync).toHaveBeenCalled();
    });
  });

  describe("Status Management", () => {
    it("should refresh sync status after initialization", async () => {
      const updatedStatus = {
        ...mockSyncStatus,
        isRunning: true,
        progress: 50,
      };
      mockSyncServiceInstance.getSyncStatus.mockReturnValueOnce(updatedStatus);

      const { result } = renderHook(() => useCouchDBSync(false, false));

      // Initialize first
      await act(async () => {
        await result.current.initialize();
      });

      act(() => {
        result.current.refreshStatus();
      });

      expect(result.current.isRunning).toBe(true);
      expect(result.current.progress).toBe(50);
      expect(mockSyncServiceInstance.getSyncStatus).toHaveBeenCalled();
    });
  });

  describe("Service Lifecycle", () => {
    it("should handle sync with result containing errors", async () => {
      const errorResult = {
        ...mockSyncResult,
        success: false,
        errors: ["Sync error occurred"],
      };
      mockSyncServiceInstance.sync.mockResolvedValueOnce(errorResult);

      const { result } = renderHook(() => useCouchDBSync(false, false));

      // Initialize first
      await act(async () => {
        await result.current.initialize();
      });

      let syncResult: SyncResult | null = null;
      await act(async () => {
        syncResult = await result.current.sync();
      });

      expect(syncResult).toEqual(errorResult);
      expect(result.current.error).toBe("Sync error occurred");
    });

    it("should handle remote info refresh failure", async () => {
      const { result } = renderHook(() => useCouchDBSync(false, false));

      // Initialize first
      await act(async () => {
        await result.current.initialize();
      });

      // Now mock the failure for subsequent calls
      mockSyncServiceInstance.getRemoteInfo.mockRejectedValue(
        new Error("Remote info failed"),
      );

      await act(async () => {
        await result.current.refreshRemoteInfo();
      });

      expect(result.current.remoteInfo).toBeNull();
      expect(result.current.isConnected).toBe(false);
    });

    it("should handle connection check error", async () => {
      const { result } = renderHook(() => useCouchDBSync(false, false));

      // Initialize first
      await act(async () => {
        await result.current.initialize();
      });

      // Now mock the error for subsequent calls
      mockSyncServiceInstance.checkConnection.mockRejectedValue(
        new Error("Connection failed"),
      );

      let connected = true;
      await act(async () => {
        connected = await result.current.checkConnection();
      });

      expect(connected).toBe(false);
      expect(result.current.isConnected).toBe(false);
    });
  });
});
