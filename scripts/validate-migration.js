#!/usr/bin/env node

/**
 * Migration Validation Script for FinTrac
 *
 * This script validates the migration from Dexie to PouchDB by:
 * 1. Checking both implementations are working
 * 2. Comparing data consistency between implementations
 * 3. Running performance benchmarks
 * 4. Generating a comprehensive validation report
 *
 * Usage: node scripts/validate-migration.js
 */

console.log('🔍 FinTrac Migration Validation Script');
console.log('=====================================');

// Check if we're in a browser environment
if (typeof window === 'undefined') {
  console.log('❌ This script must be run in a browser environment');
  console.log('');
  console.log('Instructions:');
  console.log('1. Start the development server: npm run dev');
  console.log('2. Open browser and navigate to http://localhost:5173');
  console.log('3. Open browser console and paste this script');
  console.log('4. Or create an HTML page that imports and runs this script');
  process.exit(1);
}

// Browser-based validation
(async function validateMigration() {
  console.log('🚀 Starting migration validation...');

  try {
    // Import validation utilities (these would need to be available in browser)
    console.log('📦 Loading validation modules...');

    // This would be imported in a real browser environment
    const {
      validateMigrationIntegrity,
      generateValidationReport,
      RepositoryFactory
    } = window.FinTracValidation || {};

    if (!RepositoryFactory) {
      console.log('❌ FinTrac validation modules not found');
      console.log('Make sure the app is properly loaded with validation utilities');
      return;
    }

    console.log('✅ Validation modules loaded');

    // Step 1: Check implementation availability
    console.log('\n📋 Step 1: Checking Implementation Availability');
    console.log('================================================');

    const implementationInfo = await RepositoryFactory.getImplementationInfo();
    console.log(`Current Implementation: ${implementationInfo.current}`);
    console.log(`Available Implementations: ${implementationInfo.available.join(', ')}`);
    console.log(`Environment Variable: ${implementationInfo.environmentVariable || 'not set'}`);
    console.log(`Transaction Count: ${implementationInfo.transactionRepository.totalTransactions}`);

    // Step 2: Test both implementations
    console.log('\n🔧 Step 2: Testing Both Implementations');
    console.log('=======================================');

    const comparison = await RepositoryFactory.compareImplementations();
    console.log('Dexie Implementation:');
    console.log(`  - Total Transactions: ${comparison.dexie.totalTransactions}`);
    console.log(`  - Last Modified: ${comparison.dexie.lastModified || 'N/A'}`);

    console.log('PouchDB Implementation:');
    console.log(`  - Total Transactions: ${comparison.pouchdb.totalTransactions}`);
    console.log(`  - Last Modified: ${comparison.pouchdb.lastModified || 'N/A'}`);

    console.log(`Data Identical: ${comparison.identical ? '✅' : '❌'}`);

    // Step 3: Comprehensive validation
    console.log('\n🎯 Step 3: Comprehensive Data Validation');
    console.log('========================================');

    const validationResults = await validateMigrationIntegrity();
    const report = generateValidationReport(validationResults);

    console.log(report);

    // Step 4: Performance benchmarks
    console.log('\n⚡ Step 4: Performance Benchmarks');
    console.log('=================================');

    const performanceResults = await runPerformanceBenchmarks();
    console.log('Performance Results:');
    Object.entries(performanceResults).forEach(([operation, results]) => {
      console.log(`${operation}:`);
      console.log(`  Dexie: ${results.dexie}ms`);
      console.log(`  PouchDB: ${results.pouchdb}ms`);
      console.log(`  Difference: ${results.difference}ms (${results.percentage}%)`);
    });

    // Step 5: Final recommendations
    console.log('\n📝 Step 5: Final Recommendations');
    console.log('================================');

    if (validationResults.overallStatus === 'success') {
      console.log('✅ Migration validation PASSED');
      console.log('✅ Data integrity verified');
      console.log('✅ Both implementations working correctly');
      console.log('');
      console.log('🎉 Ready to proceed with full migration!');
    } else if (validationResults.overallStatus === 'warning') {
      console.log('⚠️  Migration validation passed with WARNINGS');
      console.log('Review the warnings above before proceeding');
    } else {
      console.log('❌ Migration validation FAILED');
      console.log('Fix the errors above before proceeding');
    }

  } catch (error) {
    console.error('❌ Validation failed with error:', error);
    console.log('');
    console.log('Troubleshooting:');
    console.log('1. Ensure the app is running and loaded');
    console.log('2. Check that both Dexie and PouchDB are properly configured');
    console.log('3. Verify that validation utilities are imported');
  }
})();

// Performance benchmark function
async function runPerformanceBenchmarks() {
  const operations = ['create', 'read', 'update', 'delete'];
  const results = {};

  for (const operation of operations) {
    console.log(`Benchmarking ${operation}...`);

    const dexieTime = await benchmarkOperation('dexie', operation);
    const pouchdbTime = await benchmarkOperation('pouchdb', operation);

    const difference = pouchdbTime - dexieTime;
    const percentage = ((difference / dexieTime) * 100).toFixed(1);

    results[operation] = {
      dexie: dexieTime,
      pouchdb: pouchdbTime,
      difference,
      percentage: percentage > 0 ? `+${percentage}` : percentage
    };
  }

  return results;
}

// Benchmark individual operations
async function benchmarkOperation(implementation, operation) {
  const RepositoryFactory = window.FinTracValidation?.RepositoryFactory;
  if (!RepositoryFactory) return 0;

  RepositoryFactory.setImplementation(implementation);
  const repo = RepositoryFactory.getTransactionRepository();

  const iterations = 10;
  const testData = {
    date: '2024-01-15',
    description: `Benchmark ${operation} test`,
    amount: 100,
    currency: 'USD',
    type: 'debit',
    category: 'Test'
  };

  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    switch (operation) {
      case 'create':
        await repo.create({ ...testData, description: `${testData.description} ${i}` });
        break;
      case 'read':
        await repo.getAll();
        break;
      case 'update':
        const transactions = await repo.getAll();
        if (transactions.length > 0) {
          await repo.update(transactions[0].id, { description: `Updated ${i}` });
        }
        break;
      case 'delete':
        const toDelete = await repo.getAll();
        if (toDelete.length > 0) {
          await repo.delete(toDelete[0].id);
        }
        break;
    }
  }

  const end = performance.now();
  return Math.round((end - start) / iterations);
}

// Export for browser use
if (typeof window !== 'undefined') {
  window.validateMigration = validateMigration;

  // Instructions for browser usage
  console.log('');
  console.log('💡 Browser Usage Instructions:');
  console.log('==============================');
  console.log('1. Make sure your FinTrac app is loaded');
  console.log('2. Ensure validation utilities are available at window.FinTracValidation');
  console.log('3. Run: validateMigration()');
  console.log('');
  console.log('Example setup in your app:');
  console.log('window.FinTracValidation = {');
  console.log('  validateMigrationIntegrity,');
  console.log('  generateValidationReport,');
  console.log('  RepositoryFactory');
  console.log('};');
}
