import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { answers, events, participants, slots } from "./schema";

describe("application table security", () => {
  it.each([
    ["events", events],
    ["slots", slots],
    ["participants", participants],
    ["answers", answers],
  ])("enables row-level security for %s", (_name, table) => {
    expect(getTableConfig(table).enableRLS).toBe(true);
    expect(getTableConfig(table).policies).toEqual([]);
  });
});
