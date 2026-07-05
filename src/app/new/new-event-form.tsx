"use client";

import { ja } from "date-fns/locale/ja";
import { Plus, Sun, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { createEvent } from "@/app/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveAdminToken } from "@/lib/local-storage";
import { cn } from "@/lib/utils";

interface CreatedEvent {
  slug: string;
  url: string;
}

interface TimePreset {
  key: string;
  label: string;
  value: string;
}

// 時刻プリセット(クイック追加)。押すとその時刻のエントリを追加する。
const TIME_PRESETS: TimePreset[] = [
  { key: "12", label: "12:00", value: "12:00" },
  { key: "18", label: "18:00", value: "18:00" },
  { key: "19", label: "19:00", value: "19:00" },
];

// 時刻を決めない候補を表す番兵。ラベル("M/D(曜) 終日")として保存される。
const ALL_DAY = "allday";
// 日を選んだとき/「時間を追加」で初期表示する時刻。
const DEFAULT_TIME = "19:00";

// createEventSchema.slots の .max(50) と一致させる(サーバー側が最終防衛線)。
const MAX_SLOTS = 50;

/** 各日にぶら下がる時刻エントリ。value は "HH:MM" もしくは ALL_DAY。 */
interface TimeEntry {
  id: string;
  value: string;
}

function isTimeValue(value: string): boolean {
  return /^\d{2}:\d{2}$/.test(value);
}

/** ローカルタイムのオフセット付き ISO datetime を組み立てる。例: 2026-07-10T19:00:00+09:00 */
function toLocalIso(date: Date, hour: number, minute: number): string {
  const local = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hour,
    minute,
    0,
    0,
  );
  const pad = (value: number) => String(value).padStart(2, "0");
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
function dayKey(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDayLabel(date: Date): string {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

const WEEKDAY_JA = ["日", "月", "火", "水", "木", "金", "土"];

/** 和暦の慣習に合わせ、日曜=赤・土曜=青で曜日を色づけする。 */
function weekdayClass(dow: number): string {
  if (dow === 0) return "text-destructive";
  if (dow === 6) return "text-sky-600 dark:text-sky-400";
  return "text-muted-foreground";
}

/** 時刻エントリ1件を候補ラベル文字列にする(プレビュー用)。 */
function entryLabel(day: Date, entry: TimeEntry): string {
  if (entry.value === ALL_DAY) {
    return `${formatDayLabel(day)} 終日`;
  }
  return `${formatDayLabel(day)} ${entry.value}〜`;
}

interface BuiltSlot {
  key: string;
  day: Date;
  entry: TimeEntry;
}

export function NewEventForm() {
  const searchParams = useSearchParams();
  const [title, setTitle] = useState(searchParams.get("title") ?? "");
  const [description, setDescription] = useState("");
  const [selectedDays, setSelectedDays] = useState<Date[]>([]);
  // dayKey -> 時刻エントリの配列
  const [dayTimes, setDayTimes] = useState<Record<string, TimeEntry[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedEvent | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  // エントリの安定した一意 ID を払い出す(重複時刻や time input の key 用)。
  const idCounter = useRef(0);
  const nextId = () => {
    idCounter.current += 1;
    return `t${idCounter.current}`;
  };

  const sortedDays = useMemo(
    () => [...selectedDays].sort((a, b) => a.getTime() - b.getTime()),
    [selectedDays],
  );

  // 実際に作成される候補(空/入力途中の時刻は除外)。プレビューと送信で共有する。
  const builtSlots = useMemo<BuiltSlot[]>(() => {
    const result: BuiltSlot[] = [];
    for (const day of sortedDays) {
      const entries = dayTimes[dayKey(day)] ?? [];
      for (const entry of entries) {
        if (entry.value !== ALL_DAY && !isTimeValue(entry.value)) continue;
        result.push({ key: `${dayKey(day)}-${entry.id}`, day, entry });
      }
    }
    return result;
  }, [sortedDays, dayTimes]);

  function handleSelectDays(days: Date[] | undefined) {
    const next = days ?? [];
    setSelectedDays(next);
    // 追加された日には既定時刻を1件付与し、外れた日のエントリは掃除する。
    setDayTimes((prev) => {
      const cleaned: Record<string, TimeEntry[]> = {};
      for (const day of next) {
        const key = dayKey(day);
        cleaned[key] = prev[key] ?? [{ id: nextId(), value: DEFAULT_TIME }];
      }
      return cleaned;
    });
  }

  /** 日に時刻エントリを追加する。dedupe=true なら同値が既にあれば何もしない。 */
  function addEntry(day: Date, value: string, dedupe: boolean) {
    const key = dayKey(day);
    setDayTimes((prev) => {
      const current = prev[key] ?? [];
      if (dedupe && current.some((entry) => entry.value === value)) {
        return prev;
      }
      return { ...prev, [key]: [...current, { id: nextId(), value }] };
    });
  }

  function updateEntry(day: Date, id: string, value: string) {
    const key = dayKey(day);
    setDayTimes((prev) => {
      const current = prev[key] ?? [];
      return {
        ...prev,
        [key]: current.map((entry) =>
          entry.id === id ? { ...entry, value } : entry,
        ),
      };
    });
  }

  function removeEntry(day: Date, id: string) {
    const key = dayKey(day);
    setDayTimes((prev) => {
      const current = prev[key] ?? [];
      return { ...prev, [key]: current.filter((entry) => entry.id !== id) };
    });
  }

  function buildSlotInputs(): { startsAt?: string; label?: string }[] {
    return builtSlots.map(({ day, entry }) => {
      if (entry.value === ALL_DAY) {
        return { label: `${formatDayLabel(day)} 終日` };
      }
      const [hour, minute] = entry.value.split(":").map(Number);
      return { startsAt: toLocalIso(day, hour, minute) };
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (title.trim().length === 0) {
      setError("タイトルを入力してください");
      return;
    }

    const slots = buildSlotInputs();

    if (slots.length === 0) {
      setError("カレンダーで候補日を選び、時刻を1つ以上つけてください");
      return;
    }

    if (slots.length > MAX_SLOTS) {
      setError(`候補は最大${MAX_SLOTS}件までです(現在${slots.length}件)`);
      return;
    }

    startTransition(async () => {
      const result = await createEvent({
        title: title.trim(),
        description: description.trim(),
        slots,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      saveAdminToken(result.data.slug, result.data.adminToken);
      const url = `${window.location.origin}/e/${result.data.slug}`;
      setCreated({ slug: result.data.slug, url });
    });
  }

  async function handleCopy() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("URLのコピーに失敗しました。手動でコピーしてください。");
    }
  }

  if (created) {
    return (
      <Card data-testid="created-card">
        <CardHeader>
          <CardTitle>イベントを作成しました</CardTitle>
          <CardDescription>
            この共有URLを参加者に送ってください。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              readOnly
              value={created.url}
              aria-label="共有URL"
              data-testid="share-url"
              className="flex-1"
            />
            <Button
              type="button"
              onClick={handleCopy}
              variant="outline"
              data-testid="copy-url"
            >
              {copied ? "コピーしました" : "URLをコピー"}
            </Button>
          </div>
          <Link
            href={`/e/${created.slug}`}
            className={buttonVariants({ className: "w-full" })}
            data-testid="go-to-event"
          >
            イベントページを開く
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>イベントを作成</CardTitle>
        <CardDescription>
          タイトルを入れ、カレンダーで候補日を選んで開始時刻をつけてください。時刻はプリセットからも自由入力からも設定できます。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit}
          className="space-y-5"
          data-testid="new-event-form"
        >
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">
              タイトル
            </label>
            <Input
              id="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="例: 忘年会の日程"
              maxLength={100}
              data-testid="title-input"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              メモ（任意）
            </label>
            <Textarea
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="場所や補足などがあれば記入してください"
              maxLength={2000}
              rows={3}
              data-testid="description-input"
            />
          </div>

          <div className="space-y-3">
            <span className="text-sm font-medium">候補日程</span>

            <div className="space-y-4" data-testid="calendar-mode">
              <div className="flex justify-center rounded-lg border p-2">
                <Calendar
                  mode="multiple"
                  locale={ja}
                  selected={selectedDays}
                  onSelect={handleSelectDays}
                  data-testid="calendar"
                />
              </div>

              {selectedDays.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  カレンダーで候補日をタップして選んでください。
                </p>
              ) : (
                <div className="space-y-3">
                  {sortedDays.map((day) => {
                    const key = dayKey(day);
                    const entries = dayTimes[key] ?? [];
                    const validCount = entries.filter(
                      (entry) =>
                        entry.value === ALL_DAY || isTimeValue(entry.value),
                    ).length;
                    return (
                      <div
                        key={key}
                        className="animate-rise space-y-3 rounded-2xl border bg-card/60 p-3.5 shadow-sm"
                        data-testid="calendar-day"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            aria-hidden
                            className="size-2 rounded-full bg-primary"
                          />
                          <span className="font-heading text-sm font-semibold tracking-wide">
                            {day.getMonth() + 1}/{day.getDate()}
                            <span
                              className={cn(
                                "ml-0.5",
                                weekdayClass(day.getDay()),
                              )}
                            >
                              （{WEEKDAY_JA[day.getDay()]}）
                            </span>
                          </span>
                          {validCount > 0 ? (
                            <span className="ml-auto text-muted-foreground text-xs tabular-nums">
                              {validCount}件
                            </span>
                          ) : null}
                        </div>

                        {entries.length > 0 ? (
                          <ul className="space-y-2">
                            {entries.map((entry) => (
                              <li
                                key={entry.id}
                                className="flex animate-pop-in items-center gap-2"
                                data-testid="day-time-row"
                              >
                                {entry.value === ALL_DAY ? (
                                  <span className="flex flex-1 items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-accent-foreground text-sm">
                                    <Sun className="size-3.5" />
                                    終日（時刻を決めない）
                                  </span>
                                ) : (
                                  <>
                                    <Input
                                      type="time"
                                      value={entry.value}
                                      onChange={(event) =>
                                        updateEntry(
                                          day,
                                          entry.id,
                                          event.target.value,
                                        )
                                      }
                                      aria-label={`${formatDayLabel(day)}の開始時刻`}
                                      className="w-32 tabular-nums [color-scheme:light] dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                                      data-testid="day-time-input"
                                    />
                                    <span className="text-muted-foreground text-sm">
                                      〜
                                    </span>
                                  </>
                                )}
                                <Button
                                  type="button"
                                  size="icon-sm"
                                  variant="ghost"
                                  aria-label="この時刻を削除"
                                  onClick={() => removeEntry(day, entry.id)}
                                  className="ml-auto text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                  data-testid="remove-time"
                                >
                                  <X />
                                </Button>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-muted-foreground text-xs">
                            下のボタンで時刻を追加してください。
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-1.5">
                          {TIME_PRESETS.map((preset) => (
                            <Button
                              key={preset.key}
                              type="button"
                              size="sm"
                              variant="secondary"
                              className="rounded-full tabular-nums"
                              onClick={() => addEntry(day, preset.value, true)}
                              data-testid={`time-preset-${preset.key}`}
                            >
                              ＋{preset.label}
                            </Button>
                          ))}
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="rounded-full"
                            onClick={() => addEntry(day, ALL_DAY, true)}
                            data-testid="time-preset-allday"
                          >
                            <Sun />
                            終日
                          </Button>
                          <span
                            aria-hidden
                            className="mx-0.5 h-4 w-px bg-border"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="rounded-full text-muted-foreground"
                            onClick={() => addEntry(day, DEFAULT_TIME, false)}
                            data-testid="add-time"
                          >
                            <Plus />
                            時間を追加
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {builtSlots.length > 0 ? (
                <div className="space-y-2 rounded-2xl bg-muted/40 p-3">
                  <span className="text-muted-foreground text-xs">
                    作成される候補（
                    <span className="font-semibold text-foreground tabular-nums">
                      {builtSlots.length}
                    </span>
                    件）
                  </span>
                  <ul className="flex flex-wrap gap-1.5">
                    {builtSlots.map((slot) => {
                      const isAllDay = slot.entry.value === ALL_DAY;
                      return (
                        <li
                          key={slot.key}
                          className={cn(
                            "inline-flex animate-pop-in items-center gap-1 rounded-full px-2.5 py-1 text-xs tabular-nums",
                            isAllDay
                              ? "bg-accent text-accent-foreground"
                              : "bg-secondary text-secondary-foreground",
                          )}
                          data-testid="selected-slot"
                        >
                          {isAllDay ? <Sun className="size-3" /> : null}
                          {entryLabel(slot.day, slot.entry)}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}

              <p className="text-muted-foreground text-xs">最大50件まで。</p>
            </div>
          </div>

          {error ? (
            <p
              className="text-destructive text-sm"
              role="alert"
              data-testid="new-event-error"
            >
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            className="w-full"
            disabled={pending}
            data-testid="create-submit"
          >
            {pending ? "作成中…" : "作成してURLを発行"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
