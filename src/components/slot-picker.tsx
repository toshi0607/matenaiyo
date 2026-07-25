"use client";

import { ja } from "date-fns/locale/ja";
import { Plus, Sun, X } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import type { SlotInput } from "@/lib/schemas";
import {
  ALL_DAY,
  type BuiltSlot,
  buildSlots,
  DEFAULT_TIME,
  dayKey,
  entryLabel,
  formatDayLabel,
  isCompleteEntry,
  TIME_PRESETS,
  type TimeEntry,
  toSlotInputs,
  WEEKDAY_JA,
} from "@/lib/slot-draft";
import { cn } from "@/lib/utils";

export interface SlotPickerState {
  selectedDays: Date[];
  sortedDays: Date[];
  dayTimes: Record<string, TimeEntry[]>;
  builtSlots: BuiltSlot[];
  slotInputs: SlotInput[];
  selectDays: (days: Date[] | undefined) => void;
  addEntry: (day: Date, value: string, dedupe: boolean) => void;
  updateEntry: (day: Date, id: string, value: string) => void;
  removeEntry: (day: Date, id: string) => void;
  reset: () => void;
}

/**
 * カレンダーで候補日程を下書きする状態を持つ hook。
 * 状態は呼び出し側が保持し、描画は <SlotPicker picker={...} /> に任せる。
 */
export function useSlotPicker(): SlotPickerState {
  const [selectedDays, setSelectedDays] = useState<Date[]>([]);
  // dayKey -> 時刻エントリの配列
  const [dayTimes, setDayTimes] = useState<Record<string, TimeEntry[]>>({});

  // エントリの安定した一意 ID を払い出す(重複時刻や time input の key 用)。
  const idCounter = useRef(0);
  const nextId = useCallback(() => {
    idCounter.current += 1;
    return `t${idCounter.current}`;
  }, []);

  const sortedDays = useMemo(
    () => [...selectedDays].sort((a, b) => a.getTime() - b.getTime()),
    [selectedDays],
  );

  // 実際に作成される候補(空/入力途中の時刻は除外)。プレビューと送信で共有する。
  const builtSlots = useMemo(
    () => buildSlots(sortedDays, dayTimes),
    [sortedDays, dayTimes],
  );

  const selectDays = useCallback(
    (days: Date[] | undefined) => {
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
    },
    [nextId],
  );

  /** 日に時刻エントリを追加する。dedupe=true なら同値が既にあれば何もしない。 */
  const addEntry = useCallback(
    (day: Date, value: string, dedupe: boolean) => {
      const key = dayKey(day);
      setDayTimes((prev) => {
        const current = prev[key] ?? [];
        if (dedupe && current.some((entry) => entry.value === value)) {
          return prev;
        }
        return { ...prev, [key]: [...current, { id: nextId(), value }] };
      });
    },
    [nextId],
  );

  const updateEntry = useCallback((day: Date, id: string, value: string) => {
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
  }, []);

  const removeEntry = useCallback((day: Date, id: string) => {
    const key = dayKey(day);
    setDayTimes((prev) => {
      const current = prev[key] ?? [];
      return { ...prev, [key]: current.filter((entry) => entry.id !== id) };
    });
  }, []);

  const reset = useCallback(() => {
    setSelectedDays([]);
    setDayTimes({});
  }, []);

  return {
    selectedDays,
    sortedDays,
    dayTimes,
    builtSlots,
    slotInputs: useMemo(() => toSlotInputs(builtSlots), [builtSlots]),
    selectDays,
    addEntry,
    updateEntry,
    removeEntry,
    reset,
  };
}

/** 和暦の慣習に合わせ、日曜=赤・土曜=青で曜日を色づけする。 */
function weekdayClass(dow: number): string {
  if (dow === 0) return "text-destructive";
  if (dow === 6) return "text-sky-600 dark:text-sky-400";
  return "text-muted-foreground";
}

/**
 * カレンダー + 各日の時刻エントリ + 作成プレビューをまとめた候補日程ピッカー。
 * 状態は useSlotPicker() が持つ。footer には件数の注意書きなどを差し込める。
 */
export function SlotPicker({
  picker,
  previewLabel = "作成される候補",
  footer,
}: {
  picker: SlotPickerState;
  previewLabel?: string;
  footer?: React.ReactNode;
}) {
  const { sortedDays, dayTimes, builtSlots } = picker;

  return (
    <div className="space-y-4" data-testid="calendar-mode">
      <div className="flex justify-center rounded-lg border p-2">
        <Calendar
          mode="multiple"
          locale={ja}
          selected={picker.selectedDays}
          onSelect={picker.selectDays}
          data-testid="calendar"
        />
      </div>

      {picker.selectedDays.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          カレンダーで候補日をタップして選んでください。
        </p>
      ) : (
        <div className="space-y-3">
          {sortedDays.map((day) => {
            const key = dayKey(day);
            const entries = dayTimes[key] ?? [];
            const validCount = entries.filter(isCompleteEntry).length;
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
                    <span className={cn("ml-0.5", weekdayClass(day.getDay()))}>
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
                                picker.updateEntry(
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
                          onClick={() => picker.removeEntry(day, entry.id)}
                          className="ml-auto text-muted-foreground hover:bg-destructive/10 hover:text-destructive dark:hover:bg-destructive/20 dark:hover:text-destructive"
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
                      onClick={() => picker.addEntry(day, preset.value, true)}
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
                    onClick={() => picker.addEntry(day, ALL_DAY, true)}
                    data-testid="time-preset-allday"
                  >
                    <Sun />
                    終日
                  </Button>
                  <span aria-hidden className="mx-0.5 h-4 w-px bg-border" />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="rounded-full text-muted-foreground"
                    onClick={() => picker.addEntry(day, DEFAULT_TIME, false)}
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
            {previewLabel}（
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

      {footer}
    </div>
  );
}
