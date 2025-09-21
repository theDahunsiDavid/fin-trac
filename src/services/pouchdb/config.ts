import PouchDB from "pouchdb";
import PouchDBFind from "pouchdb-find";

// Initialize find plugin
PouchDB.plugin(PouchDBFind);

// Helper to get PouchDB instance
const getPouchDB = (): typeof PouchDB => {
  // Verify that the find plugin is available
  if (!PouchDB.prototype.find) {
    throw new Error(
      "PouchDB find plugin not available. Make sure pouchdb-find is properly initialized.",
    );
  }
  return PouchDB;
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
  const PouchDBConstructor = getPouchDB();
  const db = new PouchDBConstructor(
    POUCHDB_CONFIG.name,
    POUCHDB_CONFIG.options,
  );

  // Verify that the find method is available on the database instance
  if (typeof db.find !== "function") {
    throw new Error(
      "Database instance does not have find method. PouchDB find plugin may not be properly initialized.",
    );
  }

  return db;
};

// Create remote PouchDB instance for sync
export const createRemoteDB = (): PouchDB.Database => {
  const PouchDBConstructor = getPouchDB();
  const db = new PouchDBConstructor(REMOTE_COUCHDB_CONFIG.url);

  // Verify that the find method is available on the database instance
  if (typeof db.find !== "function") {
    throw new Error(
      "Remote database instance does not have find method. PouchDB find plugin may not be properly initialized.",
    );
  }

  return db;
};

// Export the PouchDB constructor
export { PouchDB };

// Export types
export type Database = PouchDB.Database;
