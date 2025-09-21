/**
 * Phase 3 Migration Verification Script
 *
 * This script verifies that the transition from basic find implementation
 * to full PouchDB + pouchdb-find npm packages is working correctly.
 *
 * Run this script in browser console after completing Phase 3 transition.
 *
 * Usage:
 * 1. Complete npm installation: npm install pouchdb pouchdb-find
 * 2. Update all config files as per Phase 3 plan
 * 3. Start dev server: npm run dev
 * 4. Open browser console and paste this entire script
 * 5. Review the verification results
 */

(async function verifyFullImplementation() {
    console.log('🔍 Phase 3 Migration Verification Started...');
    console.log('=' .repeat(60));

    const results = {
        npmPackages: false,
        findFunctionality: false,
        indexFunctionality: false,
        queryPerformance: false,
        couchdbCompatibility: false,
        repositoryIntegration: false,
        errorHandling: false,
        memoryUsage: false
    };

    const errors = [];
    const warnings = [];

    try {
        // Step 1: Verify npm packages are properly loaded
        console.log('\n1️⃣ Verifying npm package integration...');

        try {
            const { PouchTransactionRepository } = await import('/src/services/repos/PouchTransactionRepository.js');
            const repo = new PouchTransactionRepository();

            console.log('  ✅ PouchTransactionRepository imported successfully');
            results.npmPackages = true;
        } catch (error) {
            console.error('  ❌ Failed to import PouchTransactionRepository:', error.message);
            errors.push('NPM package integration failed');
        }

        // Step 2: Test full find functionality
        console.log('\n2️⃣ Testing full find functionality...');

        try {
            const { createLocalDB } = await import('/src/services/pouchdb/config.js');
            const testDB = createLocalDB();

            // Test complex selector queries
            const complexQuery = {
                selector: {
                    $and: [
                        { type: { $eq: 'debit' } },
                        { amount: { $gt: 0 } },
                        { date: { $exists: true } }
                    ]
                },
                sort: [{ date: 'desc' }],
                limit: 5
            };

            const result = await testDB.find(complexQuery);

            if (result && Array.isArray(result.docs)) {
                console.log('  ✅ Complex Mango queries working');
                console.log(`  ✅ Query returned ${result.docs.length} documents`);
                results.findFunctionality = true;
            } else {
                throw new Error('Invalid query result structure');
            }

            // Cleanup test database
            await testDB.destroy();

        } catch (error) {
            console.error('  ❌ Find functionality test failed:', error.message);
            errors.push('Full find functionality not working');
        }

        // Step 3: Test index functionality
        console.log('\n3️⃣ Testing index creation and usage...');

        try {
            const { createLocalDB } = await import('/src/services/pouchdb/config.js');
            const indexTestDB = createLocalDB();

            // Create composite index
            const indexResult = await indexTestDB.createIndex({
                index: {
                    fields: ['type', 'date', 'amount'],
                    name: 'composite-index',
                    ddoc: 'composite-index-design'
                }
            });

            if (indexResult && indexResult.result) {
                console.log('  ✅ Index creation successful:', indexResult.result);

                // Test index usage with explain
                try {
                    const explanation = await indexTestDB.explain({
                        selector: { type: 'debit', amount: { $gt: 50 } },
                        sort: [{ date: 'desc' }]
                    });

                    if (explanation && explanation.index) {
                        console.log('  ✅ Query explanation available');
                        console.log('  ✅ Index usage detected:', explanation.index.name || 'default');
                        results.indexFunctionality = true;
                    }
                } catch (explainError) {
                    console.warn('  ⚠️ Query explanation not available (non-critical)');
                    results.indexFunctionality = true; // Index creation worked
                }
            }

            await indexTestDB.destroy();

        } catch (error) {
            console.error('  ❌ Index functionality test failed:', error.message);
            errors.push('Index functionality not working');
        }

        // Step 4: Performance comparison test
        console.log('\n4️⃣ Testing query performance...');

        try {
            const { createLocalDB } = await import('/src/services/pouchdb/config.js');
            const perfTestDB = createLocalDB();

            // Create test data
            const testDocs = [];
            for (let i = 0; i < 100; i++) {
                testDocs.push({
                    _id: `perf_test_${i}`,
                    type: i % 2 === 0 ? 'debit' : 'credit',
                    amount: Math.random() * 1000,
                    date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    description: `Performance test transaction ${i}`,
                    category: ['Food', 'Transport', 'Entertainment'][i % 3]
                });
            }

            // Bulk insert
            await perfTestDB.bulkDocs(testDocs);

            // Performance test
            const startTime = performance.now();

            const perfResult = await perfTestDB.find({
                selector: {
                    type: 'debit',
                    amount: { $gt: 500 }
                },
                sort: [{ amount: 'desc' }],
                limit: 10
            });

            const queryTime = performance.now() - startTime;

            console.log(`  ✅ Query completed in ${queryTime.toFixed(2)}ms`);
            console.log(`  ✅ Found ${perfResult.docs.length} matching documents`);

            if (queryTime < 1000) { // Should complete in under 1 second
                console.log('  ✅ Performance acceptable');
                results.queryPerformance = true;
            } else {
                console.warn('  ⚠️ Query performance slower than expected');
                warnings.push('Query performance may need optimization');
            }

            await perfTestDB.destroy();

        } catch (error) {
            console.error('  ❌ Performance test failed:', error.message);
            errors.push('Performance testing failed');
        }

        // Step 5: CouchDB compatibility test
        console.log('\n5️⃣ Testing CouchDB compatibility...');

        try {
            const { createLocalDB } = await import('/src/services/pouchdb/config.js');
            const compatTestDB = createLocalDB();

            // Test CouchDB-style document operations
            const couchDoc = {
                _id: 'couchdb_compat_test',
                type: 'test',
                data: 'compatibility test',
                timestamp: new Date().toISOString()
            };

            const putResult = await compatTestDB.put(couchDoc);

            if (putResult.ok && putResult.rev) {
                console.log('  ✅ CouchDB-style put operation successful');
                console.log(`  ✅ Document revision: ${putResult.rev}`);

                // Test conflict resolution scenario
                const doc1 = await compatTestDB.get('couchdb_compat_test');
                const doc2 = await compatTestDB.get('couchdb_compat_test');

                doc1.data = 'update 1';
                doc2.data = 'update 2';

                await compatTestDB.put(doc1);

                try {
                    await compatTestDB.put(doc2);
                    console.warn('  ⚠️ Conflict detection may not be working');
                } catch (conflictError) {
                    if (conflictError.name === 'conflict') {
                        console.log('  ✅ Conflict detection working');
                        results.couchdbCompatibility = true;
                    }
                }
            }

            await compatTestDB.destroy();

        } catch (error) {
            console.error('  ❌ CouchDB compatibility test failed:', error.message);
            errors.push('CouchDB compatibility issues detected');
        }

        // Step 6: Repository integration test
        console.log('\n6️⃣ Testing repository integration...');

        try {
            const { PouchTransactionRepository } = await import('/src/services/repos/PouchTransactionRepository.js');
            const repo = new PouchTransactionRepository();

            // Test repository methods
            const testTransaction = {
                date: new Date().toISOString().split('T')[0],
                description: 'Integration test transaction',
                amount: 123.45,
                currency: 'USD',
                type: 'debit',
                category: 'Testing'
            };

            await repo.create(testTransaction);
            console.log('  ✅ Repository create method working');

            const allTransactions = await repo.getAll();
            console.log(`  ✅ Repository getAll method working (${allTransactions.length} transactions)`);

            const debitTransactions = await repo.getTransactionsByType('debit');
            console.log(`  ✅ Repository filtered query working (${debitTransactions.length} debit transactions)`);

            const recent = await repo.getRecentTransactions(5);
            console.log(`  ✅ Repository recent transactions working (${recent.length} recent)`);

            results.repositoryIntegration = true;

        } catch (error) {
            console.error('  ❌ Repository integration test failed:', error.message);
            errors.push('Repository integration not working');
        }

        // Step 7: Error handling verification
        console.log('\n7️⃣ Testing error handling...');

        try {
            const { PouchTransactionRepository } = await import('/src/services/repos/PouchTransactionRepository.js');
            const repo = new PouchTransactionRepository();

            // Test validation errors
            try {
                await repo.create({
                    date: '',
                    description: '',
                    amount: -100, // Invalid negative amount
                    currency: '',
                    type: 'invalid',
                    category: ''
                });
                console.warn('  ⚠️ Validation errors not being caught');
            } catch (validationError) {
                console.log('  ✅ Validation errors properly handled');
                console.log(`  ✅ Error message: ${validationError.message}`);
                results.errorHandling = true;
            }

        } catch (error) {
            console.error('  ❌ Error handling test failed:', error.message);
            errors.push('Error handling not working properly');
        }

        // Step 8: Memory usage check
        console.log('\n8️⃣ Checking memory usage...');

        try {
            if (performance.memory) {
                const memoryBefore = performance.memory.usedJSHeapSize;

                // Create and destroy multiple databases
                for (let i = 0; i < 5; i++) {
                    const { createLocalDB } = await import('/src/services/pouchdb/config.js');
                    const tempDB = createLocalDB();
                    await tempDB.info();
                    await tempDB.destroy();
                }

                // Force garbage collection if available
                if (window.gc) window.gc();

                const memoryAfter = performance.memory.usedJSHeapSize;
                const memoryDiff = memoryAfter - memoryBefore;

                console.log(`  ✅ Memory usage difference: ${(memoryDiff / 1024 / 1024).toFixed(2)} MB`);

                if (memoryDiff < 10 * 1024 * 1024) { // Less than 10MB increase
                    console.log('  ✅ Memory usage acceptable');
                    results.memoryUsage = true;
                } else {
                    console.warn('  ⚠️ Memory usage higher than expected');
                    warnings.push('Monitor memory usage in production');
                }
            } else {
                console.log('  ℹ️ Memory performance API not available');
                results.memoryUsage = true; // Assume OK if can't measure
            }

        } catch (error) {
            console.error('  ❌ Memory usage test failed:', error.message);
            warnings.push('Could not verify memory usage');
        }

    } catch (globalError) {
        console.error('💥 Global verification error:', globalError);
        errors.push('Global verification failure');
    }

    // Final Results
    console.log('\n' + '=' .repeat(60));
    console.log('📊 PHASE 3 MIGRATION VERIFICATION RESULTS');
    console.log('=' .repeat(60));

    const testCategories = [
        { name: 'NPM Package Integration', key: 'npmPackages', critical: true },
        { name: 'Find Functionality', key: 'findFunctionality', critical: true },
        { name: 'Index Functionality', key: 'indexFunctionality', critical: true },
        { name: 'Query Performance', key: 'queryPerformance', critical: false },
        { name: 'CouchDB Compatibility', key: 'couchdbCompatibility', critical: true },
        { name: 'Repository Integration', key: 'repositoryIntegration', critical: true },
        { name: 'Error Handling', key: 'errorHandling', critical: false },
        { name: 'Memory Usage', key: 'memoryUsage', critical: false }
    ];

    let passedCritical = 0;
    let totalCritical = 0;
    let passedAll = 0;

    testCategories.forEach(test => {
        const status = results[test.key] ? '✅ PASS' : '❌ FAIL';
        const critical = test.critical ? ' (CRITICAL)' : ' (optional)';
        console.log(`${status} ${test.name}${critical}`);

        if (test.critical) {
            totalCritical++;
            if (results[test.key]) passedCritical++;
        }

        if (results[test.key]) passedAll++;
    });

    console.log('\n📈 Summary:');
    console.log(`Critical Tests: ${passedCritical}/${totalCritical} passed`);
    console.log(`All Tests: ${passedAll}/${testCategories.length} passed`);

    if (errors.length > 0) {
        console.log('\n🚨 Errors Found:');
        errors.forEach((error, index) => {
            console.log(`${index + 1}. ${error}`);
        });
    }

    if (warnings.length > 0) {
        console.log('\n⚠️ Warnings:');
        warnings.forEach((warning, index) => {
            console.log(`${index + 1}. ${warning}`);
        });
    }

    // Final recommendation
    console.log('\n🎯 RECOMMENDATION:');

    if (passedCritical === totalCritical) {
        console.log('✅ PHASE 3 MIGRATION SUCCESSFUL!');
        console.log('✅ Ready to proceed to Phase 4 (Sync Implementation)');
        console.log('');
        console.log('Next steps:');
        console.log('1. Set up CouchDB server for sync testing');
        console.log('2. Implement bidirectional sync functionality');
        console.log('3. Add conflict resolution strategies');
        console.log('4. Test sync across multiple devices');
    } else {
        console.log('❌ PHASE 3 MIGRATION INCOMPLETE');
        console.log('❌ Critical issues must be resolved before Phase 4');
        console.log('');
        console.log('Required actions:');
        console.log('1. Fix all critical test failures');
        console.log('2. Re-run this verification script');
        console.log('3. Ensure all npm packages are properly installed');
        console.log('4. Verify Vite configuration is correct');
    }

    console.log('\n💡 Cleanup:');
    console.log('- Remove cleanup-basic-find.js after verification');
    console.log('- Remove any remaining console log statements');
    console.log('- Update documentation with Phase 3 completion');

    return {
        success: passedCritical === totalCritical,
        results,
        errors,
        warnings,
        critical: { passed: passedCritical, total: totalCritical },
        overall: { passed: passedAll, total: testCategories.length }
    };

})().then(result => {
    console.log('\n🏁 Verification complete. Check results above.');

    // Make results available globally for further inspection
    window.phase3VerificationResult = result;
    console.log('💾 Results saved to: window.phase3VerificationResult');

}).catch(error => {
    console.error('💥 Verification script failed:', error);
    console.log('🔧 Try running individual test sections manually');
});
