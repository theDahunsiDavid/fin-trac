import Dexie from 'dexie';
import type { Table } from 'dexie';
import type { Transaction, Category } from '../../features/transactions/types';

export class FinTracDB extends Dexie {
  transactions!: Table<Transaction>;
  categories!: Table<Category>;

  constructor() {
    super('FinTracDB');
    this.version(1).stores({
      transactions: 'id, date, type, category',
      categories: 'id, name'
    });
  }
}

export const db = new FinTracDB();