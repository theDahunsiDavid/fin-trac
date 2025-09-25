import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { TransactionRepository } from "./TransactionRepository";
import type { Transaction } from "../../features/transactions/types";
import { generateUUID } from "../utils/uuid";

// Mock the database
vi.mock("../db/db", () => {
  const mockCollection = {
    toArray: vi.fn(),
    first: vi.fn(),
    count: vi.fn(),
    orderBy: vi.fn(),
    filter: vi.fn(),
  };

  const mockTransactionsTable = {
    add: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
    toArray: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    filter: vi.fn(),
    count: vi.fn(),
    bulkAdd: vi.fn(),
    first: vi.fn(),
  };

  // Setup chaining for mock collection
  mockCollection.orderBy.mockReturnValue(mockCollection);
  mockCollection.filter.mockReturnValue(mockCollection);

  // Setup chaining for transactions table
  mockTransactionsTable.where.mockReturnValue(mockCollection);
  mockTransactionsTable.orderBy.mockReturnValue(mockCollection);
  mockTransactionsTable.filter.mockReturnValue(mockCollection);

  return {
    db: {
      transactions: mockTransactionsTable,
    },
  };
});

// Mock UUID generation
vi.mock("../utils/uuid", () => ({
  generateUUID: vi.fn(),
}));

// Create mock instance that we'll use in tests
const mockTransactionsTable = {
  add: vi.fn(),
  get: vi.fn(),
  put: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  clear: vi.fn(),
  toArray: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  filter: vi.fn(),
  count: vi.fn(),
  bulkAdd: vi.fn(),
  first: vi.fn(),
};

