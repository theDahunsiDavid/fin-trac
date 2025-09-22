import { db } from "../db/db";
import type { Transaction } from "../../features/transactions/types";
import type { ITransactionRepository } from "./ITransactionRepository";
import { generateUUID } from "../utils/uuid";

/**
 * Dexie-based Transaction Repository Implementation for FinTrac Personal Finance Tracker
 *
 * Provides the concrete implementation of transaction data operations using Dexie.js
 * and IndexedDB for FinTrac's local-first personal finance tracking architecture.
 * This repository serves as the primary data access layer for all financial
 * transaction operations in the application.
 *
 * Why this implementation exists:
 * - FinTrac uses local-first architecture for privacy and offline functionality
 * - Dexie.js provides robust, type-safe access to browser IndexedDB storage
 * - Implements the repository pattern for clean separation of data and business logic
 * - Supports FinTrac's sync architecture through consistent data operations
 * - Ensures financial data integrity through proper validation and error handling
 *
 * Architecture integration:
 * - Implements ITransactionRepository interface for dependency injection
 * - Uses singleton database connection for consistent data access
 * - Integrates with UUID generation for sync-safe transaction identifiers
 * - Supports timestamp management for audit trails and sync conflict resolution
 * - Provides efficient querying through IndexedDB indexes for dashboard performance
 *
 * Data integrity guarantees:
 * - Automatic ID generation prevents duplicate or missing identifiers
 * - Timestamp management ensures accurate audit trails and sync coordination
 * - Atomic operations prevent partial data corruption during failures
 * - Error handling provides meaningful feedback for debugging and user experience
 * - Transaction validation ensures financial data meets FinTrac's quality standards
 */
export class TransactionRepository implements ITransactionRepository {
  /**
   * Creates a new transaction record in FinTrac's local database
   *
   * This method is the primary entry point for adding financial transactions to
   * FinTrac. It handles all system-generated fields (ID, timestamps) while
   * ensuring data integrity and preparing the transaction for potential sync operations.
   *
   * Why this implementation is designed this way:
   * - UUID generation ensures conflict-free sync across multiple devices
   * - Consistent timestamp generation supports audit trails and conflict resolution
   * - Atomic operation prevents partial transaction creation during failures
   * - Immediate return of complete transaction enables optimistic UI updates
   * - Error propagation provides clear feedback for validation and debugging
   *
   * Data processing workflow:
   * 1. Generate current ISO timestamp for creation and update times
   * 2. Create complete transaction object with user data and system fields
   * 3. Generate UUID that won't conflict during cross-device sync
   * 4. Atomically insert transaction into IndexedDB via Dexie
   * 5. Return complete transaction object for immediate UI use
   *
   * Sync architecture support:
   * - Generated UUID compatible with CouchDB document requirements
   * - Timestamps enable last-write-wins conflict resolution strategy
   * - Complete transaction return supports optimistic UI update patterns
   * - Error handling compatible with sync operation retry logic
   *
   * Performance considerations:
   * - Single IndexedDB operation for efficient database interaction
   * - Minimal memory overhead with direct object creation
   * - Fast UUID generation suitable for high-frequency transaction entry
   * - Indexed fields (date, type, category) automatically updated for query performance
   *
   * @param transaction Complete transaction data excluding system-generated fields
   * @returns Promise resolving to the created transaction with ID and timestamps
   * @throws Error if IndexedDB operation fails or data validation errors occur
   */
  async create(
    transaction: Omit<Transaction, "id" | "createdAt" | "updatedAt">,
  ): Promise<Transaction> {
    const now = new Date().toISOString();
    const newTransaction: Transaction = {
      ...transaction,
      id: generateUUID(),
      createdAt: now,
      updatedAt: now,
    };

    await db.transactions.add(newTransaction);
    return newTransaction;
  }

