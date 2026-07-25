# 幹事による候補日程の追加・削除(2026-07-25)

対象画面: `/e/[slug]/admin`(「幹事管理」= 候補ごとの ○△× 集計を見ながら操作する幹事用ページ)。
参加者から「この日程では無理」と言われたときに、幹事がイベントを作り直さずに候補を足せる/削れるようにする。

## Constraints

| Constraint | Source | Verify by |
|------------|--------|-----------|
| 追加・削除は adminToken 照合必須(既存 admin action と同じ経路) | DESIGN.md 認証設計 | actions.ts の findAdminEvent 経由であること |
| 候補の上限 50 件をサーバー側で強制(追加後の合計で判定) | createEventSchema .max(50) との整合 | 単体テスト + action 内チェック |
| 最後の 1 件は削除させない(候補 0 件のイベントを作らない) | 回答フォームが候補 1 件以上を前提(answerItemsSchema .min(1)) | action 内チェック + e2e |
| 既存 data-testid を壊さない(既存 e2e 6 spec が依存) | 既存 e2e | `pnpm test:e2e` |
| 新規依存を追加しない | rules (constraints) | package.json diff なし |
| DB スキーマ変更なし(マイグレーション不要) | 最小差分 | drizzle/ に新ファイルなし |
| 日付・時刻の入力 UI は `/new` と同一の操作感にする(重複実装しない) | UX 一貫性 / rules (simplicity) | 共通コンポーネント化した diff |
| Next.js 16 の規約は node_modules/next/dist/docs を読んでから書く | AGENTS.md | 今回は Server Actions / client component の既存パターン踏襲のみ(新 API 未使用) |

## Assumptions

| Assumption | Status | Evidence |
|------------|--------|----------|
| 「幹事集計ページ」= `/e/[slug]/admin`(候補ごとの ○△× 集計と確定操作がある幹事用画面) | VERIFIED | admin/page.tsx:76「幹事管理」+ admin-panel.tsx:105「各候補の集計(○参加 / △未定 / ×不参加)」 |
| 候補削除で回答行は DB 側 CASCADE で消える | VERIFIED | drizzle/0000_burly_spirit.sql:41 `answers_slot_id_slots_id_fk ... ON DELETE cascade` |
| 確定中の候補を削除しても events.decided_slot_id は NULL になる(FK) | VERIFIED | drizzle/0000_burly_spirit.sql:43 `ON DELETE set null`。ただし action 内でも明示的に NULL 更新して DB 挙動に依存しない |
| 候補追加後、既存回答者はその候補が「未回答(−)」として集計表に出る | VERIFIED | e/[slug]/page.tsx:212-220(answer 無しは「−」表示)、tally.ts は回答 0 件でも slot を返す |
| 候補追加後、回答フォームは新候補を含めて全件送信する(既存回答者の再編集も可) | VERIFIED | answer-form.tsx:41 buildDefaultMarks が slots から既定値を作る |
| Realtime/ポーリングの購読は events 行の更新で発火するので、追加・削除も lastActivityAt 更新で全クライアントに伝わる | VERIFIED | live-refresh.tsx:64-70 のコメントと filter(`table: "events"`) |
| 候補の表示順は sortOrder 昇順(作成順) | VERIFIED | e/[slug]/page.tsx:46、admin/page.tsx:36 |
| 既存 admin action(close/decide/deleteParticipant)にレート制限はない | VERIFIED | actions.ts:262-361 に checkRateLimit 呼び出しなし |

## Todo

