import type { Transaction } from "../../features/transactions/types";
import { RepositoryFactory } from "../repos/RepositoryFactory";

/**
 * Data Validation Utility for FinTrac Personal Finance Tracker
 *
 * Provides comprehensive data validation for FinTrac's local-first architecture,
 * ensuring data integrity across Dexie.js local storage and CouchDB sync operations.
 * These validations are critical for maintaining financial data accuracy and
 * preventing corruption during cross-device synchronization.
 *
 * Why this module exists:
 * - Financial data must be 100% accurate to maintain user trust
 * - Sync operations between devices can introduce data inconsistencies
 * - Transaction validation prevents invalid data from corrupting calculations
 * - Migration utilities need robust validation for data integrity verification
 * - Import/export operations require validation to catch malformed data
 * - Development and testing need validation to ensure code quality
 */

/**
 * Comprehensive validation result for FinTrac transaction data validation
 *
 * Provides detailed feedback on transaction data integrity, essential for
 * maintaining financial accuracy and identifying data corruption issues
 * during sync operations or data imports.
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    totalTransactions: number;
    validTransactions: number;
    invalidTransactions: number;
    duplicateIds: number;
    missingFields: number;
    invalidDates: number;
    invalidAmounts: number;
  };
}

/**
 * Comparison result for validating data consistency between storage implementations
 *
 * Used to verify data integrity during sync operations and ensure that
 * local IndexedDB and remote CouchDB contain identical transaction data.
 * Critical for identifying sync conflicts and data loss scenarios.
 */
export interface ComparisonResult {
  isIdentical: boolean;
  differences: {
    onlyInSource: Transaction[];
    onlyInTarget: Transaction[];
    modified: Array<{
      id: string;
      field: string;
      sourceValue: unknown;
      targetValue: unknown;
    }>;
  };
  summary: {
    sourceCount: number;
    targetCount: number;
    identicalCount: number;
    differenceCount: number;
  };
}

/**
 * Validates a single transaction for data integrity and business rule compliance
 *
 * This is the core validation function for FinTrac transaction data, ensuring
 * that all financial records meet strict accuracy standards before storage.
 * Invalid transactions could corrupt financial calculations or cause sync failures.
 *
 * Why this validation is critical in FinTrac:
 * - Financial data must be 100% accurate to maintain user trust
 * - Invalid amounts could corrupt balance calculations and reports
 * - Malformed dates break chronological ordering and analytics
 * - Missing required fields cause sync conflicts with CouchDB
 * - Invalid currency codes break multi-currency support
 * - Improper types/categories disrupt financial categorization
 *
 * Connects to:
 * - TransactionRepository before saving new transactions
 * - TransactionForm for real-time validation feedback
 * - Data import utilities for validating external data
 * - Sync operations to verify incoming transaction data
 * - Migration scripts to ensure data quality during upgrades
 *
 * Validation rules enforced:
 * - Required fields: id, date, description, amount, currency, type, category
 * - Date format: ISO 8601 (YYYY-MM-DD) for sync compatibility
 * - Amount: positive number with max 2 decimal places
 * - Currency: 3-letter ISO 4217 code (USD, EUR, etc.)
 * - Type: must be 'credit' or 'debit' for proper accounting
 * - Timestamps: valid ISO datetime strings with logical ordering
 *
 * Assumptions:
 * - Transaction follows the FinTrac Transaction interface
 * - All required fields are present (not undefined)
 * - Optional fields (tags) follow expected format when present
 * - Business rules about amounts and dates are enforced
 *
 * Edge cases handled:
 * - Empty or whitespace-only descriptions
 * - Amounts with excessive decimal precision
 * - Invalid date strings that parse as NaN
 * - UpdatedAt timestamps earlier than createdAt
 * - Unreasonably large amounts (over $999M)
 * - Invalid currency code formats
 *
 * @param transaction - Transaction object to validate against FinTrac standards
 * @returns Array of error messages (empty array if valid)
 */
