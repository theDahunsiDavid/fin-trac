import { useState } from "react";
import { TransactionModal } from "./features/transactions";
import { DashboardChart } from "./features/dashboard";
import { Header, SummaryCard } from "./components";

import SyncControls from "./components/SyncControls";
import { useTransactions } from "./features/transactions/hooks/useTransactions";
import type { Transaction } from "./features/transactions/types";

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
  const [transactionType, setTransactionType] = useState<"credit" | "debit">(
    "debit",
  );

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
        />

        {/* CouchDB Sync Components */}
        <div className="mb-6">
          <SyncControls showAdvanced={true} />
        </div>

        <main className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">Dashboard</h2>

            <div className="flex gap-6 mb-6">
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

              <SummaryCard
                title="Total Expenses"
                value={totalExpenses}
                description={`You've spent ${new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(totalExpenses)} so far`}
                variant="neutral"
              />
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
      </div>
    </div>
  );
}

export default App;