- [x] 1. Zod スキーマ: `MAX_SLOTS_PER_EVENT` 定数化 + `addSlotsSchema` / `deleteSlotSchema` 追加、単体テスト — 証拠: schemas.ts:16-18,64-71、schemas.test.ts に 6 ケース追加(空配列 / 上限 +1 / adminToken 空 / startsAt も label も無い / uuid でない slotId)
- [x] 2. Server Action `addSlots` — 証拠: actions.ts:338-420。`SELECT ... FOR UPDATE` で events 行をロック → 既存候補を slotKey(starts_at の epoch か label)で重複排除 → 合計 > 50 なら拒否 → sortOrder = 既存最大 + 1 で挿入 → lastActivityAt 更新
- [x] 3. Server Action `deleteSlot` — 証拠: actions.ts:422-487。ロック下で所属確認 → 候補 1 件なら拒否 → 確定中なら decidedSlotId を明示 NULL → 削除(answers は CASCADE)→ lastActivityAt 更新
- [x] 4. 候補入力 UI の共通化 — 証拠: `src/lib/slot-draft.ts`(純ロジック)+ `src/components/slot-picker.tsx`(useSlotPicker + SlotPicker)を新設し new-event-form.tsx を 559 → 197 行に。既存 testid(calendar / calendar-day / day-time-input / time-preset-* / add-time / remove-time / selected-slot / calendar-mode)は不変で calendar.spec.ts 3 件パス
- [x] 5. 幹事管理画面 — 証拠: admin-panel.tsx に「候補日程を追加する」カード(SlotPicker 再利用、`add-slots-submit`)+ 各候補行に `delete-slot-${id}`(候補 1 件時は disabled + 理由テキスト)
- [x] 6. 単体テスト: slot-draft の純ロジック — 証拠: slot-draft.test.ts(toLocalIso のラウンドトリップ / ゼロ埋め、dayKey、isCompleteEntry、entryLabel、buildSlots の入力途中除外、toSlotInputs の startsAt/label 振り分け)。TZ 依存しない検証にしてある
- [x] 7. E2E — 証拠: admin.spec.ts「organizer adds and deletes candidate slots」。候補 1 件時の削除ボタン disabled → 2 件追加 → 集計表 3 行 → 同一日時の再追加が「すでに同じ候補があります」で拒否 → 確定した候補を削除して確定バナーが消える → 集計表 2 行
- [x] 8. 検証: `pnpm check` exit 0 / `pnpm test` 80 passed(63 → 80)/ `pnpm build` exit 0 / `npx playwright test --workers=1` 14 passed(13 → 14、docker Postgres + drizzle migrate 済み)
- [x] 9. フェーズゲート: 差分セルフレビュー(下記 Review)。指摘 2 件を修正

## Notes

- 追加した候補は **末尾** に付ける(sortOrder = 既存最大 + 1)。日付順に再ソートすると、starts_at を持たない「終日」候補(label のみ)の既存並び順が変わって既存イベントの表示が壊れるため。
- 締切済み(closed)イベントでも追加・削除を許可する。削除は締切後の整理として意味があり、追加は「締切を解除する手段が無い」現状では無意味だが、禁止してもユーザー利益がない。UI 側で締切中の注意書きは出さない(過剰)。
- 重複候補(同一 starts_at / 同一 label)は追加時にサーバー側で除外する。全部重複なら「すでに同じ候補があります」を返す。
- 追加・削除にレート制限は付けない。adminToken 必須で、上限 50 件・最低 1 件の不変条件がサーバー側で効くため。既存 admin action(close / decide / deleteParticipant)と揃える。
- `/new` のピッカーを共通化した際、UI マークアップと data-testid は移動のみで変更していない(既存 e2e を壊さないため)。`weekdayClass` はスタイル専用なのでコンポーネント側に置き、`slot-draft.ts` は純ロジックだけに保った。
- 候補削除で、その候補にしか回答していなかった参加者は回答 0 件のまま列だけ残る(集計表は全セル「−」)。行ごと消す挙動は「幹事が参加者を削除する」既存機能の役割なので、ここでは触らない。
- 合計 50 件超過の拒否(action 内チェック)は自動テスト未カバー。50 候補の作成が e2e では高コストなため、スキーマ上限のテスト + コードレビューで担保している。

## Review

差分セルフレビュー(観点: 権限・不変条件・並行性・既存機能の退行・a11y・ドキュメント整合)の結果と対応:

| 指摘 | 検証 | 対応 |
|---|---|---|
| 候補行の削除ボタンが全行「削除」で、スクリーンリーダーではどの候補か判別できない | CONFIRMED | `aria-label="${slot.label}を削除"` を付与 |
| 候補 1 件時に削除できない理由が disabled な button の title だけ(disabled 要素の tooltip は読まれない) | CONFIRMED | カード内に理由テキストを常時表示し、title を廃止 |
| README / DESIGN.md に候補追加・削除の記載がない | CONFIRMED | README「主な機能」に 1 項目、DESIGN.md の API 設計と画面構成を更新 |
| `addSlots` の重複判定が starts_at を Date の epoch で比較していて、DB の timestamptz とズレないか | REFUTED | 同一インスタントなら `getTime()` は一致。e2e で同一日時の再追加が拒否されることを実測 |
| 確定中の候補削除で decided_slot が残らないか | REFUTED | action 内で明示 NULL 更新 + FK の ON DELETE SET NULL の二重防御。e2e で確定バナー消滅を実測 |
| 候補追加が既存の並び順を壊さないか | REFUTED | sortOrder = 既存最大 + 1 の末尾追加のみ。既存行の sortOrder は更新しない |

