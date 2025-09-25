import React, { useState, useEffect, useRef } from "react";
import { useCouchDBSync } from "../hooks/useCouchDBSync";

interface SyncButtonProps {
  onSyncClick: () => void;
}

export const SyncButton: React.FC<SyncButtonProps> = ({ onSyncClick }) => {
  // Get real-time sync status and operations
  const {
    isEnabled,
    isConnected,
    isInitialized,
    isRunning,
    error,
    lastSync,
    hasPendingRemoteChanges,
  } = useCouchDBSync(true, false);

  const [hasPendingChanges, setHasPendingChanges] = useState(false);

  // Check for pending remote changes periodically
  useEffect(() => {
    let checkInterval: NodeJS.Timeout;

    const checkPendingChanges = async () => {
      if (isConnected && isInitialized && !isRunning) {
        try {
          const pending = await hasPendingRemoteChanges();
          setHasPendingChanges(pending);
        } catch (error) {
          console.warn("Failed to check pending changes:", error);
          setHasPendingChanges(false);
        }
      } else {
        setHasPendingChanges(false);
      }
    };

    if (isConnected && isInitialized) {
      checkPendingChanges();
      checkInterval = setInterval(checkPendingChanges, 30000);
    }

    return () => {
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, [isConnected, isInitialized, isRunning, hasPendingRemoteChanges]);

  // Track the last sync timestamp to detect when a new sync completes
  const lastSyncRef = useRef<string | null>(null);

  useEffect(() => {
    if (lastSyncRef.current === null && lastSync) {
      lastSyncRef.current = lastSync;
    }
  }, [lastSync]);

  useEffect(() => {
    if (
      !isRunning &&
      lastSync &&
      lastSync !== lastSyncRef.current &&
      lastSyncRef.current !== null
    ) {
      setHasPendingChanges(false);
      lastSyncRef.current = lastSync;
    }
  }, [isRunning, lastSync]);

  // Determine sync button appearance based on real-time status
  const getSyncButtonStyle = () => {
    if (!isEnabled) {
      return "text-gray-400";
    }
    if (error) {
      return "text-red-300";
    }
    if (isRunning) {
      return "text-yellow-300";
    }
    if (isConnected && hasPendingChanges) {
      return "text-blue-400";
    }
    if (isConnected) {
      return "text-green-300";
    }
    return "text-blue-300";
  };

  // Get tooltip text based on status
  const getTooltipText = () => {
    if (!isEnabled) {
      return "Sync disabled";
    }
    if (error) {
      return `Sync error: ${error}`;
    }
    if (isRunning) {
      return "Syncing...";
    }
    if (isConnected && hasPendingChanges) {
      return "New data available - Click to sync";
    }
    if (isConnected) {
      const lastSyncText = lastSync
        ? new Date(lastSync).toLocaleTimeString()
        : "Never";
      return `In sync - Last sync: ${lastSyncText}`;
    }
    return "Ready to sync";
  };

  return (
    <button
      onClick={onSyncClick}
      className="p-2 rounded hover:bg-gray-100 transition-colors"
      title={getTooltipText()}
    >
      <svg
        className={`w-5 h-5 ${getSyncButtonStyle()}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        style={{ marginLeft: "-4px" }}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    </button>
  );
};
