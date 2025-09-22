import type { Category } from "../../features/transactions/types";

/**
 * Category Repository Interface for FinTrac Personal Finance Tracker
 *
 * Defines the comprehensive contract for category data operations in FinTrac's
 * organizational system. Categories are fundamental to FinTrac's value proposition,
 * enabling users to organize, analyze, and visualize their financial transactions
 * in meaningful ways for better financial decision-making.
 *
 * Why this interface exists:
 * - Categories are the primary organizational structure for financial transactions
 * - Enables clean separation between business logic and data persistence layer
 * - Supports multiple storage implementations while maintaining consistent API
 * - Provides type-safe contract for all category management operations
 * - Facilitates testing through mock implementations and dependency injection
 * - Ensures consistent error handling across different storage backends
 *
 * Category importance in FinTrac:
 * - Essential for transaction organization and financial analysis
 * - Powers budget tracking and spending pattern identification
 * - Enables visual categorization in charts and analytics
 * - Supports user customization of financial tracking system
 * - Foundation for advanced features like budget alerts and recommendations
 *
 * Design principles:
 * - All operations return Promises for consistent async handling
 * - Simple data model focused on name and visual representation
 * - User-defined categories support personalized financial tracking
 * - Default categories provide immediate usability for new users
 * - Efficient querying for real-time UI updates and analytics
 * - Referential integrity considerations with transaction relationships
 */
export interface ICategoryRepository {
  /**
   * Creates a new category in FinTrac's organizational system
   *
   * This method enables users to create personalized financial categories that
   * reflect their unique spending patterns and financial tracking needs. It's
   * essential for customizing FinTrac to match individual financial management styles.
   *
   * Why category creation is important:
   * - Users need personalized categories beyond the default set
   * - Different users have different spending patterns requiring unique categories
   * - Category customization increases user engagement and system adoption
   * - Proper categorization improves financial analytics and budgeting accuracy
   * - Custom categories enable detailed expense tracking for specific goals
   *
   * Data processing responsibilities:
   * - Generates unique UUID for the category identifier
   * - Validates category name uniqueness to prevent duplicates
   * - Ensures color value follows Tailwind CSS format for UI consistency
   * - Sets up category for immediate use in transaction forms
   * - Maintains referential integrity for future transaction associations
   *
   * UI integration considerations:
   * - New categories immediately available in transaction forms
   * - Color selection appears consistently across charts and interfaces
   * - Category names support international characters and emojis
   * - Creation flow integrated with transaction entry workflows
   *
   * Connects to:
   * - Category management interfaces for user customization
   * - Transaction forms for immediate category usage
   * - Budget setup workflows for goal-based categorization
   * - Import utilities for creating categories from external data
   * - Onboarding flows for personalizing default category set
   *
   * @param category Category data with name and color, excluding system-generated ID
   * @returns Promise resolving to the created category with generated ID
   * @throws ValidationError if category data is invalid or name already exists
   * @throws StorageError if database operation fails
   */
  create(category: Omit<Category, "id">): Promise<Category>;

  /**
   * Retrieves all categories for comprehensive financial organization
   *
   * Provides access to the complete category system, essential for transaction
   * forms, analytics displays, and category management interfaces. This method
   * powers FinTrac's core categorization functionality across the application.
   *
   * Why complete category access is needed:
   * - Transaction forms need full category list for user selection
   * - Analytics components require complete category set for comprehensive reporting
   * - Category management interfaces need full list for editing and organization
   * - Chart legends and color coding depend on complete category information
   * - Export utilities need all categories for complete data representation
   *
   * Performance characteristics:
   * - Category count typically small (10-50 categories) for personal finance
   * - Full list retrieval acceptable given small dataset size
   * - Caching-friendly for frequent UI updates and form populations
   * - Memory usage minimal compared to transaction data volume
   * - Query performance excellent due to small table size
   *
   * Data organization:
   * - Results ordered alphabetically for consistent user interface presentation
   * - Includes both default and user-created categories
   * - Color information preserved for consistent visual representation
   * - All categories available regardless of usage status
   *
   * Connects to:
   * - Transaction forms for category selection dropdowns
   * - Category management pages for editing and organization
   * - Chart components for legend generation and color coordination
   * - Analytics dashboards for comprehensive spending analysis
   * - Export utilities for complete financial data representation
   *
   * @returns Promise resolving to array of all categories ordered alphabetically
   * @throws StorageError if database query fails
   */
  getAll(): Promise<Category[]>;

