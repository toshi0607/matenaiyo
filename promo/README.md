# matenaiyo プロモ動画 (Remotion)

matenaiyo（かんたん日程調整）の宣伝動画を [Remotion](https://www.remotion.dev/) で生成するプロジェクト。
本体アプリ（リポジトリ直下の Next.js）とは独立しており、依存も分離しています。

## 成果物

| ファイル | 用途 | 仕様 |
|---|---|---|
| `out/matenaiyo-promo.mp4` | SNS リール / ストーリー | 縦型 1080×1920 / 30fps / 約27秒 |
| `out/matenaiyo-promo-wide.mp4` | X タイムライン | 横型 1920×1080 / 30fps / 約27秒 |

BGM 入り。レイアウトは画面比に応じて自動で切り替わります（`useVideoConfig` で判定）。

## 構成（シーン）

1. オープニング（○リングのブランドマーク）
2. コンセプト「待たせない、日程調整。」
3. ① 候補日をカレンダーで選ぶ
4. ② URL を送るだけ
5. ③ ○△× をタップで回答
6. ④ ○最多の日が自動でわかる
7. クロージング（CTA + URL）

## セットアップ

```bash
cd promo
npm install
```

## コマンド

```bash
npm run dev          # Remotion Studio でプレビュー・編集
npm run render       # 縦型 1080×1920 を out/ に書き出し
npm run render:wide  # 横型 1920×1080 を out/ に書き出し
npm run bgm          # BGM (public/bgm.wav) を再生成
```

## BGM について

`scripts/make-bgm.mjs` が依存ゼロで WAV を合成します（著作権フリー）。
あたたかポップな曲調（マリンバ + パッド + ベース + キック）。テンポや進行、
各パートの音量はスクリプト内の定数で調整できます。生成物 `public/bgm.wav` は
`<Audio>` から `staticFile()` で読み込みます。

## ディレクトリ

```
promo/
├── src/
│   ├── index.ts / Root.tsx      # コンポジション登録（Promo / PromoWide）
│   ├── Video.tsx                # 全体の構成 + BGM
│   ├── theme.ts                 # ブランドカラー・フォント
│   ├── components/              # Logo / PhoneFrame / PhoneStage / Caption ほか
│   └── scenes/                  # 各シーン
├── scripts/make-bgm.mjs         # BGM 合成
└── public/bgm.wav               # 生成済み BGM
```
