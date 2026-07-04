import { describe, expect, it } from "vitest";
import {
  buildIcs,
  type CalendarEventInput,
  googleCalendarUrl,
} from "./calendar-export";

const base: CalendarEventInput = {
  startsAt: new Date("2026-02-01T10:00:00Z"),
  title: "飲み会",
  description: "渋谷に集合",
  dtstamp: new Date("2026-01-15T09:30:00Z"),
  uid: "fixed-uid",
};

describe("buildIcs", () => {
  it("includes required fields with UTC YYYYMMDDTHHMMSSZ formatting", () => {
    // #given 固定の開始日時と dtstamp
    // #when ics を生成する
    const ics = buildIcs(base);

    // #then 必須フィールドが UTC 形式で含まれる
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("VERSION:2.0");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("UID:fixed-uid");
    expect(ics).toContain("DTSTAMP:20260115T093000Z");
    expect(ics).toContain("DTSTART:20260201T100000Z");
    expect(ics).toContain("SUMMARY:飲み会");
    expect(ics).toContain("END:VEVENT");
    expect(ics).toContain("END:VCALENDAR");
  });

  it("defaults DTEND to start + 1 hour", () => {
    // #given 終了時刻なし
    // #when ics を生成する
    const ics = buildIcs(base);

    // #then DTEND は開始+1時間
    expect(ics).toContain("DTEND:20260201T110000Z");
  });

  it("honors an explicit endsAt", () => {
    // #given 明示的な終了時刻
    const ics = buildIcs({
      ...base,
      endsAt: new Date("2026-02-01T12:30:00Z"),
    });

    // #then その終了時刻が使われる
    expect(ics).toContain("DTEND:20260201T123000Z");
  });

  it("uses CRLF line endings", () => {
    // #when ics を生成する
    const ics = buildIcs(base);

    // #then 各行が CRLF で区切られている
    expect(ics).toContain("\r\n");
    expect(ics.split("\r\n")[0]).toBe("BEGIN:VCALENDAR");
    expect(ics.endsWith("\r\n")).toBe(true);
  });

  it("escapes commas, semicolons, backslashes and newlines in text", () => {
    // #given 特殊文字を含むタイトルと説明
    const ics = buildIcs({
      ...base,
      title: "A, B; C\\D",
      description: "line1\nline2",
    });

    // #then エスケープされて出力される
    expect(ics).toContain("SUMMARY:A\\, B\\; C\\\\D");
    expect(ics).toContain("DESCRIPTION:line1\\nline2");
  });

  it("derives a deterministic UID from the start when none given", () => {
    // #given uid 未指定
    const ics = buildIcs({ ...base, uid: undefined });

    // #then 開始日時ベースの UID になる
    expect(ics).toContain("UID:20260201T100000Z-matenaiyo");
  });
});

describe("googleCalendarUrl", () => {
  it("builds a TEMPLATE render URL with encoded text and dates", () => {
    // #when Google カレンダーURLを生成する
    const url = new URL(googleCalendarUrl(base));

    // #then クエリが正しく組み立てられる
    expect(url.origin + url.pathname).toBe(
      "https://calendar.google.com/calendar/render",
    );
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
    expect(url.searchParams.get("text")).toBe("飲み会");
    expect(url.searchParams.get("dates")).toBe(
      "20260201T100000Z/20260201T110000Z",
    );
    expect(url.searchParams.get("details")).toBe("渋谷に集合");
  });

  it("omits details when description is empty", () => {
    // #given 説明なし
    const url = new URL(googleCalendarUrl({ ...base, description: undefined }));

    // #then details は含まれない
    expect(url.searchParams.has("details")).toBe(false);
  });
});