  /**
   * Retrieves a specific category by its unique identifier
   *
   * Enables direct access to individual category records for detailed views,
   * editing operations, and referential integrity checks. Essential for
   * category management workflows and transaction validation.
   *
   * Why direct ID lookup is important:
   * - Category edit forms need current category state for modification
   * - Transaction validation requires category existence verification
   * - UI components need specific category details for display and interaction
   * - Sync operations need individual category access for conflict resolution
   * - Referential integrity checks require efficient category lookup
   *
   * Performance optimization:
   * - Uses primary key index for O(1) lookup performance
   * - Minimal data transfer for single record retrieval
   * - Suitable for real-time UI updates and form population
   * - Efficient for high-frequency validation operations
   *
   * Connects to:
   * - Category edit forms and management interfaces
   * - Transaction validation for ensuring category existence
   * - UI components displaying category-specific information
   * - Sync operations for individual category conflict resolution
   * - Analytics components requiring specific category details
   *
   * @param id Unique category identifier (UUID format)
   * @returns Promise resolving to category if found, undefined if not found
   * @throws StorageError if database query fails
   */
  getById(id: string): Promise<Category | undefined>;

  /**
   * Retrieves a category by its display name for user-friendly lookups
   *
   * Enables name-based category lookup essential for user interfaces,
   * data import operations, and duplicate prevention. This method supports
   * intuitive category management where users think in terms of category names.
   *
   * Why name-based lookup is essential:
   * - Users identify categories by name, not technical IDs
   * - Data import operations often reference categories by name
   * - Duplicate prevention requires name-based existence checking
   * - User interfaces benefit from name-based category operations
   * - Search and autocomplete features need name-based category access
   *
   * Search behavior:
   * - Exact case-sensitive string matching for data consistency
   * - Single result expected due to name uniqueness constraints
   * - Handles special characters and international names properly
   * - Returns undefined for non-existent categories without errors
   *
   * Use case scenarios:
   * - Import utilities mapping external category names to internal IDs
   * - User interfaces providing name-based category search
   * - Validation workflows checking category name availability
   * - Data migration scripts matching categories across systems
   * - API endpoints accepting category names instead of IDs
   *
   * Connects to:
   * - Data import utilities for external category mapping
   * - Category search and autocomplete interfaces
   * - Validation workflows for duplicate name prevention
   * - Migration scripts for cross-system category matching
   * - User-friendly API endpoints accepting category names
   *
   * @param name Exact category name to search for
   * @returns Promise resolving to category if found, undefined if not found
   * @throws StorageError if database query fails
   */
  getByName(name: string): Promise<Category | undefined>;

