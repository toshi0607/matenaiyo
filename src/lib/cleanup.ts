/**
 * データ保持ポリシー: 最終更新(last_activity_at)から一定期間で自動削除する。
 * cutoff の計算は純粋関数として切り出しユニットテスト対象にする。
 * 実削除は events を消せば FK cascade で slots/participants/answers も消える。
 */

import { lt } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema";

/** デフォルトの保持期間(月) */
export const DEFAULT_RETENTION_MONTHS = 6;

/**
 * now から months ヶ月前の時刻を返す。これより古い last_activity_at が削除対象。
 * 純粋関数(副作用なし)。
 *
 * UTC 基準で計算し、サーバーのタイムゾーンに依存しない。月末日は繰り上げず、
 * 対象月の末日にクランプする(例: 8/31 の6ヶ月前 → 2/28、3/3 にはしない)。
 */
export function cutoffDate(now: Date, months = DEFAULT_RETENTION_MONTHS): Date {
  const cutoff = new Date(now.getTime());
  const day = cutoff.getUTCDate();
  // 月シフト中のオーバーフロー(2/31 → 3/3 等)を避けるため一旦 1 日にする。
  cutoff.setUTCDate(1);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - months);
  const lastDayOfMonth = new Date(
    Date.UTC(cutoff.getUTCFullYear(), cutoff.getUTCMonth() + 1, 0),
  ).getUTCDate();
  cutoff.setUTCDate(Math.min(day, lastDayOfMonth));
  return cutoff;
}

/**
 * lastActivityAt から months ヶ月後の削除予定日時を返す。cutoffDate の逆方向の計算。
 * 純粋関数(副作用なし)。
 *
 * UTC 基準で計算し、サーバーのタイムゾーンに依存しない。月末日は繰り上げず、
 * 対象月の末日にクランプする(例: 8/31 の6ヶ月後 → 2/28、うるう年なら 2/29)。
 */
export function deletionDate(
  lastActivityAt: Date,
  months = DEFAULT_RETENTION_MONTHS,
): Date {
  const deletion = new Date(lastActivityAt.getTime());
  const day = deletion.getUTCDate();
  // 月シフト中のオーバーフロー(2/31 → 3/3 等)を避けるため一旦 1 日にする。
  deletion.setUTCDate(1);
  deletion.setUTCMonth(deletion.getUTCMonth() + months);
  const lastDayOfMonth = new Date(
    Date.UTC(deletion.getUTCFullYear(), deletion.getUTCMonth() + 1, 0),
  ).getUTCDate();
  deletion.setUTCDate(Math.min(day, lastDayOfMonth));
  return deletion;
}

/**
 * cutoff より古い last_activity_at を持つイベントを削除し、削除件数を返す。
 */
export async function deleteStaleEvents(
  now: Date,
  months = DEFAULT_RETENTION_MONTHS,
): Promise<number> {
  const cutoff = cutoffDate(now, months);
  const deleted = await db
    .delete(events)
    .where(lt(events.lastActivityAt, cutoff))
    .returning({ id: events.id });
  return deleted.length;
}