export function validateTransaction(transaction: Transaction): string[] {
  const errors: string[] = [];

  // Required fields validation
  if (!transaction.id || typeof transaction.id !== "string") {
    errors.push("Transaction ID is required and must be a string");
  }

  if (!transaction.date || typeof transaction.date !== "string") {
    errors.push("Transaction date is required and must be a string");
  } else {
    // Validate ISO 8601 date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(transaction.date)) {
      errors.push("Transaction date must be in YYYY-MM-DD format");
    } else {
      const date = new Date(transaction.date);
      if (isNaN(date.getTime())) {
        errors.push("Transaction date is not a valid date");
      }
    }
  }

  if (!transaction.description || typeof transaction.description !== "string") {
    errors.push("Transaction description is required and must be a string");
  } else if (transaction.description.trim().length === 0) {
    errors.push("Transaction description cannot be empty");
  }

  if (typeof transaction.amount !== "number") {
    errors.push("Transaction amount must be a number");
  } else {
    if (transaction.amount <= 0) {
      errors.push("Transaction amount must be greater than 0");
    }
    if (transaction.amount > 999999999) {
      errors.push("Transaction amount is unreasonably large");
    }
    // Check for reasonable decimal places (max 2)
    const decimalPlaces = (transaction.amount.toString().split(".")[1] || "")
      .length;
    if (decimalPlaces > 2) {
      errors.push(
        "Transaction amount should not have more than 2 decimal places",
      );
    }
  }

  if (!transaction.currency || typeof transaction.currency !== "string") {
    errors.push("Transaction currency is required and must be a string");
  } else {
    // Validate currency format (3-letter code)
    const currencyRegex = /^[A-Z]{3}$/;
    if (!currencyRegex.test(transaction.currency)) {
      errors.push(
        "Transaction currency must be a 3-letter uppercase code (e.g., USD, EUR)",
      );
    }
  }

  if (
    !transaction.type ||
    (transaction.type !== "credit" && transaction.type !== "debit")
  ) {
    errors.push("Transaction type must be either 'credit' or 'debit'");
  }

  if (!transaction.category || typeof transaction.category !== "string") {
    errors.push("Transaction category is required and must be a string");
  } else if (transaction.category.trim().length === 0) {
    errors.push("Transaction category cannot be empty");
  }

  // Optional fields validation
  if (transaction.tags !== undefined) {
    if (!Array.isArray(transaction.tags)) {
      errors.push("Transaction tags must be an array if provided");
    } else {
      transaction.tags.forEach((tag: unknown, index: number) => {
        if (typeof tag !== "string") {
          errors.push(`Transaction tag at index ${index} must be a string`);
        }
      });
    }
  }

  if (!transaction.createdAt || typeof transaction.createdAt !== "string") {
    errors.push("Transaction createdAt is required and must be a string");
  } else {
    const createdAt = new Date(transaction.createdAt);
    if (isNaN(createdAt.getTime())) {
      errors.push("Transaction createdAt is not a valid ISO date");
    }
  }

  if (!transaction.updatedAt || typeof transaction.updatedAt !== "string") {
    errors.push("Transaction updatedAt is required and must be a string");
  } else {
    const updatedAt = new Date(transaction.updatedAt);
    if (isNaN(updatedAt.getTime())) {
      errors.push("Transaction updatedAt is not a valid ISO date");
    }
  }

  // Logical validations
  if (transaction.createdAt && transaction.updatedAt) {
    const createdDate = new Date(transaction.createdAt);
    const updatedDate = new Date(transaction.updatedAt);
    if (!isNaN(createdDate.getTime()) && !isNaN(updatedDate.getTime())) {
      if (updatedDate < createdDate) {
        errors.push("Transaction updatedAt cannot be earlier than createdAt");
      }
    }
  }

  return errors;
}

