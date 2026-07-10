# matenaiyo

**ログイン不要・URLひとつで完結する日程調整サービス**

デモ: https://matenaiyo.vercel.app

「調整さん」の核であるログイン不要・URL共有だけで使える手軽さはそのままに、UI/UXと技術基盤をモダン化した日程調整ツールです。

## 主な機能

- **カレンダーUIで候補日選択** — カレンダーをタップして候補日を複数選択し、各日に時刻を設定(プリセット追加・自由入力・終日指定に対応)
- **○△×で出欠回答** — 名前 + 各候補日への回答 + ひとことコメント
- **リアルタイム集計** — 誰かが回答すると開いている画面が自動で更新される(Supabase Realtime を購読、未設定時は約5秒間隔のポーリングにフォールバック)
- **日程確定 → カレンダー連携** — 幹事が日程を確定すると `.ics` ダウンロードと Google カレンダー追加リンクを表示
- **OGP画像自動生成** — トップページは静的OGP画像、イベントページ(`/e/[slug]`)は `next/og` でイベント名・回答件数を反映した画像を動的生成
- **ダークモード対応**
- **回答の再編集** — 参加者ごとの編集トークンをlocalStorageに保持し、同じ端末から自分の回答を編集可能
- **期限切れイベントの自動削除** — 最終更新から一定期間で削除対象になり、事前に削除予告を表示(Vercel Cronで実行)

## 技術スタック

| レイヤ | 選定 |
|---|---|
| フレームワーク | Next.js 16 (App Router) + React 19 + TypeScript |
| UI | Tailwind CSS v4 + shadcn/ui(カレンダーは react-day-picker) |
| DB + リアルタイム | Supabase(Postgres + Realtime) |
| ORM | Drizzle ORM |
| バリデーション | Zod |
| レート制限 | Upstash Redis(`@upstash/ratelimit`) |
| ホスティング | Vercel(next/og、Vercel Cronによる自動削除込み) |
| Lint / 型検査 | Biome + tsc |
| テスト | Vitest(ユニット) / Playwright(E2E) |

詳細な設計は [DESIGN.md](./DESIGN.md) を参照してください。

## ローカル開発

### 1. 依存関係のインストール

```bash
pnpm install
```

### 2. ローカルDBの起動

Docker ComposeでPostgresを起動します(ポート `54322`)。

```bash
docker compose up -d
```

### 3. 環境変数の設定

`.env.example` をコピーして `.env` を作成します。ローカル開発では `DATABASE_URL` 以外は未設定でも動作します(Realtimeはポーリングにフォールバック、レート制限は無効)。

```bash
cp .env.example .env
```

| 変数 | 用途 | 未設定時の挙動 |
|---|---|---|
| `DATABASE_URL` | Postgres接続文字列 | 必須 |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 集計ページのRealtime購読 | 両方揃わない場合は約5秒間隔のポーリングにフォールバック |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | 作成・回答系ActionのIPベースレート制限 | 未設定ならレート制限は無効(ローカル/CI向け) |
| `CRON_SECRET` | `/api/cron/cleanup` の認証(Vercel Cronが自動付与) | 未設定だとエンドポイントは500を返し、誤削除を防ぐ安全側に倒す |
| `NEXT_PUBLIC_GA_ID` | Google Analytics 4の測定ID | 未設定ならスクリプトを読み込まない |

### 4. DBマイグレーションの適用

```bash
pnpm db:migrate
```

スキーマ変更時は以下でマイグレーションファイルを生成します。

```bash
pnpm db:generate
```

### 5. 開発サーバーの起動

```bash
pnpm dev
```

[http://localhost:3000](http://localhost:3000) で確認できます。

## コマンド一覧

| コマンド | 内容 |
|---|---|
| `pnpm dev` | 開発サーバーを起動 |
| `pnpm build` | 本番ビルド |
| `pnpm start` | 本番ビルドの起動 |
| `pnpm check` | Biomeによるlint/format検査 + `tsc --noEmit`による型検査 |
| `pnpm check:fix` | 上記の自動修正版 |
| `pnpm test` | Vitestによるユニットテスト |
| `pnpm test:e2e` | Playwrightによるe2eテスト |
| `pnpm db:generate` | Drizzleのマイグレーションファイル生成 |
| `pnpm db:migrate` | マイグレーションの適用 |

## CI

`.github/workflows/ci.yml` にて、`pnpm check` → `pnpm test` → `pnpm build` → `pnpm db:migrate` → `pnpm test:e2e` をPostgresサービスコンテナ上で実行しています。
