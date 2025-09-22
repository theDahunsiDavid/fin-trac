/**
 * Sync Configuration Service
 *
 * Manages configuration for bidirectional CouchDB synchronization including
 * environment variables, default settings, and configuration validation.
 *
 * This service provides a centralized way to configure the sync functionality
 * with proper defaults and environment variable support for both upload and
 * download sync operations.
 */

import type { SyncConfig } from "./SyncService";

export interface SyncEnvironmentConfig {
  VITE_COUCHDB_URL?: string;
  VITE_COUCHDB_DATABASE?: string;
  VITE_COUCHDB_USERNAME?: string;
  VITE_COUCHDB_PASSWORD?: string;
  VITE_SYNC_ENABLED?: string;
  VITE_SYNC_INTERVAL?: string;
  VITE_SYNC_BATCH_SIZE?: string;
  VITE_SYNC_AUTO_START?: string;
  VITE_SYNC_BIDIRECTIONAL?: string;
  VITE_SYNC_DOWNLOAD_ONLY?: string;
  VITE_SYNC_UPLOAD_ONLY?: string;
  VITE_SYNC_CONFLICT_RESOLUTION?: string;
}

export class SyncConfigService {
  private static instance: SyncConfigService;
  private config: SyncConfig | null = null;

  private constructor() {
    this.loadConfig();
  }

  static getInstance(): SyncConfigService {
    if (!SyncConfigService.instance) {
      SyncConfigService.instance = new SyncConfigService();
    }
    return SyncConfigService.instance;
  }

  /**
   * Loads configuration from environment variables and defaults
   */
  private loadConfig(): void {
    const env = import.meta.env as SyncEnvironmentConfig;

    // Check if sync is enabled
    const syncEnabled = env.VITE_SYNC_ENABLED?.toLowerCase() === "true";
    if (!syncEnabled) {
      console.log("Sync is disabled via VITE_SYNC_ENABLED");
      return;
    }

    // Required configuration
    const url = env.VITE_COUCHDB_URL || "http://localhost:5984";
    const database = env.VITE_COUCHDB_DATABASE || "fintrac";

    // Optional configuration
    const username = env.VITE_COUCHDB_USERNAME;
    const password = env.VITE_COUCHDB_PASSWORD;
    const syncInterval = parseInt(env.VITE_SYNC_INTERVAL || "30000", 10);
    const batchSize = parseInt(env.VITE_SYNC_BATCH_SIZE || "50", 10);

    // Bidirectional sync settings
    const bidirectional =
      env.VITE_SYNC_BIDIRECTIONAL?.toLowerCase() !== "false"; // Default true
    const downloadOnly = env.VITE_SYNC_DOWNLOAD_ONLY?.toLowerCase() === "true";
    const uploadOnly = env.VITE_SYNC_UPLOAD_ONLY?.toLowerCase() === "true";
    const conflictResolution =
      env.VITE_SYNC_CONFLICT_RESOLUTION || "remote-wins";

    this.config = {
      url,
      database,
      username,
      password,
      syncInterval,
      batchSize,
      retryAttempts: 3,
      retryDelay: 1000,
      timeout: 10000,
      bidirectional: !downloadOnly && !uploadOnly ? bidirectional : false,
      downloadOnly,
      uploadOnly,
      conflictResolution: conflictResolution as
        | "remote-wins"
        | "local-wins"
        | "manual",
    };

    console.log("Sync configuration loaded:", {
      url,
      database,
      hasCredentials: !!(username && password),
      syncInterval,
      batchSize,
      bidirectional: this.config.bidirectional,
      downloadOnly: this.config.downloadOnly,
      uploadOnly: this.config.uploadOnly,
      conflictResolution: this.config.conflictResolution,
    });
  }

  /**
   * Gets the current sync configuration
   */
  getConfig(): SyncConfig | null {
    return this.config;
  }

  /**
   * Checks if sync is configured and enabled
   */
  isSyncEnabled(): boolean {
    return this.config !== null;
  }

  /**
   * Gets auto-start preference from environment
   */
  shouldAutoStart(): boolean {
    const env = import.meta.env as SyncEnvironmentConfig;
    return env.VITE_SYNC_AUTO_START?.toLowerCase() === "true";
  }

  /**
   * Validates the current configuration
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config) {
      errors.push("Sync is not enabled or configured");
      return { valid: false, errors };
    }

    // Validate URL
    try {
      new URL(this.config.url);
    } catch {
      errors.push("Invalid CouchDB URL");
    }

    // Validate database name
    if (
      !this.config.database ||
      !/^[a-z][a-z0-9_$()+/-]*$/.test(this.config.database)
    ) {
      errors.push(
        "Invalid database name (must be lowercase, start with letter, contain only a-z, 0-9, _, $, (, ), +, /, -)",
      );
    }

    // Validate credentials (both or neither)
    if (
      (this.config.username && !this.config.password) ||
      (!this.config.username && this.config.password)
    ) {
      errors.push(
        "Both username and password must be provided for authentication",
      );
    }

    // Validate numeric values
    if (
      this.config.syncInterval &&
      (this.config.syncInterval < 1000 || this.config.syncInterval > 3600000)
    ) {
      errors.push("Sync interval must be between 1 second and 1 hour");
    }

    if (
      this.config.batchSize &&
      (this.config.batchSize < 1 || this.config.batchSize > 1000)
    ) {
      errors.push("Batch size must be between 1 and 1000");
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Updates configuration (useful for runtime changes)
   */
  updateConfig(updates: Partial<SyncConfig>): void {
    if (this.config) {
      this.config = { ...this.config, ...updates };
    }
  }

  /**
   * Gets default configuration for development
   */
  static getDefaultDevConfig(): SyncConfig {
    return {
      url: "http://localhost:5984",
      database: "fintrac",
      syncInterval: 30000, // 30 seconds
      batchSize: 50,
      retryAttempts: 3,
      retryDelay: 1000,
      timeout: 10000,
      bidirectional: true,
      downloadOnly: false,
      uploadOnly: false,
      conflictResolution: "remote-wins",
    };
  }

  /**
   * Gets example environment variables for documentation
   */
  static getExampleEnvVars(): Record<string, string> {
    return {
      VITE_SYNC_ENABLED: "true",
      VITE_COUCHDB_URL: "http://localhost:5984",
      VITE_COUCHDB_DATABASE: "fintrac",
      VITE_COUCHDB_USERNAME: "admin",
      VITE_COUCHDB_PASSWORD: "password",
      VITE_SYNC_INTERVAL: "30000",
      VITE_SYNC_BATCH_SIZE: "50",
      VITE_SYNC_AUTO_START: "false",
      VITE_SYNC_BIDIRECTIONAL: "true",
      VITE_SYNC_DOWNLOAD_ONLY: "false",
      VITE_SYNC_UPLOAD_ONLY: "false",
      VITE_SYNC_CONFLICT_RESOLUTION: "remote-wins",
    };
  }
}

export const syncConfig = SyncConfigService.getInstance();
