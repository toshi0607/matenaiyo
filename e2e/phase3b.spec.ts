import { expect, test } from "@playwright/test";
import { selectCurrentMonthDays } from "./helpers";

// Phase 3b: OGP画像 / LINE共有 / 自動削除 cron の誤爆防止

/** イベントを1つ作成し slug を返す。 */
async function createEvent(
  page: import("@playwright/test").Page,
  title: string,
): Promise<string> {
  await page.goto(`/new?title=${encodeURIComponent(title)}`);
  await selectCurrentMonthDays(page, [10, 11]);
  await page.getByTestId("create-submit").click();
  const shareUrl = await page.getByTestId("share-url").inputValue();
  const slug = shareUrl.split("/e/")[1];
  expect(slug).toBeTruthy();
  return slug;
}

test("OGP image endpoint returns an image", async ({ page }) => {
  // #given イベントを作成
  const slug = await createEvent(page, "OGPテスト");

  // #when そのイベントの opengraph-image を取得
  const res = await page.request.get(`/e/${slug}/opengraph-image`);

  // #then 200 かつ画像
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toMatch(/^image\//);
});

test("LINE share button links to LINE share URL", async ({ page }) => {
  // #given イベントページを開く
  const slug = await createEvent(page, "LINE共有テスト");
  await page.goto(`/e/${slug}`);

  // #then LINE共有ボタンが存在し、共有URLを指す
  const lineShare = page.getByTestId("line-share");
  await expect(lineShare).toBeVisible();
  await expect(lineShare).toHaveAttribute("target", "_blank");

  const href = await lineShare.getAttribute("href");
  expect(href).toContain("https://social-plugins.line.me/lineit/share");
  expect(href).toContain(encodeURIComponent(`/e/${slug}`));
});

test("cron cleanup rejects requests without valid auth", async ({ page }) => {
  // #when Authorization 無しで叩く
  const res = await page.request.get("/api/cron/cleanup");

  // #then 削除は実行されず 401/500 で安全側に倒れる(誤爆防止)
  expect([401, 500]).toContain(res.status());
});
