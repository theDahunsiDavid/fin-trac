import { PouchTransactionRepository } from "../repos/PouchTransactionRepository";
import { PouchCategoryRepository } from "../repos/PouchCategoryRepository";
import {
  migrateTransactions,
  validateDataConsistency,
  getMigrationStats,
} from "./migration";
import { createPerformanceTimer } from "./validation";
import { verifyPouchDBSetup, logPouchDBSetup } from "./init";

/**
 * Test utilities for PouchDB operations and Phase 2 validation.
 *
 * This module provides functions to test and validate the PouchDB implementation
 * during Phase 2 development. It includes operations testing, performance benchmarks,
 * and integration validation between Dexie and PouchDB repositories.
 */

export interface TestResult {
  success: boolean;
  operation: string;
  duration: number;
  error?: string;
  data?: unknown;
}

export interface PouchDBTestSuite {
  basicOperations: TestResult[];
  performanceTests: TestResult[];
  migrationTests: TestResult[];
  validationTests: TestResult[];
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    duration: number;
  };
}

/**
 * Runs a comprehensive test suite for PouchDB operations.
 * Validates that all Phase 2 functionality works correctly.
 *
 * @returns Promise<PouchDBTestSuite> Complete test results
 */
export async function runPouchDBTestSuite(): Promise<PouchDBTestSuite> {
  const timer = createPerformanceTimer();
  timer.start("full_suite");

  console.log("🧪 Starting PouchDB Test Suite...");

  // Verify PouchDB setup before running tests
  try {
    verifyPouchDBSetup();
    console.log("✅ PouchDB setup verification passed");
  } catch (error) {
    console.error("❌ PouchDB setup verification failed:", error);
    logPouchDBSetup();
    throw new Error(`PouchDB setup incomplete: ${(error as Error).message}`);
  }

  const basicOperations = await testBasicOperations();
  const performanceTests = await testPerformance();
  const migrationTests = await testMigration();
  const validationTests = await testValidation();

  const allTests = [
    ...basicOperations,
    ...performanceTests,
    ...migrationTests,
    ...validationTests,
  ];

  const totalDuration = timer.stop("full_suite");
  const passed = allTests.filter((test) => test.success).length;
  const failed = allTests.length - passed;

  const summary = {
    totalTests: allTests.length,
    passed,
    failed,
    duration: totalDuration,
  };

  console.log(
    `✅ Test Suite Complete: ${passed}/${allTests.length} tests passed`,
  );

  return {
    basicOperations,
    performanceTests,
    migrationTests,
    validationTests,
    summary,
  };
}

/**
 * Tests basic CRUD operations for transactions.
 *
 * @returns Promise<TestResult[]> Results of basic operation tests
 */
async function testBasicOperations(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const repo = new PouchTransactionRepository();

  console.log("📋 Testing basic CRUD operations...");

  // Test 1: Create transaction
  results.push(
    await runTest("create_transaction", async () => {
      const testTransaction = {
        date: new Date().toISOString().split("T")[0],
        description: "Test Transaction",
        amount: 100.5,
        currency: "USD",
        type: "debit" as const,
        category: "Testing",
      };

      await repo.create(testTransaction);
      return { created: true };
    }),
  );

  // Test 2: Get all transactions
  results.push(
    await runTest("get_all_transactions", async () => {
      const transactions = await repo.getAll();
      return { count: transactions.length, transactions };
    }),
  );

  // Test 3: Get by type
  results.push(
    await runTest("get_by_type", async () => {
      const debitTransactions = await repo.getTransactionsByType("debit");
      return { count: debitTransactions.length };
    }),
  );

  // Test 4: Get by category
  results.push(
    await runTest("get_by_category", async () => {
      const testingTransactions =
        await repo.getTransactionsByCategory("Testing");
      return { count: testingTransactions.length };
    }),
  );

  // Test 5: Date range query
  results.push(
    await runTest("get_by_date_range", async () => {
      const today = new Date().toISOString().split("T")[0];
      const transactions = await repo.getTransactionsByDateRange(today, today);
      return { count: transactions.length };
    }),
  );

  // Test 6: Recent transactions
  results.push(
    await runTest("get_recent", async () => {
      const recentTransactions = await repo.getRecentTransactions(5);
      return { count: recentTransactions.length };
    }),
  );

  return results;
}

