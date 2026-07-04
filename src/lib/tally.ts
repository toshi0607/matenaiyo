export type Mark = "yes" | "maybe" | "no";

export interface SlotAnswer {
  slotId: string;
  mark: Mark;
}

export interface SlotTally {
  slotId: string;
  yes: number;
  maybe: number;
  no: number;
  isBest: boolean;
}

/**
 * slot ごとの yes/maybe/no を集計する。
 * yes が最多の slot を isBest とする(同数なら複数ベスト)。
 * yes が 1 件もない場合はベストなし。
 * 結果は slotIds の順序を保つ。存在しない slot への回答は無視する。
 */
export function tallySlots(
  slotIds: readonly string[],
  answers: readonly SlotAnswer[],
): SlotTally[] {
  const counts = new Map<string, { yes: number; maybe: number; no: number }>();
  for (const slotId of slotIds) {
    counts.set(slotId, { yes: 0, maybe: 0, no: 0 });
  }
  for (const answer of answers) {
    const count = counts.get(answer.slotId);
    if (count) {
      count[answer.mark] += 1;
    }
  }

  let maxYes = 0;
  for (const count of counts.values()) {
    if (count.yes > maxYes) {
      maxYes = count.yes;
    }
  }

  return slotIds.map((slotId) => {
    const count = counts.get(slotId) ?? { yes: 0, maybe: 0, no: 0 };
    return {
      slotId,
      ...count,
      isBest: maxYes > 0 && count.yes === maxYes,
    };
  });
}

export function bestSlotIds(tallies: readonly SlotTally[]): string[] {
  return tallies.filter((tally) => tally.isBest).map((tally) => tally.slotId);
}
