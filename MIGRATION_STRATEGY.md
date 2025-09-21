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
- **Test Infrastructure**: Vitest + jsdom with test setup in `src/test/setup.ts`
- **Build System**: Vite with React and Tailwind CSS plugins

### Current Dependencies
- `dexie: ^4.2.0`
- Vite build system with React and Tailwind CSS
- Vitest testing framework
- No PouchDB dependencies yet

## Migration Phases

### Phase 1: Foundation & Setup (Estimated: 1-3 days)

#### Environment Setup
- [ ] Verify current project structure matches expected layout (src/services/db/, src/services/repos/, etc.)
- [ ] Establish performance baseline with current Dexie implementation
- [ ] Measure current app load time, transaction add/fetch performance
- [ ] Test current implementation with larger datasets (1000+ transactions)
- [ ] Install latest PouchDB dependencies: `npm install pouchdb-browser pouchdb-find @types/pouchdb`
- [ ] Install PouchDB HTTP adapter: `npm install pouchdb-adapter-http`
- [ ] Choose simpler CouchDB setup: either `npm install -g pouchdb-server` for development or basic Docker setup
- [ ] Use pouchdb-server for initial development: `npx pouchdb-server --port 5984` (no authentication needed initially)
- [ ] Add Docker setup as optional advanced step: `docker run -d --name couchdb -e COUCHDB_USER=admin -e COUCHDB_PASSWORD=password -p 5984:5984 couchdb:3`
- [ ] Test basic PouchDB connection to local server
- [ ] Test current Dexie implementation works before migration
- [ ] Create backup of current dummy data for validation testing

#### Vite Configuration
- [ ] Test PouchDB compatibility with Vite's ES modules and build process
- [ ] Configure Vite for PouchDB browser bundle if needed: add `define: { global: 'globalThis' }` to vite.config.ts
- [ ] Test PouchDB builds correctly with `npm run build` and works in `npm run preview` mode
- [ ] Verify PouchDB doesn't conflict with existing Tailwind CSS and React plugins

#### Project Structure Updates
- [ ] Create `src/services/pouchdb/` directory
- [ ] Create `src/services/pouchdb/config.ts` for PouchDB configuration
- [ ] Create `src/services/pouchdb/schema.ts` for document schemas
- [ ] Update `.gitignore` to exclude local CouchDB data files
- [ ] Document new directory structure in README

#### Schema Design & TypeScript
- [ ] Create TypeScript interfaces that extend current Transaction/Category with PouchDB fields (`_id`, `_rev`)
- [ ] Ensure PouchDB TypeScript definitions work with current strict TypeScript config
- [ ] Update existing type exports to maintain backward compatibility during migration
- [ ] Test TypeScript compilation with new PouchDB interfaces
- [ ] Decide on document ID strategy: keep current UUID generation or use PouchDB's auto-generated IDs
- [ ] If keeping UUIDs, ensure PouchDB `_id` field uses current `crypto.randomUUID()` format
- [ ] Create ID mapping utilities to handle the transition between `id` and `_id` fields
- [ ] Test document ID uniqueness and conflicts during migration
- [ ] Create `PouchTransaction` and `PouchCategory` TypeScript interfaces extending base types
- [ ] Define document ID generation strategy (maintain UUID from current implementation, prefix with doc type: `transaction_${uuid}`, `category_${uuid}`)
- [ ] Create validation schemas matching current transaction validation
- [ ] Plan basic document structure with `_id` and `_rev` fields for CouchDB compatibility

#### Test Infrastructure Validation
- [ ] Verify current Vitest + jsdom setup works with PouchDB operations
- [ ] Test PouchDB operations in jsdom environment (may need polyfills)
- [ ] Ensure existing test setup.ts configuration remains compatible
- [ ] Create test database utilities for PouchDB that match current Dexie test patterns
- [ ] Verify all existing test files still pass before migration: `npm run test`