  /**
   * Updates an existing category with new information
   *
   * Handles category modification while maintaining data integrity and
   * preserving relationships with existing transactions. Critical for
   * category refinement and organizational system evolution.
   *
   * Why category updates are necessary:
   * - Users refine category names as their financial tracking evolves
   * - Color scheme changes improve visual organization and accessibility
   * - Category consolidation requires merging or renaming existing categories
   * - Typo corrections and internationalization require name updates
   * - Visual improvements need color and display property modifications
   *
   * Update constraints and validation:
   * - Category ID cannot be modified to preserve referential integrity
   * - Name uniqueness enforced to prevent duplicate categories
   * - Color format validated for Tailwind CSS compatibility
   * - Transaction relationships preserved during category updates
   * - Change propagation to dependent transaction records
   *
   * Impact on related data:
   * - Existing transactions retain connection to updated category
   * - Chart displays immediately reflect color and name changes
   * - Analytics and reports use updated category information
   * - Export operations include updated category details
   * - Search indexes updated with new category information
   *
   * Connects to:
   * - Category management interfaces for user-driven updates
   * - Data cleanup utilities for category organization and consolidation
   * - Theme and accessibility tools for color scheme updates
   * - Migration scripts for category harmonization across systems
   * - Bulk edit operations for systematic category improvements
   *
   * @param id Category ID to update
   * @param updates Partial category data with fields to modify
   * @returns Promise resolving to the updated category with new information
   * @throws NotFoundError if category ID doesn't exist
   * @throws ValidationError if update data is invalid or creates duplicates
   * @throws StorageError if database operation fails
   */
  update(id: string, updates: Partial<Omit<Category, "id">>): Promise<Category>;

  /**
   * Permanently removes a category from FinTrac's organizational system
   *
   * Provides category deletion with consideration for referential integrity
   * and transaction relationships. This operation requires careful handling
   * due to its impact on existing financial data organization.
   *
   * Why category deletion is necessary:
   * - Remove unused categories to simplify user interface and organization
   * - Delete duplicate categories created during import or setup processes
   * - Clean up test categories during development and system setup
   * - Eliminate categories that no longer match user's financial organization
   * - Maintain clean category list for better user experience
   *
   * Referential integrity considerations:
   * - Categories with existing transactions require special handling
   * - Implementation should prevent deletion of categories in use
   * - Alternative: provide transaction reassignment before deletion
   * - Audit trail implications for transaction category history
   * - Sync implications for category deletion across devices
   *
   * Safety measures:
   * - Verify no transactions reference the category before deletion
   * - Provide clear warnings about deletion consequences
   * - Consider soft deletion for categories with transaction history
   * - Implement confirmation workflows for user safety
   * - Log deletion operations for audit purposes
   *
   * Connects to:
   * - Category management interfaces with deletion confirmations
   * - Data cleanup utilities for category consolidation
   * - Migration scripts for removing obsolete categories
   * - Admin tools for system maintenance and organization
   * - Bulk operations for category system optimization
   *
   * @param id Category ID to delete
   * @returns Promise resolving when deletion is complete
   * @throws NotFoundError if category ID doesn't exist
   * @throws ReferentialIntegrityError if category is used by transactions
   * @throws StorageError if database operation fails
   */
  delete(id: string): Promise<void>;

  /**
   * Checks if a category with the specified name already exists
   *
   * Provides efficient existence checking for category name uniqueness
   * validation. Essential for preventing duplicate categories and providing
   * real-time feedback during category creation and editing workflows.
   *
   * Why existence checking is important:
   * - Prevents duplicate category creation that confuses users and analytics
   * - Enables real-time validation feedback in category creation forms
   * - Supports data import validation for external category data
   * - Facilitates category name availability checking during user input
   * - Enables efficient duplicate prevention without full data retrieval
   *
   * Performance characteristics:
   * - Optimized boolean check without full record retrieval
   * - Constant time complexity O(1) using name indexing
   * - Minimal network and memory overhead for validation
   * - Suitable for real-time form validation and user feedback
   * - Efficient for batch validation during data import operations
   *
   * Validation use cases:
   * - Real-time form validation during category name entry
   * - Batch validation during CSV import operations
   * - API validation for category creation requests
   * - Data migration validation for preventing duplicates
   * - User interface enablement/disablement of form submission
   *
   * Connects to:
   * - Category creation forms for real-time name validation
   * - Data import utilities for duplicate prevention
   * - API validation middleware for category operations
   * - User interface components for form validation feedback
   * - Migration scripts for duplicate detection and handling
   *
   * @param name Category name to check for existence
   * @returns Promise resolving to true if category exists, false otherwise
   * @throws StorageError if database query fails
   */
  exists(name: string): Promise<boolean>;

