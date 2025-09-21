/**
 * PouchDB Service Layer - Phase 2 Implementation
 *
 * This module exports all PouchDB-related functionality implemented in Phase 2
 * of the migration from Dexie to PouchDB + CouchDB sync architecture.
 *
 * Exports include:
 * - Core configuration and connection management
 * - Schema definitions and type conversions
 * - Repository implementations
 * - Migration and validation utilities
 * - Development and testing tools
 * - Logging infrastructure
 * - Initialization and setup utilities
 */

// Initialization and setup utilities
export {
  isPouchDBAvailable,
  isFindPluginAvailable,
  initializePouchDB,
  verifyPouchDBSetup,
  testPouchDBFunctionality,
  getPouchDBSetupInfo,
  logPouchDBSetup,
} from "./init";

// Core PouchDB configuration and types
export {
  createLocalDB,
  createRemoteDB,
  POUCHDB_CONFIG,
  REMOTE_COUCHDB_CONFIG,
  PouchDB,
  type Database,
} from "./config";

// Schema definitions and document types
export {
  type PouchTransaction,
  type PouchCategory,
  type PouchDocument,
  isPouchTransaction,
  isPouchCategory,
  generateTransactionId,
  generateCategoryId,
  transactionToPouchDoc,
  pouchDocToTransaction,
  categoryToPouchDoc,
  pouchDocToCategory,
} from "./schema";

// Connection management
export { PouchDBConnection, pouchDBConnection } from "./PouchDBConnection";

// Base repository class
export { BasePouchRepository } from "./BasePouchRepository";

// Repository implementations
export { PouchTransactionRepository } from "../repos/PouchTransactionRepository";

export { PouchCategoryRepository } from "../repos/PouchCategoryRepository";

// Migration utilities
export {
  migrateTransactions,
  isMigrationNeeded,
  performDryRun,
  clearPouchDBData,
  validateDataConsistency,
  getMigrationStats,
  type MigrationProgress,
  type MigrationResult,
  type MigrationOptions,
  type MigrationStats,
} from "./migration";

// Validation utilities
export {
  validateTransactionArrays,
  validateSingleTransaction,
  validateTimestamps,
  generateValidationReport,
  calculateTransactionStats,
  createPerformanceTimer,
  type ValidationResult,
  type ValidationReport,
  type TransactionStats,
  type PerformanceMetrics,
  type PerformanceTimer,
} from "./validation";

// Testing and development utilities
export {
  runPouchDBTestSuite,
  testCategoryOperations,
  cleanupTestData,
  logDatabaseInfo,
  smokeTest,
  type TestResult,
  type PouchDBTestSuite,
} from "./test-utils";

// Logging infrastructure
export {
  PouchDBLogger,
  pouchDBLogger,
  logOperation,
  logError,
  logInfo,
  type LogEntry,
  type LoggerConfig,
} from "./logger";

// Re-export types from features for convenience
export type { Transaction, Category } from "../../features/transactions/types";