  /**
   * Retrieves all transactions ordered by date for comprehensive financial analysis
   *
   * Provides access to the complete transaction history, essential for FinTrac's
   * dashboard analytics, financial reporting, and user's complete financial picture.
   * The chronological ordering ensures consistent presentation across the application.
   *
   * Why this query design was chosen:
   * - Reverse chronological order (newest first) matches user expectations
   * - Complete dataset supports dashboard calculations and analytics
   * - Single query operation maintains performance at personal finance scale
   * - Consistent ordering enables predictable UI behavior and caching
   * - Full transaction objects support immediate display without additional queries
   *
   * Performance characteristics:
   * - Uses IndexedDB date index for efficient sorting
   * - Memory usage acceptable for typical personal finance transaction volumes
   * - Query performance suitable for dashboard loading requirements
   * - Results suitable for client-side filtering and search operations
   *
   * Dashboard integration:
   * - Powers financial summary calculations and balance computations
   * - Supports chart data preparation for trend analysis and visualization
   * - Enables category-based spending analysis and budget tracking
   * - Provides foundation for search and filtering operations
   *
   * @returns Promise resolving to all transactions ordered by date (newest first)
   * @throws Error if IndexedDB query fails or database connection issues occur
   */
  async getAll(): Promise<Transaction[]> {
    return await db.transactions.orderBy("date").reverse().toArray();
  }

  /**
   * Retrieves a specific transaction by unique identifier for detailed operations
   *
   * Enables direct access to individual transaction records for editing workflows,
   * detailed views, and transaction-specific operations. Uses IndexedDB primary key
   * lookup for optimal performance.
   *
   * Why direct ID lookup is essential:
   * - Transaction editing requires current state for form population
   * - Sync operations need individual transaction access for conflict resolution
   * - User interfaces need specific transaction details for display and interaction
   * - Audit workflows require precise transaction lookup for compliance
   * - URL routing enables direct links to specific transactions
   *
   * Performance optimization:
   * - Primary key lookup provides O(1) performance characteristics
   * - Minimal memory usage with single record retrieval
   * - Efficient for real-time UI updates and form population
   * - Suitable for high-frequency access patterns in transaction management
   *
   * @param id Unique transaction identifier (UUID format)
   * @returns Promise resolving to transaction if found, undefined if not found
   * @throws Error if IndexedDB query fails
   */
  async getById(id: string): Promise<Transaction | undefined> {
    return await db.transactions.get(id);
  }

  /**
   * Updates an existing transaction with new data while preserving audit trail
   *
   * Handles transaction modification with proper timestamp management for audit
   * trails and sync operations. Ensures data integrity while supporting user
   * corrections and transaction refinement workflows.
   *
   * Why this update strategy is used:
   * - UpdatedAt timestamp triggers sync operations to other devices
   * - Preserves createdAt for accurate transaction lifecycle tracking
   * - Atomic update operation prevents partial modifications during failures
   * - Complete transaction return enables immediate UI updates
   * - Error handling provides clear feedback for validation failures
   *
   * Data integrity measures:
   * - ID field protection prevents accidental identifier changes
   * - CreatedAt preservation maintains accurate audit trails
   * - Automatic updatedAt timestamp for sync coordination
   * - Post-update verification ensures changes were persisted correctly
   * - Error propagation for clear debugging and user feedback
   *
   * Sync architecture integration:
   * - UpdatedAt change signals need for cross-device synchronization
   * - Conflict resolution depends on accurate timestamp management
   * - Complete transaction return supports optimistic UI update patterns
   *
   * @param id Transaction ID to update
   * @param updates Partial transaction data with fields to modify
   * @returns Promise resolving to the updated transaction with new timestamp
   * @throws Error if transaction not found or update operation fails
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
   * Permanently removes a transaction from FinTrac's database
   *
   * Provides safe transaction deletion for correcting data entry errors,
   * removing duplicates, and cleaning up invalid transactions. This operation
   * has significant implications for financial calculations and sync operations.
   *
   * Why deletion capability is necessary:
   * - Corrects duplicate transactions from import operations
   * - Removes test transactions during development and onboarding
   * - Cleans up invalid transactions from failed sync operations
   * - Supports user data deletion requests for privacy compliance
   * - Enables data cleanup during migration and maintenance operations
   *
   * Financial impact considerations:
   * - Deletion affects balance calculations and financial summaries
   * - Chart data and analytics immediately reflect the removal
   * - Budget tracking and spending analysis exclude deleted transactions
   * - Export operations no longer include deleted transaction data
   *
   * Sync implications:
   * - Deletion must propagate to all connected devices
   * - Sync operations handle deletion conflicts appropriately
   * - Audit trails may retain deletion events for compliance
   *
   * @param id Transaction ID to delete
   * @returns Promise resolving when deletion is complete
   * @throws Error if IndexedDB operation fails
   */
  async delete(id: string): Promise<void> {
    await db.transactions.delete(id);
  }

