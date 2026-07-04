# Phase 1 (MVP) 実装計画

設計は [DESIGN.md](../DESIGN.md) を参照。実装は最小差分で、各ステップ完了ごとにチェックを付ける。

## セットアップ

- [x] `pnpm create next-app`(TypeScript / App Router / Tailwind v4)で chosei をスキャフォールド(Next.js 16.2.10 / React 19.2.4)
- [x] Biome / Vitest / Playwright を導入(`pnpm check` / `pnpm test` / `pnpm test:e2e` すべて exit 0 確認済み)
- [x] shadcn/ui 初期化(Button, Input, Textarea, Card, Table, Calendar)
- [ ] Supabase プロジェクト作成、`.env.local` に接続情報(ユーザー作業: プロジェクト作成と鍵の取得)※ローカル開発は docker-compose.yml の Postgres(port 54322)で代替可
- [x] Drizzle 導入、`drizzle.config.ts` とマイグレーション設定

## スキーマ

- [x] events / slots / participants / answers テーブル定義(DESIGN.md のデータモデル通り)
- [x] マイグレーション生成(`drizzle/0000_*.sql`)、Drizzle クライアント(`src/db/index.ts`)。DB への適用はユーザー作業

## コアロジック(ユニットテスト対象)

- [x] トークン発行・ハッシュ照合ユーティリティ(nanoid + sha256、timingSafeEqual)+ テスト
- [x] 集計ロジック: slot ごとの ○△× カウントとベスト日程判定 + テスト
- [x] Zod スキーマ: createEvent / submitAnswer / updateAnswer の入力 + テスト(計46テストパス)

## Server Actions

- [x] `createEvent` → { slug, adminToken }
- [x] `submitAnswer` → { participantId, editToken }
- [x] `updateAnswer`(editToken 照合)
- [x] `closeEvent` / `decideSlot` / `deleteParticipant`(adminToken 照合)
  - すべて `src/app/actions.ts` に実装。戻り値は `ActionResult<T>`(`{ ok: true; data: T } | { ok: false; error: string }`)

## 画面

- [x] `/` LP + タイトル入力 → `/new` へ
- [x] `/new` 作成フォーム(Phase 1 は日程をテキスト複数行入力。カレンダーUIは Phase 2)
- [x] 作成完了画面: URL 表示 + コピー、adminToken を localStorage 保存
- [x] `/e/[slug]` 集計表(RSC)。○最多の行を emerald トーンでハイライト + ベストバッジ。○△×は記号+テキストで色覚対応
- [x] `/e/[slug]/answer` 回答フォーム、editToken を localStorage 保存
- [x] 自分の回答の再編集導線(localStorage に editToken がある場合)

## 検証(完了条件)

- [x] `pnpm check`(exit 0)/ `pnpm test`(46 tests, exit 0)パス
- [x] `pnpm build` 成功(exit 0)。`/` は Static、`/new`・`/e/[slug]`・`/e/[slug]/answer` は Dynamic
- [x] Playwright E2E: 作成 → 共有URLを開く → 回答 → 集計反映 + 再編集 が通る(3 passed、docker Postgres で実DB検証)
- [x] reviewer subagent(新規コンテキスト)でレビュー → **Phase 1 承認**(Critical/High なし)

## レビュー結果

reviewer subagent(新規コンテキスト)による Phase 1 レビュー: **承認可能(Approve)**。Critical/High なし。
トークン設計(sha256 ハッシュ保存・平文非保存・timingSafeEqual・長さチェック)、権限照合、slotId の event 帰属検証、
トランザクション整合性、XSS(全入力が React エスケープ)いずれも DESIGN.md 要件を満たすことを確認。

### レビュー指摘への対応(harden/actions-and-ratelimit ブランチで実施済み)

- [x] **M1(締切 TOCTOU)対応**: `submitAnswer`/`updateAnswer` のトランザクション内で
  `SELECT ... FOR UPDATE` によりイベント行をロックして `status` を再確認。締切と競合しても締切後回答が通らない。
- [x] **M2(DB 例外の throw)対応**: 全 Server Action の DB 操作を try/catch で包み、例外時は `{ ok:false, error }` を返す。
  未処理 rejection を防止。
- [x] **レート制限**: `@upstash/ratelimit` + `@upstash/redis` を導入(`src/lib/rate-limit.ts`)。
  createEvent(5回/10分)・submitAnswer/updateAnswer(30回/10分)に IP ベース制限。
  Upstash 未設定時は素通り(ローカル/CI を壊さない)。本番は `UPSTASH_REDIS_REST_URL` / `_TOKEN` を設定。

### 完了条件の証拠

- `pnpm check`(biome + tsc)exit 0
- `pnpm test` 46 tests passed, exit 0
- `pnpm build` exit 0(`/` Static、`/new`・`/e/[slug]`・`/e/[slug]/answer` Dynamic)
- Playwright E2E 3 passed(作成→共有URL→回答→集計反映 + 再編集)を docker Postgres の実 DB で検証
