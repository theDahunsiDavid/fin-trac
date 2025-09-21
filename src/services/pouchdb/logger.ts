/**
 * Logging utility for PouchDB operations during development.
 *
 * This module provides structured logging for PouchDB operations to help with
 * debugging, performance monitoring, and development insights during Phase 2
 * implementation and beyond.
 */

export interface LogEntry {
  timestamp: string;
  level: "debug" | "info" | "warn" | "error";
  operation: string;
  repository?: string;
  duration?: number;
  data?: Record<string, unknown>;
  error?: string;
}

export interface LoggerConfig {
  enabled: boolean;
  level: "debug" | "info" | "warn" | "error";
  maxEntries: number;
  persistLogs: boolean;
}

/**
 * PouchDB operations logger with configurable levels and persistence.
 */
export class PouchDBLogger {
  private config: LoggerConfig;
  private logs: LogEntry[] = [];
  private readonly STORAGE_KEY = "pouchdb_logs";

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      enabled: true,
      level: "info",
      maxEntries: 1000,
      persistLogs: false,
      ...config,
    };

    if (this.config.persistLogs) {
      this.loadPersistedLogs();
    }
  }

  /**
   * Logs a debug message.
   * Used for detailed operation information during development.
   */
  debug(
    operation: string,
    data?: Record<string, unknown>,
    repository?: string,
  ): void {
    this.log("debug", operation, data, repository);
  }

  /**
   * Logs an info message.
   * Used for general operation information.
   */
  info(
    operation: string,
    data?: Record<string, unknown>,
    repository?: string,
  ): void {
    this.log("info", operation, data, repository);
  }

  /**
   * Logs a warning message.
   * Used for non-critical issues that should be noted.
   */
  warn(
    operation: string,
    data?: Record<string, unknown>,
    repository?: string,
  ): void {
    this.log("warn", operation, data, repository);
  }

  /**
   * Logs an error message.
   * Used for operation failures and exceptions.
   */
  error(operation: string, error: Error | string, repository?: string): void {
    const errorMessage = error instanceof Error ? error.message : error;
    this.log("error", operation, undefined, repository, errorMessage);
  }

  /**
   * Logs the start of a timed operation.
   * Returns a function to call when the operation completes.
   */
  startTimer(operation: string, repository?: string): () => void {
    const startTime = performance.now();
    this.debug(`${operation} started`, { startTime }, repository);

    return () => {
      const duration = performance.now() - startTime;
      this.info(
        `${operation} completed`,
        { duration: `${duration.toFixed(2)}ms` },
        repository,
      );
    };
  }

  /**
   * Logs database connection events.
   */
  logConnection(
    type: "local" | "remote",
    status: "connecting" | "connected" | "error",
    error?: string,
  ): void {
    const operation = `${type}_connection_${status}`;
    if (status === "error" && error) {
      this.error(operation, error);
    } else {
      this.info(operation, { type, status });
    }
  }

  /**
   * Logs CRUD operations with document counts and timing.
   */
  logCrudOperation(
    operation: "create" | "read" | "update" | "delete",
    repository: string,
    count: number = 1,
    duration?: number,
  ): void {
    this.info(
      `${operation}_operation`,
      {
        repository,
        count: count === 1 ? undefined : count,
        duration: duration ? `${duration.toFixed(2)}ms` : undefined,
      },
      repository,
    );
  }

  /**
   * Logs query operations with selector and result information.
   */
  logQuery(
    repository: string,
    selector: Record<string, unknown>,
    resultCount: number,
    duration?: number,
  ): void {
    this.info(
      "query_operation",
      {
        repository,
        selector: JSON.stringify(selector),
        resultCount,
        duration: duration ? `${duration.toFixed(2)}ms` : undefined,
      },
      repository,
    );
  }

  /**
   * Logs index creation operations.
   */
  logIndexCreation(
    indexName: string,
    fields: string[],
    repository?: string,
  ): void {
    this.info(
      "index_created",
      {
        indexName,
        fields,
      },
      repository,
    );
  }

  /**
   * Logs migration operations with progress information.
   */
  logMigration(
    operation: "start" | "progress" | "complete" | "error",
    data?: Record<string, unknown>,
    error?: string,
  ): void {
    if (operation === "error" && error) {
      this.error(`migration_${operation}`, error);
    } else {
      this.info(`migration_${operation}`, data);
    }
  }

  /**
   * Logs validation operations and results.
   */
  logValidation(
    operation: string,
    isValid: boolean,
    differences?: string[],
    duration?: number,
  ): void {
    this.info(`validation_${operation}`, {
      isValid,
      differenceCount: differences?.length || 0,
      duration: duration ? `${duration.toFixed(2)}ms` : undefined,
    });

    if (!isValid && differences) {
      this.warn("validation_differences", { differences });
    }
  }

  /**
   * Logs performance metrics for operations.
   */
  logPerformance(operation: string, metrics: Record<string, number>): void {
    const formattedMetrics = Object.fromEntries(
      Object.entries(metrics).map(([key, value]) => [
        key,
        `${value.toFixed(2)}ms`,
      ]),
    );

    this.info(`performance_${operation}`, formattedMetrics);
  }

  /**
   * Gets all logs or logs filtered by criteria.
   */
  getLogs(filter?: {
    level?: LogEntry["level"];
    operation?: string;
    repository?: string;
    since?: Date;
  }): LogEntry[] {
    let filteredLogs = [...this.logs];

    if (filter) {
      if (filter.level) {
        const levelOrder = ["debug", "info", "warn", "error"];
        const minLevelIndex = levelOrder.indexOf(filter.level);
        filteredLogs = filteredLogs.filter(
          (log) => levelOrder.indexOf(log.level) >= minLevelIndex,
        );
      }

      if (filter.operation) {
        filteredLogs = filteredLogs.filter((log) =>
          log.operation.includes(filter.operation!),
        );
      }

      if (filter.repository) {
        filteredLogs = filteredLogs.filter(
          (log) => log.repository === filter.repository,
        );
      }

      if (filter.since) {
        filteredLogs = filteredLogs.filter(
          (log) => new Date(log.timestamp) >= filter.since!,
        );
      }
    }

    return filteredLogs;
  }

  /**
   * Clears all logs.
   */
  clearLogs(): void {
    this.logs = [];
    if (this.config.persistLogs) {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  /**
   * Exports logs as JSON string.
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Gets logging statistics.
   */
  getStats(): {
    totalLogs: number;
    logsByLevel: Record<string, number>;
    logsByRepository: Record<string, number>;
    timeRange: { start?: string; end?: string };
  } {
    const logsByLevel = this.logs.reduce(
      (acc, log) => {
        acc[log.level] = (acc[log.level] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const logsByRepository = this.logs.reduce(
      (acc, log) => {
        if (log.repository) {
          acc[log.repository] = (acc[log.repository] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>,
    );

    const timestamps = this.logs.map((log) => log.timestamp).sort();

    return {
      totalLogs: this.logs.length,
      logsByLevel,
      logsByRepository,
      timeRange: {
        start: timestamps[0],
        end: timestamps[timestamps.length - 1],
      },
    };
  }

  /**
   * Updates logger configuration.
   */
  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Core logging method that handles all log entries.
   */
  private log(
    level: LogEntry["level"],
    operation: string,
    data?: Record<string, unknown>,
    repository?: string,
    error?: string,
  ): void {
    if (!this.config.enabled) return;

    // Check if this level should be logged
    const levelOrder = ["debug", "info", "warn", "error"];
    if (levelOrder.indexOf(level) < levelOrder.indexOf(this.config.level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      operation,
      repository,
      data: data
        ? (this.sanitizeData(data) as Record<string, unknown>)
        : undefined,
      error,
    };

    this.logs.push(entry);

    // Maintain max entries limit
    if (this.logs.length > this.config.maxEntries) {
      this.logs = this.logs.slice(-this.config.maxEntries);
    }

    // Console output for development
    this.logToConsole(entry);

    // Persist if enabled
    if (this.config.persistLogs) {
      this.persistLogs();
    }
  }

  /**
   * Outputs log entry to browser console with appropriate styling.
   */
  private logToConsole(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const prefix = `[PouchDB ${timestamp}]`;
    const repository = entry.repository ? ` [${entry.repository}]` : "";
    const message = `${prefix}${repository} ${entry.operation}`;

    const styles = {
      debug: "color: #666",
      info: "color: #0066cc",
      warn: "color: #ff8800",
      error: "color: #cc0000; font-weight: bold",
    };

    switch (entry.level) {
      case "debug":
        console.debug(`%c${message}`, styles.debug, entry.data);
        break;
      case "info":
        console.info(`%c${message}`, styles.info, entry.data);
        break;
      case "warn":
        console.warn(`%c${message}`, styles.warn, entry.data, entry.error);
        break;
      case "error":
        console.error(`%c${message}`, styles.error, entry.error, entry.data);
        break;
    }
  }

  /**
   * Sanitizes data for logging to prevent circular references and large objects.
   */
  private sanitizeData(data: unknown): unknown {
    if (data === null || data === undefined) return data;
    if (
      typeof data === "string" ||
      typeof data === "number" ||
      typeof data === "boolean"
    ) {
      return data;
    }

    try {
      // For objects, limit depth and size
      return JSON.parse(JSON.stringify(data, null, 0));
    } catch {
      return "[Circular or Non-serializable Object]";
    }
  }

  /**
   * Loads persisted logs from localStorage.
   */
  private loadPersistedLogs(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (error) {
      console.warn("Failed to load persisted logs:", error);
    }
  }

  /**
   * Persists current logs to localStorage.
   */
  private persistLogs(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.logs));
    } catch (error) {
      console.warn("Failed to persist logs:", error);
    }
  }
}

// Default logger instance
export const pouchDBLogger = new PouchDBLogger({
  enabled: process.env.NODE_ENV === "development",
  level: "info",
  maxEntries: 500,
  persistLogs: false,
});

// Utility functions for common logging patterns
export const logOperation = (operation: string, repository?: string) => {
  return pouchDBLogger.startTimer(operation, repository);
};

export const logError = (
  operation: string,
  error: Error | string,
  repository?: string,
) => {
  pouchDBLogger.error(operation, error, repository);
};

export const logInfo = (
  operation: string,
  data?: Record<string, unknown>,
  repository?: string,
) => {
  pouchDBLogger.info(operation, data, repository);
};
