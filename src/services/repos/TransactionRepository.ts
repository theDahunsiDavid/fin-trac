import { db } from "../db/db";
import type { Transaction } from "../../features/transactions/types";
import type { ITransactionRepository } from "./ITransactionRepository";

/**
 * Dexie implementation of Transaction Repository
 *
 * This class implements the ITransactionRepository interface using Dexie/IndexedDB
 * for local-first data storage. It provides all transaction CRUD operations
 * with proper error handling and data validation.
 */
export class TransactionRepository implements ITransactionRepository {
  /**
   * Creates a new transaction in the database.
   */
  async create(
    transaction: Omit<Transaction, "id" | "createdAt" | "updatedAt">,
  ): Promise<Transaction> {
    const now = new Date().toISOString();
    const newTransaction: Transaction = {
      ...transaction,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };

    await db.transactions.add(newTransaction);
    return newTransaction;
  }

  /**
   * Retrieves all transactions from the database.
   */
  async getAll(): Promise<Transaction[]> {
    return await db.transactions.orderBy("date").reverse().toArray();
  }

  /**
   * Retrieves a transaction by its ID.
   */
  async getById(id: string): Promise<Transaction | undefined> {
    return await db.transactions.get(id);
  }

  /**
   * Updates an existing transaction in the database.
   */
  async update(
    id: string,
    updates: Partial<Omit<Transaction, "id" | "createdAt">>,
  ): Promise<Transaction> {
    const now = new Date().toISOString();
    const updateData = { ...updates, updatedAt: now };

    await db.transactions.update(id, updateData);

    const updatedTransaction = await db.transactions.get(id);
    if (!updatedTransaction) {
      throw new Error(`Transaction with id ${id} not found after update`);
    }

    return updatedTransaction;
  }

  /**
   * Deletes a transaction from the database.
   */
  async delete(id: string): Promise<void> {
    await db.transactions.delete(id);
  }

  /**
   * Retrieves transactions within a specific date range.
   */
  async getByDateRange(
    startDate: string,
    endDate: string,
  ): Promise<Transaction[]> {
    return await db.transactions
      .where("date")
      .between(startDate, endDate, true, true)
      .reverse()
      .toArray();
  }

  /**
   * Retrieves transactions filtered by category.
   */
  async getByCategory(category: string): Promise<Transaction[]> {
    return await db.transactions.where("category").equals(category).toArray();
  }

  /**
   * Retrieves transactions filtered by type (credit or debit).
   */
  async getByType(type: "credit" | "debit"): Promise<Transaction[]> {
    return await db.transactions.where("type").equals(type).toArray();
  }

  /**
   * Searches transactions by description using case-insensitive partial matching.
   */
  async searchByDescription(query: string): Promise<Transaction[]> {
    const lowerQuery = query.toLowerCase();
    return await db.transactions
      .filter((transaction) =>
        transaction.description.toLowerCase().includes(lowerQuery),
      )
      .toArray();
  }

  /**
   * Gets the total count of transactions.
   */
  async count(): Promise<number> {
    return await db.transactions.count();
  }

  /**
   * Clears all transactions from the database.
   */
  async clear(): Promise<void> {
    await db.transactions.clear();
  }

  /**
   * Bulk creates multiple transactions.
   */
  async bulkCreate(
    transactions: Omit<Transaction, "id" | "createdAt" | "updatedAt">[],
  ): Promise<Transaction[]> {
    const now = new Date().toISOString();
    const newTransactions: Transaction[] = transactions.map((transaction) => ({
      ...transaction,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    }));

    await db.transactions.bulkAdd(newTransactions);
    return newTransactions;
  }

  /**
   * Gets database information and status.
   */
  async getInfo(): Promise<{
    name: string;
    totalTransactions: number;
    implementation: "dexie" | "pouchdb";
    lastModified?: string;
  }> {
    const totalTransactions = await this.count();

    // Get the most recent transaction to determine last modified
    const recentTransactions = await db.transactions
      .orderBy("updatedAt")
      .reverse()
      .limit(1)
      .toArray();

    const lastModified =
      recentTransactions.length > 0
        ? recentTransactions[0].updatedAt
        : undefined;

    return {
      name: "fintrac-dexie",
      totalTransactions,
      implementation: "dexie",
      lastModified,
    };
  }

  // Legacy methods for backward compatibility
  /**
   * @deprecated Use getByDateRange instead
   */
  async getTransactionsByDateRange(
    startDate: string,
    endDate: string,
  ): Promise<Transaction[]> {
    return this.getByDateRange(startDate, endDate);
  }

  /**
   * @deprecated Use getByType instead
   */
  async getTransactionsByType(
    type: "credit" | "debit",
  ): Promise<Transaction[]> {
    return this.getByType(type);
  }

  /**
   * @deprecated Use getByCategory instead
   */
  async getTransactionsByCategory(category: string): Promise<Transaction[]> {
    return this.getByCategory(category);
  }

  /**
   * @deprecated Use getAll with manual slicing instead
   */
  async getRecentTransactions(limit: number = 10): Promise<Transaction[]> {
    return await db.transactions
      .orderBy("date")
      .reverse()
      .limit(limit)
      .toArray();
  }
}
