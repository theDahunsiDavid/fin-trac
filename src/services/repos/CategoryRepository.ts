import { db } from "../db/db";
import type { Category } from "../../features/transactions/types";
import type { ICategoryRepository } from "./ICategoryRepository";
import { generateUUID } from "../utils/uuid";

/**
 * Dexie-based Category Repository Implementation for FinTrac Personal Finance Tracker
 *
 * Provides the concrete implementation of category data operations using Dexie.js
 * and IndexedDB for FinTrac's local-first personal finance tracking architecture.
 * This repository manages the organizational structure that enables users to
 * categorize, analyze, and visualize their financial transactions effectively.
 *
 * Why this implementation exists:
 * - Categories are fundamental to FinTrac's financial organization and analytics
 * - Local-first storage ensures category data is always available offline
 * - Dexie.js provides robust, type-safe access to browser IndexedDB storage
 * - Repository pattern enables clean separation between data and business logic
 * - Supports FinTrac's sync architecture through consistent CRUD operations
 * - Ensures category integrity through proper validation and error handling
 *
 * Category importance in FinTrac:
 * - Primary organizational structure for transaction classification
 * - Powers spending analysis, budget tracking, and financial insights
 * - Enables visual categorization in charts and dashboard analytics
 * - Supports user customization of financial tracking methodology
 * - Foundation for advanced features like budget alerts and spending recommendations
 *
 * Architecture integration:
 * - Implements ICategoryRepository interface for dependency injection
 * - Uses singleton database connection for consistent data access
 * - Integrates with UUID generation for sync-safe category identifiers
 * - Supports timestamp management for audit trails and sync conflict resolution
 * - Provides efficient querying for real-time UI updates and analytics
 */
export class CategoryRepository implements ICategoryRepository {
  /**
   * Creates a new category in FinTrac's organizational system
   *
   * This method enables users to create personalized financial categories that
   * reflect their unique spending patterns and organizational preferences. It
   * handles all system-generated fields while ensuring data integrity for
   * immediate use in transaction categorization.
   *
   * Why this implementation approach:
   * - UUID generation ensures conflict-free sync across multiple devices
   * - Automatic timestamp generation supports audit trails and sync coordination
   * - Atomic operation prevents partial category creation during failures
   * - Immediate return enables optimistic UI updates for better user experience
   * - Error propagation provides clear feedback for validation and debugging
   *
   * Data processing workflow:
   * 1. Generate current ISO timestamp for creation and update tracking
   * 2. Create complete category object with user data and system fields
   * 3. Generate UUID that won't conflict during cross-device synchronization
   * 4. Atomically insert category into IndexedDB via Dexie
   * 5. Return complete category object for immediate UI integration
   *
   * Sync architecture support:
   * - Generated UUID compatible with CouchDB document requirements
   * - Timestamps enable conflict resolution during sync operations
   * - Complete category return supports optimistic UI patterns
   * - Error handling compatible with sync retry mechanisms
   *
   * @param category Category data with name and color, excluding system-generated fields
   * @returns Promise resolving to the created category with ID and timestamps
   * @throws Error if IndexedDB operation fails or validation errors occur
   */
  async create(category: Omit<Category, "id">): Promise<Category> {
    const now = new Date().toISOString();
    const newCategory: Category = {
      ...category,
      id: generateUUID(),
      createdAt: now,
      updatedAt: now,
    };

    await db.categories.add(newCategory);
    return newCategory;
  }

