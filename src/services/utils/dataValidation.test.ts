import { describe, it, expect } from "vitest";
import { validateTransaction, validateTransactions } from "./dataValidation";
import type { Transaction } from "../../features/transactions/types";

describe("Data Validation Utilities", () => {
  // Valid transaction template for testing
  const validTransaction: Transaction = {
    id: "transaction_550e8400-e29b-41d4-a716-446655440000",
    date: "2024-01-15",
    description: "Test transaction",
    amount: 100.5,
    currency: "USD",
    type: "debit",
    category: "Food",
    tags: ["test", "validation"],
    createdAt: "2024-01-15T10:30:00.000Z",
    updatedAt: "2024-01-15T10:30:00.000Z",
  };

  // Helper function to create transaction with specific overrides
  const createTransaction = (
    overrides: Partial<Transaction> = {},
  ): Transaction => ({
    ...validTransaction,
    ...overrides,
    id:
      overrides.id !== undefined
        ? overrides.id
        : `transaction_${Date.now()}_${Math.random()}`,
  });

  describe("validateTransaction", () => {
    describe("Valid Transaction Cases", () => {
      it("should return empty errors for valid transaction", () => {
        const errors = validateTransaction(validTransaction);
        expect(errors).toEqual([]);
      });

      it("should accept transaction without optional tags", () => {
        const transaction = createTransaction({ tags: undefined });
        const errors = validateTransaction(transaction);
        expect(errors).toEqual([]);
      });

      it("should accept transaction with empty tags array", () => {
        const transaction = createTransaction({ tags: [] });
        const errors = validateTransaction(transaction);
        expect(errors).toEqual([]);
      });

      it("should accept credit type transactions", () => {
        const transaction = createTransaction({ type: "credit" });
        const errors = validateTransaction(transaction);
        expect(errors).toEqual([]);
      });

      it("should accept various currency codes", () => {
        const currencies = ["USD", "EUR", "GBP", "JPY", "NGN", "CAD"];

        currencies.forEach((currency) => {
          const transaction = createTransaction({ currency });
          const errors = validateTransaction(transaction);
          expect(errors).toEqual([]);
        });
      });

      it("should accept transactions with 2 decimal places", () => {
        const amounts = [10.0, 123.45, 0.01, 999.99];

        amounts.forEach((amount) => {
          const transaction = createTransaction({ amount });
          const errors = validateTransaction(transaction);
          expect(errors).toEqual([]);
        });
      });
    });

    describe("Required Fields Validation", () => {
      it("should require transaction ID", () => {
        const transaction = createTransaction({ id: "" as unknown as string });
        const errors = validateTransaction(transaction);
        expect(errors).toContain(
          "Transaction ID is required and must be a string",
        );
      });

      it("should require string type for ID", () => {
        const transaction = createTransaction({ id: 123 as unknown as string });
        const errors = validateTransaction(transaction);
        expect(errors).toContain(
          "Transaction ID is required and must be a string",
        );
      });

      it("should require transaction date", () => {
        const transaction = createTransaction({ date: "" });
        const errors = validateTransaction(transaction);
        expect(errors).toContain(
          "Transaction date is required and must be a string",
        );
      });

      it("should require string type for date", () => {
        const transaction = createTransaction({
          date: new Date() as unknown as string,
        });
        const errors = validateTransaction(transaction);
        expect(errors).toContain(
          "Transaction date is required and must be a string",
        );
      });

      it("should require transaction description", () => {
        const transaction = createTransaction({ description: "" });
        const errors = validateTransaction(transaction);
        expect(errors).toContain("Transaction description cannot be empty");
      });

      it("should reject whitespace-only descriptions", () => {
        const transaction = createTransaction({ description: "   " });
        const errors = validateTransaction(transaction);
        expect(errors).toContain("Transaction description cannot be empty");
      });

      it("should require number type for amount", () => {
        const transaction = createTransaction({
          amount: "100.50" as unknown as number,
        });
        const errors = validateTransaction(transaction);
        expect(errors).toContain("Transaction amount must be a number");
      });

      it("should require transaction currency", () => {
        const transaction = createTransaction({ currency: "" });
        const errors = validateTransaction(transaction);
        expect(errors).toContain(
          "Transaction currency is required and must be a string",
        );
      });

      it("should require transaction category", () => {
        const transaction = createTransaction({ category: "" });
        const errors = validateTransaction(transaction);
        expect(errors).toContain("Transaction category cannot be empty");
      });
    });

    describe("Date Validation", () => {
      it("should require YYYY-MM-DD format", () => {
        const invalidDates = [
          "15/01/2024",
          "2024-1-15",
          "2024/01/15",
          "01-15-2024",
          "2024-01-15T10:30:00Z",
        ];

        invalidDates.forEach((date) => {
          const transaction = createTransaction({ date });
          const errors = validateTransaction(transaction);
          expect(errors).toContain(
            "Transaction date must be in YYYY-MM-DD format",
          );
        });
      });

      it("should reject invalid dates", () => {
        const invalidDates = ["2024-02-30", "2024-13-01", "2024-00-15"];

        invalidDates.forEach((date) => {
          const transaction = createTransaction({ date });
          const errors = validateTransaction(transaction);
          expect(errors).toContain("Transaction date is not a valid date");
        });
      });

      it("should accept valid date formats", () => {
        const validDates = [
          "2024-01-01",
          "2024-12-31",
          "2023-02-28",
          "2024-02-29",
        ];

        validDates.forEach((date) => {
          const transaction = createTransaction({ date });
          const errors = validateTransaction(transaction);
          expect(errors.filter((e) => e.includes("date"))).toEqual([]);
        });
      });
    });

    describe("Amount Validation", () => {
      it("should require positive amounts", () => {
        const invalidAmounts = [0, -10, -0.01];

        invalidAmounts.forEach((amount) => {
          const transaction = createTransaction({ amount });
          const errors = validateTransaction(transaction);
          expect(errors).toContain("Transaction amount must be greater than 0");
        });
      });

      it("should reject unreasonably large amounts", () => {
        const transaction = createTransaction({ amount: 1000000000 });
        const errors = validateTransaction(transaction);
        expect(errors).toContain("Transaction amount is unreasonably large");
      });

      it("should reject amounts with too many decimal places", () => {
        const transaction = createTransaction({ amount: 10.123 });
        const errors = validateTransaction(transaction);
        expect(errors).toContain(
          "Transaction amount should not have more than 2 decimal places",
        );
      });

      it("should accept valid amounts", () => {
        const validAmounts = [0.01, 10, 100.5, 999999999];

        validAmounts.forEach((amount) => {
          const transaction = createTransaction({ amount });
          const errors = validateTransaction(transaction);
          expect(errors.filter((e) => e.includes("amount"))).toEqual([]);
        });
      });
    });

    describe("Currency Validation", () => {
      it("should require 3-letter uppercase currency codes", () => {
        const invalidCurrencies = ["usd", "US", "USDD", "123", "us$"];

        invalidCurrencies.forEach((currency) => {
          const transaction = createTransaction({ currency });
          const errors = validateTransaction(transaction);
          expect(errors).toContain(
            "Transaction currency must be a 3-letter uppercase code (e.g., USD, EUR)",
          );
        });
      });

      it("should accept valid currency codes", () => {
        const validCurrencies = ["USD", "EUR", "GBP", "JPY", "NGN"];

        validCurrencies.forEach((currency) => {
          const transaction = createTransaction({ currency });
          const errors = validateTransaction(transaction);
          expect(errors.filter((e) => e.includes("currency"))).toEqual([]);
        });
      });
    });

    describe("Type Validation", () => {
      it("should only accept credit or debit types", () => {
        const invalidTypes = [
          "income",
          "expense",
          "transfer",
          "",
        ] as unknown as ("credit" | "debit")[];

        invalidTypes.forEach((type) => {
          const transaction = createTransaction({ type });
          const errors = validateTransaction(transaction);
          expect(errors).toContain(
            "Transaction type must be either 'credit' or 'debit'",
          );
        });
      });

      it("should accept valid types", () => {
        const validTypes: ("credit" | "debit")[] = ["credit", "debit"];

        validTypes.forEach((type) => {
          const transaction = createTransaction({ type });
          const errors = validateTransaction(transaction);
          expect(errors.filter((e) => e.includes("type"))).toEqual([]);
        });
      });
    });

    describe("Category Validation", () => {
      it("should reject empty categories", () => {
        const transaction = createTransaction({ category: "" });
        const errors = validateTransaction(transaction);
        expect(errors).toContain("Transaction category cannot be empty");
      });

      it("should reject whitespace-only categories", () => {
        const transaction = createTransaction({ category: "   " });
        const errors = validateTransaction(transaction);
        expect(errors).toContain("Transaction category cannot be empty");
      });

      it("should accept valid categories", () => {
        const validCategories = [
          "Food",
          "Transportation",
          "Entertainment",
          "Utilities",
        ];

        validCategories.forEach((category) => {
          const transaction = createTransaction({ category });
          const errors = validateTransaction(transaction);
          expect(errors.filter((e) => e.includes("category"))).toEqual([]);
        });
      });
    });

    describe("Tags Validation", () => {
      it("should accept undefined tags", () => {
        const transaction = createTransaction({ tags: undefined });
        const errors = validateTransaction(transaction);
        expect(errors.filter((e) => e.includes("tags"))).toEqual([]);
      });

      it("should require array type for tags when provided", () => {
        const transaction = createTransaction({
          tags: "tag1,tag2" as unknown as string[],
        });
        const errors = validateTransaction(transaction);
        expect(errors).toContain(
          "Transaction tags must be an array if provided",
        );
      });

      it("should require string type for tag elements", () => {
        const transaction = createTransaction({
          tags: ["tag1", 123, "tag3"] as unknown as string[],
        });
        const errors = validateTransaction(transaction);
        expect(errors).toContain("Transaction tag at index 1 must be a string");
      });

      it("should accept valid tag arrays", () => {
        const validTagArrays: string[][] = [
          ["tag1", "tag2"],
          ["single-tag"],
          [],
        ];

        validTagArrays.forEach((tags) => {
          const transaction = createTransaction({ tags });
          const errors = validateTransaction(transaction);
          expect(errors.filter((e) => e.includes("tags"))).toEqual([]);
        });
      });
    });

    describe("Timestamp Validation", () => {
      it("should require createdAt timestamp", () => {
        const transaction = createTransaction({ createdAt: "" });
        const errors = validateTransaction(transaction);
        expect(errors).toContain(
          "Transaction createdAt is required and must be a string",
        );
      });

      it("should require valid ISO date for createdAt", () => {
        const transaction = createTransaction({ createdAt: "invalid-date" });
        const errors = validateTransaction(transaction);
        expect(errors).toContain(
          "Transaction createdAt is not a valid ISO date",
        );
      });

      it("should require updatedAt timestamp", () => {
        const transaction = createTransaction({ updatedAt: "" });
        const errors = validateTransaction(transaction);
        expect(errors).toContain(
          "Transaction updatedAt is required and must be a string",
        );
      });

      it("should require valid ISO date for updatedAt", () => {
        const transaction = createTransaction({ updatedAt: "invalid-date" });
        const errors = validateTransaction(transaction);
        expect(errors).toContain(
          "Transaction updatedAt is not a valid ISO date",
        );
      });

      it("should require updatedAt to be >= createdAt", () => {
        const transaction = createTransaction({
          createdAt: "2024-01-15T12:00:00.000Z",
          updatedAt: "2024-01-15T10:00:00.000Z",
        });
        const errors = validateTransaction(transaction);
        expect(errors).toContain(
          "Transaction updatedAt cannot be earlier than createdAt",
        );
      });

      it("should accept equal createdAt and updatedAt", () => {
        const timestamp = "2024-01-15T10:30:00.000Z";
        const transaction = createTransaction({
          createdAt: timestamp,
          updatedAt: timestamp,
        });
        const errors = validateTransaction(transaction);
        expect(
          errors.filter(
            (e) => e.includes("updatedAt") || e.includes("createdAt"),
          ),
        ).toEqual([]);
      });
    });

    describe("Multiple Validation Errors", () => {
      it("should return all validation errors for completely invalid transaction", () => {
        const invalidTransaction = {
          id: 123 as unknown as string,
          date: "invalid-date",
          description: "" as unknown as string,
          amount: -10 as unknown as number,
          currency: "invalid" as unknown as string,
          type: "invalid",
          category: "",
          tags: "invalid",
          createdAt: "invalid",
          updatedAt: "invalid",
        } as unknown as Transaction;

        const errors = validateTransaction(invalidTransaction);
        expect(errors.length).toBeGreaterThan(5);
        expect(errors).toContain(
          "Transaction ID is required and must be a string",
        );
        expect(errors).toContain(
          "Transaction date must be in YYYY-MM-DD format",
        );
        expect(errors).toContain("Transaction description cannot be empty");
        expect(errors).toContain("Transaction amount must be greater than 0");
      });
    });
  });

  describe("validateTransactions", () => {
    describe("Valid Collections", () => {
      it("should return valid result for valid transaction collection", () => {
        const transactions = [
          createTransaction({ description: "Transaction 1" }),
          createTransaction({ description: "Transaction 2" }),
          createTransaction({ description: "Transaction 3" }),
        ];

        const result = validateTransactions(transactions);

        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
        expect(result.warnings).toEqual([]);
        expect(result.summary.totalTransactions).toBe(3);
        expect(result.summary.validTransactions).toBe(3);
        expect(result.summary.invalidTransactions).toBe(0);
      });

      it("should handle empty transaction array", () => {
        const result = validateTransactions([]);

        expect(result.isValid).toBe(true);
        expect(result.summary.totalTransactions).toBe(0);
        expect(result.summary.validTransactions).toBe(0);
        expect(result.summary.invalidTransactions).toBe(0);
      });
    });

    describe("Invalid Collections", () => {
      it("should detect duplicate transaction IDs", () => {
        const duplicateId = "transaction_duplicate_id";
        const transactions = [
          createTransaction({ id: duplicateId, description: "Transaction 1" }),
          createTransaction({ id: duplicateId, description: "Transaction 2" }),
        ];

        const result = validateTransactions(transactions);

        expect(result.isValid).toBe(false);
        expect(result.summary.duplicateIds).toBe(1);
        expect(
          result.errors.some((error) =>
            error.includes("Duplicate transaction ID"),
          ),
        ).toBe(true);
      });

      it("should count invalid transactions correctly", () => {
        const transactions = [
          createTransaction({ description: "Valid transaction" }),
          createTransaction({ amount: -10, description: "Invalid amount" }),
          createTransaction({
            currency: "invalid",
            description: "Invalid currency",
          }),
        ];

        const result = validateTransactions(transactions);

        expect(result.isValid).toBe(false);
        expect(result.summary.totalTransactions).toBe(3);
        expect(result.summary.validTransactions).toBe(1);
        expect(result.summary.invalidTransactions).toBe(2);
      });

      it("should categorize validation errors correctly", () => {
        const transactions = [
          createTransaction({ date: "invalid-date" }),
          createTransaction({ amount: -10 }),
          createTransaction({ description: "" }),
        ];

        const result = validateTransactions(transactions);

        expect(result.summary.invalidDates).toBeGreaterThan(0);
        expect(result.summary.invalidAmounts).toBeGreaterThan(0);
        expect(result.summary.missingFields).toBeGreaterThan(0);
      });
    });

    describe("Performance and Large Collections", () => {
      it("should handle large transaction collections", () => {
        const largeCollection = Array.from({ length: 1000 }, (_, i) =>
          createTransaction({ description: `Transaction ${i}` }),
        );

        const start = performance.now();
        const result = validateTransactions(largeCollection);
        const end = performance.now();

        expect(result.isValid).toBe(true);
        expect(result.summary.totalTransactions).toBe(1000);
        expect(end - start).toBeLessThan(1000); // Should complete in reasonable time
      });

      it("should provide warnings for very large collections", () => {
        const veryLargeCollection = Array.from({ length: 15000 }, (_, i) =>
          createTransaction({ description: `Transaction ${i}` }),
        );

        const result = validateTransactions(veryLargeCollection);

        expect(
          result.warnings.some((warning) =>
            warning.includes("Large number of transactions"),
          ),
        ).toBe(true);
      });
    });

    describe("Data Quality Analysis", () => {
      it("should detect too many categories", () => {
        const transactions = Array.from({ length: 100 }, (_, i) =>
          createTransaction({ category: `Category_${i}` }),
        );

        const result = validateTransactions(transactions);

        expect(
          result.warnings.some((warning) =>
            warning.includes("Large number of categories"),
          ),
        ).toBe(true);
      });

      it("should detect multiple currencies", () => {
        const transactions = [
          createTransaction({ currency: "USD" }),
          createTransaction({ currency: "EUR" }),
          createTransaction({ currency: "GBP" }),
        ];

        const result = validateTransactions(transactions);

        expect(
          result.warnings.some((warning) =>
            warning.includes("Multiple currencies detected"),
          ),
        ).toBe(true);
      });
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle null transaction gracefully", () => {
      const errors = validateTransaction(null as unknown as Transaction);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should handle undefined transaction gracefully", () => {
      const errors = validateTransaction(undefined as unknown as Transaction);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should handle transaction with missing properties", () => {
      const incompleteTransaction = {
        id: "test-id",
        description: "Test",
      } as unknown as Transaction;

      const errors = validateTransaction(incompleteTransaction);
      expect(errors.length).toBeGreaterThan(5);
    });

    it("should handle non-array input for validateTransactions", () => {
      const result = validateTransactions(null as unknown as Transaction[]);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("Real-world Transaction Scenarios", () => {
    it("should validate common expense transaction", () => {
      const expenseTransaction = createTransaction({
        description: "Grocery shopping at Whole Foods",
        amount: 87.43,
        currency: "USD",
        type: "debit",
        category: "Groceries",
        tags: ["food", "essentials"],
      });

      const errors = validateTransaction(expenseTransaction);
      expect(errors).toEqual([]);
    });

    it("should validate salary income transaction", () => {
      const salaryTransaction = createTransaction({
        description: "Monthly salary payment",
        amount: 5000.0,
        currency: "USD",
        type: "credit",
        category: "Salary",
        tags: ["income", "monthly"],
      });

      const errors = validateTransaction(salaryTransaction);
      expect(errors).toEqual([]);
    });

    it("should validate international transaction", () => {
      const internationalTransaction = createTransaction({
        description: "Hotel booking in London",
        amount: 250.0,
        currency: "GBP",
        type: "debit",
        category: "Travel",
        tags: ["vacation", "accommodation"],
      });

      const errors = validateTransaction(internationalTransaction);
      expect(errors).toEqual([]);
    });

    it("should validate minimal transaction", () => {
      const minimalTransaction = createTransaction({
        tags: undefined,
      });

      const errors = validateTransaction(minimalTransaction);
      expect(errors).toEqual([]);
    });
  });
});
