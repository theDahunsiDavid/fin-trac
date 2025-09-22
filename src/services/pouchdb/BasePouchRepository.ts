/* eslint-disable @typescript-eslint/no-explicit-any */
import { pouchDBConnection } from "./PouchDBConnection";
import type { Database } from "./config";
import { verifyPouchDBSetup } from "./init";

// Type helpers for PouchDB operations
type PouchDocument = Record<string, unknown> & {
  _id?: string;
  _rev?: string;
  _deleted?: boolean;
};

type FindOptions = {
  selector: Record<string, unknown>;
  sort?: string[];
  limit?: number;
};

type FindResult = {
  docs: PouchDocument[];
};

/**
 * Abstract base class for PouchDB repositories.
 *
 * This class provides common CRUD operations and error handling patterns
 * that can be shared across different repository implementations. It handles
 * PouchDB-specific concerns like document versioning, conflict resolution,
 * and connection management.
 */
export abstract class BasePouchRepository<T> {
  protected db: Database | null = null;

  /**
   * Gets the PouchDB database instance.
   * Uses the connection manager for consistent connection handling.
   *
   * @returns Promise<Database> Database instance
   * @throws Error if connection fails
   */
  protected async getDB(): Promise<Database> {
    // Verify PouchDB setup before creating database connections
    verifyPouchDBSetup();

    if (!this.db) {
      this.db = await pouchDBConnection.getLocalDB();
    }
    return this.db;
  }

  /**
   * Wraps PouchDB operations with standardized error handling.
   * Provides consistent error messages and logging across repositories.
   *
   * @param operation Async operation to execute
   * @param operationName Name of the operation for error messages
   * @returns Promise<T> Result of the operation
   * @throws Error with standardized error message
   */
  protected async executeWithErrorHandling<R>(
    operation: () => Promise<R>,
    operationName: string,
  ): Promise<R> {
    try {
      return await operation();
    } catch (error) {
      const errorMessage = this.getErrorMessage(error, operationName);
      console.error(`${operationName} failed:`, error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Extracts meaningful error messages from PouchDB errors.
   * Handles common PouchDB error types with user-friendly messages.
   *
   * @param error Original error from PouchDB
   * @param operationName Name of the failed operation
   * @returns string Human-readable error message
   */
  protected getErrorMessage(error: unknown, operationName: string): string {
    const errorObj = error as { name?: string; message?: string };

    if (errorObj?.name === "not_found") {
      return `Document not found during ${operationName}`;
    }

    if (errorObj?.name === "conflict") {
      return `Document conflict during ${operationName}. Please retry.`;
    }

    if (errorObj?.name === "unauthorized") {
      return `Unauthorized access during ${operationName}`;
    }

    if (errorObj?.name === "forbidden") {
      return `Forbidden operation: ${operationName}`;
    }

    if (errorObj?.message) {
      return `${operationName} failed: ${errorObj.message}`;
    }

    return `${operationName} failed with unknown error`;
  }

  /**
   * Handles PouchDB document conflicts by retrieving the latest revision.
   * Implements a simple conflict resolution strategy for single-user scenarios.
   *
   * @param docId Document ID that has a conflict
   * @returns Promise<any> Latest document revision
   * @throws Error if conflict cannot be resolved
   */
  protected async resolveConflict(docId: string): Promise<unknown> {
    try {
      const db = await this.getDB();
      const doc = await (db as any).get(docId, { conflicts: true });

      if (doc._conflicts) {
        console.warn(
          `Conflict detected for document ${docId}:`,
          doc._conflicts,
        );
        // For single-user scenario, we'll use the current document
        // In a multi-user scenario, this would need more sophisticated logic
      }

      return doc;
    } catch (error) {
      throw new Error(
        `Failed to resolve conflict for document ${docId}: ${error}`,
      );
    }
  }

  /**
   * Creates or ensures an index exists for efficient querying.
   * Used by repositories to optimize their specific query patterns.
   *
   * @param index PouchDB index definition
   * @param indexName Name of the index for logging
   * @returns Promise<void>
   */
  protected async ensureIndex(
    index: { fields: string[] },
    indexName: string,
  ): Promise<void> {
    try {
      const db = await this.getDB();
      await (db as any).createIndex({ index });
      console.log(`Index "${indexName}" ensured`);
    } catch (error: unknown) {
      // Index might already exist, which is okay
      if ((error as { name?: string }).name !== "conflict") {
        console.warn(`Failed to create index "${indexName}":`, error);
      }
    }
  }

  /**
   * Validates document data before database operations.
   * Should be implemented by subclasses for type-specific validation.
   *
   * @param data Document data to validate
   * @throws Error if validation fails
   */
  protected abstract validateDocument(data: Partial<T>): void;

  /**
   * Converts PouchDB document to application model.
   * Should be implemented by subclasses for type-specific conversion.
   *
   * @param doc PouchDB document
   * @returns T Application model
   */
  protected abstract convertToAppModel(doc: unknown): T;

  /**
   * Converts application model to PouchDB document.
   * Should be implemented by subclasses for type-specific conversion.
   *
   * @param model Application model
   * @returns any PouchDB document
   */
  protected abstract convertToPouchDoc(model: T): unknown;

  /**
   * Gets all documents of the repository's type.
   * Uses startkey/endkey pattern for efficient document filtering.
   *
   * @param startkey Start key for document range
   * @param endkey End key for document range
   * @returns Promise<T[]> Array of application models
   */
  protected async getAllByKeyRange(
    startkey: string,
    endkey: string,
  ): Promise<T[]> {
    return this.executeWithErrorHandling(async () => {
      const db = await this.getDB();
      const result = await (db as any).allDocs({
        include_docs: true,
        startkey,
        endkey,
      });

      return result.rows
        .filter(
          (row: { doc?: unknown; _deleted?: boolean }) =>
            row.doc && !(row.doc as { _deleted?: boolean })._deleted,
        )
        .map((row: { doc: unknown }) =>
          this.convertToAppModel(row.doc! as unknown),
        );
    }, "getAllByKeyRange");
  }

  /**
   * Gets a single document by ID.
   *
   * @param id Document ID
   * @returns Promise<T | null> Application model or null if not found
   */
  protected async getById(id: string): Promise<T | null> {
    return this.executeWithErrorHandling(async () => {
      const db = await this.getDB();
      try {
        const doc = await (db as any).get(id);
        return this.convertToAppModel(doc as unknown);
      } catch (error: unknown) {
        if ((error as { name?: string }).name === "not_found") {
          return null;
        }
        throw error;
      }
    }, "getById");
  }

  /**
   * Creates a new document.
   *
   * @param model Application model
   * @returns Promise<void>
   */
  protected async createDocument(model: T): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      this.validateDocument(model);
      const db = await this.getDB();
      const doc = this.convertToPouchDoc(model);
      await (db as any).put(doc as never);
    }, "createDocument");
  }

