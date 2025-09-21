import type { Transaction } from '../../features/transactions/types';

/**
 * Data validation utilities for comparing Dexie and PouchDB results.
 *
 * This module provides functions to validate data consistency between the old
 * Dexie implementation and the new PouchDB implementation during migration.
 * It helps ensure that the migration preserves data integrity and functionality.
 */

/**
 * Validates that two transaction arrays contain the same data.
 * Compares transactions by their essential fields, ignoring PouchDB-specific metadata.
 *
 * @param dexieTransactions Transactions from Dexie repository
 * @param pouchTransactions Transactions from PouchDB repository
 * @returns ValidationResult with success status and any differences found
 */
export function validateTransactionArrays(
  dexieTransactions: Transaction[],
  pouchTransactions: Transaction[]
): ValidationResult {
  const differences: string[] = [];

  // Check array lengths
  if (dexieTransactions.length !== pouchTransactions.length) {
    differences.push(
      `Array length mismatch: Dexie ${dexieTransactions.length}, PouchDB ${pouchTransactions.length}`
    );
  }

  // Sort both arrays by ID for consistent comparison
  const sortedDexie = [...dexieTransactions].sort((a, b) => a.id.localeCompare(b.id));
  const sortedPouch = [...pouchTransactions].sort((a, b) => a.id.localeCompare(b.id));

  // Compare each transaction
  const maxLength = Math.max(sortedDexie.length, sortedPouch.length);
  for (let i = 0; i < maxLength; i++) {
    const dexieTransaction = sortedDexie[i];
    const pouchTransaction = sortedPouch[i];

    if (!dexieTransaction) {
      differences.push(`Extra transaction in PouchDB: ${pouchTransaction.id}`);
      continue;
    }

    if (!pouchTransaction) {
      differences.push(`Missing transaction in PouchDB: ${dexieTransaction.id}`);
      continue;
    }

    const transactionDiffs = validateSingleTransaction(dexieTransaction, pouchTransaction);
    if (!transactionDiffs.isValid) {
      differences.push(`Transaction ${dexieTransaction.id}: ${transactionDiffs.differences.join(', ')}`);
    }
  }

  return {
    isValid: differences.length === 0,
    differences,
  };
}

/**
 * Validates that two individual transactions are equivalent.
 * Compares all essential fields while allowing for minor timestamp differences.
 *
 * @param dexieTransaction Transaction from Dexie
 * @param pouchTransaction Transaction from PouchDB
 * @returns ValidationResult with success status and field-level differences
 */
export function validateSingleTransaction(
  dexieTransaction: Transaction,
  pouchTransaction: Transaction
): ValidationResult {
  const differences: string[] = [];

  // Essential fields that must match exactly
  const exactMatchFields: (keyof Transaction)[] = [
    'id',
    'description',
    'amount',
    'currency',
    'type',
    'category',
    'date',
  ];

  for (const field of exactMatchFields) {
    if (dexieTransaction[field] !== pouchTransaction[field]) {
      differences.push(
        `${field}: Dexie="${dexieTransaction[field]}", PouchDB="${pouchTransaction[field]}"`
      );
    }
  }

  // Compare tags arrays (order independent)
  if (!arraysEqual(dexieTransaction.tags || [], pouchTransaction.tags || [])) {
    differences.push(
      `tags: Dexie=[${dexieTransaction.tags?.join(', ') || ''}], PouchDB=[${pouchTransaction.tags?.join(', ') || ''}]`
    );
  }

  // Validate timestamps (allow small differences due to processing time)
  const timestampDiffs = validateTimestamps(
    dexieTransaction.createdAt,
    dexieTransaction.updatedAt,
    pouchTransaction.createdAt,
    pouchTransaction.updatedAt
  );

  if (!timestampDiffs.isValid) {
    differences.push(...timestampDiffs.differences);
  }

  return {
    isValid: differences.length === 0,
    differences,
  };
}

/**
 * Validates timestamp consistency between implementations.
 * Allows for small differences (up to 1 second) due to processing delays.
 *
 * @param dexieCreated Dexie createdAt timestamp
 * @param dexieUpdated Dexie updatedAt timestamp
 * @param pouchCreated PouchDB createdAt timestamp
 * @param pouchUpdated PouchDB updatedAt timestamp
 * @returns ValidationResult with timestamp validation results
 */
