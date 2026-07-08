import { DEFAULT_RETENTION_MONTHS } from "@/lib/cleanup";

// トップページの「よくある質問」セクションと FAQPage JSON-LD の唯一の情報源。
// 可視 FAQ と構造化データを同じ定数から生成し、内容の乖離を防ぐ。
export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: "ログインやアカウント登録は必要ですか?",
    answer: "不要です。イベント作成も回答も URL を開くだけで使えます。",
  },
  {
    question: "料金はかかりますか?",
    answer: "無料です。",
  },
  {
    question: "回答をあとから修正できますか?",
    answer:
      "同じ端末・ブラウザからであれば修正できます。編集用の鍵を端末内に保存しているため、他の端末からは修正できません。",
  },
  {
    question: "作成したイベントはいつまで残りますか?",
    answer: `最終更新から${DEFAULT_RETENTION_MONTHS}ヶ月で自動的に削除されます。削除予定日はイベントページに表示されています。`,
  },
  {
    question: "イベントページが検索結果に表示されることはありますか?",
    answer:
      "ありません。すべてのイベントページは検索エンジンに登録されない設定(noindex)になっており、URL も推測が難しいランダムな文字列です。",
  },
  {
    question: "日程が決まったらどうなりますか?",
    answer:
      "幹事が日程を確定すると、確定した日程がページ上部に表示されます。日時が設定された候補の場合は、.ics ファイルのダウンロードと Google カレンダーへの追加リンクも表示されます。",
  },
];