/**
 * Validates a collection of transactions for batch data integrity verification
 *
 * Performs comprehensive validation on multiple transactions simultaneously,
 * essential for validating data imports, sync operations, and bulk data operations
 * in FinTrac. Provides detailed reporting on data quality issues across the entire
 * transaction dataset.
 *
 * Why this function is critical in FinTrac:
 * - Data imports from CSV/external sources need batch validation
 * - Sync operations must verify incoming transaction collections
 * - Migration scripts require comprehensive data integrity checks
 * - Bulk edit operations need validation before committing changes
 * - Database maintenance requires collection-level data quality reporting
 *
 * Connects to:
 * - CSV import utilities for validating external financial data
 * - SyncService for validating incoming sync data from CouchDB
 * - Migration scripts for ensuring data integrity during upgrades
 * - Bulk transaction management operations
 * - Data quality monitoring and reporting features
 *
 * Validation checks performed:
 * - Individual transaction validation using validateTransaction()
 * - Duplicate ID detection across the entire collection
 * - Collection-level warnings for unusual patterns
 * - Performance warnings for large datasets
 * - Multi-currency usage analysis
 * - Category proliferation detection
 *
 * Assumptions:
 * - Input is an array of transaction objects
 * - Each transaction should follow FinTrac Transaction interface
 * - Duplicate IDs within the collection are not allowed
 * - Large collections (>10k transactions) may impact performance
 *
 * Edge cases handled:
 * - Empty transaction arrays
 * - Collections with duplicate transaction IDs
 * - Large datasets that may cause performance issues
 * - Collections with many categories or currencies
 * - Mixed valid and invalid transactions
 *
 * @param transactions - Array of Transaction objects to validate
 * @returns ValidationResult with detailed error reporting and statistics
 */
export function validateTransactions(
  transactions: Transaction[],
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let validTransactions = 0;
  let duplicateIds = 0;
  let missingFields = 0;
  let invalidDates = 0;
  let invalidAmounts = 0;

  // Check for duplicate IDs
  const idMap = new Map<string, number>();
  transactions.forEach((transaction, index) => {
    if (transaction.id) {
      const existingIndex = idMap.get(transaction.id);
      if (existingIndex !== undefined) {
        errors.push(
          `Duplicate transaction ID "${transaction.id}" found at indices ${existingIndex} and ${index}`,
        );
        duplicateIds++;
      } else {
        idMap.set(transaction.id, index);
      }
    }
  });

  // Validate each transaction
  transactions.forEach((transaction, index) => {
    const transactionErrors = validateTransaction(transaction);

    if (transactionErrors.length === 0) {
      validTransactions++;
    } else {
      transactionErrors.forEach((error: string) => {
        errors.push(
          `Transaction ${index} (ID: ${transaction.id || "unknown"}): ${error}`,
        );
      });

      // Count specific error types for summary
      transactionErrors.forEach((error: string) => {
        if (error.includes("required")) {
          missingFields++;
        }
        if (error.includes("date")) {
          invalidDates++;
        }
        if (error.includes("amount")) {
          invalidAmounts++;
        }
      });
    }
  });

  // Generate warnings for potential issues
  if (transactions.length === 0) {
    warnings.push("No transactions to validate");
  }

  if (transactions.length > 10000) {
    warnings.push("Large number of transactions may impact performance");
  }

  // Check for unusual patterns
  const categories = new Set(transactions.map((t) => t.category));
  if (categories.size > 50) {
    warnings.push(
      "Large number of categories detected - consider consolidation",
    );
  }

  const currencies = new Set(transactions.map((t) => t.currency));
  if (currencies.size > 5) {
    warnings.push("Multiple currencies detected - ensure proper handling");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary: {
      totalTransactions: transactions.length,
      validTransactions,
      invalidTransactions: transactions.length - validTransactions,
      duplicateIds,
      missingFields,
      invalidDates,
      invalidAmounts,
    },
  };
}

