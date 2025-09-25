import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { TransactionRepository } from "./TransactionRepository";
import type { Transaction } from "../../features/transactions/types";
import { generateUUID } from "../utils/uuid";

// Mock the database with proper Dexie API structure - avoid hoisting issues
vi.mock("../db/db", () => {
  // Create mock collection methods that return chainable objects
  const createChainableCollection = () => ({
    toArray: vi.fn().mockResolvedValue([]),
    first: vi.fn(),
    count: vi.fn(),
    reverse: vi.fn(),
    limit: vi.fn(),
    equals: vi.fn(),
    between: vi.fn(),
    filter: vi.fn(),
    orderBy: vi.fn(),
  });

  const mockCollection = createChainableCollection();

  // Setup chaining - each method returns a new collection-like object
  mockCollection.reverse.mockImplementation(() => {
    const chainedCollection = createChainableCollection();
    chainedCollection.toArray.mockResolvedValue([]);
    chainedCollection.limit.mockImplementation(() => {
      const limitedCollection = createChainableCollection();
      limitedCollection.toArray.mockResolvedValue([]);
      return limitedCollection;
    });
    return chainedCollection;
  });

  mockCollection.between.mockImplementation(() => {
    const betweenCollection = createChainableCollection();
    betweenCollection.reverse.mockImplementation(() => {
      const reversedCollection = createChainableCollection();
      reversedCollection.toArray.mockResolvedValue([]);
      return reversedCollection;
    });
    return betweenCollection;
  });

  mockCollection.equals.mockImplementation(() => {
    const equalsCollection = createChainableCollection();
    equalsCollection.toArray.mockResolvedValue([]);
    return equalsCollection;
  });

  mockCollection.filter.mockImplementation(() => {
    const filteredCollection = createChainableCollection();
    filteredCollection.toArray.mockResolvedValue([]);
    return filteredCollection;
  });

  const mockTransactionsTable = {
    add: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
    toArray: vi.fn(),
    count: vi.fn(),
    bulkAdd: vi.fn(),
    first: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    filter: vi.fn(),
    toCollection: vi.fn(),
  };

  // Setup table-level chaining
  mockTransactionsTable.where.mockReturnValue(mockCollection);
  mockTransactionsTable.orderBy.mockReturnValue(mockCollection);
  mockTransactionsTable.filter.mockReturnValue(mockCollection);
  mockTransactionsTable.toCollection.mockReturnValue(mockCollection);

  // Setup direct filter chaining for searchByDescription
  mockTransactionsTable.filter.mockImplementation(() => {
    const filteredCollection = createChainableCollection();
    filteredCollection.toArray.mockResolvedValue([]);
    return filteredCollection;
  });

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

// Import the mocked db to access it in tests
import { db } from "../db/db";

// Type for our mocked transactions table
interface MockTransactionsTable {
  add: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
  toArray: ReturnType<typeof vi.fn>;
  count: ReturnType<typeof vi.fn>;
  bulkAdd: ReturnType<typeof vi.fn>;
  first: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
  orderBy: ReturnType<typeof vi.fn>;
  filter: ReturnType<typeof vi.fn>;
  toCollection: ReturnType<typeof vi.fn>;
}

describe("TransactionRepository", () => {
  let repository: TransactionRepository;
  let mockTransactionsTable: MockTransactionsTable;

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

    // Get reference to the mocked table
    mockTransactionsTable = db.transactions as unknown as MockTransactionsTable;

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
      mockTransactionsTable.add.mockResolvedValue("transaction_123");

      const result = await repository.create(mockTransactionInput);

      expect(result).toEqual(mockTransaction);
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

      mockTransactionsTable.add.mockResolvedValue("transaction_123");

      const result = await repository.create(inputWithoutTags);

      expect(result.tags).toBeUndefined();
      expect(mockTransactionsTable.add).toHaveBeenCalledWith({
        id: "transaction_123",
        ...inputWithoutTags,
        createdAt: "2024-01-15T10:30:00.000Z",
        updatedAt: "2024-01-15T10:30:00.000Z",
      });
    });

    it("should throw error when database operation fails", async () => {
      mockTransactionsTable.add.mockRejectedValue(new Error("Database error"));

      await expect(repository.create(mockTransactionInput)).rejects.toThrow(
        "Database error",
      );
    });

    it("should generate unique timestamps for concurrent creations", async () => {
      vi.mocked(generateUUID).mockReturnValueOnce("transaction_1");
      vi.mocked(generateUUID).mockReturnValueOnce("transaction_2");

      mockTransactionsTable.add.mockResolvedValue("success");

      const promise1 = repository.create(mockTransactionInput);

      // Advance time slightly for second creation
      vi.advanceTimersByTime(1000);

      const promise2 = repository.create(mockTransactionInput);

      await Promise.all([promise1, promise2]);

      expect(mockTransactionsTable.add).toHaveBeenCalledTimes(2);

      const firstCall = mockTransactionsTable.add.mock.calls[0][0];
      const secondCall = mockTransactionsTable.add.mock.calls[1][0];

      expect(firstCall.createdAt).toBe("2024-01-15T10:30:00.000Z");
      expect(secondCall.createdAt).toBe("2024-01-15T10:30:01.000Z");
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
      expect(mockTransactionsTable.get).toHaveBeenCalledWith("non-existent");
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
      const updates = { description: "Updated description", amount: 200 };
      const updatedTransaction = {
        ...mockTransaction,
        ...updates,
        updatedAt: "2024-01-15T10:30:00.000Z",
      };

      mockTransactionsTable.update.mockResolvedValue(1);
      mockTransactionsTable.get.mockResolvedValue(updatedTransaction);

      const result = await repository.update("transaction_123", updates);

      expect(result).toEqual(updatedTransaction);
      expect(mockTransactionsTable.update).toHaveBeenCalledWith(
        "transaction_123",
        {
          ...updates,
          updatedAt: "2024-01-15T10:30:00.000Z",
        },
      );
      expect(mockTransactionsTable.get).toHaveBeenCalledWith("transaction_123");
    });

    it("should preserve createdAt timestamp during update", async () => {
      const updates = { description: "Updated description" };
      const updatedTransaction = {
        ...mockTransaction,
        ...updates,
        updatedAt: "2024-01-15T10:30:00.000Z",
        createdAt: mockTransaction.createdAt, // Should remain unchanged
      };

      mockTransactionsTable.update.mockResolvedValue(1);
      mockTransactionsTable.get.mockResolvedValue(updatedTransaction);

      const result = await repository.update("transaction_123", updates);

      expect(result.createdAt).toBe(mockTransaction.createdAt);
      expect(result.updatedAt).toBe("2024-01-15T10:30:00.000Z");
      expect(mockTransactionsTable.update).toHaveBeenCalledWith(
        "transaction_123",
        {
          ...updates,
          updatedAt: "2024-01-15T10:30:00.000Z",
        },
      );
    });

    it("should throw error for non-existent transaction", async () => {
      mockTransactionsTable.update.mockResolvedValue(0);
      mockTransactionsTable.get.mockResolvedValue(undefined);

      await expect(
        repository.update("non-existent", { description: "test" }),
      ).rejects.toThrow(
        "Transaction with id non-existent not found after update",
      );
    });

    it("should handle partial updates correctly", async () => {
      const partialUpdate = { amount: 150 };
      const updatedTransaction = {
        ...mockTransaction,
        amount: 150,
        updatedAt: "2024-01-15T10:30:00.000Z",
      };

      mockTransactionsTable.update.mockResolvedValue(1);
      mockTransactionsTable.get.mockResolvedValue(updatedTransaction);

      const result = await repository.update("transaction_123", partialUpdate);

      expect(result.amount).toBe(150);
      expect(result.description).toBe(mockTransaction.description); // Should remain unchanged
      expect(mockTransactionsTable.update).toHaveBeenCalledWith(
        "transaction_123",
        {
          amount: 150,
          updatedAt: "2024-01-15T10:30:00.000Z",
        },
      );
    });

    it("should handle database errors during update", async () => {
      mockTransactionsTable.update.mockRejectedValue(
        new Error("Update failed"),
      );

      await expect(
        repository.update("transaction_123", { description: "test" }),
      ).rejects.toThrow("Update failed");
    });
  });

  describe("delete", () => {
    it("should delete transaction by ID", async () => {
      mockTransactionsTable.delete.mockResolvedValue(1);

      await repository.delete("transaction_123");

      expect(mockTransactionsTable.delete).toHaveBeenCalledWith(
        "transaction_123",
      );
    });

    it("should handle deletion of non-existent transaction", async () => {
      mockTransactionsTable.delete.mockResolvedValue(0);

      await repository.delete("non-existent");

      expect(mockTransactionsTable.delete).toHaveBeenCalledWith("non-existent");
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
      const mockTransactions = [mockTransaction];
      const mockChain = {
        reverse: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue(mockTransactions),
        }),
      };

      mockTransactionsTable.orderBy.mockReturnValue(mockChain);

      const result = await repository.getAll();

      expect(result).toEqual(mockTransactions);
      expect(mockTransactionsTable.orderBy).toHaveBeenCalledWith("date");
      expect(mockChain.reverse).toHaveBeenCalled();
    });

    it("should return empty array when no transactions exist", async () => {
      const mockChain = {
        reverse: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      };

      mockTransactionsTable.orderBy.mockReturnValue(mockChain);

      const result = await repository.getAll();

      expect(result).toEqual([]);
      expect(mockTransactionsTable.orderBy).toHaveBeenCalledWith("date");
    });

    it("should handle database errors", async () => {
      const mockChain = {
        reverse: vi.fn().mockReturnValue({
          toArray: vi.fn().mockRejectedValue(new Error("Database error")),
        }),
      };

      mockTransactionsTable.orderBy.mockReturnValue(mockChain);

      await expect(repository.getAll()).rejects.toThrow("Database error");
    });
  });

  describe("getByDateRange", () => {
    it("should retrieve transactions within date range", async () => {
      const mockTransactions = [mockTransaction];
      const mockChain = {
        between: vi.fn().mockReturnValue({
          reverse: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue(mockTransactions),
          }),
        }),
      };

      mockTransactionsTable.where.mockReturnValue(mockChain);

      const result = await repository.getByDateRange(
        "2024-01-01",
        "2024-01-31",
      );

      expect(result).toEqual(mockTransactions);
      expect(mockTransactionsTable.where).toHaveBeenCalledWith("date");
      expect(mockChain.between).toHaveBeenCalledWith(
        "2024-01-01",
        "2024-01-31",
        true,
        true,
      );
    });

    it("should handle empty date range results", async () => {
      const mockChain = {
        between: vi.fn().mockReturnValue({
          reverse: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue([]),
          }),
        }),
      };

      mockTransactionsTable.where.mockReturnValue(mockChain);

      const result = await repository.getByDateRange(
        "2025-01-01",
        "2025-01-31",
      );

      expect(result).toEqual([]);
      expect(mockTransactionsTable.where).toHaveBeenCalledWith("date");
      expect(mockChain.between).toHaveBeenCalledWith(
        "2025-01-01",
        "2025-01-31",
        true,
        true,
      );
    });
  });

  describe("getByCategory", () => {
    it("should retrieve transactions by category", async () => {
      const mockTransactions = [mockTransaction];
      const mockChain = {
        equals: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue(mockTransactions),
        }),
      };

      mockTransactionsTable.where.mockReturnValue(mockChain);

      const result = await repository.getByCategory("Food");

      expect(result).toEqual(mockTransactions);
      expect(mockTransactionsTable.where).toHaveBeenCalledWith("category");
      expect(mockChain.equals).toHaveBeenCalledWith("Food");
    });

    it("should return empty array for non-existent category", async () => {
      const mockChain = {
        equals: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      };

      mockTransactionsTable.where.mockReturnValue(mockChain);

      const result = await repository.getByCategory("NonExistent");

      expect(result).toEqual([]);
      expect(mockTransactionsTable.where).toHaveBeenCalledWith("category");
      expect(mockChain.equals).toHaveBeenCalledWith("NonExistent");
    });
  });

  describe("getByType", () => {
    it("should retrieve transactions by type", async () => {
      const mockTransactions = [mockTransaction];
      const mockChain = {
        equals: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue(mockTransactions),
        }),
      };

      mockTransactionsTable.where.mockReturnValue(mockChain);

      const result = await repository.getByType("debit");

      expect(result).toEqual(mockTransactions);
      expect(mockTransactionsTable.where).toHaveBeenCalledWith("type");
      expect(mockChain.equals).toHaveBeenCalledWith("debit");
    });

    it("should handle both credit and debit types", async () => {
      const creditTransaction = { ...mockTransaction, type: "credit" as const };
      const mockChain = {
        equals: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([creditTransaction]),
        }),
      };

      mockTransactionsTable.where.mockReturnValue(mockChain);

      const result = await repository.getByType("credit");

      expect(result).toEqual([creditTransaction]);
      expect(mockTransactionsTable.where).toHaveBeenCalledWith("type");
      expect(mockChain.equals).toHaveBeenCalledWith("credit");
    });
  });

  describe("searchByDescription", () => {
    it("should search transactions by description text", async () => {
      const mockTransactions = [mockTransaction];
      const mockChain = {
        toArray: vi.fn().mockResolvedValue(mockTransactions),
      };

      mockTransactionsTable.filter.mockReturnValue(mockChain);

      const result = await repository.searchByDescription("Test");

      expect(result).toEqual(mockTransactions);
      expect(mockTransactionsTable.filter).toHaveBeenCalledWith(
        expect.any(Function),
      );
    });

    it("should perform case-insensitive search", async () => {
      const mockTransactions = [mockTransaction];
      const mockChain = {
        toArray: vi.fn().mockResolvedValue(mockTransactions),
      };

      mockTransactionsTable.filter.mockReturnValue(mockChain);

      const result = await repository.searchByDescription("TEST");

      expect(result).toEqual(mockTransactions);
      expect(mockTransactionsTable.filter).toHaveBeenCalledWith(
        expect.any(Function),
      );
    });

    it("should return empty array when no matches found", async () => {
      const mockChain = {
        toArray: vi.fn().mockResolvedValue([]),
      };

      mockTransactionsTable.filter.mockReturnValue(mockChain);

      const result = await repository.searchByDescription("NoMatch");

      expect(result).toEqual([]);
      expect(mockTransactionsTable.filter).toHaveBeenCalledWith(
        expect.any(Function),
      );
    });
  });

  describe("bulkCreate", () => {
    it("should create multiple transactions in bulk", async () => {
      const transactionInputs = [
        mockTransactionInput,
        { ...mockTransactionInput, amount: 50 },
      ];

      vi.mocked(generateUUID).mockReturnValueOnce("transaction_1");
      vi.mocked(generateUUID).mockReturnValueOnce("transaction_2");

      mockTransactionsTable.bulkAdd.mockResolvedValue([
        "transaction_1",
        "transaction_2",
      ]);

      const result = await repository.bulkCreate(transactionInputs);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("transaction_1");
      expect(result[1].id).toBe("transaction_2");
      expect(mockTransactionsTable.bulkAdd).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: "transaction_1" }),
          expect.objectContaining({ id: "transaction_2" }),
        ]),
      );
    });

    it("should handle empty bulk creation", async () => {
      mockTransactionsTable.bulkAdd.mockResolvedValue([]);

      const result = await repository.bulkCreate([]);

      expect(result).toEqual([]);
      expect(mockTransactionsTable.bulkAdd).toHaveBeenCalledWith([]);
    });

    it("should assign consistent timestamps to bulk transactions", async () => {
      const transactionInputs = [mockTransactionInput, mockTransactionInput];

      vi.mocked(generateUUID).mockReturnValueOnce("transaction_1");
      vi.mocked(generateUUID).mockReturnValueOnce("transaction_2");

      mockTransactionsTable.bulkAdd.mockResolvedValue([
        "transaction_1",
        "transaction_2",
      ]);

      const result = await repository.bulkCreate(transactionInputs);

      expect(result[0].createdAt).toBe(result[1].createdAt);
      expect(result[0].updatedAt).toBe(result[1].updatedAt);
      expect(result[0].createdAt).toBe("2024-01-15T10:30:00.000Z");
      expect(result[0].updatedAt).toBe("2024-01-15T10:30:00.000Z");
    });

    it("should handle database errors during bulk creation", async () => {
      const transactionInputs = [mockTransactionInput];

      mockTransactionsTable.bulkAdd.mockRejectedValue(
        new Error("Bulk add failed"),
      );

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
      const mockCount = 5;
      const mockRecentTransaction = mockTransaction;

      mockTransactionsTable.count.mockResolvedValue(mockCount);

      const mockChain = {
        reverse: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue([mockRecentTransaction]),
          }),
        }),
      };

      mockTransactionsTable.orderBy.mockReturnValue(mockChain);

      const result = await repository.getInfo();

      expect(result).toEqual({
        name: "fintrac-dexie",
        implementation: "dexie",
        totalTransactions: mockCount,
        lastModified: mockRecentTransaction.updatedAt,
      });
      expect(mockTransactionsTable.count).toHaveBeenCalled();
      expect(mockTransactionsTable.orderBy).toHaveBeenCalledWith("updatedAt");
    });

    it("should handle count errors", async () => {
      mockTransactionsTable.count.mockRejectedValue(new Error("Count failed"));

      await expect(repository.getInfo()).rejects.toThrow("Count failed");
    });
  });

  describe("Edge Cases and Error Scenarios", () => {
    it("should handle corrupted transaction data", async () => {
      const corruptedTransaction = { id: "corrupt_1" };
      mockTransactionsTable.get.mockResolvedValue(corruptedTransaction);

      const result = await repository.getById("corrupt_1");
      expect(result).toEqual(corruptedTransaction);
    });

    it("should handle very large amounts", async () => {
      const largeAmount = Number.MAX_SAFE_INTEGER;
      const transactionWithLargeAmount = {
        ...mockTransactionInput,
        amount: largeAmount,
      };

      mockTransactionsTable.add.mockResolvedValue("transaction_123");

      const result = await repository.create(transactionWithLargeAmount);
      expect(result.amount).toBe(largeAmount);
    });

    it("should handle special characters in descriptions", async () => {
      const specialCharsDescription = "Test with émojis 🚀 and spëcial chars ñ";
      const transactionWithSpecialChars = {
        ...mockTransactionInput,
        description: specialCharsDescription,
      };

      mockTransactionsTable.add.mockResolvedValue("transaction_123");

      const result = await repository.create(transactionWithSpecialChars);
      expect(result.description).toBe(specialCharsDescription);
    });

    it("should handle transactions with very long tag arrays", async () => {
      const longTagArray = Array.from({ length: 100 }, (_, i) => `tag${i}`);
      const transactionWithManyTags = {
        ...mockTransactionInput,
        tags: longTagArray,
      };

      mockTransactionsTable.add.mockResolvedValue("transaction_123");

      const result = await repository.create(transactionWithManyTags);
      expect(result.tags).toEqual(longTagArray);
    });

    it("should handle concurrent operations gracefully", async () => {
      mockTransactionsTable.add.mockResolvedValue("success");
      mockTransactionsTable.get.mockResolvedValue(mockTransaction);
      mockTransactionsTable.update.mockResolvedValue(1);
      mockTransactionsTable.delete.mockResolvedValue(1);

      vi.mocked(generateUUID).mockReturnValueOnce("concurrent_1");
      vi.mocked(generateUUID).mockReturnValueOnce("concurrent_2");

      const operations = [
        repository.create(mockTransactionInput),
        repository.create(mockTransactionInput),
        repository.getById("test_id"),
        repository.update("test_id", { amount: 500 }),
        repository.delete("test_id"),
      ];

      await expect(Promise.all(operations)).resolves.toBeDefined();
    });
  });

  describe("Performance and Large Datasets", () => {
    it("should handle large bulk operations efficiently", async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        ...mockTransactionInput,
        description: `Transaction ${i}`,
        amount: i * 10,
      }));

      const mockIds = Array.from(
        { length: 1000 },
        (_, i) => `transaction_${i}`,
      );
      vi.mocked(generateUUID).mockImplementation(
        () => mockIds.shift() || "fallback",
      );

      mockTransactionsTable.bulkAdd.mockResolvedValue(mockIds);

      const startTime = Date.now();
      const result = await repository.bulkCreate(largeDataset);
      const endTime = Date.now();

      expect(result).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(mockTransactionsTable.bulkAdd).toHaveBeenCalledOnce();
    });
  });

  describe("Real-world Usage Scenarios", () => {
    it("should handle typical expense entry workflow", async () => {
      // Create transaction
      vi.mocked(generateUUID).mockReturnValue("expense_1");
      mockTransactionsTable.add.mockResolvedValue("expense_1");
      const expense = await repository.create({
        date: "2024-01-15",
        description: "Coffee shop",
        amount: 4.5,
        currency: "USD",
        type: "debit",
        category: "Food",
        tags: ["coffee", "morning"],
      });

      expect(expense.id).toBe("expense_1");

      // Update transaction (user realizes they forgot tip)
      const updatedExpense = {
        ...expense,
        amount: 5.5,
        updatedAt: "2024-01-15T10:30:00.000Z",
      };
      mockTransactionsTable.update.mockResolvedValue(1);
      mockTransactionsTable.get.mockResolvedValue(updatedExpense);

      const updated = await repository.update(expense.id, { amount: 5.5 });
      expect(updated.amount).toBe(5.5);
    });

    it("should handle income transaction workflow", async () => {
      const incomeInput = {
        date: "2024-01-15",
        description: "Freelance payment",
        amount: 1200,
        currency: "USD",
        type: "credit" as const,
        category: "Income",
      };

      mockTransactionsTable.add.mockResolvedValue("income_1");

      const income = await repository.create(incomeInput);
      expect(income.type).toBe("credit");
      expect(income.amount).toBe(1200);
    });

    it("should handle monthly expense analysis workflow", async () => {
      const mockExpenses = [
        { ...mockTransaction, amount: 100, category: "Food" },
        { ...mockTransaction, amount: 200, category: "Transport" },
      ];

      // Mock the chain for date range query
      const mockChain = {
        between: vi.fn().mockReturnValue({
          reverse: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue(mockExpenses),
          }),
        }),
      };

      mockTransactionsTable.where.mockReturnValue(mockChain);

      const monthlyExpenses = await repository.getByDateRange(
        "2024-01-01",
        "2024-01-31",
      );
      expect(monthlyExpenses).toHaveLength(2);

      const totalAmount = monthlyExpenses.reduce((sum, t) => sum + t.amount, 0);
      expect(totalAmount).toBe(300);
    });
  });
});
