# Browser Testing Guide for Phase 1 Implementation

## Overview
This guide provides step-by-step instructions for testing the Phase 1 (Foundation & Setup) implementation of the PouchDB + CouchDB migration. Phase 1 focuses on setting up the infrastructure without changing existing functionality.

## Prerequisites
- Development server running: `npm run dev`
- CouchDB server running: `npx pouchdb-server --port 5984`
- Browser with Developer Tools (F12)

## Step 1: Open the Application
Navigate to `http://localhost:5173/` in your browser.

## Step 2: Verify Basic App Functionality
**What to check:**
- ✅ App loads without errors (no blank screen, no error messages)
- ✅ Transaction form renders correctly (description, amount, type, category fields)
- ✅ Dashboard shows (balance, chart, transaction list)
- ✅ Can add new transactions (fill form, submit, see it appear in dashboard)
- ✅ All existing UI interactions work (form validation, chart rendering)

**Expected behavior:** The app should work exactly as it did before Phase 1 - no visual or functional changes.

## Step 3: Check Browser Console for PouchDB Loading
Open browser DevTools (F12) → Console tab.

**What to check:**
- ✅ No JavaScript errors on page load
- ✅ Look for any PouchDB-related warnings (should be none)
- ✅ Verify PouchDB is available globally

**Test in console:**
```javascript
// Test 1: Check PouchDB availability
console.log('PouchDB available:', typeof window.PouchDB !== 'undefined');
console.log('PouchDB version:', window.PouchDB?.version);
```

**Expected:** Should see "PouchDB available: true" and "PouchDB version: 9.0.0"

## Step 4: Test CouchDB Server Connection
**What to check:**
- ✅ CouchDB server is running (we verified this earlier)
- ✅ Browser can connect to CouchDB

**Test in console:**
```javascript
// Test 2: Test CouchDB connection
fetch('http://127.0.0.1:5984/')
  .then(response => response.json())
  .then(data => console.log('CouchDB response:', data))
  .catch(err => console.error('CouchDB connection failed:', err));

// Test 3: Test PouchDB remote connection
if (window.PouchDB) {
  const remoteDB = new window.PouchDB('http://127.0.0.1:5984/test-fintrac');
  console.log('Remote PouchDB instance created:', !!remoteDB);
}
```

**Expected:** Should see CouchDB welcome message (e.g., `{"couchdb":"Welcome","version":"..."}`) and "Remote PouchDB instance created: true"

## Step 5: Verify IndexedDB Storage
**What to check:**
- ✅ Browser supports IndexedDB
- ✅ PouchDB can create local databases

**Test in console:**
```javascript
// Test 4: Check IndexedDB support
console.log('IndexedDB supported:', !!window.indexedDB);

// Test 5: Test local PouchDB database creation
if (window.PouchDB) {
  const localDB = new window.PouchDB('fintrac-test');
  console.log('Local PouchDB database created:', !!localDB);
  
  // Clean up
  localDB.destroy().then(() => console.log('Test database cleaned up'));
}
```

**Expected:** Should see "IndexedDB supported: true", "Local PouchDB database created: true", and "Test database cleaned up"

## Step 6: Check Network Tab for PouchDB Assets
In DevTools → Network tab, refresh the page.

**What to check:**
- ✅ PouchDB CDN script loads successfully (look for `pouchdb.min.js` from `cdn.jsdelivr.net`)
- ✅ No failed network requests
- ✅ CDN script loads from: `https://cdn.jsdelivr.net/npm/pouchdb@9.0.0/dist/pouchdb.min.js`

## Step 7: Test Data Persistence
**What to check:**
- ✅ Data persists between browser refreshes
- ✅ IndexedDB storage is being used (check in DevTools → Application → IndexedDB)

**Test steps:**
1. Add a transaction
2. Refresh the page
3. Verify transaction still appears
4. Check DevTools → Application → IndexedDB → see if data is stored there

## Phase 1 Success Criteria Checklist

**All of these should be true for Phase 1 to be properly implemented:**

### ✅ Core Functionality
- [ ] App loads without errors
- [ ] All existing features work (add transactions, view dashboard)
- [ ] No breaking changes to UI/UX

### ✅ PouchDB Integration
- [ ] PouchDB library loads from CDN
- [ ] PouchDB available globally (`window.PouchDB`)
- [ ] Can create PouchDB instances (local and remote)
- [ ] No console errors related to PouchDB

### ✅ Infrastructure
- [ ] CouchDB server accessible from browser
- [ ] IndexedDB available and working
- [ ] Network requests to CouchDB succeed

### ✅ Development Experience
- [ ] Build process works (`npm run build`)
- [ ] Dev server starts without issues
- [ ] Hot reload still works
- [ ] No TypeScript compilation errors

## Common Issues to Watch For

### 🚨 Red Flags (Phase 1 Not Properly Implemented)
- **App doesn't load**: Blank screen or error messages
- **PouchDB CDN fails**: `window.PouchDB` is undefined or CDN script fails to load
- **CouchDB connection fails**: Network errors when testing server
- **TypeScript errors**: Build failures or red squiggles in IDE
- **Existing functionality broken**: Can't add transactions or view dashboard

### ✅ Green Flags (Phase 1 Successfully Implemented)
- **App works normally**: All existing features functional
- **PouchDB available**: Console confirms library loaded
- **Server connectivity**: Can reach CouchDB from browser
- **Clean console**: No JavaScript errors on load
- **Data persistence**: Transactions survive page refreshes

## Next Steps After Verification

Once you've confirmed Phase 1 is working:
1. **Document your findings** (what worked, any issues encountered)
2. **Proceed to Phase 2** when ready to implement PouchDB repositories
3. **Keep the dev server running** for ongoing development

## Troubleshooting

### If CouchDB server is not running:
```bash
# Kill any existing server
pkill -f pouchdb-server

# Start new server
npx pouchdb-server --port 5984 &
```

### If dev server is not running:
```bash
npm run dev
```

### If tests are failing:
```bash
npm run test:run
```

## Notes
- The Phase 1 implementation is complete when the app works exactly as before, but now has PouchDB infrastructure ready for the migration to CouchDB sync.
- PouchDB is now loaded via CDN instead of ES module imports for better compatibility with Vite.
- One test failure is expected: the PouchDB database creation test in jsdom (this is normal and not a real issue).
- All existing functionality should be preserved - Phase 1 is infrastructure-only.