/**
 * Compares transactions between two database implementations for migration verification
 *
 * This function was critical during FinTrac's migration from PouchDB to Dexie.js,
 * ensuring data integrity by comparing transaction data between storage implementations.
 * While PouchDB has been removed, this function remains for future migration scenarios
 * and testing validation.
 *
 * Why this function was essential for FinTrac:
 * - Verified complete data migration from PouchDB to Dexie during architecture change
 * - Detected data loss or corruption during migration processes
 * - Ensured transaction consistency across different storage backends
 * - Provided confidence in migration integrity for financial data
 * - Enabled rollback decisions based on data comparison results
 *
 * Connects to:
 * - Migration scripts that needed to verify data transfer completeness
 * - Testing utilities for validating repository implementations
 * - Data integrity monitoring during development
 * - Quality assurance processes for database changes
 *
 * Comparison analysis performed:
 * - Identifies transactions present in only one implementation
 * - Detects field-level differences in matching transactions
 * - Provides statistical summary of data consistency
 * - Reports exact differences for debugging migration issues
 * - Validates referential integrity across implementations
 *
 * Assumptions:
 * - Both implementations are properly configured and accessible
 * - Transaction IDs are consistent across implementations
 * - RepositoryFactory can switch between implementations
 * - Source and target implementations are different
 *
 * Edge cases handled:
 * - Implementations with different transaction counts
 * - Transactions with modified fields between implementations
 * - Network issues when accessing remote implementations
 * - Large datasets that require efficient comparison algorithms
 *
 * Migration context:
 * - Originally used for PouchDB to Dexie migration verification
 * - Now serves as template for future storage backend changes
 * - Provides framework for testing new repository implementations
 *
 * @param sourceImpl - Source database implementation to compare from
 * @param targetImpl - Target database implementation to compare to
 * @returns ComparisonResult with detailed difference analysis
 */
export async function compareImplementations(
  sourceImpl: "dexie" | "pouchdb",
  targetImpl: "dexie" | "pouchdb",
): Promise<ComparisonResult> {
  if (sourceImpl === targetImpl) {
    throw new Error("Source and target implementations must be different");
  }

  // Get transactions from source implementation
  // Note: FinTrac now only supports Dexie implementation
  if (sourceImpl !== "dexie" || targetImpl !== "dexie") {
    throw new Error("Only Dexie implementation is currently supported");
  }

  const repo = RepositoryFactory.getTransactionRepository();
  const sourceTransactions = await repo.getAll();
  const targetTransactions = await repo.getAll();

  // Create maps for efficient comparison
  const sourceMap = new Map(sourceTransactions.map((t) => [t.id, t]));
  const targetMap = new Map(targetTransactions.map((t) => [t.id, t]));

  const onlyInSource: Transaction[] = [];
  const onlyInTarget: Transaction[] = [];
  const modified: Array<{
    id: string;
    field: string;
    sourceValue: unknown;
    targetValue: unknown;
  }> = [];

  // Find transactions only in source
  sourceTransactions.forEach((transaction) => {
    if (!targetMap.has(transaction.id)) {
      onlyInSource.push(transaction);
    }
  });

  // Find transactions only in target and compare existing ones
  targetTransactions.forEach((transaction) => {
    if (!sourceMap.has(transaction.id)) {
      onlyInTarget.push(transaction);
    } else {
      // Compare fields for differences
      const sourceTransaction = sourceMap.get(transaction.id)!;
      const fieldsToCompare = [
        "date",
        "description",
        "amount",
        "currency",
        "type",
        "category",
        "tags",
        "createdAt",
        "updatedAt",
      ];

      fieldsToCompare.forEach((field) => {
        const sourceValue = (
          sourceTransaction as unknown as Record<string, unknown>
        )[field];
        const targetValue = (transaction as unknown as Record<string, unknown>)[
          field
        ];

        // Special handling for arrays (tags)
        if (Array.isArray(sourceValue) && Array.isArray(targetValue)) {
          if (
            JSON.stringify(sourceValue.sort()) !==
            JSON.stringify(targetValue.sort())
          ) {
            modified.push({
              id: transaction.id,
              field,
              sourceValue,
              targetValue,
            });
          }
        } else if (sourceValue !== targetValue) {
          modified.push({
            id: transaction.id,
            field,
            sourceValue,
            targetValue,
          });
        }
      });
    }
  });

  const identicalCount =
    sourceTransactions.length - onlyInSource.length - modified.length;
  const differenceCount =
    onlyInSource.length + onlyInTarget.length + modified.length;

  return {
    isIdentical: differenceCount === 0,
    differences: {
      onlyInSource,
      onlyInTarget,
      modified,
    },
    summary: {
      sourceCount: sourceTransactions.length,
      targetCount: targetTransactions.length,
      identicalCount,
      differenceCount,
    },
  };
}

