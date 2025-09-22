import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { RepositoryFactory } from "../services/repos/RepositoryFactory";

/**
 * Repository Integration Tests
 *
 * These tests validate the Dexie implementation of the Transaction Repository
 * to ensure all CRUD operations work correctly with the local IndexedDB storage.
 */

describe("Repository Integration Tests", () => {
  const mockTransaction = {
    date: "2024-01-15",
    description: "Test transaction",
    amount: 100.5,
    currency: "USD",
    type: "debit" as const,
    category: "Food",
    tags: ["test", "integration"],
  };

  const mockTransactions = [
    {
      date: "2024-01-15",
      description: "Grocery shopping",
      amount: 85.32,
      currency: "USD",
      type: "debit" as const,
      category: "Food",
    },
    {
      date: "2024-01-14",
      description: "Salary payment",
      amount: 3000.0,
      currency: "USD",
      type: "credit" as const,
      category: "Income",
    },
    {
      date: "2024-01-13",
      description: "Coffee",
      amount: 4.5,
      currency: "USD",
      type: "debit" as const,
      category: "Food",
    },
  ];

  let repository: ReturnType<typeof RepositoryFactory.getTransactionRepository>;

  beforeEach(async () => {
    RepositoryFactory.reset();
    repository = RepositoryFactory.getTransactionRepository();
    // Clear any existing data
    await repository.clear();
  });

  afterEach(async () => {
    // Clean up after each test
    try {
      await repository.clear();
    } catch (error) {
      console.warn("Cleanup error:", error);
    }
    RepositoryFactory.reset();
  });

  describe("Basic CRUD Operations", () => {
    it("should create a transaction successfully", async () => {
      const result = await repository.create(mockTransaction);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.description).toBe(mockTransaction.description);
      expect(result.amount).toBe(mockTransaction.amount);
      expect(result.type).toBe(mockTransaction.type);
      expect(result.category).toBe(mockTransaction.category);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it("should retrieve a transaction by ID", async () => {
      const created = await repository.create(mockTransaction);
      const retrieved = await repository.getById(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.description).toBe(created.description);
      expect(retrieved?.amount).toBe(created.amount);
    });

    it("should update a transaction", async () => {
      const created = await repository.create(mockTransaction);
      const updates = {
        description: "Updated description",
        amount: 200.0,
      };

      const updated = await repository.update(created.id, updates);

      expect(updated).toBeDefined();
      expect(updated?.description).toBe(updates.description);
      expect(updated?.amount).toBe(updates.amount);
      expect(updated?.id).toBe(created.id);
      expect(updated?.updatedAt).not.toBe(created.updatedAt);
    });

    it("should delete a transaction", async () => {
      const created = await repository.create(mockTransaction);
      await repository.delete(created.id);

      const retrieved = await repository.getById(created.id);
      expect(retrieved).toBeUndefined();
    });
  });

  describe("Bulk Operations", () => {
    it("should handle bulk create operations", async () => {
      const results = await repository.bulkCreate(mockTransactions);

      expect(results).toHaveLength(mockTransactions.length);
      results.forEach((result, index) => {
        expect(result.id).toBeDefined();
        expect(result.description).toBe(mockTransactions[index].description);
        expect(result.amount).toBe(mockTransactions[index].amount);
        expect(result.type).toBe(mockTransactions[index].type);
      });

      // Verify they were actually stored
      const all = await repository.getAll();
      expect(all).toHaveLength(mockTransactions.length);
    });

    it("should clear all transactions", async () => {
      await repository.bulkCreate(mockTransactions);

      let all = await repository.getAll();
      expect(all.length).toBeGreaterThan(0);

      await repository.clear();

      all = await repository.getAll();
      expect(all).toHaveLength(0);
    });
  });

  describe("Query Operations", () => {
    beforeEach(async () => {
      await repository.bulkCreate(mockTransactions);
    });

    it("should filter by date range", async () => {
      const startDate = "2024-01-14";
      const endDate = "2024-01-15";

      const filtered = await repository.getByDateRange(startDate, endDate);

      expect(filtered.length).toBeGreaterThan(0);
      filtered.forEach((transaction) => {
        expect(
          transaction.date >= startDate && transaction.date <= endDate,
        ).toBe(true);
      });
    });

    it("should filter by category", async () => {
      const category = "Food";

      const filtered = await repository.getByCategory(category);

      expect(filtered.length).toBeGreaterThan(0);
      filtered.forEach((transaction) => {
        expect(transaction.category).toBe(category);
      });
    });

    it("should filter by type", async () => {
      const type = "debit";

      const filtered = await repository.getByType(type);

      expect(filtered.length).toBeGreaterThan(0);
      filtered.forEach((transaction) => {
        expect(transaction.type).toBe(type);
      });
    });

    it("should search by description", async () => {
      const searchTerm = "Grocery";

      const results = await repository.searchByDescription(searchTerm);

      expect(results.length).toBeGreaterThan(0);
      results.forEach((transaction) => {
        expect(transaction.description.toLowerCase()).toContain(
          searchTerm.toLowerCase(),
        );
      });
    });
  });

  describe("Database Info", () => {
    it("should provide database information", async () => {
      await repository.bulkCreate(mockTransactions);

      const info = await repository.getInfo();

      expect(info).toBeDefined();
      expect(info.name).toBe("fintrac-dexie");
      expect(info.totalTransactions).toBe(mockTransactions.length);
      expect(info.implementation).toBe("dexie");
      expect(info.lastModified).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("should handle non-existent transaction updates gracefully", async () => {
      const nonExistentId = "non-existent-id";

      await expect(
        repository.update(nonExistentId, {
          description: "Updated description",
        }),
      ).rejects.toThrow();
    });

    it("should handle non-existent transaction deletion gracefully", async () => {
      const nonExistentId = "non-existent-id";

      // Should not throw for non-existent ID
      await expect(repository.delete(nonExistentId)).resolves.not.toThrow();
    });

    it("should handle non-existent transaction retrieval gracefully", async () => {
      const nonExistentId = "non-existent-id";

      const result = await repository.getById(nonExistentId);

      expect(result).toBeUndefined();
    });
  });

  describe("Factory Integration", () => {
    it("should provide consistent repository instances", async () => {
      const repo1 = RepositoryFactory.getTransactionRepository();
      const repo2 = RepositoryFactory.getTransactionRepository();

      expect(repo1).toBe(repo2); // Should be the same instance (singleton)
    });

    it("should provide implementation information", async () => {
      await repository.create(mockTransaction);

      const info = await RepositoryFactory.getImplementationInfo();

      expect(info.current).toBe("dexie");
      expect(info.available).toEqual(["dexie"]);
      expect(info.transactionRepository.implementation).toBe("dexie");
      expect(info.transactionRepository.totalTransactions).toBe(1);
    });
  });
});
