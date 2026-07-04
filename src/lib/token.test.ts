import { describe, expect, it } from "vitest";
import {
  generateSlug,
  generateToken,
  hashToken,
  SLUG_LENGTH,
  TOKEN_LENGTH,
  verifyToken,
} from "./token";

describe("generateSlug", () => {
  it("returns a 21-char URL-safe string", () => {
    const slug = generateSlug();
    expect(slug).toHaveLength(SLUG_LENGTH);
    expect(slug).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("returns unique values", () => {
    const slugs = new Set(Array.from({ length: 100 }, () => generateSlug()));
    expect(slugs.size).toBe(100);
  });
});

describe("generateToken", () => {
  it("returns a 32-char URL-safe string", () => {
    const token = generateToken();
    expect(token).toHaveLength(TOKEN_LENGTH);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("returns unique values", () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateToken()));
    expect(tokens.size).toBe(100);
  });
});

describe("hashToken", () => {
  it("is deterministic", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
  });

  it("returns a 64-char hex sha256 digest", () => {
    expect(hashToken("abc")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("differs from the plain token", () => {
    const token = generateToken();
    expect(hashToken(token)).not.toBe(token);
  });

  it("produces different hashes for different tokens", () => {
    expect(hashToken("abc")).not.toBe(hashToken("abd"));
  });
});

describe("verifyToken", () => {
  it("accepts the token that produced the hash", () => {
    const token = generateToken();
    expect(verifyToken(token, hashToken(token))).toBe(true);
  });

  it("rejects a different token", () => {
    const token = generateToken();
    expect(verifyToken(generateToken(), hashToken(token))).toBe(false);
  });

  it("rejects when the stored hash is empty", () => {
    expect(verifyToken(generateToken(), "")).toBe(false);
  });

  it("rejects when the stored hash is not valid hex", () => {
    expect(verifyToken(generateToken(), "z".repeat(64))).toBe(false);
  });

  it("rejects the hash itself used as a token", () => {
    const token = generateToken();
    const hashed = hashToken(token);
    expect(verifyToken(hashed, hashed)).toBe(false);
  });
});
