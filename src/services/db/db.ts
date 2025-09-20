import Dexie from 'dexie';
import type { Table } from 'dexie';
import type { Transaction, Category } from '../../features/transactions/types';

/**
 * Extends Dexie to define the IndexedDB schema for FinTrac.
 *
 * This class establishes the local database structure, enabling offline-first data storage for transactions and categories. It's fundamental to the app's privacy-focused design, keeping all data client-side without server dependencies.
 *
 * Assumptions:
 * - Dexie library is properly imported and configured.
 * - Browser supports IndexedDB.
 *
 * Edge cases:
 * - Database version is set to 1; future updates will increment this.
 * - Indexes are defined for efficient querying by date, type, and category.
 *
 * Connections:
 * - Used by TransactionRepository and future CategoryRepository.
 * - Supports the app's data persistence layer, integrated via repositories.
 */
export class FinTracDB extends Dexie {
  transactions!: Table<Transaction>;
  categories!: Table<Category>;

  /**
   * Initializes the FinTracDB with schema definition.
   *
   * This constructor sets up the database name, version, and table structures, ensuring consistent data storage. It's called once to create the DB instance, providing a single point of database configuration.
   *
   * Assumptions:
   * - Database name 'FinTracDB' is unique and doesn't conflict.
   * - Schema matches the TypeScript interfaces for Transaction and Category.
   *
   * Edge cases:
   * - If database exists with different schema, Dexie handles migrations.
   * - Version 1 assumes initial setup; increments needed for schema changes.
   *
   * Connections:
   * - Defines tables used by repositories for CRUD operations.
   * - Exported db instance is used throughout the app for data access.
   */
  constructor() {
    super('FinTracDB');
    this.version(1).stores({
      transactions: 'id, date, type, category',
      categories: 'id, name'
    });
  }
}

export const db = new FinTracDB();