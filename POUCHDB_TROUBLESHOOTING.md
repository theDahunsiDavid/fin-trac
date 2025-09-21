# PouchDB Troubleshooting Guide

## Overview
This guide helps resolve common issues with the PouchDB Phase 2 implementation, specifically focusing on the "find is not a function" and "createIndex is not a function" errors.

## 🚨 Common Error: "db.find is not a function"

### **Root Cause**
The PouchDB find plugin is not loaded or not properly initialized. PouchDB core only includes basic CRUD operations. Advanced querying requires the `pouchdb-find` plugin.

### **Quick Fix**
Run this in your browser console:

```javascript
// Check if find plugin is available
console.log('PouchDB available:', typeof window.PouchDB);
console.log('Find plugin available:', typeof window.PouchDBFind);
console.log('Find method on prototype:', typeof window.PouchDB?.prototype?.find);

// If find plugin is available but not initialized
if (window.PouchDB && window.PouchDBFind && typeof window.PouchDB.prototype.find !== 'function') {
    window.PouchDB.plugin(window.PouchDBFind);
    console.log('✅ Find plugin initialized');
}
```

### **Permanent Fix**
1. **Update index.html** to include both scripts:
```html
<script src="https://cdn.jsdelivr.net/npm/pouchdb@9.0.0/dist/pouchdb.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/pouchdb-find@9.0.0/dist/pouchdb.find.min.js"></script>
<script>
    if (window.PouchDB && window.PouchDBFind) {
        window.PouchDB.plugin(window.PouchDBFind);
        console.log("📦 PouchDB with find plugin initialized");
    }
</script>
```

2. **Verify initialization** before running tests:
```javascript
// Run this before any PouchDB operations
if (typeof window.PouchDB?.prototype?.find !== 'function') {
    throw new Error('PouchDB find plugin not properly initialized');
}
```

## 🔧 Complete Setup Fix Script

Copy and paste this entire script into your browser console:

```javascript
/**
 * PouchDB Complete Setup Fix
 * This will load and initialize everything needed for Phase 2 testing
 */
(async function fixPouchDBSetup() {
    console.log('🔧 Starting PouchDB Setup Fix...');

    // Helper function to load scripts
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve(); // Already loaded
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Helper to wait for global variables
    function waitForGlobal(name, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const start = Date.now();
            function check() {
                if (window[name]) {
                    resolve(window[name]);
                } else if (Date.now() - start > timeout) {
                    reject(new Error(`Timeout waiting for ${name}`));
                } else {
                    setTimeout(check, 100);
                }
            }
            check();
        });
    }

    try {
        // 1. Load PouchDB if not available
        if (!window.PouchDB) {
            console.log('📦 Loading PouchDB...');
            await loadScript('https://cdn.jsdelivr.net/npm/pouchdb@9.0.0/dist/pouchdb.min.js');
            await waitForGlobal('PouchDB');
            console.log('✅ PouchDB loaded');
        }

        // 2. Load find plugin if not available
        if (!window.PouchDBFind) {
            console.log('📦 Loading PouchDB Find plugin...');
            await loadScript('https://cdn.jsdelivr.net/npm/pouchdb-find@9.0.0/dist/pouchdb.find.min.js');
            await waitForGlobal('PouchDBFind');
            console.log('✅ PouchDB Find plugin loaded');
        }

        // 3. Initialize find plugin
        if (typeof window.PouchDB.prototype.find !== 'function') {
            console.log('🔌 Initializing find plugin...');
            window.PouchDB.plugin(window.PouchDBFind);
            console.log('✅ Find plugin initialized');
        }

        // 4. Test functionality
        console.log('🧪 Testing setup...');
        const testDB = new window.PouchDB('__setup_test__');
        
        // Test basic operations
        await testDB.info();
        
        // Test find
        await testDB.find({ selector: { _id: { $exists: true } }, limit: 1 });
        
        // Test indexing
        await testDB.createIndex({ index: { fields: ['test'] } });
        
        // Cleanup
        await testDB.destroy();

        console.log('🎉 PouchDB setup complete! You can now run tests.');
        return true;

    } catch (error) {
        console.error('❌ Setup failed:', error);
        return false;
    }
})();
```

## 📋 Step-by-Step Troubleshooting

### Step 1: Check Current State
```javascript
// Run this to see what's currently loaded
console.log('=== PouchDB Setup Check ===');
console.log('PouchDB available:', typeof window.PouchDB !== 'undefined');
console.log('PouchDB version:', window.PouchDB?.version);
console.log('PouchDBFind available:', typeof window.PouchDBFind !== 'undefined');
console.log('find method:', typeof window.PouchDB?.prototype?.find);
console.log('createIndex method:', typeof window.PouchDB?.prototype?.createIndex);
```

### Step 2: Manual Plugin Loading
If plugins aren't loaded, add them manually:

```javascript
// Load find plugin manually
const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/pouchdb-find@9.0.0/dist/pouchdb.find.min.js';
script.onload = function() {
    // Initialize plugin when loaded
    if (window.PouchDB && window.PouchDBFind) {
        window.PouchDB.plugin(window.PouchDBFind);
        console.log('✅ Find plugin loaded and initialized');
    }
};
document.head.appendChild(script);
```

### Step 3: Test Database Operations
```javascript
// Test if everything works
async function testPouchDB() {
    try {
        const db = new window.PouchDB('test-db');
        
        // Test basic functionality
        const info = await db.info();
        console.log('✅ Basic PouchDB working:', info.db_name);
        
        // Test find functionality
        const findResult = await db.find({
            selector: { _id: { $exists: true } },
            limit: 1
        });
        console.log('✅ Find working, docs found:', findResult.docs.length);
        
        // Test index creation
        await db.createIndex({
            index: { fields: ['testField'] }
        });
        console.log('✅ Index creation working');
        
        // Cleanup
        await db.destroy();
        console.log('✅ All tests passed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testPouchDB();
```

## 🔍 Common Issues and Solutions

### Issue: "Script blocked by CORS policy"
**Solution:** The CDN scripts might be blocked. Try these alternatives:

1. **Use different CDN:**
```javascript
// Try unpkg instead of jsdelivr
const script = document.createElement('script');
script.src = 'https://unpkg.com/pouchdb@9.0.0/dist/pouchdb.min.js';
document.head.appendChild(script);
```

2. **Download and serve locally:**
```bash
# Download files and serve from your project
curl -o public/pouchdb.min.js https://cdn.jsdelivr.net/npm/pouchdb@9.0.0/dist/pouchdb.min.js
curl -o public/pouchdb.find.min.js https://cdn.jsdelivr.net/npm/pouchdb-find@9.0.0/dist/pouchdb.find.min.js
```

### Issue: "Plugin not initializing"
**Solution:** Ensure proper order and timing:

```javascript
// Correct initialization order
async function initPouchDB() {
    // Wait for both scripts to load
    while (!window.PouchDB || !window.PouchDBFind) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Initialize plugin
    window.PouchDB.plugin(window.PouchDBFind);
    
    // Verify initialization
    const testDB = new window.PouchDB('verify-init');
    if (typeof testDB.find !== 'function') {
        throw new Error('Plugin initialization failed');
    }
    await testDB.destroy();
    
    console.log('✅ PouchDB properly initialized');
}
```

### Issue: "Tests still failing after setup"
**Solutions:**

1. **Clear browser cache** and refresh page
2. **Clear IndexedDB** data:
```javascript
// Clear all IndexedDB data
indexedDB.deleteDatabase('fintrac');
indexedDB.deleteDatabase('_pouch_fintrac');
```

3. **Restart dev server:**
```bash
# Kill and restart
pkill -f "npm run dev"
npm run dev
```

## 🎯 Verification Checklist

Before running Phase 2 tests, verify:

- [ ] `window.PouchDB` is defined
- [ ] `window.PouchDBFind` is defined  
- [ ] `window.PouchDB.prototype.find` is a function
- [ ] `window.PouchDB.prototype.createIndex` is a function
- [ ] Can create database: `new window.PouchDB('test')`
- [ ] Can run find query: `db.find({selector: {_id: {$exists: true}}})`
- [ ] Can create index: `db.createIndex({index: {fields: ['test']}})`

## 🔄 Quick Reset Commands

```javascript
// Complete reset - run these in order
localStorage.clear();
sessionStorage.clear();
indexedDB.deleteDatabase('fintrac');
indexedDB.deleteDatabase('_pouch_fintrac');
// Then refresh page
location.reload();
```

## 📞 Getting Help

If you're still having issues:

1. **Check browser console** for detailed error messages
2. **Verify internet connection** and CDN accessibility
3. **Try different browser** (Chrome, Firefox, Edge)
4. **Check DevTools → Network** tab for failed script loads
5. **Copy exact error messages** for better troubleshooting

## 🚀 Success Indicators

When everything is working, you should see:

```
✅ PouchDB setup verification passed
✅ Smoke Test PASSED
✅ All tests passed! Phase 2 is working correctly.
```

In DevTools → Application → IndexedDB, you should see:
- `fintrac` database with documents
- Transaction documents with IDs like `transaction:...`
- Category documents with IDs like `category:...`

## 📚 Additional Resources

- [PouchDB Find Plugin Documentation](https://pouchdb.com/guides/mango-queries.html)
- [PouchDB API Reference](https://pouchdb.com/api.html)
- [IndexedDB Browser Support](https://caniuse.com/indexeddb)
- [Mango Query Syntax](https://docs.couchdb.org/en/stable/api/database/find.html)