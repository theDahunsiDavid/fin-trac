import type { ITransactionRepository } from "./ITransactionRepository";
import type { ICategoryRepository } from "./ICategoryRepository";
import { TransactionRepository } from "./TransactionRepository";
import { CategoryRepository } from "./CategoryRepository";

/**
 * Repository Factory for FinTrac database operations
 *
 * This factory provides access to repository instances for transactions and categories.
 * Uses Dexie (IndexedDB) for local-first storage with custom CouchDB sync service.
 */

export type DatabaseImplementation = "dexie";

export class RepositoryFactory {
  private static _transactionRepository: ITransactionRepository | null = null;
  private static _categoryRepository: ICategoryRepository | null = null;

  /**
   * Get the current database implementation type
   */
  static getImplementation(): DatabaseImplementation {
    return "dexie";
  }

  /**
   * Get Transaction Repository instance
   */
  static getTransactionRepository(): ITransactionRepository {
    if (this._transactionRepository === null) {
      this._transactionRepository = new TransactionRepository();
    }

    return this._transactionRepository;
  }

  /**
   * Get Category Repository instance
   */
  static getCategoryRepository(): ICategoryRepository {
    if (this._categoryRepository === null) {
      this._categoryRepository = new CategoryRepository();
    }

    return this._categoryRepository;
  }

  /**
   * Reset all cached repository instances (useful for testing)
   */
  static reset(): void {
    this._transactionRepository = null;
    this._categoryRepository = null;
  }

  /**
   * Get implementation info and status
   */
  static async getImplementationInfo(): Promise<{
    current: DatabaseImplementation;
    available: DatabaseImplementation[];
    environmentVariable: string | undefined;
    transactionRepository: {
      name: string;
      totalTransactions: number;
      implementation: "dexie";
      lastModified?: string;
    };
  }> {
    const current = this.getImplementation();
    const transactionRepo = this.getTransactionRepository();
    const repoInfo = await transactionRepo.getInfo();

    return {
      current,
      available: ["dexie"],
      environmentVariable: import.meta.env.VITE_USE_POUCHDB,
      transactionRepository: {
        ...repoInfo,
        implementation: "dexie",
      },
    };
  }
}

// Export singleton instance methods for convenience
export const getTransactionRepository = (): ITransactionRepository =>
  RepositoryFactory.getTransactionRepository();

export const getCategoryRepository = (): ICategoryRepository =>
  RepositoryFactory.getCategoryRepository();

export const getImplementation = (): DatabaseImplementation =>
  RepositoryFactory.getImplementation();
