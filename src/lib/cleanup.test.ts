import { describe, expect, it } from "vitest";
import { cutoffDate, DEFAULT_RETENTION_MONTHS } from "./cleanup";

describe("cutoffDate", () => {
  it("defaults to 6 months before now", () => {
    const now = new Date("2026-07-05T12:00:00.000Z");
    const cutoff = cutoffDate(now);
    expect(cutoff.toISOString()).toBe("2026-01-05T12:00:00.000Z");
  });

  it("uses DEFAULT_RETENTION_MONTHS of 6", () => {
    expect(DEFAULT_RETENTION_MONTHS).toBe(6);
  });

  it("respects a custom retention period", () => {
    const now = new Date("2026-07-05T00:00:00.000Z");
    const cutoff = cutoffDate(now, 3);
    expect(cutoff.toISOString()).toBe("2026-04-05T00:00:00.000Z");
  });

  it("does not mutate the input date", () => {
    const now = new Date("2026-07-05T12:00:00.000Z");
    const snapshot = now.toISOString();
    cutoffDate(now);
    expect(now.toISOString()).toBe(snapshot);
  });

  it("crosses the year boundary correctly", () => {
    const now = new Date("2026-03-15T00:00:00.000Z");
    const cutoff = cutoffDate(now, 6);
    expect(cutoff.toISOString()).toBe("2025-09-15T00:00:00.000Z");
  });

  it("clamps month-end overflow to the last day of the target month", () => {
    // 8/31 の6ヶ月前は 2月。2/31 → 3/3 に繰り上げず、2/28 にクランプする。
    const now = new Date("2026-08-31T00:00:00.000Z");
    const cutoff = cutoffDate(now, 6);
    expect(cutoff.toISOString()).toBe("2026-02-28T00:00:00.000Z");
  });
});
