import { describe, expect, it } from "vitest";
import { bestSlotIds, type SlotAnswer, tallySlots } from "./tally";

const answer = (slotId: string, mark: SlotAnswer["mark"]): SlotAnswer => ({
  slotId,
  mark,
});

describe("tallySlots", () => {
  it("counts yes/maybe/no per slot", () => {
    const result = tallySlots(
      ["s1", "s2"],
      [
        answer("s1", "yes"),
        answer("s1", "yes"),
        answer("s1", "maybe"),
        answer("s2", "no"),
        answer("s2", "maybe"),
      ],
    );
    expect(result).toEqual([
      { slotId: "s1", yes: 2, maybe: 1, no: 0, isBest: true },
      { slotId: "s2", yes: 0, maybe: 1, no: 1, isBest: false },
    ]);
  });

  it("marks a single best slot with the most yes votes", () => {
    const result = tallySlots(
      ["s1", "s2", "s3"],
      [
        answer("s1", "yes"),
        answer("s2", "yes"),
        answer("s2", "yes"),
        answer("s3", "no"),
      ],
    );
    expect(bestSlotIds(result)).toEqual(["s2"]);
  });

  it("marks multiple best slots on a tie", () => {
    const result = tallySlots(
      ["s1", "s2", "s3"],
      [answer("s1", "yes"), answer("s2", "yes"), answer("s3", "maybe")],
    );
    expect(bestSlotIds(result)).toEqual(["s1", "s2"]);
  });

  it("marks no best slot when there are no yes votes", () => {
    const result = tallySlots(
      ["s1", "s2"],
      [answer("s1", "maybe"), answer("s2", "no")],
    );
    expect(bestSlotIds(result)).toEqual([]);
  });

  it("returns zero counts and no best for empty answers", () => {
    const result = tallySlots(["s1"], []);
    expect(result).toEqual([
      { slotId: "s1", yes: 0, maybe: 0, no: 0, isBest: false },
    ]);
  });

  it("returns an empty array for no slots", () => {
    expect(tallySlots([], [answer("s1", "yes")])).toEqual([]);
  });

  it("ignores answers for unknown slots", () => {
    const result = tallySlots(
      ["s1"],
      [answer("ghost", "yes"), answer("s1", "maybe")],
    );
    expect(result).toEqual([
      { slotId: "s1", yes: 0, maybe: 1, no: 0, isBest: false },
    ]);
  });

  it("preserves the order of slotIds", () => {
    const result = tallySlots(["s3", "s1", "s2"], [answer("s1", "yes")]);
    expect(result.map((tally) => tally.slotId)).toEqual(["s3", "s1", "s2"]);
  });
});
