import { useState } from "react";
import { TransactionModal } from "./features/transactions";
import { DashboardChart, useDashboardData } from "./features/dashboard";
import { Header, SummaryCard } from "./components";

/**
 * Main application component for FinTrac.
 *
 * This component serves as the root of the React app, orchestrating the main UI sections for dashboard visualization and modal-based transaction entry. It manages modal state and integrates feature modules.
 *
 * Assumptions:
 * - Feature components (TransactionModal, DashboardChart) are properly exported.
 * - Tailwind CSS classes are available for styling.
 *
 * Edge cases:
 * - Renders empty sections if components fail to load.
 * - Layout is responsive but assumes standard screen sizes.
 * - Modal state is managed locally for transaction entry.
 *
 * Connections:
 * - Manages TransactionModal state and passes handlers to Header.
 * - Imports and renders DashboardChart for data visualization.
 * - Mounted by main.tsx as the app's entry point.
 */
function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<"credit" | "debit">(
    "debit",
  );

  const { balance, totalExpenses } = useDashboardData();

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
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <Header
          onInflowClick={handleInflowClick}
          onSpendClick={handleSpendClick}
        />

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

            <DashboardChart />
          </section>
        </main>

        <TransactionModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          transactionType={transactionType}
        />
      </div>
    </div>
  );
}

export default App;
