// Temporarily disabled PouchDB configuration to isolate constructor issue
// This will help identify if the problem is with PouchDB setup or other imports

// Mock PouchDB implementation for now
export const POUCHDB_CONFIG = {
  name: "fintrac",
  options: {
    auto_compaction: true,
    revs_limit: 10,
  },
};

export const REMOTE_COUCHDB_CONFIG = {
  url: "http://127.0.0.1:5984/fintrac",
  options: {
    live: true,
    retry: true,
    continuous: true,
  },
};

// Mock database class to prevent errors
class MockDatabase {
  constructor(name: string, options?: unknown) {
    console.warn(`MockDatabase created: ${name}`, options);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async put(_doc: unknown): Promise<never> {
    throw new Error(
      "PouchDB is temporarily disabled. Use Dexie implementation.",
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async get(_id: string): Promise<never> {
    throw new Error(
      "PouchDB is temporarily disabled. Use Dexie implementation.",
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async find(_query: unknown): Promise<never> {
    throw new Error(
      "PouchDB is temporarily disabled. Use Dexie implementation.",
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async allDocs(_options?: unknown): Promise<never> {
    throw new Error(
      "PouchDB is temporarily disabled. Use Dexie implementation.",
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async remove(_doc: unknown): Promise<never> {
    throw new Error(
      "PouchDB is temporarily disabled. Use Dexie implementation.",
    );
  }

  async destroy(): Promise<void> {
    console.warn("MockDatabase destroyed");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async createIndex(_index: unknown): Promise<never> {
    throw new Error(
      "PouchDB is temporarily disabled. Use Dexie implementation.",
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async bulkDocs(_docs: unknown[]): Promise<never> {
    throw new Error(
      "PouchDB is temporarily disabled. Use Dexie implementation.",
    );
  }
}

// Export mock functions
export const createLocalDB = (): MockDatabase => {
  console.warn("PouchDB temporarily disabled - returning mock database");
  return new MockDatabase(POUCHDB_CONFIG.name, POUCHDB_CONFIG.options);
};

export const createRemoteDB = (): MockDatabase => {
  console.warn("PouchDB temporarily disabled - returning mock remote database");
  return new MockDatabase(REMOTE_COUCHDB_CONFIG.url);
};

export const hasFindPlugin = (): boolean => {
  return false;
};

export const findDocuments = async (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _db: unknown,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _selector: unknown,
): Promise<never> => {
  throw new Error("PouchDB is temporarily disabled. Use Dexie implementation.");
};

// Export mock PouchDB
export const PouchDB = MockDatabase;

// Export type alias
export type Database = MockDatabase;

// Development helper
export const getPouchDBStatus = () => {
  return {
    available: false,
    findPlugin: false,
    version: "disabled",
    message: "PouchDB temporarily disabled to isolate constructor issue",
  };
};
