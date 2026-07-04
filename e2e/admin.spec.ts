import { expect, test } from "@playwright/test";

// 幹事管理: カレンダーモードで starts_at 付き候補を作成 → 回答 → 確定 →
// イベントページに確定バナー + .ics/Google カレンダー連携が出ることを検証する。
test("admin decides a dated slot and calendar links appear", async ({
  page,
}) => {
  // #given カレンダーモードで starts_at 付き候補を1件作成する(作成端末に adminToken が保存される)
  await page.goto("/new?title=確定テスト飲み会");
  await page.getByTestId("mode-calendar").click();
  await expect(page.getByTestId("calendar-mode")).toBeVisible();

  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  await page.locator(`[data-day="${ym}-15"] button`).click();
  await page
    .getByTestId("calendar-day")
    .nth(0)
    .getByTestId("time-preset-19")
    .click();
  await expect(page.getByTestId("selected-slot")).toHaveCount(1);

  await page.getByTestId("create-submit").click();
  const shareUrl = await page.getByTestId("share-url").inputValue();
  const slug = shareUrl.split("/e/")[1];
  expect(slug).toBeTruthy();

  // #given 回答を1件登録する
  await page.goto(`/e/${slug}/answer`);
  await page.getByTestId("answer-name").fill("幹事");
  await page.getByTestId("answer-slot").nth(0).getByTestId("mark-yes").click();
  await page.getByTestId("answer-submit").click();
  await expect(page.getByTestId("answer-done")).toBeVisible();

  // #then 作成端末のイベントページには幹事管理リンクが出る
  await page.goto(`/e/${slug}`);
  await expect(page.getByTestId("admin-link")).toBeVisible();

  // #when 幹事管理画面で日程を確定する
  await page.getByTestId("admin-link").click();
  await expect(page.getByTestId("admin-panel")).toBeVisible();
  const decideButton = page.locator('[data-testid^="decide-slot-"]').first();
  await decideButton.click();
  await expect(decideButton).toHaveText("確定中");

  // #then イベントページに確定バナーと .ics / Google カレンダーリンクが出る
  await page.goto(`/e/${slug}`);
  await expect(page.getByTestId("decided-banner")).toBeVisible();
  await expect(page.getByTestId("ics-download")).toBeVisible();
  const gcal = page.getByTestId("gcal-link");
  await expect(gcal).toBeVisible();
  await expect(gcal).toHaveAttribute(
    "href",
    /calendar\.google\.com\/calendar\/render\?action=TEMPLATE/,
  );
});

// adminToken を持たない端末では幹事管理リンクが出ず、admin 画面は非認識メッセージを出す。
test("non-admin device sees no admin link and a not-recognized notice", async ({
  page,
  browser,
}) => {
  // #given 作成端末でイベントを作る
  await page.goto("/new?title=非幹事テスト");
  await page.getByTestId("slots-input").fill("2/1\n2/2");
  await page.getByTestId("create-submit").click();
  const shareUrl = await page.getByTestId("share-url").inputValue();
  const slug = shareUrl.split("/e/")[1];
  expect(slug).toBeTruthy();

  // #when 別端末(別コンテキスト)でイベントページを開く
  const otherContext = await browser.newContext();
  const otherPage = await otherContext.newPage();
  await otherPage.goto(`/e/${slug}`);

  // #then 幹事管理リンクは出ない
  await expect(otherPage.getByTestId("answer-cta")).toBeVisible();
  await expect(otherPage.getByTestId("admin-link")).toHaveCount(0);

  // #when admin 画面を直接開いても幹事として認識されない
  await otherPage.goto(`/e/${slug}/admin`);
  await expect(otherPage.getByTestId("admin-not-recognized")).toBeVisible();
  await expect(otherPage.getByTestId("admin-panel")).toHaveCount(0);

  await otherContext.close();
});