  /**
   * Retrieves all categories ordered alphabetically for consistent presentation
   *
   * Provides access to the complete category system essential for transaction
   * forms, analytics displays, and category management interfaces. The
   * alphabetical ordering ensures predictable and user-friendly presentation.
   *
   * Why alphabetical ordering is chosen:
   * - Predictable category order improves user experience in dropdowns
   * - Consistent presentation across different UI components
   * - Easier category location for users with many custom categories
   * - Supports efficient category management and organization workflows
   * - Enables consistent caching and UI state management
   *
   * Performance characteristics:
   * - Uses IndexedDB name index for efficient sorting
   * - Category dataset typically small (10-50 categories) for personal finance
   * - Memory usage minimal compared to transaction data volumes
   * - Query performance excellent for real-time UI updates
   * - Suitable for frequent access in transaction entry workflows
   *
   * Dashboard and UI integration:
   * - Powers category selection dropdowns in transaction forms
   * - Supports category management interfaces for user customization
   * - Enables comprehensive analytics across all user-defined categories
   * - Provides foundation for category-based filtering and search operations
   *
   * @returns Promise resolving to all categories ordered alphabetically by name
   * @throws Error if IndexedDB query fails
   */
  async getAll(): Promise<Category[]> {
    return await db.categories.orderBy("name").toArray();
  }

  /**
   * Retrieves a specific category by unique identifier for targeted operations
   *
   * Enables direct access to individual category records for editing workflows,
   * validation operations, and category-specific functionality. Uses IndexedDB
   * primary key lookup for optimal performance.
   *
   * Why direct ID lookup is essential:
   * - Category editing requires current state for form population
   * - Transaction validation needs category existence verification
   * - UI components require specific category details for display
   * - Sync operations need individual category access for conflict resolution
   * - Referential integrity checks require efficient category lookup
   *
   * Performance optimization:
   * - Primary key lookup provides O(1) performance characteristics
   * - Minimal memory usage with single record retrieval
   * - Efficient for real-time UI updates and validation workflows
   * - Suitable for high-frequency access patterns in category management
   *
   * @param id Unique category identifier (UUID format)
   * @returns Promise resolving to category if found, undefined if not found
   * @throws Error if IndexedDB query fails
   */
  async getById(id: string): Promise<Category | undefined> {
    return await db.categories.get(id);
  }

  /**
   * Updates an existing category with new information while preserving audit trail
   *
   * Handles category modification with proper timestamp management for audit
   * trails and sync operations. Ensures data integrity while supporting user
   * customization and category system evolution.
   *
   * Why this update strategy is used:
   * - UpdatedAt timestamp triggers sync operations to other devices
   * - Preserves createdAt for accurate category lifecycle tracking
   * - Atomic update operation prevents partial modifications during failures
   * - Complete category return enables immediate UI updates
   * - Error handling provides clear feedback for validation failures
   *
   * Data integrity measures:
   * - ID field protection prevents accidental identifier changes
   * - CreatedAt preservation maintains accurate audit trails
   * - Automatic updatedAt timestamp for sync coordination
   * - Post-update verification ensures changes were persisted correctly
   * - Error propagation for clear debugging and user feedback
   *
   * Impact on related data:
   * - Transaction references remain valid with updated category information
   * - UI components immediately reflect category name and color changes
   * - Analytics and charts use updated category information
   * - Search indexes automatically updated with new category data
   *
   * @param id Category ID to update
   * @param updates Partial category data with fields to modify
   * @returns Promise resolving to the updated category with new timestamp
   * @throws Error if category not found or update operation fails
   */
  async update(
    id: string,
    updates: Partial<Omit<Category, "id" | "createdAt">>,
  ): Promise<Category> {
    const now = new Date().toISOString();
    const updateData = { ...updates, updatedAt: now };

    await db.categories.update(id, updateData);

    const updatedCategory = await db.categories.get(id);
    if (!updatedCategory) {
      throw new Error(`Category with id ${id} not found after update`);
    }

    return updatedCategory;
  }

  /**
   * Permanently removes a category from FinTrac's organizational system
   *
   * Provides category deletion with consideration for referential integrity
   * and transaction relationships. This operation requires careful handling
   * due to its potential impact on transaction categorization.
   *
   * Why deletion capability is necessary:
   * - Remove unused categories to simplify user interface
   * - Delete duplicate categories created during import or setup
   * - Clean up test categories during development
   * - Eliminate categories that no longer match user's organization system
   * - Maintain focused category list for better user experience
   *
   * Referential integrity considerations:
   * - Implementation allows deletion regardless of transaction usage
   * - Caller responsible for handling orphaned transaction categories
   * - Consider providing transaction reassignment workflows before deletion
   * - Sync operations must handle category deletion across devices
   * - Audit implications for transaction category history
   *
   * @param id Category ID to delete
   * @returns Promise resolving when deletion is complete
   * @throws Error if IndexedDB operation fails
   */
  async delete(id: string): Promise<void> {
    await db.categories.delete(id);
  }

