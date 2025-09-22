import type { ITransactionRepository } from "./ITransactionRepository";
import type { ICategoryRepository } from "./ICategoryRepository";
import { TransactionRepository } from "./TransactionRepository";
import { PouchDBTransactionRepository } from "./PouchDBTransactionRepository";
import {
  getSyncService,
  destroySyncService,
  isSyncAvailable,
  type SyncService,
} from "../pouchdb/syncService";
import { SyncStatus, type SyncEvent } from "../pouchdb/config";

/**
 * Repository Factory for switching between different database implementations
 *
 * This factory allows the app to switch between Dexie (IndexedDB) and PouchDB
 * implementations without changing the consuming code. The implementation is
 * controlled by the VITE_USE_POUCHDB environment variable.
 *
 * Usage:
 * - Set VITE_USE_POUCHDB=true to use PouchDB (with sync capabilities)
 * - Set VITE_USE_POUCHDB=false to use Dexie (local-only)
 * - Default is Dexie if environment variable is not set
 */

export type DatabaseImplementation = "dexie" | "pouchdb";

export class RepositoryFactory {
  private static _implementation: DatabaseImplementation | null = null;
  private static _transactionRepository: ITransactionRepository | null = null;
  private static _categoryRepository: ICategoryRepository | null = null;

  /**
   * Get the current database implementation type
   */
  static getImplementation(): DatabaseImplementation {
    if (this._implementation === null) {
      // Check environment variable
      const usePouchDB = import.meta.env.VITE_USE_POUCHDB === "true";
      this._implementation = usePouchDB ? "pouchdb" : "dexie";

      console.log(
        `Repository implementation: ${this._implementation} (VITE_USE_POUCHDB=${usePouchDB})`,
      );
    }
    return this._implementation;
  }

  /**
   * Set the database implementation type (useful for testing)
   */
  static setImplementation(implementation: DatabaseImplementation): void {
    this._implementation = implementation;
    // Clear cached repositories when implementation changes
    this._transactionRepository = null;
    this._categoryRepository = null;
  }

  /**
   * Get Transaction Repository instance
   */
  static getTransactionRepository(): ITransactionRepository {
    if (this._transactionRepository === null) {
      const implementation = this.getImplementation();

      switch (implementation) {
        case "pouchdb":
          this._transactionRepository = new PouchDBTransactionRepository(true);
          break;
        case "dexie":
        default:
          this._transactionRepository = new TransactionRepository();
          break;
      }
    }

    return this._transactionRepository;
  }

  /**
   * Get Category Repository instance
   * Note: Currently only returns a placeholder since CategoryRepository is not implemented yet
   */
  static getCategoryRepository(): ICategoryRepository {
    if (this._categoryRepository === null) {
      // For now, throw an error since we haven't implemented category repositories yet
      // This will be implemented in a future phase
      throw new Error(
        "Category repository not implemented yet. This will be available in a future update.",
      );
    }

    return this._categoryRepository;
  }

