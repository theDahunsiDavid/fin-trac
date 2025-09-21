import { TransactionRepository } from '../repos/TransactionRepository';
import { PouchTransactionRepository } from '../repos/PouchTransactionRepository';
import { validateTransactionArrays, generateValidationReport, createPerformanceTimer } from './validation';
import type { Transaction } from '../../features/transactions/types';
import type { ValidationReport } from './validation';

/**
 * Data migration utility for transferring data from Dexie to PouchDB.
 *
 * This utility provides functions to migrate existing transaction data from the
 * Dexie IndexedDB implementation to the new PouchDB implementation. It includes
 * validation, rollback capabilities, and progress reporting.
 */

export interface MigrationProgress {
  total: number;
  completed: number;
  percentage: number;
  currentOperation: string;
  errors: string[];
}

export interface MigrationResult {
  success: boolean;
  migratedCount: number;
  validationReport: ValidationReport;
  errors: string[];
  duration: number;
}

export interface MigrationOptions {
  batchSize?: number;
  validateAfterMigration?: boolean;
  onProgress?: (progress: MigrationProgress) => void;
  dryRun?: boolean;
}

/**
 * Migrates all transactions from Dexie to PouchDB.
 *
 * This is the main migration function that handles the complete transfer of
 * transaction data from the old Dexie implementation to the new PouchDB
 * implementation with validation and error handling.
 *
 * @param options Migration configuration options
 * @returns Promise<MigrationResult> Result of the migration operation
 */
export async function migrateTransactions(
  options: MigrationOptions = {}
): Promise<MigrationResult> {
  const {
    batchSize = 50,
    validateAfterMigration = true,
    onProgress,
    dryRun = false,
  } = options;

  const timer = createPerformanceTimer();
  timer.start('total_migration');

  const dexieRepo = new TransactionRepository();
  const pouchRepo = new PouchTransactionRepository();
  const errors: string[] = [];

  let migratedCount = 0;
  let validationReport: ValidationReport | null = null;

  try {
    // Step 1: Fetch all transactions from Dexie
    timer.start('dexie_fetch');
    onProgress?.({
      total: 0,
      completed: 0,
      percentage: 0,
      currentOperation: 'Fetching transactions from Dexie...',
      errors: [],
    });

    const dexieTransactions = await dexieRepo.getAll();
    const totalTransactions = dexieTransactions.length;
    timer.stop('dexie_fetch');

    console.log(`Found ${totalTransactions} transactions to migrate`);

    if (totalTransactions === 0) {
      return {
        success: true,
        migratedCount: 0,
        validationReport: generateValidationReport(
          { isValid: true, differences: [] },
          [],
          [],
          {
            dexieQueryTime: timer.getDuration('dexie_fetch'),
            pouchdbQueryTime: 0,
            validationTime: 0,
          }
        ),
        errors: [],
        duration: timer.stop('total_migration'),
      };
    }

    // Step 2: Migrate transactions in batches
    timer.start('pouchdb_migration');

    for (let i = 0; i < dexieTransactions.length; i += batchSize) {
      const batch = dexieTransactions.slice(i, i + batchSize);
      const batchProgress = {
        total: totalTransactions,
        completed: i,
        percentage: Math.round((i / totalTransactions) * 100),
        currentOperation: `Migrating transactions ${i + 1}-${Math.min(i + batchSize, totalTransactions)}...`,
        errors: [...errors],
      };

      onProgress?.(batchProgress);

      if (!dryRun) {
        try {
          await migrateBatch(batch, pouchRepo);
          migratedCount += batch.length;
        } catch (error) {
          const errorMessage = `Batch ${i + 1}-${Math.min(i + batchSize, totalTransactions)} failed: ${error}`;
          errors.push(errorMessage);
          console.error(errorMessage);
        }
      } else {
        // In dry run mode, just simulate the migration
        migratedCount += batch.length;
      }
    }

    timer.stop('pouchdb_migration');

    // Step 3: Validation (if enabled)
    if (validateAfterMigration && !dryRun) {
      timer.start('validation');
      onProgress?.({
        total: totalTransactions,
        completed: migratedCount,
        percentage: 100,
        currentOperation: 'Validating migrated data...',
        errors: [...errors],
      });

      const pouchTransactions = await pouchRepo.getAll();
      const validationResult = validateTransactionArrays(dexieTransactions, pouchTransactions);

      validationReport = generateValidationReport(
        validationResult,
        dexieTransactions,
        pouchTransactions,
        {
          dexieQueryTime: timer.getDuration('dexie_fetch'),
          pouchdbQueryTime: timer.getDuration('pouchdb_migration'),
          validationTime: timer.stop('validation'),
        }
      );

      if (!validationResult.isValid) {
        errors.push('Validation failed after migration');
        console.error('Migration validation failed:', validationResult.differences);
      }
    }

    const totalDuration = timer.stop('total_migration');

    onProgress?.({
      total: totalTransactions,
      completed: migratedCount,
      percentage: 100,
      currentOperation: 'Migration completed',
      errors: [...errors],
    });

    return {
      success: errors.length === 0,
      migratedCount,
      validationReport: validationReport || generateValidationReport(
        { isValid: true, differences: [] },
        dexieTransactions,
        dryRun ? [] : await pouchRepo.getAll()
      ),
      errors,
      duration: totalDuration,
    };

  } catch (error) {
    const errorMessage = `Migration failed: ${error}`;
    errors.push(errorMessage);
    console.error(errorMessage);

    return {
      success: false,
      migratedCount,
      validationReport: validationReport || generateValidationReport(
        { isValid: false, differences: [errorMessage] },
        [],
        []
      ),
      errors,
      duration: timer.stop('total_migration'),
    };
  }
}

