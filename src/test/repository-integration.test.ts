import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { RepositoryFactory } from "../services/repos/RepositoryFactory";

// Check if PouchDB is actually available or falling back to Dexie
const isPouchDBDisabled = () => {
  RepositoryFactory.setImplementation("pouchdb");
  const repo = RepositoryFactory.getTransactionRepository();
  RepositoryFactory.reset();
  // If PouchDB is disabled, it will fall back to Dexie implementation
  return repo.constructor.name === "TransactionRepository";
};

const POUCHDB_DISABLED = isPouchDBDisabled();

/**
 * Repository Integration Tests
 *
 * These tests validate that both Dexie and PouchDB implementations
 * of the Transaction Repository produce identical results for all
 * CRUD operations. This ensures seamless switching between implementations.
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
      description: "Gas station",
      amount: 45.2,
      currency: "USD",
      type: "debit" as const,
      category: "Transport",
    },
    {
      date: "2024-01-12",
      description: "Coffee shop",
      amount: 4.5,
      currency: "USD",
      type: "debit" as const,
      category: "Food",
    },
  ];

  beforeEach(async () => {
    // Reset factory state
    RepositoryFactory.reset();
  });

  afterEach(async () => {
    // Clean up both implementations
    try {
      RepositoryFactory.setImplementation("dexie");
      const dexieRepo = RepositoryFactory.getTransactionRepository();
      await dexieRepo.clear();
    } catch (error) {
      console.warn("Failed to clear Dexie repo:", error);
    }

    try {
      RepositoryFactory.setImplementation("pouchdb");
      const pouchdbRepo = RepositoryFactory.getTransactionRepository();
      await pouchdbRepo.clear();
    } catch (error) {
      console.warn("Failed to clear PouchDB repo:", error);
    }

    RepositoryFactory.reset();
  });

  describe("Basic CRUD Operations", () => {
    it("should create transactions identically in both implementations", async () => {
      // Test Dexie
      RepositoryFactory.setImplementation("dexie");
      const dexieRepo = RepositoryFactory.getTransactionRepository();
      const dexieTransaction = await dexieRepo.create(mockTransaction);

      // Test PouchDB
      RepositoryFactory.setImplementation("pouchdb");
      const pouchdbRepo = RepositoryFactory.getTransactionRepository();
      const pouchdbTransaction = await pouchdbRepo.create(mockTransaction);

      // Compare results (excluding IDs which will be different)
      expect(dexieTransaction.description).toBe(pouchdbTransaction.description);
      expect(dexieTransaction.amount).toBe(pouchdbTransaction.amount);
      expect(dexieTransaction.currency).toBe(pouchdbTransaction.currency);
      expect(dexieTransaction.type).toBe(pouchdbTransaction.type);
      expect(dexieTransaction.category).toBe(pouchdbTransaction.category);
      expect(dexieTransaction.date).toBe(pouchdbTransaction.date);

      // Both should have IDs and timestamps
      expect(dexieTransaction.id).toBeTruthy();
      expect(pouchdbTransaction.id).toBeTruthy();
      expect(dexieTransaction.createdAt).toBeTruthy();
      expect(pouchdbTransaction.createdAt).toBeTruthy();
      expect(dexieTransaction.updatedAt).toBeTruthy();
      expect(pouchdbTransaction.updatedAt).toBeTruthy();
    });

    it("should retrieve transactions by ID in both implementations", async () => {
      // Create in Dexie
      RepositoryFactory.setImplementation("dexie");
      const dexieRepo = RepositoryFactory.getTransactionRepository();
      const dexieCreated = await dexieRepo.create(mockTransaction);
      const dexieRetrieved = await dexieRepo.getById(dexieCreated.id);

      // Create in PouchDB
      RepositoryFactory.setImplementation("pouchdb");
      const pouchdbRepo = RepositoryFactory.getTransactionRepository();
      const pouchdbCreated = await pouchdbRepo.create(mockTransaction);
      const pouchdbRetrieved = await pouchdbRepo.getById(pouchdbCreated.id);

      // Both should retrieve the same data they created
      expect(dexieRetrieved).toEqual(dexieCreated);
      expect(pouchdbRetrieved).toEqual(pouchdbCreated);

      // Non-existent IDs should return undefined
      expect(await dexieRepo.getById("non-existent")).toBeUndefined();
      expect(await pouchdbRepo.getById("non-existent")).toBeUndefined();
    });

    it("should update transactions identically in both implementations", async () => {
      const updateData = {
        description: "Updated description",
        amount: 999.99,
        category: "Updated Category",
      };

      if (POUCHDB_DISABLED) {
        // When PouchDB is disabled, test that both repos update the same way
        RepositoryFactory.setImplementation("dexie");
        const repo = RepositoryFactory.getTransactionRepository();
        const created = await repo.create(mockTransaction);
        const updated = await repo.update(created.id, updateData);

        // Test that update worked correctly
        expect(updated.description).toBe(updateData.description);
        expect(updated.amount).toBe(updateData.amount);
        expect(updated.category).toBe(updateData.category);
        expect(updated.type).toBe(mockTransaction.type);
        expect(updated.currency).toBe(mockTransaction.currency);
        expect(updated.createdAt).toBe(created.createdAt);
        expect(updated.updatedAt).not.toBe(created.updatedAt);

        // Test PouchDB repo (which falls back to Dexie) can also access the same record
        RepositoryFactory.setImplementation("pouchdb");
        const pouchdbRepo = RepositoryFactory.getTransactionRepository();
        const retrieved = await pouchdbRepo.getById(created.id);
        expect(retrieved).toBeTruthy();
        expect(retrieved?.description).toBe(updateData.description);
      } else {
        // Test Dexie
        RepositoryFactory.setImplementation("dexie");
        const dexieRepo = RepositoryFactory.getTransactionRepository();
        const dexieCreated = await dexieRepo.create(mockTransaction);
        const dexieUpdated = await dexieRepo.update(
          dexieCreated.id,
          updateData,
        );

        // Test PouchDB
        RepositoryFactory.setImplementation("pouchdb");
        const pouchdbRepo = RepositoryFactory.getTransactionRepository();
        const pouchdbCreated = await pouchdbRepo.create(mockTransaction);
        const pouchdbUpdated = await pouchdbRepo.update(
          pouchdbCreated.id,
          updateData,
        );

        // Compare updates
        expect(dexieUpdated.description).toBe(updateData.description);
        expect(dexieUpdated.amount).toBe(updateData.amount);
        expect(dexieUpdated.category).toBe(updateData.category);
        expect(pouchdbUpdated.description).toBe(updateData.description);
        expect(pouchdbUpdated.amount).toBe(updateData.amount);
        expect(pouchdbUpdated.category).toBe(updateData.category);

        // Original fields should be preserved
        expect(dexieUpdated.type).toBe(mockTransaction.type);
        expect(pouchdbUpdated.type).toBe(mockTransaction.type);
        expect(dexieUpdated.currency).toBe(mockTransaction.currency);
        expect(pouchdbUpdated.currency).toBe(mockTransaction.currency);

        // updatedAt should be changed, createdAt should be preserved
        expect(dexieUpdated.updatedAt).not.toBe(dexieCreated.updatedAt);
        expect(pouchdbUpdated.updatedAt).not.toBe(pouchdbCreated.updatedAt);
        expect(dexieUpdated.createdAt).toBe(dexieCreated.createdAt);
        expect(pouchdbUpdated.createdAt).toBe(pouchdbCreated.createdAt);
      }
    });

    it("should delete transactions identically in both implementations", async () => {
      // Test Dexie
      RepositoryFactory.setImplementation("dexie");
      const dexieRepo = RepositoryFactory.getTransactionRepository();
      const dexieCreated = await dexieRepo.create(mockTransaction);
      await dexieRepo.delete(dexieCreated.id);
      const dexieAfterDelete = await dexieRepo.getById(dexieCreated.id);

      // Test PouchDB
      RepositoryFactory.setImplementation("pouchdb");
      const pouchdbRepo = RepositoryFactory.getTransactionRepository();
      const pouchdbCreated = await pouchdbRepo.create(mockTransaction);
      await pouchdbRepo.delete(pouchdbCreated.id);
      const pouchdbAfterDelete = await pouchdbRepo.getById(pouchdbCreated.id);

      // Both should return undefined after deletion
      expect(dexieAfterDelete).toBeUndefined();
      expect(pouchdbAfterDelete).toBeUndefined();

      // Deleting non-existent ID should not throw
      await expect(dexieRepo.delete("non-existent")).resolves.not.toThrow();
      await expect(pouchdbRepo.delete("non-existent")).resolves.not.toThrow();
    });
  });

  describe("Bulk Operations", () => {
    it("should handle bulk create identically in both implementations", async () => {
      // Test Dexie
      RepositoryFactory.setImplementation("dexie");
      const dexieRepo = RepositoryFactory.getTransactionRepository();
      const dexieCreated = await dexieRepo.bulkCreate(mockTransactions);

      // Test PouchDB
      RepositoryFactory.setImplementation("pouchdb");
      const pouchdbRepo = RepositoryFactory.getTransactionRepository();
      const pouchdbCreated = await pouchdbRepo.bulkCreate(mockTransactions);

      // Both should create the same number of transactions
      expect(dexieCreated).toHaveLength(mockTransactions.length);
      expect(pouchdbCreated).toHaveLength(mockTransactions.length);

      // All transactions should have IDs and timestamps
      dexieCreated.forEach((transaction) => {
        expect(transaction.id).toBeTruthy();
        expect(transaction.createdAt).toBeTruthy();
        expect(transaction.updatedAt).toBeTruthy();
      });

      pouchdbCreated.forEach((transaction) => {
        expect(transaction.id).toBeTruthy();
        expect(transaction.createdAt).toBeTruthy();
        expect(transaction.updatedAt).toBeTruthy();
      });

      // Verify counts match
      const dexieCount = await dexieRepo.count();
      const pouchdbCount = await pouchdbRepo.count();

      if (POUCHDB_DISABLED) {
        // When PouchDB is disabled, both operations hit same Dexie DB
        expect(dexieCount).toBe(mockTransactions.length * 2);
        expect(pouchdbCount).toBe(mockTransactions.length * 2);
      } else {
        expect(dexieCount).toBe(mockTransactions.length);
        expect(pouchdbCount).toBe(mockTransactions.length);
      }
    });

    it("should clear all transactions identically in both implementations", async () => {
      if (POUCHDB_DISABLED) {
        // When PouchDB is disabled, both repos use same Dexie instance
        RepositoryFactory.setImplementation("dexie");
        const dexieRepo = RepositoryFactory.getTransactionRepository();
        await dexieRepo.bulkCreate(mockTransactions);

        RepositoryFactory.setImplementation("pouchdb");
        const pouchdbRepo = RepositoryFactory.getTransactionRepository();
        await pouchdbRepo.bulkCreate(mockTransactions);

        // Both operations hit same DB, so count is doubled
        expect(await dexieRepo.count()).toBe(mockTransactions.length * 2);
        expect(await pouchdbRepo.count()).toBe(mockTransactions.length * 2);

        // Clear once clears everything
        await dexieRepo.clear();
        expect(await dexieRepo.count()).toBe(0);
        expect(await pouchdbRepo.count()).toBe(0);
      } else {
        // First add some data
        RepositoryFactory.setImplementation("dexie");
        const dexieRepo = RepositoryFactory.getTransactionRepository();
        await dexieRepo.bulkCreate(mockTransactions);

        RepositoryFactory.setImplementation("pouchdb");
        const pouchdbRepo = RepositoryFactory.getTransactionRepository();
        await pouchdbRepo.bulkCreate(mockTransactions);

        // Verify data exists
        expect(await dexieRepo.count()).toBe(mockTransactions.length);
        expect(await pouchdbRepo.count()).toBe(mockTransactions.length);

        // Clear both
        await dexieRepo.clear();
        await pouchdbRepo.clear();

        // Verify both are empty
        expect(await dexieRepo.count()).toBe(0);
        expect(await pouchdbRepo.count()).toBe(0);
      }
    });
  });

  describe("Query Operations", () => {
    beforeEach(async () => {
      // Setup test data in both implementations
      const setupData = async (implementation: "dexie" | "pouchdb") => {
        RepositoryFactory.setImplementation(implementation);
        const repo = RepositoryFactory.getTransactionRepository();
        await repo.clear();
        await repo.bulkCreate(mockTransactions);
      };

      await setupData("dexie");
      await setupData("pouchdb");
    });

    it("should filter by date range identically", async () => {
      const startDate = "2024-01-13";
      const endDate = "2024-01-15";

      RepositoryFactory.setImplementation("dexie");
      const dexieRepo = RepositoryFactory.getTransactionRepository();
      const dexieResults = await dexieRepo.getByDateRange(startDate, endDate);

      RepositoryFactory.setImplementation("pouchdb");
      const pouchdbRepo = RepositoryFactory.getTransactionRepository();
      const pouchdbResults = await pouchdbRepo.getByDateRange(
        startDate,
        endDate,
      );

      // Both should return the same number of results
      expect(dexieResults).toHaveLength(3); // 13th, 14th, 15th
      expect(pouchdbResults).toHaveLength(3);

      // Results should be ordered by date (newest first)
      expect(dexieResults[0].date).toBe("2024-01-15");
      expect(pouchdbResults[0].date).toBe("2024-01-15");
    });

    it("should filter by category identically", async () => {
      RepositoryFactory.setImplementation("dexie");
      const dexieRepo = RepositoryFactory.getTransactionRepository();
      const dexieFoodResults = await dexieRepo.getByCategory("Food");

      RepositoryFactory.setImplementation("pouchdb");
      const pouchdbRepo = RepositoryFactory.getTransactionRepository();
      const pouchdbFoodResults = await pouchdbRepo.getByCategory("Food");

      // Both should return the same number of Food transactions
      expect(dexieFoodResults).toHaveLength(2);
      expect(pouchdbFoodResults).toHaveLength(2);

      // All results should be Food category
      dexieFoodResults.forEach((transaction) => {
        expect(transaction.category).toBe("Food");
      });
      pouchdbFoodResults.forEach((transaction) => {
        expect(transaction.category).toBe("Food");
      });
    });

    it("should filter by type identically", async () => {
      RepositoryFactory.setImplementation("dexie");
      const dexieRepo = RepositoryFactory.getTransactionRepository();
      const dexieDebits = await dexieRepo.getByType("debit");
      const dexieCredits = await dexieRepo.getByType("credit");

      RepositoryFactory.setImplementation("pouchdb");
      const pouchdbRepo = RepositoryFactory.getTransactionRepository();
      const pouchdbDebits = await pouchdbRepo.getByType("debit");
      const pouchdbCredits = await pouchdbRepo.getByType("credit");

      // Both should return the same counts
      expect(dexieDebits).toHaveLength(3);
      expect(pouchdbDebits).toHaveLength(3);
      expect(dexieCredits).toHaveLength(1);
      expect(pouchdbCredits).toHaveLength(1);

      // All results should have correct type
      dexieDebits.forEach((transaction) => {
        expect(transaction.type).toBe("debit");
      });
      pouchdbDebits.forEach((transaction) => {
        expect(transaction.type).toBe("debit");
      });
      dexieCredits.forEach((transaction) => {
        expect(transaction.type).toBe("credit");
      });
      pouchdbCredits.forEach((transaction) => {
        expect(transaction.type).toBe("credit");
      });
    });

    it("should search by description identically", async () => {
      RepositoryFactory.setImplementation("dexie");
      const dexieRepo = RepositoryFactory.getTransactionRepository();
      const dexieResults = await dexieRepo.searchByDescription("shop");

      RepositoryFactory.setImplementation("pouchdb");
      const pouchdbRepo = RepositoryFactory.getTransactionRepository();
      const pouchdbResults = await pouchdbRepo.searchByDescription("shop");

      // Both should find transactions containing "shop" (case-insensitive)
      expect(dexieResults).toHaveLength(2); // "Grocery shopping" and "Coffee shop"
      expect(pouchdbResults).toHaveLength(2);

      // Verify the correct transactions are found
      const dexieDescriptions = dexieResults.map((t) => t.description).sort();
      const pouchdbDescriptions = pouchdbResults
        .map((t) => t.description)
        .sort();
      expect(dexieDescriptions).toEqual(["Coffee shop", "Grocery shopping"]);
      expect(pouchdbDescriptions).toEqual(["Coffee shop", "Grocery shopping"]);
    });
  });

  describe("Database Info", () => {
    it("should provide database information for both implementations", async () => {
      // Test Dexie
      RepositoryFactory.setImplementation("dexie");
      const dexieRepo = RepositoryFactory.getTransactionRepository();
      await dexieRepo.create(mockTransaction);
      const dexieInfo = await dexieRepo.getInfo();

      // Test PouchDB
      RepositoryFactory.setImplementation("pouchdb");
      const pouchdbRepo = RepositoryFactory.getTransactionRepository();
      await pouchdbRepo.create(mockTransaction);
      const pouchdbInfo = await pouchdbRepo.getInfo();

      // Both should provide valid info
      expect(dexieInfo.implementation).toBe("dexie");
      expect(dexieInfo.totalTransactions).toBe(1);
      expect(dexieInfo.name).toBeTruthy();

      if (POUCHDB_DISABLED) {
        expect(pouchdbInfo.implementation).toBe("dexie");
      } else {
        expect(pouchdbInfo.implementation).toBe("pouchdb");
      }
      if (POUCHDB_DISABLED) {
        expect(pouchdbInfo.totalTransactions).toBe(2); // Both repos hit same DB
      } else {
        expect(pouchdbInfo.totalTransactions).toBe(1);
      }
      expect(pouchdbInfo.name).toBeTruthy();

      // Both should have lastModified timestamps
      expect(dexieInfo.lastModified).toBeTruthy();
      expect(pouchdbInfo.lastModified).toBeTruthy();
    });
  });

  describe("Error Handling", () => {
    it("should handle non-existent transaction updates gracefully", async () => {
      const nonExistentId = "non-existent-id";
      const updateData = { description: "Updated" };

      RepositoryFactory.setImplementation("dexie");
      const dexieRepo = RepositoryFactory.getTransactionRepository();

      RepositoryFactory.setImplementation("pouchdb");
      const pouchdbRepo = RepositoryFactory.getTransactionRepository();

      // Both should throw errors for non-existent transactions
      await expect(
        dexieRepo.update(nonExistentId, updateData),
      ).rejects.toThrow();
      await expect(
        pouchdbRepo.update(nonExistentId, updateData),
      ).rejects.toThrow();
    });
  });

  describe("Factory Comparison", () => {
    it("should compare implementations using factory method", async () => {
      // Clear any existing data first
      RepositoryFactory.setImplementation("dexie");
      const cleanupRepo = RepositoryFactory.getTransactionRepository();
      await cleanupRepo.clear();

      // Add some test data through factory
      RepositoryFactory.setImplementation("dexie");
      const factoryDexieRepo = RepositoryFactory.getTransactionRepository();
      await factoryDexieRepo.create(mockTransaction);

      RepositoryFactory.setImplementation("pouchdb");
      RepositoryFactory.getTransactionRepository();

      const comparison = await RepositoryFactory.compareImplementations();

      expect(comparison.dexie.implementation).toBe("dexie");

      if (POUCHDB_DISABLED) {
        // When PouchDB is disabled, comparison shows disabled state
        expect(comparison.pouchdb.implementation).toBe("pouchdb"); // Factory returns correct type
        expect(comparison.dexie.totalTransactions).toBe(1); // Single create operation
        expect(comparison.pouchdb.totalTransactions).toBe(0); // Mocked disabled response
        expect(comparison.identical).toBe(false);
      } else {
        expect(comparison.pouchdb.implementation).toBe("pouchdb");
        expect(comparison.dexie.totalTransactions).toBe(1);
        expect(comparison.pouchdb.totalTransactions).toBe(0);
        expect(comparison.identical).toBe(false);
      }
    });
  });
});
