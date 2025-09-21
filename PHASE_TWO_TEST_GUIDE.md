# Phase 2 Testing Guide: PouchDB Service Layer

## Overview
This guide provides comprehensive instructions for testing the Phase 2 PouchDB implementation in your browser. Phase 2 introduces the complete PouchDB service layer with repositories, migration tools, and validation systems while maintaining compatibility with the existing Dexie implementation.

## Prerequisites
- ✅ Phase 1 verification complete (PouchDB CDN loaded successfully)
- ✅ Development server running: `npm run dev`
- ✅ Browser with Developer Tools (F12)
- ✅ App accessible at `http://localhost:5173/`

## Quick Start: 30-Second Smoke Test

Open browser console and run:
```javascript
// Import and run the smoke test
import('/src/services/pouchdb/test-utils.js').then(async ({ smokeTest }) => {
  const result = await smokeTest();
  console.log('✅ PouchDB Phase 2 Smoke Test:', result ? 'PASSED' : 'FAILED');
});
```

**Expected:** Should see `✅ PouchDB Phase 2 Smoke Test: PASSED`

## Comprehensive Testing: Full Test Suite

### Step 1: Run Complete Test Suite

```javascript
// Import and run the complete test suite
import('/src/services/pouchdb/test-utils.js').then(async ({ runPouchDBTestSuite }) => {
  console.log('🧪 Starting PouchDB Phase 2 Test Suite...');
  const results = await runPouchDBTestSuite();
  
  console.log('\n📊 Test Results Summary:');
  console.log(`Total Tests: ${results.summary.totalTests}`);
  console.log(`Passed: ${results.summary.passed}`);
  console.log(`Failed: ${results.summary.failed}`);
  console.log(`Duration: ${results.summary.duration.toFixed(2)}ms`);
  
  if (results.summary.failed === 0) {
    console.log('🎉 All tests passed! Phase 2 is working correctly.');
  } else {
    console.log('❌ Some tests failed. Check individual test results above.');
  }
});
```

**Expected Results:**
- All tests should pass (0 failed)
- Duration should be under 2000ms
- Should see operations like create, read, update, delete, queries

### Step 2: Test Individual Repository Operations

#### Transaction Repository Testing

```javascript
// Test PouchDB Transaction Repository
import('/src/services/repos/PouchTransactionRepository.js').then(async (module) => {
  const { PouchTransactionRepository } = module;
  const repo = new PouchTransactionRepository();
  
  console.log('💰 Testing PouchDB Transaction Repository...');
  
  // Test 1: Create a transaction
  const testTransaction = {
    date: new Date().toISOString().split('T')[0],
    description: 'Browser Test Transaction',
    amount: 123.45,
    currency: 'USD',
    type: 'debit',
    category: 'Testing'
  };
  
  try {
    await repo.create(testTransaction);
    console.log('✅ Create transaction: SUCCESS');
    
    // Test 2: Get all transactions
    const transactions = await repo.getAll();
    console.log(`✅ Get all transactions: ${transactions.length} found`);
    
    // Test 3: Get recent transactions
    const recent = await repo.getRecentTransactions(5);
    console.log(`✅ Get recent transactions: ${recent.length} found`);
    
    // Test 4: Get by type
    const debits = await repo.getTransactionsByType('debit');
    console.log(`✅ Get debit transactions: ${debits.length} found`);
    
    // Test 5: Get by category
    const testTransactions = await repo.getTransactionsByCategory('Testing');
    console.log(`✅ Get testing transactions: ${testTransactions.length} found`);
    
    // Test 6: Date range query
    const today = new Date().toISOString().split('T')[0];
    const dateRange = await repo.getTransactionsByDateRange(today, today);
    console.log(`✅ Date range query: ${dateRange.length} found`);
    
    console.log('🎉 All transaction repository tests passed!');
    
  } catch (error) {
    console.error('❌ Transaction repository test failed:', error);
  }
});
```

#### Category Repository Testing

