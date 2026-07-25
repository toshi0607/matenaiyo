"use client";

import { sendGAEvent } from "@next/third-parties/google";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { createEvent } from "@/app/actions";
import { SlotPicker, useSlotPicker } from "@/components/slot-picker";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { MAX_SLOTS_PER_EVENT } from "@/lib/schemas";

interface CreatedEvent {
  slug: string;
  url: string;
}

export function NewEventForm() {
  const searchParams = useSearchParams();
  const [title, setTitle] = useState(searchParams.get("title") ?? "");
  const [description, setDescription] = useState("");
  const picker = useSlotPicker();
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedEvent | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (title.trim().length === 0) {
      setError("タイトルを入力してください");
      return;
    }

    const slots = picker.slotInputs;

    if (slots.length === 0) {
      setError("カレンダーで候補日を選び、時刻を1つ以上つけてください");
      return;
    }

    if (slots.length > MAX_SLOTS_PER_EVENT) {
      setError(
        `候補は最大${MAX_SLOTS_PER_EVENT}件までです(現在${slots.length}件)`,
      );
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
      sendGAEvent("event", "create_event", { candidate_count: slots.length });
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

            <SlotPicker
              picker={picker}
              footer={
                <p className="text-muted-foreground text-xs">
                  最大{MAX_SLOTS_PER_EVENT}件まで。
                </p>
              }
            />
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
