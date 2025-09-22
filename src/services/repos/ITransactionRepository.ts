import type { Transaction } from "../../features/transactions/types";

/**
 * Transaction Repository Interface for FinTrac Personal Finance Tracker
 *
 * Defines the comprehensive contract for transaction data operations in FinTrac's
 * local-first architecture. This interface abstracts the underlying storage
 * implementation, enabling flexibility between different database backends
 * while ensuring consistent data access patterns throughout the application.
 *
 * Why this interface exists:
 * - Enables clean architecture separation between business logic and data persistence
 * - Supports multiple storage implementations (currently Dexie.js for IndexedDB)
 * - Provides type-safe contract for all transaction data operations
 * - Facilitates testing through mock implementations
 * - Enables future storage backend changes without breaking consuming code
 * - Ensures consistent error handling and data validation across implementations
 *
 * Design principles:
 * - All methods return Promises for consistent async handling
 * - Input validation delegated to implementation layer
 * - System-generated fields (id, timestamps) excluded from user input types
 * - Query methods designed for common FinTrac use cases
 * - Bulk operations support migration and import scenarios
 * - Error handling follows Promise rejection patterns
 *
 * Implementation requirements:
 * - Must handle UUID generation for new transactions
 * - Must manage createdAt/updatedAt timestamps automatically
 * - Must validate transaction data before persistence
 * - Must support efficient querying for dashboard and analytics features
 * - Must provide atomic operations for data consistency
 * - Must handle concurrent access safely
 */
export interface ITransactionRepository {
  /**
   * Creates a new transaction record in FinTrac
   *
   * This is the primary method for adding financial transactions to the system.
   * It handles ID generation, timestamp management, and data validation to ensure
   * every transaction meets FinTrac's strict financial data integrity requirements.
   *
   * Why this method is critical:
   * - Entry point for all new financial data in FinTrac
   * - Ensures consistent ID generation for cross-device sync compatibility
   * - Manages audit timestamps for transaction lifecycle tracking
   * - Validates financial data to prevent calculation errors
   * - Supports transaction forms and import operations
   *
   * Data processing responsibilities:
   * - Generates unique UUID for the transaction ID
   * - Sets createdAt timestamp to current ISO datetime
   * - Sets updatedAt timestamp to current ISO datetime
   * - Validates all required fields and business rules
   * - Ensures amount is positive and properly formatted
   * - Validates currency code and transaction type
   *
   * Connects to:
   * - TransactionForm submission handlers
   * - CSV import utilities for bulk transaction creation
   * - Mobile app sync operations for offline transaction creation
   * - Automated transaction import from bank APIs (future feature)
   *
   * Error scenarios:
   * - Invalid transaction data (validation errors)
   * - Database connection failures
   * - Storage quota exceeded
   * - Concurrent modification conflicts
   *
   * @param transaction Complete transaction data excluding system-generated fields
   * @returns Promise resolving to the created transaction with ID and timestamps
   * @throws ValidationError if transaction data is invalid
   * @throws StorageError if database operation fails
   */
  create(
    transaction: Omit<Transaction, "id" | "createdAt" | "updatedAt">,
  ): Promise<Transaction>;

  /**
   * Retrieves all transactions from FinTrac for comprehensive financial analysis
   *
   * Provides access to the complete transaction history, essential for dashboard
   * analytics, financial reporting, and data export operations. This method
   * supports FinTrac's core value proposition of complete financial visibility.
   *
   * Why this method is essential:
   * - Dashboard components need complete data for accurate financial summaries
   * - Chart components require full dataset for trend analysis and visualization
   * - Export features need access to complete transaction history
   * - Sync operations need to compare local and remote datasets
   * - Analytics features depend on comprehensive transaction data
   *
   * Performance considerations:
   * - Results not paginated - suitable for personal finance scale (thousands of transactions)
   * - Indexing strategy optimizes for full table scans
   * - Memory usage acceptable for typical personal finance transaction volumes
   * - Query performance sufficient for dashboard loading requirements
   *
   * Connects to:
   * - Dashboard hooks for financial summary calculations
   * - Chart components for transaction visualization
   * - Export utilities for data backup and portability
   * - Sync services for data comparison and conflict resolution
   * - Search and filtering operations that need baseline datasets
   *
   * @returns Promise resolving to array of all transactions ordered by date (newest first)
   * @throws StorageError if database query fails
   */
  getAll(): Promise<Transaction[]>;

