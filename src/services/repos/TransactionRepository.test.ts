import { describe, it, expect, vi, beforeEach } from "vitest";
import { TransactionRepository } from "./TransactionRepository";
import type { Transaction } from "../../features/transactions/types";

// Mock the db
vi.mock("../db/db", () => ({
  db: {
    transactions: {
      toArray: vi.fn(),
      add: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      get: vi.fn(),
      where: vi.fn().mockReturnThis(),
      between: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      reverse: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
    },
  },
}));

import { db } from "../db/db";

const mockTransactionsTable = db.transactions as any; // eslint-disable-line @typescript-eslint/no-explicit-any

describe("TransactionRepository", () => {
  let repository: TransactionRepository;

  beforeEach(() => {
    repository = new TransactionRepository();
    vi.clearAllMocks();
  });

  describe("getAll", () => {
    it("returns all transactions", async () => {
      const mockTransactions: Transaction[] = [
        {
          id: "1",
          date: "2023-01-01",
          description: "Test transaction",
          amount: 100,
          currency: "USD",
          type: "credit",
          category: "Income",
          createdAt: "2023-01-01T00:00:00Z",
          updatedAt: "2023-01-01T00:00:00Z",
        },
      ];
      mockTransactionsTable.toArray.mockResolvedValue(mockTransactions);

      const result = await repository.getAll();

      expect(result).toEqual(mockTransactions);
      expect(mockTransactionsTable.toArray).toHaveBeenCalled();
    });
  });

  describe("create", () => {
    it("creates a new transaction with generated id and timestamps", async () => {
      const transactionInput = {
        date: "2023-01-01",
        description: "New transaction",
        amount: 50,
        currency: "USD",
        type: "debit" as const,
        category: "Food",
      };

      const mockUUID = "123e4567-e89b-12d3-a456-426614174000";
      vi.spyOn(crypto, "randomUUID").mockReturnValue(mockUUID);
      const mockNow = "2023-01-01T12:00:00Z";
      vi.spyOn(Date.prototype, "toISOString").mockReturnValue(mockNow);

      await repository.create(transactionInput);

      expect(mockTransactionsTable.add).toHaveBeenCalledWith({
        ...transactionInput,
        id: mockUUID,
        createdAt: mockNow,
        updatedAt: mockNow,
      });
    });
  });

  describe("update", () => {
    it("updates a transaction with new data and updated timestamp", async () => {
      const id = "1";
      const updates = { description: "Updated description" };
      const mockNow = "2023-01-01T12:00:00Z";
      const mockUpdatedTransaction: Transaction = {
        id: "1",
        date: "2023-01-01",
        description: "Updated description",
        amount: 100,
        currency: "USD",
        type: "credit",
        category: "Income",
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: mockNow,
      };

      vi.spyOn(Date.prototype, "toISOString").mockReturnValue(mockNow);
      mockTransactionsTable.get.mockResolvedValue(mockUpdatedTransaction);

      const result = await repository.update(id, updates);

      expect(mockTransactionsTable.update).toHaveBeenCalledWith(id, {
        ...updates,
        updatedAt: mockNow,
      });
      expect(mockTransactionsTable.get).toHaveBeenCalledWith(id);
      expect(result).toEqual(mockUpdatedTransaction);
    });
  });

  describe("delete", () => {
    it("deletes a transaction by id", async () => {
      const id = "1";

      await repository.delete(id);

      expect(mockTransactionsTable.delete).toHaveBeenCalledWith(id);
    });
  });

  describe("getTransactionsByDateRange", () => {
    it("returns transactions within date range", async () => {
      const startDate = "2023-01-01";
      const endDate = "2023-01-31";
      const mockTransactions: Transaction[] = [
        {
          id: "1",
          date: "2023-01-15",
          description: "Test",
          amount: 100,
          currency: "USD",
          type: "credit",
          category: "Income",
          createdAt: "2023-01-15T00:00:00Z",
          updatedAt: "2023-01-15T00:00:00Z",
        },
      ];

      mockTransactionsTable.toArray.mockResolvedValue(mockTransactions);

      const result = await repository.getTransactionsByDateRange(
        startDate,
        endDate,
      );

      expect(result).toEqual(mockTransactions);
      expect(mockTransactionsTable.where).toHaveBeenCalledWith("date");
      expect(mockTransactionsTable.between).toHaveBeenCalledWith(
        startDate,
        endDate,
        true,
        true,
      );
    });
  });

  describe("getTransactionsByType", () => {
    it("returns transactions of specified type", async () => {
      const type = "credit";
      const mockTransactions: Transaction[] = [
        {
          id: "1",
          date: "2023-01-01",
          description: "Credit transaction",
          amount: 100,
          currency: "USD",
          type: "credit",
          category: "Income",
          createdAt: "2023-01-01T00:00:00Z",
          updatedAt: "2023-01-01T00:00:00Z",
        },
      ];

      mockTransactionsTable.toArray.mockResolvedValue(mockTransactions);

      const result = await repository.getTransactionsByType(type);

      expect(result).toEqual(mockTransactions);
      expect(mockTransactionsTable.where).toHaveBeenCalledWith("type");
      expect(mockTransactionsTable.equals).toHaveBeenCalledWith(type);
    });
  });

  describe("getTransactionsByCategory", () => {
    it("returns transactions of specified category", async () => {
      const category = "Food";
      const mockTransactions: Transaction[] = [
        {
          id: "1",
          date: "2023-01-01",
          description: "Food expense",
          amount: 50,
          currency: "USD",
          type: "debit",
          category: "Food",
          createdAt: "2023-01-01T00:00:00Z",
          updatedAt: "2023-01-01T00:00:00Z",
        },
      ];

      mockTransactionsTable.toArray.mockResolvedValue(mockTransactions);

      const result = await repository.getTransactionsByCategory(category);

      expect(result).toEqual(mockTransactions);
      expect(mockTransactionsTable.where).toHaveBeenCalledWith("category");
      expect(mockTransactionsTable.equals).toHaveBeenCalledWith(category);
    });
  });

  describe("getRecentTransactions", () => {
    it("returns recent transactions limited by count", async () => {
      const limit = 5;
      const mockTransactions: Transaction[] = [
        {
          id: "1",
          date: "2023-01-01",
          description: "Recent transaction",
          amount: 100,
          currency: "USD",
          type: "credit",
          category: "Income",
          createdAt: "2023-01-01T00:00:00Z",
          updatedAt: "2023-01-01T00:00:00Z",
        },
      ];

      mockTransactionsTable.toArray.mockResolvedValue(mockTransactions);

      const result = await repository.getRecentTransactions(limit);

      expect(result).toEqual(mockTransactions);
      expect(mockTransactionsTable.orderBy).toHaveBeenCalledWith("date");
      expect(mockTransactionsTable.reverse).toHaveBeenCalled();
      expect(mockTransactionsTable.limit).toHaveBeenCalledWith(limit);
    });

    it("defaults to 10 when no limit provided", async () => {
      mockTransactionsTable.toArray.mockResolvedValue([]);

      await repository.getRecentTransactions();

      expect(mockTransactionsTable.limit).toHaveBeenCalledWith(10);
    });
  });
});