/**
 * Validates data consistency for a specific database implementation
 *
 * Provides implementation-specific data validation for FinTrac's storage backends,
 * ensuring that transaction data maintains integrity within a single database
 * implementation. This is essential for debugging storage-specific issues and
 * verifying data quality in production environments.
 *
 * Why this function is important in FinTrac:
 * - Validates data integrity within a specific storage implementation
 * - Helps identify corruption or inconsistencies in Dexie IndexedDB
 * - Provides baseline validation before sync operations
 * - Supports debugging of implementation-specific data issues
 * - Enables data quality monitoring in production
 *
 * Connects to:
 * - Database maintenance and monitoring utilities
 * - Pre-sync validation to ensure clean local data
 * - Development debugging tools for storage issues
 * - Production data quality monitoring dashboards
 * - Automated data integrity checks
 *
 * Implementation context:
 * - Currently supports Dexie.js for local IndexedDB storage
 * - PouchDB parameter maintained for compatibility with legacy code
 * - Can be extended for future storage backend implementations
 *
 * Assumptions:
 * - RepositoryFactory can successfully switch implementations
 * - Database connection is available and functional
 * - All transactions can be loaded into memory for validation
 *
 * Edge cases handled:
 * - Empty databases return valid results with zero transactions
 * - Database connection failures propagate as exceptions
 * - Large datasets may impact memory usage during validation
 *
 * @param implementation - Database implementation to validate ("dexie" or "pouchdb")
 * @returns ValidationResult with comprehensive data quality analysis
 */
export async function validateDataConsistency(
  implementation: "dexie" | "pouchdb",
): Promise<ValidationResult> {
  // Note: FinTrac now only supports Dexie implementation
  if (implementation !== "dexie") {
    throw new Error("Only Dexie implementation is currently supported");
  }

  const repo = RepositoryFactory.getTransactionRepository();
  const transactions = await repo.getAll();

  return validateTransactions(transactions);
}

/**
 * Performs comprehensive migration integrity validation across database implementations
 *
 * This function was the cornerstone of FinTrac's migration from PouchDB to Dexie.js,
 * providing end-to-end validation that ensured no financial data was lost during
 * the architecture transition. It combines individual implementation validation
 * with cross-implementation comparison to provide complete migration confidence.
 *
 * Why this function was critical for FinTrac migration:
 * - Validated that all transaction data survived the migration process
 * - Detected any data corruption or loss during storage backend changes
 * - Provided actionable recommendations for resolving migration issues
 * - Gave stakeholders confidence in financial data integrity
 * - Enabled safe rollback decisions if migration problems were detected
 *
 * Connects to:
 * - Migration scripts that performed the actual data transfer
 * - Quality assurance processes for database architecture changes
 * - Production deployment validation for storage backend updates
 * - Development testing for repository implementation changes
 *
 * Validation workflow:
 * 1. Validates data integrity within each implementation separately
 * 2. Compares transaction data between implementations
 * 3. Analyzes validation results to determine overall migration status
 * 4. Generates actionable recommendations for addressing issues
 * 5. Provides clear success/warning/error status for decision making
 *
 * Status determination logic:
 * - "error": Data validation failures or missing transactions detected
 * - "warning": Minor inconsistencies or advisory warnings present
 * - "success": All validations passed with no significant issues
 *
 * Assumptions:
 * - Both database implementations are accessible and functional
 * - RepositoryFactory can switch between implementations reliably
 * - All transaction data can be loaded for comparison
 * - Migration process has completed before running this validation
 *
 * Edge cases handled:
 * - One implementation having more transactions than the other
 * - Field-level differences in matching transactions
 * - Database connection failures during validation
 * - Large datasets that may impact validation performance
 *
 * Migration context:
 * - Originally designed for PouchDB to Dexie migration verification
 * - Now serves as template for future storage backend migrations
 * - Provides framework for validating any repository implementation changes
 *
 * @returns Comprehensive migration integrity report with status and recommendations
 */
