/**
 * CouchDB Client Service
 *
 * Provides REST API communication with CouchDB for the FinTrac sync functionality.
 * This client handles all HTTP operations including document CRUD, bulk operations,
 * and change feeds for synchronization.
 *
 * Key features:
 * - RESTful API wrapper for CouchDB operations
 * - Automatic revision handling for CouchDB's MVCC
 * - Bulk operations for efficient sync
 * - Change feed support for real-time sync
 * - Error handling and retry logic
 * - Authentication support
 */

export interface CouchDBConfig {
  url: string;
  database: string;
  username?: string;
  password?: string;
  timeout?: number;
}

export interface CouchDBDocument {
  _id: string;
  _rev?: string;
  [key: string]: unknown;
}

export interface CouchDBResponse {
  ok: boolean;
  id: string;
  rev: string;
}

export interface CouchDBBulkResponse {
  ok: boolean;
  id: string;
  rev: string;
  error?: string;
  reason?: string;
}

export interface CouchDBChangesFeedResponse {
  results: Array<{
    seq: string;
    id: string;
    changes: Array<{ rev: string }>;
    doc?: CouchDBDocument;
    deleted?: boolean;
  }>;
  last_seq: string;
  pending: number;
}

export interface CouchDBError extends Error {
  status?: number;
  error?: string;
  reason?: string;
}

export class CouchDBClient {
  private config: CouchDBConfig;
  private baseUrl: string;
  private authHeader?: string;

  constructor(config: CouchDBConfig) {
    this.config = {
      timeout: 10000,
      ...config,
    };

    this.baseUrl = `${this.config.url}/${this.config.database}`;

    if (this.config.username && this.config.password) {
      const credentials = btoa(
        `${this.config.username}:${this.config.password}`,
      );
      this.authHeader = `Basic ${credentials}`;
    }
  }

  /**
   * Creates the database if it doesn't exist
   */
  async createDatabase(): Promise<boolean> {
    try {
      const response = (await this.request(
        "PUT",
        this.config.url + "/" + this.config.database,
      )) as { ok: boolean };
      return response.ok;
    } catch (error) {
      // Database might already exist (412) or file already exists (409)
      if (
        (error as CouchDBError).status === 412 ||
        (error as CouchDBError).status === 409
      ) {
        console.log(`Database '${this.config.database}' already exists`);
        return true; // Database already exists
      }
      throw error;
    }
  }

