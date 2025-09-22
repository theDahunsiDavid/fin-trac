# FinTrac CouchDB Sync Test Guide

This guide provides step-by-step instructions to test the CouchDB sync implementation for FinTrac.

## Prerequisites

Before testing, ensure you have:
1. **Node.js and npm** installed
2. **CouchDB server** running (local or remote)
3. **FinTrac app** set up with dependencies installed

## Test Environment Setup

### 1. Install and Start CouchDB

#### Option A: Docker (Recommended)
```bash
# Start CouchDB with Docker
docker run -d \
  --name fintrac-couchdb \
  -p 5984:5984 \
  -e COUCHDB_USER=admin \
  -e COUCHDB_PASSWORD=password \
  -e COUCHDB_SECRET=mysecret \
  couchdb:3

# Wait for CouchDB to initialize
sleep 10

# Verify CouchDB is running
curl http://localhost:5984/

# Test admin access
curl http://admin:password@localhost:5984/_up
```

#### Option B: System Installation (Arch Linux)
```bash
# Install CouchDB
sudo pacman -S couchdb

# Start CouchDB service
sudo systemctl start couchdb
sudo systemctl enable couchdb

# Verify installation
curl http://localhost:5984/
```

### 2. Configure CORS for Browser Access

```bash
# Enable CORS for browser connections (correct method)
curl -X PUT http://admin:password@localhost:5984/_node/_local/_config/chttpd/enable_cors -d '"true"'
curl -X PUT http://admin:password@localhost:5984/_node/_local/_config/cors/origins -d '"*"'
curl -X PUT http://admin:password@localhost:5984/_node/_local/_config/cors/credentials -d '"true"'
curl -X PUT http://admin:password@localhost:5984/_node/_local/_config/cors/methods -d '"GET, PUT, POST, HEAD, DELETE"'
curl -X PUT http://admin:password@localhost:5984/_node/_local/_config/cors/headers -d '"accept, authorization, content-type, origin, referer, x-csrf-token"'
```

### 3. Create Test Database

```bash
# Create the fintrac database
curl -X PUT http://admin:password@localhost:5984/fintrac-test

# Verify database creation
curl http://admin:password@localhost:5984/fintrac-test
```

## FinTrac Configuration

### 1. Environment Variables

Create `.env.development` in the project root:

```env
# Enable sync functionality
VITE_SYNC_ENABLED=true

# CouchDB configuration
VITE_COUCHDB_URL=http://localhost:5984
VITE_COUCHDB_DATABASE=fintrac-test
VITE_COUCHDB_USERNAME=admin
VITE_COUCHDB_PASSWORD=password

# Sync settings
VITE_SYNC_INTERVAL=10000
VITE_SYNC_BATCH_SIZE=10
VITE_SYNC_AUTO_START=false
```

### 2. Start Development Server

```bash
cd fin-trac
npm install
npm run dev
```

The app should start at `http://localhost:5173`.

## Testing Procedure

### Phase 1: Basic Sync Setup

#### Test 1: Sync Service Initialization

1. **Open the app** in your browser
2. **Check the sync components** appear on the dashboard
3. **Verify sync status** shows:
   - "Sync Status: Connected" or "Initializing..."
   - CouchDB URL and database name visible

**Expected Result**: Sync components display without errors, showing connection status.

#### Test 2: Connection Verification

1. **Click "Test Connection"** in sync controls
2. **Wait for result** (should show "Connection OK")
3. **Check browser console** for any error messages

**Expected Result**: Connection test passes, no console errors.

### Phase 2: Manual Sync Testing

#### Test 3: Create Test Transactions

1. **Add 3-5 transactions** using the app:
   - Mix of credit and debit transactions
   - Different categories and amounts
   - Use various dates

2. **Verify transactions** appear in the app's transaction list

**Expected Result**: Transactions are created and visible in the local app.

#### Test 4: Manual Sync Upload

1. **Click "Sync Now"** in sync controls
2. **Observe sync progress**:
   - Progress bar should appear
   - Documents uploaded count should increase
   - Status should show "Syncing..." then "Connected"

