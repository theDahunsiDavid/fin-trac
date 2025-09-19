import { useState, useEffect } from 'react';
import type { Transaction } from '../types';
import { TransactionRepository } from '../../../services/repos/TransactionRepository';

const repo = new TransactionRepository();

export const useTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const data = await repo.getAll();
        setTransactions(data);
      } catch (error) {
        console.error('Failed to fetch transactions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  const addTransaction = async (transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await repo.create(transaction);
      // Refresh transactions
      const data = await repo.getAll();
      setTransactions(data);
    } catch (error) {
      console.error('Failed to add transaction:', error);
    }
  };

  return { transactions, loading, addTransaction };
};