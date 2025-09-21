import { BasePouchRepository } from "../pouchdb/BasePouchRepository";
import type { Category } from "../../features/transactions/types";
import type { PouchCategory } from "../pouchdb/schema";
import { categoryToPouchDoc, pouchDocToCategory } from "../pouchdb/schema";

/**
 * PouchDB-based repository class for category CRUD operations.
 *
 * This class provides category management functionality using PouchDB for local-first
 * storage with optional CouchDB sync capabilities. It's designed to work alongside
 * the transaction repository for complete financial data management.
 *
 * Note: This is a basic implementation for future use as categories are not
 * currently actively used in the UI. The implementation can be expanded when
 * category management features are added to the application.
 *
 * Assumptions:
 * - PouchDB is available globally from CDN
 * - Category names are unique within the application
 * - Colors are stored as Tailwind CSS color classes
 *
 * Edge cases:
 * - Handles PouchDB document conflicts during updates
 * - Validates color format and name uniqueness
 * - Manages deletion with proper revision handling
 *
 * Connections:
 * - Future integration with transaction categories
 * - Supports category-based transaction filtering
 * - Enables category color coding in UI components
 */
export class PouchCategoryRepository extends BasePouchRepository<Category> {
  private readonly CATEGORY_PREFIX = "category_";
  private readonly DOC_TYPE = "category";

  /**
   * Validates category document data before database operations.
   * Ensures all required fields are present and valid.
   *
   * @param data Partial category data to validate
   * @throws Error if validation fails
   */
  protected validateDocument(data: Partial<Category>): void {
    if (data.name !== undefined && !data.name.trim()) {
      throw new Error("Category name is required and cannot be empty");
    }

    if (data.color !== undefined && !data.color.trim()) {
      throw new Error("Category color is required and cannot be empty");
    }

    // Basic color validation - ensure it looks like a Tailwind color class
    if (data.color !== undefined && !this.isValidTailwindColor(data.color)) {
      throw new Error(
        "Category color must be a valid Tailwind CSS color class",
      );
    }
  }

  /**
   * Validates that a color string looks like a valid Tailwind CSS color class.
   *
   * @param color Color string to validate
   * @returns boolean True if color appears to be a valid Tailwind color
   */
  private isValidTailwindColor(color: string): boolean {
    // Basic validation for Tailwind color format (e.g., "blue-500", "emerald-400")
    const tailwindColorRegex = /^[a-z]+-\d{3}$/;
    return tailwindColorRegex.test(color);
  }

  /**
   * Converts PouchDB document to Category model.
   *
   * @param doc PouchDB document
   * @returns Category Application model
   */
  protected convertToAppModel(doc: PouchCategory): Category {
    return pouchDocToCategory(doc);
  }

  /**
   * Converts Category model to PouchDB document.
   *
   * @param model Category model
   * @returns PouchCategory PouchDB document
   */
  protected convertToPouchDoc(model: Category): PouchCategory {
    const pouchDoc = categoryToPouchDoc(model);
    // Ensure proper document ID format
    if (!pouchDoc._id.startsWith(this.CATEGORY_PREFIX)) {
      pouchDoc._id = `${this.CATEGORY_PREFIX}${model.id}`;
    }
    return pouchDoc;
  }

  /**
   * Ensures name index exists for efficient name-based queries.
   */
  private async ensureNameIndex(): Promise<void> {
    await this.ensureIndex(
      { fields: ["docType", "name"] },
      "category-name-index",
    );
  }

  /**
   * Retrieves all categories from PouchDB.
   *
   * Fetches all category documents from the local PouchDB instance.
   * Orders by name for consistent UI display.
   *
   * @returns Promise<Category[]> Array of all categories
   */
  async getAll(): Promise<Category[]> {
    return this.executeWithErrorHandling(async () => {
      const startkey = `${this.CATEGORY_PREFIX}`;
      const endkey = `${this.CATEGORY_PREFIX}\ufff0`;

      const categories = await this.getAllByKeyRange(startkey, endkey);

      // Sort by name for consistent ordering
      return categories.sort((a, b) => a.name.localeCompare(b.name));
    }, "getAll");
  }