/**
 * Tests performance characteristics of PouchDB operations.
 *
 * @returns Promise<TestResult[]> Results of performance tests
 */
async function testPerformance(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const repo = new PouchTransactionRepository();

  console.log("⚡ Testing performance...");

  // Test 1: Bulk create performance
  results.push(
    await runTest("bulk_create_performance", async () => {
      const timer = createPerformanceTimer();
      const batchSize = 10;

      timer.start("bulk_create");

      for (let i = 0; i < batchSize; i++) {
        await repo.create({
          date: new Date().toISOString().split("T")[0],
          description: `Performance Test Transaction ${i}`,
          amount: Math.random() * 1000,
          currency: "USD",
          type: Math.random() > 0.5 ? "credit" : "debit",
          category: "Performance",
        });
      }

      const duration = timer.stop("bulk_create");

      return {
        batchSize,
        totalDuration: duration,
        avgPerTransaction: duration / batchSize,
      };
    }),
  );

  // Test 2: Query performance
  results.push(
    await runTest("query_performance", async () => {
      const timer = createPerformanceTimer();

      timer.start("get_all");
      const allTransactions = await repo.getAll();
      const getAllTime = timer.stop("get_all");

      timer.start("get_by_type");
      await repo.getTransactionsByType("debit");
      const getByTypeTime = timer.stop("get_by_type");

      timer.start("get_recent");
      await repo.getRecentTransactions(10);
      const getRecentTime = timer.stop("get_recent");

      return {
        transactionCount: allTransactions.length,
        getAllTime,
        getByTypeTime,
        getRecentTime,
      };
    }),
  );

  return results;
}

/**
 * Tests migration functionality.
 *
 * @returns Promise<TestResult[]> Results of migration tests
 */
async function testMigration(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  console.log("🔄 Testing migration functionality...");

  // Test 1: Migration stats
  results.push(
    await runTest("migration_stats", async () => {
      const stats = await getMigrationStats();
      return stats;
    }),
  );

  // Test 2: Dry run migration
  results.push(
    await runTest("dry_run_migration", async () => {
      const migrationResult = await migrateTransactions({
        dryRun: true,
        batchSize: 5,
      });
      return {
        success: migrationResult.success,
        migratedCount: migrationResult.migratedCount,
        duration: migrationResult.duration,
      };
    }),
  );

  return results;
}

/**
 * Tests validation functionality.
 *
 * @returns Promise<TestResult[]> Results of validation tests
 */
async function testValidation(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  console.log("🔍 Testing validation functionality...");

  // Test 1: Data consistency validation
  results.push(
    await runTest("data_consistency", async () => {
      const validationReport = await validateDataConsistency();
      return {
        isValid: validationReport.isValid,
        totalTransactions: validationReport.summary.totalTransactions,
        differenceCount: validationReport.summary.differenceCount,
      };
    }),
  );

  // Test 2: Schema validation
  results.push(
    await runTest("schema_validation", async () => {
      const repo = new PouchTransactionRepository();

      // Test valid transaction
      await repo.create({
        date: new Date().toISOString().split("T")[0],
        description: "Valid Transaction",
        amount: 50.0,
        currency: "USD",
        type: "credit",
        category: "Test",
      });

      // Test invalid transaction (should throw)
      let validationError = null;
      try {
        await repo.create({
          date: "",
          description: "",
          amount: -10,
          currency: "",
          type: "invalid" as "credit" | "debit",
          category: "",
        });
      } catch (error) {
        validationError = (error as Error).message;
      }

      return {
        validationWorking: !!validationError,
        errorMessage: validationError,
      };
    }),
  );

  return results;
}

/**
 * Helper function to run a single test with error handling and timing.
 *
 * @param operation Name of the operation being tested
 * @param testFn Function that performs the test
 * @returns Promise<TestResult> Result of the test
 */