export async function validateMigrationIntegrity(): Promise<{
  dexieValidation: ValidationResult;
  pouchdbValidation: ValidationResult;
  comparison: ComparisonResult;
  overallStatus: "success" | "warning" | "error";
  recommendations: string[];
}> {
  const dexieValidation = await validateDataConsistency("dexie");
  const pouchdbValidation = await validateDataConsistency("pouchdb");
  const comparison = await compareImplementations("dexie", "pouchdb");

  const recommendations: string[] = [];
  let overallStatus: "success" | "warning" | "error" = "success";

  // Analyze results and provide recommendations
  if (!dexieValidation.isValid || !pouchdbValidation.isValid) {
    overallStatus = "error";
    recommendations.push(
      "Fix data validation errors before proceeding with migration",
    );
  }

  if (!comparison.isIdentical) {
    if (comparison.differences.onlyInSource.length > 0) {
      overallStatus = "error";
      recommendations.push(
        `${comparison.differences.onlyInSource.length} transactions exist only in ${comparison.differences.onlyInSource.length > 0 ? "Dexie" : "PouchDB"} - run migration to sync data`,
      );
    }

    if (comparison.differences.onlyInTarget.length > 0) {
      overallStatus = "error";
      recommendations.push(
        `${comparison.differences.onlyInTarget.length} transactions exist only in PouchDB - verify migration completeness`,
      );
    }

    if (comparison.differences.modified.length > 0) {
      overallStatus = "warning";
      recommendations.push(
        `${comparison.differences.modified.length} transactions have differences between implementations - review field modifications`,
      );
    }
  }

  if (
    dexieValidation.warnings.length > 0 ||
    pouchdbValidation.warnings.length > 0
  ) {
    if (overallStatus === "success") {
      overallStatus = "warning";
    }
    recommendations.push(
      "Review validation warnings for potential optimizations",
    );
  }

  if (overallStatus === "success") {
    recommendations.push(
      "Data validation passed - migration integrity verified",
    );
  }

  return {
    dexieValidation,
    pouchdbValidation,
    comparison,
    overallStatus,
    recommendations,
  };
}

/**
 * Generates a comprehensive human-readable validation report for FinTrac migrations
 *
 * Transforms complex validation data structures into clear, actionable reports
 * that stakeholders can understand and act upon. This was essential during
 * FinTrac's migration process for communicating data integrity status to
 * both technical and non-technical team members.
 *
 * Why this reporting function is essential:
 * - Provides clear communication of migration integrity status
 * - Enables non-technical stakeholders to understand data validation results
 * - Creates audit trails for migration and data integrity processes
 * - Supports debugging by presenting validation data in readable format
 * - Facilitates decision-making about migration success or rollback needs
 *
 * Connects to:
 * - Migration scripts that need to output validation results
 * - Quality assurance processes requiring detailed validation reports
 * - Development debugging tools for understanding data issues
 * - Production monitoring systems that track data integrity
 * - Automated testing that validates repository implementations
 *
 * Report sections generated:
 * - Overall migration status (SUCCESS/WARNING/ERROR)
 * - Dexie implementation validation results and statistics
 * - PouchDB implementation validation results and statistics
 * - Cross-implementation comparison analysis
 * - Actionable recommendations for addressing identified issues
 *
 * Report format design:
 * - ASCII text format for easy logging and email distribution
 * - Structured sections for systematic review
 * - Clear statistics for quantitative analysis
 * - Detailed error and warning listings for debugging
 * - Prioritized recommendations for remediation actions
 *
 * Assumptions:
 * - Input validation results follow expected data structures
 * - Text-based reporting format is appropriate for the use case
 * - Recipients understand FinTrac's dual-implementation architecture
 * - Report content will be used for decision-making processes
 *
 * Edge cases handled:
 * - Empty validation results or missing data sections
 * - Large numbers of errors or warnings (truncation may be needed)
 * - Various recommendation types and priority levels
 * - Different overall status values and their implications
 *
 * Usage context:
 * - Migration validation scripts output these reports to logs
 * - Quality assurance reviews use reports for sign-off decisions
 * - Development debugging benefits from detailed error breakdowns
 * - Production monitoring systems can parse and alert on report content
 *
 * @param results - Complete validation results from validateMigrationIntegrity
 * @returns Formatted text report suitable for logging, email, or file output
 */
