"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function EventTitleForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = title.trim();
    const query = trimmed ? `?title=${encodeURIComponent(trimmed)}` : "";
    router.push(`/new${query}`);
  }

  return (
    <Card className="animate-rise ring-primary/10 [animation-delay:210ms]">
      <CardHeader>
        <CardTitle className="text-lg">イベントを作成</CardTitle>
        <CardDescription>
          タイトルを入力してはじめましょう。アカウント登録は不要です。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 sm:flex-row"
          data-testid="home-form"
        >
          <Input
            type="text"
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="例: 忘年会の日程"
            aria-label="イベントのタイトル"
            maxLength={100}
            className="h-12 flex-1 rounded-xl text-base"
            data-testid="home-title-input"
          />
          <Button
            type="submit"
            className="h-12 rounded-xl px-6 text-base font-bold shadow-sm shadow-primary/20 sm:px-7"
            data-testid="home-submit"
          >
            作成する →
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
