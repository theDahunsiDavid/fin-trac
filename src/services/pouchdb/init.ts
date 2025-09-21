/**
 * PouchDB initialization helper.
 *
 * This module ensures that PouchDB is properly initialized with all required plugins
 * before any repository operations are performed. It provides verification and
 * helpful error messages for troubleshooting PouchDB setup issues.
 */

// Global type declaration for PouchDB find plugin
import PouchDB from "pouchdb";
import PouchDBFind from "pouchdb-find";

// Initialize find plugin
PouchDB.plugin(PouchDBFind);

/**
 * Checks if PouchDB is available and properly initialized.
 *
 * @returns boolean True if PouchDB is ready for use
 */
export function isPouchDBAvailable(): boolean {
  return typeof PouchDB !== "undefined" && typeof PouchDB === "function";
}

/**
 * Checks if the PouchDB find plugin is available.
 *
 * @returns boolean True if find plugin is loaded
 */
export function isFindPluginAvailable(): boolean {
  if (!isPouchDBAvailable()) {
    return false;
  }

  // Check if find method exists on PouchDB prototype
  return (
    typeof PouchDB.prototype.find === "function" ||
    typeof PouchDB.prototype.createIndex === "function"
  );
}

/**
 * Initializes PouchDB with the find plugin if not already done.
 * This is called automatically when importing the module.
 */
export function initializePouchDB(): void {
  if (!isPouchDBAvailable()) {
    console.warn(
      "PouchDB not available. Make sure npm packages are installed.",
    );
    return;
  }

  // Check if find plugin is already loaded
  if (isFindPluginAvailable()) {
    console.log("✅ PouchDB find plugin already available");
    return;
  }

  console.warn("⚠️ PouchDB find plugin not properly initialized");
}

/**
 * Verifies that PouchDB is ready for repository operations.
 * Throws descriptive errors if setup is incomplete.
 *
 * @throws Error if PouchDB or find plugin is not available
 */
export function verifyPouchDBSetup(): void {
  if (!isPouchDBAvailable()) {
    throw new Error(
      "PouchDB is not available. Please ensure the following packages are installed:\n" +
        "1. npm install pouchdb\n" +
        "2. npm install pouchdb-find\n" +
        "3. Import both packages in your module",
    );
  }

  if (!isFindPluginAvailable()) {
    throw new Error(
      "PouchDB find plugin is not available. Please ensure:\n" +
        "1. pouchdb-find package is installed\n" +
        "2. Plugin is initialized with: PouchDB.plugin(PouchDBFind)\n" +
        "3. Both packages are imported before using PouchDB repositories",
    );
  }

  console.log("✅ PouchDB setup verification passed");
}

/**
 * Creates a test database instance to verify functionality.
 *
 * @returns Promise<boolean> True if test database can be created and used
 */
export async function testPouchDBFunctionality(): Promise<boolean> {
  try {
    verifyPouchDBSetup();

    // Create a test database
    const testDB = new PouchDB("__pouchdb_test__");

    // Test basic functionality
    await testDB.info();

    // Test find functionality
    if (typeof testDB.find === "function") {
      await testDB.find({ selector: { _id: { $exists: true } }, limit: 1 });
    }

    // Test index creation
    if (typeof testDB.createIndex === "function") {
      await testDB.createIndex({
        index: { fields: ["test_field"] },
      });
    }

    // Clean up test database
    await testDB.destroy();

    console.log("✅ PouchDB functionality test passed");
    return true;
  } catch (error) {
    console.error("❌ PouchDB functionality test failed:", error);
    return false;
  }
}

/**
 * Gets detailed information about the current PouchDB setup.
 * Useful for debugging and troubleshooting.
 *
 * @returns object with setup information
 */
export function getPouchDBSetupInfo(): {
  available: boolean;
  version?: string;
  findPlugin: boolean;
  plugins: string[];
  errors: string[];
} {
  const info = {
    available: isPouchDBAvailable(),
    version: undefined as string | undefined,
    findPlugin: false,
    plugins: [] as string[],
    errors: [] as string[],
  };

  if (info.available) {
    try {
      info.version = PouchDB.version;
    } catch {
      info.errors.push("Could not get PouchDB version");
    }

    info.findPlugin = isFindPluginAvailable();

    // Try to detect available plugins
    try {
      if (PouchDB.prototype.find) {
        info.plugins.push("find");
      }
      if (PouchDB.prototype.createIndex) {
        info.plugins.push("createIndex");
      }
      if (PouchDB.prototype.sync) {
        info.plugins.push("sync");
      }
    } catch {
      info.errors.push("Could not detect plugins");
    }
  } else {
    info.errors.push("PouchDB not available");
  }

  return info;
}

/**
 * Logs the current PouchDB setup information to console.
 * Useful for debugging during development.
 */
export function logPouchDBSetup(): void {
  const info = getPouchDBSetupInfo();

  console.group("📦 PouchDB Setup Information");
  console.log("Available:", info.available ? "✅" : "❌");

  if (info.version) {
    console.log("Version:", info.version);
  }

  console.log("Find Plugin:", info.findPlugin ? "✅" : "❌");

  if (info.plugins.length > 0) {
    console.log("Plugins:", info.plugins.join(", "));
  }

  if (info.errors.length > 0) {
    console.warn("Errors:", info.errors);
  }

  console.groupEnd();
}

// Auto-initialize when module is imported
try {
  initializePouchDB();
} catch (error) {
  console.warn("PouchDB auto-initialization failed:", error);
}
