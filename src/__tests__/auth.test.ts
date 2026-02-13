import { describe, it, expect, vi, beforeAll } from "vitest";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ data: [], error: null }) }) }),
  },
  createServiceClient: () => ({}),
}));

import { generateApiKey, hashApiKey, verifyApiKey, extractApiKey } from "@/lib/auth";

describe("generateApiKey", () => {
  it("generates a key with fate_ prefix", () => {
    const key = generateApiKey();
    expect(key.startsWith("fate_")).toBe(true);
  });

  it("generates key of correct length (5 prefix + 48 random = 53)", () => {
    const key = generateApiKey();
    expect(key.length).toBe(53);
  });

  it("generates unique keys", () => {
    const keys = new Set(Array.from({ length: 10 }, () => generateApiKey()));
    expect(keys.size).toBe(10);
  });

  it("only contains alphanumeric chars after prefix", () => {
    const key = generateApiKey();
    const body = key.slice(5);
    expect(body).toMatch(/^[A-Za-z0-9]+$/);
  });
});

describe("hashApiKey + verifyApiKey", () => {
  it("hashed key verifies against original", async () => {
    const key = generateApiKey();
    const hash = await hashApiKey(key);
    expect(await verifyApiKey(key, hash)).toBe(true);
  });

  it("wrong key does not verify", async () => {
    const key = generateApiKey();
    const hash = await hashApiKey(key);
    const wrongKey = generateApiKey();
    expect(await verifyApiKey(wrongKey, hash)).toBe(false);
  });

  it("hash is not the same as the key", async () => {
    const key = generateApiKey();
    const hash = await hashApiKey(key);
    expect(hash).not.toBe(key);
    expect(hash.startsWith("$2")).toBe(true);
  });
});

describe("extractApiKey", () => {
  it("extracts from Bearer token", () => {
    const request = new Request("https://example.com", {
      headers: { Authorization: "Bearer fate_abc123" },
    });
    expect(extractApiKey(request)).toBe("fate_abc123");
  });

  it("extracts from query parameter", () => {
    const request = new Request("https://example.com?apiKey=fate_xyz789");
    expect(extractApiKey(request)).toBe("fate_xyz789");
  });

  it("prefers Bearer over query param", () => {
    const request = new Request("https://example.com?apiKey=fate_query", {
      headers: { Authorization: "Bearer fate_bearer" },
    });
    expect(extractApiKey(request)).toBe("fate_bearer");
  });

  it("returns null when no auth provided", () => {
    const request = new Request("https://example.com");
    expect(extractApiKey(request)).toBeNull();
  });
});
