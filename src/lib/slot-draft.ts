/**
 * カレンダーで候補日程を組み立てるための純ロジック。
 * 「日付 × 時刻エントリ」の下書き状態を Server Action に渡す slot 入力へ変換する。
 * イベント作成(/new)と幹事の候補追加(/e/[slug]/admin)で共有する。
 */

import type { SlotInput } from "@/lib/schemas";

/** 各日にぶら下がる時刻エントリ。value は "HH:MM" もしくは ALL_DAY。 */
export interface TimeEntry {
  id: string;
  value: string;
}

export interface TimePreset {
  key: string;
  label: string;
  value: string;
}

/** 時刻を決めない候補を表す番兵。ラベル("M/D(曜) 終日")として保存される。 */
export const ALL_DAY = "allday";

/** 日を選んだとき/「時間を追加」で初期表示する時刻。 */
export const DEFAULT_TIME = "19:00";

/** 時刻プリセット(クイック追加)。押すとその時刻のエントリを追加する。 */
export const TIME_PRESETS: readonly TimePreset[] = [
  { key: "12", label: "12:00", value: "12:00" },
  { key: "18", label: "18:00", value: "18:00" },
  { key: "19", label: "19:00", value: "19:00" },
];

export const WEEKDAY_JA = ["日", "月", "火", "水", "木", "金", "土"];

/** 実際に候補として作られる 1 件(入力途中の時刻を除外したもの)。 */
export interface BuiltSlot {
  key: string;
  day: Date;
  entry: TimeEntry;
}

export function isTimeValue(value: string): boolean {
  return /^\d{2}:\d{2}$/.test(value);
}

/** 時刻エントリが候補として成立しているか(終日 または "HH:MM")。 */
export function isCompleteEntry(entry: TimeEntry): boolean {
  return entry.value === ALL_DAY || isTimeValue(entry.value);
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** ローカルタイムのオフセット付き ISO datetime を組み立てる。例: 2026-07-10T19:00:00+09:00 */
export function toLocalIso(date: Date, hour: number, minute: number): string {
  const local = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hour,
    minute,
    0,
    0,
  );
  const offsetMinutes = -local.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absOffset = Math.abs(offsetMinutes);
  const offset = `${sign}${pad(Math.floor(absOffset / 60))}:${pad(absOffset % 60)}`;
  return (
    `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}` +
    `T${pad(local.getHours())}:${pad(local.getMinutes())}:00${offset}`
  );
}

/** 日付を YYYY-MM-DD のキーに正規化する(選択状態のマップ用)。 */
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatDayLabel(date: Date): string {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

/** 時刻エントリ1件を候補ラベル文字列にする(プレビュー用)。 */
export function entryLabel(day: Date, entry: TimeEntry): string {
  if (entry.value === ALL_DAY) {
    return `${formatDayLabel(day)} 終日`;
  }
  return `${formatDayLabel(day)} ${entry.value}〜`;
}

/**
 * 日付順に並んだ日と時刻エントリから、実際に作られる候補一覧を組み立てる。
 * 入力途中(空文字や不正な時刻)のエントリは除外する。
 */
export function buildSlots(
  sortedDays: readonly Date[],
  dayTimes: Record<string, TimeEntry[]>,
): BuiltSlot[] {
  const result: BuiltSlot[] = [];
  for (const day of sortedDays) {
    const key = dayKey(day);
    for (const entry of dayTimes[key] ?? []) {
      if (!isCompleteEntry(entry)) continue;
      result.push({ key: `${key}-${entry.id}`, day, entry });
    }
  }
  return result;
}

/** 候補 1 件を Server Action の slot 入力に変換する。終日は label、時刻付きは startsAt。 */
export function toSlotInput({ day, entry }: BuiltSlot): SlotInput {
  if (entry.value === ALL_DAY) {
    return { label: `${formatDayLabel(day)} 終日` };
  }
  const [hour, minute] = entry.value.split(":").map(Number);
  return { startsAt: toLocalIso(day, hour, minute) };
}

export function toSlotInputs(slots: readonly BuiltSlot[]): SlotInput[] {
  return slots.map(toSlotInput);
}