**Expected Result**: 
- Sync completes successfully
- Progress shows X/X documents (100%)
- No error messages

#### Test 5: Verify Data in CouchDB

```bash
# Check documents in CouchDB
curl http://admin:password@localhost:5984/fintrac-test/_all_docs?include_docs=true

# Count documents
curl http://admin:password@localhost:5984/fintrac-test
```

**Expected Result**: 
- CouchDB contains documents with IDs like `transaction:UUID`
- Document count matches the number of transactions created
- Each document has proper structure with `type` and `data` fields

### Phase 3: Advanced Sync Testing

#### Test 6: Incremental Sync

1. **Add 2 more transactions** to the app
2. **Click "Sync Now"** again
3. **Verify only new transactions** are synced

**Expected Result**: 
- Only 2 documents are uploaded in the second sync
- Total documents in CouchDB = initial + 2

#### Test 7: Auto-Sync Testing

1. **Click "Auto Sync"** to enable automatic syncing
2. **Add a transaction**
3. **Wait 10 seconds** (based on VITE_SYNC_INTERVAL)
4. **Check CouchDB** for the new transaction

**Expected Result**: 
- Auto-sync uploads the transaction automatically
- Sync status updates periodically

#### Test 8: Error Handling

1. **Stop CouchDB** temporarily:
   ```bash
   docker stop fintrac-couchdb
   # OR
   sudo systemctl stop couchdb
   ```

2. **Try to sync** in the app
3. **Observe error handling**
4. **Restart CouchDB** and test reconnection

**Expected Result**: 
- App shows connection error
- Sync fails gracefully with error message
- After restart, connection recovers

**To restart CouchDB:**
```bash
docker start fintrac-couchdb
# OR
sudo systemctl start couchdb
```

### Phase 4: Data Validation

#### Test 9: Document Structure Validation

Check that synced documents have the correct structure:

```bash
# Get a specific transaction document
curl http://admin:password@localhost:5984/fintrac-test/transaction:YOUR_TRANSACTION_ID
```

**Expected Structure**:
```json
{
  "_id": "transaction:550e8400-e29b-41d4-a716-446655440000",
  "_rev": "1-abc123...",
  "type": "transaction",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "date": "2024-01-15T00:00:00.000Z",
    "description": "Test Transaction",
    "amount": 25.50,
    "currency": "USD",
    "type": "debit",
    "category": "Food",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Test 10: Performance Testing

1. **Create 50+ transactions** (use bulk creation if available)
2. **Sync all transactions**
3. **Monitor performance**:
   - Sync completion time
   - Browser responsiveness
   - Memory usage

**Expected Result**: 
- Sync completes within reasonable time (< 30 seconds for 50 transactions)
- UI remains responsive during sync
- No memory leaks or crashes

## Complete Working Setup Script

Here's a complete script that includes all the commands that actually worked:

```bash
#!/bin/bash

echo "Setting up CouchDB for FinTrac sync testing..."

# Clean up any existing container
docker stop fintrac-couchdb 2>/dev/null || true
docker rm fintrac-couchdb 2>/dev/null || true

# Start CouchDB with proper admin setup
docker run -d \
  --name fintrac-couchdb \
  -p 5984:5984 \
  -e COUCHDB_USER=admin \
  -e COUCHDB_PASSWORD=password \
  -e COUCHDB_SECRET=mysecret \
  couchdb:3

echo "Waiting for CouchDB to start..."
sleep 20

# Test if admin access works
if curl -f -s http://admin:password@localhost:5984/_up >/dev/null; then
    echo "✅ Admin access working!"
else
    echo "❌ Admin access failed, please check container logs: docker logs fintrac-couchdb"
    exit 1
fi