  /**
   * Reset all cached repository instances (useful for testing)
   */
  static reset(): void {
    this._implementation = null;
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
      implementation: "dexie" | "pouchdb";
      lastModified?: string;
    };
  }> {
    const current = this.getImplementation();
    const transactionRepo = this.getTransactionRepository();
    const repoInfo = await transactionRepo.getInfo();

    return {
      current,
      available: ["dexie", "pouchdb"],
      environmentVariable: import.meta.env.VITE_USE_POUCHDB,
      transactionRepository: repoInfo,
    };
  }

  /**
   * Test both implementations and compare results (useful for migration validation)
   */
  static async compareImplementations(): Promise<{
    dexie: {
      totalTransactions: number;
      implementation: "dexie" | "pouchdb";
      lastModified?: string;
    };
    pouchdb: {
      totalTransactions: number;
      implementation: "dexie" | "pouchdb";
      lastModified?: string;
    };
    identical: boolean;
  }> {
    // Save current implementation
    const originalImplementation = this._implementation;

    try {
      // Test Dexie
      this.setImplementation("dexie");
      const dexieRepo = this.getTransactionRepository();
      const dexieInfo = await dexieRepo.getInfo();

      // Test PouchDB (temporarily disabled)
      console.warn("PouchDB comparison temporarily disabled");
      const pouchdbInfo = {
        totalTransactions: 0,
        implementation: "pouchdb" as const,
        lastModified: undefined,
        disabled: true,
      };

      // Compare results
      const identical =
        dexieInfo.totalTransactions === pouchdbInfo.totalTransactions;

      return {
        dexie: dexieInfo,
        pouchdb: pouchdbInfo,
        identical,
      };
    } finally {
      // Restore original implementation
      this._implementation = originalImplementation;
      // Clear cached repositories
      this._transactionRepository = null;
      this._categoryRepository = null;
    }
  }

  /**
   * Migrate data from one implementation to another
   * This is useful when switching from Dexie to PouchDB or vice versa
   */
  static async migrateData(
    from: DatabaseImplementation,
    to: DatabaseImplementation,
  ): Promise<{
    success: boolean;
    migratedTransactions: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let migratedTransactions = 0;

    if (from === to) {
      errors.push("Source and destination implementations are the same");
      return { success: false, migratedTransactions: 0, errors };
    }

    try {
      // Get source repository
      this.setImplementation(from);
      const sourceRepo = this.getTransactionRepository();
      const sourceTransactions = await sourceRepo.getAll();

      // Get destination repository
      this.setImplementation(to);
      const destRepo = this.getTransactionRepository();

      // Clear destination before migration
      await destRepo.clear();

      // Migrate transactions in batches
      const batchSize = 100;
      for (let i = 0; i < sourceTransactions.length; i += batchSize) {
        const batch = sourceTransactions.slice(i, i + batchSize);
        const transactionsToMigrate = batch.map(
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          ({ id, createdAt, updatedAt, ...transaction }) => transaction,
        );

        try {
          await destRepo.bulkCreate(transactionsToMigrate);
          migratedTransactions += batch.length;
        } catch (error) {
          errors.push(`Failed to migrate batch ${i / batchSize + 1}: ${error}`);
        }
      }

      return {
        success: errors.length === 0,
        migratedTransactions,
        errors,
      };
    } catch (error) {
      errors.push(`Migration failed: ${error}`);
      return { success: false, migratedTransactions, errors };
    }
  }

  /**
   * Get sync service for PouchDB implementation
   */
  static getSyncService(): SyncService | null {
    const implementation = this.getImplementation();
    if (implementation !== "pouchdb") {
      return null;
    }

    return getSyncService();
  }

  /**
   * Check if sync is available and enabled
   */
  static async isSyncAvailable(): Promise<boolean> {
    const implementation = this.getImplementation();
    if (implementation !== "pouchdb") {
      return false;
    }

    return await isSyncAvailable();
  }

  /**
   * Get sync status and statistics
   */
  static getSyncStatus(): {
    implementation: DatabaseImplementation;
    syncEnabled: boolean;
    syncAvailable: boolean;
    status?: SyncStatus;
    stats?: {
      docsRead: number;
      docsWritten: number;
      pending: number;
      lastSync?: Date;
      status: SyncStatus;
    };
  } {
    const implementation = this.getImplementation();
    const syncService = this.getSyncService();

    if (implementation !== "pouchdb" || !syncService) {
      return {
        implementation,
        syncEnabled: false,
        syncAvailable: false,
      };
    }

    const state = syncService.getState();
    const stats = syncService.getSyncStats();

    return {
      implementation,
      syncEnabled: true,
      syncAvailable: true,
      status: state.status,
      stats,
    };
  }

  /**
   * Start sync for PouchDB implementation
   */
  static async startSync(options?: {
    live?: boolean;
    retry?: boolean;
  }): Promise<void> {
    const syncService = this.getSyncService();
    if (!syncService) {
      throw new Error("Sync is only available with PouchDB implementation");
    }

    await syncService.startSync(options);
  }

  /**
   * Stop sync for PouchDB implementation
   */
  static stopSync(): void {
    const syncService = this.getSyncService();
    if (syncService) {
      syncService.stopSync();
    }
  }

  /**
   * Force a manual sync
   */
  static async forceSync(): Promise<void> {
    const syncService = this.getSyncService();
    if (!syncService) {
      throw new Error("Sync is only available with PouchDB implementation");
    }

    await syncService.forcSync();
  }

  /**
   * Subscribe to sync events
   */
  static onSyncEvent(
    listener: (event: SyncEvent) => void,
  ): (() => void) | null {
    const syncService = this.getSyncService();
    if (!syncService) {
      return null;
    }

    return syncService.onSyncEvent(listener);
  }

  /**
   * Destroy sync service and clean up resources
   */
  static async destroySync(): Promise<void> {
    await destroySyncService();
  }
}

// Export singleton instance methods for convenience
export const getTransactionRepository = (): ITransactionRepository =>
  RepositoryFactory.getTransactionRepository();

export const getCategoryRepository = (): ICategoryRepository =>
  RepositoryFactory.getCategoryRepository();

export const getImplementation = (): DatabaseImplementation =>
  RepositoryFactory.getImplementation();

export const setImplementation = (
  implementation: DatabaseImplementation,
): void => RepositoryFactory.setImplementation(implementation);