## デザインレビュー対応(第2ラウンド)

`/frontend-design` の観点(視覚的階層・情報設計・トーン・コピー・a11y)でレビューし、指摘をすべて反映した。

| 指摘 | 対応 | 証拠 |
|---|---|---|
| H1: 追加ピッカーが常時展開で主要動線を押し下げる(375px で body 1522px、「締め切る」が y=1223 = 2スクリーン目) | 「＋ 候補を追加」トグルの内側に格納(既定は閉じ、`aria-expanded` / `aria-controls` 付き)。追加成功で自動的に閉じてピッカーもリセット | 実測 body 1522 → **1165px**、締め切る y=1223 → **806px**(初期ビューポート 900px 内) |
| H2: destructive が1画面に5個並び警告色が機能していない | 行の削除を Trash2 アイコンの ghost ボタンに変更(赤はホバー/フォーカス時のみ)。ピッカー内の時刻削除と同じ作法に統一 | 平常状態のスクショに赤ボタン 0 個(ライト/ダーク両方) |
| H3: 「候補日程」が2枚のカードに分断 | 1枚に統合(タイトル「候補日程」)。一覧 + 区切り線 + 追加トグルの構成にし、説明文は3情報4行 → 2文に短縮 | admin-panel.tsx のカード数 4 → 3 |
| M4: 追加CTAが full-width primary でページ最強調(確定より目立つ) | `variant="secondary"`・幅 auto・右寄せに変更 | スクショ:塗りつぶし primary は「確定中」のみ |
| M5: 残り枠「あと47件」は行動を変えない / 追加パネルの説明が実装目線 | 残り枠は 10 件以下のときだけ表示(`REMAINING_HINT_THRESHOLD`)。説明を「必要なら再回答を依頼してください」と幹事の次の行動に書き換え | 候補3件時に残り枠テキスト非表示 |
| L6: 候補削除が1クリックで不可逆(全員の回答が消える) | 行内2段階確認(「回答も消えます / 削除する / やめる」)。行の操作をその1問に絞る。参加者削除も同じ `DeleteConfirm` に統一 | e2e で「キャンセル → 件数不変 → 再度削除 → 反映」を検証 |
| 追加検出: 確認状態で削除トリガーが unmount してキーボードフォーカスが落ちる | 「やめる」に自動フォーカス(Enter 連打で削除が通らない安全側) | e2e `toBeFocused()` アサーション |
| 追加検出: ベストバッジ付きの行だけ折り返して行高がバラつく | 候補行を `flex-col sm:flex-row` に統一(狭い画面は常に2段・sm 以上は1行)。参加者行は名前+アイコンで収まるため1行維持 | 375px / 1280px のスクショで行高が揃っていることを確認 |

対応後の検証: `pnpm check` exit 0 / `pnpm test` 80 passed / `pnpm build` exit 0 / `npx playwright test --workers=1` 14 passed。375px・1280px × ライト/ダークでスクショ確認。

対象外(既存):「ベスト」バッジの emerald が Warm Pop 唯一の寒色、`<input type="time">` の 12/24時間表示がブラウザロケール依存。どちらも `/new`・集計ページと共通の既存挙動のため今回は触らない。

## デザインレビュー対応(第3ラウンド:状態ごとの設計)

未確認だった状態(回答0件・エラー・確定済み・締切済み・候補12件・キーボードフォーカス)を実際に描画してレビューし、6件+実装中の追加検出1件を反映した。

