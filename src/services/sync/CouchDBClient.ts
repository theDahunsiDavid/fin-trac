/**
 * CouchDB Client Service for FinTrac Cross-Device Synchronization
 *
 * Provides comprehensive REST API communication with CouchDB for FinTrac's
 * bidirectional sync functionality. This client is the foundation of FinTrac's
 * cross-device data synchronization, enabling users to access their financial
 * data seamlessly across multiple devices while maintaining privacy and control.
 *
 * Why this client is essential for FinTrac:
 * - Enables cross-device sync for mobile access to financial data
 * - Maintains user privacy by syncing to user-controlled CouchDB instances
 * - Provides offline-first architecture with sync when connectivity returns
 * - Supports conflict resolution for concurrent edits across devices
 * - Ensures financial data integrity during network interruptions
 * - Enables collaborative financial tracking for families or businesses
 *
 * Key architectural features:
 * - RESTful API wrapper optimized for CouchDB document operations
 * - Automatic revision handling for CouchDB's MVCC conflict resolution
 * - Bulk operations for efficient sync of large transaction datasets
 * - Change feed support for real-time sync and conflict detection
 * - Robust error handling and retry logic for unreliable network conditions
 * - Flexible authentication support for secure remote CouchDB access
 * - Connection validation for reliable sync status reporting
 *
 * FinTrac sync integration:
 * - Bidirectional sync between local IndexedDB and remote CouchDB
 * - Transaction-safe bulk operations for atomic sync operations
 * - Conflict detection and resolution for concurrent device usage
 * - Change tracking for efficient incremental synchronization
 * - Connection health monitoring for user sync status feedback
 * - Optimistic sync with graceful degradation for network issues
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
   * Creates the CouchDB database for FinTrac sync if it doesn't exist
   *
   * Initializes the remote database required for cross-device synchronization,
   * ensuring that FinTrac users can begin syncing their financial data
   * immediately after configuration.
   *
   * Why database creation is automated:
   * - Simplifies user onboarding for sync functionality
   * - Prevents sync failures due to missing remote database
   * - Enables immediate sync capability after CouchDB configuration
   * - Reduces technical barriers for non-technical users
   * - Supports automated deployment and testing scenarios
   *
   * @returns Promise resolving to true if database created or already exists
   * @throws CouchDBError if database creation fails due to permissions or connectivity
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
   * Validates CouchDB database accessibility for FinTrac sync operations
   *
   * Verifies that the remote database is available and accessible, essential
   * for providing accurate sync status to users and preventing sync attempts
   * against unavailable or misconfigured databases.
   *
   * Why database checking is critical:
   * - Provides accurate sync status feedback to users
   * - Prevents failed sync operations that could corrupt local data
   * - Enables proactive error handling for configuration issues
   * - Supports connection troubleshooting and debugging workflows
   * - Validates user-provided CouchDB configuration before sync attempts
   *
   * @returns Promise resolving to true if database is accessible, false otherwise
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
   * Retrieves a specific document from CouchDB for sync operations
   *
   * Fetches individual transaction or category documents during sync operations,
   * essential for conflict resolution, selective sync, and incremental updates
   * in FinTrac's cross-device synchronization.
   *
   * Why individual document retrieval is necessary:
   * - Conflict resolution requires examining specific document revisions
   * - Selective sync can fetch only modified documents for efficiency
   * - Incremental updates need current document state for comparison
   * - Error recovery requires individual document validation and retry
   * - User-initiated sync can target specific transactions or categories
   *
   * @param id CouchDB document ID (transaction or category UUID)
   * @returns Promise resolving to document if found, null if not found
   * @throws CouchDBError if retrieval fails due to connectivity or permissions
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
   * Creates or updates a document in CouchDB during sync operations
   *
   * Performs individual document operations for FinTrac transactions and
   * categories, handling CouchDB's revision-based conflict detection and
   * providing the foundation for reliable cross-device synchronization.
   *
   * Why individual document operations are essential:
   * - Atomic operations ensure transaction integrity during sync
   * - Revision handling enables proper conflict detection and resolution
   * - Individual operations support selective sync and error recovery
   * - Real-time sync can immediately propagate single document changes
   * - Conflict resolution requires precise document-level operations
   *
   * @param doc Transaction or category document with CouchDB metadata
   * @returns Promise resolving to CouchDB response with new revision
   * @throws CouchDBError if operation fails due to conflicts or connectivity
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
   * Deletes a document from CouchDB during sync operations
   *
   * Handles document deletion with proper revision tracking for FinTrac's
   * cross-device sync, ensuring that transaction or category deletions
   * propagate correctly across all connected devices.
   *
   * Why controlled deletion is critical:
   * - Ensures deletion propagates to all devices in sync network
   * - Maintains audit trail through CouchDB's revision system
   * - Supports undo operations through document revision history
   * - Prevents orphaned references in related documents
   * - Enables conflict resolution for concurrent deletion scenarios
   *
   * @param id Document ID to delete (transaction or category UUID)
   * @param rev Current document revision for conflict detection
   * @returns Promise resolving to deletion confirmation
   * @throws CouchDBError if deletion fails due to conflicts or connectivity
   */
  async deleteDocument(id: string, rev: string): Promise<CouchDBResponse> {
    const response = (await this.request(
      "DELETE",
      `${this.baseUrl}/${encodeURIComponent(id)}?rev=${rev}`,
    )) as CouchDBResponse;
    return response;
  }

  /**
   * Performs bulk document operations for efficient FinTrac sync
   *
   * Handles multiple document operations atomically, essential for efficient
   * synchronization of large transaction datasets and maintaining data
   * consistency during bulk sync operations.
   *
   * Why bulk operations are crucial for FinTrac:
   * - Efficient sync of hundreds of transactions in single operation
   * - Atomic operations prevent partial sync states that could corrupt data
   * - Network efficiency reduces sync time and bandwidth usage
   * - Batch conflict resolution for concurrent edits across devices
   * - Improved user experience with faster sync completion
   *
   * @param docs Array of transaction/category documents to process
   * @param options Bulk operation configuration including conflict handling
   * @returns Promise resolving to array of operation results with conflict information
   * @throws CouchDBError if bulk operation fails
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
   * Retrieves all documents for comprehensive sync operations
   *
   * Fetches complete document sets from CouchDB for full synchronization,
   * initial sync setup, and comprehensive conflict resolution in FinTrac's
   * cross-device data management.
   *
   * Why comprehensive document retrieval is necessary:
   * - Initial sync requires complete remote dataset for comparison
   * - Full sync recovery after extended offline periods
   * - Comprehensive conflict resolution needs complete document context
   * - Data validation requires full remote dataset verification
   * - Backup and restore operations need complete document access
   *
   * @param options Query parameters for filtering, pagination, and document inclusion
   * @returns Promise resolving to paginated document listing with metadata
   * @throws CouchDBError if query fails
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
   * Retrieves CouchDB changes feed for incremental FinTrac synchronization
   *
   * Provides the foundation for efficient incremental sync by fetching only
   * documents that have changed since the last sync operation, essential for
   * real-time cross-device synchronization and bandwidth optimization.
   *
   * Why changes feed is fundamental to FinTrac sync:
   * - Incremental sync dramatically improves performance over full sync
   * - Real-time change detection enables immediate cross-device updates
   * - Bandwidth optimization critical for mobile users with limited data
   * - Change sequence tracking enables reliable sync state management
   * - Conflict detection through change history analysis
   *
   * @param options Change feed parameters including sequence tracking and filtering
   * @returns Promise resolving to changes with sequence information for sync tracking
   * @throws CouchDBError if changes retrieval fails
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
   * Retrieves CouchDB database metadata for FinTrac sync monitoring
   *
   * Provides essential database statistics and health information for
   * monitoring sync performance, troubleshooting issues, and displaying
   * sync status to FinTrac users.
   *
   * Why database metadata is essential:
   * - Sync status displays show remote database health and document counts
   * - Performance monitoring tracks sync efficiency and database growth
   * - Troubleshooting workflows need database state for issue diagnosis
   * - User interfaces display sync progress and database synchronization status
   * - Automated monitoring can detect database issues before they affect users
   *
   * @returns Promise resolving to comprehensive database metadata and statistics
   * @throws CouchDBError if database information retrieval fails
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
   * Validates CouchDB connection for FinTrac sync configuration
   *
   * Provides comprehensive connection testing essential for user onboarding,
   * troubleshooting sync issues, and maintaining reliable cross-device
   * synchronization in FinTrac.
   *
   * Why connection validation is critical:
   * - User onboarding requires immediate feedback on CouchDB configuration
   * - Sync troubleshooting needs detailed connection status information
   * - Automated monitoring can detect connectivity issues before sync failures
   * - User interface can provide accurate sync status and error messaging
   * - Configuration workflows need validation before enabling sync features
   *
   * @returns Promise resolving to connection status with detailed error information
   */
  async validateConnection(): Promise<{
    connected: boolean;
    error?: string;
    serverInfo?: {
      couchdb: string;
      version: string;
      vendor: { name: string };
    };
  }> {
    try {
      // Test basic connection to CouchDB server
      const serverInfo = (await this.request("GET", this.config.url)) as {
        couchdb: string;
        version: string;
        vendor: { name: string };
      };

      // Test database access
      await this.request("GET", this.baseUrl);

      return {
        connected: true,
        serverInfo,
      };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Gets a document with conflict information
   */
  async getDocumentWithConflicts(id: string): Promise<{
    doc: CouchDBDocument | null;
    conflicts?: string[];
  }> {
    try {
      const doc = (await this.request(
        "GET",
        `${this.baseUrl}/${encodeURIComponent(id)}?conflicts=true`,
        undefined,
        3,
        true,
      )) as CouchDBDocument & { _conflicts?: string[] };

      if (!doc) {
        return { doc: null };
      }

      const conflicts = doc._conflicts;
      delete doc._conflicts; // Remove from main doc object

      return {
        doc,
        conflicts,
      };
    } catch (error) {
      if ((error as CouchDBError).status === 404) {
        return { doc: null };
      }
      throw error;
    }
  }

  /**
   * Gets multiple documents by IDs
   */
  async getDocuments(ids: string[]): Promise<{
    docs: (CouchDBDocument | null)[];
    errors: Array<{ id: string; error: string }>;
  }> {
    const docs: (CouchDBDocument | null)[] = [];
    const errors: Array<{ id: string; error: string }> = [];

    // Use _all_docs with keys parameter for efficient bulk retrieval
    try {
      const response = (await this.request(
        "POST",
        `${this.baseUrl}/_all_docs`,
        {
          keys: ids,
          include_docs: true,
        },
      )) as {
        rows: Array<{
          id: string;
          key: string;
          value?: { rev: string };
          doc?: CouchDBDocument;
          error?: string;
        }>;
      };

      for (const row of response.rows) {
        if (row.error) {
          docs.push(null);
          errors.push({ id: row.id, error: row.error });
        } else {
          docs.push(row.doc || null);
        }
      }
    } catch (error) {
      // Fallback to individual requests if bulk operation fails
      console.warn(
        "Bulk document retrieval failed, using individual requests:",
        error,
      );
      for (const id of ids) {
        try {
          const doc = await this.getDocument(id);
          docs.push(doc);
        } catch (err) {
          docs.push(null);
          errors.push({
            id,
            error: err instanceof Error ? err.message : "Unknown error",
          });
        }
      }
    }

    return { docs, errors };
  }

  /**
   * Creates or updates multiple documents efficiently
   */
  async putDocuments(docs: CouchDBDocument[]): Promise<{
    results: CouchDBBulkResponse[];
    errors: Array<{ id: string; error: string; reason?: string }>;
  }> {
    const results = await this.bulkDocs(docs);
    const errors: Array<{ id: string; error: string; reason?: string }> = [];

    for (const result of results) {
      if (!result.ok && result.error) {
        errors.push({
          id: result.id,
          error: result.error,
          reason: result.reason,
        });
      }
    }

    return { results, errors };
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
}
