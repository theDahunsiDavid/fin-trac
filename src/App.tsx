import { TransactionForm } from './features/transactions'
import { DashboardChart } from './features/dashboard'

/**
 * Main application component for FinTrac.
 *
 * This component serves as the root of the React app, orchestrating the main UI sections for dashboard visualization and transaction entry. It's essential for structuring the app's layout and integrating feature modules.
 *
 * Assumptions:
 * - Feature components (TransactionForm, DashboardChart) are properly exported.
 * - Tailwind CSS classes are available for styling.
 *
 * Edge cases:
 * - Renders empty sections if components fail to load.
 * - Layout is responsive but assumes standard screen sizes.
 *
 * Connections:
 * - Imports and renders TransactionForm for data input.
 * - Imports and renders DashboardChart for data visualization.
 * - Mounted by main.tsx as the app's entry point.
 */
function App() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-center text-emerald-600">FinTrac</h1>
        <p className="text-center text-gray-600">Personal Finance Tracker</p>
      </header>

      <main className="max-w-4xl mx-auto space-y-8">
        <section>
          <h2 className="text-2xl font-semibold mb-4">Dashboard</h2>
          <DashboardChart />
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Add Transaction</h2>
          <TransactionForm />
        </section>
      </main>
    </div>
  )
}

export default App