  /**
   * Retrieves categories that are actively used by transactions
   *
   * Provides filtered category list showing only categories with associated
   * transactions. Essential for analytics, reporting, and category management
   * workflows that focus on actively used organizational structures.
   *
   * Why filtering used categories matters:
   * - Analytics should focus on categories with actual transaction data
   * - Category management interfaces benefit from usage-based organization
   * - Reports and charts should exclude empty categories for clarity
   * - Budget planning focuses on categories with historical spending data
   * - Cleanup operations need to identify unused categories for potential removal
   *
   * Query implementation:
   * - Joins category and transaction tables for usage analysis
   * - Returns categories with at least one associated transaction
   * - Maintains category information including color for display consistency
   * - Results ordered by usage frequency or alphabetically for predictable UI
   * - Efficient query design for good performance with large transaction volumes
   *
   * Use case scenarios:
   * - Dashboard analytics focusing on spending patterns in used categories
   * - Budget setup workflows pre-populated with historically used categories
   * - Category management interfaces highlighting active vs unused categories
   * - Report generation excluding empty categories for cleaner presentation
   * - Chart components showing only categories with data for meaningful visualization
   *
   * Connects to:
   * - Dashboard analytics for spending pattern analysis
   * - Budget planning interfaces for historically-based budget creation
   * - Category management tools for usage-based organization
   * - Report generation utilities for focused financial analysis
   * - Chart components for meaningful data visualization
   *
   * @returns Promise resolving to array of categories that have associated transactions
   * @throws StorageError if database query fails
   */
  getUsedCategories(): Promise<Category[]>;

  /**
   * Returns the total count of categories in FinTrac
   *
   * Provides category count statistics for user interfaces, system monitoring,
   * and category management workflows. Essential for displaying organizational
   * system size and supporting pagination in category management interfaces.
   *
   * Why category counting is useful:
   * - User interfaces show total category count for system overview
   * - Category management interfaces use counts for pagination and organization
   * - System monitoring tracks category growth and usage patterns
   * - Performance monitoring identifies potential scalability concerns
   * - User experience benefits from understanding system scale and complexity
   *
   * Performance characteristics:
   * - Optimized count query using database aggregation functions
   * - Constant time complexity O(1) for count operations
   * - Minimal data transfer with only count result returned
   * - Suitable for frequent polling and real-time interface updates
   * - No impact on category data or normal operations
   *
   * Interface integration:
   * - Category management pages show total category count in headers
   * - System status displays include category count for completeness
   * - User onboarding shows category customization progress
   * - Analytics dashboards include category system size metrics
   * - Export utilities show progress based on total category count
   *
   * Connects to:
   * - Category management interfaces for system overview displays
   * - System monitoring and analytics for usage tracking
   * - User interfaces requiring category system size information
   * - Export utilities for progress tracking and completion metrics
   * - Performance monitoring for scalability analysis
   *
   * @returns Promise resolving to the total number of categories in the system
   * @throws StorageError if database query fails
   */
  count(): Promise<number>;

