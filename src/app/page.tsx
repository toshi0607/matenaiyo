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

export default function Home() {
  const router = useRouter();
  const [title, setTitle] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = title.trim();
    const query = trimmed ? `?title=${encodeURIComponent(trimmed)}` : "";
    router.push(`/new${query}`);
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-14 sm:py-20">
      <div className="w-full max-w-xl space-y-9">
        <div className="space-y-4 text-center">
          <span className="animate-rise inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1.5 text-xs font-medium text-primary">
            <span aria-hidden="true">🍊</span>
            ログイン不要・URLひとつで完結
          </span>
          <h1 className="animate-rise text-[2.65rem] leading-[1.1] font-bold tracking-tight sm:text-6xl [animation-delay:70ms]">
            待たせない、
            <br />
            <span className="text-primary">日程調整</span>。
          </h1>
          <p className="animate-rise text-muted-foreground text-base sm:text-lg [animation-delay:140ms]">
            候補日を並べて共有するだけ。
            <br className="hidden sm:block" />
            名前と ○△× をタップすれば集計まで自動です。
          </p>
        </div>

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

        <ul className="animate-rise mx-auto grid max-w-md gap-3 sm:grid-cols-3 [animation-delay:280ms]">
          {[
            { icon: "🗓️", text: "候補を並べて共有URLを送るだけ" },
            { icon: "👆", text: "○△× をタップで回答完了" },
            { icon: "✨", text: "○最多の候補を自動ハイライト" },
          ].map((item) => (
            <li
              key={item.text}
              className="flex items-center gap-3 rounded-2xl bg-card/70 p-3.5 text-sm ring-1 ring-foreground/5 sm:flex-col sm:items-start sm:gap-2"
            >
              <span aria-hidden="true" className="text-xl">
                {item.icon}
              </span>
              <span className="text-muted-foreground leading-snug">
                {item.text}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
