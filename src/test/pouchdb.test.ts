import { describe, it, expect } from 'vitest';

// Test PouchDB import compatibility
describe('PouchDB Import', () => {
  it('should import PouchDB without errors', async () => {
    const PouchDB = (await import('pouchdb-browser')).default;
    expect(PouchDB).toBeDefined();
    expect(typeof PouchDB).toBe('function');
  });

  it('should create PouchDB instance', async () => {
    const PouchDB = (await import('pouchdb-browser')).default;
    const db = new PouchDB('test-db');
    expect(db).toBeDefined();
    expect(typeof db.put).toBe('function');
    expect(typeof db.get).toBe('function');
    await db.destroy();
  });
});