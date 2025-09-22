# FinTrac CouchDB Sync Setup Guide

This guide walks you through setting up the custom CouchDB synchronization for FinTrac, enabling one-way sync from your local Dexie database to a CouchDB server.

## Overview

The FinTrac sync implementation provides:
- **One-way sync**: Local Dexie → CouchDB (Phase 1)
- **Offline-first**: Full functionality without internet connection
- **Manual and automatic sync**: Control when data is synchronized
- **Progress tracking**: Real-time sync status and progress
- **Error handling**: Robust error handling with retry logic

## Prerequisites

1. **CouchDB Server**: You need access to a CouchDB instance
2. **CORS Enabled**: CouchDB must allow browser connections
3. **Database Access**: Ability to create/access databases

## CouchDB Setup

### Option 1: Local CouchDB (Development)

1. **Install CouchDB**:
   ```bash
   # Using Docker (recommended)
   docker run -d --name couchdb -p 5984:5984 -e COUCHDB_USER=admin -e COUCHDB_PASSWORD=password couchdb:3

   # Or install directly (Arch Linux)
   sudo pacman -S couchdb
   sudo systemctl start couchdb
   sudo systemctl enable couchdb
   ```

2. **Enable CORS**:
   ```bash
   # Configure CORS for browser access
   curl -X PUT http://admin:password@localhost:5984/_config/httpd/enable_cors -d '"true"'
   curl -X PUT http://admin:password@localhost:5984/_config/cors/origins -d '"*"'
   curl -X PUT http://admin:password@localhost:5984/_config/cors/credentials -d '"true"'
   curl -X PUT http://admin:password@localhost:5984/_config/cors/methods -d '"GET, PUT, POST, HEAD, DELETE"'
   curl -X PUT http://admin:password@localhost:5984/_config/cors/headers -d '"accept, authorization, content-type, origin, referer, x-csrf-token"'
   ```

3. **Create Database**:
   ```bash
   # Create the FinTrac database
   curl -X PUT http://admin:password@localhost:5984/fintrac
   ```

4. **Verify Setup**:
   ```bash
   # Test CouchDB access
   curl http://localhost:5984/
   curl http://admin:password@localhost:5984/fintrac
   ```

### Option 2: Remote CouchDB (Production)

1. **Set up a CouchDB server** (IBM Cloudant, self-hosted, etc.)
2. **Configure CORS** through the admin interface or API
3. **Create user credentials** with database access
4. **Create the database** for FinTrac data

## FinTrac Configuration

### 1. Environment Variables

Copy the example configuration:
```bash
cp .env.sync.example .env.development
```

Edit `.env.development`:
```env
# Enable sync
VITE_SYNC_ENABLED=true

# CouchDB connection
VITE_COUCHDB_URL=http://localhost:5984
VITE_COUCHDB_DATABASE=fintrac

# Authentication (if required)
VITE_COUCHDB_USERNAME=admin
VITE_COUCHDB_PASSWORD=password

# Sync settings
VITE_SYNC_INTERVAL=30000
VITE_SYNC_BATCH_SIZE=50
VITE_SYNC_AUTO_START=false
```

### 2. Verify Configuration

Start the development server:
```bash
npm run dev
```

The sync status should appear in the UI if configured correctly.

## Using the Sync Features

### Manual Sync

1. **Sync Status**: Check the sync status indicator in the UI
2. **Manual Sync**: Click "Sync Now" to upload all local changes
3. **Progress Tracking**: Monitor sync progress with the progress bar

### Automatic Sync

1. **Enable Auto-sync**: Click "Auto Sync" to start periodic syncing
2. **Interval**: Syncs occur every 30 seconds (configurable)
3. **Disable**: Click "Stop Auto" to disable automatic syncing

### Sync Controls

The sync controls component provides:
- **Sync Now**: Manual one-time sync
- **Auto Sync**: Toggle automatic periodic sync
- **Test Connection**: Verify CouchDB connectivity
- **Refresh Info**: Update remote database information

## Document Structure

Documents are stored in CouchDB with the following structure:

### Transactions
```json
{
  "_id": "transaction:550e8400-e29b-41d4-a716-446655440000",
  "_rev": "1-967a00dff5e02add41819138abb3284d",
  "type": "transaction",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "date": "2024-01-15T00:00:00.000Z",
    "description": "Coffee Shop",
    "amount": 4.50,
    "currency": "USD",
    "type": "debit",
    "category": "Food",
    "tags": ["coffee"],
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Categories
```json
{
  "_id": "category:550e8400-e29b-41d4-a716-446655440001",
  "_rev": "1-967a00dff5e02add41819138abb3284d",
  "type": "category",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Food",
    "color": "emerald-400"
  }
}
```

## Troubleshooting

### Common Issues

1. **"Sync Not Configured"**:
   - Check that `VITE_SYNC_ENABLED=true`
   - Verify CouchDB URL and database name
   - Restart the development server after env changes

2. **Connection Failed**:
   - Verify CouchDB is running: `curl http://localhost:5984/`
   - Check CORS configuration
   - Verify credentials if authentication is enabled

3. **Sync Errors**:
   - Check browser console for detailed error messages
   - Verify database permissions
   - Test CouchDB connection manually

### Debug Mode

Enable verbose logging by opening browser developer tools and running:
```javascript
localStorage.setItem('debug', 'sync:*');
```

### Network Issues

- Check if CouchDB is accessible from the browser
- Verify firewall settings
- Test with curl or Postman

## Security Considerations

### Development
- Use local CouchDB without authentication for simplicity
- Keep credentials out of version control

### Production
- **Always use HTTPS** for remote CouchDB connections
- **Enable authentication** with strong passwords
- **Restrict CORS origins** to your domain only
- **Use environment variables** for sensitive data
- **Consider using** CouchDB's built-in user management

## Performance Tips

1. **Batch Size**: Adjust `VITE_SYNC_BATCH_SIZE` based on network speed
2. **Sync Interval**: Increase interval for slower connections
3. **Manual Sync**: Use manual sync for better control over network usage
4. **Conflict Resolution**: Plan for bidirectional sync implementation

## Future Enhancements

This implementation provides the foundation for:
- **Bidirectional sync**: Download changes from CouchDB
- **Conflict resolution**: Handle simultaneous edits
- **Real-time sync**: Use CouchDB's changes feed for live updates
- **Multi-user support**: Share data between multiple devices/users

## Support

For issues or questions:
1. Check the browser console for error details
2. Verify CouchDB server logs
3. Test connectivity with curl/Postman
4. Review the sync service code in `src/services/sync/`

## API Reference

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_SYNC_ENABLED` | `false` | Enable/disable sync functionality |
| `VITE_COUCHDB_URL` | `http://localhost:5984` | CouchDB server URL |
| `VITE_COUCHDB_DATABASE` | `fintrac` | Database name |
| `VITE_COUCHDB_USERNAME` | - | Authentication username (optional) |
| `VITE_COUCHDB_PASSWORD` | - | Authentication password (optional) |
| `VITE_SYNC_INTERVAL` | `30000` | Auto-sync interval (milliseconds) |
| `VITE_SYNC_BATCH_SIZE` | `50` | Documents per sync batch |
| `VITE_SYNC_AUTO_START` | `false` | Start auto-sync on app load |

### React Hooks

- `useCouchDBSync()`: Full sync management
- `useCouchDBSyncStatus()`: Status monitoring only
- `useCouchDBSyncOperations()`: Operations only

### Components

- `<SyncStatus />`: Display sync status
- `<SyncControls />`: Sync operation controls