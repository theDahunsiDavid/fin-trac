// Global PouchDB type declaration
declare global {
  interface Window {
    PouchDB: PouchDB.Static;
  }
}

// Helper to get PouchDB from global scope
const getPouchDB = (): PouchDB.Static => {
  if (typeof window !== "undefined" && window.PouchDB) {
    return window.PouchDB;
  }
  throw new Error("PouchDB not available. Make sure the CDN script is loaded.");
};

// Database configuration
export const POUCHDB_CONFIG = {
  name: "fintrac",
  options: {
    auto_compaction: true,
    revs_limit: 10, // Keep last 10 revisions
  },
};

// Remote CouchDB configuration for sync
export const REMOTE_COUCHDB_CONFIG = {
  url: "http://127.0.0.1:5984/fintrac",
  options: {
    live: true,
    retry: true,
    continuous: true,
  },
};

// Create local PouchDB instance
export const createLocalDB = (): PouchDB.Database => {
  const PouchDB = getPouchDB();
  return new PouchDB(POUCHDB_CONFIG.name, POUCHDB_CONFIG.options);
};

// Create remote PouchDB instance for sync
export const createRemoteDB = (): PouchDB.Database => {
  const PouchDB = getPouchDB();
  return new PouchDB(REMOTE_COUCHDB_CONFIG.url);
};

// Export the PouchDB constructor
export const PouchDB = getPouchDB;

// Export types
export type Database = PouchDB.Database;