/**
 * Migrates a batch of transactions to PouchDB.
 *
 * @param transactions Batch of transactions to migrate
 * @param pouchRepo PouchDB repository instance
 */
async function migrateBatch(
  transactions: Transaction[],
  pouchRepo: PouchTransactionRepository
): Promise<void> {
  for (const transaction of transactions) {
    // Create new transaction without id, createdAt, updatedAt to let PouchDB handle them
    const transactionData = {
      date: transaction.date,
      description: transaction.description,
      amount: transaction.amount,
      currency: transaction.currency,
      type: transaction.type,
      category: transaction.category,
      tags: transaction.tags,
    };

    await pouchRepo.create(transactionData);
  }
}

/**
 * Checks if migration is needed by comparing data counts.
 *
 * @returns Promise<boolean> True if migration is needed
 */
export async function isMigrationNeeded(): Promise<boolean> {
  try {
    const dexieRepo = new TransactionRepository();
    const pouchRepo = new PouchTransactionRepository();

    const [dexieTransactions, pouchTransactions] = await Promise.all([
      dexieRepo.getAll(),
      pouchRepo.getAll()
    ]);

    // Migration is needed if Dexie has data but PouchDB doesn't
    return dexieTransactions.length > 0 && pouchTransactions.length === 0;
  } catch (error) {
    console.error('Error checking migration status:', error);
    return false;
  }
}

/**
 * Performs a dry run migration to estimate time and detect issues.
 *
 * @param options Migration options
 * @returns Promise<MigrationResult> Estimated migration result
 */
export async function performDryRun(
  options: Omit<MigrationOptions, 'dryRun'> = {}
): Promise<MigrationResult> {
  return migrateTransactions({ ...options, dryRun: true });
}

/**
 * Clears all PouchDB data (for testing and rollback purposes).
 * Use with caution - this will permanently delete all PouchDB transactions.
 *
 * @returns Promise<number> Number of transactions deleted
 */
export async function clearPouchDBData(): Promise<number> {
  try {
    const pouchRepo = new PouchTransactionRepository();
    const transactions = await pouchRepo.getAll();

    for (const transaction of transactions) {
      await pouchRepo.delete(transaction.id);
    }

    console.log(`Cleared ${transactions.length} transactions from PouchDB`);
    return transactions.length;
  } catch (error) {
    console.error('Error clearing PouchDB data:', error);
    throw error;
  }
}

/**
 * Validates data consistency between Dexie and PouchDB without migration.
 * Useful for testing and verification.
 *
 * @returns Promise<ValidationReport> Validation report
 */
export async function validateDataConsistency(): Promise<ValidationReport> {
  const timer = createPerformanceTimer();

  try {
    const dexieRepo = new TransactionRepository();
    const pouchRepo = new PouchTransactionRepository();

    timer.start('dexie_fetch');
    const dexieTransactions = await dexieRepo.getAll();
    timer.stop('dexie_fetch');

    timer.start('pouchdb_fetch');
    const pouchTransactions = await pouchRepo.getAll();
    timer.stop('pouchdb_fetch');

    timer.start('validation');
    const validationResult = validateTransactionArrays(dexieTransactions, pouchTransactions);
    timer.stop('validation');

    return generateValidationReport(
      validationResult,
      dexieTransactions,
      pouchTransactions,
      {
        dexieQueryTime: timer.getDuration('dexie_fetch'),
        pouchdbQueryTime: timer.getDuration('pouchdb_fetch'),
        validationTime: timer.getDuration('validation'),
      }
    );
  } catch (error) {
    console.error('Error validating data consistency:', error);
    throw error;
  }
}

/**
 * Gets migration statistics without performing actual migration.
 *
 * @returns Promise<MigrationStats> Statistics about migration readiness
 */
export async function getMigrationStats(): Promise<MigrationStats> {
  try {
    const dexieRepo = new TransactionRepository();
    const pouchRepo = new PouchTransactionRepository();

    const [dexieTransactions, pouchTransactions] = await Promise.all([
      dexieRepo.getAll(),
      pouchRepo.getAll()
    ]);

    return {
      dexieCount: dexieTransactions.length,
      pouchdbCount: pouchTransactions.length,
      migrationNeeded: dexieTransactions.length > 0 && pouchTransactions.length === 0,
      estimatedDuration: estimateMigrationDuration(dexieTransactions.length),
    };
  } catch (error) {
    console.error('Error getting migration stats:', error);
    throw error;
  }
}

/**
 * Estimates migration duration based on transaction count.
 *
 * @param transactionCount Number of transactions to migrate
 * @returns number Estimated duration in milliseconds
 */
function estimateMigrationDuration(transactionCount: number): number {
  // Rough estimate: ~10ms per transaction (including validation)
  const baseTimePerTransaction = 10;
  const overhead = 1000; // 1 second overhead for setup/teardown

  return (transactionCount * baseTimePerTransaction) + overhead;
}

export interface MigrationStats {
  dexieCount: number;
  pouchdbCount: number;
  migrationNeeded: boolean;
  estimatedDuration: number;
}
