"use client";

import { ja } from "date-fns/locale/ja";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
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

interface CreatedEvent {
  slug: string;
  url: string;
}

type InputMode = "text" | "calendar";

interface TimePreset {
  key: string;
  label: string;
  hour: number;
  minute: number;
}

const TIME_PRESETS: TimePreset[] = [
  { key: "12", label: "12:00〜", hour: 12, minute: 0 },
  { key: "18", label: "18:00〜", hour: 18, minute: 0 },
  { key: "19", label: "19:00〜", hour: 19, minute: 0 },
  { key: "allday", label: "終日", hour: 9, minute: 0 },
];

// createEventSchema.slots の .max(50) と一致させる(サーバー側が最終防衛線)。
const MAX_SLOTS = 50;

function presetLabel(key: string): string {
  return TIME_PRESETS.find((preset) => preset.key === key)?.label ?? key;
}

function parseSlots(raw: string): { label: string }[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((label) => ({ label }));
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

interface CalendarSlot {
  date: Date;
  presetKey: string;
}

export function NewEventForm() {
  const searchParams = useSearchParams();
  const [title, setTitle] = useState(searchParams.get("title") ?? "");
  const [description, setDescription] = useState("");
  const [mode, setMode] = useState<InputMode>("text");
  const [slotsText, setSlotsText] = useState("");
  const [selectedDays, setSelectedDays] = useState<Date[]>([]);
  // dayKey -> 適用済み preset key の配列
  const [dayPresets, setDayPresets] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedEvent | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const calendarSlots = useMemo<CalendarSlot[]>(() => {
    const result: CalendarSlot[] = [];
    for (const day of selectedDays) {
      const presets = dayPresets[dayKey(day)] ?? [];
      for (const presetKey of presets) {
        result.push({ date: day, presetKey });
      }
    }
    result.sort((a, b) => {
      const diff = a.date.getTime() - b.date.getTime();
      if (diff !== 0) return diff;
      return a.presetKey.localeCompare(b.presetKey);
    });
    return result;
  }, [selectedDays, dayPresets]);

  function handleSelectDays(days: Date[] | undefined) {
    const next = days ?? [];
    setSelectedDays(next);
    // 選択解除された日の preset を掃除する
    const keys = new Set(next.map(dayKey));
    setDayPresets((prev) => {
      const cleaned: Record<string, string[]> = {};
      for (const [key, value] of Object.entries(prev)) {
        if (keys.has(key)) cleaned[key] = value;
      }
      return cleaned;
    });
  }

  function togglePreset(day: Date, presetKey: string) {
    const key = dayKey(day);
    setDayPresets((prev) => {
      const current = prev[key] ?? [];
      const next = current.includes(presetKey)
        ? current.filter((item) => item !== presetKey)
        : [...current, presetKey];
      return { ...prev, [key]: next };
    });
  }

  function buildCalendarSlotInputs(): { startsAt: string }[] {
    return calendarSlots.map((slot) => {
      const preset = TIME_PRESETS.find((item) => item.key === slot.presetKey);
      const hour = preset?.hour ?? 9;
      const minute = preset?.minute ?? 0;
      return { startsAt: toLocalIso(slot.date, hour, minute) };
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (title.trim().length === 0) {
      setError("タイトルを入力してください");
      return;
    }

    const slots =
      mode === "calendar" ? buildCalendarSlotInputs() : parseSlots(slotsText);

    if (slots.length === 0) {
      setError(
        mode === "calendar"
          ? "カレンダーで日を選び、時刻を1つ以上つけてください"
          : "候補日程を1行に1件、1つ以上入力してください",
      );
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
          タイトルと候補日程を入力してください。候補日程はカレンダーから選ぶか、テキストで直接入力できます。
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
            <div
              className="inline-flex rounded-lg border p-0.5"
              role="tablist"
              aria-label="候補日程の入力方法"
            >
              <Button
                type="button"
                size="sm"
                variant={mode === "text" ? "default" : "ghost"}
                aria-pressed={mode === "text"}
                onClick={() => setMode("text")}
                data-testid="mode-text"
              >
                テキスト
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === "calendar" ? "default" : "ghost"}
                aria-pressed={mode === "calendar"}
                onClick={() => setMode("calendar")}
                data-testid="mode-calendar"
              >
                カレンダー
              </Button>
            </div>

            {mode === "text" ? (
              <div className="space-y-2">
                <Textarea
                  id="slots"
                  value={slotsText}
                  onChange={(event) => setSlotsText(event.target.value)}
                  placeholder={
                    "12/20(金) 19:00〜\n12/21(土) 18:00〜\n12/23(月) 19:00〜"
                  }
                  rows={6}
                  data-testid="slots-input"
                />
                <p className="text-muted-foreground text-xs">
                  1行に1件。最大50件まで。空行は無視されます。
                </p>
              </div>
            ) : (
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
                    {[...selectedDays]
                      .sort((a, b) => a.getTime() - b.getTime())
                      .map((day) => {
                        const key = dayKey(day);
                        const applied = dayPresets[key] ?? [];
                        return (
                          <div
                            key={key}
                            className="space-y-2 rounded-lg border p-3"
                            data-testid="calendar-day"
                          >
                            <span className="text-sm font-medium">
                              {formatDayLabel(day)}
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {TIME_PRESETS.map((preset) => {
                                const active = applied.includes(preset.key);
                                return (
                                  <Button
                                    key={preset.key}
                                    type="button"
                                    size="sm"
                                    variant={active ? "default" : "outline"}
                                    aria-pressed={active}
                                    onClick={() =>
                                      togglePreset(day, preset.key)
                                    }
                                    data-testid={`time-preset-${preset.key}`}
                                  >
                                    {preset.label}
                                  </Button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}

                {calendarSlots.length > 0 ? (
                  <div className="space-y-2">
                    <span className="text-muted-foreground text-xs">
                      作成される候補（{calendarSlots.length}件）
                    </span>
                    <ul className="flex flex-wrap gap-2">
                      {calendarSlots.map((slot) => (
                        <li
                          key={`${dayKey(slot.date)}-${slot.presetKey}`}
                          className="rounded-md bg-muted px-2 py-1 text-xs"
                          data-testid="selected-slot"
                        >
                          {formatDayLabel(slot.date)}{" "}
                          {presetLabel(slot.presetKey)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <p className="text-muted-foreground text-xs">最大50件まで。</p>
              </div>
            )}
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
