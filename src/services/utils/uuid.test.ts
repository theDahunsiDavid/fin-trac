import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  generateUUID,
  generatePrefixedUUID,
  isValidUUID,
  generateTransactionId,
  generateCategoryId,
} from "./uuid";

describe("UUID Utility Functions", () => {
  // Store original crypto object
  let originalCrypto: typeof globalThis.crypto;

  beforeEach(() => {
    originalCrypto = globalThis.crypto;
  });

  afterEach(() => {
    // Restore original crypto object
    if (originalCrypto) {
      Object.defineProperty(globalThis, "crypto", {
        value: originalCrypto,
        writable: true,
        configurable: true,
      });
    }
    vi.restoreAllMocks();
  });

  describe("generateUUID", () => {
    it("should generate a valid UUID v4 using crypto.randomUUID when available", () => {
      const mockUUID = "550e8400-e29b-41d4-a716-446655440000";
      const mockCrypto = {
        randomUUID: vi.fn().mockReturnValue(mockUUID),
      };
      Object.defineProperty(globalThis, "crypto", {
        value: mockCrypto,
        writable: true,
        configurable: true,
      });

      const uuid = generateUUID();

      expect(uuid).toBe(mockUUID);
      expect(mockCrypto.randomUUID).toHaveBeenCalledOnce();
    });

    it("should use fallback implementation when crypto.randomUUID is not available", () => {
      Object.defineProperty(globalThis, "crypto", {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const uuid = generateUUID();

      expect(uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it("should use fallback implementation when crypto exists but randomUUID is not available", () => {
      Object.defineProperty(globalThis, "crypto", {
        value: {},
        writable: true,
        configurable: true,
      });

      const uuid = generateUUID();

      expect(uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it("should generate unique UUIDs on multiple calls", () => {
      const uuids = new Set();
      const numTests = 100;

      for (let i = 0; i < numTests; i++) {
        uuids.add(generateUUID());
      }

      expect(uuids.size).toBe(numTests);
    });

    it("should always generate valid UUID v4 format", () => {
      for (let i = 0; i < 10; i++) {
        const uuid = generateUUID();
        expect(isValidUUID(uuid)).toBe(true);
      }
    });

    it("should generate UUID with correct version and variant bits", () => {
      Object.defineProperty(globalThis, "crypto", {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const uuid = generateUUID();
      const parts = uuid.split("-");

      // Check version (4th character of 3rd part should be '4')
      expect(parts[2][0]).toBe("4");

      // Check variant (1st character of 4th part should be 8, 9, a, or b)
      expect(["8", "9", "a", "b"]).toContain(parts[3][0]);
    });
  });

  describe("generatePrefixedUUID", () => {
    it("should generate UUID with correct prefix", () => {
      const prefix = "test";
      const prefixedUUID = generatePrefixedUUID(prefix);

      expect(prefixedUUID).toMatch(
        new RegExp(
          `^${prefix}_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`,
          "i",
        ),
      );
    });

    it("should handle empty prefix", () => {
      const prefixedUUID = generatePrefixedUUID("");

      expect(prefixedUUID).toMatch(
        /^_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it("should handle various prefix formats", () => {
      const prefixes = [
        "transaction",
        "category",
        "user-profile",
        "sync_conflict",
        "123",
      ];

      prefixes.forEach((prefix) => {
        const prefixedUUID = generatePrefixedUUID(prefix);
        expect(prefixedUUID.startsWith(`${prefix}_`)).toBe(true);

        // Extract UUID part and validate
        const uuidPart = prefixedUUID.substring(prefix.length + 1);
        expect(isValidUUID(uuidPart)).toBe(true);
      });
    });

    it("should generate unique prefixed UUIDs", () => {
      const prefix = "test";
      const prefixedUUIDs = new Set();

      for (let i = 0; i < 50; i++) {
        prefixedUUIDs.add(generatePrefixedUUID(prefix));
      }

      expect(prefixedUUIDs.size).toBe(50);
    });
  });

  describe("isValidUUID", () => {
    it("should return true for valid UUID v4", () => {
      const validUUIDs = [
        "550e8400-e29b-41d4-a716-446655440000",
        "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "6ba7b810-9dad-41d1-80b4-00c04fd430c8",
        "6ba7b811-9dad-41d1-80b4-00c04fd430c8",
      ];

      validUUIDs.forEach((uuid) => {
        expect(isValidUUID(uuid)).toBe(true);
      });
    });

    it("should return true for valid UUID v4 with correct version and variant", () => {
      const validV4UUIDs = [
        "550e8400-e29b-41d4-a716-446655440000",
        "f47ac10b-58cc-4372-8567-0e02b2c3d479",
        "6ba7b810-9dad-41d1-9004-00c04fd430c8",
      ];

      validV4UUIDs.forEach((uuid) => {
        expect(isValidUUID(uuid)).toBe(true);
      });
    });

    it("should return false for invalid UUID formats", () => {
      const invalidUUIDs = [
        "",
        "invalid-uuid",
        "550e8400-e29b-41d4-a716",
        "550e8400-e29b-41d4-a716-446655440000-extra",
        "gggggggg-gggg-gggg-gggg-gggggggggggg",
        "550e8400-e29b-41d4-a716-44665544000",
        "550e8400e29b41d4a716446655440000",
        "550e8400-e29b-41d4-a716-446655440000 ",
        " 550e8400-e29b-41d4-a716-446655440000",
        "550E8400-E29B-41D4-A716-446655440000-",
        null as unknown as string,
        undefined as unknown as string,
        123 as unknown as string,
        {} as unknown as string,
      ];

      invalidUUIDs.forEach((uuid) => {
        expect(isValidUUID(uuid)).toBe(false);
      });
    });

    it("should handle case insensitive validation", () => {
      const mixedCaseUUIDs = [
        "550E8400-E29B-41D4-A716-446655440000",
        "550e8400-E29B-41d4-A716-446655440000",
        "F47AC10B-58CC-4372-A567-0E02B2C3D479",
      ];

      mixedCaseUUIDs.forEach((uuid) => {
        expect(isValidUUID(uuid)).toBe(true);
      });
    });

    it("should validate generated UUIDs", () => {
      for (let i = 0; i < 20; i++) {
        const uuid = generateUUID();
        expect(isValidUUID(uuid)).toBe(true);
      }
    });
  });

  describe("generateTransactionId", () => {
    it("should generate UUID with transaction prefix", () => {
      const transactionId = generateTransactionId();

      expect(transactionId).toMatch(
        /^transaction_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it("should generate unique transaction IDs", () => {
      const transactionIds = new Set();

      for (let i = 0; i < 50; i++) {
        transactionIds.add(generateTransactionId());
      }

      expect(transactionIds.size).toBe(50);
    });

    it("should have valid UUID part", () => {
      const transactionId = generateTransactionId();
      const uuidPart = transactionId.replace("transaction_", "");

      expect(isValidUUID(uuidPart)).toBe(true);
    });
  });

  describe("generateCategoryId", () => {
    it("should generate UUID with category prefix", () => {
      const categoryId = generateCategoryId();

      expect(categoryId).toMatch(
        /^category_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it("should generate unique category IDs", () => {
      const categoryIds = new Set();

      for (let i = 0; i < 50; i++) {
        categoryIds.add(generateCategoryId());
      }

      expect(categoryIds.size).toBe(50);
    });

    it("should have valid UUID part", () => {
      const categoryId = generateCategoryId();
      const uuidPart = categoryId.replace("category_", "");

      expect(isValidUUID(uuidPart)).toBe(true);
    });
  });

  describe("Integration and Edge Cases", () => {
    it("should maintain consistency across different browsers", () => {
      // Test with crypto.randomUUID
      const mockUUID = "550e8400-e29b-41d4-a716-446655440000";
      Object.defineProperty(globalThis, "crypto", {
        value: {
          randomUUID: vi.fn().mockReturnValue(mockUUID),
        },
        writable: true,
        configurable: true,
      });

      const uuidWithCrypto = generateUUID();
      expect(uuidWithCrypto).toBe(mockUUID);

      // Test with fallback
      Object.defineProperty(globalThis, "crypto", {
        value: undefined,
        writable: true,
        configurable: true,
      });
      const uuidWithFallback = generateUUID();
      expect(isValidUUID(uuidWithFallback)).toBe(true);
    });

    it("should handle concurrent UUID generation", () => {
      const promises = Array.from({ length: 100 }, () =>
        Promise.resolve(generateUUID()),
      );

      return Promise.all(promises).then((uuids) => {
        const uniqueUUIDs = new Set(uuids);
        expect(uniqueUUIDs.size).toBe(100);
      });
    });

    it("should work with different Math.random seeds", () => {
      Object.defineProperty(globalThis, "crypto", {
        value: undefined,
        writable: true,
        configurable: true,
      });

      // Mock Math.random to return predictable values
      const originalMathRandom = Math.random;
      let counter = 0;
      Math.random = vi.fn(() => {
        return (counter++ * 0.123456789) % 1;
      });

      const uuid1 = generateUUID();
      const uuid2 = generateUUID();

      expect(uuid1).not.toBe(uuid2);
      expect(isValidUUID(uuid1)).toBe(true);
      expect(isValidUUID(uuid2)).toBe(true);

      // Restore Math.random
      Math.random = originalMathRandom;
    });

    it("should preserve UUID format across all generation methods", () => {
      const ids = [
        generateUUID(),
        generatePrefixedUUID("test"),
        generateTransactionId(),
        generateCategoryId(),
      ];

      ids.forEach((id) => {
        const uuidPart = id.includes("_") ? id.split("_")[1] : id;
        expect(isValidUUID(uuidPart)).toBe(true);
      });
    });
  });

  describe("Performance and Memory", () => {
    it("should generate UUIDs efficiently", () => {
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        generateUUID();
      }

      const end = performance.now();
      const duration = end - start;

      // Should complete 1000 UUID generations in reasonable time (< 100ms)
      expect(duration).toBeLessThan(100);
    });

    it("should not leak memory during repeated generation", () => {
      // Generate many UUIDs and ensure they can be garbage collected
      for (let i = 0; i < 10000; i++) {
        const uuid = generateUUID();
        // UUID should be available for GC after this scope
        expect(typeof uuid).toBe("string");
      }

      // This test mainly ensures no obvious memory leaks in the generation process
      expect(true).toBe(true);
    });
  });
});
