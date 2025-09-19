import { TransactionForm } from './features/transactions'
import { DashboardChart } from './features/dashboard'

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
