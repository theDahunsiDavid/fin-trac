import Dexie from "dexie";
import type { Table } from "dexie";
import type { Transaction, Category } from "../../features/transactions/types";

/**
 * FinTrac Database Connection and Schema Definition
 *
 * Establishes the IndexedDB database connection for FinTrac's local-first
 * personal finance tracking system. This database serves as the primary
 * storage layer for all financial data, enabling offline functionality
 * and providing the foundation for cross-device synchronization.
 *
 * Why this database architecture was chosen:
 * - IndexedDB provides robust client-side storage for privacy-first design
 * - Dexie.js offers type-safe, Promise-based API over raw IndexedDB
 * - Local storage ensures data availability without internet connectivity
 * - Schema definition enables efficient querying and indexing strategies
 * - Version management supports future database migrations and upgrades
 *
 * Privacy and security considerations:
 * - All financial data remains on user's device by default
 * - No server dependency for core functionality
 * - Data export/import under complete user control
 * - Optional sync only connects to user-controlled CouchDB instances
 */

/**
 * FinTrac Database Class extending Dexie for IndexedDB access
 *
 * Provides the core database infrastructure for FinTrac's personal finance
 * tracking, establishing table definitions, indexes, and schema versioning.
 * This class is the foundation of FinTrac's local-first architecture,
 * ensuring all financial data is stored securely on the user's device.
 *
 * Why this specific database design:
 * - Two-table structure keeps data model simple and maintainable
 * - Strategic indexing enables fast queries for common operations
 * - Version management supports future feature additions
 * - Type safety prevents data corruption and development errors
 * - Dexie abstraction provides reliable IndexedDB interaction
 *
 * Table design rationale:
 * - Transactions table stores all financial activity with rich indexing
 * - Categories table provides organizational structure for transactions
 * - Separate tables enable independent querying and maintenance
 * - Foreign key relationships maintained through application logic
 *
 * Index strategy for performance:
 * - Primary key (id) for direct transaction/category lookup
 * - Date index enables chronological sorting and date-range queries
 * - Type index supports credit/debit filtering for balance calculations
 * - Category index enables category-based analytics and filtering
 * - UpdatedAt index supports sync operations and conflict resolution
 *
 * Sync integration considerations:
 * - Schema design compatible with CouchDB document structure
 * - UpdatedAt fields enable timestamp-based sync conflict resolution
 * - All fields designed for JSON serialization to CouchDB
 * - Index strategy supports efficient sync query patterns
 */
export class FinTracDB extends Dexie {
  /** Transaction table for storing all financial transaction records */
  transactions!: Table<Transaction>;
  /** Category table for storing transaction organization categories */
  categories!: Table<Category>;

  /**
   * Initializes the FinTrac IndexedDB database with schema and indexes
   *
   * Sets up the database connection, table definitions, and indexing strategy
   * that powers FinTrac's local-first personal finance tracking. This constructor
   * is called once per application session and establishes the foundation for
   * all financial data operations.
   *
   * Why this specific schema configuration:
   * - Database name "FinTracDB" provides clear identification in browser DevTools
   * - Version 1 represents the initial stable schema for production use
   * - Index selection optimized for common query patterns in financial tracking
   * - Table structure balances simplicity with querying performance
   *
   * Index strategy explanation:
   * - 'id' (primary): Direct lookup for specific transactions/categories
   * - 'date': Chronological sorting and date-range filtering for transactions
   * - 'type': Credit/debit separation for balance calculations and analytics
   * - 'category': Category-based filtering and expense analysis
   * - 'updatedAt': Sync operations and change tracking for conflict resolution
   * - 'name': Category lookup and duplicate prevention
   *
   * Performance considerations:
   * - Compound indexes avoided to minimize storage overhead
   * - Index selection based on actual query patterns in FinTrac features
   * - Balance between query performance and storage efficiency
   * - Indexes support both individual lookups and range queries
   *
   * Future migration planning:
   * - Version 1 establishes baseline schema for future migrations
   * - Index strategy extensible for additional query patterns
   * - Schema design allows for backwards-compatible field additions
   * - Dexie migration framework ready for future schema updates
   *
   * Browser compatibility:
   * - IndexedDB supported in all modern browsers and PWA environments
   * - Dexie provides polyfills and fallbacks for edge cases
   * - Schema definition compatible with all IndexedDB implementations
   * - Cross-browser testing ensures consistent behavior
   *
   * Error handling:
   * - Dexie handles database creation failures gracefully
   * - Version conflicts resolved through Dexie's migration system
   * - Storage quota exceeded errors handled by Dexie error framework
   * - Connection failures propagate to repository layer for handling
   *
   * Development and debugging:
   * - Database name makes it easy to locate in browser DevTools
   * - Schema definition provides clear data structure documentation
   * - Index visibility helps optimize query performance during development
   * - Version tracking enables controlled schema evolution
   */
  constructor() {
    super("FinTracDB");
    this.version(1).stores({
      transactions: "id, date, type, category, updatedAt",
      categories: "id, name, updatedAt",
    });
  }
}

/**
 * Singleton database instance for FinTrac application
 *
 * Provides a single, shared database connection throughout the application,
 * ensuring consistent access to financial data and preventing multiple
 * database instances that could cause data consistency issues.
 *
 * Why a singleton pattern is used:
 * - Ensures single database connection across all application components
 * - Prevents multiple IndexedDB connections that could cause conflicts
 * - Provides consistent database state for all repositories and services
 * - Simplifies database lifecycle management in the application
 * - Enables efficient connection pooling and resource management
 *
 * Usage throughout FinTrac:
 * - TransactionRepository uses this instance for all transaction operations
 * - CategoryRepository uses this instance for category management
 * - SyncService accesses this instance for data synchronization operations
 * - Test utilities can access this instance for data setup and teardown
 *
 * Connection management:
 * - Dexie handles connection opening/closing automatically
 * - Database remains open throughout application lifecycle
 * - Browser tab closure automatically closes the connection
 * - Multiple tabs can safely share the same IndexedDB database
 *
 * Error handling:
 * - Database connection errors propagate to consuming repositories
 * - Transaction failures handled at the repository layer
 * - Connection recovery managed by Dexie's internal mechanisms
 * - Storage quota issues surface through repository error handling
 */
export const db = new FinTracDB();
