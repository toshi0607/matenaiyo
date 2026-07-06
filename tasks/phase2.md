# Phase 2 (体験差別化) 実装計画

設計は [DESIGN.md](../DESIGN.md) の「差別化(モダン化ポイント)」を参照。Phase 1 の基盤の上に UX 差別化を積む。

## スコープ

- [x] **カレンダー選択UI** — `/new` で shadcn Calendar(react-day-picker）で複数日タップ選択 + 時刻テンプレ(12:00/18:00/19:00/終日）。`startsAt` 付き slot を `createEvent` に渡す。テキスト入力もトグルで残す(既定はテキスト)
- [x] **モバイル回答カード強化** — ○/△/× を 44px 高のタップ領域に、送信ボタンをモバイルで sticky 表示
- [x] **ダークモード** — next-themes 導入。layout に ThemeProvider + 共通ヘッダ(SiteHeader)にトグル。既存 `.dark` CSS 変数を利用
- [x] **リアルタイム集計 / 自動更新** — `/e/[slug]` に LiveRefresh。Supabase 設定時は postgres_changes 購読、未設定時は 5秒ポーリング(非表示タブは停止)。どちらも `router.refresh()`

## 方針メモ

- Realtime: `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` があれば `@supabase/supabase-js` の postgres_changes を購読。無ければ ~5秒ポーリング。どちらも `router.refresh()` でサーバーを真実の源にする(差分マージしない)
- カレンダー slot は `starts_at` を持つ。`slot-label.ts` が既に starts_at 表示に対応済み

## 検証(完了条件)

- [x] `pnpm check` / `pnpm test`(46)exit 0
- [x] `pnpm build` exit 0
- [x] Playwright E2E 8 passed: カレンダー作成/モード切替/50件上限ガード、既存フロー+再編集、ダークモード切替、ポーリング自動更新
- [x] reviewer subagent でレビュー → **Phase 2 承認**(Critical/High なし)

## レビュー結果

reviewer subagent(新規コンテキスト)による Phase 2 レビュー: **承認可能(Approve)**。Critical/High なし。
タイムゾーン(オフセット付き ISO、DST/月末境界)、自動更新のライフサイクル(cleanup/非表示タブ停止/unmount race)、
ダークモードの hydration 対策、Phase 1 不変条件(Actions/スキーマ/DB/集計は未変更)いずれも問題なしを確認。

### 対応済み

- [x] **M1(50件上限のクライアント側フィードバック)**: `new-event-form.tsx` に送信前ガードを追加。
  カレンダー/テキスト両モードで 50 件超なら「候補は最大50件までです(現在N件)」を表示。E2E も追加(text mode 51件)。

### 対応済み(当初「Phase 3 で対応」とした項目、2026-07-06 実施)

- [x] **L1**: Realtime 購読を当該イベントに限定。全書き込み Action が同一トランザクションで
  `events.last_activity_at` を更新するため、`events` テーブル1本を `filter: id=eq.<eventId>` で購読する方式に変更
  (answers に event_id 列が無いため、3テーブル購読より正確かつ簡潔)。チャンネル名は `matenaiyo-tally-<eventId>`。
- [x] **L2**: `@supabase/supabase-js` の import 失敗時に `console.warn` 1行(エラー内容付き)を出してからポーリングに退避。