async function runTest(
  operation: string,
  testFn: () => Promise<unknown>,
): Promise<TestResult> {
  const timer = createPerformanceTimer();
  timer.start(operation);

  try {
    const data = await testFn();
    const duration = timer.stop(operation);

    console.log(`  ✅ ${operation}: ${duration.toFixed(2)}ms`);

    return {
      success: true,
      operation,
      duration,
      data: data as unknown,
    };
  } catch (error) {
    const duration = timer.stop(operation);
    const errorMessage = (error as Error).message || String(error);

    console.log(`  ❌ ${operation}: ${errorMessage}`);

    return {
      success: false,
      operation,
      duration,
      error: errorMessage,
    };
  }
}

/**
 * Tests category repository operations.
 *
 * @returns Promise<TestResult[]> Results of category tests
 */
export async function testCategoryOperations(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const repo = new PouchCategoryRepository();

  console.log("📁 Testing category operations...");

  // Test 1: Create default categories
  results.push(
    await runTest("create_default_categories", async () => {
      const createdCount = await repo.createDefaultCategories();
      return { createdCount };
    }),
  );

  // Test 2: Get all categories
  results.push(
    await runTest("get_all_categories", async () => {
      const categories = await repo.getAll();
      return { count: categories.length, categories };
    }),
  );

  // Test 3: Get by name
  results.push(
    await runTest("get_category_by_name", async () => {
      const foodCategory = await repo.getByName("Food");
      return { found: !!foodCategory, category: foodCategory };
    }),
  );

  return results;
}

/**
 * Cleans up test data from PouchDB.
 * Useful for resetting the test environment.
 *
 * @returns Promise<number> Number of documents deleted
 */
export async function cleanupTestData(): Promise<number> {
  console.log("🧹 Cleaning up test data...");

  const transactionRepo = new PouchTransactionRepository();
  const categoryRepo = new PouchCategoryRepository();

  let deletedCount = 0;

  // Clean up transactions
  const transactions = await transactionRepo.getAll();
  for (const transaction of transactions) {
    if (
      transaction.description.includes("Test") ||
      transaction.description.includes("Performance") ||
      transaction.category === "Testing" ||
      transaction.category === "Performance"
    ) {
      await transactionRepo.delete(transaction.id);
      deletedCount++;
    }
  }

  // Clean up test categories (keep defaults)
  const categories = await categoryRepo.getAll();
  for (const category of categories) {
    if (category.name.includes("Test")) {
      await categoryRepo.delete(category.id);
      deletedCount++;
    }
  }

  console.log(`🗑️ Cleaned up ${deletedCount} test documents`);
  return deletedCount;
}

/**
 * Logs PouchDB database information for debugging.
 *
 * @returns Promise<void>
 */
export async function logDatabaseInfo(): Promise<void> {
  try {
    const transactionRepo = new PouchTransactionRepository();
    const dbInfo = await transactionRepo.getDatabaseInfo();

    console.log("📊 PouchDB Database Info:", {
      ...(dbInfo as Record<string, unknown>),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to get database info:", error);
  }
}

/**
 * Quick smoke test to verify PouchDB is working.
 * Useful for immediate verification after setup.
 *
 * @returns Promise<boolean> True if basic operations work
 */
export async function smokeTest(): Promise<boolean> {
  try {
    console.log("💨 Running PouchDB smoke test...");

    // Verify setup first
    verifyPouchDBSetup();

    const repo = new PouchTransactionRepository();

    // Create a test transaction
    await repo.create({
      date: new Date().toISOString().split("T")[0],
      description: "Smoke Test",
      amount: 1.0,
      currency: "USD",
      type: "debit",
      category: "Test",
    });

    // Verify it was created
    const transactions = await repo.getAll();
    const smokeTransaction = transactions.find(
      (t) => t.description === "Smoke Test",
    );

    if (smokeTransaction) {
      // Clean up
      await repo.delete(smokeTransaction.id);
      console.log("✅ Smoke test passed");
      return true;
    } else {
      console.log("❌ Smoke test failed: transaction not found");
      return false;
    }
  } catch (error) {
    console.log("❌ Smoke test failed:", (error as Error).message);
    return false;
  }
}
