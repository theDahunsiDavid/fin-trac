import { db } from "../db/db";
import type { Category } from "../../features/transactions/types";
import type { ICategoryRepository } from "./ICategoryRepository";

/**
 * Dexie implementation of Category Repository
 *
 * This class implements the ICategoryRepository interface using Dexie/IndexedDB
 * for local-first category storage. It provides all category CRUD operations
 * with proper error handling and data validation, including sync tracking.
 */
export class CategoryRepository implements ICategoryRepository {
  /**
   * Creates a new category in the database.
   */
  async create(category: Omit<Category, "id">): Promise<Category> {
    const now = new Date().toISOString();
    const newCategory: Category = {
      ...category,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };

    await db.categories.add(newCategory);
    return newCategory;
  }

  /**
   * Retrieves all categories from the database.
   */
  async getAll(): Promise<Category[]> {
    return await db.categories.orderBy("name").toArray();
  }

  /**
   * Retrieves a category by its ID.
   */
  async getById(id: string): Promise<Category | undefined> {
    return await db.categories.get(id);
  }

  /**
   * Updates an existing category in the database.
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
   * Deletes a category from the database.
   */
  async delete(id: string): Promise<void> {
    await db.categories.delete(id);
  }

  /**
   * Gets a category by name.
   */
  async getByName(name: string): Promise<Category | undefined> {
    return await db.categories.where("name").equalsIgnoreCase(name).first();
  }

  /**
   * Checks if a category exists by name.
   */
  async exists(name: string): Promise<boolean> {
    const category = await this.getByName(name);
    return !!category;
  }

  /**
   * Gets categories used by transactions.
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
   * Gets default categories for initialization.
   */
  async getDefaults(): Promise<Category[]> {
    return [
      {
        id: crypto.randomUUID(),
        name: "Food",
        color: "emerald-400",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        name: "Transport",
        color: "blue-400",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        name: "Entertainment",
        color: "purple-400",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        name: "Shopping",
        color: "pink-400",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        name: "Utilities",
        color: "orange-400",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        name: "Healthcare",
        color: "red-400",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        name: "Income",
        color: "green-400",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        name: "Other",
        color: "gray-400",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }

  /**
   * Initializes default categories if none exist.
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
   * Searches categories by name using case-insensitive partial matching.
   */
  async searchByName(query: string): Promise<Category[]> {
    const lowerQuery = query.toLowerCase();
    return await db.categories
      .filter((category) => category.name.toLowerCase().includes(lowerQuery))
      .toArray();
  }

  /**
   * Gets the total count of categories.
   */
  async count(): Promise<number> {
    return await db.categories.count();
  }

  /**
   * Clears all categories from the database.
   */
  async clear(): Promise<void> {
    await db.categories.clear();
  }

  /**
   * Bulk creates multiple categories.
   */
  async bulkCreate(
    categories: Omit<Category, "id" | "createdAt" | "updatedAt">[],
  ): Promise<Category[]> {
    const now = new Date().toISOString();
    const newCategories: Category[] = categories.map((category) => ({
      ...category,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    }));

    await db.categories.bulkAdd(newCategories);
    return newCategories;
  }

  /**
   * Gets categories modified since a specific timestamp (for sync)
   */
  async getModifiedSince(timestamp: string): Promise<Category[]> {
    return await db.categories.where("updatedAt").above(timestamp).toArray();
  }

  /**
   * Gets database information and status.
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
   * Gets categories sorted by usage (most used first)
   * Note: This requires transaction data to calculate usage
   */
  async getByUsage(): Promise<Category[]> {
    // For now, just return all categories ordered by name
    // In the future, this could join with transactions to get usage stats
    return await this.getAll();
  }
}
