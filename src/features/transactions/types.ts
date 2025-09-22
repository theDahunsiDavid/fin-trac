export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  type: "credit" | "debit";
  category: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  createdAt?: string; // ISO 8601 format
  updatedAt?: string; // ISO 8601 format
}
