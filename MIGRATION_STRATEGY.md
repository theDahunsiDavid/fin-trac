# Migration Strategy: Dexie to PouchDB + CouchDB Sync

## Overview
This document outlines the migration strategy from the current Dexie.js + IndexedDB implementation to PouchDB + CouchDB bidirectional sync architecture for FinTrac. This is simplified for single-developer scale with no real users and disposable dummy data.

## Current Codebase Analysis

### Existing Structure
- **Database**: `FinTracDB` class in `src/services/db/db.ts` extends Dexie with transactions and categories tables
- **Repository**: `TransactionRepository` in `src/services/repos/TransactionRepository.ts` with comprehensive CRUD operations
- **Hooks**: 
  - `useTransactions` in `src/features/transactions/hooks/useTransactions.ts` (main data hook)
  - `useCategories` in `src/hooks/useCategories.ts` (placeholder, not implemented)
  - `useDashboardData` in `src/features/dashboard/hooks/useDashboardData.ts` (depends on useTransactions)
- **Components**:
  - `TransactionForm` receives `addTransaction` prop (no direct hook usage)
  - `DashboardChart` receives `transactions` and `balance` props (no direct hook usage)
  - `App.tsx` is the single source of truth, using `useTransactions` hook

### Current Dependencies
- `dexie: ^4.2.0`
- No PouchDB dependencies yet

## Migration Phases

### Phase 1: Foundation & Setup (Estimated: 3-5 days)

#### Environment Setup
[ ] Verify current project structure matches expected layout (src/services/db/, src/services/repos/, etc.)
[ ] Install system dependencies on Arch Linux: `sudo pacman -S curl docker` (if using Docker)
[ ] Alternative CouchDB setup options: native install `sudo pacman -S couchdb` or pouchdb-server `npm install -g pouchdb-server`
[ ] Install latest PouchDB dependencies (`pouchdb-browser@^8.0.1`, `pouchdb-find@^8.0.1`, `@types/pouchdb@^6.4.0`)
[ ] Install PouchDB HTTP adapter (`pouchdb-adapter-http@^8.0.1`)
[ ] Set up local CouchDB 3.3+ instance for development (Docker recommended: `docker run -e COUCHDB_USER=admin -e COUCHDB_PASSWORD=password -p 5984:5984 couchdb:latest`)
[ ] Configure CORS settings on CouchDB for browser access using `add-cors-to-couchdb` tool: `npm install -g add-cors-to-couchdb && add-cors-to-couchdb`
[ ] Create development database in CouchDB
[ ] Test basic PouchDB connection to local CouchDB instance
[ ] Test current Dexie implementation works before migration
[ ] Create backup of current dummy data for validation testing

#### Project Structure Updates
[ ] Create `src/services/pouchdb/` directory
[ ] Create `src/services/pouchdb/config.ts` for PouchDB configuration
[ ] Create `src/services/pouchdb/schema.ts` for document schemas
[ ] Update `.gitignore` to exclude local CouchDB data files
[ ] Document new directory structure in README

#### Schema Design
[ ] Convert existing `Transaction` interface to PouchDB document structure (add `_id`, `_rev` fields for CouchDB sync compatibility)
[ ] Convert existing `Category` interface to PouchDB document structure (add `_id`, `_rev` fields)
[ ] Create `PouchTransaction` and `PouchCategory` TypeScript interfaces extending base types
[ ] Define document ID generation strategy (maintain UUID from current implementation, prefix with doc type: `transaction_${uuid}`, `category_${uuid}`)
[ ] Create validation schemas matching current transaction validation
[ ] Plan basic document structure with `_id` and `_rev` fields for CouchDB compatibility
[ ] Note: Authentication can be added later when multi-user features are needed

### Phase 2: PouchDB Implementation (Estimated: 1 week)

#### PouchDB Service Layer
[ ] Create `src/services/pouchdb/PouchDBConfig.ts` with database initialization using `pouchdb-browser` preset
[ ] Create `src/services/pouchdb/PouchDBConnection.ts` with connection management and IndexedDB adapter setup
[ ] Create `src/services/pouchdb/BasePouchRepository.ts` abstract class with common CRUD operations
[ ] Implement error handling wrapper for PouchDB operations with proper conflict resolution
[ ] Add retry logic for failed database operations and network issues
[ ] Configure PouchDB with IndexedDB adapter: `import PouchDB from 'pouchdb-browser'` (includes IndexedDB by default)
[ ] Verify IndexedDB adapter compatibility: IndexedDB is included in pouchdb-browser preset
[ ] Create data validation utilities to compare Dexie vs PouchDB results
[ ] Implement data migration utility to transfer existing IndexedDB data to PouchDB format
[ ] Add comprehensive logging for PouchDB operations during development
[ ] Test PouchDB IndexedDB storage size and performance vs Dexie baseline

