import { expect, type Page } from "@playwright/test";

/**
 * カレンダーで当月の指定日を順にタップして候補日にする。
 * 各日には既定時刻(19:00)が自動で1件付くため、生成される候補数は days.length と一致する。
 * data-day は "YYYY/M/D"(ゼロ埋めなし・スラッシュ区切り)形式。
 * 前後月のはみ出し日と衝突しないよう、当月内(1〜28)の日のみ渡すこと。
 */
export async function selectCurrentMonthDays(
  page: Page,
  days: number[],
): Promise<void> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  for (const day of days) {
    await page
      .locator(`[data-testid="calendar"] [data-day="${year}/${month}/${day}"]`)
      .click();
  }
  await expect(page.getByTestId("calendar-day")).toHaveCount(days.length);
}
