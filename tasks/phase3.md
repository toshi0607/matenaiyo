# Phase 3 (仕上げ) 実装計画

設計は [DESIGN.md](../DESIGN.md) の「差別化」「非機能要件」を参照。Phase 1/2 の基盤に、幹事機能・共有・運用を足す。

## スコープ

### A. 幹事管理・日程確定・カレンダー連携
- [x] `/e/[slug]/admin` 幹事管理画面(adminToken 保持時のみ操作可)。締切・日程確定・行削除。未保持端末は not-recognized 案内
- [x] イベントページに「幹事管理」導線(localStorage に adminToken がある端末のみ表示)
- [x] 日程確定後、確定バナー + `.ics` ダウンロード + Google カレンダー追加リンク(starts_at がある場合のみ連携ボタン)
- [x] `src/lib/calendar-export.ts`: `.ics`(RFC5545、CRLF、UTC)と Google カレンダー URL 生成 + ユニットテスト

### B. 共有・OGP・自動削除
- [x] OGP画像(next/og): `/e/[slug]/opengraph-image.tsx`。Noto Sans JP サブセットで日本語描画。runtime nodejs
- [x] LINE共有ボタン(share-url に追加、既存 testid 維持)
- [x] 自動削除 cron: `/api/cron/cleanup`(Bearer 認証、未設定=500・不一致=401・一致時のみ削除)+ `vercel.json`(0 3 * * *)
- [x] `src/lib/cleanup.ts`: cutoffDate + deleteStaleEvents(FK cascade)+ ユニットテスト

## 検証(完了条件)

- [x] `pnpm check` / `pnpm test`(59)exit 0
- [x] `pnpm build` exit 0(新ルート /api/cron/cleanup・/e/[slug]/admin・opengraph-image 生成)
- [x] Playwright E2E 13 passed: 幹事確定→確定バナー/ics/gcal、非幹事端末の not-recognized、OGP画像200、LINE共有、cron 認証拒否
- [x] reviewer subagent でレビュー → **Phase 3 承認**(Critical/High なし)

## レビュー結果

reviewer subagent(新規コンテキスト)による Phase 3 レビュー: **承認可能(Approve)**。Critical/High なし。
最重要の自動削除 cron は「CRON_SECRET 未設定=500・不一致=401・一致時のみ削除、WHERE 条件明確、FK cascade」で
誤爆リスクなしと確認。ics の RFC5545 準拠/エスケープ、幹事権限の最終防衛線(サーバー Action のハッシュ照合)、
LINE共有のエンコード、Phase 1/2 不変条件維持も問題なし。

### 対応済み(Low 指摘)

- [x] **L1(cron 認証の非タイミング安全比較)**: `node:crypto` の `timingSafeEqual` による定数時間比較に変更。
- [x] **L2(cutoffDate の TZ ずれ・月末オーバーフロー)**: UTC 基準に統一し、月末日は対象月末にクランプ(8/31 の6ヶ月前 → 2/28)。テスト追加。

### follow-up

- [x] **L3**: OGP画像を `revalidate = 300`(slug 単位 5分 ISR キャッシュ)に変更。繰り返しクロール時の
  DB クエリ + フォント fetch を抑制(回答数の反映は最大5分遅延で許容)。フォント fetch 失敗時の sans-serif フォールバックは維持。