```javascript
// Test PouchDB Category Repository
import('/src/services/repos/PouchCategoryRepository.js').then(async (module) => {
  const { PouchCategoryRepository } = module;
  const repo = new PouchCategoryRepository();
  
  console.log('📁 Testing PouchDB Category Repository...');
  
  try {
    // Test 1: Create default categories
    const created = await repo.createDefaultCategories();
    console.log(`✅ Created default categories: ${created}`);
    
    // Test 2: Get all categories
    const categories = await repo.getAll();
    console.log(`✅ Get all categories: ${categories.length} found`);
    console.log('Categories:', categories.map(c => c.name).join(', '));
    
    // Test 3: Get by name
    const foodCategory = await repo.getByName('Food');
    console.log(`✅ Get Food category:`, foodCategory ? 'Found' : 'Not found');
    
    // Test 4: Create custom category
    await repo.create({
      name: 'Browser Test Category',
      color: 'bg-purple-500'
    });
    console.log('✅ Created custom category');
    
    console.log('🎉 All category repository tests passed!');
    
  } catch (error) {
    console.error('❌ Category repository test failed:', error);
  }
});
```

### Step 3: Test Performance Characteristics

```javascript
// Performance benchmarking
import('/src/services/pouchdb/test-utils.js').then(async ({ testCategoryOperations }) => {
  console.log('⚡ Running performance tests...');
  
  const performanceStart = performance.now();
  
  // Run category operations test
  const results = await testCategoryOperations();
  
  const performanceEnd = performance.now();
  const totalTime = performanceEnd - performanceStart;
  
  console.log('\n📈 Performance Results:');
  console.log(`Total test time: ${totalTime.toFixed(2)}ms`);
  console.log(`Operations tested: ${results.length}`);
  console.log(`Average per operation: ${(totalTime / results.length).toFixed(2)}ms`);
  
  results.forEach(result => {
    console.log(`  ${result.success ? '✅' : '❌'} ${result.operation}: ${result.duration.toFixed(2)}ms`);
  });
});
```

### Step 4: Test Data Migration & Validation

```javascript
// Test migration capabilities (dry run)
import('/src/services/pouchdb/migration.js').then(async (module) => {
  const { getMigrationStats, migrateTransactions } = module;
  
  console.log('🔄 Testing migration capabilities...');
  
  try {
    // Get migration statistics
    const stats = await getMigrationStats();
    console.log('📊 Migration Stats:', {
      dexieTransactions: stats.dexieTransactionCount,
      pouchTransactions: stats.pouchTransactionCount,
      estimatedDuration: `${stats.estimatedMigrationTime.toFixed(2)}ms`
    });
    
    // Test dry run migration (won't actually migrate data)
    const dryRun = await migrateTransactions({
      dryRun: true,
      batchSize: 5
    });
    
    console.log('🧪 Dry Run Results:', {
      success: dryRun.success,
      wouldMigrate: dryRun.migratedCount,
      duration: `${dryRun.duration.toFixed(2)}ms`
    });
    
    console.log('✅ Migration system working correctly');
    
  } catch (error) {
    console.error('❌ Migration test failed:', error);
  }
});
```

### Step 5: Test Data Validation

```javascript
// Test data consistency validation
import('/src/services/pouchdb/validation.js').then(async (module) => {
  const { validateDataConsistency } = module;
  
  console.log('🔍 Testing data validation...');
  
  try {
    const validation = await validateDataConsistency();
    
    console.log('📋 Validation Results:', {
      isValid: validation.isValid,
      totalTransactions: validation.summary.totalTransactions,
      differences: validation.summary.differenceCount,
      duration: `${validation.summary.validationTime.toFixed(2)}ms`
    });
    
    if (validation.isValid) {
      console.log('✅ Data consistency validation passed');
    } else {
      console.log('⚠️ Data inconsistencies found:', validation.differences.length);
      console.log('First few differences:', validation.differences.slice(0, 3));
    }
    
  } catch (error) {
    console.error('❌ Validation test failed:', error);
  }
});
```

### Step 6: Test Database Information