  /**
   * Retrieves a specific transaction by its unique identifier
   *
   * Enables direct access to individual transaction records for detailed views,
   * editing operations, and transaction-specific analytics. Essential for
   * transaction management workflows and detailed financial review.
   *
   * Why direct ID lookup is important:
   * - Transaction detail views need efficient single-record access
   * - Edit operations require current transaction state before updates
   * - Sync conflict resolution needs to compare specific transactions
   * - User bookmarking and deep-linking to specific transactions
   * - Audit trails and financial forensics require precise record lookup
   *
   * Implementation requirements:
   * - Must use indexed lookup for O(1) performance
   * - Must handle non-existent IDs gracefully
   * - Must return complete transaction data for editing
   * - Must support UUID and any legacy ID formats
   *
   * Connects to:
   * - Transaction detail modals and edit forms
   * - Transaction selection and highlighting in lists
   * - Sync operations for individual transaction conflict resolution
   * - URL routing for direct transaction access
   * - Audit and compliance features requiring specific record access
   *
   * @param id Unique transaction identifier (UUID format)
   * @returns Promise resolving to transaction if found, undefined if not found
   * @throws StorageError if database query fails
   */
  getById(id: string): Promise<Transaction | undefined>;

  /**
   * Updates an existing transaction with new data
   *
   * Handles transaction modification while preserving data integrity and
   * audit trails. Critical for user corrections, categorization updates,
   * and maintaining accurate financial records over time.
   *
   * Why transaction updates are necessary:
   * - Users need to correct data entry errors and typos
   * - Transaction categorization evolves as users refine their system
   * - External data imports may need manual cleanup and adjustment
   * - Financial reconciliation requires transaction modifications
   * - Sync conflict resolution needs controlled merge operations
   *
   * Data integrity guarantees:
   * - ID field cannot be modified to maintain referential integrity
   * - CreatedAt timestamp preserved to maintain audit trail
   * - UpdatedAt timestamp automatically set to current time
   * - Validation applied to all modified fields
   * - Partial updates supported for efficient operations
   *
   * Audit and sync considerations:
   * - UpdatedAt change triggers sync operations to other devices
   * - Preserves creation timestamp for historical accuracy
   * - Supports conflict resolution through timestamp comparison
   * - Enables change tracking for data consistency verification
   *
   * Connects to:
   * - Transaction edit forms and inline editing components
   * - Bulk edit operations for category reassignment
   * - Sync conflict resolution algorithms
   * - Data cleanup and migration utilities
   * - Automated categorization and data enhancement features
   *
   * @param id Transaction ID to update
   * @param updates Partial transaction data with fields to modify
   * @returns Promise resolving to the updated transaction with new timestamp
   * @throws NotFoundError if transaction ID doesn't exist
   * @throws ValidationError if update data is invalid
   * @throws StorageError if database operation fails
   */
  update(
    id: string,
    updates: Partial<Omit<Transaction, "id" | "createdAt">>,
  ): Promise<Transaction>;

  /**
   * Permanently removes a transaction from FinTrac
   *
   * Provides safe transaction deletion with proper cleanup and audit considerations.
   * While deletion is not commonly needed in financial tracking, it's essential
   * for correcting duplicate entries and removing test/invalid data.
   *
   * Why deletion capability is necessary:
   * - Remove duplicate transactions from import operations
   * - Delete test transactions during development and onboarding
   * - Correct data entry mistakes that can't be fixed through updates
   * - Comply with user data deletion requests for privacy
   * - Clean up invalid transactions from failed sync operations
   *
   * Safety considerations:
   * - Permanent deletion - no built-in recovery mechanism
   * - Caller responsible for confirmation dialogs and user warnings
   * - Audit trail impact - consider soft deletion for production systems
   * - Sync implications - deletion must propagate to all devices
   * - Balance calculation impact - deletion affects financial summaries
   *
   * Implementation requirements:
   * - Must verify transaction exists before deletion attempt
   * - Must handle cascade effects on dependent data
   * - Must trigger sync operations to propagate deletion
   * - Should log deletion for audit purposes
   *
   * Connects to:
   * - Transaction deletion confirmations in UI
   * - Bulk cleanup operations for data management
   * - Sync operations for propagating deletions across devices
   * - Data migration utilities for cleaning up invalid records
   * - Admin tools for data maintenance and cleanup
   *
   * @param id Transaction ID to delete
   * @returns Promise resolving when deletion is complete
   * @throws NotFoundError if transaction ID doesn't exist
   * @throws StorageError if database operation fails
   */
  delete(id: string): Promise<void>;

