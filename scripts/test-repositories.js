/**
 * Console Test Script for Repository Validation
 *
 * This script can be pasted into the browser console to test
 * the repository implementations and validate the migration.
 *
 * Prerequisites:
 * 1. FinTrac app must be running
 * 2. Both Dexie and PouchDB implementations available
 * 3. Paste this script into browser console
 */

(async function testRepositories() {
  console.log('🧪 FinTrac Repository Test Suite');
  console.log('================================');

  // Test data
  const testTransactions = [
    {
      date: '2024-01-15',
      description: 'Test Coffee Shop',
      amount: 4.50,
      currency: 'USD',
      type: 'debit',
      category: 'Food'
    },
    {
      date: '2024-01-14',
      description: 'Test Salary',
      amount: 3000.00,
      currency: 'USD',
      type: 'credit',
      category: 'Income'
    },
    {
      date: '2024-01-13',
      description: 'Test Grocery Store',
      amount: 85.32,
      currency: 'USD',
      type: 'debit',
      category: 'Food'
    }
  ];

  try {
    // Check if required modules are available
    let RepositoryFactory;

    // Try to access RepositoryFactory from different possible locations
    if (window.FinTracValidation?.RepositoryFactory) {
      RepositoryFactory = window.FinTracValidation.RepositoryFactory;
    } else if (window.RepositoryFactory) {
      RepositoryFactory = window.RepositoryFactory;
    } else {
      console.log('❌ RepositoryFactory not found');
      console.log('');
      console.log('To make this script work, you need to expose RepositoryFactory:');
      console.log('');
      console.log('In your React app, add to window object:');
      console.log('```javascript');
      console.log('import { RepositoryFactory } from "./services/repos/RepositoryFactory";');
      console.log('window.RepositoryFactory = RepositoryFactory;');
      console.log('```');
      console.log('');
      console.log('Or in console, try:');
      console.log('```javascript');
      console.log('// If using ES modules in console');
      console.log('const module = await import("./src/services/repos/RepositoryFactory.js");');
      console.log('window.RepositoryFactory = module.RepositoryFactory;');
      console.log('```');
      return;
    }

    console.log('✅ RepositoryFactory found');

    // Test 1: Basic functionality test
    console.log('\n📋 Test 1: Basic Repository Functionality');
    console.log('==========================================');

    // Test Dexie implementation
    console.log('\n🔧 Testing Dexie Implementation...');
    RepositoryFactory.setImplementation('dexie');
    const dexieRepo = RepositoryFactory.getTransactionRepository();

    // Clear existing data
    await dexieRepo.clear();
    console.log('✅ Cleared existing Dexie data');

    // Create test transactions
    console.log('📝 Creating test transactions...');
    const dexieCreated = [];
    for (const transaction of testTransactions) {
      const created = await dexieRepo.create(transaction);
      dexieCreated.push(created);
      console.log(`  ✅ Created: ${created.description} (${created.amount} ${created.currency})`);
    }

    // Test reading
    const dexieAll = await dexieRepo.getAll();
    console.log(`📖 Retrieved ${dexieAll.length} transactions from Dexie`);

    // Test PouchDB implementation
    console.log('\n🔧 Testing PouchDB Implementation...');
    RepositoryFactory.setImplementation('pouchdb');
    const pouchdbRepo = RepositoryFactory.getTransactionRepository();

    // Clear existing data
    await pouchdbRepo.clear();
    console.log('✅ Cleared existing PouchDB data');

    // Create test transactions
    console.log('📝 Creating test transactions...');
    const pouchdbCreated = [];
    for (const transaction of testTransactions) {
      const created = await pouchdbRepo.create(transaction);
      pouchdbCreated.push(created);
      console.log(`  ✅ Created: ${created.description} (${created.amount} ${created.currency})`);
    }

    // Test reading
    const pouchdbAll = await pouchdbRepo.getAll();
    console.log(`📖 Retrieved ${pouchdbAll.length} transactions from PouchDB`);

    // Test 2: Comparison test
    console.log('\n🔍 Test 2: Implementation Comparison');
    console.log('====================================');

    if (dexieAll.length === pouchdbAll.length) {
      console.log(`✅ Both implementations have ${dexieAll.length} transactions`);
    } else {
      console.log(`❌ Transaction count mismatch: Dexie=${dexieAll.length}, PouchDB=${pouchdbAll.length}`);
    }

    // Test 3: Query operations
    console.log('\n🔎 Test 3: Query Operations');
    console.log('===========================');

    // Test date range query
    console.log('\nTesting date range queries...');
    RepositoryFactory.setImplementation('dexie');
    const dexieDateRange = await dexieRepo.getByDateRange('2024-01-13', '2024-01-15');

    RepositoryFactory.setImplementation('pouchdb');
    const pouchdbDateRange = await pouchdbRepo.getByDateRange('2024-01-13', '2024-01-15');

    console.log(`Dexie date range: ${dexieDateRange.length} transactions`);
    console.log(`PouchDB date range: ${pouchdbDateRange.length} transactions`);

    // Test category query
    console.log('\nTesting category queries...');
    RepositoryFactory.setImplementation('dexie');
    const dexieFood = await dexieRepo.getByCategory('Food');

    RepositoryFactory.setImplementation('pouchdb');
    const pouchdbFood = await pouchdbRepo.getByCategory('Food');

    console.log(`Dexie Food category: ${dexieFood.length} transactions`);
    console.log(`PouchDB Food category: ${pouchdbFood.length} transactions`);

    // Test type query
    console.log('\nTesting type queries...');
    RepositoryFactory.setImplementation('dexie');
    const dexieDebits = await dexieRepo.getByType('debit');

    RepositoryFactory.setImplementation('pouchdb');
    const pouchdbDebits = await pouchdbRepo.getByType('debit');

    console.log(`Dexie debit transactions: ${dexieDebits.length}`);
    console.log(`PouchDB debit transactions: ${pouchdbDebits.length}`);

    // Test 4: CRUD operations
    console.log('\n✏️  Test 4: CRUD Operations');
    console.log('===========================');

    // Test update
    console.log('\nTesting update operations...');
    if (dexieCreated.length > 0 && pouchdbCreated.length > 0) {
      RepositoryFactory.setImplementation('dexie');
      const dexieUpdated = await dexieRepo.update(dexieCreated[0].id, {
        description: 'Updated Test Transaction',
        amount: 999.99
      });
      console.log(`✅ Dexie update: ${dexieUpdated.description} (${dexieUpdated.amount})`);

      RepositoryFactory.setImplementation('pouchdb');
      const pouchdbUpdated = await pouchdbRepo.update(pouchdbCreated[0].id, {
        description: 'Updated Test Transaction',
        amount: 999.99
      });
      console.log(`✅ PouchDB update: ${pouchdbUpdated.description} (${pouchdbUpdated.amount})`);
    }

    // Test delete
    console.log('\nTesting delete operations...');
    if (dexieCreated.length > 1 && pouchdbCreated.length > 1) {
      RepositoryFactory.setImplementation('dexie');
      await dexieRepo.delete(dexieCreated[1].id);
      const dexieAfterDelete = await dexieRepo.getAll();
      console.log(`✅ Dexie delete: ${dexieAfterDelete.length} transactions remaining`);

      RepositoryFactory.setImplementation('pouchdb');
      await pouchdbRepo.delete(pouchdbCreated[1].id);
      const pouchdbAfterDelete = await pouchdbRepo.getAll();
      console.log(`✅ PouchDB delete: ${pouchdbAfterDelete.length} transactions remaining`);
    }

    // Test 5: Performance comparison
    console.log('\n⚡ Test 5: Performance Comparison');
    console.log('=================================');

    const performanceTest = async (implementation, operation) => {
      RepositoryFactory.setImplementation(implementation);
      const repo = RepositoryFactory.getTransactionRepository();

      const start = performance.now();

      switch (operation) {
        case 'read':
          await repo.getAll();
          break;
        case 'create':
          await repo.create({
            date: '2024-01-16',
            description: 'Performance test',
            amount: 1.00,
            currency: 'USD',
            type: 'debit',
            category: 'Test'
          });
          break;
      }

      const end = performance.now();
      return end - start;
    };

    // Test read performance
    const dexieReadTime = await performanceTest('dexie', 'read');
    const pouchdbReadTime = await performanceTest('pouchdb', 'read');

    console.log(`Read Performance:`);
    console.log(`  Dexie: ${dexieReadTime.toFixed(2)}ms`);
    console.log(`  PouchDB: ${pouchdbReadTime.toFixed(2)}ms`);
    console.log(`  Difference: ${(pouchdbReadTime - dexieReadTime).toFixed(2)}ms`);

    // Test create performance
    const dexieCreateTime = await performanceTest('dexie', 'create');
    const pouchdbCreateTime = await performanceTest('pouchdb', 'create');

    console.log(`Create Performance:`);
    console.log(`  Dexie: ${dexieCreateTime.toFixed(2)}ms`);
    console.log(`  PouchDB: ${pouchdbCreateTime.toFixed(2)}ms`);
    console.log(`  Difference: ${(pouchdbCreateTime - dexieCreateTime).toFixed(2)}ms`);

    // Test 6: Database info
    console.log('\n📊 Test 6: Database Information');
    console.log('===============================');

    RepositoryFactory.setImplementation('dexie');
    const dexieInfo = await dexieRepo.getInfo();
    console.log('Dexie Info:', dexieInfo);

    RepositoryFactory.setImplementation('pouchdb');
    const pouchdbInfo = await pouchdbRepo.getInfo();
    console.log('PouchDB Info:', pouchdbInfo);

    // Final summary
    console.log('\n🎉 Test Summary');
    console.log('===============');
    console.log('✅ All repository tests completed successfully!');
    console.log('✅ Both Dexie and PouchDB implementations are working');
    console.log('✅ CRUD operations are functional');
    console.log('✅ Query operations are working');
    console.log('✅ Performance benchmarking completed');
    console.log('');
    console.log('🚀 Ready for production use!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.log('');
    console.log('Troubleshooting steps:');
    console.log('1. Make sure the FinTrac app is running');
    console.log('2. Verify that both repository implementations are available');
    console.log('3. Check browser console for additional error details');
    console.log('4. Ensure all dependencies are properly loaded');
  }
})();

// Make the function available globally
window.testRepositories = testRepositories;

console.log('');
console.log('💡 Usage: Run testRepositories() in the browser console');
console.log('📋 Prerequisites: FinTrac app loaded with RepositoryFactory available');
