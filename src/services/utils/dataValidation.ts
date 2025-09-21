import type { Transaction } from "../../features/transactions/types";
import { RepositoryFactory } from "../repos/RepositoryFactory";

/**
 * Data Validation Utility for Migration Verification
 *
 * This utility provides functions to validate data consistency between
 * different database implementations during migration and testing phases.
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
 * Validates transaction data integrity
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
 * Validates a collection of transactions
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
 * Compares transactions between two implementations
 */
export async function compareImplementations(
  sourceImpl: "dexie" | "pouchdb",
  targetImpl: "dexie" | "pouchdb",
): Promise<ComparisonResult> {
  if (sourceImpl === targetImpl) {
    throw new Error("Source and target implementations must be different");
  }

  // Get transactions from source implementation
  RepositoryFactory.setImplementation(sourceImpl);
  const sourceRepo = RepositoryFactory.getTransactionRepository();
  const sourceTransactions = await sourceRepo.getAll();

  // Get transactions from target implementation
  RepositoryFactory.setImplementation(targetImpl);
  const targetRepo = RepositoryFactory.getTransactionRepository();
  const targetTransactions = await targetRepo.getAll();

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
 * Validates data consistency for a specific implementation
 */
export async function validateDataConsistency(
  implementation: "dexie" | "pouchdb",
): Promise<ValidationResult> {
  RepositoryFactory.setImplementation(implementation);
  const repo = RepositoryFactory.getTransactionRepository();
  const transactions = await repo.getAll();

  return validateTransactions(transactions);
}

/**
 * Performs comprehensive data validation across both implementations
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
 * Utility function to generate a detailed report
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