#### Utility Functions Validation
- [ ] Verify existing `currencyUtils.ts` and `dateUtils.ts` work with PouchDB data format
- [ ] Test current ISO 8601 date handling with PouchDB document storage
- [ ] Ensure current number formatting and currency display logic remains intact
- [ ] Test existing validation functions with new PouchDB document structure

### Phase 2: PouchDB Implementation (Estimated: 4-8 days)

#### PouchDB Service Layer
- [ ] Create `src/services/pouchdb/PouchDBConfig.ts` with database initialization using `pouchdb-browser` preset
- [ ] Create `src/services/pouchdb/PouchDBConnection.ts` with connection management and IndexedDB adapter setup
- [ ] Create `src/services/pouchdb/BasePouchRepository.ts` abstract class with common CRUD operations
- [ ] Implement error handling wrapper for PouchDB operations with proper conflict resolution
- [ ] Add retry logic for failed database operations and network issues
- [ ] Configure PouchDB with IndexedDB adapter: `import PouchDB from 'pouchdb-browser'` (includes IndexedDB adapter by default)
- [ ] Verify IndexedDB adapter compatibility: IndexedDB is included in pouchdb-browser preset
- [ ] Create data validation utilities to compare Dexie vs PouchDB results
- [ ] Implement data migration utility to transfer existing IndexedDB data to PouchDB format
- [ ] Add comprehensive logging for PouchDB operations during development
- [ ] Test PouchDB IndexedDB storage size and performance vs Dexie baseline

#### PouchDB Transaction Repository
- [ ] Create `src/services/repos/PouchTransactionRepository.ts` implementing same interface as current `TransactionRepository`
- [ ] Implement `getAll()` method matching current signature
- [ ] Implement `create()` method with same validation and ID generation
- [ ] Implement `update()` method matching current signature
- [ ] Implement `delete()` method matching current signature
- [ ] Implement `getTransactionsByDateRange()` method matching current signature
- [ ] Implement `getTransactionsByType()` method matching current signature
- [ ] Implement `getTransactionsByCategory()` method matching current signature
- [ ] Implement `getRecentTransactions()` method matching current signature
- [ ] Add PouchDB indexing for date, type, and category fields

#### PouchDB Category Repository (Future)
- [ ] Note: `useCategories` is currently a placeholder - implement basic category repository after transaction migration is complete
- [ ] Focus on transaction migration first, as categories are not actively used in current UI
- [ ] Create `src/services/repos/PouchCategoryRepository.ts` with same interface as planned `CategoryRepository`
- [ ] Implement basic CRUD operations for categories
- [ ] Add validation for category color and name uniqueness

### Phase 3: Repository Interface & Migration (Estimated: 4 days)

#### Repository Abstraction Layer
- [ ] Create `src/services/repos/ITransactionRepository.ts` interface matching current `TransactionRepository` methods
- [ ] Create `src/services/repos/ICategoryRepository.ts` interface for future category operations
- [ ] Update existing `TransactionRepository.ts` to implement `ITransactionRepository`
- [ ] Create `src/services/repos/RepositoryFactory.ts` for switching between Dexie and PouchDB implementations
- [ ] Add environment variable `VITE_USE_POUCHDB=true/false` for easy switching

#### Hook Updates (Minimal Changes Required)
- [ ] Update `useTransactions` hook to use repository factory instead of direct `TransactionRepository` instantiation
- [ ] Keep `useDashboardData` unchanged (it only depends on `useTransactions`)
- [ ] Add loading states for PouchDB operations
- [ ] Add offline status detection in hooks

#### Component Updates (No Changes Required)
- [ ] Verify `TransactionForm` still works with new repository (should work unchanged)
- [ ] Verify `DashboardChart` still works with new repository (should work unchanged)
- [ ] Verify `App.tsx` still works with updated `useTransactions` hook (should work unchanged)
- [ ] Add sync status indicators to UI components

