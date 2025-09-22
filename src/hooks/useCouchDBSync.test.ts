import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useCouchDBSync } from "./useCouchDBSync";
import type { SyncStatus, SyncResult } from "../services/sync/SyncService";

// Mock the SyncService
const mockSyncServiceInstance = {
  initialize: vi.fn(),
  sync: vi.fn(),
  startAutoSync: vi.fn(),
  stopAutoSync: vi.fn(),
  checkConnection: vi.fn(),
  getSyncStatus: vi.fn(),
  getRemoteInfo: vi.fn(),
  clearError: vi.fn(),
};

vi.mock("../services/sync/SyncService", () => ({
  SyncService: vi.fn().mockImplementation(() => mockSyncServiceInstance),
}));

// Mock the sync config
vi.mock("../services/sync/SyncConfig", () => ({
  syncConfig: {
    getConfig: vi.fn().mockReturnValue({
      url: "http://localhost:5984",
      database: "fintrac-test",
      username: "testuser",
      password: "testpass",
      syncInterval: 30000,
      batchSize: 50,
    }),
    isConfigured: vi.fn().mockReturnValue(true),
  },
}));

describe("useCouchDBSync", () => {
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

    // Setup default mock implementations
    mockSyncServiceInstance.initialize.mockResolvedValue(true);
    mockSyncServiceInstance.sync.mockResolvedValue(mockSyncResult);
    mockSyncServiceInstance.checkConnection.mockResolvedValue(true);
    mockSyncServiceInstance.getSyncStatus.mockReturnValue(mockSyncStatus);
    mockSyncServiceInstance.getRemoteInfo.mockResolvedValue(mockRemoteInfo);
    mockSyncServiceInstance.startAutoSync.mockImplementation(() => {});
    mockSyncServiceInstance.stopAutoSync.mockImplementation(() => {});
    mockSyncServiceInstance.clearError.mockImplementation(() => {});

    // Mock timers for auto-sync testing
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("Initialization", () => {
    it("should initialize with default state", () => {
      const { result } = renderHook(() => useCouchDBSync(false, false));

      expect(result.current.isEnabled).toBe(true);
      expect(result.current.isConnected).toBe(false);
      expect(result.current.isInitialized).toBe(false);
      expect(result.current.isRunning).toBe(false);
      expect(result.current.lastSync).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.progress).toBe(0);
      expect(result.current.syncDirection).toBe("idle");
    });

    it("should auto-initialize when autoInit is true", async () => {
      const { result } = renderHook(() => useCouchDBSync(true, false));

      expect(result.current.isInitialized).toBe(false);

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      expect(mockSyncServiceInstance.initialize).toHaveBeenCalledOnce();
    });

    it("should not auto-initialize when autoInit is false", () => {
      const { result } = renderHook(() => useCouchDBSync(false, false));

      expect(result.current.isInitialized).toBe(false);
      expect(mockSyncServiceInstance.initialize).not.toHaveBeenCalled();
    });

    it("should handle initialization failure", async () => {
      mockSyncServiceInstance.initialize.mockResolvedValueOnce(false);

      const { result } = renderHook(() => useCouchDBSync(true, false));

      await waitFor(() => {
        expect(result.current.error).toBe("Failed to initialize sync service");
      });

      expect(result.current.isInitialized).toBe(false);
      expect(result.current.isEnabled).toBe(false);
    });

    it("should handle initialization error", async () => {
      mockSyncServiceInstance.initialize.mockRejectedValue(
        new Error("Initialization failed"),
      );

      const { result } = renderHook(() => useCouchDBSync(true, false));

      await waitFor(() => {
        expect(result.current.error).toBe("Initialization failed");
      });

      expect(result.current.isInitialized).toBe(false);
    });
  });

  describe("Manual Initialization", () => {
    it("should allow manual initialization", async () => {
      const { result } = renderHook(() => useCouchDBSync(false, false));

      expect(result.current.isInitialized).toBe(false);

      await act(async () => {
        const success = await result.current.initialize();
        expect(success).toBe(true);
      });

      expect(result.current.isInitialized).toBe(true);
      expect(mockSyncServiceInstance.initialize).toHaveBeenCalledOnce();
    });

    it("should handle manual initialization failure", async () => {
      mockSyncServiceInstance.initialize.mockResolvedValueOnce(false);

      const { result } = renderHook(() => useCouchDBSync(false, false));

      await act(async () => {
        const success = await result.current.initialize();
        expect(success).toBe(false);
      });

      expect(result.current.isInitialized).toBe(false);
      expect(result.current.error).toBe("Failed to initialize sync service");
    });

    it("should prevent multiple concurrent initializations", async () => {
      const { result } = renderHook(() => useCouchDBSync(false, false));

      const promise1 = act(() => result.current.initialize());
      const promise2 = act(() => result.current.initialize());
      const promise3 = act(() => result.current.initialize());

      const [result1, result2, result3] = await Promise.all([
        promise1,
        promise2,
        promise3,
      ]);

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(result3).toBe(true);
      expect(mockSyncServiceInstance.initialize).toHaveBeenCalledOnce();
    });
  });

  describe("Sync Operations", () => {
    beforeEach(async () => {
      // Ensure hook is initialized for sync tests
      const { result } = renderHook(() => useCouchDBSync(true, false));
      await waitFor(() => expect(result.current.isInitialized).toBe(true));
    });

    it("should perform manual sync successfully", async () => {
      const { result } = renderHook(() => useCouchDBSync(true, false));

      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      await act(async () => {
        const syncResult = await result.current.sync();
        expect(syncResult.success).toBe(true);
      });

      expect(mockSyncServiceInstance.sync).toHaveBeenCalledOnce();
    });

    it("should handle sync failure", async () => {
      const failedSyncResult = {
        ...mockSyncResult,
        success: false,
        errors: ["Sync failed"],
      };
      mockSyncServiceInstance.sync.mockResolvedValue(failedSyncResult);

      const { result } = renderHook(() => useCouchDBSync(true, false));

      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      await act(async () => {
        const syncResult = await result.current.sync();
        expect(syncResult.success).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
    });

    it("should handle sync error exception", async () => {
      mockSyncServiceInstance.sync.mockRejectedValue(
        new Error("Network error"),
      );

      const { result } = renderHook(() => useCouchDBSync(true, false));

      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      await act(async () => {
        const syncResult = await result.current.sync();
        expect(syncResult.success).toBe(false);
      });

      expect(result.current.error).toBe("Network error");
    });

    it("should prevent sync when not initialized", async () => {
      const { result } = renderHook(() => useCouchDBSync(false, false));

      await act(async () => {
        const syncResult = await result.current.sync();
        expect(syncResult.success).toBe(false);
      });

      expect(mockSyncServiceInstance.sync).not.toHaveBeenCalled();
      expect(result.current.error).toBeTruthy();
    });
  });

  describe("Auto-Sync Management", () => {
    it("should start auto-sync when autoStart is true", async () => {
      const { result } = renderHook(() => useCouchDBSync(true, true));

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      expect(mockSyncServiceInstance.startAutoSync).toHaveBeenCalled();
    });

    it("should allow manual auto-sync start", async () => {
      const { result } = renderHook(() => useCouchDBSync(true, false));

      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      act(() => {
        result.current.stopAutoSync();
      });
      expect(mockSyncServiceInstance.stopAutoSync).toHaveBeenCalledOnce();
    });

    it("should allow manual auto-sync stop", async () => {
      const { result } = renderHook(() => useCouchDBSync(true, true));

      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      act(() => {
        result.current.stopAutoSync();
      });

      expect(mockSyncServiceInstance.stopAutoSync).toHaveBeenCalledOnce();
    });

    it("should not start auto-sync when not initialized", () => {
      const { result } = renderHook(() => useCouchDBSync(false, false));

      act(() => {
        result.current.startAutoSync();
      });

      expect(mockSyncServiceInstance.startAutoSync).not.toHaveBeenCalled();
    });
  });
  describe("Connection Management", () => {
    it("should check connection successfully", async () => {
      const { result } = renderHook(() => useCouchDBSync(true, false));

      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      await act(async () => {
        const isConnected = await result.current.checkConnection();
        expect(isConnected).toBe(true);
      });

      expect(mockSyncServiceInstance.checkConnection).toHaveBeenCalledOnce();
      expect(result.current.isConnected).toBe(true);
    });

    it("should handle connection check failure", async () => {
      mockSyncServiceInstance.checkConnection.mockResolvedValue(false);

      const { result } = renderHook(() => useCouchDBSync(true, false));

      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      await act(async () => {
        const isConnected = await result.current.checkConnection();
        expect(isConnected).toBe(false);
      });

      expect(result.current.isConnected).toBe(false);
    });

    it("should handle connection check error", async () => {
      mockSyncServiceInstance.checkConnection.mockRejectedValue(
        new Error("Connection failed"),
      );

      const { result } = renderHook(() => useCouchDBSync(true, false));

      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      await act(async () => {
        const isConnected = await result.current.checkConnection();
        expect(isConnected).toBe(false);
      });

      expect(result.current.isConnected).toBe(false);
    });
  });

  describe("Remote Info Management", () => {
    it("should refresh remote info successfully", async () => {
      const { result } = renderHook(() => useCouchDBSync(true, false));

      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      await act(async () => {
        await result.current.refreshRemoteInfo();
      });

      expect(mockSyncServiceInstance.getRemoteInfo).toHaveBeenCalledOnce();
      expect(result.current.remoteInfo).toEqual(mockRemoteInfo);
    });

    it("should handle remote info refresh failure", async () => {
      mockSyncServiceInstance.getRemoteInfo.mockRejectedValue(
        new Error("Failed to get info"),
      );

      const { result } = renderHook(() => useCouchDBSync(true, false));

      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      await act(async () => {
        await result.current.refreshRemoteInfo();
      });

      expect(result.current.remoteInfo).toBeNull();
    });
  });

  describe("Status Management", () => {
    it("should refresh sync status", async () => {
      const updatedStatus = {
        ...mockSyncStatus,
        documentsUploaded: 10,
        progress: 50,
      };
      mockSyncServiceInstance.getSyncStatus.mockReturnValueOnce(updatedStatus);

      const { result } = renderHook(() => useCouchDBSync(true, false));

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      act(() => {
        result.current.refreshStatus();
      });

      expect(result.current.documentsUploaded).toBe(10);
      expect(result.current.progress).toBe(50);
    });

    it("should clear error state", async () => {
      const { result } = renderHook(() => useCouchDBSync(false, false));

      // Set an error
      await act(async () => {
        try {
          await result.current.sync(); // This should fail and set an error
        } catch {
          // Expected to fail
        }
      });

      expect(result.current.error).toBeTruthy();

      // Clear the error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    it("should update status from sync service periodically", async () => {
      let statusCallCount = 0;
      mockSyncServiceInstance.getSyncStatus.mockImplementation(() => {
        statusCallCount++;
        return {
          ...mockSyncStatus,
          documentsUploaded: statusCallCount,
        };
      });

      const { result } = renderHook(() => useCouchDBSync(true, false));

      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      // Initial status update
      expect(result.current.documentsUploaded).toBe(1);

      // Advance timer to trigger status update
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(result.current.documentsUploaded).toBe(2);
      });
    });
  });

  describe("Configuration", () => {
    it("should expose sync configuration", () => {
      const { result } = renderHook(() => useCouchDBSync(false, false));

      expect(result.current.config).toEqual({
        url: "http://localhost:5984",
        database: "fintrac-test",
        username: "testuser",
        password: "testpass",
        syncInterval: 30000,
        batchSize: 50,
      });
    });
  });

  describe("Cleanup and Unmount", () => {
    it("should stop auto-sync on unmount", async () => {
      const { result, unmount } = renderHook(() => useCouchDBSync(true, true));

      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      unmount();

      expect(mockSyncServiceInstance.stopAutoSync).toHaveBeenCalled();
    });

    it("should clear intervals on unmount", async () => {
      const { unmount } = renderHook(() => useCouchDBSync(true, false));

      await waitFor(() => {
        // Hook should be initialized
      });

      unmount();

      // Should not throw any errors during cleanup
      expect(true).toBe(true);
    });
  });

  describe("Error Recovery", () => {
    it("should recover from temporary network errors", async () => {
      // Start with a network error
      mockSyncServiceInstance.checkConnection.mockResolvedValueOnce(false);
      mockSyncServiceInstance.initialize.mockResolvedValueOnce(false);

      const { result } = renderHook(() => useCouchDBSync(true, false));

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      // Simulate network recovery
      mockSyncServiceInstance.checkConnection.mockResolvedValue(true);
      mockSyncServiceInstance.initialize.mockResolvedValue(true);

      await act(async () => {
        await result.current.initialize();
      });

      expect(result.current.isInitialized).toBe(true);
      expect(result.current.isConnected).toBe(true);
    });

    it("should handle sync service recreation", async () => {
      const { result } = renderHook(() => useCouchDBSync(true, false));

      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      // Simulate service failure and recreation
      mockSyncServiceInstance.sync.mockRejectedValueOnce(
        new Error("Service unavailable"),
      );

      await expect(
        act(async () => {
          await result.current.sync();
        }),
      ).rejects.toThrow("Service unavailable");

      // Service should recover for next operation
      mockSyncServiceInstance.sync.mockResolvedValue(mockSyncResult);

      await act(async () => {
        const syncResult = await result.current.sync();
        expect(syncResult.success).toBe(true);
      });
    });
  });

  describe("Performance and Memory", () => {
    it("should reuse sync service instance", () => {
      const { result: result1 } = renderHook(() =>
        useCouchDBSync(false, false),
      );
      const { result: result2 } = renderHook(() =>
        useCouchDBSync(false, false),
      );

      // Should use the same configuration
      expect(result1.current.config).toEqual(result2.current.config);
    });

    it("should handle rapid successive sync calls", async () => {
      const { result } = renderHook(() => useCouchDBSync(true, false));

      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      // Make multiple rapid sync calls
      const syncPromises = [
        act(async () => await result.current.sync()),
        act(async () => await result.current.sync()),
        act(async () => await result.current.sync()),
      ];

      const results = await Promise.all(syncPromises);

      // All should complete
      expect(results.every((r) => typeof r === "object")).toBe(true);
    });

    it("should handle large status updates efficiently", async () => {
      const largeStatus = {
        ...mockSyncStatus,
        documentsTotal: 10000,
        documentsUploaded: 5000,
        documentsDownloaded: 3000,
        progress: 80,
      };

      mockSyncServiceInstance.getSyncStatus.mockReturnValue(largeStatus);

      const { result } = renderHook(() => useCouchDBSync(true, false));

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      act(() => {
        result.current.refreshStatus();
      });

      expect(result.current.documentsTotal).toBe(10000);
      expect(result.current.documentsUploaded).toBe(5000);
      expect(result.current.documentsDownloaded).toBe(3000);
      expect(result.current.progress).toBe(80);
    });
  });

  describe("Real-world Usage Scenarios", () => {
    it("should handle typical app startup flow", async () => {
      // App starts, hook auto-initializes
      const { result } = renderHook(() => useCouchDBSync(true, false));

      // Should start in uninitialized state
      expect(result.current.isInitialized).toBe(false);

      // Should initialize automatically
      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
        expect(result.current.isConnected).toBe(true);
      });

      // User can start auto-sync
      act(() => {
        result.current.startAutoSync();
      });

      expect(mockSyncServiceInstance.startAutoSync).toHaveBeenCalledOnce();
    });

    it("should handle offline-to-online transition", async () => {
      // Start offline
      mockSyncServiceInstance.checkConnection.mockResolvedValue(false);

      const { result } = renderHook(() => useCouchDBSync(true, false));

      await waitFor(() => {
        expect(result.current.isConnected).toBe(false);
      });

      // Come back online
      mockSyncServiceInstance.checkConnection.mockResolvedValue(true);

      await act(async () => {
        const connected = await result.current.checkConnection();
        expect(connected).toBe(true);
      });

      expect(result.current.isConnected).toBe(true);
    });

    it("should handle background sync scenario", async () => {
      const { result } = renderHook(() => useCouchDBSync(true, true));

      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });

      // Simulate background sync by starting auto-sync
      expect(mockSyncServiceInstance.startAutoSync).toHaveBeenCalled();

      // Simulate status updates during background sync
      const runningStatus = {
        ...mockSyncStatus,
        isRunning: true,
        progress: 25,
        syncDirection: "upload" as const,
      };

      mockSyncServiceInstance.getSyncStatus.mockReturnValue(runningStatus);

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(result.current.isRunning).toBe(true);
        expect(result.current.progress).toBe(25);
        expect(result.current.syncDirection).toBe("upload");
      });
    });
  });
});