export function validateTimestamps(
  dexieCreated: string,
  dexieUpdated: string,
  pouchCreated: string,
  pouchUpdated: string
): ValidationResult {
  const differences: string[] = [];
  const maxTimeDiff = 1000; // 1 second tolerance

  const dexieCreatedTime = new Date(dexieCreated).getTime();
  const dexieUpdatedTime = new Date(dexieUpdated).getTime();
  const pouchCreatedTime = new Date(pouchCreated).getTime();
  const pouchUpdatedTime = new Date(pouchUpdated).getTime();

  // Check createdAt timestamps
  if (Math.abs(dexieCreatedTime - pouchCreatedTime) > maxTimeDiff) {
    differences.push(
      `createdAt: Dexie="${dexieCreated}", PouchDB="${pouchCreated}" (diff: ${Math.abs(dexieCreatedTime - pouchCreatedTime)}ms)`
    );
  }

  // Check updatedAt timestamps
  if (Math.abs(dexieUpdatedTime - pouchUpdatedTime) > maxTimeDiff) {
    differences.push(
      `updatedAt: Dexie="${dexieUpdated}", PouchDB="${pouchUpdated}" (diff: ${Math.abs(dexieUpdatedTime - pouchUpdatedTime)}ms)`
    );
  }

  return {
    isValid: differences.length === 0,
    differences,
  };
}

/**
 * Generates a comprehensive validation report for migration testing.
 * Includes statistics, performance metrics, and detailed differences.
 *
 * @param validationResult Result from validateTransactionArrays
 * @param dexieTransactions Original Dexie transactions
 * @param pouchTransactions PouchDB transactions
 * @param performanceMetrics Optional performance timing data
 * @returns ValidationReport with comprehensive analysis
 */
export function generateValidationReport(
  validationResult: ValidationResult,
  dexieTransactions: Transaction[],
  pouchTransactions: Transaction[],
  performanceMetrics?: PerformanceMetrics
): ValidationReport {
  const dexieStats = calculateTransactionStats(dexieTransactions);
  const pouchStats = calculateTransactionStats(pouchTransactions);

  return {
    isValid: validationResult.isValid,
    summary: {
      totalTransactions: dexieTransactions.length,
      validationPassed: validationResult.isValid,
      differenceCount: validationResult.differences.length,
    },
    statistics: {
      dexie: dexieStats,
      pouchdb: pouchStats,
    },
    differences: validationResult.differences,
    performance: performanceMetrics,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Calculates basic statistics for a transaction array.
 *
 * @param transactions Array of transactions
 * @returns TransactionStats with counts and totals
 */
export function calculateTransactionStats(transactions: Transaction[]): TransactionStats {
  return transactions.reduce(
    (stats, transaction) => {
      stats.total++;
      if (transaction.type === 'credit') {
        stats.creditCount++;
        stats.totalCredits += transaction.amount;
      } else {
        stats.debitCount++;
        stats.totalDebits += transaction.amount;
      }
      return stats;
    },
    {
      total: 0,
      creditCount: 0,
      debitCount: 0,
      totalCredits: 0,
      totalDebits: 0,
    }
  );
}

/**
 * Compares two arrays for equality, ignoring order.
 *
 * @param arr1 First array
 * @param arr2 Second array
 * @returns boolean True if arrays contain the same elements
 */
function arraysEqual<T>(arr1: T[], arr2: T[]): boolean {
  if (arr1.length !== arr2.length) return false;

  const sorted1 = [...arr1].sort();
  const sorted2 = [...arr2].sort();

  return sorted1.every((val, index) => val === sorted2[index]);
}

// Type definitions for validation results
export interface ValidationResult {
  isValid: boolean;
  differences: string[];
}

export interface ValidationReport {
  isValid: boolean;
  summary: {
    totalTransactions: number;
    validationPassed: boolean;
    differenceCount: number;
  };
  statistics: {
    dexie: TransactionStats;
    pouchdb: TransactionStats;
  };
  differences: string[];
  performance?: PerformanceMetrics;
  timestamp: string;
}

export interface TransactionStats {
  total: number;
  creditCount: number;
  debitCount: number;
  totalCredits: number;
  totalDebits: number;
}

export interface PerformanceMetrics {
  dexieQueryTime: number;
  pouchdbQueryTime: number;
  validationTime: number;
}

/**
 * Creates a performance metrics timer helper.
 * Useful for measuring and comparing operation times between implementations.
 *
 * @returns PerformanceTimer with start/stop methods
 */
export function createPerformanceTimer(): PerformanceTimer {
  const times: Record<string, number> = {};

  return {
    start(label: string): void {
      times[`${label}_start`] = performance.now();
    },

    stop(label: string): number {
      const startTime = times[`${label}_start`];
      if (!startTime) {
        throw new Error(`Timer for "${label}" was not started`);
      }
      const duration = performance.now() - startTime;
      times[label] = duration;
      return duration;
    },

    getDuration(label: string): number {
      return times[label] || 0;
    },

    getAllDurations(): Record<string, number> {
      return Object.fromEntries(
        Object.entries(times).filter(([key]) => !key.endsWith('_start'))
      );
    },
  };
}

export interface PerformanceTimer {
  start(label: string): void;
  stop(label: string): number;
  getDuration(label: string): number;
  getAllDurations(): Record<string, number>;
}