describe("TransactionRepository", () => {
  let repository: TransactionRepository;

  const mockTransactionInput = {
    date: "2024-01-15",
    description: "Test transaction",
    amount: 100.5,
    currency: "USD",
    type: "debit" as const,
    category: "Food",
    tags: ["test", "example"],
  };

  const mockTransaction: Transaction = {
    id: "transaction_123",
    ...mockTransactionInput,
    createdAt: "2024-01-15T10:30:00.000Z",
    updatedAt: "2024-01-15T10:30:00.000Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();

    repository = new TransactionRepository();

    // Mock current time
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T10:30:00.000Z"));

    // Mock UUID generation
    vi.mocked(generateUUID).mockReturnValue("transaction_123");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("create", () => {
    it("should create a new transaction with generated ID and timestamps", async () => {
      mockTransactionsTable.add.mockResolvedValue("test-id-1");

      const result = await repository.create(mockTransactionInput);

      expect(result).toEqual({
        id: "transaction_123",
        ...mockTransactionInput,
        createdAt: "2024-01-15T10:30:00.000Z",
        updatedAt: "2024-01-15T10:30:00.000Z",
      });

      expect(generateUUID).toHaveBeenCalledOnce();
      expect(mockTransactionsTable.add).toHaveBeenCalledWith({
        id: "transaction_123",
        ...mockTransactionInput,
        createdAt: "2024-01-15T10:30:00.000Z",
        updatedAt: "2024-01-15T10:30:00.000Z",
      });
    });

    it("should handle transaction without optional tags", async () => {
      const inputWithoutTags = {
        ...mockTransactionInput,
        tags: undefined,
      };

      mockTransactionsTable.add.mockResolvedValue("created-id");
      vi.mocked(generateUUID).mockReturnValue("transaction_456");

      const result = await repository.create(inputWithoutTags);

      expect(result.tags).toBeUndefined();
      expect(result.id).toBe("transaction_456");
    });

    it("should throw error when database operation fails", async () => {
      mockTransactionsTable.add.mockRejectedValue(new Error("Database error"));

      await expect(repository.create(mockTransactionInput)).rejects.toThrow(
        "Database error",
      );
    });

    it("should generate unique timestamps for concurrent creations", async () => {
      vi.mocked(generateUUID)
        .mockReturnValueOnce("transaction_1")
        .mockReturnValueOnce("transaction_2");

      mockTransactionsTable.add.mockResolvedValue("test-id-1");

      // Advance time slightly for second call
      const promise1 = repository.create(mockTransactionInput);
      vi.advanceTimersByTime(1000);
      const promise2 = repository.create({
        ...mockTransactionInput,
        description: "Second transaction",
      });

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1.id).toBe("transaction_1");
      expect(result2.id).toBe("transaction_2");
      expect(result1.createdAt).not.toBe(result2.createdAt);
    });
  });

  describe("getById", () => {
    it("should retrieve transaction by ID", async () => {
      mockTransactionsTable.get.mockResolvedValue(mockTransaction);

      const result = await repository.getById("transaction_123");

      expect(result).toEqual(mockTransaction);
      expect(mockTransactionsTable.get).toHaveBeenCalledWith("transaction_123");
    });

    it("should return undefined for non-existent transaction", async () => {
      mockTransactionsTable.get.mockResolvedValue(undefined);

      const result = await repository.getById("non-existent");

      expect(result).toBeUndefined();
    });

    it("should handle database errors gracefully", async () => {
      mockTransactionsTable.get.mockRejectedValue(new Error("Database error"));

      await expect(repository.getById("transaction_123")).rejects.toThrow(
        "Database error",
      );
    });
  });

  describe("update", () => {
    it("should update existing transaction", async () => {
      const updates = {
        description: "Updated description",
        amount: 200.0,
      };

      const existingTransaction = { ...mockTransaction };
      const updatedTransaction = {
        ...existingTransaction,
        ...updates,
        updatedAt: "2024-01-15T10:30:00.000Z",
      };

      mockTransactionsTable.update.mockResolvedValue("transaction_123");
      mockTransactionsTable.get.mockResolvedValue(updatedTransaction);

      const result = await repository.update("transaction_123", updates);

      expect(result).toEqual(updatedTransaction);
      expect(mockTransactionsTable.put).toHaveBeenCalledWith(
        "transaction_123",
        {
          ...updates,
          updatedAt: "2024-01-15T10:30:00.000Z",
        },
      );
    });

    it("should preserve createdAt timestamp during update", async () => {
      const originalCreatedAt = "2024-01-14T10:00:00.000Z";
      const existingTransaction = {
        ...mockTransaction,
        createdAt: originalCreatedAt,
      };
      const updatedTransaction = {
        ...existingTransaction,
        description: "Updated",
        updatedAt: "2024-01-15T10:30:00.000Z",
      };

      mockTransactionsTable.update.mockResolvedValue("transaction_123");
      mockTransactionsTable.get.mockResolvedValue(updatedTransaction);

      const result = await repository.update("transaction_123", {
        description: "Updated",
      });

      expect(result?.createdAt).toBe(originalCreatedAt);
      expect(result?.updatedAt).toBe("2024-01-15T10:30:00.000Z");
    });

    it("should throw error for non-existent transaction", async () => {
      mockTransactionsTable.update.mockResolvedValue("transaction_123");
      mockTransactionsTable.get.mockResolvedValue(undefined);

      await expect(
        repository.update("non-existent", {
          description: "Updated",
        }),
      ).rejects.toThrow(
        "Transaction with id non-existent not found after update",
      );
    });

    it("should handle partial updates correctly", async () => {
      const existingTransaction = { ...mockTransaction };
      const updatedTransaction = {
        ...existingTransaction,
        amount: 150.75,
        updatedAt: "2024-01-15T10:30:00.000Z",
      };

      mockTransactionsTable.update.mockResolvedValue("transaction_123");
      mockTransactionsTable.get.mockResolvedValue(updatedTransaction);

      const result = await repository.update("transaction_123", {
        amount: 150.75,
      });

      expect(result?.amount).toBe(150.75);
      expect(result?.description).toBe(mockTransaction.description);
      expect(result?.category).toBe(mockTransaction.category);
    });

    it("should handle database errors during update", async () => {
      mockTransactionsTable.update.mockRejectedValue(new Error("Update failed"));

      await expect(
        repository.update("transaction_123", { amount: 200 }),
      ).rejects.toThrow("Update failed");
    });
  });

  describe("delete", () => {
    it("should delete transaction by ID", async () => {
      mockTransactionsTable.delete.mockResolvedValue(undefined);

      await repository.delete("transaction_123");

      expect(mockTransactionsTable.delete).toHaveBeenCalledWith(
        "transaction_123",
      );
    });

    it("should handle deletion of non-existent transaction", async () => {
      mockTransactionsTable.delete.mockResolvedValue(undefined);

      await expect(repository.delete("non-existent")).resolves.not.toThrow();
    });

    it("should handle database errors during deletion", async () => {
      mockTransactionsTable.delete.mockRejectedValue(
        new Error("Database error"),
      );

      await expect(repository.delete("transaction_123")).rejects.toThrow(
        "Database error",
      );
    });
  });

  describe("getAll", () => {
    it("should retrieve all transactions", async () => {
      const transactions = [
        mockTransaction,
        {
          ...mockTransaction,
          id: "transaction_456",
          description: "Second transaction",
        },
      ];

      const mockOrderBy = {
        reverse: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue(transactions),
        }),
      };

      mockTransactionsTable.orderBy.mockReturnValue(mockOrderBy);

      const result = await repository.getAll();

      expect(result).toEqual(transactions);
      expect(mockTransactionsTable.orderBy).toHaveBeenCalledWith("createdAt");
    });

    it("should return empty array when no transactions exist", async () => {
      const mockCollection = {
        toArray: vi.fn().mockResolvedValue([]),
        orderBy: vi.fn(),
        filter: vi.fn(),
      };
      mockCollection.orderBy.mockReturnValue(mockCollection);
      mockCollection.filter.mockReturnValue(mockCollection);

      mockCollection.toArray.mockResolvedValue([]);
      mockTransactionsTable.orderBy.mockReturnValue(mockCollection);

      const result = await repository.getAll();

      expect(result).toEqual([]);
    });

    it("should handle database errors", async () => {
      const mockOrderBy = {
        reverse: vi.fn().mockReturnValue({
          toArray: vi.fn().mockRejectedValue(new Error("Database error")),
        }),
      };

      mockTransactionsTable.orderBy.mockReturnValue(mockOrderBy);

      await expect(repository.getAll()).rejects.toThrow("Database error");
    });
  });

  describe("getByDateRange", () => {
    it("should retrieve transactions within date range", async () => {
      const startDate = "2024-01-01";
      const endDate = "2024-01-31";
      const filteredTransactions = [mockTransaction];

      const mockWhere = {
        between: vi.fn().mockReturnValue({
          reverse: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue(filteredTransactions),
          }),
        }),
      };

      mockTransactionsTable.where.mockReturnValue(mockWhere);

      const result = await repository.getByDateRange(startDate, endDate);

      expect(result).toEqual(filteredTransactions);
      expect(mockTransactionsTable.where).toHaveBeenCalledWith("date");
    });

    it("should handle empty date range results", async () => {
      const mockWhere = {
        between: vi.fn().mockReturnValue({
          reverse: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue([]),
          }),
        }),
      };

      mockTransactionsTable.where.mockReturnValue(mockWhere);

      const result = await repository.getByDateRange(
        "2024-02-01",
        "2024-02-28",
      );

      expect(result).toEqual([]);
    });
  });

  describe("getByCategory", () => {
    it("should retrieve transactions by category", async () => {
      const category = "Food";
      const categoryTransactions = [mockTransaction];

      const mockCollection = {
        toArray: vi.fn().mockResolvedValue(categoryTransactions),
        orderBy: vi.fn(),
        filter: vi.fn(),
      };
      const mockWhere = {
        equals: vi.fn().mockReturnValue(mockCollection),
      };
      mockTransactionsTable.where.mockReturnValue(mockWhere);

      const result = await repository.getByCategory(category);

      expect(result).toEqual(categoryTransactions);
      expect(mockTransactionsTable.where).toHaveBeenCalledWith("category");
      expect(mockWhere.equals).toHaveBeenCalledWith(category);
    });

    it("should return empty array for non-existent category", async () => {
      const mockCollection = {
        toArray: vi.fn().mockResolvedValue([]),
        orderBy: vi.fn(),
        filter: vi.fn(),
      };
      const mockWhere = {
        equals: vi.fn().mockReturnValue(mockCollection),
      };
      mockTransactionsTable.where.mockReturnValue(mockWhere);

      const result = await repository.getByCategory("NonExistent");

      expect(result).toEqual([]);
    });
  });

  describe("getByType", () => {
    it("should retrieve transactions by type", async () => {
      const type = "debit";
      const typeTransactions = [mockTransaction];

      const mockCollection = {
        toArray: vi.fn().mockResolvedValue(typeTransactions),
        orderBy: vi.fn(),
        filter: vi.fn(),
      };
      const mockWhere = {
        equals: vi.fn().mockReturnValue(mockCollection),
      };
      mockTransactionsTable.where.mockReturnValue(mockWhere);

      const result = await repository.getByType(type);

      expect(result).toEqual(typeTransactions);
      expect(mockTransactionsTable.where).toHaveBeenCalledWith("type");
      expect(mockWhere.equals).toHaveBeenCalledWith(type);
    });

    it("should handle both credit and debit types", async () => {
      const mockCollection = {
        toArray: vi.fn().mockResolvedValue([]),
        orderBy: vi.fn(),
        filter: vi.fn(),
      };
      const mockWhere = {
        equals: vi.fn().mockReturnValue(mockCollection),
      };
      mockTransactionsTable.where.mockReturnValue(mockWhere);

      await repository.getByType("credit");
      await repository.getByType("debit");

      expect(mockWhere.equals).toHaveBeenCalledWith("credit");
      expect(mockWhere.equals).toHaveBeenCalledWith("debit");
    });
  });

  describe("searchByDescription", () => {
    it("should search transactions by description text", async () => {
      const searchTerm = "grocery";
      const matchingTransactions = [
        { ...mockTransaction, description: "Grocery shopping" },
        {
          ...mockTransaction,
          id: "transaction_456",
          description: "Local grocery store",
        },
      ];

      const mockCollection = {
        toArray: vi.fn().mockResolvedValue(matchingTransactions),
        orderBy: vi.fn(),
        filter: vi.fn(),
      };
      mockTransactionsTable.filter.mockReturnValue(mockCollection);

      const result = await repository.searchByDescription(searchTerm);

      expect(result).toEqual(matchingTransactions);
      expect(mockTransactionsTable.filter).toHaveBeenCalledWith(
        expect.any(Function),
      );
    });

    it("should perform case-insensitive search", async () => {
      const mockCollection = {
        toArray: vi.fn().mockResolvedValue([]),
        orderBy: vi.fn(),
        filter: vi.fn(),
      };
      mockTransactionsTable.filter.mockReturnValue(mockCollection);

      await repository.searchByDescription("GROCERY");

      expect(mockTransactionsTable.filter).toHaveBeenCalled();
    });

    it("should return empty array when no matches found", async () => {
      const mockFilter = {
        toArray: vi.fn().mockResolvedValue([]),
      };

      mockTransactionsTable.filter.mockReturnValue(mockFilter);

      const result = await repository.searchByDescription("nonexistent");

      expect(result).toEqual([]);
    });
  });

  describe("bulkCreate", () => {
    it("should create multiple transactions in bulk", async () => {
      const transactionInputs = [
        { ...mockTransactionInput, description: "Transaction 1" },
        { ...mockTransactionInput, description: "Transaction 2" },
        { ...mockTransactionInput, description: "Transaction 3" },
      ];

      vi.mocked(generateUUID)
        .mockReturnValueOnce("transaction_1")
        .mockReturnValueOnce("transaction_2")
        .mockReturnValueOnce("transaction_3");

      mockTransactionsTable.bulkAdd = vi
        .fn()
        .mockResolvedValue(["transaction_1", "transaction_2", "transaction_3"]);

      const result = await repository.bulkCreate(transactionInputs);

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe("transaction_1");
      expect(result[1].id).toBe("transaction_2");
      expect(result[2].id).toBe("transaction_3");
      expect(result[0].description).toBe("Transaction 1");
    });

    it("should handle empty bulk creation", async () => {
      mockTransactionsTable.bulkAdd = vi.fn().mockResolvedValue([]);

      const result = await repository.bulkCreate([]);

      expect(result).toEqual([]);
      expect(mockTransactionsTable.bulkAdd).toHaveBeenCalledWith([]);
    });

    it("should assign consistent timestamps to bulk transactions", async () => {
      const transactionInputs = [
        { ...mockTransactionInput, description: "Transaction 1" },
        { ...mockTransactionInput, description: "Transaction 2" },
      ];

      vi.mocked(generateUUID)
        .mockReturnValueOnce("transaction_1")
        .mockReturnValueOnce("transaction_2");

      mockTransactionsTable.bulkAdd = vi
        .fn()
        .mockResolvedValue(["transaction_1", "transaction_2"]);

      const result = await repository.bulkCreate(transactionInputs);

      expect(result[0].createdAt).toBe("2024-01-15T10:30:00.000Z");
      expect(result[1].createdAt).toBe("2024-01-15T10:30:00.000Z");
      expect(result[0].updatedAt).toBe("2024-01-15T10:30:00.000Z");
      expect(result[1].updatedAt).toBe("2024-01-15T10:30:00.000Z");
    });

    it("should handle database errors during bulk creation", async () => {
      const transactionInputs = [mockTransactionInput];
      mockTransactionsTable.bulkAdd = vi
        .fn()
        .mockRejectedValue(new Error("Bulk add failed"));

      await expect(repository.bulkCreate(transactionInputs)).rejects.toThrow(
        "Bulk add failed",
      );
    });
  });

  describe("clear", () => {
    it("should clear all transactions", async () => {
      mockTransactionsTable.clear.mockResolvedValue(undefined);

      await repository.clear();

      expect(mockTransactionsTable.clear).toHaveBeenCalledOnce();
    });

    it("should handle database errors during clear", async () => {
      mockTransactionsTable.clear.mockRejectedValue(new Error("Clear error"));

      await expect(repository.clear()).rejects.toThrow("Clear error");
    });
  });

  describe("getInfo", () => {
    it("should return repository information", async () => {
      const mockOrderBy = {
        reverse: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([mockTransaction]),
        }),
      };

      mockTransactionsTable.orderBy.mockReturnValue(mockOrderBy);
      mockTransactionsTable.count.mockResolvedValue(50);

      const info = await repository.getInfo();

      expect(info).toEqual({
        name: "fintrac-dexie",
        implementation: "dexie",
        totalTransactions: 50,
        lastModified: "2024-01-15T10:30:00.000Z",
      });
    });

    it("should handle count errors", async () => {
      mockTransactionsTable.count.mockRejectedValue(new Error("Count failed"));

      await expect(repository.getInfo()).rejects.toThrow("Count failed");
    });
  });

  describe("Edge Cases and Error Scenarios", () => {
    it("should handle corrupted transaction data", async () => {
      const corruptedTransaction = {
        id: "corrupt_1",
        // Missing required fields
      } as unknown as Transaction;

      mockTransactionsTable.get.mockResolvedValue(corruptedTransaction);

      const result = await repository.getById("corrupt_1");
      expect(result).toEqual(corruptedTransaction);
    });

    it("should handle very large amounts", async () => {
      const largeAmountTransaction = {
        ...mockTransactionInput,
        amount: 999999999.99,
      };

      mockTransactionsTable.add.mockResolvedValue("large_amount_tx");

      const result = await repository.create(largeAmountTransaction);
      expect(result.amount).toBe(999999999.99);
    });

    it("should handle special characters in descriptions", async () => {
      const specialCharTransaction = {
        ...mockTransactionInput,
        description: "Transaction with émojis 🏦💰 and spëcial chars ñ",
      };

      mockTransactionsTable.add.mockResolvedValue("special_char_tx");

      const result = await repository.create(specialCharTransaction);
      expect(result.description).toBe(
        "Transaction with émojis 🏦💰 and spëcial chars ñ",
      );
    });

    it("should handle transactions with very long tag arrays", async () => {
      const manyTags = Array.from({ length: 100 }, (_, i) => `tag_${i}`);
      const manyTagsTransaction = {
        ...mockTransactionInput,
        tags: manyTags,
      };

      mockTransactionsTable.add.mockResolvedValue("many_tags_tx");

      const result = await repository.create(manyTagsTransaction);
      expect(result.tags).toHaveLength(100);
    });

    it("should handle concurrent operations gracefully", async () => {
      mockTransactionsTable.add.mockResolvedValue("concurrent_tx");
      vi.mocked(generateUUID)
        .mockReturnValueOnce("concurrent_1")
        .mockReturnValueOnce("concurrent_2")
        .mockReturnValueOnce("concurrent_3");

      const concurrentPromises = [
        repository.create({
          ...mockTransactionInput,
          description: "Concurrent 1",
        }),
        repository.create({
          ...mockTransactionInput,
          description: "Concurrent 2",
        }),
        repository.create({
          ...mockTransactionInput,
          description: "Concurrent 3",
        }),
      ];

      const results = await Promise.all(concurrentPromises);

      expect(results).toHaveLength(3);
      expect(results.map((r) => r.id)).toEqual([
        "concurrent_1",
        "concurrent_2",
        "concurrent_3",
      ]);
    });
  });

  describe("Performance and Large Datasets", () => {
    it("should handle large bulk operations efficiently", async () => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        ...mockTransactionInput,
        description: `Transaction ${i}`,
      }));

      const largeUUIDs = Array.from(
        { length: 10000 },
        (_, i) => `transaction_${i}`,
      );
      vi.mocked(generateUUID).mockImplementation(
        () => largeUUIDs.shift() || "fallback",
      );

      mockTransactionsTable.bulkAdd = vi
        .fn()
        .mockResolvedValue(largeUUIDs.slice(0, 10000));

      const start = performance.now();
      const result = await repository.bulkCreate(largeDataset);
      const end = performance.now();

      expect(result).toHaveLength(10000);
      expect(end - start).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe("Real-world Usage Scenarios", () => {
    it("should handle typical expense entry workflow", async () => {
      // Create a new expense
      mockTransactionsTable.add.mockResolvedValue("test-id-1");
      vi.mocked(generateUUID).mockReturnValue("expense_1");

      const expenseInput = {
        date: "2024-01-15",
        description: "Coffee shop",
        amount: 4.5,
        currency: "USD",
        type: "debit" as const,
        category: "Food & Dining",
        tags: ["coffee", "breakfast"],
      };

      const expense = await repository.create(expenseInput);
      expect(expense.type).toBe("debit");
      expect(expense.amount).toBe(4.5);

      // Update the expense
      const updatedExpense = {
        ...expense,
        description: "Coffee shop - with tip",
        amount: 5.0,
        updatedAt: "2024-01-15T10:30:00.000Z",
      };

      mockTransactionsTable.update.mockResolvedValue("expense_1");
      mockTransactionsTable.get.mockResolvedValue(updatedExpense);

      const result = await repository.update("expense_1", {
        description: "Coffee shop - with tip",
        amount: 5.0,
      });

      expect(result?.amount).toBe(5.0);
      expect(result?.description).toBe("Coffee shop - with tip");
    });

    it("should handle income transaction workflow", async () => {
      mockTransactionsTable.add.mockResolvedValue("test-id-1");
      vi.mocked(generateUUID).mockReturnValue("income_1");

      const incomeInput = {
        date: "2024-01-15",
        description: "Freelance payment",
        amount: 1500.0,
        currency: "USD",
        type: "credit" as const,
        category: "Income",
        tags: ["freelance", "consulting"],
      };

      const income = await repository.create(incomeInput);
      expect(income.type).toBe("credit");
      expect(income.amount).toBe(1500.0);
    });

    it("should handle monthly expense analysis workflow", async () => {
      const mockCollection = {
        toArray: vi.fn().mockResolvedValue([mockTransaction]),
        orderBy: vi.fn(),
        filter: vi.fn(),
      };
      const mockWhere = {
        between: vi.fn().mockReturnValue(mockCollection),
      };
      mockTransactionsTable.where.mockReturnValue(mockWhere);

      const januaryTransactions = await repository.getByDateRange(
        "2024-01-01",
        "2024-01-31",
      );

      expect(januaryTransactions).toEqual([mockTransaction]);
      expect(mockTransactionsTable.where).toHaveBeenCalledWith("date");
    });
  });
});