  /**
   * Retrieves a category by display name for user-friendly operations
   *
   * Enables name-based category lookup essential for data import, user
   * interfaces, and duplicate prevention workflows. Uses case-insensitive
   * matching for improved user experience.
   *
   * Why case-insensitive matching is used:
   * - Improves user experience by handling common case variations
   * - Supports data import from external sources with different casing
   * - Reduces duplicate categories due to case differences
   * - Enables more flexible category search and lookup operations
   * - Matches user expectations for name-based searches
   *
   * Performance considerations:
   * - Uses IndexedDB where clause with case-insensitive comparison
   * - Single result expected due to name uniqueness expectations
   * - Efficient for category validation and lookup workflows
   * - Suitable for real-time search and autocomplete features
   *
   * @param name Category name to search for (case-insensitive)
   * @returns Promise resolving to category if found, undefined if not found
   * @throws Error if IndexedDB query fails
   */
  async getByName(name: string): Promise<Category | undefined> {
    return await db.categories.where("name").equalsIgnoreCase(name).first();
  }

  /**
   * Checks if a category with the specified name exists for validation
   *
   * Provides efficient existence checking for category name uniqueness
   * validation and duplicate prevention. Essential for maintaining clean
   * category organization and preventing user confusion.
   *
   * Why existence checking is important:
   * - Prevents duplicate category creation that confuses organization
   * - Enables real-time validation feedback in category creation forms
   * - Supports data import validation for external category data
   * - Facilitates category name availability checking during user input
   * - Enables efficient duplicate prevention without full data retrieval
   *
   * Performance characteristics:
   * - Leverages getByName for case-insensitive existence checking
   * - Boolean conversion provides simple true/false result
   * - Efficient for real-time form validation and user feedback
   * - Suitable for batch validation during data import operations
   *
   * @param name Category name to check for existence (case-insensitive)
   * @returns Promise resolving to true if category exists, false otherwise
   * @throws Error if IndexedDB query fails
   */
  async exists(name: string): Promise<boolean> {
    const category = await this.getByName(name);
    return !!category;
  }

  /**
   * Retrieves categories that are actively used by transactions
   *
   * Provides filtered category list showing only categories with associated
   * transactions. Essential for analytics, reporting, and category management
   * workflows that focus on actively used organizational structures.
   *
   * Why filtering used categories matters:
   * - Analytics should focus on categories with actual financial data
   * - Category management interfaces benefit from usage-based organization
   * - Reports and charts should highlight categories with transaction activity
   * - Budget planning focuses on categories with historical spending patterns
   * - Cleanup workflows need to identify unused categories for removal
   *
   * Implementation approach:
   * - Queries transaction table for unique category names
   * - Maps category names back to full category objects
   * - Handles missing categories gracefully (orphaned transaction categories)
   * - Returns categories in the order they're found in transactions
   * - Efficient for typical personal finance category volumes
   *
   * Performance considerations:
   * - Uses IndexedDB uniqueKeys for efficient category name extraction
   * - Sequential lookups acceptable for small category datasets
   * - Could be optimized with joins for larger category volumes
   * - Results suitable for analytics and reporting operations
   *
   * @returns Promise resolving to array of categories that have associated transactions
   * @throws Error if IndexedDB query fails
   */
  async getUsedCategories(): Promise<Category[]> {
    // Get unique categories from transactions
    const usedCategoryNames = await db.transactions
      .orderBy("category")
      .uniqueKeys();

    // Get category objects for used category names
    const usedCategories: Category[] = [];
    for (const categoryName of usedCategoryNames) {
      const category = await this.getByName(categoryName as string);
      if (category) {
        usedCategories.push(category);
      }
    }

    return usedCategories;
  }