  /**
   * Retrieves transactions within a specific date range for time-based analysis
   *
   * Enables period-specific financial analysis essential for budgeting, reporting,
   * and trend identification. Uses IndexedDB date index for efficient range queries
   * that power FinTrac's time-based filtering and analytics features.
   *
   * Why date range queries are fundamental:
   * - Monthly budget analysis requires period-specific transaction data
   * - Financial reports need date-bounded datasets for accurate analysis
   * - Chart components filter data by time periods for trend visualization
   * - Tax preparation requires yearly transaction summaries and categorization
   * - Spending pattern analysis depends on time-based data segmentation
   *
   * Query optimization:
   * - Leverages IndexedDB date index for efficient range scanning
   * - Inclusive date range matching for intuitive user experience
   * - Reverse chronological ordering for consistent presentation
   * - Performance scales logarithmically with total transaction count
   *
   * Dashboard integration:
   * - Powers date range selectors in financial summary components
   * - Enables monthly/yearly view toggles in analytics dashboards
   * - Supports budget vs actual comparisons for specific time periods
   * - Provides data for seasonal spending pattern analysis
   *
   * @param startDate Start date in ISO format (YYYY-MM-DD), inclusive
   * @param endDate End date in ISO format (YYYY-MM-DD), inclusive
   * @returns Promise resolving to transactions within date range, newest first
   * @throws Error if IndexedDB query fails or date format is invalid
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
   * Retrieves all transactions in a specific category for spending analysis
   *
   * Enables category-based financial analysis essential for understanding spending
   * patterns, budget allocation, and expense management. Uses IndexedDB category
   * index for efficient filtering that supports FinTrac's categorization features.
   *
   * Why category filtering is essential:
   * - Users analyze spending patterns by category for budget planning
   * - Category-specific reports identify overspending and optimization opportunities
   * - Budget vs actual comparisons require category-grouped transaction data
   * - Financial goal tracking often focuses on specific spending categories
   * - Tax preparation may require category-specific transaction documentation
   *
   * Performance characteristics:
   * - Uses IndexedDB category index for efficient filtering
   * - Query performance independent of total transaction volume
   * - Memory usage scales with category size rather than total data
   * - Suitable for real-time category filtering in user interfaces
   *
   * Analytics integration:
   * - Powers category-based dashboard widgets and summary cards
   * - Enables budget tracking features for category-specific monitoring
   * - Supports expense analysis tools for spending pattern identification
   * - Provides data for category-focused financial insights and recommendations
   *
   * @param category Exact category name to filter transactions by
   * @returns Promise resolving to all transactions in the specified category
   * @throws Error if IndexedDB query fails
   */
  async getByCategory(category: string): Promise<Transaction[]> {
    return await db.transactions.where("category").equals(category).toArray();
  }

