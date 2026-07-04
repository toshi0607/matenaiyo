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
    <main className="flex flex-1 flex-col items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-xl space-y-8">
        <div className="space-y-3 text-center">
          <h1 className="text-4xl font-bold tracking-tight">chosei</h1>
          <p className="text-muted-foreground text-lg">
            ログイン不要・URLひとつで完結する、かんたん日程調整
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>イベントを作成</CardTitle>
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
                className="flex-1"
                data-testid="home-title-input"
              />
              <Button type="submit" data-testid="home-submit">
                作成する
              </Button>
            </form>
          </CardContent>
        </Card>

        <ul className="text-muted-foreground mx-auto max-w-md space-y-2 text-sm">
          <li>候補日程を並べて、参加者に共有URLを送るだけ。</li>
          <li>回答は名前と ○△× をタップするだけで完了。</li>
          <li>○が最多の候補日が自動でハイライトされます。</li>
        </ul>
      </div>
    </main>
  );
}