#### PouchDB Transaction Repository
[ ] Create `src/services/repos/PouchTransactionRepository.ts` implementing same interface as current `TransactionRepository`
[ ] Implement `getAll()` method matching current signature
[ ] Implement `create()` method with same validation and ID generation
[ ] Implement `update()` method matching current signature
[ ] Implement `delete()` method matching current signature
[ ] Implement `getTransactionsByDateRange()` method matching current signature
[ ] Implement `getTransactionsByType()` method matching current signature
[ ] Implement `getTransactionsByCategory()` method matching current signature
[ ] Implement `getRecentTransactions()` method matching current signature
[ ] Add PouchDB indexing for date, type, and category fields

#### PouchDB Category Repository
[ ] Create `src/services/repos/PouchCategoryRepository.ts` with same interface as planned `CategoryRepository`
[ ] Implement basic CRUD operations for categories
[ ] Add validation for category color and name uniqueness

### Phase 3: Repository Interface & Migration (Estimated: 1 week)

#### Repository Abstraction Layer
[ ] Create `src/services/repos/ITransactionRepository.ts` interface matching current `TransactionRepository` methods
[ ] Create `src/services/repos/ICategoryRepository.ts` interface for future category operations
[ ] Update existing `TransactionRepository.ts` to implement `ITransactionRepository`
[ ] Create `src/services/repos/RepositoryFactory.ts` for switching between Dexie and PouchDB implementations
[ ] Add environment variable `VITE_USE_POUCHDB=true/false` for easy switching

#### Hook Updates (Minimal Changes Required)
[ ] Update `useTransactions` hook to use repository factory instead of direct `TransactionRepository` instantiation
[ ] Update `useCategories` hook to use new `ICategoryRepository` when ready
[ ] Keep `useDashboardData` unchanged (it only depends on `useTransactions`)
[ ] Add loading states for PouchDB operations
[ ] Add offline status detection in hooks

#### Component Updates (No Changes Required)
[ ] Verify `TransactionForm` still works with new repository (should work unchanged)
[ ] Verify `DashboardChart` still works with new repository (should work unchanged)
[ ] Verify `App.tsx` still works with updated `useTransactions` hook (should work unchanged)
[ ] Add sync status indicators to UI components

#### Testing & Validation
[ ] Create integration tests comparing Dexie vs PouchDB repository outputs
[ ] Test all existing CRUD operations work correctly with PouchDB repository
[ ] Run existing test suites: `TransactionRepository.test.ts`, `useCategories.test.tsx`, `useDashboardData.test.tsx`, `TransactionForm.test.tsx`, `DashboardChart.test.tsx`
[ ] Test error handling and edge cases
[ ] Test offline functionality
[ ] Implement data consistency validation between old and new repositories
[ ] Test all existing transaction operations with both repositories in parallel
[ ] Verify memory usage and performance metrics for both implementations

### Phase 3.5: Migration Verification (Estimated: 2-3 days)

[ ] Run comprehensive data consistency tests between Dexie and PouchDB
[ ] Validate all transaction CRUD operations produce identical results
[ ] Test error handling and edge cases with both implementations
[ ] Verify UI components work identically with both data sources
[ ] Benchmark performance differences and document findings
[ ] Test offline functionality and data persistence
[ ] Validate all existing test suites pass with PouchDB repository

### Phase 4: Sync Implementation (Estimated: 1 week)

#### Basic CouchDB Server Setup
[ ] Test CouchDB connection from Arch Linux environment specifically
[ ] Set up CouchDB 3.3+ instance using Docker: `docker run -e COUCHDB_USER=admin -e COUCHDB_PASSWORD=password -e COUCHDB_CORS_ENABLE=true -p 5984:5984 couchdb:latest`
[ ] Configure CORS for browser access: `[chttpd] enable_cors = true` and `[cors] origins = http://localhost:5173, credentials = true, headers = accept, authorization, content-type, origin, referer, methods = GET,PUT,POST,HEAD,DELETE`
[ ] Create single development database (no user isolation needed)
[ ] Verify CouchDB installation: `curl http://admin:password@localhost:5984` should return `{"couchdb":"Welcome","version":"3.3.x"}`
[ ] Test CORS functionality from browser environment

