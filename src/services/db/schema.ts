// Common schema types for FinTrac
// This file defines the core data models used across different database implementations

export interface Transaction {
  id: string;
  date: string; // ISO 8601 format (YYYY-MM-DD)
  description: string;
  amount: number;
  currency: string; // 3-letter currency code (USD, EUR, etc.)
  type: "credit" | "debit";
  category: string;
  tags?: string[];
  createdAt: string; // ISO 8601 format
  updatedAt: string; // ISO 8601 format
}

export interface Category {
  id: string;
  name: string;
  color: string; // Tailwind color class for UI
}

// Validation schemas
export const TRANSACTION_VALIDATION = {
  AMOUNT_MAX: 999999999,
  AMOUNT_MIN: 0.01,
  DESCRIPTION_MAX_LENGTH: 500,
  DESCRIPTION_MIN_LENGTH: 1,
  CATEGORY_MAX_LENGTH: 100,
  CURRENCY_PATTERN: /^[A-Z]{3}$/,
  DATE_PATTERN: /^\d{4}-\d{2}-\d{2}$/,
  VALID_TYPES: ["credit", "debit"] as const,
} as const;

export const CATEGORY_VALIDATION = {
  NAME_MAX_LENGTH: 100,
  NAME_MIN_LENGTH: 1,
  COLOR_PATTERN: /^[a-z-]+(-\d+)?$/, // Tailwind color format like 'blue-500'
} as const;

// Type guards
export const isValidTransactionType = (
  type: string,
): type is Transaction["type"] => {
  return TRANSACTION_VALIDATION.VALID_TYPES.includes(
    type as Transaction["type"],
  );
};

export const isValidCurrency = (currency: string): boolean => {
  return TRANSACTION_VALIDATION.CURRENCY_PATTERN.test(currency);
};

export const isValidDate = (date: string): boolean => {
  if (!TRANSACTION_VALIDATION.DATE_PATTERN.test(date)) {
    return false;
  }
  const parsedDate = new Date(date);
  return !isNaN(parsedDate.getTime());
};

// Default categories for initialization
export const DEFAULT_CATEGORIES: Omit<Category, "id">[] = [
  { name: "Food", color: "emerald-400" },
  { name: "Transport", color: "blue-400" },
  { name: "Entertainment", color: "amber-400" },
  { name: "Shopping", color: "rose-400" },
  { name: "Health", color: "green-400" },
  { name: "Income", color: "emerald-600" },
  { name: "Bills", color: "red-400" },
  { name: "Other", color: "gray-400" },
];

// Helper types for create operations
export type TransactionInput = Omit<
  Transaction,
  "id" | "createdAt" | "updatedAt"
>;
export type CategoryInput = Omit<Category, "id">;

// Helper types for update operations
export type TransactionUpdate = Partial<Omit<Transaction, "id" | "createdAt">>;
export type CategoryUpdate = Partial<Omit<Category, "id">>;
