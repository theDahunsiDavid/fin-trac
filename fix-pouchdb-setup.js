/**
 * PouchDB Setup Fix Script
 *
 * This script fixes the PouchDB find plugin issue by ensuring both PouchDB
 * and the find plugin are loaded and properly initialized.
 *
 * Usage:
 * 1. Copy this entire script
 * 2. Paste it into your browser console
 * 3. Press Enter to run
 * 4. Wait for "✅ PouchDB setup complete" message
 * 5. Re-run your tests
 */

(async function fixPouchDBSetup() {
    console.log('🔧 Starting PouchDB Setup Fix...');

    // Function to load a script dynamically
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Function to wait for a condition to be true
    function waitFor(condition, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();

            function check() {
                if (condition()) {
                    resolve(true);
                } else if (Date.now() - startTime > timeout) {
                    reject(new Error('Timeout waiting for condition'));
                } else {
                    setTimeout(check, 100);
                }
            }

            check();
        });
    }

    try {
        // Step 1: Check if PouchDB is available
        if (typeof window.PouchDB === 'undefined') {
            console.log('📦 Loading PouchDB...');
            await loadScript('https://cdn.jsdelivr.net/npm/pouchdb@9.0.0/dist/pouchdb.min.js');
            await waitFor(() => typeof window.PouchDB !== 'undefined');
            console.log('✅ PouchDB loaded');
        } else {
            console.log('✅ PouchDB already available');
        }

        // Step 2: Check if find plugin is available
        if (typeof window.PouchDBFind === 'undefined') {
            console.log('📦 Loading PouchDB Find plugin...');
            await loadScript('https://cdn.jsdelivr.net/npm/pouchdb-find@9.0.0/dist/pouchdb.find.min.js');
            await waitFor(() => typeof window.PouchDBFind !== 'undefined');
            console.log('✅ PouchDB Find plugin loaded');
        } else {
            console.log('✅ PouchDB Find plugin already available');
        }

        // Step 3: Initialize the find plugin
        if (typeof window.PouchDB.prototype.find !== 'function') {
            console.log('🔌 Initializing PouchDB Find plugin...');
            window.PouchDB.plugin(window.PouchDBFind);
            console.log('✅ PouchDB Find plugin initialized');
        } else {
            console.log('✅ PouchDB Find plugin already initialized');
        }

        // Step 4: Test the setup
        console.log('🧪 Testing PouchDB setup...');

        // Create a test database
        const testDB = new window.PouchDB('__setup_test__');

        // Test basic functionality
        await testDB.info();
        console.log('✅ Basic PouchDB functionality working');

        // Test find functionality
        if (typeof testDB.find === 'function') {
            await testDB.find({
                selector: { _id: { $exists: true } },
                limit: 1
            });
            console.log('✅ PouchDB find functionality working');
        } else {
            throw new Error('Find method not available on database instance');
        }

        // Test index creation
        if (typeof testDB.createIndex === 'function') {
            await testDB.createIndex({
                index: { fields: ['test_field'] }
            });
            console.log('✅ PouchDB createIndex functionality working');
        } else {
            throw new Error('createIndex method not available on database instance');
        }

        // Clean up test database
        await testDB.destroy();
        console.log('✅ Test database cleaned up');

        // Step 5: Display setup information
        console.log('\n📋 PouchDB Setup Summary:');
        console.log(`Version: ${window.PouchDB.version}`);
        console.log('Available methods:');
        console.log('  - find:', typeof window.PouchDB.prototype.find === 'function' ? '✅' : '❌');
        console.log('  - createIndex:', typeof window.PouchDB.prototype.createIndex === 'function' ? '✅' : '❌');

        console.log('\n🎉 PouchDB setup complete! You can now run your tests.');

        // Return success status
        return true;

    } catch (error) {
        console.error('❌ PouchDB setup failed:', error);
        console.log('\n🔧 Troubleshooting steps:');
        console.log('1. Make sure you have internet connection');
        console.log('2. Check if any ad blockers are blocking CDN requests');
        console.log('3. Try refreshing the page and running this script again');
        console.log('4. Check browser console for any additional errors');

        return false;
    }
})();

// Also export individual functions for manual use
window.fixPouchDBSetup = {
    // Quick check function
    check: function() {
        console.log('🔍 Checking PouchDB setup...');

        const checks = {
            pouchdb: typeof window.PouchDB !== 'undefined',
            findPlugin: typeof window.PouchDBFind !== 'undefined',
            findMethod: typeof window.PouchDB?.prototype?.find === 'function',
            createIndexMethod: typeof window.PouchDB?.prototype?.createIndex === 'function'
        };

        console.log('PouchDB available:', checks.pouchdb ? '✅' : '❌');
        console.log('Find plugin available:', checks.findPlugin ? '✅' : '❌');
        console.log('Find method available:', checks.findMethod ? '✅' : '❌');
        console.log('CreateIndex method available:', checks.createIndexMethod ? '✅' : '❌');

        const allGood = Object.values(checks).every(check => check);
        console.log('Overall status:', allGood ? '✅ Ready' : '❌ Needs fixing');

        return allGood;
    },

    // Force reinitialize
    reinit: function() {
        if (window.PouchDB && window.PouchDBFind) {
            window.PouchDB.plugin(window.PouchDBFind);
            console.log('✅ PouchDB Find plugin reinitialized');
            return this.check();
        } else {
            console.log('❌ Cannot reinitialize - plugins not loaded');
            return false;
        }
    },

    // Create test database
    test: async function() {
        try {
            const testDB = new window.PouchDB('__manual_test__');
            await testDB.info();
            await testDB.find({ selector: { _id: { $exists: true } }, limit: 1 });
            await testDB.createIndex({ index: { fields: ['test'] } });
            await testDB.destroy();
            console.log('✅ Manual test passed');
            return true;
        } catch (error) {
            console.error('❌ Manual test failed:', error);
            return false;
        }
    }
};

console.log('\n💡 Available manual commands:');
console.log('- fixPouchDBSetup.check() - Check current setup');
console.log('- fixPouchDBSetup.reinit() - Reinitialize find plugin');
console.log('- fixPouchDBSetup.test() - Run manual test');