  /**
   * Retrieves transactions within a specific date range for time-based analysis
   *
   * Enables time-bounded financial analysis, essential for budgeting, reporting,
   * and trend analysis. This method powers FinTrac's date-based filtering and
   * period-specific financial insights.
   *
   * Why date-range queries are fundamental:
   * - Monthly/yearly budget analysis requires period-specific data
   * - Financial reports need date-bounded transaction sets
   * - Chart components filter data by time periods for trend visualization
   * - Tax preparation requires yearly transaction summaries
   * - Spending pattern analysis depends on time-based data segmentation
   *
   * Query behavior:
   * - Inclusive of start date, inclusive of end date for intuitive UX
   * - Uses transaction date field (not timestamps) for business logic alignment
   * - Results ordered chronologically for consistent presentation
   * - Handles single-day ranges (startDate === endDate) correctly
   * - Empty ranges return empty arrays without errors
   *
   * Performance optimization:
   * - Leverages date index for efficient range scanning
   * - Query complexity O(log n + m) where m is result size
   * - Suitable for real-time dashboard filtering
   * - Memory efficient for large date ranges
   *
   * Connects to:
   * - Dashboard date range selectors and filters
   * - Monthly/yearly financial report generation
   * - Chart components with time-based data visualization
   * - Budget tracking features for period-specific analysis
   * - Export utilities for date-bounded data extraction
   *
   * @param startDate Start date in ISO format (YYYY-MM-DD), inclusive
   * @param endDate End date in ISO format (YYYY-MM-DD), inclusive
   * @returns Promise resolving to transactions within the date range, ordered by date
   * @throws ValidationError if date format is invalid
   * @throws StorageError if database query fails
   */
  getByDateRange(startDate: string, endDate: string): Promise<Transaction[]>;

  /**
   * Retrieves all transactions belonging to a specific category
   *
   * Enables category-based financial analysis, essential for understanding
   * spending patterns and budget allocation. This method supports FinTrac's
   * core categorization features and expense analytics.
   *
   * Why category-based queries are essential:
   * - Users need to analyze spending by category for budgeting
   * - Category-specific reports help identify overspending areas
   * - Budget vs actual comparisons require category-grouped data
   * - Financial goal tracking often focuses on specific categories
   * - Tax preparation may require category-specific transaction lists
   *
   * Query characteristics:
   * - Exact string matching for category names
   * - Case-sensitive matching for data consistency
   * - Returns all transactions regardless of date or amount
   * - Results ordered by date for chronological analysis
   * - Empty category returns empty array (not error)
   *
   * Performance considerations:
   * - Uses category index for efficient filtering
   * - Query performance independent of total transaction count
   * - Memory usage scales with category size, not total data
   * - Suitable for real-time category filtering in UI
   *
   * Connects to:
   * - Category-based dashboard filters and analytics
   * - Budget tracking features for category-specific monitoring
   * - Expense analysis tools for spending pattern identification
   * - Category management interfaces for data review
   * - Export utilities for category-specific data extraction
   *
   * @param category Exact category name to filter by
   * @returns Promise resolving to all transactions in the specified category
   * @throws StorageError if database query fails
   */
  getByCategory(category: string): Promise<Transaction[]>;