  /**
   * Creates a new category in PouchDB.
   *
   * Validates that the category name is unique before creation.
   *
   * @param category Category data without id
   * @returns Promise<void>
   * @throws Error if category name already exists
   */
  async create(category: Omit<Category, "id">): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      // Check for name uniqueness
      await this.validateNameUnique(category.name);

      const id = crypto.randomUUID();
      const newCategory: Category = {
        ...category,
        id,
      };

      await this.createDocument(newCategory);
    }, "create");
  }

  /**
   * Updates an existing category in PouchDB.
   *
   * Validates name uniqueness if name is being updated.
   *
   * @param id Category ID
   * @param updates Partial category data to update
   * @returns Promise<void>
   */
  async update(
    id: string,
    updates: Partial<Omit<Category, "id">>,
  ): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      // If name is being updated, check for uniqueness
      if (updates.name) {
        await this.validateNameUnique(updates.name, id);
      }

      const docId = `${this.CATEGORY_PREFIX}${id}`;
      await this.updateDocument(docId, updates);
    }, "update");
  }

  /**
   * Deletes a category from PouchDB.
   *
   * Note: In a future implementation, this should check if the category
   * is being used by any transactions before allowing deletion.
   *
   * @param id Category ID
   * @returns Promise<void>
   */
  async delete(id: string): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      const docId = `${this.CATEGORY_PREFIX}${id}`;
      await this.deleteDocument(docId);
    }, "delete");
  }

  /**
   * Gets a category by its ID.
   *
   * @param id Category ID
   * @returns Promise<Category | null> Category or null if not found
   */
  async getById(id: string): Promise<Category | null> {
    const docId = `${this.CATEGORY_PREFIX}${id}`;
    return await this.getById(docId);
  }

  /**
   * Gets a category by its name.
   *
   * @param name Category name
   * @returns Promise<Category | null> Category or null if not found
   */
  async getByName(name: string): Promise<Category | null> {
    return this.executeWithErrorHandling(async () => {
      await this.ensureNameIndex();

      const categories = await this.findDocuments({
        docType: this.DOC_TYPE,
        name: name,
      });

      return categories.length > 0 ? categories[0] : null;
    }, "getByName");
  }

  /**
   * Validates that a category name is unique.
   *
   * @param name Category name to validate
   * @param excludeId Optional ID to exclude from uniqueness check (for updates)
   * @throws Error if name already exists
   */
  private async validateNameUnique(
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const existingCategory = await this.getByName(name);

    if (existingCategory && existingCategory.id !== excludeId) {
      throw new Error(`Category with name "${name}" already exists`);
    }
  }

  /**
   * Gets categories that match a color pattern.
   * Useful for color-based filtering or validation.
   *
   * @param colorPattern Color pattern to match
   * @returns Promise<Category[]> Categories with matching colors
   */
  async getCategoriesByColor(colorPattern: string): Promise<Category[]> {
    return this.executeWithErrorHandling(async () => {
      const allCategories = await this.getAll();
      return allCategories.filter((category) =>
        category.color.includes(colorPattern),
      );
    }, "getCategoriesByColor");
  }

  /**
   * Gets default categories for initial app setup.
   * These can be created when the app is first used.
   *
   * @returns Category[] Array of default categories
   */
  static getDefaultCategories(): Omit<Category, "id">[] {
    return [
      { name: "Food", color: "emerald-400" },
      { name: "Transport", color: "blue-400" },
      { name: "Entertainment", color: "amber-400" },
      { name: "Shopping", color: "rose-400" },
      { name: "Bills", color: "red-500" },
      { name: "Income", color: "green-500" },
      { name: "Other", color: "gray-400" },
    ];
  }

  /**
   * Creates default categories if none exist.
   * Useful for first-time app setup.
   *
   * @returns Promise<number> Number of categories created
   */
  async createDefaultCategories(): Promise<number> {
    return this.executeWithErrorHandling(async () => {
      const existingCategories = await this.getAll();

      if (existingCategories.length > 0) {
        return 0; // Don't create defaults if categories already exist
      }

      const defaultCategories = PouchCategoryRepository.getDefaultCategories();
      let createdCount = 0;

      for (const category of defaultCategories) {
        try {
          await this.create(category);
          createdCount++;
        } catch (error) {
          console.warn(
            `Failed to create default category "${category.name}":`,
            error,
          );
        }
      }

      return createdCount;
    }, "createDefaultCategories");
  }
}
