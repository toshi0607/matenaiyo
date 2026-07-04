import type { Mark } from "@/lib/schemas";

export interface MarkMeta {
  mark: Mark;
  symbol: string;
  label: string;
}

/** ○△× の記号・テキスト・順序。色覚対応のため記号+テキストで区別する。 */
export const MARK_META: readonly MarkMeta[] = [
  { mark: "yes", symbol: "○", label: "参加" },
  { mark: "maybe", symbol: "△", label: "未定" },
  { mark: "no", symbol: "×", label: "不参加" },
];

export function markMeta(mark: Mark): MarkMeta {
  const found = MARK_META.find((m) => m.mark === mark);
  return found ?? MARK_META[1];
}