| 指摘 | 対応 | 証拠 |
|---|---|---|
| H1: 回答0件だと `○0・△0・×0` と同一ボタンが候補数だけ反復し、説明文も「集計を見ながら」と嘘になる | `participants.length === 0` のとき集計行を出さず、説明を「まだ回答がありません。集計ページの共有URLをメンバーに送ってください。」に切替。確定ボタンは残す(回答なしで決める自由は奪わない) | 候補1件・回答0件で body 1522 → **900px**(1画面)、slot-tally 要素 **0個**。候補12件でも 1985 → **1611px** |
| H2: エラーが常に最上部で、押したボタン(約1000px下)から見えない | エラーを `{ scope, message }` にし、追加系は追加パネルの CTA 直上、行操作系は従来の最上部に出す | e2e で `add-slots-card` 内の `admin-error` を検証 |
| H2続: 「すでに同じ候補があります」は一部重複時にも読める | サーバーは重複を除いて残りを追加するため、このエラーは全件重複時のみ返る。**「選んだ候補はすべて追加済みです」**に修正 | actions.ts の SLOT_DUPLICATED + e2e のテキスト検証 |
| M3: 確定済み行の「確定中」が押せるボタンの形で、押しても実質 no-op | 状態バッジ(`admin-decided-badge`)に変更し、その行の確定ボタンを削除。行は `border-primary/50 bg-primary/5` で強調 | e2e: 確定後にバッジ表示 + 当該行の `decide-slot-*` が 0 件 |
| M4: 締切後も候補追加できるが、追加しても回答は集まらない | 締切済みのときは追加パネル内に「受付を締め切っているため、追加しても回答は集まりません。」を表示。「受付を締め切る」カードの説明も締切後は「新しい回答は受け付けていません。」に切替 | スクショ v4-decided-closed |
| L5: 「候補が1件のときは削除できません」が対象(右端の削除アイコン)から離れている | 右寄せにして削除アイコンの直下に配置 | スクショ v4-empty |
| L6: 回答0件でも「参加者を削除する」カードが空カードとして残る | 回答0件のときはカードごと出さない | スクショ v4-empty(カード2枚のみ) |
| 追加検出: 締切など別の操作の実行中に、追加ボタンのラベルが「追加中…」になる(`useTransition` の pending を全ボタンが共有) | `busyScope` を持ち、進行中コピーは実際に押した操作にだけ出す。`run()` は options 引数(`{ onSuccess, scope }`)に整理 | 締切実行中のスクショで追加 CTA が「候補を追加」のまま |

対応後の検証: `pnpm check` exit 0 / `pnpm test` 80 passed / `pnpm build` exit 0 / `npx playwright test --workers=1` 14 passed。375px・1280px × ライト/ダーク、および回答0件・エラー・確定+締切・候補12件の各状態をスクショで確認。

判断:「候補を追加」トグルの位置(候補12件で y=1560)はヘッダー右上に移す案を検討したが、開いたパネルが既存一覧の上に来ると「重複を避けるために既存候補を見ながら選ぶ」ができず、末尾に追加される仕様とも空間的に合わないため現状維持。

## デザインレビュー対応(第4ラウンド:参加者側への波及)

「幹事が候補を追加したあと参加者側で何が起きるか」を追ったレビューの対応。3件の指摘 + 実装中に発見した2件を反映した。

| 指摘 | 対応 | 証拠 |
|---|---|---|
| H1: 追加した候補が、既存回答者の再編集画面で最初から △未定 として選択済みに見える(answer-form.tsx の `?? DEFAULT_MARK`)。気づかず更新すると「見ていない候補」が「未定と回答」になる | 再編集時は既存回答が無い候補を**未選択**にし、「新しい候補」バッジ + 編集通知に件数を出す。未選択の候補は送信に含めない(`answerItemsSchema` は部分集合を許容、集計表は「−」で未回答を表現)。全候補が未選択のときだけ「1つ以上の候補に回答してください」 | e2e「a slot added after answering stays unanswered for the existing respondent」: バッジ1件・アクティブなマーク0件・未選択のまま更新しても集計表が「未回答」 |
| M2: 幹事画面の集計に未回答数がなく、追加直後の候補が「全員が答えて0」と同じ見え方 | `AdminSlot.unanswered`(参加者数 −(○+△+×))を追加し、正のときだけ `・未回答 N` を表示(sr-only も同様) | スクショ v6-admin-unanswered:`○ 0・△ 0・× 0・未回答 1` |
| L3: 回答0件の空状態が「別ページへ行け」で終わっている | 「集計ページの共有URL」をリンクにして1タップで飛べるように(共有UI自体は複製しない) | スクショ v6-empty-link |
| 追加検出1: 再編集画面の初回描画で既定値(△)が一瞬選択済みに見える | `marks` の初期値を空にし、既存回答の有無が分かってから既定値/既存回答を入れる。既定値の適用は ref で一度だけ(入力途中の選択を消さない) | 600ms 待機後のスクショで ○ が正しく選択、新候補は未選択 |
| 追加検出2(**既存バグ**): **ダークモードで ○△× の選択色が消える**。Button の outline バリアントが持つ `dark:bg-input/30` は tailwind-merge では `bg-*` と衝突扱いされず、`dark:` 側が勝つ。△ は文字色 amber-950(暗褐色)だけが残り暗所で判読不能 | `MARK_ACTIVE` に `dark:` を明示(border/bg/hover:bg)。同じ原因の ghost + destructive ホバー(候補・参加者の削除アイコン、ピッカーの時刻削除)にも `dark:hover:*` を追加 | 修正前: 選択ボタンの背景 `oklab(... / 0.048)`(透けた白)/ 修正後: `lab(80.16 16.6 99.2)`(琥珀)・○ は `lab(66.98 -58.27 19.54)`(緑)。e2e「selected marks keep their fill color in dark mode」で退行を防止 |

