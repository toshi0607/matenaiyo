import { afterEach, describe, expect, it, vi } from "vitest";

const { clientIdentifier, dbFindEvent, dbFindParticipants, checkRateLimit } =
  vi.hoisted(() => ({
    checkRateLimit: vi.fn(),
    clientIdentifier: vi.fn(),
    dbFindEvent: vi.fn(),
    dbFindParticipants: vi.fn(),
  }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/db", () => ({
  db: {
    query: {
      events: { findFirst: dbFindEvent },
      participants: {
        findFirst: dbFindParticipants,
        findMany: dbFindParticipants,
      },
    },
  },
}));
vi.mock("@/lib/rate-limit", () => ({
  ANSWER_LIMIT: { name: "answer", limit: 30, window: "10 m" },
  CREATE_EVENT_LIMIT: { name: "create-event", limit: 5, window: "10 m" },
  READ_TOKEN_LIMIT: { name: "read-token", limit: 60, window: "10 m" },
  checkRateLimit,
  clientIdentifier,
}));

import { getAdminParticipants, getOwnAnswer } from "./actions";

const SLUG = "V1StGXR8_Z5jdHi6B-myT";
const PARTICIPANT_ID = "3f9c5f3a-1a2b-4c3d-8e4f-5a6b7c8d9e0f";
const RATE_LIMITED =
  "リクエストが多すぎます。しばらく待ってからお試しください。";

afterEach(() => {
  vi.clearAllMocks();
});

describe("token-protected read actions", () => {
  it("rate-limits getOwnAnswer before any database query", async () => {
    checkRateLimit.mockResolvedValue(false);
    clientIdentifier.mockResolvedValue("198.51.100.1");

    await expect(
      getOwnAnswer({
        slug: SLUG,
        participantId: PARTICIPANT_ID,
        editToken: "edit-token",
      }),
    ).resolves.toEqual({ ok: false, error: RATE_LIMITED });

    expect(dbFindEvent).not.toHaveBeenCalled();
    expect(dbFindParticipants).not.toHaveBeenCalled();
  });

  it("rate-limits getAdminParticipants before any database query", async () => {
    checkRateLimit.mockResolvedValue(false);
    clientIdentifier.mockResolvedValue("198.51.100.1");

    await expect(
      getAdminParticipants({ slug: SLUG, adminToken: "admin-token" }),
    ).resolves.toEqual({ ok: false, error: RATE_LIMITED });

    expect(dbFindEvent).not.toHaveBeenCalled();
    expect(dbFindParticipants).not.toHaveBeenCalled();
  });
});