  /**
   * Retrieves transactions filtered by type (credit or debit)
   *
   * Enables income vs expense analysis fundamental to personal finance tracking.
   * This method supports balance calculations, cash flow analysis, and
   * income/expense categorization in FinTrac's financial analytics.
   *
   * Why type-based filtering is crucial:
   * - Balance calculations need separate income and expense totals
   * - Cash flow analysis requires income vs expense trend comparison
   * - Budget planning differentiates between income and spending categories
   * - Financial reports typically separate income from expenses
   * - Tax preparation often requires separate income and deduction lists
   *
   * Type semantics:
   * - "credit" represents money coming in (income, refunds, returns)
   * - "debit" represents money going out (expenses, purchases, bills)
   * - Type determines sign in balance calculations (+/-)
   * - Consistent with accounting principles for user familiarity
   *
   * Performance characteristics:
   * - Uses type index for efficient filtering
   * - Typically returns roughly half of total transactions
   * - Memory usage scales with transaction volume of selected type
   * - Fast enough for real-time dashboard calculations
   *
   * Connects to:
   * - Balance calculation utilities for account summaries
   * - Income vs expense charts and visualizations
   * - Cash flow analysis and trend identification
   * - Budget planning tools for income/expense categorization
   * - Financial reporting features for type-specific analysis
   *
   * @param type Transaction type to filter by ("credit" for income, "debit" for expenses)
   * @returns Promise resolving to all transactions of the specified type
   * @throws ValidationError if type is not "credit" or "debit"
   * @throws StorageError if database query fails
   */
  getByType(type: "credit" | "debit"): Promise<Transaction[]>;

  /**
   * Searches transactions by description text for finding specific records
   *
   * Provides full-text search capability for transaction descriptions, enabling
   * users to quickly locate specific transactions based on merchant names,
   * transaction details, or personal notes.
   *
   * Why description search is important:
   * - Users remember transactions by merchant or description details
   * - Finding specific transactions for reconciliation or dispute resolution
   * - Locating recurring transactions for budget analysis
   * - Identifying transactions with specific keywords for categorization
   * - Supporting audit and compliance requirements for transaction lookup
   *
   * Search behavior:
   * - Case-insensitive partial string matching for user convenience
   * - Searches within description field only (not other fields)
   * - Returns all matching transactions regardless of date or amount
   * - Results ordered by relevance (exact matches first, then partial)
   * - Empty query returns empty array (not all transactions)
   *
   * Performance considerations:
   * - Linear search through descriptions (no full-text index)
   * - Performance scales with total transaction count
   * - Acceptable for personal finance scale (thousands of transactions)
   * - Consider debouncing for real-time search interfaces
   *
   * Connects to:
   * - Search bars and filters in transaction list views
   * - Quick transaction lookup tools and utilities
   * - Reconciliation workflows for finding specific transactions
   * - Data cleanup operations for identifying similar transactions
   * - Audit tools for compliance and financial review
   *
   * @param query Search string to match against transaction descriptions
   * @returns Promise resolving to transactions with descriptions containing the query
   * @throws StorageError if database query fails
   */
  searchByDescription(query: string): Promise<Transaction[]>;

  /**
   * Returns the total count of transactions in FinTrac
   *
   * Provides transaction count statistics for dashboard summaries, pagination
   * calculations, and system performance monitoring. Essential for user
   * interface elements that display data volume information.
   *
   * Why transaction counting is needed:
   * - Dashboard statistics show total transaction volume
   * - Performance monitoring tracks data growth over time
   * - Pagination components need total counts for page calculations
   * - User interface elements show data summary information
   * - System health checks monitor database size and performance
   *
   * Performance characteristics:
   * - Optimized count query using database indexes
   * - Constant time complexity O(1) for count operations
   * - No data transfer - only count result returned
   * - Suitable for frequent polling and real-time updates
   *
   * Connects to:
   * - Dashboard summary cards showing total transaction counts
   * - Performance monitoring and analytics tools
   * - Pagination controls for large transaction lists
   * - System status displays and health check utilities
   * - Data export utilities for progress tracking
   *
   * @returns Promise resolving to the total number of transactions in the database
   * @throws StorageError if database query fails
   */
  count(): Promise<number>;