  /**
   * Removes all categories from the database for testing and migration
   *
   * Provides complete category reset capability for testing scenarios,
   * migration operations, and system reinitialization. This destructive
   * operation requires careful consideration due to its impact on transaction organization.
   *
   * Why bulk category deletion is necessary:
   * - Test setup and teardown require clean category states
   * - Migration operations need to clear categories before bulk loading
   * - Development environments need reset capability for testing scenarios
   * - Data import operations may require complete category replacement
   * - System reinitialization for demo or training environments
   *
   * Referential integrity implications:
   * - Categories with associated transactions create referential integrity issues
   * - Implementation should handle or prevent clearing categories in use
   * - Transaction category references may become invalid after clearing
   * - Consider transaction cleanup or category reassignment strategies
   * - Sync implications for category clearing across multiple devices
   *
   * Safety considerations:
   * - Permanent deletion with no built-in recovery mechanism
   * - Should be restricted to testing, migration, and development contexts
   * - Production use requires comprehensive confirmation and backup procedures
   * - Consider transaction impact and cleanup requirements
   * - Audit logging for category clearing operations
   *
   * Connects to:
   * - Test utilities for database setup and teardown procedures
   * - Migration scripts for category system replacement operations
   * - Development tools for resetting application state
   * - Data import utilities requiring clean category foundation
   * - Admin interfaces for system maintenance (with appropriate safeguards)
   *
   * @returns Promise resolving when all categories are deleted
   * @throws ReferentialIntegrityError if categories are referenced by transactions
   * @throws StorageError if database operation fails
   */
  clear(): Promise<void>;

  /**
   * Creates multiple categories in a single atomic operation
   *
   * Enables efficient batch creation for data import, migration, and system
   * initialization operations. This method is essential for handling category
   * sets while maintaining data integrity and performance.
   *
   * Why bulk category creation is essential:
   * - System initialization requires efficient default category setup
   * - Data import operations need to create category sets from external sources
   * - Migration scripts require atomic bulk operations for data integrity
   * - User onboarding benefits from pre-configured category sets
   * - Template-based category setup for different financial tracking styles
   *
   * Batch operation benefits:
   * - Single database transaction ensures atomicity (all or nothing)
   * - Reduced overhead compared to individual create operations
   * - Consistent ID generation and validation across the batch
   * - Efficient handling of category name uniqueness validation
   * - Progress tracking for long-running category setup operations
   *
   * Data processing responsibilities:
   * - Generates unique UUIDs for all category IDs in the batch
   * - Validates category name uniqueness across the entire batch
   * - Ensures color format consistency for all categories
   * - Maintains input order in the output array for predictable results
   * - Handles duplicate names within the batch gracefully
   *
   * Error handling strategies:
   * - Validation errors prevent entire batch from being created
   * - Database errors rollback any partial operations
   * - Detailed error reporting for debugging failed bulk operations
   * - Recovery mechanisms for interrupted bulk creation operations
   *
   * Connects to:
   * - System initialization for default category setup
   * - Data import utilities for external category loading
   * - Migration scripts for category system transfer
   * - User onboarding for template-based category configuration
   * - Testing utilities for setting up complex category scenarios
   *
   * @param categories Array of category data excluding system-generated IDs
   * @returns Promise resolving to array of created categories with generated IDs
   * @throws ValidationError if any category data is invalid or names are duplicated
   * @throws StorageError if database operation fails
   */
  bulkCreate(categories: Omit<Category, "id">[]): Promise<Category[]>;

  /**
   * Retrieves the default category set for FinTrac initialization
   *
   * Provides access to FinTrac's curated default categories that offer
   * immediate usability for new users. These categories represent common
   * personal finance tracking needs and demonstrate the system's capabilities.
   *
   * Why default categories are important:
   * - New users need immediate productivity without extensive setup
   * - Default categories demonstrate FinTrac's categorization capabilities
   * - Provides foundation for users to customize their financial tracking
   * - Ensures consistent user experience across new installations
   * - Serves as template for different financial tracking approaches
   *
   * Default category characteristics:
   * - Covers common personal finance categories (Food, Transport, etc.)
   * - Uses FinTrac's approved color palette for visual consistency
   * - Balanced between comprehensive coverage and simplicity
   * - Suitable for immediate transaction entry and categorization
   * - Demonstrates both expense and income category types
   *
   * Customization foundation:
   * - Users can modify default categories to match their needs
   * - Provides starting point for personalized category systems
   * - Colors selected for accessibility and visual distinction
   * - Category names chosen for broad applicability across user types
   * - Structure supports extension with additional user-defined categories
   *
   * Connects to:
   * - System initialization for new user setup
   * - Onboarding workflows for demonstrating categorization
   * - Category management interfaces for reset and template options
   * - User preference systems for default category selection
   * - Testing utilities for consistent category setup across test scenarios
   *
   * @returns Promise resolving to array of default categories with generated IDs
   * @throws StorageError if default category data cannot be accessed
   */
  getDefaults(): Promise<Category[]>;

