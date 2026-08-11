import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { ANSWER_LIMIT, checkRateLimit, READ_TOKEN_LIMIT } from "./rate-limit";

const redisEnvironmentVariables = [
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
] as const;

const originalEnvironment = Object.fromEntries(
  redisEnvironmentVariables.map((name) => [name, process.env[name]]),
);

afterEach(() => {
  vi.unstubAllEnvs();
  for (const name of redisEnvironmentVariables) {
    const value = originalEnvironment[name];
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
});

describe("checkRateLimit without Upstash configuration", () => {
  it("defines the read-token rule", () => {
    expect(READ_TOKEN_LIMIT).toEqual({
      name: "read-token",
      limit: 60,
      window: "10 m",
    });
  });

  it.each(redisEnvironmentVariables)(
    "rejects requests in production when %s is absent",
    async (missingVariable) => {
      process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
      process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
      vi.stubEnv("NODE_ENV", "production");
      delete process.env[missingVariable];

      await expect(checkRateLimit(ANSWER_LIMIT, "198.51.100.1")).resolves.toBe(
        false,
      );
    },
  );

  it("allows requests outside production", async () => {
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
    vi.stubEnv("NODE_ENV", "test");
    delete process.env.UPSTASH_REDIS_REST_URL;

    await expect(checkRateLimit(ANSWER_LIMIT, "198.51.100.1")).resolves.toBe(
      true,
    );
  });
});
