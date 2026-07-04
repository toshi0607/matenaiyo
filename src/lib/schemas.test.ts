import { describe, expect, it } from "vitest";
import {
  closeEventSchema,
  createEventSchema,
  decideSlotSchema,
  deleteParticipantSchema,
  markSchema,
  slotInputSchema,
  slugSchema,
  submitAnswerSchema,
  updateAnswerSchema,
} from "./schemas";

const SLUG = "V1StGXR8_Z5jdHi6B-myT";
const UUID = "3f9c5f3a-1a2b-4c3d-8e4f-5a6b7c8d9e0f";
const UUID2 = "aaaa5f3a-1a2b-4c3d-8e4f-5a6b7c8d9e0f";

describe("slugSchema", () => {
  it("accepts a 21-char nanoid", () => {
    expect(slugSchema.safeParse(SLUG).success).toBe(true);
  });

  it("rejects wrong length or invalid chars", () => {
    expect(slugSchema.safeParse("short").success).toBe(false);
    expect(slugSchema.safeParse(`${SLUG.slice(0, 20)}!`).success).toBe(false);
  });
});

describe("markSchema", () => {
  it("accepts yes/maybe/no only", () => {
    expect(markSchema.safeParse("yes").success).toBe(true);
    expect(markSchema.safeParse("maybe").success).toBe(true);
    expect(markSchema.safeParse("no").success).toBe(true);
    expect(markSchema.safeParse("ok").success).toBe(false);
  });
});

describe("slotInputSchema", () => {
  it("accepts startsAt only", () => {
    expect(
      slotInputSchema.safeParse({ startsAt: "2026-07-10T19:00:00+09:00" })
        .success,
    ).toBe(true);
  });

  it("accepts label only", () => {
    expect(slotInputSchema.safeParse({ label: "7/10(金) 夜" }).success).toBe(
      true,
    );
  });

  it("rejects when both startsAt and label are missing", () => {
    expect(slotInputSchema.safeParse({}).success).toBe(false);
  });

  it("rejects a non-ISO startsAt", () => {
    expect(
      slotInputSchema.safeParse({ startsAt: "2026/07/10 19:00" }).success,
    ).toBe(false);
  });
});

describe("createEventSchema", () => {
  const valid = {
    title: "飲み会",
    description: "candidates below",
    slots: [{ startsAt: "2026-07-10T19:00:00Z" }, { label: "未定" }],
  };

  it("accepts a valid input", () => {
    const result = createEventSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("defaults description to an empty string", () => {
    const result = createEventSchema.parse({
      title: "t",
      slots: [{ label: "x" }],
    });
    expect(result.description).toBe("");
  });

  it("rejects an empty title", () => {
    expect(createEventSchema.safeParse({ ...valid, title: "  " }).success).toBe(
      false,
    );
  });

  it("rejects an empty slot list", () => {
    expect(createEventSchema.safeParse({ ...valid, slots: [] }).success).toBe(
      false,
    );
  });

  it("rejects more than 50 slots", () => {
    const slots = Array.from({ length: 51 }, (_, i) => ({
      label: `slot-${i}`,
    }));
    expect(createEventSchema.safeParse({ ...valid, slots }).success).toBe(
      false,
    );
  });
});

describe("submitAnswerSchema", () => {
  const valid = {
    slug: SLUG,
    name: "田中",
    comment: "遅れます",
    answers: [
      { slotId: UUID, mark: "yes" },
      { slotId: UUID2, mark: "no" },
    ],
  };

  it("accepts a valid input", () => {
    expect(submitAnswerSchema.safeParse(valid).success).toBe(true);
  });

  it("defaults comment to an empty string", () => {
    const { comment: _comment, ...rest } = valid;
    expect(submitAnswerSchema.parse(rest).comment).toBe("");
  });

  it("rejects an empty name", () => {
    expect(submitAnswerSchema.safeParse({ ...valid, name: " " }).success).toBe(
      false,
    );
  });

  it("rejects an invalid slug", () => {
    expect(
      submitAnswerSchema.safeParse({ ...valid, slug: "nope" }).success,
    ).toBe(false);
  });

  it("rejects an empty answers array", () => {
    expect(
      submitAnswerSchema.safeParse({ ...valid, answers: [] }).success,
    ).toBe(false);
  });

  it("rejects duplicated slotIds", () => {
    const answers = [
      { slotId: UUID, mark: "yes" },
      { slotId: UUID, mark: "no" },
    ];
    expect(submitAnswerSchema.safeParse({ ...valid, answers }).success).toBe(
      false,
    );
  });

  it("rejects a non-uuid slotId", () => {
    const answers = [{ slotId: "abc", mark: "yes" }];
    expect(submitAnswerSchema.safeParse({ ...valid, answers }).success).toBe(
      false,
    );
  });
});

describe("updateAnswerSchema", () => {
  const valid = {
    slug: SLUG,
    participantId: UUID,
    editToken: "tok",
    name: "田中",
    comment: "",
    answers: [{ slotId: UUID2, mark: "maybe" }],
  };

  it("accepts a valid input", () => {
    expect(updateAnswerSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a missing editToken", () => {
    expect(
      updateAnswerSchema.safeParse({ ...valid, editToken: "" }).success,
    ).toBe(false);
  });

  it("rejects a non-uuid participantId", () => {
    expect(
      updateAnswerSchema.safeParse({ ...valid, participantId: "1" }).success,
    ).toBe(false);
  });
});

describe("admin action schemas", () => {
  it("closeEventSchema requires slug and adminToken", () => {
    expect(
      closeEventSchema.safeParse({ slug: SLUG, adminToken: "tok" }).success,
    ).toBe(true);
    expect(
      closeEventSchema.safeParse({ slug: SLUG, adminToken: "" }).success,
    ).toBe(false);
  });

  it("decideSlotSchema requires a uuid slotId", () => {
    expect(
      decideSlotSchema.safeParse({
        slug: SLUG,
        adminToken: "tok",
        slotId: UUID,
      }).success,
    ).toBe(true);
    expect(
      decideSlotSchema.safeParse({ slug: SLUG, adminToken: "tok", slotId: "x" })
        .success,
    ).toBe(false);
  });

  it("deleteParticipantSchema requires a uuid participantId", () => {
    expect(
      deleteParticipantSchema.safeParse({
        slug: SLUG,
        adminToken: "tok",
        participantId: UUID,
      }).success,
    ).toBe(true);
    expect(
      deleteParticipantSchema.safeParse({ slug: SLUG, adminToken: "tok" })
        .success,
    ).toBe(false);
  });
});
