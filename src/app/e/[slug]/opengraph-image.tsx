import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ImageResponse } from "next/og";
import { db } from "@/db";
import { events, participants } from "@/db/schema";
import {
  checkRateLimit,
  clientIdentifier,
  OGP_IMAGE_LIMIT,
} from "@/lib/rate-limit";
import { slugSchema } from "@/lib/schemas";

// DB を読むため Node.js ランタイム(edge では postgres-js が不安定)。
export const runtime = "nodejs";
// OGP は多数のクローラから繰り返し叩かれるため、slug 単位で 5 分 ISR キャッシュし、
// 毎リクエストの DB クエリ + フォント fetch を避ける(回答数の反映は最大5分遅延で許容)。
export const revalidate = 300;

export const alt = "matenaiyo イベント";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Response> {
  const { slug } = await params;
  // Reject malformed input without touching rate-limit state, the database, or fonts.
  if (!slugSchema.safeParse(slug).success) {
    notFound();
  }

  // 正形式の不存在 slug を大量生成する攻撃でも DB 照会を無制限に行わせない。
  if (!(await checkRateLimit(OGP_IMAGE_LIMIT, await clientIdentifier()))) {
    return new Response("Too Many Requests", { status: 429 });
  }

  const event = await db.query.events.findFirst({
    where: eq(events.slug, slug),
    columns: { id: true, title: true },
  });
  // Do not make any follow-up request for an event that does not exist.
  if (!event) {
    notFound();
  }

  const count = await db.$count(
    participants,
    eq(participants.eventId, event.id),
  );

  // next/og は指定フォントに無い任意 Unicode を Google Fonts へ補完取得する。
  // capability 配下の UGC を第三者へ送らないため、OGP は ASCII 固定文と件数だけを描画する。
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#0a0a0a",
        color: "#fafafa",
        padding: "72px",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          fontSize: 30,
          color: "#a1a1aa",
          letterSpacing: "0.05em",
        }}
      >
        matenaiyo | Event scheduling
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 68,
          fontWeight: 400,
          lineHeight: 1.2,
          maxHeight: 340,
          overflow: "hidden",
        }}
      >
        Event schedule
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          fontSize: 40,
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            background: "#059669",
            color: "#ffffff",
            padding: "8px 28px",
            borderRadius: "9999px",
            fontWeight: 600,
          }}
        >
          Answers: {count}
        </span>
      </div>
    </div>,
    size,
  );
}