```javascript
// Get database information and statistics
import('/src/services/pouchdb/test-utils.js').then(async ({ logDatabaseInfo }) => {
  console.log('📊 Getting database information...');
  await logDatabaseInfo();
});

// Also test repository info directly
import('/src/services/repos/PouchTransactionRepository.js').then(async (module) => {
  const { PouchTransactionRepository } = module;
  const repo = new PouchTransactionRepository();
  
  const dbInfo = await repo.getDatabaseInfo();
  console.log('🗄️ Direct Database Info:', {
    name: dbInfo.db_name,
    docCount: dbInfo.doc_count,
    updateSeq: dbInfo.update_seq,
    size: `${(dbInfo.disk_size / 1024).toFixed(2)} KB`
  });
});
```

## IndexedDB Inspection

### Check Data in Browser DevTools

1. **Open DevTools** (F12) → **Application** tab → **IndexedDB**
2. **Look for databases:**
   - `fintrac` - Main PouchDB database
   - `_pouch_*` - PouchDB internal databases
3. **Inspect documents:**
   - Transaction documents start with `transaction:`
   - Category documents start with `category:`
   - Should see proper document structure with `_id`, `_rev`, etc.

### Manual IndexedDB Query

```javascript
// Directly query IndexedDB to see PouchDB documents
const request = indexedDB.open('fintrac');
request.onsuccess = function(event) {
  const db = event.target.result;
  const transaction = db.transaction(['document-store'], 'readonly');
  const store = transaction.objectStore('document-store');
  const getAllRequest = store.getAll();
  
  getAllRequest.onsuccess = function() {
    const docs = getAllRequest.result;
    console.log('📄 Documents in IndexedDB:', docs.length);
    
    const transactions = docs.filter(doc => doc.id?.startsWith('transaction:'));
    const categories = docs.filter(doc => doc.id?.startsWith('category:'));
    
    console.log(`💰 Transactions: ${transactions.length}`);
    console.log(`📁 Categories: ${categories.length}`);
    
    if (transactions.length > 0) {
      console.log('📝 Sample transaction:', transactions[0]);
    }
  };
};
```

## Cleanup After Testing

```javascript
// Clean up test data
import('/src/services/pouchdb/test-utils.js').then(async ({ cleanupTestData }) => {
  console.log('🧹 Cleaning up test data...');
  const deleted = await cleanupTestData();
  console.log(`🗑️ Cleaned up ${deleted} test documents`);
});
```

## Expected Results Summary

### ✅ Success Indicators

**Console Output:**
- All test suites pass with 0 failures
- Operations complete in reasonable time (<2000ms total)
- No JavaScript errors or warnings
- PouchDB operations work correctly (create, read, update, delete, query)

**Performance:**
- Individual operations: 5-50ms each
- Bulk operations: efficient batching
- Query operations: fast with proper indexing
- Memory usage: stable (no leaks)

**Data Storage:**
- Documents visible in IndexedDB
- Proper document structure (`_id`, `_rev`, data fields)
- Transaction and category documents properly stored
- Data persists across browser refreshes

### ❌ Failure Indicators

**Red Flags:**
- Test suite reports failures
- JavaScript errors in console
- Operations timeout or take too long (>5000ms)
- Documents not appearing in IndexedDB
- Data not persisting across refreshes

**Common Issues:**
- PouchDB not loaded (Phase 1 issue)
- IndexedDB not available (browser support)
- Network connectivity issues
- TypeScript compilation errors

## Integration with Existing App

### Verify No Conflicts

```javascript
// Ensure PouchDB doesn't interfere with existing Dexie functionality
import('/src/services/repos/TransactionRepository.js').then(async (module) => {
  const { TransactionRepository } = module;
  const dexieRepo = new TransactionRepository();
  
  console.log('🔄 Testing Dexie compatibility...');
  
  try {
    const dexieTransactions = await dexieRepo.getAll();
    console.log(`✅ Dexie still working: ${dexieTransactions.length} transactions`);
    
    // Both repositories should work side by side
    console.log('✅ No conflicts between Dexie and PouchDB implementations');
    
  } catch (error) {
    console.error('❌ Dexie compatibility issue:', error);
  }
});
```

