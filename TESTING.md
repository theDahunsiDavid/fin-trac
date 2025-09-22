# FinTrac Testing Guide

A comprehensive testing suite for the FinTrac personal finance tracker, ensuring reliability and maintainability across all features.

## Overview

FinTrac uses a modern testing stack built on Vitest, providing comprehensive coverage for:
- **Unit Tests**: Individual functions and utilities
- **Integration Tests**: Database operations and service interactions
- **React Hook Tests**: Custom hooks and state management
- **End-to-End Tests**: Complete user workflows
- **Performance Tests**: Large dataset handling and optimization

## Testing Stack

- **Test Runner**: [Vitest](https://vitest.dev/) - Fast, modern testing framework
- **Environment**: jsdom - Browser-like environment for DOM testing
- **React Testing**: [@testing-library/react](https://testing-library.com/docs/react-testing-library/intro/)
- **Mocking**: Vitest built-in mocking capabilities
- **Coverage**: Built-in coverage reporting with multiple formats
- **Database**: fake-indexeddb for IndexedDB simulation
- **Network**: Fetch polyfill for HTTP request testing

## Quick Start

```bash
# Run all tests
npm test

# Run tests once (no watch mode)
npm run test:run

# Run with coverage report
npm run test:coverage

# Enhanced test runner with options
node scripts/run-tests.js --coverage --verbose
```

## Test Structure

### Directory Organization

```
src/
├── test/                           # Test configuration and integration tests
│   ├── setup.ts                   # Global test setup
│   ├── test-setup.test.ts         # Testing infrastructure validation
│   └── repository-integration.test.ts
├── services/
│   ├── utils/
│   │   ├── uuid.test.ts           # UUID utility tests
│   │   ├── currencyUtils.test.ts  # Currency formatting tests
│   │   ├── dateUtils.test.ts      # Date utility tests
│   │   └── dataValidation.test.ts # Data validation tests
│   ├── repos/
│   │   └── TransactionRepository.test.ts # Repository CRUD tests
│   └── sync/
│       ├── SyncService.test.ts    # Sync service tests
│       └── CouchDBClient.test.ts  # CouchDB client tests
└── hooks/
    └── useCouchDBSync.test.ts     # React hook tests
```

## Test Categories

### 1. Unit Tests

**UUID Utilities** (`src/services/utils/uuid.test.ts`)
- UUID v4 generation and validation
- Prefixed UUID creation for entities
- Cross-browser compatibility
- Performance and memory efficiency

```typescript
describe('generateUUID', () => {
  it('should generate a valid UUID v4 using crypto.randomUUID when available', () => {
    const mockUUID = '550e8400-e29b-41d4-a716-446655440000';
    // Test implementation...
  });
});
```

**Data Validation** (`src/services/utils/dataValidation.test.ts`)
- Transaction data integrity validation
- Bulk validation for import operations
- Error reporting and categorization
- Performance with large datasets

**Currency & Date Utilities**
- Multi-currency formatting and parsing
- Date range validation and formatting
- Locale-aware number handling

### 2. Repository Tests

**TransactionRepository** (`src/services/repos/TransactionRepository.test.ts`)
- CRUD operations (Create, Read, Update, Delete)
- Date range queries and filtering
- Category and type-based searches
- Bulk operations and performance
- Error handling and edge cases

```typescript
describe('TransactionRepository', () => {
  it('should create a new transaction with generated ID and timestamps', async () => {
    const result = await repository.create(mockTransactionInput);
    expect(result.id).toBeDefined();
    expect(result.createdAt).toBeDefined();
  });
});
```

### 3. Service Integration Tests

**SyncService** (`src/services/sync/SyncService.test.ts`)
- Bidirectional synchronization workflows
- Conflict resolution strategies
- Network error handling and retry logic
- Auto-sync management and intervals
- Large dataset synchronization

**CouchDBClient** (`src/services/sync/CouchDBClient.test.ts`)
- REST API communication
- Bulk document operations
- Changes feed processing
- Authentication and authorization
- Network timeout handling

### 4. React Hook Tests

**useCouchDBSync** (`src/hooks/useCouchDBSync.test.ts`)
- Hook initialization and lifecycle
- State management and updates
- Auto-sync functionality
- Error recovery and resilience
- Connection management

```typescript
describe('useCouchDBSync', () => {
  it('should initialize with default state', () => {
    const { result } = renderHook(() => useCouchDBSync(false, false));
    expect(result.current.isInitialized).toBe(false);
  });
});
```

## Test Configuration

### Setup File (`src/test/setup.ts`)

Configures the testing environment with:
- Jest-DOM matchers for better assertions
- Fake IndexedDB for database testing
- Fetch polyfill for network requests
- Global test utilities and helpers

### Vitest Configuration (`vite.config.ts`)

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

## Mocking Strategies

### Database Mocking

```typescript
vi.mock('../db/db', () => ({
  db: {
    transactions: {
      add: vi.fn(),
      get: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      // ... other methods
    },
  },
}));
```

### Service Mocking

```typescript
vi.mock('./SyncService', () => ({
  SyncService: vi.fn().mockImplementation(() => ({
    initialize: vi.fn(),
    sync: vi.fn(),
    testConnection: vi.fn(),
  })),
}));
```

### Crypto API Mocking

```typescript
Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: vi.fn().mockReturnValue('mock-uuid'),
  },
  writable: true,
  configurable: true,
});
```

## Coverage Goals

| Metric     | Target | Description |
|------------|--------|-------------|
| Lines      | 80%+   | Code execution coverage |
| Functions  | 80%+   | Function call coverage |
| Branches   | 70%+   | Conditional path coverage |
| Statements | 80%+   | Statement execution coverage |

### Coverage Reports

Generated in multiple formats:
- **HTML**: `coverage/index.html` - Interactive browser report
- **JSON**: `coverage/coverage-final.json` - Machine-readable data
- **Text**: Console output during test runs

## Running Tests

### Development Workflow

```bash
# Watch mode for active development
npm test

# Run specific test file
npm test src/services/utils/uuid.test.ts

# Run tests matching pattern
npm test -- --grep "UUID"

# Update snapshots
npm test -- --update-snapshots
```

### CI/CD Integration

```bash
# Production test run
npm run test:run

# With coverage and CI optimizations
node scripts/run-tests.js --ci

# Coverage with thresholds
npm run test:coverage
```

### Enhanced Test Runner

The custom test runner (`scripts/run-tests.js`) provides:

```bash
# Basic usage
node scripts/run-tests.js

# With options
node scripts/run-tests.js --coverage --verbose --pattern utils

# CI mode
node scripts/run-tests.js --ci

# Watch mode with coverage
node scripts/run-tests.js --watch --coverage
```

**Available Options:**
- `--watch, -w`: Run in watch mode
- `--coverage, -c`: Generate coverage report
- `--ci`: CI-optimized mode (coverage + bail + verbose)
- `--pattern, -p`: Run specific test pattern
- `--verbose, -v`: Detailed output
- `--bail, -b`: Stop on first failure
- `--silent, -s`: Minimal output
- `--reporter, -r`: Custom reporter format

## Performance Testing

### Large Dataset Tests

```typescript
it('should handle large bulk operations efficiently', async () => {
  const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
    ...mockTransactionInput,
    description: `Transaction ${i}`,
  }));

  const start = performance.now();
  const result = await repository.bulkCreate(largeDataset);
  const end = performance.now();

  expect(result).toHaveLength(10000);
  expect(end - start).toBeLessThan(5000); // 5 second limit
});
```

### Memory Efficiency

```typescript
it('should not leak memory during repeated operations', () => {
  for (let i = 0; i < 10000; i++) {
    const uuid = generateUUID();
    expect(typeof uuid).toBe('string');
    // UUID should be available for GC after this scope
  }
});
```

## Best Practices

### Test Organization

1. **Descriptive Names**: Use clear, descriptive test names
2. **Arrange-Act-Assert**: Structure tests with clear phases
3. **Single Responsibility**: One assertion per test when possible
4. **Test Isolation**: Ensure tests don't depend on each other

### Mocking Guidelines

1. **Mock External Dependencies**: Database, network, file system
2. **Keep Mocks Simple**: Focus on interface, not implementation
3. **Reset Between Tests**: Use `beforeEach` and `afterEach`
4. **Verify Mock Calls**: Assert that mocks were called correctly

### Error Testing

```typescript
it('should handle database errors gracefully', async () => {
  mockDb.transactions.add.mockRejectedValue(new Error('Database error'));
  
  await expect(repository.create(mockTransactionInput))
    .rejects.toThrow('Database error');
});
```

### Async Testing

```typescript
it('should handle async operations correctly', async () => {
  const promise = repository.getById('test-id');
  
  await expect(promise).resolves.toBeDefined();
  // or
  await expect(promise).rejects.toThrow('Not found');
});
```

## Debugging Tests

### Debug Mode

```bash
# Run with Node.js debugger
npm test -- --inspect-brk

# Debug specific test
npm test src/services/utils/uuid.test.ts -- --inspect-brk
```

### Logging in Tests

```typescript
it('should log debug information', () => {
  console.log('Debug info:', testData);
  // Use console.log sparingly in tests
});
```

### Test-Specific Debugging

```typescript
it.only('should focus on this test', () => {
  // Only this test will run
});

it.skip('should skip this test', () => {
  // This test will be skipped
});
```

## Continuous Integration

### GitHub Actions Configuration

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
```

### Coverage Reporting

The test suite generates coverage reports that can be:
- Uploaded to coverage services (Codecov, Coveralls)
- Included in CI/CD pipelines
- Used for code quality gates

## Troubleshooting

### Common Issues

**Tests hanging or timing out:**
```bash
# Increase timeout
npm test -- --timeout 10000
```

**Mock not working:**
```typescript
// Ensure mock is called before import
vi.mock('./module', () => ({ ... }));
import { useModule } from './module';
```

**IndexedDB errors:**
```typescript
// Ensure fake-indexeddb is properly set up in setup.ts
import fakeIndexedDB from 'fake-indexeddb';
global.indexedDB = fakeIndexedDB;
```

**React Hook errors:**
```typescript
// Wrap hook calls in act()
import { act } from '@testing-library/react';

await act(async () => {
  await result.current.someAsyncOperation();
});
```

### Getting Help

1. Check the [Vitest documentation](https://vitest.dev/)
2. Review existing test files for patterns
3. Check the test setup configuration
4. Run tests with `--verbose` for detailed output

## Contributing

When adding new features:

1. **Write Tests First**: Follow TDD principles
2. **Maintain Coverage**: Ensure new code meets coverage targets
3. **Update Documentation**: Add test descriptions to this guide
4. **Run Full Suite**: Verify all tests pass before committing

### Test Checklist

- [ ] Unit tests for all new functions
- [ ] Integration tests for service interactions
- [ ] Error handling and edge cases covered
- [ ] Performance tests for data-intensive operations
- [ ] Mocks properly configured and reset
- [ ] Documentation updated

## Conclusion

The FinTrac testing suite provides comprehensive coverage across all application layers, ensuring reliability, maintainability, and performance. The modular test structure supports both development workflows and CI/CD automation, while the extensive mocking capabilities enable isolated testing of complex interactions.

Regular test execution and coverage monitoring help maintain code quality and catch regressions early in the development process.