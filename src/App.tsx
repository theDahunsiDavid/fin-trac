import { useState, useEffect } from "react";
import { TransactionModal } from "./features/transactions";
import { DashboardChart } from "./features/dashboard";
import { Header, SummaryCard } from "./components";

import SyncControls from "./components/SyncControls";
import { useTransactions } from "./features/transactions/hooks/useTransactions";
import type { Transaction } from "./features/transactions/types";
import { syncConfig } from "./services/sync/SyncConfig";

/**
 * Debug Controls Component
 *
 * Wrapper component that groups all debug-related buttons and functionality.
 * Only visible in development mode to keep production builds clean.
 */
function DebugControls() {
  const [showDebug, setShowDebug] = useState(false);
  const [networkTest, setNetworkTest] = useState<string>("");

  // Get debug info function
  const getDebugInfo = () => {
    const config = syncConfig.getConfig();
    const validation = config
      ? syncConfig.validateConfig()
      : { valid: false, errors: ["No config"] };

    return {
      env: {
        VITE_SYNC_ENABLED: import.meta.env.VITE_SYNC_ENABLED,
        VITE_COUCHDB_URL: import.meta.env.VITE_COUCHDB_URL,
        VITE_COUCHDB_DATABASE: import.meta.env.VITE_COUCHDB_DATABASE,
        VITE_COUCHDB_USERNAME: import.meta.env.VITE_COUCHDB_USERNAME,
        VITE_USE_POUCHDB: import.meta.env.VITE_USE_POUCHDB,
      },
      config,
      syncEnabled: syncConfig.isSyncEnabled(),
      validation,
    };
  };

  // Test network connectivity
  const testNetwork = async () => {
    setNetworkTest("Testing...");
    try {
      // Test basic CouchDB connection
      const basicResponse = await fetch("http://10.196.88.186:5984", {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!basicResponse.ok) {
        setNetworkTest(`❌ Basic CouchDB failed: ${basicResponse.status}`);
        return;
      }

      // Test database access with authentication
      const credentials = btoa("admin:password");
      const dbResponse = await fetch("http://10.196.88.186:5984/fintrac-test", {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Basic ${credentials}`,
        },
      });

      if (dbResponse.ok) {
        const dbData = await dbResponse.json();
        setNetworkTest(
          `✅ Database accessible: ${dbData.db_name} (${dbData.doc_count} docs)`,
        );
      } else {
        const errorData = await dbResponse.text();
        setNetworkTest(
          `❌ Database auth failed (${dbResponse.status}): ${errorData}`,
        );
      }
    } catch (error) {
      setNetworkTest(
        `❌ Network error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  // Test sync service connection
  const testSyncService = async () => {
    setNetworkTest("Testing sync service...");
    try {
      const config = syncConfig.getConfig();
      if (!config) {
        setNetworkTest("❌ No sync config available");
        return;
      }

      // Import and test CouchDBClient directly
      const { CouchDBClient } = await import("./services/sync/CouchDBClient");
      const client = new CouchDBClient(config);

      const validation = await client.validateConnection();

      if (validation.connected) {
        setNetworkTest(`✅ Sync service connection works!`);
      } else {
        setNetworkTest(`❌ Sync service failed: ${validation.error}`);
      }
    } catch (error) {
      setNetworkTest(
        `❌ Sync service error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  // Test actual sync hook initialization
  const testSyncInit = async () => {
    setNetworkTest("Testing sync initialization...");
    try {
      // Import SyncService directly
      const { SyncService } = await import("./services/sync/SyncService");
      const config = syncConfig.getConfig();

      if (!config) {
        setNetworkTest("❌ No sync config for initialization");
        return;
      }

      setNetworkTest("Creating SyncService...");
      const syncService = new SyncService(config);

      setNetworkTest("Initializing SyncService...");
      const initResult = await syncService.initialize();

      if (!initResult) {
        setNetworkTest("❌ SyncService initialization failed");
        return;
      }

      setNetworkTest("Checking connection...");
      const connected = await syncService.checkConnection();

      if (connected) {
        setNetworkTest("Getting remote info...");
        const remoteInfo = await syncService.getRemoteInfo();
        setNetworkTest(
          `✅ Full sync init works! DB: ${remoteInfo?.name}, Docs: ${remoteInfo?.docCount}`,
        );
      } else {
        setNetworkTest("❌ SyncService connection check failed");
      }
    } catch (error) {
      setNetworkTest(
        `❌ Sync init error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  // Test sync hook state (what SyncControls actually uses)
  const testSyncHookState = async () => {
    setNetworkTest("Testing sync hook state...");
    try {
      // Import the hook
      await import("./hooks/useCouchDBSync");

      // We can't call hooks here, but we can check the global state
      setNetworkTest(
        "Check SyncControls component state - this tests the actual hook instance",
      );
    } catch (error) {
      setNetworkTest(
        `❌ Hook state error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  return (
    <div className="mt-8 pt-4 border-t border-gray-300">
      <div className="bg-gray-100 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-3 text-gray-700">
          Developer Tools
        </h3>

        <div className="space-y-2">
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="text-sm bg-blue-500 text-white px-3 py-1 rounded mr-2"
          >
            {showDebug ? "Hide" : "Show"} Debug Info
          </button>

          <button
            onClick={testNetwork}
            className="text-sm bg-green-500 text-white px-3 py-1 rounded mr-2"
          >
            Test Network
          </button>

          <button
            onClick={testSyncService}
            className="text-sm bg-purple-500 text-white px-3 py-1 rounded mr-2"
          >
            Test Sync Service
          </button>

          <button
            onClick={testSyncInit}
            className="text-sm bg-red-500 text-white px-3 py-1 rounded mr-2"
          >
            Test Sync Init
          </button>

          <button
            onClick={testSyncHookState}
            className="text-sm bg-orange-500 text-white px-3 py-1 rounded"
          >
            Check Hook State
          </button>
        </div>

        {networkTest && (
          <div className="mt-3 p-2 bg-yellow-100 rounded text-xs">
            <strong>Network Test:</strong> {networkTest}
          </div>
        )}

        {showDebug && (
          <div className="mt-3 p-3 bg-white rounded text-xs border">
            <pre className="whitespace-pre-wrap overflow-auto">
              {JSON.stringify(getDebugInfo(), null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Main application component for FinTrac.
 *
 * This component serves as the root of the React app, orchestrating the main UI sections for dashboard visualization and modal-based transaction entry. It manages modal state, integrates feature modules, and serves as the single source of truth for transaction data across all components.
 *
 * Assumptions:
 * - Feature components (TransactionModal, DashboardChart) are properly exported.
 * - Tailwind CSS classes are available for styling.
 * - useTransactions hook provides transactions data and addTransaction function.
 *
 * Edge cases:
 * - Renders empty sections if components fail to load.
 * - Layout is responsive but assumes standard screen sizes.
 * - Modal state is managed locally for transaction entry.
 * - Shows loading state while transactions are being fetched.
 *
 * Connections:
 * - Manages TransactionModal state and passes handlers to Header.
 * - Imports and renders DashboardChart with transaction data.
 * - Uses useTransactions hook to maintain single source of truth for data.
 * - Mounted by main.tsx as the app's entry point.
 */
function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<"credit" | "debit">(
    "debit",
  );

  // Debug logging for environment variables and sync config
  useEffect(() => {
    console.log("=== FINTRAC DEBUG INFO ===");
    console.log("Environment variables:", {
      VITE_SYNC_ENABLED: import.meta.env.VITE_SYNC_ENABLED,
      VITE_COUCHDB_URL: import.meta.env.VITE_COUCHDB_URL,
      VITE_COUCHDB_DATABASE: import.meta.env.VITE_COUCHDB_DATABASE,
      VITE_COUCHDB_USERNAME: import.meta.env.VITE_COUCHDB_USERNAME,
      VITE_COUCHDB_PASSWORD: import.meta.env.VITE_COUCHDB_PASSWORD
        ? "***"
        : undefined,
      VITE_USE_POUCHDB: import.meta.env.VITE_USE_POUCHDB,
    });

    const config = syncConfig.getConfig();
    console.log("Sync config:", config);
    console.log("Sync enabled:", syncConfig.isSyncEnabled());

    if (config) {
      const validation = syncConfig.validateConfig();
      console.log("Config validation:", validation);
    }
    console.log("=== END DEBUG INFO ===");
  }, []);

  // Single source of truth for transaction data
  const {
    transactions,
    loading,
    addTransaction: addTransactionHook,
  } = useTransactions();

  // Calculate dashboard data directly from transactions
  const balance = transactions.reduce((total, transaction) => {
    return transaction.type === "credit"
      ? total + transaction.amount
      : total - transaction.amount;
  }, 0);

  const totalExpenses = transactions
    .filter((t) => t.type === "debit")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalIncome = transactions
    .filter((t) => t.type === "credit")
    .reduce((sum, t) => sum + t.amount, 0);

  const handleInflowClick = () => {
    setTransactionType("credit");
    setIsModalOpen(true);
  };

  const handleSpendClick = () => {
    setTransactionType("debit");
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleSyncModalOpen = () => {
    setIsSyncModalOpen(true);
  };

  const handleSyncModalClose = () => {
    setIsSyncModalOpen(false);
  };

  // Wrapper function to match TransactionModal's expected interface
  const addTransaction = async (
    transaction: Omit<Transaction, "id" | "createdAt" | "updatedAt">,
  ): Promise<void> => {
    await addTransactionHook(transaction);
  };

  // Show loading state while transactions are being fetched
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <Header
          onInflowClick={handleInflowClick}
          onSpendClick={handleSpendClick}
          onSyncClick={handleSyncModalOpen}
        />

        <main className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">Dashboard</h2>

            <div className="flex gap-6 mb-6 overflow-x-auto hide-scrollbar pb-2">
              <div className="flex-shrink-0">
                <SummaryCard
                  title="Balance"
                  value={balance}
                  description={
                    balance >= 0
                      ? `You have ${new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(balance)} available`
                      : `You have a deficit of ${new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(Math.abs(balance))}`
                  }
                  variant={balance >= 0 ? "positive" : "negative"}
                />
              </div>

              <div className="flex-shrink-0">
                <SummaryCard
                  title="Total Expenses"
                  value={totalExpenses}
                  description={`You've spent ${new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(totalExpenses)} so far`}
                  variant="neutral"
                />
              </div>

              <div className="flex-shrink-0">
                <SummaryCard
                  title="Total Income"
                  value={totalIncome}
                  description={`You've earned ${new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(totalIncome)} total`}
                  variant="positive"
                />
              </div>
            </div>

            <DashboardChart transactions={transactions} balance={balance} />
          </section>
        </main>

        <TransactionModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          transactionType={transactionType}
          addTransaction={addTransaction}
        />

        {/* Sync Modal */}
        {isSyncModalOpen && (
          <div className="fixed inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Sync Settings</h2>
                <button
                  onClick={handleSyncModalClose}
                  className="text-gray-500 hover:text-gray-700 text-xl"
                >
                  ×
                </button>
              </div>
              <SyncControls showAdvanced={true} />
            </div>
          </div>
        )}

        {/* Debug Controls - Development Only */}
        {/*{import.meta.env.DEV && <DebugControls />}*/}
        {/* Keep reference to prevent unused function warning */}
        {void DebugControls}
      </div>
    </div>
  );
}

export default App;