  /**
   * Initializes default categories if none exist in the system
   *
   * Provides automated setup of default categories for new FinTrac installations,
   * ensuring users have immediate access to a functional categorization system
   * without manual configuration requirements.
   *
   * Why automatic initialization is valuable:
   * - New users gain immediate productivity without setup overhead
   * - Ensures consistent default experience across all FinTrac installations
   * - Reduces user onboarding friction and time-to-value
   * - Provides working example of FinTrac's categorization system
   * - Enables immediate transaction entry and demonstration of features
   *
   * Initialization logic:
   * - Checks if any categories exist before creating defaults
   * - Creates default categories only if category count is zero
   * - Uses idempotent operation design for safe repeated calls
   * - Maintains default category set consistency across versions
   * - Handles concurrent initialization attempts gracefully
   *
   * Default category strategy:
   * - Comprehensive set covering common personal finance needs
   * - Visual consistency with FinTrac's design system and color palette
   * - Balance between usefulness and simplicity for new users
   * - Categories suitable for both expense and income tracking
   * - Foundation for user customization and system personalization
   *
   * Safety considerations:
   * - Only creates categories when none exist to preserve user customizations
   * - Atomic operation ensures all defaults created or none
   * - Error handling prevents partial default category creation
   * - Logging for tracking initialization success and failures
   * - Recovery mechanisms for failed initialization attempts
   *
   * Connects to:
   * - Application startup routines for automatic system setup
   * - User onboarding workflows for immediate system usability
   * - Database migration scripts for new installation setup
   * - Reset utilities for restoring default category configuration
   * - Testing frameworks for consistent test environment setup
   *
   * @returns Promise resolving to array of created default categories
   * @throws StorageError if default category creation fails
   */
  initializeDefaults(): Promise<Category[]>;

  /**
   * Retrieves database metadata and status information for categories
   *
   * Provides system information about the category database for monitoring,
   * debugging, and user interface elements. Essential for system health checks
   * and troubleshooting category-related issues.
   *
   * Why category database information is needed:
   * - System status displays show category system health and connectivity
   * - Debugging tools need database implementation and performance details
   * - Monitoring systems track category data growth and usage patterns
   * - User interfaces benefit from category system size and status information
   * - Sync operations need category database metadata for coordination
   *
   * Information provided:
   * - Database name for identification and debugging purposes
   * - Total category count for system size and capacity monitoring
   * - Implementation type for troubleshooting and compatibility verification
   * - Last modification time for sync coordination and caching decisions
   * - Additional metadata supporting system monitoring and analytics
   *
   * Performance characteristics:
   * - Lightweight operation suitable for frequent status polling
   * - Minimal data transfer focused on metadata rather than content
   * - Fast response time enabling real-time system status updates
   * - No impact on category data or normal category operations
   * - Efficient aggregation queries for count and timestamp information
   *
   * Connects to:
   * - System status components and health monitoring displays
   * - Debugging tools and development utilities for category system analysis
   * - Sync coordination systems for category database state management
   * - Performance monitoring and analytics for category system optimization
   * - User interface elements showing category system information and status
   *
   * @returns Promise resolving to category database information object
   * @throws StorageError if database metadata query fails
   */
  getInfo(): Promise<{
    name: string;
    totalCategories: number;
    implementation: "dexie" | "pouchdb";
    lastModified?: string;
  }>;
}
