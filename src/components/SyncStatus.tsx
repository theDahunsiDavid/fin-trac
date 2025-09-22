import React from "react";
import { useCouchDBSyncStatus } from "../hooks/useCouchDBSync";

interface SyncStatusProps {
  showDetails?: boolean;
  compact?: boolean;
  className?: string;
}

export const SyncStatusComponent: React.FC<SyncStatusProps> = ({
  showDetails = false,
  compact = false,
  className = "",
}) => {
  const {
    isEnabled,
    isConnected,
    isInitialized,
    isRunning,
    lastSync,
    documentsUploaded,
    documentsTotal,
    progress,
    error,
    remoteInfo,
    hasError,
    isConfigured,
    canSync,
  } = useCouchDBSyncStatus();

  // Don't render if sync is not configured
  if (!isConfigured) {
    return null;
  }

  const getStatusColor = () => {
    if (hasError) return "text-red-600 bg-red-50";
    if (!isConnected) return "text-orange-600 bg-orange-50";
    if (isRunning) return "text-blue-600 bg-blue-50";
    if (isConnected) return "text-emerald-600 bg-emerald-50";
    return "text-gray-600 bg-gray-50";
  };

  const getStatusIcon = () => {
    if (hasError) return "⚠️";
    if (isRunning) return "🔄";
    if (isConnected) return "✅";
    if (!isInitialized) return "⏳";
    return "⚫";
  };

  const getStatusText = () => {
    if (!isInitialized) return "Initializing...";
    if (hasError) return "Sync Error";
    if (isRunning) return "Syncing...";
    if (isConnected) return "Connected";
    return "Disconnected";
  };

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

  if (compact) {
    return (
      <div className={`inline-flex items-center space-x-2 ${className}`}>
        <span className="text-sm">{getStatusIcon()}</span>
        <span className={`text-xs font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
        {isRunning && progress > 0 && (
          <span className="text-xs opacity-75">{progress}%</span>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-lg border p-4 ${getStatusColor()} ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-lg">{getStatusIcon()}</span>
          <div>
            <h3 className="font-semibold text-sm">
              Sync Status: {getStatusText()}
            </h3>
            {!isEnabled && (
              <p className="text-xs mt-1 opacity-75">
                CouchDB sync not enabled
              </p>
            )}
            {error && <p className="text-xs mt-1 font-medium">{error}</p>}
            {isRunning && documentsTotal > 0 && (
              <div className="text-xs mt-1 opacity-75">
                {documentsUploaded} / {documentsTotal} documents ({progress}%)
              </div>
            )}
          </div>
        </div>

        {isEnabled && (
          <div className="text-right">
            <div className="text-xs opacity-75">
              Last sync: {formatLastSync()}
            </div>
            {remoteInfo && (
              <div className="text-xs mt-1 opacity-75">
                Remote: {remoteInfo.docCount} docs
              </div>
            )}
          </div>
        )}
      </div>

      {isRunning && progress > 0 && (
        <div className="mt-3">
          <div className="w-full bg-black/10 rounded-full h-2">
            <div
              className="bg-current h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {showDetails && isEnabled && (
        <div className="mt-4 pt-4 border-t border-current/20">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <div className="font-medium">Connection</div>
              <div className="opacity-75">
                {isConnected ? "Connected" : "Disconnected"}
              </div>
            </div>
            <div>
              <div className="font-medium">Status</div>
              <div className="opacity-75">
                {canSync ? "Ready" : "Not Ready"}
              </div>
            </div>
            {remoteInfo && (
              <>
                <div>
                  <div className="font-medium">Remote DB</div>
                  <div className="opacity-75">{remoteInfo.name}</div>
                </div>
                <div>
                  <div className="font-medium">Documents</div>
                  <div className="opacity-75">{remoteInfo.docCount}</div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Export with a more user-friendly name
export default SyncStatusComponent;
