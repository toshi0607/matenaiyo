"use client";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildIcs, googleCalendarUrl } from "@/lib/calendar-export";
import { cn } from "@/lib/utils";

export interface DecidedBannerProps {
  /** 確定した候補の表示ラベル */
  slotLabel: string;
  /** 確定した候補の開始日時(ISO)。label のみの候補では null */
  startsAt: string | null;
  title: string;
  description: string;
}

/**
 * 日程確定バナー。starts_at があれば .ics ダウンロードと Google カレンダー追加を出す。
 * label のみ(日時なし)の候補が確定された場合はバナーのみ表示する。
 */
export function DecidedBanner({
  slotLabel,
  startsAt,
  title,
  description,
}: DecidedBannerProps) {
  const start = startsAt ? new Date(startsAt) : null;
  const hasDateTime = start !== null && !Number.isNaN(start.getTime());

  const calendarInput = hasDateTime
    ? { startsAt: start, title, description: description || undefined }
    : null;

  function handleIcsDownload() {
    if (!calendarInput) return;
    const ics = buildIcs(calendarInput);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "event.ics";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <Card
      className="border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40"
      data-testid="decided-banner"
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span
            className="rounded bg-emerald-600 px-1.5 py-0.5 text-xs font-semibold text-white"
            aria-hidden="true"
          >
            確定
          </span>
          日程が確定しました
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-lg font-medium" data-testid="decided-slot-label">
          {slotLabel}
        </p>
        {calendarInput ? (
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleIcsDownload}
              className={buttonVariants({ variant: "outline" })}
              data-testid="ics-download"
            >
              .ics をダウンロード
            </button>
            <a
              href={googleCalendarUrl(calendarInput)}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "outline" }))}
              data-testid="gcal-link"
            >
              Google カレンダーに追加
            </a>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            日時が未設定のため、カレンダー連携は利用できません。
          </p>
        )}
      </CardContent>
    </Card>
  );
}
