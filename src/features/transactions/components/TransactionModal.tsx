import React from 'react';
import { Modal } from '../../../components';
import { TransactionForm } from './TransactionForm';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionType: 'credit' | 'debit';
}

/**
 * Modal wrapper for TransactionForm component.
 *
 * Provides a modal interface for adding transactions with pre-selected
 * transaction type based on the trigger button (Inflow/Spend). Combines
 * the reusable Modal component with the TransactionForm for a clean UX.
 *
 * Features:
 * - Pre-fills transaction type based on props
 * - Auto-closes modal after successful form submission
 * - Dynamic title based on transaction type
 * - Inherits all Modal functionality (backdrop, escape key, etc.)
 *
 * Assumptions:
 * - Modal and TransactionForm components are properly imported
 * - Parent component manages the isOpen state
 * - transactionType matches the form's expected values
 *
 * Edge cases:
 * - Form validation errors keep modal open for user correction
 * - Modal closes automatically after successful transaction creation
 * - Resets form state when modal reopens
 *
 * Connections:
 * - Uses Modal component for overlay and backdrop functionality
 * - Uses TransactionForm for actual transaction entry
 * - Called from Header component via button clicks
 */
export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  transactionType,
}) => {
  const modalTitle = transactionType === 'credit' ? 'Add Inflow' : 'Add Spending';

  const handleFormComplete = () => {
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle}>
      <TransactionForm
        onComplete={handleFormComplete}
        initialType={transactionType}
      />
    </Modal>
  );
};