# Configure CORS (corrected commands)
echo "Configuring CORS..."
curl -X PUT http://admin:password@localhost:5984/_node/_local/_config/chttpd/enable_cors -d '"true"'
curl -X PUT http://admin:password@localhost:5984/_node/_local/_config/cors/origins -d '"*"'
curl -X PUT http://admin:password@localhost:5984/_node/_local/_config/cors/credentials -d '"true"'
curl -X PUT http://admin:password@localhost:5984/_node/_local/_config/cors/methods -d '"GET, PUT, POST, HEAD, DELETE"'
curl -X PUT http://admin:password@localhost:5984/_node/_local/_config/cors/headers -d '"accept, authorization, content-type, origin, referer, x-csrf-token"'

# Create test database
echo "Creating test database..."
curl -X PUT http://admin:password@localhost:5984/fintrac-test

echo "✅ CouchDB setup complete!"
echo "🌐 Fauxton UI: http://localhost:5984/_utils"
echo "👤 Username: admin"
echo "🔑 Password: password"
echo "🗄️  Test Database: fintrac-test"
```

Save this as `setup-couchdb.sh`, make it executable, and run:

```bash
chmod +x setup-couchdb.sh
./setup-couchdb.sh
```

## Troubleshooting Common Issues

### Issue 1: "Sync Not Configured"

**Symptoms**: Sync components show configuration error
**Solution**: 
- Verify `.env.development` file exists
- Check `VITE_SYNC_ENABLED=true`
- Restart development server

### Issue 2: Connection Failed

**Symptoms**: "Not connected to CouchDB" message
**Solutions**:
- Verify CouchDB is running: `curl http://localhost:5984/`
- Check CORS configuration with corrected commands (see setup script above)
- Verify credentials in environment variables
- Check browser console for detailed errors

### Issue 3: Sync Errors

**Symptoms**: Sync fails with error messages
**Solutions**:
- Check CouchDB logs: `docker logs fintrac-couchdb`
- Verify database exists
- Check network connectivity
- Clear browser cache and localStorage

### Issue 4: Documents Not Appearing

**Symptoms**: Sync appears successful but documents missing in CouchDB
**Solutions**:
- Check document IDs in CouchDB: `curl http://admin:password@localhost:5984/fintrac-test/_all_docs`
- Verify batch size settings
- Check for permission issues

## Test Checklist

Use this checklist to verify all features work correctly:

- [ ] Sync service initializes without errors
- [ ] Connection test passes
- [ ] Manual sync uploads transactions
- [ ] Progress tracking works correctly
- [ ] Documents appear in CouchDB with correct structure
- [ ] Incremental sync only uploads new/modified documents
- [ ] Auto-sync works with configured interval
- [ ] Error handling works when CouchDB is unavailable
- [ ] Sync recovery works after connection restoration
- [ ] Performance is acceptable with multiple transactions
- [ ] UI remains responsive during sync operations
- [ ] No console errors or warnings
- [ ] localStorage sync metadata is maintained

## Success Criteria

The sync implementation is successful if:

1. **All manual tests pass** without errors
2. **Documents sync reliably** to CouchDB
3. **Performance is acceptable** for typical usage
4. **Error handling is robust** and user-friendly
5. **UI provides clear feedback** about sync status
6. **Data integrity is maintained** in both local and remote storage

## Next Steps

After successful testing:

1. **Document any issues** found during testing
2. **Plan Phase 2 implementation** (bidirectional sync)
3. **Consider production deployment** requirements
4. **Set up monitoring** for sync operations
5. **Create user documentation** for sync features

## Test Data Cleanup

After testing, clean up test data:

```bash
# Delete test database
curl -X DELETE http://admin:password@localhost:5984/fintrac-test

# Stop test CouchDB container
docker stop fintrac-couchdb
docker rm fintrac-couchdb

# Clear browser localStorage
# In browser console: localStorage.clear()
```

## Support and Issues

If you encounter issues during testing:

1. **Check browser console** for detailed error messages
2. **Review CouchDB logs** for server-side issues
3. **Verify environment configuration** matches this guide
4. **Test with curl** to isolate network/auth issues
5. **Check the sync service code** in `src/services/sync/`

Remember: This is Phase 1 (one-way sync). Future phases will add bidirectional sync and conflict resolution.