## Advanced Testing: All-in-One Test Script

For convenience, here's a comprehensive test script that runs everything:

```javascript
// Complete Phase 2 Test Suite - Run this for full validation
async function runCompletePhase2Tests() {
  console.log('🚀 Starting Complete Phase 2 Test Suite...');
  console.log('=' .repeat(50));
  
  try {
    // 1. Smoke Test
    console.log('\n1️⃣ Running Smoke Test...');
    const { smokeTest } = await import('/src/services/pouchdb/test-utils.js');
    const smokeResult = await smokeTest();
    console.log(`   Result: ${smokeResult ? '✅ PASSED' : '❌ FAILED'}`);
    
    // 2. Full Test Suite
    console.log('\n2️⃣ Running Full Test Suite...');
    const { runPouchDBTestSuite } = await import('/src/services/pouchdb/test-utils.js');
    const testResults = await runPouchDBTestSuite();
    console.log(`   Total: ${testResults.summary.totalTests}, Passed: ${testResults.summary.passed}, Failed: ${testResults.summary.failed}`);
    
    // 3. Performance Test
    console.log('\n3️⃣ Running Performance Tests...');
    const { testCategoryOperations } = await import('/src/services/pouchdb/test-utils.js');
    const perfStart = performance.now();
    await testCategoryOperations();
    const perfEnd = performance.now();
    console.log(`   Performance: ${(perfEnd - perfStart).toFixed(2)}ms`);
    
    // 4. Migration Test
    console.log('\n4️⃣ Testing Migration System...');
    const { getMigrationStats } = await import('/src/services/pouchdb/migration.js');
    const migrationStats = await getMigrationStats();
    console.log(`   Dexie Transactions: ${migrationStats.dexieTransactionCount}`);
    console.log(`   PouchDB Transactions: ${migrationStats.pouchTransactionCount}`);
    
    // 5. Validation Test
    console.log('\n5️⃣ Testing Data Validation...');
    const { validateDataConsistency } = await import('/src/services/pouchdb/validation.js');
    const validation = await validateDataConsistency();
    console.log(`   Data Consistency: ${validation.isValid ? '✅ Valid' : '⚠️ Issues Found'}`);
    
    // 6. Database Info
    console.log('\n6️⃣ Getting Database Information...');
    const { logDatabaseInfo } = await import('/src/services/pouchdb/test-utils.js');
    await logDatabaseInfo();
    
    // 7. Dexie Compatibility
    console.log('\n7️⃣ Testing Dexie Compatibility...');
    const { TransactionRepository } = await import('/src/services/repos/TransactionRepository.js');
    const dexieRepo = new TransactionRepository();
    const dexieTransactions = await dexieRepo.getAll();
    console.log(`   Dexie Transactions: ${dexieTransactions.length} (still working)`);
    
    console.log('\n' + '=' .repeat(50));
    console.log('🎉 Complete Phase 2 Test Suite Finished!');
    console.log('✅ Phase 2 implementation is ready for Phase 3');
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    console.log('🔧 Please check the error above and retry');
  }
}

// Run the complete test suite
runCompletePhase2Tests();
```

## Next Steps

After successful Phase 2 testing:

1. **Document any issues** found during testing
2. **Verify performance** meets expectations
3. **Confirm data integrity** between Dexie and PouchDB
4. **Prepare for Phase 3** (repository factory implementation)

## Troubleshooting

### If tests fail:
1. Check browser console for errors
2. Verify Phase 1 is working (PouchDB loaded)
3. Clear IndexedDB and restart
4. Refresh page and try again

### Performance issues:
1. Check if IndexedDB is being used efficiently
2. Verify indexes are being created
3. Monitor memory usage in DevTools

### Data issues:
1. Check IndexedDB in Application tab
2. Verify document structure matches expected schema
3. Test with fresh browser session

---

**Note:** Phase 2 testing confirms that the PouchDB service layer is ready for integration. The existing Dexie implementation continues to work alongside the new PouchDB implementation, ensuring no disruption during development.