  /**
   * Removes all transactions from the database for testing and migration
   *
   * Provides complete data reset capability for testing scenarios, migration
   * operations, and data cleanup utilities. This is a destructive operation
   * requiring careful consideration and appropriate safeguards.
   *
   * Why bulk deletion is necessary:
   * - Test setup and teardown require clean database states
   * - Migration operations need to clear invalid or duplicate data
   * - Development environments need reset capability for testing
   * - Data import operations may need to clear before bulk loading
   * - User data reset requests for privacy compliance
   *
   * Safety considerations:
   * - Permanent deletion with no recovery mechanism
   * - Should be restricted to testing and migration contexts
   * - Production use requires confirmation dialogs and warnings
   * - Consider backup creation before bulk deletion
   * - Sync implications - must propagate deletion to all devices
   *
   * Implementation requirements:
   * - Atomic operation - either all transactions deleted or none
   * - Must handle large datasets efficiently
   * - Should reset auto-increment counters if applicable
   * - Must trigger appropriate sync operations
   * - Should log operation for audit purposes
   *
   * Connects to:
   * - Test utilities for database setup and teardown
   * - Migration scripts for data cleanup operations
   * - Development tools for resetting application state
   * - Data import utilities for clean slate operations
   * - Admin interfaces for data management (with safeguards)
   *
   * @returns Promise resolving when all transactions are deleted
   * @throws StorageError if database operation fails
   */
  clear(): Promise<void>;

  /**
   * Creates multiple transactions in a single atomic operation
   *
   * Enables efficient batch creation for data import, migration, and sync
   * operations. This method is essential for handling large datasets while
   * maintaining transaction integrity and performance.
   *
   * Why bulk creation is essential:
   * - CSV import operations need to create hundreds of transactions efficiently
   * - Migration scripts require atomic bulk operations for data integrity
   * - Sync operations need to apply multiple remote changes atomically
   * - Initial data seeding requires efficient bulk loading
   * - Backup restoration needs fast bulk creation capability
   *
   * Batch operation benefits:
   * - Single database transaction for atomicity (all or nothing)
   * - Reduced overhead compared to individual create operations
   * - Consistent timestamp generation for related transactions
   * - Efficient memory usage for large datasets
   * - Progress tracking for long-running import operations
   *
   * Data processing responsibilities:
   * - Generates unique UUIDs for all transaction IDs
   * - Sets consistent timestamps for the entire batch
   * - Validates all transactions before any database operations
   * - Maintains referential integrity across the batch
   * - Preserves input order in the output array
   *
   * Error handling:
   * - Validation errors prevent entire batch from being created
   * - Database errors rollback any partial operations
   * - Detailed error reporting for debugging failed imports
   * - Progress recovery for interrupted bulk operations
   *
   * Connects to:
   * - CSV import utilities for external data loading
   * - Migration scripts for transferring data between systems
   * - Sync services for applying remote transaction batches
   * - Backup restoration tools for data recovery
   * - Testing utilities for setting up complex data scenarios
   *
   * @param transactions Array of transaction data excluding system-generated fields
   * @returns Promise resolving to array of created transactions with IDs and timestamps
   * @throws ValidationError if any transaction data is invalid
   * @throws StorageError if database operation fails
   */
  bulkCreate(
    transactions: Omit<Transaction, "id" | "createdAt" | "updatedAt">[],
  ): Promise<Transaction[]>;

  /**
   * Retrieves database metadata and status information
   *
   * Provides system information about the transaction database for monitoring,
   * debugging, and user interface elements. Essential for system health checks
   * and troubleshooting database-related issues.
   *
   * Why database information is needed:
   * - System status displays show database health and connectivity
   * - Debugging tools need database implementation and version details
   * - Performance monitoring tracks database size and growth
   * - Sync operations need to identify data source and freshness
   * - User interfaces show data summary and system status
   *
   * Information provided:
   * - Database name for identification and debugging
   * - Total transaction count for capacity planning
   * - Implementation type for troubleshooting and compatibility
   * - Last modification time for sync and caching decisions
   * - Additional metadata for system monitoring
   *
   * Performance characteristics:
   * - Lightweight operation suitable for frequent polling
   * - Minimal data transfer for status checking
   * - Fast response time for real-time status updates
   * - No impact on transaction data or operations
   *
   * Connects to:
   * - System status components and health check displays
   * - Debugging tools and development utilities
   * - Sync coordination for determining data freshness
   * - Performance monitoring and analytics systems
   * - User interface elements showing system information
   *
   * @returns Promise resolving to database information object
   * @throws StorageError if database query fails
   */
  getInfo(): Promise<{
    name: string;
    totalTransactions: number;
    implementation: "dexie" | "pouchdb";
    lastModified?: string;
  }>;
}