#### Sync Implementation
[ ] Add sync functionality using `PouchDB.sync()` method with live replication: `db.sync(remoteUrl, {live: true, retry: true})`
[ ] Implement bidirectional sync with CouchDB using replication protocol
[ ] Add sync conflict detection and resolution following CouchDB's document versioning with `_rev` markers
[ ] Add sync status tracking and reporting with event listeners: `'change'`, `'paused'`, `'active'`, `'denied'`, `'complete'`, `'error'`
[ ] Implement sync retry logic for failed operations with exponential backoff
[ ] Create sync scheduling system (immediate, periodic, manual) with proper error handling
[ ] Add sync progress indicators to existing UI showing sync state and conflict resolution
[ ] Implement sync status persistence across browser sessions
[ ] Add network connectivity detection and graceful offline handling
[ ] Test sync behavior with large transaction datasets (100+ transactions)
[ ] Implement sync batching for better performance with large datasets
[ ] Add sync metrics and monitoring for development debugging

#### Conflict Resolution
[ ] Implement simple "last write wins" conflict resolution for single-user scenario
[ ] Document conflict resolution strategy for future multi-user implementation

### Phase 5: Cleanup & Deployment (Estimated: 2-3 days)

#### Data Cleanup
[ ] Remove Dexie dependency from `package.json` (`dexie: ^4.2.0`)
[ ] Remove `src/services/db/db.ts` (FinTracDB class)
[ ] Remove original `TransactionRepository.ts` (keep PouchDB version)
[ ] Update `src/features/transactions/hooks/useTransactions.ts` to use PouchDB repository permanently
[ ] Remove repository factory and feature flags after successful migration
[ ] Update documentation to reflect new PouchDB + CouchDB architecture
[ ] Ensure all PouchDB dependencies are latest stable versions: `pouchdb-browser@^8.0.1`, `pouchdb-find@^8.0.1`

#### Simple Deployment
[ ] Set up basic CouchDB instance for cross-device testing
[ ] Deploy updated FinTrac app with PouchDB implementation
[ ] Test sync between desktop and mobile devices
[ ] Validate all existing features work correctly

## Risk Mitigation

### Data Safety
[ ] Since using dummy data, no backup procedures needed for existing data
[ ] Keep Dexie implementation as fallback during development (parallel implementation)
[ ] Test PouchDB operations thoroughly before switching permanently

### Development Efficiency
[ ] Use repository factory to toggle between Dexie and PouchDB during development
[ ] Implement PouchDB repositories in parallel to avoid downtime
[ ] Test each phase incrementally with existing test suites

### Code Quality
[ ] Maintain existing TypeScript interfaces for Transaction and Category
[ ] Keep existing component prop interfaces unchanged
[ ] Ensure all existing tests pass with new implementation

## Success Criteria

[ ] All existing functionality works identically with PouchDB repositories
[ ] All existing tests pass without modification
[ ] `App.tsx` requires no changes (single source of truth maintained)
[ ] `TransactionForm` and `DashboardChart` require no changes (prop-based architecture maintained)
[ ] Bidirectional sync working between development devices
[ ] No performance degradation compared to Dexie implementation
[ ] Basic conflict resolution working for single-user cases

## Current Components That Need No Changes
- `App.tsx` (uses `useTransactions` hook, which we'll update internally)
- `TransactionForm.tsx` (receives `addTransaction` prop, no direct DB dependency)
- `DashboardChart.tsx` (receives `transactions` and `balance` props, no direct DB dependency)
- `useDashboardData.ts` (depends only on `useTransactions` hook)

## Current Components That Need Minimal Changes
- `useTransactions.ts` (change repository instantiation to use factory)
- `useCategories.ts` (implement actual category repository usage)

## Timeline Summary

- **Total Estimated Duration**: 3-4 weeks
- **Phase 1 (Foundation)**: Days 1-5
- **Phase 2 (Implementation)**: Week 2
- **Phase 3 (Migration)**: Week 3
- **Phase 3.5 (Verification)**: Days 1-3 of Week 3
- **Phase 4 (Sync)**: Week 4
- **Phase 5 (Cleanup)**: Days 1-3 of Week 5

## Future Extensibility

This implementation is designed to easily add:
- User authentication and per-user databases
- Production-grade monitoring and backup
- Advanced conflict resolution strategies
- Multi-user collaboration features

## Next Steps

1. Set up local CouchDB 3.3+ development environment using Docker with CORS enabled
2. Install latest PouchDB dependencies in `package.json`: `npm install pouchdb-browser@^8.0.1 pouchdb-find@^8.0.1 pouchdb-adapter-http@^8.0.1 @types/pouchdb@^6.4.0`
3. Create PouchDB schema matching existing `Transaction` and `Category` interfaces with `_id` and `_rev` fields
4. Implement `PouchTransactionRepository` with identical interface to current `TransactionRepository`
5. Configure PouchDB with IndexedDB adapter using `pouchdb-browser` preset
6. Test CouchDB sync functionality with proper CORS configuration before implementing full sync features
7. Install CORS helper tool: `npm install -g add-cors-to-couchdb`
