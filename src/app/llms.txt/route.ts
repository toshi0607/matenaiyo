import { FAQ_ITEMS } from "@/lib/faq";
import {
  SITE_DESCRIPTION,
  SITE_GITHUB_URL,
  SITE_NAME,
  SITE_URL,
} from "@/lib/site";

// LLM がサービス概要を把握するための単一情報源。robots.ts/sitemap.ts と同様に
// site.ts / faq.ts の定数から組み立て、内容の重複ハードコードを避ける。
export const dynamic = "force-static";

function buildFaqSection(): string {
  return FAQ_ITEMS.map((item) => `### ${item.question}\n${item.answer}`).join(
    "\n\n",
  );
}

function buildLlmsTxt(): string {
  return `# ${SITE_NAME}

> ${SITE_DESCRIPTION}(日本語・UI は日本語のみ)。

## サービス概要
- イベント作成・出欠回答ともにログイン・アカウント登録不要
- 無料・広告なし
- 使い方: 幹事が候補日を選んでイベント作成 → 共有URLをメンバーに送る → 参加者は名前と ○△× をタップで回答 → 集計は自動、○最多の候補をハイライト
- 幹事が日程を確定すると .ics ダウンロードと Google カレンダー追加リンクを表示(日時付き候補の場合)
- リアルタイム集計、ダークモード、モバイル最適化

## よくある質問
${buildFaqSection()}

## リンク
- サービス: ${SITE_URL}
- イベント作成: ${SITE_URL}/new
- ソースコード(OSS): ${SITE_GITHUB_URL}

## 技術スタック
- Next.js (App Router) / React / TypeScript / Supabase (Postgres + Realtime) / Drizzle ORM / Vercel
`;
}

export function GET(): Response {
  return new Response(buildLlmsTxt(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
