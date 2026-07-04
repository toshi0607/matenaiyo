import { createHash, timingSafeEqual } from "node:crypto";
import { nanoid } from "nanoid";

export const SLUG_LENGTH = 21;
export const TOKEN_LENGTH = 32;

export function generateSlug(): string {
  return nanoid(SLUG_LENGTH);
}

export function generateToken(): string {
  return nanoid(TOKEN_LENGTH);
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function verifyToken(token: string, hashedToken: string): boolean {
  const actual = Buffer.from(hashToken(token), "hex");
  const expected = Buffer.from(hashedToken, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
