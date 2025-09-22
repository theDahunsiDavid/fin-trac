import React, { useState, useEffect } from "react";
import { useCouchDBSync } from "../hooks/useCouchDBSync";

interface SyncControlsProps {
  className?: string;
  showAdvanced?: boolean;
}

export const SyncControls: React.FC<SyncControlsProps> = ({
  className = "",
  showAdvanced = false,
}) => {
  const {
    isEnabled,
    isConnected,
    isInitialized,
    isRunning,
    lastSync,
    documentsUploaded,
    documentsDownloaded,
    documentsTotal,
    progress,
    error,
    remoteInfo,
    config,
    syncDirection,
    sync,
    startAutoSync,
    stopAutoSync,
    checkConnection,
    refreshRemoteInfo,
    clearError,
    initialize,
  } = useCouchDBSync(true, false); // Auto-init but don't auto-start

  const [isOperating, setIsOperating] = useState(false);
  const [operationMessage, setOperationMessage] = useState<string>("");
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);

  // Debug logging for sync hook state
  useEffect(() => {
    console.log("=== SYNC CONTROLS DEBUG ===");
    console.log("isEnabled:", isEnabled);
    console.log("isConnected:", isConnected);
    console.log("isInitialized:", isInitialized);
    console.log("error:", error);
    console.log("config:", config);
    console.log("remoteInfo:", remoteInfo);
    console.log("=== END SYNC CONTROLS DEBUG ===");
  }, [isEnabled, isConnected, isInitialized, error, config, remoteInfo]);

  // Don't render if sync is not configured
  if (!config) {
    return (
      <div
        className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 ${className}`}
      >
        <h3 className="font-semibold text-yellow-800 mb-2">
          Sync Not Configured
        </h3>
        <p className="text-sm text-yellow-700">
          CouchDB sync is not configured. Please set the required environment
          variables:
        </p>
        <ul className="text-xs text-yellow-600 mt-2 list-disc list-inside">
          <li>VITE_SYNC_ENABLED=true</li>
          <li>VITE_COUCHDB_URL (e.g., http://localhost:5984)</li>
          <li>VITE_COUCHDB_DATABASE (e.g., fintrac)</li>
        </ul>
      </div>
    );
  }

  const handleOperation = async (
    operation: () => Promise<unknown>,
    message: string,
  ) => {
    setIsOperating(true);
    setOperationMessage(message);
    try {
      await operation();
      setOperationMessage("");
    } catch (error) {
      console.error(`Operation failed: ${message}`, error);
      setOperationMessage("");
    } finally {
      setIsOperating(false);
    }
  };

  const handleManualSync = () => {
    handleOperation(() => sync(), "Syncing documents...");
  };

  const handleToggleAutoSync = () => {
    if (autoSyncEnabled) {
      stopAutoSync();
      setAutoSyncEnabled(false);
    } else {
      startAutoSync();
      setAutoSyncEnabled(true);
    }
  };

  const handleCheckConnection = async () => {
    setIsOperating(true);
    setOperationMessage("Checking connection...");
    try {
      const connected = await checkConnection();
      setOperationMessage(connected ? "Connection OK" : "Connection failed");
      setTimeout(() => setOperationMessage(""), 2000);
    } catch (error) {
      console.error("Connection check failed:", error);
      setOperationMessage("Connection check failed");
      setTimeout(() => setOperationMessage(""), 2000);
    } finally {
      setIsOperating(false);
    }
  };

  const handleRefreshInfo = () => {
    handleOperation(() => refreshRemoteInfo(), "Refreshing remote info...");
  };

  const handleInitialize = () => {
    handleOperation(() => initialize(), "Initializing sync service...");
  };

  const canSync = isEnabled && isConnected && !isRunning && isInitialized;
  const hasError = !!error;

  const formatLastSync = () => {
    if (!lastSync) return "Never";

    const syncDate = new Date(lastSync);
    const now = new Date();
    const diff = now.getTime() - syncDate.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
  };

  return (
    <div className={`bg-white rounded-lg border p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Sync Controls</h3>
        {operationMessage && (
          <span className="text-sm text-blue-600">{operationMessage}</span>
        )}
        {isRunning && progress > 0 && (
          <span className="text-sm text-blue-600">{progress}%</span>
        )}
      </div>

      {!isInitialized && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center justify-between">
            <p className="text-sm text-blue-800">
              Sync service not initialized. Click to initialize connection.
            </p>
            <button
              onClick={handleInitialize}
              disabled={isOperating}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Initialize
            </button>
          </div>
        </div>
      )}

      {!isConnected && isInitialized && (
        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-md">
          <p className="text-sm text-orange-800">
            Not connected to CouchDB. Please check your database configuration.
          </p>
        </div>
      )}

      {hasError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center justify-between">
            <p className="text-sm text-red-800">{error}</p>
            <button
              onClick={() => clearError()}
              className="text-xs text-red-600 hover:text-red-800 underline"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {isRunning && documentsTotal > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-blue-800">
              {syncDirection === "upload" &&
                `Uploading ${documentsUploaded} / ${documentsTotal} documents...`}
              {syncDirection === "download" &&
                `Downloading ${documentsDownloaded} documents...`}
              {syncDirection === "both" &&
                `Syncing ${documentsUploaded + documentsDownloaded} / ${documentsTotal} documents...`}
              {syncDirection === "idle" && "Sync idle"}
            </p>
            <span className="text-xs text-blue-600 capitalize">
              {syncDirection}
            </span>
          </div>
          <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          {(documentsUploaded > 0 || documentsDownloaded > 0) && (
            <div className="mt-2 flex justify-between text-xs text-blue-700">
              <span>↑ {documentsUploaded} uploaded</span>
              <span>↓ {documentsDownloaded} downloaded</span>
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        {/* Primary Actions */}
        <div className="flex space-x-3">
          <button
            onClick={handleManualSync}
            disabled={!canSync || isOperating}
            className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isRunning
              ? syncDirection === "upload"
                ? "Uploading..."
                : syncDirection === "download"
                  ? "Downloading..."
                  : syncDirection === "both"
                    ? "Syncing..."
                    : "Syncing..."
              : config?.bidirectional
                ? "Sync Now"
                : config?.downloadOnly
                  ? "Download"
                  : "Upload"}
          </button>

          <button
            onClick={handleToggleAutoSync}
            disabled={!canSync || isOperating}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed ${
              autoSyncEnabled
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {autoSyncEnabled ? "Stop Auto" : "Auto Sync"}
          </button>
        </div>

        {/* Secondary Actions */}
        {showAdvanced && (
          <div className="pt-3 border-t border-gray-200">
            <div className="flex space-x-3">
              <button
                onClick={handleCheckConnection}
                disabled={!isInitialized || isOperating}
                className="flex-1 bg-gray-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Test Connection
              </button>

              <button
                onClick={handleRefreshInfo}
                disabled={!isConnected || isOperating}
                className="flex-1 bg-purple-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Refresh Info
              </button>
            </div>
          </div>
        )}

        {/* Status Information */}
        <div className="pt-3 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
            <div>
              <span className="font-medium">Status:</span>{" "}
              <span className={getStatusColor()}>{getStatusText()}</span>
            </div>
            <div>
              <span className="font-medium">Last Sync:</span> {formatLastSync()}
            </div>
            {remoteInfo && (
              <>
                <div>
                  <span className="font-medium">Remote DB:</span>{" "}
                  {remoteInfo.name}
                </div>
                <div>
                  <span className="font-medium">Documents:</span>{" "}
                  {remoteInfo.docCount}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Configuration Info */}
        {showAdvanced && config && (
          <div className="pt-3 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              <div className="font-medium mb-1">Configuration:</div>
              <div>URL: {config.url}</div>
              <div>Database: {config.database}</div>
              <div>Batch Size: {config.batchSize}</div>
              <div>Sync Interval: {config.syncInterval}ms</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  function getStatusText(): string {
    if (!isInitialized) return "Not Initialized";
    if (hasError) return "Error";
    if (isRunning) return "Syncing";
    if (isConnected) return "Connected";
    return "Disconnected";
  }

  function getStatusColor(): string {
    if (!isInitialized) return "text-gray-500";
    if (hasError) return "text-red-600";
    if (isRunning) return "text-blue-600";
    if (isConnected) return "text-emerald-600";
    return "text-orange-600";
  }
};

export default SyncControls;