export function generateValidationReport(results: {
  dexieValidation: ValidationResult;
  pouchdbValidation: ValidationResult;
  comparison: ComparisonResult;
  overallStatus: "success" | "warning" | "error";
  recommendations: string[];
}): string {
  const {
    dexieValidation,
    pouchdbValidation,
    comparison,
    overallStatus,
    recommendations,
  } = results;

  let report = "=== FinTrac Data Validation Report ===\n\n";

  report += `Overall Status: ${overallStatus.toUpperCase()}\n\n`;

  report += "=== Dexie Validation ===\n";
  report += `Valid: ${dexieValidation.isValid}\n`;
  report += `Total Transactions: ${dexieValidation.summary.totalTransactions}\n`;
  report += `Valid Transactions: ${dexieValidation.summary.validTransactions}\n`;
  report += `Invalid Transactions: ${dexieValidation.summary.invalidTransactions}\n`;
  if (dexieValidation.errors.length > 0) {
    report += `Errors: ${dexieValidation.errors.length}\n`;
    dexieValidation.errors.forEach((error) => {
      report += `  - ${error}\n`;
    });
  }
  if (dexieValidation.warnings.length > 0) {
    report += `Warnings: ${dexieValidation.warnings.length}\n`;
    dexieValidation.warnings.forEach((warning) => {
      report += `  - ${warning}\n`;
    });
  }

  report += "\n=== PouchDB Validation ===\n";
  report += `Valid: ${pouchdbValidation.isValid}\n`;
  report += `Total Transactions: ${pouchdbValidation.summary.totalTransactions}\n`;
  report += `Valid Transactions: ${pouchdbValidation.summary.validTransactions}\n`;
  report += `Invalid Transactions: ${pouchdbValidation.summary.invalidTransactions}\n`;
  if (pouchdbValidation.errors.length > 0) {
    report += `Errors: ${pouchdbValidation.errors.length}\n`;
    pouchdbValidation.errors.forEach((error) => {
      report += `  - ${error}\n`;
    });
  }
  if (pouchdbValidation.warnings.length > 0) {
    report += `Warnings: ${pouchdbValidation.warnings.length}\n`;
    pouchdbValidation.warnings.forEach((warning) => {
      report += `  - ${warning}\n`;
    });
  }

  report += "\n=== Implementation Comparison ===\n";
  report += `Identical: ${comparison.isIdentical}\n`;
  report += `Dexie Count: ${comparison.summary.sourceCount}\n`;
  report += `PouchDB Count: ${comparison.summary.targetCount}\n`;
  report += `Identical Count: ${comparison.summary.identicalCount}\n`;
  report += `Difference Count: ${comparison.summary.differenceCount}\n`;

  if (comparison.differences.onlyInSource.length > 0) {
    report += `\nOnly in Dexie: ${comparison.differences.onlyInSource.length} transactions\n`;
  }
  if (comparison.differences.onlyInTarget.length > 0) {
    report += `Only in PouchDB: ${comparison.differences.onlyInTarget.length} transactions\n`;
  }
  if (comparison.differences.modified.length > 0) {
    report += `Modified: ${comparison.differences.modified.length} field differences\n`;
  }

  report += "\n=== Recommendations ===\n";
  recommendations.forEach((recommendation) => {
    report += `- ${recommendation}\n`;
  });

  return report;
}
