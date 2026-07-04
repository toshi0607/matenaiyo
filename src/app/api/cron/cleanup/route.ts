import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { deleteStaleEvents } from "@/lib/cleanup";

/** 秘密比較のタイミング攻撃を避けるため定数時間で比較する。 */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

// DB へアクセスするため Node.js ランタイムで動かす(edge では postgres-js が不安定)。
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 最終更新から一定期間経過したイベントを削除する Vercel Cron 用エンドポイント。
 *
 * 誤爆防止(最重要):
 * - CRON_SECRET が未設定なら 500 を返し、何も削除しない。
 * - Authorization ヘッダが `Bearer ${CRON_SECRET}` と一致しない場合は 401。
 * Vercel Cron は設定された CRON_SECRET を Authorization ヘッダに自動付与する。
 */
export async function GET(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 500 },
    );
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader || !safeEqual(authHeader, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deleted = await deleteStaleEvents(new Date());
  return NextResponse.json({ deleted });
}
