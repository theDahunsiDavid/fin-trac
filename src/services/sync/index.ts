/**
 * Sync Services Export
 *
 * Centralized exports for all sync-related services and types.
 * This module provides a clean API for importing sync functionality
 * throughout the FinTrac application.
 */

export { CouchDBClient } from './CouchDBClient';
export type {
  CouchDBConfig,
  CouchDBDocument,
  CouchDBResponse,
  CouchDBBulkResponse,
  CouchDBChangesFeedResponse,
  CouchDBError,
} from './CouchDBClient';

export { SyncService } from './SyncService';
export type {
  SyncConfig,
  SyncStatus,
  SyncResult,
  SyncMetadata,
} from './SyncService';

export { SyncConfigService, syncConfig } from './SyncConfig';
export type {
  SyncEnvironmentConfig,
} from './SyncConfig';
