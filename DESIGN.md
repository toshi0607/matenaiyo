# chosei — モダン調整さん 設計書

作成日: 2026-07-04 / 設計: Claude Fable 5(承認済み)

## 決定事項

- 新規リポジトリ(本リポジトリ)で開発する
- DB + リアルタイムは **Supabase**(Postgres + Realtime)を使う
- ツールチェーンは ra-calc と同一: Next.js 16 / React 19 / TypeScript / pnpm / Biome / Vitest / Playwright

## コンセプト

調整さん(chouseisan.com)の本質的な強みは「**ログイン不要・URLひとつで完結**」。
これを絶対に崩さず、UI/UXと技術基盤をモダン化する。

## 機能要件

### MVP(調整さんと同等)

1. イベント作成 — タイトル、メモ、候補日程(複数)。アカウント不要
2. 共有URL発行 — 推測困難なID(nanoid 21文字)
3. 出欠回答 — 名前 + 各候補に ○/△/× + ひとことコメント
4. 集計表 — 候補日×参加者のマトリクス、○が最多の日をハイライト
5. 回答の再編集 — 参加者ごとの編集トークンを localStorage に保持

### 差別化(モダン化ポイント)

- **カレンダーUIで候補日選択** — 最大のUX改善点。カレンダーをタップして複数選択 + 時刻テンプレ(19:00〜 など)
- **リアルタイム集計** — 誰かが回答すると開いている画面が即座に更新される
- **モバイルファースト** — 回答フォームは縦積みカード、集計表は先頭列固定の横スクロール
- **確定 → カレンダー連携** — 幹事が日程を確定すると .ics ダウンロードと Google カレンダー追加リンクを表示
- **OGP画像自動生成**(next/og) — 共有先で「イベント名|回答◯件」カードが出る
- ダークモード対応

## 技術スタック

| レイヤ | 選定 | 理由 |
|---|---|---|
| フレームワーク | Next.js 16 (App Router) + React 19 | RSCで参照系がシンプルに |
| UI | Tailwind CSS v4 + shadcn/ui | カレンダーは shadcn Calendar(react-day-picker) |
| DB + リアルタイム | Supabase(Postgres + Realtime) | 無料枠で運用可、リアルタイム購読が追加インフラ不要 |
| ORM | Drizzle | 型安全・軽量 |
| バリデーション | Zod | Server Actions の入力検証 |
| ID生成 | nanoid | slug と各種トークン |
| ホスティング | Vercel | next/og・cron(期限切れ削除)込み |

## データモデル

```
events
  id            uuid PK
  slug          text UNIQUE      -- 共有URL用 nanoid(21)
  title         text
  description   text
  admin_token   text             -- 幹事用(ハッシュ化して保存)
  status        enum('open', 'closed')
  decided_slot  uuid FK → slots  -- 確定した日程(nullable)
  created_at / last_activity_at  -- 削除ポリシー用

slots(候補日程)
  id, event_id FK, starts_at timestamptz, label text, sort_order int
  -- カレンダー選択なら starts_at、自由記述なら label。両対応

participants
  id, event_id FK, name text, comment text
  edit_token    text             -- 再編集用(ハッシュ化して保存)
  created_at / updated_at

answers
  participant_id + slot_id 複合PK
  mark  enum('yes', 'maybe', 'no')
```

## 認証・トークン設計(ログイン不要の肝)

- **幹事**: イベント作成時に `admin_token` を発行し、レスポンスで一度だけ返す。
  クライアントは localStorage に保存。管理操作(締切・確定・編集)は Server Action に
  トークンを添えて実行し、サーバー側でハッシュ照合
- **参加者**: 回答送信時に `edit_token` を発行、同様に localStorage 保存。
  同じ端末なら「自分の回答を編集」ボタンが自動で出る
- トークン紛失時は「誰でも他人の行を編集できるモード」には**しない**。
  「新しい回答として追加」してもらい、幹事が重複行を削除できるようにする
  (荒らし耐性と利便性のバランス)

## 画面構成

| パス | 内容 |
|---|---|
| `/` | LP + 即作成フォーム(タイトル入力 → そのまま作成フローへ) |
| `/new` | 作成ウィザード: ①タイトル・メモ → ②カレンダーで候補日選択 + 時刻 → ③URL発行・コピー・LINE共有 |
| `/e/[slug]` | イベントページ。RSCで集計表を描画し、client component が Realtime 購読 |
| `/e/[slug]/answer` | 回答フォーム。モバイルは候補日を1枚ずつカードで表示し ○/△/× をタップ |
| `/e/[slug]/admin` | 幹事管理(admin_token 保持時のみ)。締切・日程確定・イベント編集・行削除 |

UI詳細:
- 集計表: 行=候補日、列=参加者。先頭列 sticky で横スクロール。○最多の行を success 系トーンでハイライトし「ベスト」バッジ
- ○△× は色だけでなく形状+テキストで区別(色覚対応)

## API設計

すべて Server Actions(参照系は RSC が直接 DB を読むため API 不要):

- `createEvent(input)` → `{ slug, adminToken }`
- `submitAnswer(slug, input)` → `{ participantId, editToken }`
- `updateAnswer(slug, participantId, editToken, input)`
- `closeEvent / decideSlot / deleteParticipant`(admin_token 必須)

書き込み後は Supabase Realtime の postgres_changes が全クライアントに届き、
購読側は `router.refresh()` で RSC を再取得(クライアント側で差分マージせず、
サーバーを真実の源にする)。

## 非機能要件

- **データ保持**: 最終更新から6ヶ月で自動削除(Vercel Cron + 削除予告表示)
- **レート制限**: 作成・回答系 Action に IP ベース制限(@upstash/ratelimit)。ログイン不要サービスなので必須
- **XSS**: 入力はプレーンテキストのみ。React のエスケープに乗る
- **アクセシビリティ**: ○△× の色+形状+テキスト併用

## 実装フェーズ

1. **Phase 1 (MVP)**: スキーマ + 作成 → 共有 → 回答 → 集計表。更新はポーリングで可
2. **Phase 2 (体験差別化)**: カレンダー選択UI、Realtime、モバイル回答カード、ダークモード
3. **Phase 3 (仕上げ)**: 日程確定 + .ics/Google カレンダー連携、OGP画像、LINE共有、自動削除 cron

## テスト戦略

- Vitest: 集計ロジック(ベスト日程判定)、トークン発行・照合、Zod スキーマ
- Playwright: 「作成 → 共有URLを開く → 回答 → 集計反映」の一気通貫を1本を軸に拡充
