/**
 * 確定した候補日時から .ics(RFC5545)と Google カレンダー追加URLを生成する。
 * 開始時刻(startsAt)必須。終了時刻は未指定なら開始+1時間をデフォルトにする。
 */

const DEFAULT_DURATION_MS = 60 * 60 * 1000;

export interface CalendarEventInput {
  /** 確定した候補の開始日時 */
  startsAt: Date;
  /** 終了日時。省略時は開始+1時間 */
  endsAt?: Date;
  /** イベント名(SUMMARY) */
  title: string;
  /** 説明(DESCRIPTION)。省略可 */
  description?: string;
  /** UID / DTSTAMP を決定的にするための基準値。省略時は startsAt/now を使う */
  uid?: string;
  /** DTSTAMP に使う生成時刻。省略時は現在時刻 */
  dtstamp?: Date;
}

/** UTC の YYYYMMDDTHHMMSSZ 形式に整形する。 */
function toIcsUtc(date: Date): string {
  const yyyy = date.getUTCFullYear().toString().padStart(4, "0");
  const mm = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const dd = date.getUTCDate().toString().padStart(2, "0");
  const hh = date.getUTCHours().toString().padStart(2, "0");
  const mi = date.getUTCMinutes().toString().padStart(2, "0");
  const ss = date.getUTCSeconds().toString().padStart(2, "0");
  return `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z`;
}

/** RFC5545 のテキスト値エスケープ(バックスラッシュ・カンマ・セミコロン・改行)。 */
function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

function resolveEnd(input: CalendarEventInput): Date {
  return (
    input.endsAt ?? new Date(input.startsAt.getTime() + DEFAULT_DURATION_MS)
  );
}

/** RFC5545 準拠の最小 VEVENT を含む VCALENDAR 文字列を返す(改行は CRLF)。 */
export function buildIcs(input: CalendarEventInput): string {
  const start = toIcsUtc(input.startsAt);
  const end = toIcsUtc(resolveEnd(input));
  const dtstamp = toIcsUtc(input.dtstamp ?? new Date());
  const uid = input.uid ?? `${start}-matenaiyo`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//matenaiyo//JP",
    "BEGIN:VEVENT",
    `UID:${escapeIcsText(uid)}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcsText(input.title)}`,
    `DESCRIPTION:${escapeIcsText(input.description ?? "")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return `${lines.join("\r\n")}\r\n`;
}

/** Google カレンダーの予定作成テンプレートURLを返す。 */
export function googleCalendarUrl(input: CalendarEventInput): string {
  const start = toIcsUtc(input.startsAt);
  const end = toIcsUtc(resolveEnd(input));
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.title,
    dates: `${start}/${end}`,
  });
  if (input.description) {
    params.set("details", input.description);
  }
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