対応後の検証: `pnpm check` exit 0 / `pnpm test` 80 passed / `pnpm build` exit 0 / `npx playwright test --workers=1` **16 passed**(14 → 16、新規2件)。375px のライト/ダークで再編集画面・幹事画面・集計表を確認。

確認して問題なしだったもの: sticky 送信バーと最後のカードの重なり(実測 −37px で重なりなし。前回 fullPage スクショで重なって見えたのは撮影 artifact)、「終日」候補(label のみ)の行表示、ピッカー内の時刻削除が1クリックで候補削除が2段階の差(未保存の下書き vs 保存済みデータで妥当)。

## デザインレビュー対応(第5ラウンド:色の意味づけとクラス衝突の総ざらい)

第4ラウンドで見つけた「バリアントの修飾子付きクラスが呼び出し側のプレーンクラスに勝つ」問題について、同型が他にないか全 UI プリミティブ × 全呼び出し箇所を洗った。新規指摘は2件。

| 指摘 | 対応 | 証拠 |
|---|---|---|
| M1(第3ラウンドで自分が作った不整合): 「確定」の色が画面間で不一致。幹事画面は primary(コーラル)、イベントページの確定バナーは emerald | 「**primary = 幹事が決めたこと / emerald = 集計の事実(○参加・ベスト)**」に統一。バナーのバッジを `bg-primary`、カードを `border-primary/40 bg-primary/10` に(ユーザー承認済み) | スクショ v9-banner-light / v9-banner-dark。集計ページ全体で primary=決定・emerald=集計 の2系統に整理された |
| M2: 「＋ 候補を追加」の文字色がホバー時と展開時に抜ける(ghost の `hover:text-foreground` / `aria-expanded:text-foreground` が `text-primary` に勝つ)。アクセントがホバーで弱くなるのは逆 | `hover:text-primary aria-expanded:text-primary dark:hover:text-primary` を明示 | 実測: 修正前 静止 `lab(66.3 44.3 47.9)` → ホバー `lab(94.8 0.8 4.5)`。修正後は静止/ホバー/展開すべて `lab(46.4 50.0 52.6)`(primary) |

クラス衝突スイープの結果: `dark:` や修飾子付きの色クラスを持つプリミティブは button / input / textarea / calendar のみ。色クラスを渡している呼び出し箇所は5つで、3つは第4ラウンドで修正済み(○△×の選択色・削除アイコン2種)、1つが上記 M2、残る1つ(slot-picker の「時間を追加」= muted → 前景色)は意図どおり。**同型の未修正バグは残っていない**。

撤回した過去の指摘: 「ベストの emerald は Warm Pop 唯一の寒色でパレット外」→ ○参加ボタン・ベスト行・ベストバッジで一貫した意味色として機能しているため撤回(意味の担い手であってパレット外の借り物ではない)。

自分のテストの修正: 第4ラウンドで追加したダーク選択色の e2e が `transition-all` の途中の色を拾って fail(blend 値 alpha 0.079)。`expect.poll` で確定色まで待つよう修正し、3回連続パスを確認。

対応後の検証: `pnpm check` exit 0 / `pnpm test` 80 passed / `pnpm build` exit 0 / `npx playwright test --workers=1` 16 passed。

