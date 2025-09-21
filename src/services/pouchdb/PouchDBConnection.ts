import { createLocalDB, createRemoteDB, type Database } from "./config";

/**
 * PouchDB connection manager for handling local and remote database connections.
 *
 * This class provides a centralized way to manage PouchDB database connections,
 * including error handling, retry logic, and connection state management.
 * It abstracts the complexity of PouchDB connection management from repositories.
 */
export class PouchDBConnection {
  private localDB: Database | null = null;
  private remoteDB: Database | null = null;
  private connectionState:
    | "disconnected"
    | "connecting"
    | "connected"
    | "error" = "disconnected";

  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second

  /**
   * Gets the local PouchDB database instance.
   * Creates a new connection if one doesn't exist.
   *
   * @returns Promise<Database> Local database instance
   * @throws Error if connection fails after retries
   */
  async getLocalDB(): Promise<Database> {
    if (this.localDB) {
      return this.localDB;
    }

    return this.connectWithRetry(async () => {
      this.localDB = createLocalDB();
      console.log("PouchDB local connection established");
      return this.localDB;
    }, "local");
  }

  /**
   * Gets the remote CouchDB database instance.
   * Creates a new connection if one doesn't exist.
   *
   * @returns Promise<Database> Remote database instance
   * @throws Error if connection fails after retries
   */
  async getRemoteDB(): Promise<Database> {
    if (this.remoteDB) {
      return this.remoteDB;
    }

    return this.connectWithRetry(async () => {
      this.remoteDB = createRemoteDB();
      console.log("PouchDB remote connection established");
      return this.remoteDB;
    }, "remote");
  }

  /**
   * Generic connection method with retry logic.
   *
   * @param connectionFn Function that establishes the connection
   * @param type Connection type for logging
   * @returns Promise<Database> Database instance
   */
  private async connectWithRetry<T>(
    connectionFn: () => Promise<T>,
    type: "local" | "remote",
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        this.connectionState = "connecting";
        const result = await connectionFn();
        this.connectionState = "connected";
        return result;
      } catch (error) {
        lastError = error as Error;
        this.connectionState = "error";

        console.warn(
          `PouchDB ${type} connection attempt ${attempt} failed:`,
          error,
        );

        if (attempt < this.maxRetries) {
          console.log(`Retrying in ${this.retryDelay}ms...`);
          await this.delay(this.retryDelay * attempt); // Exponential backoff
        }
      }
    }

    this.connectionState = "error";
    throw new Error(
      `Failed to establish ${type} PouchDB connection after ${this.maxRetries} attempts: ${lastError?.message}`,
    );
  }

  /**
   * Closes all database connections.
   * Useful for cleanup and testing.
   */
  async disconnect(): Promise<void> {
    try {
      if (this.localDB) {
        await this.localDB.close();
        this.localDB = null;
      }

      if (this.remoteDB) {
        await this.remoteDB.close();
        this.remoteDB = null;
      }

      this.connectionState = "disconnected";
      console.log("PouchDB connections closed");
    } catch (error) {
      console.error("Error closing PouchDB connections:", error);
      throw error;
    }
  }

  /**
   * Gets the current connection state.
   *
   * @returns Connection state
   */
  getConnectionState(): string {
    return this.connectionState;
  }

  /**
   * Checks if local database is connected.
   *
   * @returns boolean True if local DB is connected
   */
  isLocalConnected(): boolean {
    return this.localDB !== null && this.connectionState === "connected";
  }

  /**
   * Checks if remote database is connected.
   *
   * @returns boolean True if remote DB is connected
   */
  isRemoteConnected(): boolean {
    return this.remoteDB !== null && this.connectionState === "connected";
  }

  /**
   * Tests the local database connection by performing a simple operation.
   *
   * @returns Promise<boolean> True if connection is healthy
   */
  async testLocalConnection(): Promise<boolean> {
    try {
      const db = await this.getLocalDB();
      await db.info();
      return true;
    } catch (error) {
      console.error("Local PouchDB connection test failed:", error);
      return false;
    }
  }

  /**
   * Tests the remote database connection by performing a simple operation.
   *
   * @returns Promise<boolean> True if connection is healthy
   */
  async testRemoteConnection(): Promise<boolean> {
    try {
      const db = await this.getRemoteDB();
      await db.info();
      return true;
    } catch (error) {
      console.error("Remote PouchDB connection test failed:", error);
      return false;
    }
  }

  /**
   * Helper method to create a delay for retry logic.
   *
   * @param ms Milliseconds to delay
   * @returns Promise that resolves after the delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Force reconnection by clearing existing connections.
   * Useful for handling connection errors or timeouts.
   */
  async reconnect(): Promise<void> {
    console.log("Force reconnecting PouchDB...");
    this.localDB = null;
    this.remoteDB = null;
    this.connectionState = "disconnected";
  }
}

// Singleton instance for global use
export const pouchDBConnection = new PouchDBConnection();
