import { eq } from "drizzle-orm";
import { ImageResponse } from "next/og";
import { db } from "@/db";
import { events, participants } from "@/db/schema";

// DB を読むため Node.js ランタイム(edge では postgres-js が不安定)。
export const runtime = "nodejs";
// OGP は多数のクローラから繰り返し叩かれるため、slug 単位で 5 分 ISR キャッシュし、
// 毎リクエストの DB クエリ + フォント fetch を避ける(回答数の反映は最大5分遅延で許容)。
export const revalidate = 300;

export const alt = "matenaiyo イベント";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * next/og(satori)は日本語グリフを内蔵しないため、描画テキストに含まれる文字だけを
 * Google Fonts から Noto Sans JP のサブセット(TrueType)として取得してフォント指定する。
 * text クエリでサブセット化するので転送量は小さい。取得失敗時は null を返し、
 * 呼び出し側でフォント無し描画にフォールバックする(OGP は非必須のため 500 にしない)。
 */
async function loadNotoSansJp(text: string): Promise<ArrayBuffer | null> {
  try {
    const cssUrl = `https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700&text=${encodeURIComponent(
      text,
    )}`;
    const cssRes = await fetch(cssUrl, {
      headers: {
        // TrueType(woff2 ではない)の src を返させるための UA
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    if (!cssRes.ok) return null;
    const css = await cssRes.text();
    const match = css.match(/src:\s*url\(([^)]+)\)/);
    if (!match) return null;
    const fontRes = await fetch(match[1]);
    if (!fontRes.ok) return null;
    return await fontRes.arrayBuffer();
  } catch {
    return null;
  }
}

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<ImageResponse> {
  const { slug } = await params;

  const event = await db.query.events.findFirst({
    where: eq(events.slug, slug),
    columns: { id: true, title: true },
  });

  const title = event?.title ?? "matenaiyo";
  const count = event
    ? await db.$count(participants, eq(participants.eventId, event.id))
    : 0;

  const label = `回答 ${count} 件`;
  const glyphs = `${title}${label}matenaiyo — 日程調整0123456789`;
  const fontData = await loadNotoSansJp(glyphs);
  const fontFamily = fontData ? "Noto Sans JP" : "sans-serif";

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
        fontFamily,
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
        matenaiyo — 日程調整
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 68,
          fontWeight: 700,
          lineHeight: 1.2,
          maxHeight: 340,
          overflow: "hidden",
        }}
      >
        {title}
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
          {label}
        </span>
      </div>
    </div>,
    {
      ...size,
      fonts: fontData
        ? [
            {
              name: "Noto Sans JP",
              data: fontData,
              weight: 700,
              style: "normal",
            },
          ]
        : undefined,
    },
  );
}