---

# Lighthouse 計測と改善(完了、2026-07-10)

計測(本番・改善前): モバイル Perf 62 / LCP 30.2s、デスクトップ 75 / 5.2s、A11y 96。
原因: 日本語 Web フォント 384ファイル/5.1MB(ページ総量の92%)+ primary のコントラスト不足。

対応(ユーザー承認済み、PR #16・#17):
- 本文をシステムフォント化(Zen Kaku 除去、見出しの Zen Maru は維持)
- Zen Maru の preload: false(next/font が日本語フォントの全120スライスを強制 preload していた)
- primary を oklch(0.55 0.17 38) に暗め調整 + ヒーローバッジ背景を bg-primary/5 に(WCAG AA 達成)

結果(本番・改善後):
| | モバイル | デスクトップ |
|---|---|---|
| Performance | 62 → **69** | 75 → **99** |
| LCP | 30.2s → **5.2s** | 5.2s → **0.8s** |
| Accessibility | 96 → **100** | 96 → **100** |
| ページ総量 | 5,546 → **556 KiB** | 同 |
| フォント | 384files/5.1MB → **12files/150KiB** | 同 |

残る差分(モバイル 69→90 の壁)と判断:
- render-blocking CSS 46KiB(Tailwind チャンク、Next の枠組み上インライン化困難)/ gtag 161KiB(計測に必要)/ h1 の animate-rise 演出分の描画遅延
- いずれも費用対効果が低くブランド・計測とのトレードオフのため、ここで打ち止め。実ユーザー計測(Search Console の Core Web Vitals)で監視に移行

---

# SEO フェーズ2: バイラルループ + トップ LP 化(完了)

戦略は [reach-strategy.md](reach-strategy.md) の柱2・柱4。

## Constraints(フェーズ2)

| Constraint | Source | Verify by |
|------------|--------|-----------|
| 既存機能・E2E を壊さない(data-testid 維持、フォーム挙動不変) | rules / 既存 e2e | pnpm test:e2e(docker DB) |
| FAQ の可視コンテンツと FAQPage JSON-LD を完全一致させる | Google ガイドライン | 同一定数(src/lib/faq.ts)を両方が参照する構造 |
| FAQ 記載は実装事実のみ(6ヶ月削除=cleanup.ts:12、再編集=localStorage 等) | 正確性 | 各記述に対応するコード確認 |
| 既存のビジュアル言語に合わせる(Card、animate-rise、絵文字バッジ、rounded-2xl) | codebase 規約 | page.tsx 既存セクションとの整合目視 |
| 他社サービス(調整さん等)の機能を断定記載しない | 正確性リスク | LP 文言 grep |
| 実装は subagent 委譲・1ワークツリー1ライター(逐次実行) | memory / rules | — |
| 新規依存なし | rules | package.json diff なし |

## Assumptions(フェーズ2)

| Assumption | Status | Evidence |
|------------|--------|----------|
| 回答完了は answer-form.tsx の `done` インラインカード(遷移なし) | VERIFIED | answer-form.tsx:160-188 |
| GA は sendGAEvent パターンが既存(create_event / submit_answer / decide_slot) | VERIFIED | grep sendGAEvent → 3箇所 |
| イベント自動削除は最終更新から6ヶ月 | VERIFIED | src/lib/cleanup.ts:12 |
| グローバルフッターは未実装(新設して全ページに表示してよい) | VERIFIED | grep Footer → 0件 |
| e2e が answer-done / back-to-event 等の testid に依存 | VERIFIED | e2e/flow.spec.ts:41,44・admin.spec.ts:25・phase2.spec.ts:54(grep で確認、testid 維持が必須) |

## Todo(フェーズ2)

- [x] 1. バイラルループ: 回答完了カードに「自分もつくる」CTA(GA: create_own_click)+ SiteFooter 新設(Powered by 表記、layout に組み込み)— 証拠: answer-form.tsx に data-testid="create-own-cta" の CardFooter を追加(既存 answer-done / back-to-event testid は不変)、src/components/site-footer.tsx 新設し layout.tsx の children 後に配置。pnpm check:fix exit 0、pnpm test exit 0(63 passed)、e2e grep で create-own-cta への依存なし確認済み
- [x] 2. トップ LP 化: 使い方3ステップ / 特徴 / FAQ セクション追加 — 証拠: プリレンダー HTML に「使い方は3ステップ」「よくある質問」出現、ファーストビューは byte 同一(レビュー後に server/client 分離)
- [x] 3. FAQPage JSON-LD — 証拠: `.next/server/app/index.html` に `"@type":"FAQPage"` + Question 6件。UI と JSON-LD は同一の FAQ_ITEMS 定数から生成
- [x] 4. 検証 — 証拠: pnpm check / test(63)/ build すべて exit 0。実サーバー(port 3456)で noindex 退行なし・フッター全ページ表示・FAQPage JSON-LD 出力を確認
- [x] 5. e2e(docker DB)13件パス — 証拠: --workers=1 で 13 passed(46.4s)。並列実行時の失敗は dev サーバーのオンデマンドコンパイル負荷によるフレーキーで、単一スペックでは 9.1s でパスすることで切り分け済み
- [x] 6. フェーズゲート: /code-review high → 指摘対応(下記 Review フェーズ2)

## Notes(フェーズ2)

- 戦略 doc の「調整さんとの比較表」は見送り、特徴セクションで代替(第三者サービスの機能を誤記載して公開するリスク回避)。
- レビュー修正エージェントが月次上限で停止したが、停止前に全修正適用済みだったため検証のみ引き継ぎ(usage credit で続行)。
- e2e はワーカー並列時にフレーキー(load 30s タイムアウト)。CI では問題ない想定だが、ローカルは --workers=1 が安定。

## Review(フェーズ2)

/code-review high(8ファインダー角度、A・B は指摘なし)の結果と対応:

| 指摘 | 検証 | 対応 |
|---|---|---|
| フッターの GitHub リンクが toshi0607/chosei(実リポジトリは toshi0607/matenaiyo、git remote -v で確認)| CONFIRMED(実バグ)| SITE_GITHUB_URL を site.ts に追加して修正。ビルド HTML で正 URL 確認・旧 URL 消滅確認 |
| FAQ「削除が近づくと予告表示」が実装(常時表示)と不一致 | CONFIRMED | 「削除予定日はイベントページに表示されています」に修正 + 6ヶ月を DEFAULT_RETENTION_MONTHS から補間 |
| FAQ「確定すると .ics 表示」が実装(日時付き候補のみ)と不一致 | CONFIRMED | 「日時が設定された候補の場合は」を明記 |
| トップページ全体が "use client"(静的 LP がクライアントバンドル入り・キーストロークごとに再レンダー) | CONFIRMED | EventTitleForm を client island に分離し page.tsx を server component 化。/ は Static のまま |
| JSON-LD script ブロック・エスケープ処理の重複 | CONFIRMED | JsonLd 共通コンポーネント(src/components/json-ld.tsx)に集約 |
| sticky 送信バーがフッターと重なる | REFUTED | CSS sticky は containing block 内に拘束され main 外のフッターとは重なり得ない |
| SiteFooter の明示的戻り値型なし | 見送り | 既存 SiteHeader と同じリポジトリ慣習 |
| FEATURES とファーストビュー3項目の文言重複 | 見送り | ヒーロー要約 + 詳細セクションは意図的なマーケ構造 |

修正後の再検証: check / test(63)/ build 全 exit 0、e2e 13 passed、FAQPage・WebApplication JSON-LD と正 GitHub URL をビルド HTML で確認。

---

# SEO フェーズ1: 技術 SEO 基盤(完了)

戦略は [reach-strategy.md](reach-strategy.md) を参照。

## Constraints

| Constraint | Source | Verify by |
|------------|--------|-----------|
| 既存機能・UI を壊さない(最小差分) | rules (constraints) | vitest / build / 既存ページの意図しない diff なし |
| Next.js 16 の規約は node_modules/next/dist/docs を読んでから書く | AGENTS.md | 実装者がドキュメント参照を報告 |
| /e/ 配下(参加者名が載る UGC)を検索インデックスさせない | 戦略・プライバシー | ページの meta robots に noindex |
| noindex を効かせるため robots.txt で /e/ を Disallow しない | Google 仕様 | robots.ts の内容 |
| 新規依存を増やさない | rules (constraints) | package.json diff なし |
| ワークツリー内で作業・実装は subagent 委譲 | memory | — |

## Assumptions

| Assumption | Status | Evidence |
|------------|--------|----------|
| metadataBase は https://matenaiyo.vercel.app(独自ドメイン未決定、後で差し替え) | VERIFIED | src/app/layout.tsx:31 |
| /e/[slug] 系ページに metadata export はまだ無い | VERIFIED | grep generateMetadata → layout.tsx のみ |
| FAQPage JSON-LD はフェーズ2(可視 FAQ セクションと同時)。今回は WebApplication のみ | 決定 | Google ガイドライン(構造化データは可視コンテンツと一致必須) |
| build はローカル env なしで通る | VERIFIED | `pnpm build` exit 0(2026-07-08、オーケストレーター自身で再実行) |

## Todo

- [x] 1. robots.ts 追加(/api/ のみ Disallow、sitemap 参照)— 証拠: `.next/server/app/robots.txt.body` が仕様通り
- [x] 2. sitemap.ts 追加(トップ + /new のみ、絶対URL)— 証拠: `.next/server/app/sitemap.xml.body` に2 URL のみ、/e/ なし
- [x] 3. /e/ 配下に noindex,nofollow metadata — 証拠: ローカル本番サーバー(port 3456 + docker Postgres)で /e/[slug]・answer・admin の3ページとも `<meta name="robots" content="noindex, nofollow"/>` をレンダリング、トップページには robots meta なし(VERIFIED)
- [x] 4. トップページに WebApplication JSON-LD — 証拠: プリレンダー HTML(.next/server/app/index.html)と実サーバーレスポンス両方に `"@type":"WebApplication"` 出現
- [x] 5. README 刷新 — 証拠: 記載9コマンドが package.json scripts と1:1一致、環境変数7つが src/ の process.env 参照と一致、.env.example 存在確認済み
- [x] 6. `pnpm check` / `pnpm test`(63 passed)/ `pnpm build` 全通過(exit 0、レビュー修正後に再実行)
- [x] 7. フェーズゲート: /code-review high → 指摘3件をすべて修正(下記 Review)

## Notes

- 戦略 doc 修正: robots.txt で /e/ を Disallow すると noindex メタタグが読まれない(Google 仕様)ため、/e/ は noindex メタのみ・robots.txt は /api/ のみ Disallow に変更
- 実装エージェントが初回、委譲禁止契約に違反して子エージェントを spawn → ワークツリー無変更で停止。是正指示後に直接実装で完遂。最終状態に重複編集なし(diff 目視で確認)
- JSON-LD は layout でなく page.tsx に配置(layout は noindex の /e/ ページとも共有されるため)
- レビュー指摘の修正は subagent 委譲でなく直接実施(逸脱)。理由: 検証エージェント4体がセッション上限で全滅し、機械的な小修正にトークンを再消費するより温存を優先
- ユーザー側作業(実装外): Search Console 登録・sitemap 送信、独自ドメイン取得

## Review

/code-review high(8ファインダー角度 + 検証)の結果と対応:

| 指摘 | 検証 | 対応 |
|---|---|---|
| サイト URL・名称・説明文が layout/robots/sitemap/page に重複ハードコード(ドメイン移行時のドリフト危険) | CONFIRMED | `src/lib/site.ts` に SITE_URL/SITE_NAME/SITE_TITLE/SITE_DESCRIPTION を集約し全箇所で import。`grep matenaiyo.vercel.app src/` のヒットは site.ts のみ |
| 同一 noindex metadata が3ページにコピペ(将来ルート追加時の漏れでプライバシー退行) | CONFIRMED | `src/app/e/[slug]/layout.tsx` の metadata 1箇所に集約(Next docs の継承仕様で裏取り)。実サーバーで3ページとも noindex メタ出力を確認 |
| JSON-LD の stringify がキーストロークごとに再実行 | CONFIRMED(微小) | モジュールスコープの `jsonLdScript` に巻き上げ |
| 「JSON-LD が client component のためサーバー HTML に出ない」 | REFUTED | プリレンダー済み `.next/server/app/index.html` と実サーバーレスポンス両方に JSON-LD が存在(client component も SSR される) |

修正後の再検証: `pnpm check` / `pnpm test`(63 passed)/ `pnpm build` すべて exit 0。robots.txt / sitemap.xml の生成内容は修正前と同一。

---

# Phase 1 (MVP) 実装計画【完了済みアーカイブ】

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