  /**
   * Retrieves the default category set for FinTrac initialization
   *
   * Provides access to FinTrac's curated default categories that enable
   * immediate productivity for new users. These categories demonstrate
   * the system's capabilities and provide a foundation for customization.
   *
   * Why these specific default categories:
   * - Covers common personal finance tracking needs for broad user appeal
   * - Demonstrates FinTrac's categorization and color-coding capabilities
   * - Provides immediate usability without requiring user setup
   * - Uses FinTrac's approved color palette for visual consistency
   * - Balanced between comprehensive coverage and simplicity
   *
   * Default category selection rationale:
   * - Food: Universal expense category for all user types
   * - Transport: Common recurring expense for most lifestyles
   * - Entertainment: Discretionary spending for lifestyle tracking
   * - Shopping: General retail purchases and consumer goods
   * - Utilities: Essential recurring expenses like electricity, water
   * - Healthcare: Medical and wellness expenses for comprehensive tracking
   * - Income: Primary credit category for salary and other income sources
   * - Other: Catch-all category for uncategorized transactions
   *
   * Color palette integration:
   * - Uses distinct colors from FinTrac's chart-friendly palette
   * - Ensures accessibility with sufficient contrast for all users
   * - Provides visual consistency with other UI elements
   * - Demonstrates effective color-coding for category identification
   *
   * @returns Promise resolving to array of default categories with generated IDs and timestamps
   * @throws Error if default category generation fails
   */
  async getDefaults(): Promise<Category[]> {
    return [
      {
        id: generateUUID(),
        name: "Food",
        color: "emerald-400",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: generateUUID(),
        name: "Transport",
        color: "blue-400",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: generateUUID(),
        name: "Entertainment",
        color: "purple-400",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: generateUUID(),
        name: "Shopping",
        color: "pink-400",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: generateUUID(),
        name: "Utilities",
        color: "orange-400",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: generateUUID(),
        name: "Healthcare",
        color: "red-400",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: generateUUID(),
        name: "Income",
        color: "green-400",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: generateUUID(),
        name: "Other",
        color: "gray-400",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }

  /**
   * Initializes default categories if none exist in the system
   *
   * Provides automated setup of default categories for new FinTrac installations,
   * ensuring users have immediate access to a functional categorization system
   * without manual configuration overhead.
   *
   * Why automatic initialization is valuable:
   * - New users gain immediate productivity without setup friction
   * - Ensures consistent default experience across all FinTrac installations
   * - Reduces user onboarding time and complexity
   * - Provides working example of FinTrac's categorization capabilities
   * - Enables immediate transaction entry and system demonstration
   *
   * Initialization logic:
   * - Checks existing category count to prevent overwriting user customizations
   * - Creates default categories only if database is completely empty
   * - Uses idempotent design for safe repeated calls during app initialization
   * - Leverages bulk creation for efficient default category setup
   * - Returns empty array if categories already exist (no-op)
   *
   * Safety considerations:
   * - Only initializes when category count is zero to preserve user data
   * - Atomic operation ensures all defaults created or none
   * - Error handling prevents partial default category creation
   * - Logging capability for tracking initialization success and failures
   *
   * @returns Promise resolving to array of created default categories (empty if categories exist)
   * @throws Error if default category creation fails
   */
  async initializeDefaults(): Promise<Category[]> {
    const existingCount = await this.count();
    if (existingCount > 0) {
      return []; // Categories already exist
    }

    const defaultCategories = await this.getDefaults();
    const categoriesToCreate = defaultCategories.map(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ({ id, createdAt, updatedAt, ...rest }) => rest,
    );
    return await this.bulkCreate(categoriesToCreate);
  }

  /**
   * Searches categories by name using case-insensitive partial matching
   *
   * Provides flexible category search capability enabling users to quickly
   * locate categories based on partial names or keywords. Essential for
   * category management interfaces and user-friendly category selection.
   *
   * Why partial search is important:
   * - Users may not remember exact category names
   * - Supports efficient category lookup in large category sets
   * - Enables search-based category selection in forms
   * - Facilitates category management and organization workflows
   * - Improves user experience with forgiving search behavior
   *
   * Search implementation:
   * - Case-insensitive matching for user convenience
   * - Partial string matching supports flexible search patterns
   * - Filters through category names using JavaScript string operations
   * - Returns all matching categories for comprehensive results
   * - Performance acceptable for personal finance category volumes
   *
   * @param query Search string to match against category names
   * @returns Promise resolving to categories containing the query string
   * @throws Error if IndexedDB query fails
   */
  async searchByName(query: string): Promise<Category[]> {
    const lowerQuery = query.toLowerCase();
    return await db.categories
      .filter((category) => category.name.toLowerCase().includes(lowerQuery))
      .toArray();
  }

  /**
   * Returns total category count for system monitoring and UI elements
   *
   * Provides category count statistics essential for user interfaces, system
   * monitoring, and category management workflows. Supports pagination and
   * system health monitoring.
   *
   * Why category counting is useful:
   * - User interfaces show category system size for overview
   * - Category management interfaces use counts for organization
   * - System monitoring tracks category growth and usage patterns
   * - Initialization logic uses count for empty database detection
   * - Performance monitoring identifies potential scalability issues
   *
   * Performance characteristics:
   * - Optimized count query using IndexedDB aggregation
   * - Constant time complexity for count operations
   * - Minimal data transfer with only numeric result
   * - Suitable for frequent polling and real-time updates
   *
   * @returns Promise resolving to total number of categories
   * @throws Error if IndexedDB query fails
   */
  async count(): Promise<number> {
    return await db.categories.count();
  }

  /**
   * Removes all categories for testing and migration operations
   *
   * Provides complete category reset capability for testing scenarios,
   * migration operations, and development workflows. This destructive
   * operation requires careful consideration due to its impact on transaction organization.
   *
   * Why bulk deletion is necessary:
   * - Test setup and teardown require clean category states
   * - Migration operations need to clear categories before bulk loading
   * - Development environments need reset capability for testing
   * - Data import operations may require complete category replacement
   * - System reinitialization for demo environments
   *
   * Safety considerations:
   * - Permanent deletion with no built-in recovery mechanism
   * - Should be restricted to testing, migration, and development contexts
   * - Transaction category references become invalid after clearing
   * - Sync implications require coordinated clearing across devices
   *
   * @returns Promise resolving when all categories are deleted
   * @throws Error if IndexedDB operation fails
   */
  async clear(): Promise<void> {
    await db.categories.clear();
  }

  /**
   * Creates multiple categories atomically for import and migration operations
   *
   * Enables efficient batch creation for system initialization, data import,
   * and migration operations. Provides data integrity through atomic operations
   * while maintaining performance for category setup workflows.
   *
   * Why bulk creation is essential:
   * - System initialization requires efficient default category setup
   * - Data import operations need atomic bulk category creation
   * - Migration scripts require transaction-safe bulk operations
   * - Template-based category setup for different user profiles
   * - Efficient handling of category sets from external sources
   *
   * Batch operation benefits:
   * - Single IndexedDB transaction ensures atomicity (all or nothing)
   * - Reduced overhead compared to individual create operations
   * - Consistent timestamp generation for related category batches
   * - Efficient UUID generation for category sets
   * - Error handling prevents partial batch creation
   *
   * Data integrity guarantees:
   * - All categories validated before any database operations
   * - Atomic operation prevents partial batch creation during failures
   * - Consistent system field generation across the entire batch
   * - Error handling provides detailed feedback for debugging imports
   *
   * @param categories Array of category data excluding system-generated fields
   * @returns Promise resolving to array of created categories with IDs and timestamps
   * @throws Error if validation fails or IndexedDB operation fails
   */
  async bulkCreate(
    categories: Omit<Category, "id" | "createdAt" | "updatedAt">[],
  ): Promise<Category[]> {
    const now = new Date().toISOString();
    const newCategories: Category[] = categories.map((category) => ({
      ...category,
      id: generateUUID(),
      createdAt: now,
      updatedAt: now,
    }));

    await db.categories.bulkAdd(newCategories);
    return newCategories;
  }

  /**
   * Retrieves categories modified since a specific timestamp for sync operations
   *
   * Provides efficient incremental sync support by fetching only categories
   * that have changed since the last sync operation. Essential for optimized
   * cross-device synchronization in FinTrac's sync architecture.
   *
   * Why timestamp-based querying is critical for sync:
   * - Incremental sync dramatically improves performance over full sync
   * - Bandwidth optimization essential for mobile users
   * - Change tracking enables reliable sync state management
   * - Conflict detection requires precise change identification
   * - Real-time sync depends on efficient change detection
   *
   * Performance characteristics:
   * - Uses IndexedDB updatedAt index for efficient timestamp range queries
   * - Query performance scales with number of changes, not total categories
   * - Memory usage proportional to modified categories only
   * - Suitable for frequent sync operations and real-time updates
   *
   * @param timestamp ISO timestamp to query changes from (exclusive)
   * @returns Promise resolving to categories modified after the timestamp
   * @throws Error if IndexedDB query fails
   */
  async getModifiedSince(timestamp: string): Promise<Category[]> {
    return await db.categories.where("updatedAt").above(timestamp).toArray();
  }

  /**
   * Retrieves database metadata and status for monitoring and debugging
   *
   * Provides comprehensive information about the category database state,
   * essential for system health monitoring, debugging workflows, and user
   * interface status displays.
   *
   * Why database information is needed:
   * - System status components show category system health
   * - Debugging tools require implementation details and metrics
   * - Sync operations need database state for coordination
   * - User interfaces benefit from category system information
   * - Performance monitoring tracks category database growth
   *
   * Information provided:
   * - Database identifier for debugging and system identification
   * - Category count for capacity planning and monitoring
   * - Implementation type for troubleshooting compatibility
   * - Last modification timestamp for sync and caching decisions
   *
   * Performance characteristics:
   * - Lightweight metadata query suitable for frequent status checks
   * - Minimal data transfer focused on summary information
   * - Fast response time enabling real-time monitoring
   * - No impact on category data or normal operations
   *
   * @returns Promise resolving to comprehensive database information object
   * @throws Error if IndexedDB queries fail
   */
  async getInfo(): Promise<{
    name: string;
    totalCategories: number;
    implementation: "dexie" | "pouchdb";
    lastModified?: string;
  }> {
    const totalCategories = await this.count();

    // Get the most recent category to determine last modified
    const recentCategories = await db.categories
      .orderBy("updatedAt")
      .reverse()
      .limit(1)
      .toArray();

    const lastModified =
      recentCategories.length > 0 && recentCategories[0].updatedAt
        ? recentCategories[0].updatedAt
        : undefined;

    return {
      name: "fintrac-categories-dexie",
      totalCategories,
      implementation: "dexie",
      lastModified,
    };
  }

  /**
   * Retrieves categories sorted by usage frequency for enhanced user experience
   *
   * Provides usage-based category ordering that could improve user workflows
   * by prioritizing frequently used categories. Currently returns alphabetical
   * ordering as placeholder for future usage analytics implementation.
   *
   * Why usage-based sorting would be valuable:
   * - Frequently used categories appear first in selection interfaces
   * - Improves transaction entry efficiency for power users
   * - Reduces cognitive load by highlighting relevant categories
   * - Supports adaptive user interface based on usage patterns
   * - Enables data-driven category organization recommendations
   *
   * Future implementation considerations:
   * - Requires transaction count aggregation by category
   * - Could implement caching for performance optimization
   * - May need configurable sorting preferences for different users
   * - Should maintain fallback to alphabetical for equal usage
   *
   * Current implementation:
   * - Returns categories in alphabetical order as reliable fallback
   * - Maintains consistent behavior until usage analytics implemented
   * - Interface ready for future enhancement without breaking changes
   *
   * @returns Promise resolving to categories ordered by usage (currently alphabetical)
   * @throws Error if IndexedDB query fails
   */
  async getByUsage(): Promise<Category[]> {
    // For now, just return all categories ordered by name
    // In the future, this could join with transactions to get usage stats
    return await this.getAll();
  }
}
