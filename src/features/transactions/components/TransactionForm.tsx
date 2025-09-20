import React, { useState } from "react";
import { useTransactions } from "../hooks/useTransactions";

/**
 * Renders a form for adding new financial transactions to the FinTrac app.
 *
 * This component is crucial for user input in the local-first finance tracker, allowing users to manually record transactions without external dependencies. It validates inputs and integrates with the transaction management system to ensure data integrity and immediate UI updates.
 *
 * Assumptions:
 * - The useTransactions hook provides an addTransaction function that handles database operations.
 * - Currency is hardcoded to 'NGN' as per current app requirements.
 * - Categories are predefined and match the app's category system.
 *
 * Edge cases:
 * - Prevents submission if description or amount is empty.
 * - Resets form after successful submission to allow quick entry of multiple transactions.
 * - Handles form state changes reactively for a smooth user experience.
 *
 * Connections:
 * - Uses useTransactions hook to persist data via TransactionRepository.
 * - Updates the dashboard and transaction lists immediately after adding a transaction.
 * - Part of the transactions feature module, exported for use in App.tsx.
 */
interface TransactionFormProps {
  onComplete?: () => void;
  initialType?: "credit" | "debit";
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  onComplete,
  initialType = "debit",
}) => {
  const { addTransaction } = useTransactions();
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    type: initialType,
    category: "Food",
  });

  /**
   * Handles form submission to add a new transaction.
   *
   * This function validates the form data, creates a transaction object, and calls the addTransaction hook method. It's necessary to ensure data validation and proper integration with the app's data layer before storing transactions locally.
   *
   * Assumptions:
   * - Form data is valid and parseable (amount as float).
   * - addTransaction will handle any database errors and update the UI state.
   *
   * Edge cases:
   * - Returns early if required fields are missing, preventing invalid submissions.
   * - Uses current date for transaction date, assuming real-time entry.
   * - Resets form state after successful addition for continuous use.
   *
   * Connections:
   * - Calls useTransactions.addTransaction to persist data.
   * - Triggers re-fetch of transactions, updating DashboardChart and other components.
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
        <option value="Other">Other</option>
      </select>
      <button
        type="submit"
        className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
      >
        Add Transaction
      </button>
    </form>
  );
};