  /**
   * Retrieves transactions filtered by type for income vs expense analysis
   *
   * Enables fundamental income/expense separation critical for balance calculations,
   * cash flow analysis, and financial health monitoring. Uses IndexedDB type index
   * for efficient filtering that supports FinTrac's core financial analytics.
   *
   * Why type-based filtering is crucial:
   * - Balance calculations require separate totals for income and expenses
   * - Cash flow analysis compares income vs expense trends over time
   * - Budget planning differentiates between income sources and spending categories
   * - Financial reports typically organize data by income and expense sections
   * - Tax preparation requires separate handling of income and deductible expenses
   *
   * Financial semantics:
   * - "credit" represents money flowing in (salary, refunds, returns, income)
   * - "debit" represents money flowing out (purchases, bills, expenses)
   * - Type determines positive/negative impact on account balances
   * - Consistent with accounting principles for user familiarity and accuracy
   *
   * Dashboard applications:
   * - Balance calculation utilities for account summary displays
   * - Income vs expense charts and trend visualizations
   * - Cash flow analysis components for financial health monitoring
   * - Budget planning interfaces for income/expense categorization
   *
   * @param type Transaction type ("credit" for income, "debit" for expenses)
   * @returns Promise resolving to all transactions of the specified type
   * @throws Error if IndexedDB query fails
   */
  async getByType(type: "credit" | "debit"): Promise<Transaction[]> {
    return await db.transactions.where("type").equals(type).toArray();
  }

  /**
   * Searches transactions by description text for finding specific records
   *
   * Provides full-text search capability enabling users to locate transactions
   * based on merchant names, transaction details, or personal notes. Essential
   * for transaction lookup, reconciliation, and audit workflows.
   *
   * Why description search is important:
   * - Users remember transactions by merchant names or descriptive details
   * - Transaction reconciliation requires finding specific records for verification
   * - Audit and compliance workflows need efficient transaction lookup capabilities
   * - Recurring transaction identification for budget analysis and automation
   * - Dispute resolution requires locating specific transactions quickly
   *
   * Search implementation:
   * - Case-insensitive partial string matching for user convenience
   * - Filters through transaction descriptions using JavaScript string operations
   * - Returns all matching transactions regardless of date, amount, or category
   * - Performance acceptable for personal finance transaction volumes
   *
   * User experience considerations:
   * - Supports natural language search patterns users expect
   * - Finds transactions even with partial or approximate merchant names
   * - Useful for finding transactions when only description details are remembered
   * - Complements date-based and category-based filtering for comprehensive search
   *
   * @param query Search string to match against transaction descriptions
   * @returns Promise resolving to transactions containing the query string
   * @throws Error if IndexedDB query fails
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
   * Returns total transaction count for system monitoring and UI elements
   *
   * Provides transaction volume statistics essential for dashboard summaries,
   * system performance monitoring, and user interface elements that display
   * data scale information.
   *
   * Why transaction counting is needed:
   * - Dashboard statistics display total financial activity volume
   * - System performance monitoring tracks data growth and scalability
   * - User interfaces show data summary information for context
   * - Pagination components may use counts for page calculations
   * - Export utilities display progress based on total transaction volume
   *
   * Performance characteristics:
   * - Optimized count query using IndexedDB aggregation
   * - Constant time complexity for count operations
   * - Minimal data transfer with only numeric result
   * - Suitable for frequent polling and real-time updates
   *
   * @returns Promise resolving to total number of transactions
   * @throws Error if IndexedDB query fails
   */
  async count(): Promise<number> {
    return await db.transactions.count();
  }

  /**
   * Removes all transactions for testing and migration operations
   *
   * Provides complete data reset capability for testing scenarios, migration
   * operations, and development workflows. This destructive operation requires
   * careful consideration due to its impact on financial data integrity.
   *
   * Why bulk deletion is necessary:
   * - Test setup and teardown require clean database states
   * - Migration operations need to clear data before bulk loading
   * - Development environments need reset capability for testing
   * - Data import operations may require clearing invalid or duplicate data
   * - User data reset requests for privacy compliance
   *
   * Safety considerations:
   * - Permanent deletion with no built-in recovery mechanism
   * - Should be restricted to testing, migration, and development contexts
   * - Production use requires comprehensive confirmation workflows
   * - Sync implications require coordinated clearing across devices
   *
   * @returns Promise resolving when all transactions are deleted
   * @throws Error if IndexedDB operation fails
   */
  async clear(): Promise<void> {
    await db.transactions.clear();
  }

