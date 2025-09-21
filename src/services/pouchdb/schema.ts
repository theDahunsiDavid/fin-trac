import type { Transaction, Category } from '../../features/transactions/types';

// PouchDB document interfaces extending base types with CouchDB fields
export interface PouchTransaction extends Omit<Transaction, 'type'> {
  _id: string;
  _rev?: string;
  docType: 'transaction'; // Document type for CouchDB (renamed to avoid conflict)
  type: 'credit' | 'debit'; // Keep original transaction type
}

export interface PouchCategory extends Category {
  _id: string;
  _rev?: string;
  docType: 'category'; // Document type for CouchDB
}

// Document type union for type safety
export type PouchDocument = PouchTransaction | PouchCategory;

// Document type guards
export const isPouchTransaction = (doc: PouchDocument): doc is PouchTransaction => {
  return doc.docType === 'transaction';
};

export const isPouchCategory = (doc: PouchDocument): doc is PouchCategory => {
  return doc.docType === 'category';
};

// ID generation utilities
export const generateTransactionId = (): string => {
  return `transaction_${crypto.randomUUID()}`;
};

export const generateCategoryId = (): string => {
  return `category_${crypto.randomUUID()}`;
};

// Conversion utilities between app models and PouchDB documents
export const transactionToPouchDoc = (transaction: Transaction): PouchTransaction => {
  return {
    ...transaction,
    _id: transaction.id,
    docType: 'transaction',
  };
};

export const pouchDocToTransaction = (doc: PouchTransaction): Transaction => {
  const { _id, _rev: _revUnused, docType: _docTypeUnused, ...transaction } = doc; // eslint-disable-line @typescript-eslint/no-unused-vars
  return {
    ...transaction,
    id: _id,
  };
};

export const categoryToPouchDoc = (category: Category): PouchCategory => {
  return {
    ...category,
    _id: category.id,
    docType: 'category',
  };
};

export const pouchDocToCategory = (doc: PouchCategory): Category => {
  const { _id, _rev: _revUnused, docType: _docTypeUnused, ...category } = doc; // eslint-disable-line @typescript-eslint/no-unused-vars
  return {
    ...category,
    id: _id,
  };
};