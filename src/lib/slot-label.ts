import type { Slot } from "@/db/schema";

/** slot の表示ラベル。starts_at があれば日時、なければ自由記述 label を返す。 */
export function slotLabel(slot: Pick<Slot, "startsAt" | "label">): string {
  if (slot.startsAt) {
    return new Intl.DateTimeFormat("ja-JP", {
      month: "numeric",
      day: "numeric",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Tokyo",
    }).format(slot.startsAt);
  }
  return slot.label ?? "（無題）";
}
