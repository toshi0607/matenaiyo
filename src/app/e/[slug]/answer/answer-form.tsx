"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { submitAnswer, updateAnswer } from "@/app/actions";
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
import { loadEditCredential, saveEditCredential } from "@/lib/local-storage";
import { MARK_META } from "@/lib/marks";
import type { Mark } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import type { ExistingAnswerSet } from "./page";

export interface SlotView {
  id: string;
  label: string;
}

const DEFAULT_MARK: Mark = "maybe";

// 出欠マークごとのアクティブ配色。○=参加(緑)/△=未定(琥珀)/×=不参加(薔薇)。
const MARK_ACTIVE: Record<Mark, string> = {
  yes: "border-emerald-500 bg-emerald-500 text-white shadow-sm shadow-emerald-500/25 hover:bg-emerald-500 hover:text-white",
  maybe:
    "border-amber-400 bg-amber-400 text-amber-950 shadow-sm shadow-amber-400/25 hover:bg-amber-400 hover:text-amber-950",
  no: "border-rose-500 bg-rose-500 text-white shadow-sm shadow-rose-500/25 hover:bg-rose-500 hover:text-white",
};

function buildDefaultMarks(slots: SlotView[]): Record<string, Mark> {
  return Object.fromEntries(slots.map((slot) => [slot.id, DEFAULT_MARK]));
}

export function AnswerForm({
  slug,
  slots,
  closed,
  existing,
}: {
  slug: string;
  slots: SlotView[];
  closed: boolean;
  existing: ExistingAnswerSet[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [marks, setMarks] = useState<Record<string, Mark>>(() =>
    buildDefaultMarks(slots),
  );
  const [editCredential, setEditCredential] = useState<{
    participantId: string;
    editToken: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  // 既存回答があれば初期表示（再編集導線）
  useEffect(() => {
    const credential = loadEditCredential(slug);
    if (!credential) return;
    const mine = existing.find(
      (item) => item.participantId === credential.participantId,
    );
    if (!mine) return;
    setEditCredential(credential);
    setName(mine.name);
    setComment(mine.comment);
    setMarks((prev) => {
      const next = { ...prev };
      for (const slot of slots) {
        next[slot.id] = mine.marks[slot.id] ?? DEFAULT_MARK;
      }
      return next;
    });
  }, [slug, existing, slots]);

  function setMark(slotId: string, mark: Mark) {
    setMarks((prev) => ({ ...prev, [slotId]: mark }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (name.trim().length === 0) {
      setError("名前を入力してください");
      return;
    }

    const answers = slots.map((slot) => ({
      slotId: slot.id,
      mark: marks[slot.id] ?? DEFAULT_MARK,
    }));

    startTransition(async () => {
      if (editCredential) {
        const result = await updateAnswer({
          slug,
          participantId: editCredential.participantId,
          editToken: editCredential.editToken,
          name: name.trim(),
          comment: comment.trim(),
          answers,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
      } else {
        const result = await submitAnswer({
          slug,
          name: name.trim(),
          comment: comment.trim(),
          answers,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        saveEditCredential(slug, {
          participantId: result.data.participantId,
          editToken: result.data.editToken,
        });
      }
      setDone(true);
      router.refresh();
    });
  }

  if (closed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>このイベントは締め切られています</CardTitle>
          <CardDescription>新しい回答は受け付けていません。</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href={`/e/${slug}`} className={buttonVariants()}>
            集計を見る
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (done) {
    return (
      <Card data-testid="answer-done">
        <CardHeader>
          <CardTitle>回答を保存しました</CardTitle>
          <CardDescription>
            この端末では「回答を編集」できます。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Link
            href={`/e/${slug}`}
            className={buttonVariants({ className: "flex-1" })}
            data-testid="back-to-event"
          >
            集計を見る
          </Link>
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => setDone(false)}
          >
            続けて編集する
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
      data-testid="answer-form"
    >
      {editCredential ? (
        <p
          className="rounded-md bg-muted px-3 py-2 text-sm"
          data-testid="editing-notice"
        >
          あなたの既存の回答を編集しています。
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>あなたの情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              名前
            </label>
            <Input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="例: 山田"
              maxLength={50}
              data-testid="answer-name"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="comment" className="text-sm font-medium">
              ひとことコメント（任意）
            </label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="遅れて参加します など"
              maxLength={500}
              rows={2}
              data-testid="answer-comment"
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">出欠</h2>
        {slots.map((slot) => (
          <Card key={slot.id} data-testid="answer-slot">
            <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="font-medium">{slot.label}</span>
              <div
                className="grid grid-cols-3 gap-2 sm:flex"
                role="radiogroup"
                aria-label={`${slot.label} の出欠`}
              >
                {MARK_META.map((item) => {
                  const active = (marks[slot.id] ?? DEFAULT_MARK) === item.mark;
                  return (
                    <Button
                      key={item.mark}
                      type="button"
                      variant="outline"
                      aria-pressed={active}
                      onClick={() => setMark(slot.id, item.mark)}
                      data-testid={`mark-${item.mark}`}
                      data-slot-id={slot.id}
                      data-active={active ? "true" : "false"}
                      className={cn(
                        "h-11 min-h-11 flex-1 text-[0.95rem] font-semibold transition-all",
                        active && MARK_ACTIVE[item.mark],
                      )}
                    >
                      <span aria-hidden="true">{item.symbol}</span> {item.label}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {error ? (
        <p
          className="text-destructive text-sm"
          role="alert"
          data-testid="answer-error"
        >
          {error}
        </p>
      ) : null}

      <div className="sticky bottom-0 -mx-4 flex flex-col gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:static sm:mx-0 sm:flex-row sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
        <Button
          type="submit"
          className="h-11 min-h-11 flex-1"
          disabled={pending}
          data-testid="answer-submit"
        >
          {pending
            ? "送信中…"
            : editCredential
              ? "回答を更新する"
              : "回答を送信する"}
        </Button>
        <Link
          href={`/e/${slug}`}
          className={buttonVariants({
            variant: "ghost",
            className: "h-11 flex-1",
          })}
        >
          キャンセル
        </Link>
      </div>
    </form>
  );
}
