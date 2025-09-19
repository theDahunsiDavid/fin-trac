import { db } from '../db/db';
import type { Transaction } from '../../features/transactions/types';

export class TransactionRepository {
  async getAll(): Promise<Transaction[]> {
    return await db.transactions.toArray();
  }

  async create(transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const now = new Date().toISOString();
    await db.transactions.add({
      ...transaction,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    });
  }

  async update(id: string, updates: Partial<Omit<Transaction, 'id' | 'createdAt'>>): Promise<void> {
    const now = new Date().toISOString();
    await db.transactions.update(id, { ...updates, updatedAt: now });
  }

  async delete(id: string): Promise<void> {
    await db.transactions.delete(id);
  }
}