  /**
   * Updates an existing document.
   *
   * @param id Document ID
   * @param updates Partial updates to apply
   * @returns Promise<void>
   */
  protected async updateDocument(
    id: string,
    updates: Partial<T>,
  ): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      this.validateDocument(updates);
      const db = await this.getDB();

      // Get current document to preserve _rev
      const existingDoc = await (db as any).get(id);
      const updatedDoc = {
        ...existingDoc,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      await (db as any).put(updatedDoc);
    }, "updateDocument");
  }

  /**
   * Deletes a document.
   *
   * @param id Document ID
   * @returns Promise<void>
   */
  protected async deleteDocument(id: string): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      const db = await this.getDB();
      try {
        const doc = await (db as any).get(id);
        await (db as any).remove(doc);
      } catch (error: unknown) {
        if ((error as { name?: string }).name === "not_found") {
          // Document already doesn't exist, which is fine
          return;
        }
        throw error;
      }
    }, "deleteDocument");
  }

  /**
   * Finds documents using PouchDB's find plugin.
   * Requires appropriate indexes to be created for efficient queries.
   *
   * @param selector Query selector
   * @param sort Optional sort criteria
   * @param limit Optional result limit
   * @returns Promise<T[]> Array of matching application models
   */
  protected async findDocuments(
    selector: Record<string, unknown>,
    sort?: string[],
    limit?: number,
  ): Promise<T[]> {
    return this.executeWithErrorHandling(async () => {
      const db = await this.getDB();

      const findOptions: FindOptions = { selector };
      if (sort) findOptions.sort = sort;
      if (limit) findOptions.limit = limit;

      const result = (await (db as any).find(
        findOptions as never,
      )) as FindResult;
      return result.docs.map((doc: PouchDocument) =>
        this.convertToAppModel(doc as unknown),
      );
    }, "findDocuments");
  }

  /**
   * Gets database information for monitoring and debugging.
   *
   * @returns Promise<any> Database info
   */
  async getDatabaseInfo(): Promise<unknown> {
    return this.executeWithErrorHandling(async () => {
      const db = await this.getDB();
      return await (db as any).info();
    }, "getDatabaseInfo");
  }
}