  /**
   * Checks if the database exists and is accessible
   */
  async checkDatabase(): Promise<boolean> {
    try {
      await this.request("GET", this.baseUrl);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Gets a document by ID
   */
  async getDocument(id: string): Promise<CouchDBDocument | null> {
    try {
      const doc = (await this.request(
        "GET",
        `${this.baseUrl}/${encodeURIComponent(id)}`,
        undefined,
        3,
        true, // Suppress expected 404 errors
      )) as CouchDBDocument;
      return doc;
    } catch (error) {
      if ((error as CouchDBError).status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Creates or updates a document
   */
  async putDocument(doc: CouchDBDocument): Promise<CouchDBResponse> {
    const response = (await this.request(
      "PUT",
      `${this.baseUrl}/${encodeURIComponent(doc._id)}`,
      doc,
    )) as CouchDBResponse;
    return response;
  }

  /**
   * Deletes a document
   */
  async deleteDocument(id: string, rev: string): Promise<CouchDBResponse> {
    const response = (await this.request(
      "DELETE",
      `${this.baseUrl}/${encodeURIComponent(id)}?rev=${rev}`,
    )) as CouchDBResponse;
    return response;
  }

  /**
   * Performs bulk operations (create, update, delete multiple documents)
   */
  async bulkDocs(
    docs: CouchDBDocument[],
    options?: { all_or_nothing?: boolean },
  ): Promise<CouchDBBulkResponse[]> {
    const payload = {
      docs,
      ...options,
    };

    const response = (await this.request(
      "POST",
      `${this.baseUrl}/_bulk_docs`,
      payload,
    )) as CouchDBBulkResponse[];
    return response;
  }

  /**
   * Gets all documents with optional query parameters
   */
  async allDocs(options?: {
    include_docs?: boolean;
    startkey?: string;
    endkey?: string;
    limit?: number;
    skip?: number;
    descending?: boolean;
  }): Promise<{
    total_rows: number;
    offset: number;
    rows: Array<{
      id: string;
      key: string;
      value: { rev: string };
      doc?: CouchDBDocument;
    }>;
  }> {
    const params = new URLSearchParams();

    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(
            key,
            typeof value === "boolean" ? value.toString() : String(value),
          );
        }
      });
    }

    const url = params.toString()
      ? `${this.baseUrl}/_all_docs?${params}`
      : `${this.baseUrl}/_all_docs`;
    return (await this.request("GET", url)) as {
      total_rows: number;
      offset: number;
      rows: Array<{
        id: string;
        key: string;
        value: { rev: string };
        doc?: CouchDBDocument;
      }>;
    };
  }

  /**
   * Gets changes feed for synchronization
   */
  async getChanges(options?: {
    since?: string;
    limit?: number;
    include_docs?: boolean;
    filter?: string;
    descending?: boolean;
  }): Promise<CouchDBChangesFeedResponse> {
    const params = new URLSearchParams();

    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(
            key,
            typeof value === "boolean" ? value.toString() : String(value),
          );
        }
      });
    }

    const url = params.toString()
      ? `${this.baseUrl}/_changes?${params}`
      : `${this.baseUrl}/_changes`;
    return (await this.request("GET", url)) as CouchDBChangesFeedResponse;
  }

  /**
   * Gets database information
   */
  async getInfo(): Promise<{
    db_name: string;
    doc_count: number;
    doc_del_count: number;
    update_seq: string;
    purge_seq: number;
    compact_running: boolean;
    disk_size: number;
    data_size: number;
    instance_start_time: string;
  }> {
    return (await this.request("GET", this.baseUrl)) as {
      db_name: string;
      doc_count: number;
      doc_del_count: number;
      update_seq: string;
      purge_seq: number;
      compact_running: boolean;
      disk_size: number;
      data_size: number;
      instance_start_time: string;
    };
  }

  /**
   * Generic HTTP request method with error handling and retries
   */
  private async request(
    method: string,
    url: string,
    body?: unknown,
    retries = 3,
    suppressExpected404 = false,
  ): Promise<unknown> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    if (this.authHeader) {
      headers["Authorization"] = this.authHeader;
    }

    const requestOptions: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(this.config.timeout!),
    };

    if (body && (method === "POST" || method === "PUT")) {
      requestOptions.body = JSON.stringify(body);
    }

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, requestOptions);

        if (!response.ok) {
          const errorBody = await response.text();
          let errorData;

          try {
            errorData = JSON.parse(errorBody);
          } catch {
            errorData = { error: "unknown", reason: errorBody };
          }

          const error = new Error(
            `CouchDB request failed: ${errorData.reason || errorData.error}`,
          ) as CouchDBError;
          error.status = response.status;
          error.error = errorData.error;
          error.reason = errorData.reason;

          // Suppress expected 404 errors from console output
          if (response.status === 404 && suppressExpected404) {
            // Create a silent error for expected 404s
            const suppressedError = new Error() as CouchDBError;
            suppressedError.status = response.status;
            suppressedError.error = errorData.error;
            suppressedError.reason = errorData.reason;
            suppressedError.message = `Document not found: ${errorData.reason || errorData.error}`;
            throw suppressedError;
          }

          // Don't retry on client errors (4xx), only server errors (5xx) and network issues
          if (response.status >= 400 && response.status < 500) {
            throw error;
          }

          if (attempt === retries) {
            throw error;
          }

          // Exponential backoff for retries
          await this.delay(Math.pow(2, attempt) * 1000);
          continue;
        }

        const responseText = await response.text();

        // Handle empty responses
        if (!responseText) {
          return { ok: true };
        }

        try {
          return JSON.parse(responseText);
        } catch {
          return responseText;
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          const timeoutError = new Error(
            "CouchDB request timeout",
          ) as CouchDBError;
          timeoutError.status = 408;
          throw timeoutError;
        }

        if (attempt === retries) {
          throw error;
        }

        // Exponential backoff for network errors
        await this.delay(Math.pow(2, attempt) * 1000);
      }
    }
  }

  /**
   * Helper method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Validates the CouchDB connection and configuration
   */
  async validateConnection(): Promise<{
    connected: boolean;
    error?: string;
    version?: string;
  }> {
    try {
      // Test connection to CouchDB root
      const rootInfo = (await this.request("GET", this.config.url)) as {
        version: string;
      };

      // Test database access
      await this.checkDatabase();

      return {
        connected: true,
        version: rootInfo.version,
      };
    } catch (error) {
      return {
        connected: false,
        error: (error as Error).message,
      };
    }
  }
}
