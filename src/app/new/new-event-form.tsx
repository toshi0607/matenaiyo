"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { createEvent } from "@/app/actions";
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

interface CreatedEvent {
  slug: string;
  url: string;
}

function parseSlots(raw: string): { label: string }[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((label) => ({ label }));
}

export function NewEventForm() {
  const searchParams = useSearchParams();
  const [title, setTitle] = useState(searchParams.get("title") ?? "");
  const [description, setDescription] = useState("");
  const [slotsText, setSlotsText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedEvent | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const slots = parseSlots(slotsText);
    if (title.trim().length === 0) {
      setError("タイトルを入力してください");
      return;
    }
    if (slots.length === 0) {
      setError("候補日程を1行に1件、1つ以上入力してください");
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
          タイトルと候補日程を入力してください。候補日程は1行に1件で入力します。
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

          <div className="space-y-2">
            <label htmlFor="slots" className="text-sm font-medium">
              候補日程（1行に1件）
            </label>
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
              最大50件まで。空行は無視されます。
            </p>
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
