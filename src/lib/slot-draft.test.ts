import { describe, expect, it } from "vitest";
import {
  ALL_DAY,
  buildSlots,
  dayKey,
  entryLabel,
  isCompleteEntry,
  toLocalIso,
  toSlotInputs,
} from "./slot-draft";

const JULY_10 = new Date(2026, 6, 10);
const JULY_9 = new Date(2026, 6, 9);

describe("toLocalIso", () => {
  it("keeps the wall-clock time and appends the local offset", () => {
    // #given ローカルタイムの 2026-07-10 と 19:00
    // #when ISO 文字列に変換する
    const iso = toLocalIso(JULY_10, 19, 0);

    // #then 壁時計の値は保たれ、末尾にオフセットが付く
    expect(iso).toMatch(/^2026-07-10T19:00:00[+-]\d{2}:\d{2}$/);
  });

  it("round-trips to the same local date and time", () => {
    // #given 深夜に近い時刻(オフセット計算の取り違えが出やすい)
    // #when ISO を経由して Date に戻す
    const parsed = new Date(toLocalIso(JULY_10, 0, 30));

    // #then 同じローカル日時に戻る
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(6);
    expect(parsed.getDate()).toBe(10);
    expect(parsed.getHours()).toBe(0);
    expect(parsed.getMinutes()).toBe(30);
  });

  it("zero-pads single-digit month, day, hour and minute", () => {
    // #given 1桁になる月日時分
    // #when ISO 文字列に変換する
    const iso = toLocalIso(new Date(2026, 0, 5), 9, 5);

    // #then すべてゼロ埋めされる
    expect(iso.startsWith("2026-01-05T09:05:00")).toBe(true);
  });
});

describe("dayKey", () => {
  it("formats a date as a zero-padded YYYY-MM-DD key", () => {
    // #given 1桁の月日
    // #when キーに変換する / #then ゼロ埋めされる
    expect(dayKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("isCompleteEntry", () => {
  it("accepts all-day and HH:MM values", () => {
    expect(isCompleteEntry({ id: "a", value: ALL_DAY })).toBe(true);
    expect(isCompleteEntry({ id: "a", value: "19:00" })).toBe(true);
  });

  it("rejects empty or partial time input", () => {
    expect(isCompleteEntry({ id: "a", value: "" })).toBe(false);
    expect(isCompleteEntry({ id: "a", value: "9:0" })).toBe(false);
  });
});

describe("entryLabel", () => {
  it("labels an all-day entry with 終日", () => {
    // #given 終日エントリ
    // #when ラベル化する / #then 「終日」が付く
    expect(entryLabel(JULY_10, { id: "a", value: ALL_DAY })).toContain("終日");
  });

  it("labels a timed entry with the start time", () => {
    expect(entryLabel(JULY_10, { id: "a", value: "19:00" })).toContain(
      "19:00〜",
    );
  });
});

describe("buildSlots", () => {
  it("keeps the given day order and drops incomplete entries", () => {
    // #given 2日ぶんのエントリ(1件は入力途中)
    const dayTimes = {
      [dayKey(JULY_9)]: [
        { id: "a", value: "19:00" },
        { id: "b", value: "" },
      ],
      [dayKey(JULY_10)]: [{ id: "c", value: ALL_DAY }],
    };

    // #when 候補を組み立てる
    const built = buildSlots([JULY_9, JULY_10], dayTimes);

    // #then 入力途中は除外され、渡した日付順に並ぶ
    expect(built.map((slot) => slot.entry.id)).toEqual(["a", "c"]);
  });

  it("returns an empty list when no day is selected", () => {
    expect(buildSlots([], {})).toEqual([]);
  });
});

describe("toSlotInputs", () => {
  it("maps a timed entry to startsAt and an all-day entry to label", () => {
    // #given 時刻付きと終日の候補
    const built = buildSlots([JULY_10], {
      [dayKey(JULY_10)]: [
        { id: "a", value: "19:00" },
        { id: "b", value: ALL_DAY },
      ],
    });

    // #when Server Action の入力に変換する
    const inputs = toSlotInputs(built);

    // #then 時刻付きは startsAt のみ、終日は label のみを持つ
    expect(inputs[0].startsAt).toMatch(/^2026-07-10T19:00:00[+-]\d{2}:\d{2}$/);
    expect(inputs[0].label).toBeUndefined();
    expect(inputs[1].startsAt).toBeUndefined();
    expect(inputs[1].label).toContain("終日");
  });
});
