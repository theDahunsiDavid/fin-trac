import React from "react";
import { Modal } from "../../../components";
import { TransactionForm } from "./TransactionForm";
import type { Transaction } from "../types";

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionType: "credit" | "debit";
  addTransaction: (
    transaction: Omit<Transaction, "id" | "createdAt" | "updatedAt">,
  ) => Promise<void>;
}

/**
 * Modal wrapper for TransactionForm component.
 *
 * Provides a modal interface for adding transactions with pre-selected
 * transaction type based on the trigger button (Inflow/Spend). Combines
 * the reusable Modal component with the TransactionForm for a clean UX.
 * Now receives addTransaction function from parent to maintain single source of truth.
 *
 * Features:
 * - Pre-fills transaction type based on props
 * - Auto-closes modal after successful form submission
 * - Dynamic title based on transaction type
 * - Inherits all Modal functionality (backdrop, escape key, etc.)
 * - Passes addTransaction function to form for data persistence
 *
 * Assumptions:
 * - Modal and TransactionForm components are properly imported
 * - Parent component manages the isOpen state and provides addTransaction
 * - transactionType matches the form's expected values
 * - addTransaction function handles all database operations and state updates
 *
 * Edge cases:
 * - Form validation errors keep modal open for user correction
 * - Modal closes automatically after successful transaction creation
 * - Resets form state when modal reopens
 *
 * Connections:
 * - Uses Modal component for overlay and backdrop functionality
 * - Uses TransactionForm for actual transaction entry with prop drilling
 * - Called from App.tsx with addTransaction function from useTransactions hook
 * - Ensures single source of truth by not using useTransactions internally
 */
export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  transactionType,
  addTransaction,
}) => {
  const modalTitle =
    transactionType === "credit" ? "Add Inflow" : "Add Spending";

  const handleFormComplete = () => {
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle}>
      <TransactionForm
        onComplete={handleFormComplete}
        initialType={transactionType}
        addTransaction={addTransaction}
      />
    </Modal>
  );
};
