import type { Category } from "../../features/transactions/types";

/**
 * Category Repository Interface
 *
 * Defines the contract for category data operations.
 * This interface allows switching between different implementations
 * (Dexie vs PouchDB) without changing the consuming code.
 */
export interface ICategoryRepository {
  /**
   * Create a new category
   * @param category Category data (without id)
   * @returns Promise resolving to the created category with generated id
   */
  create(category: Omit<Category, "id">): Promise<Category>;

  /**
   * Get all categories
   * @returns Promise resolving to array of all categories
   */
  getAll(): Promise<Category[]>;

  /**
   * Get a category by ID
   * @param id Category ID
   * @returns Promise resolving to the category or undefined if not found
   */
  getById(id: string): Promise<Category | undefined>;

  /**
   * Get a category by name
   * @param name Category name
   * @returns Promise resolving to the category or undefined if not found
   */
  getByName(name: string): Promise<Category | undefined>;

  /**
   * Update a category
   * @param id Category ID
   * @param updates Partial category data to update
   * @returns Promise resolving to the updated category
   */
  update(id: string, updates: Partial<Omit<Category, "id">>): Promise<Category>;

  /**
   * Delete a category
   * @param id Category ID
   * @returns Promise resolving to void
   */
  delete(id: string): Promise<void>;

  /**
   * Check if a category exists by name
   * @param name Category name
   * @returns Promise resolving to boolean indicating if category exists
   */
  exists(name: string): Promise<boolean>;

  /**
   * Get categories used by transactions (categories that have transactions)
   * @returns Promise resolving to array of categories that are in use
   */
  getUsedCategories(): Promise<Category[]>;

  /**
   * Get total count of categories
   * @returns Promise resolving to the total number of categories
   */
  count(): Promise<number>;

  /**
   * Clear all categories (used for testing/migration)
   * @returns Promise resolving to void
   */
  clear(): Promise<void>;

  /**
   * Bulk create categories (used for migration/import)
   * @param categories Array of categories to create
   * @returns Promise resolving to array of created categories
   */
  bulkCreate(categories: Omit<Category, "id">[]): Promise<Category[]>;

  /**
   * Get default categories for initialization
   * @returns Promise resolving to array of default categories
   */
  getDefaults(): Promise<Category[]>;

  /**
   * Initialize default categories if none exist
   * @returns Promise resolving to array of created default categories
   */
  initializeDefaults(): Promise<Category[]>;

  /**
   * Get database info and status
   * @returns Promise resolving to database information
   */
  getInfo(): Promise<{
    name: string;
    totalCategories: number;
    implementation: "dexie" | "pouchdb";
    lastModified?: string;
  }>;
}
