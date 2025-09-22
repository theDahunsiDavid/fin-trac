import "@testing-library/jest-dom";
import fakeIndexedDB, { IDBKeyRange } from "fake-indexeddb";
import fetch, { Headers, Request, Response } from "node-fetch";

// PouchDB test environment setup
// Add global polyfills for PouchDB in jsdom
Object.defineProperty(global, "indexedDB", {
  value: fakeIndexedDB,
  writable: true,
});

Object.defineProperty(global, "IDBKeyRange", {
  value: IDBKeyRange,
  writable: true,
});

// Add fetch polyfill for PouchDB
Object.defineProperty(global, "fetch", {
  value: fetch,
  writable: true,
});

Object.defineProperty(global, "Headers", {
  value: Headers,
  writable: true,
});

Object.defineProperty(global, "Request", {
  value: Request,
  writable: true,
});

Object.defineProperty(global, "Response", {
  value: Response,
  writable: true,
});
