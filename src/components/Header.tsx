import React, { useState, useEffect, useRef } from "react";
import { useCouchDBSync } from "../hooks/useCouchDBSync";

interface HeaderProps {
  onInflowClick: () => void;
  onSpendClick: () => void;
  onSyncClick: () => void;
}

/**
 * Header component for FinTrac application.
 *
 * Provides the main navigation header with app logo and quick action buttons
 * for common transaction types. Designed to be reused across all pages.
 *
 * Features:
 * - Left-aligned app logo
 * - Quick action buttons for Inflow and Spend transactions
 * - Responsive layout using flexbox
 *
 * Assumptions:
 * - Tailwind CSS classes are available for styling
 * - Parent component provides click handlers for modal opening
 *
 * Edge cases:
 * - Responsive design handles various screen sizes
 * - Buttons are styled for hover states
 *
 * Connections:
 * - Triggers modal opening via props from parent component
 * - Inflow button opens transaction modal with credit type
 * - Spend button opens transaction modal with debit type
 */
export const Header: React.FC<HeaderProps> = ({
  onInflowClick,
  onSpendClick,
  onSyncClick,
}) => {
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
          console.warn("Failed to check pending changes in header:", error);
          setHasPendingChanges(false);
        }
      } else {
        setHasPendingChanges(false);
      }
    };

    if (isConnected && isInitialized) {
      // Check immediately
      checkPendingChanges();

      // Then check every 30 seconds
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

  // Initialize lastSyncRef on first render to avoid false positive
  useEffect(() => {
    if (lastSyncRef.current === null && lastSync) {
      lastSyncRef.current = lastSync;
    }
  }, [lastSync]);

  // Reset pending changes state only after a NEW sync completes
  useEffect(() => {
    // If sync just finished and lastSync changed, reset pending changes
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
      return "text-gray-400"; // Sync disabled
    }
    if (error) {
      return "text-red-300"; // Connection error
    }
    if (isRunning) {
      return "text-yellow-300"; // Currently syncing
    }
    if (isConnected && hasPendingChanges) {
      return "text-blue-400"; // Connected but has pending changes
    }
    if (isConnected) {
      return "text-green-300"; // Connected and in sync
    }
    return "text-blue-300"; // Enabled but not connected
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
    <header className="flex items-center justify-between mb-8">
      <h1 className="text-xl font-medium text-gray-620">FinTrac</h1>

      <div className="flex items-center gap-3">
        {/* Sync Button */}
        <button
          onClick={onSyncClick}
          className={`p-2 rounded hover:bg-gray-100 transition-colors`}
          title={getTooltipText()}
        >
          <svg
            className={`w-5 h-5 ${getSyncButtonStyle()}`}
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M5.5 17a4.5 4.5 0 01-1.44-8.765 4.5 4.5 0 018.302-3.046 3.5 3.5 0 014.504 4.272A4 4 0 0115 17H5.5zm3.75-2.75a.75.75 0 001.5 0V9.66l1.95 2.1a.75.75 0 101.1-1.02l-3.25-3.5a.75.75 0 00-1.1 0l-3.25 3.5a.75.75 0 101.1 1.02l1.95-2.1v4.59z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {/* Transaction Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onInflowClick}
            className="px-4 py-2 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700 transition-colors"
          >
            Inflow
          </button>
          <button
            onClick={onSpendClick}
            className="px-4 py-2 bg-emerald-50 text-gray-800 text-sm border border-gray-300 rounded hover:bg-emerald-100 transition-colors"
          >
            Spend
          </button>
        </div>
      </div>
    </header>
  );
};