#### Testing & Validation
- [ ] Create integration tests comparing Dexie vs PouchDB repository outputs
- [ ] Test all existing CRUD operations work correctly with PouchDB repository
- [ ] Run existing test suites: `npm run test` to execute all tests including TransactionRepository.test.ts, useCategories.test.tsx, useDashboardData.test.tsx, TransactionForm.test.tsx, DashboardChart.test.tsx
- [ ] Test error handling and edge cases
- [ ] Test offline functionality
- [ ] Implement data consistency validation between old and new repositories
- [ ] Test all existing transaction operations with both repositories in parallel
- [ ] Verify memory usage and performance metrics for both implementations

### Phase 3.5: Migration Verification (Estimated: 2-3 days)

- [ ] Run comprehensive data consistency tests between Dexie and PouchDB
- [ ] Validate all transaction CRUD operations produce identical results
- [ ] Test error handling and edge cases with both implementations
- [ ] Verify UI components work identically with both data sources
- [ ] Create performance comparison tests between Dexie and PouchDB
- [ ] Set performance regression thresholds (e.g., no more than 20% slower)
- [ ] Benchmark performance differences and document findings
- [ ] Test offline functionality and data persistence
- [ ] Validate all existing test suites pass with PouchDB repository
- [ ] Verify PouchDB performance with equivalent data volumes
- [ ] Test sync performance with realistic data sizes

#### PWA Validation
- [ ] Test current PWA capabilities work with PouchDB (offline functionality)
- [ ] Verify service worker compatibility if implemented
- [ ] Test app installability remains intact after migration

### Phase 4: Sync Implementation (Estimated: 4 days)

#### Basic CouchDB Server Setup
- [ ] Test CouchDB connection from Arch Linux environment specifically
- [ ] Use chosen setup method (pouchdb-server recommended for simplicity)
- [ ] If using Docker: `docker run -d --name couchdb -e COUCHDB_USER=admin -e COUCHDB_PASSWORD=password -p 5984:5984 couchdb:3`
- [ ] Configure CORS in CouchDB: Enable via `[chttpd] enable_cors = true` and set `[cors] origins = http://localhost:5173, credentials = true, methods = GET,PUT,POST,HEAD,DELETE`
- [ ] Create single development database (no user isolation needed)
- [ ] Verify CouchDB installation: `curl http://admin:password@localhost:5984` should return `{"couchdb":"Welcome","version":"3.x.x"}`
- [ ] Test CORS functionality from browser environment

#### Sync Implementation
- [ ] Add sync functionality using `PouchDB.sync()` method with live replication: `db.sync(remoteUrl, {live: true, retry: true})`
- [ ] Implement bidirectional sync with CouchDB using replication protocol
- [ ] Add sync conflict detection and resolution following CouchDB's document versioning with `_rev` markers
- [ ] Add sync status tracking and reporting with event listeners: `'change'`, `'paused'`, `'active'`, `'denied'`, `'complete'`, `'error'`
- [ ] Implement sync retry logic for failed operations with exponential backoff
- [ ] Create sync scheduling system (immediate, periodic, manual) with proper error handling
- [ ] Add sync progress indicators to existing UI showing sync state and conflict resolution
- [ ] Implement sync status persistence across browser sessions
- [ ] Add network connectivity detection and graceful offline handling
- [ ] Test sync behavior with large transaction datasets (100+ transactions)
- [ ] Implement sync batching for better performance with large datasets
- [ ] Add sync metrics and monitoring for development debugging

#### Conflict Resolution
- [ ] Implement simple "last write wins" conflict resolution for single-user scenario
- [ ] Document conflict resolution strategy for future multi-user implementation

### Phase 5: Cleanup & Deployment (Estimated: 2 days)

