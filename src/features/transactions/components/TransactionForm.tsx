import React, { useState } from "react";
import type { Transaction } from "../types";

/**
 * Renders a form for adding new financial transactions to the FinTrac app.
 *
 * This component is crucial for user input in the local-first finance tracker, allowing users to manually record transactions without external dependencies. It validates inputs and integrates with the transaction management system to ensure data integrity and immediate UI updates. Now receives addTransaction function as a prop to maintain single source of truth for data.
 *
 * Assumptions:
 * - The addTransaction function is provided via props and handles database operations.
 * - Currency is hardcoded to 'NGN' as per current app requirements.
 * - Categories are predefined and match the app's category system.
 * - Parent component manages transaction data state and updates.
 *
 * Edge cases:
 * - Prevents submission if description or amount is empty.
 * - Resets form after successful submission to allow quick entry of multiple transactions.
 * - Handles form state changes reactively for a smooth user experience.
 * - Form validation occurs before calling addTransaction prop.
 *
 * Connections:
 * - Uses addTransaction prop to persist data via parent component's data management.
 * - Updates the dashboard and transaction lists immediately after adding a transaction through prop drilling.
 * - Part of the transactions feature module, used by TransactionModal component.
 * - No longer directly uses useTransactions hook, ensuring single source of truth.
 */
interface TransactionFormProps {
  onComplete?: () => void;
  initialType?: "credit" | "debit";
  addTransaction: (
    transaction: Omit<Transaction, "id" | "createdAt" | "updatedAt">,
  ) => Promise<void>;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  onComplete,
  initialType = "debit",
  addTransaction,
}) => {
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    type: initialType,
    category: "Food",
  });

  /**
   * Handles form submission to add a new transaction.
   *
   * This function validates the form data, creates a transaction object, and calls the addTransaction prop method. It's necessary to ensure data validation and proper integration with the app's data layer before storing transactions locally. Now uses prop-provided function instead of hook to maintain single source of truth.
   *
   * Assumptions:
   * - Form data is valid and parseable (amount as float).
   * - addTransaction prop will handle any database errors and update the UI state.
   * - Parent component manages all transaction state and re-rendering.
   *
   * Edge cases:
   * - Returns early if required fields are missing, preventing invalid submissions.
   * - Uses current date for transaction date, assuming real-time entry.
   * - Resets form state after successful addition for continuous use.
   * - All data persistence and state updates handled by parent component.
   *
   * Connections:
   * - Calls addTransaction prop to persist data through parent component.
   * - Triggers re-rendering of DashboardChart and other components via parent state updates.
   * - No direct database or hook interactions, ensuring clean data flow.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.amount) return;

    await addTransaction({
      description: formData.description,
      amount: parseFloat(formData.amount),
      currency: "NGN",
      type: formData.type,
      category: formData.category,
      date: new Date().toISOString(),
    });

    // Reset form
    setFormData({
      description: "",
      amount: "",
      type: initialType,
      category: "Food",
    });

    // Call completion callback if provided
    if (onComplete) {
      onComplete();
    }
  };

  /**
   * Updates the form state when input values change.
   *
   * This handler is essential for controlled components in React, ensuring the form state reflects user input accurately. It supports both text inputs and select dropdowns for a flexible form interface.
   *
   * Assumptions:
   * - Event targets have 'name' and 'value' properties matching form state keys.
   * - State updates are synchronous and don't require additional validation here.
   *
   * Edge cases:
   * - Handles both input and select elements uniformly.
   * - Preserves previous state while updating only the changed field.
   *
   * Connections:
   * - Directly updates the local formData state, which is used in rendering and submission.
   * - No external connections; purely internal to the component's state management.
   */
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="text"
        name="description"
        placeholder="Description"
        value={formData.description}
        onChange={handleChange}
        className="w-full px-3 py-2 border border-gray-300 rounded"
        required
      />
      <input
        type="number"
        name="amount"
        placeholder="Amount"
        value={formData.amount}
        onChange={handleChange}
        className="w-full px-3 py-2 border border-gray-300 rounded"
        step="0.01"
        required
      />
      <select
        name="type"
        value={formData.type}
        onChange={handleChange}
        className="w-full px-3 py-2 border border-gray-300 rounded"
      >
        <option value="debit">Debit</option>
        <option value="credit">Credit</option>
      </select>
      <select
        name="category"
        value={formData.category}
        onChange={handleChange}
        className="w-full px-3 py-2 border border-gray-300 rounded"
      >
        <option value="Food">Food</option>
        <option value="Transport">Transport</option>
        <option value="Entertainment">Entertainment</option>
        <option value="Software Engineering">Software Engineering</option>
        <option value="Hygiene">Hygiene</option>
        <option value="Health">Health</option>
        <option value="Car Fuel">Car Fuel</option>
        <option value="Other">Other</option>
      </select>
      <button
        type="submit"
        className="px-4 py-2 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700"
      >
        Add Transaction
      </button>
    </form>
  );
};