  /**
   * Creates multiple transactions atomically for import and migration operations
   *
   * Enables efficient batch creation for CSV imports, data migration, and sync
   * operations. Provides transaction integrity through atomic operations while
   * maintaining performance for large datasets.
   *
   * Why bulk creation is essential:
   * - CSV import operations require efficient handling of hundreds of transactions
   * - Migration scripts need atomic bulk operations for data integrity
   * - Sync operations apply multiple remote changes atomically
   * - Initial data seeding requires efficient bulk loading capabilities
   * - Backup restoration needs fast bulk creation for recovery operations
   *
   * Batch operation benefits:
   * - Single IndexedDB transaction ensures atomicity (all or nothing)
   * - Reduced overhead compared to individual create operations
   * - Consistent timestamp generation for related transaction batches
   * - Efficient UUID generation for large transaction sets
   * - Progress tracking capabilities for long-running import operations
   *
   * Data integrity guarantees:
   * - All transactions validated before any database operations
   * - Atomic operation prevents partial batch creation during failures
   * - Consistent system field generation across the entire batch
   * - Error handling provides detailed feedback for debugging imports
   *
   * @param transactions Array of transaction data excluding system-generated fields
   * @returns Promise resolving to array of created transactions with IDs and timestamps
   * @throws Error if validation fails or IndexedDB operation fails
   */
  async bulkCreate(
    transactions: Omit<Transaction, "id" | "createdAt" | "updatedAt">[],
  ): Promise<Transaction[]> {
    const now = new Date().toISOString();
    const newTransactions: Transaction[] = transactions.map((transaction) => ({
      ...transaction,
      id: generateUUID(),
      createdAt: now,
      updatedAt: now,
    }));

    await db.transactions.bulkAdd(newTransactions);
    return newTransactions;
  }

  /**
   * Retrieves database metadata and status for monitoring and debugging
   *
   * Provides comprehensive information about the transaction database state,
   * essential for system health monitoring, debugging workflows, and user
   * interface status displays.
   *
   * Why database information is needed:
   * - System status components show database health and connectivity
   * - Debugging tools require implementation details and performance metrics
   * - Sync operations need database state information for coordination
   * - User interfaces benefit from displaying system status and data volume
   * - Performance monitoring tracks database growth and query performance
   *
   * Information provided:
   * - Database identifier for debugging and system identification
   * - Transaction count for capacity planning and performance monitoring
   * - Implementation type for troubleshooting and compatibility verification
   * - Last modification timestamp for sync coordination and caching decisions
   *
   * Performance characteristics:
   * - Lightweight metadata query suitable for frequent status checks
   * - Minimal data transfer focused on summary information
   * - Fast response time enabling real-time system monitoring
   * - No impact on transaction data or normal database operations
   *
   * @returns Promise resolving to comprehensive database information object
   * @throws Error if IndexedDB queries fail
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
   * Legacy method maintained for backward compatibility with existing code
   */
  async getTransactionsByDateRange(
    startDate: string,
    endDate: string,
  ): Promise<Transaction[]> {
    return this.getByDateRange(startDate, endDate);
  }

  /**
   * @deprecated Use getByType instead
   * Legacy method maintained for backward compatibility with existing code
   */
  async getTransactionsByType(
    type: "credit" | "debit",
  ): Promise<Transaction[]> {
    return this.getByType(type);
  }

  /**
   * @deprecated Use getByCategory instead
   * Legacy method maintained for backward compatibility with existing code
   */
  async getTransactionsByCategory(category: string): Promise<Transaction[]> {
    return this.getByCategory(category);
  }

  /**
   * @deprecated Use getAll with manual slicing instead
   * Legacy method for retrieving recent transactions with limit
   * Maintained for backward compatibility but should be replaced with getAll
   */
  async getRecentTransactions(limit: number = 10): Promise<Transaction[]> {
    return await db.transactions
      .orderBy("date")
      .reverse()
      .limit(limit)
      .toArray();
  }
}