#### Data Cleanup
- [ ] Remove Dexie dependency: `npm uninstall dexie`
- [ ] Remove `src/services/db/db.ts` (FinTracDB class)
- [ ] Remove original `TransactionRepository.ts` (keep PouchDB version)
- [ ] Update `src/features/transactions/hooks/useTransactions.ts` to use PouchDB repository permanently
- [ ] Remove repository factory and feature flags after successful migration
- [ ] Update documentation to reflect new PouchDB + CouchDB architecture
- [ ] Ensure all PouchDB dependencies are latest stable versions: `npm update pouchdb-browser pouchdb-find pouchdb-adapter-http @types/pouchdb`

#### Simple Deployment
- [ ] Set up basic CouchDB instance for cross-device testing
- [ ] Deploy updated FinTrac app with PouchDB implementation
- [ ] Test sync between desktop and mobile devices
- [ ] Validate all existing features work correctly

## Risk Mitigation

### Data Safety
- [ ] Since using dummy data, no backup procedures needed for existing data
- [ ] Keep Dexie implementation as fallback during development (parallel implementation)
- [ ] Test PouchDB operations thoroughly before switching permanently

### Development Efficiency
- [ ] Use repository factory to toggle between Dexie and PouchDB during development
- [ ] Implement PouchDB repositories in parallel to avoid downtime
- [ ] Test each phase incrementally with existing test suites

### Code Quality
- [ ] Maintain existing TypeScript interfaces for Transaction and Category
- [ ] Keep existing component prop interfaces unchanged
- [ ] Ensure all existing tests pass with new implementation

## Success Criteria

- [ ] All existing functionality works identically with PouchDB repositories
- [ ] All existing tests pass without modification
- [ ] `App.tsx` requires no changes (single source of truth maintained)
- [ ] `TransactionForm` and `DashboardChart` require no changes (prop-based architecture maintained)
- [ ] Bidirectional sync working between development devices
- [ ] No performance degradation compared to Dexie implementation (max 20% slower acceptable)
- [ ] Basic conflict resolution working for single-user cases

## Current Components That Need No Changes
- `App.tsx` (uses `useTransactions` hook, which we'll update internally)
- `TransactionForm.tsx` (receives `addTransaction` prop, no direct DB dependency)
- `DashboardChart.tsx` (receives `transactions` and `balance` props, no direct DB dependency)
- `useDashboardData.ts` (depends only on `useTransactions` hook)

## Current Components That Need Minimal Changes
- `useTransactions.ts` (change repository instantiation to use factory)
- `useCategories.ts` (currently placeholder - defer implementation until after transaction migration)

## Timeline Summary

- **Total Estimated Duration**: 2-3 weeks
- **Phase 1 (Foundation)**: Days 1-3
- **Phase 2 (Implementation)**: Days 4-8 (1 week)
- **Phase 3 (Migration)**: Days 9-12 (4 days)
- **Phase 3.5 (Verification)**: Days 11-13 (overlapping with Phase 3)
- **Phase 4 (Sync)**: Days 13-16 (4 days)
- **Phase 5 (Cleanup)**: Days 17-18 (2 days)

## Future Extensibility

This implementation is designed to easily add:
- User authentication and per-user databases
- Production-grade monitoring and backup
- Advanced conflict resolution strategies
- Multi-user collaboration features

## Next Steps

1. Set up local CouchDB development environment (pouchdb-server recommended for simplicity)
2. Install latest PouchDB dependencies: `npm install pouchdb-browser pouchdb-find pouchdb-adapter-http @types/pouchdb`
3. Test Vite compatibility with PouchDB browser bundle
4. Create PouchDB schema matching existing `Transaction` and `Category` interfaces with `_id` and `_rev` fields
5. Implement `PouchTransactionRepository` with identical interface to current `TransactionRepository`
6. Configure PouchDB with IndexedDB adapter using `pouchdb-browser` preset
7. Test CouchDB sync functionality with proper CORS configuration before implementing full sync features