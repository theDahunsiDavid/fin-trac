import React, { useState } from 'react';
import { useTransactions } from '../hooks/useTransactions';

export const TransactionForm: React.FC = () => {
  const { addTransaction } = useTransactions();
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: 'debit' as 'credit' | 'debit',
    category: 'Food',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.amount) return;

    await addTransaction({
      description: formData.description,
      amount: parseFloat(formData.amount),
      currency: 'NGN',
      type: formData.type,
      category: formData.category,
      date: new Date().toISOString(),
    });

    // Reset form
    setFormData({
      description: '',
      amount: '',
      type: 'debit',
      category: 'Food',
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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