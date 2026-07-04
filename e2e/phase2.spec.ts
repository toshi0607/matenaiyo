import { expect, test } from "@playwright/test";

// ダークモード: ヘッダのトグルで html に dark クラスが付く
test("theme toggle switches to dark mode", async ({ page }) => {
  // #given トップページを開く
  await page.goto("/");
  const html = page.locator("html");
  const toggle = page.getByTestId("theme-toggle");

  // #when トグルを押していき dark 状態にする(light → dark → system の循環)
  // 最大3回押せばいずれかで dark クラスが付与される
  await expect(toggle).toBeVisible();
  let sawDark = false;
  for (let i = 0; i < 3; i += 1) {
    await toggle.click();
    if ((await toggle.getAttribute("data-theme")) === "dark") {
      sawDark = true;
      break;
    }
  }

  // #then html に dark クラスが付く
  expect(sawDark).toBe(true);
  await expect(html).toHaveClass(/dark/);
});

// 自動更新(ポーリング経路): 別コンテキストの回答が集計ページに自動反映される
test("tally auto-refreshes when another user answers", async ({
  page,
  browser,
}) => {
  // #given イベントを作成する
  await page.goto("/new?title=自動更新テスト");
  await page.getByTestId("slots-input").fill("2/1\n2/2");
  await page.getByTestId("create-submit").click();
  const shareUrl = await page.getByTestId("share-url").inputValue();
  const slug = shareUrl.split("/e/")[1];
  expect(slug).toBeTruthy();

  // #given 集計ページを開く(まだ回答なし)
  await page.goto(`/e/${slug}`);
  await expect(page.getByTestId("empty-state")).toBeVisible();

  // #when 別コンテキスト(別端末想定)から回答を追加する
  const otherContext = await browser.newContext();
  const otherPage = await otherContext.newPage();
  await otherPage.goto(`/e/${slug}/answer`);
  await otherPage.getByTestId("answer-name").fill("田中");
  const slots = otherPage.getByTestId("answer-slot");
  await slots.nth(0).getByTestId("mark-yes").click();
  await slots.nth(1).getByTestId("mark-no").click();
  await otherPage.getByTestId("answer-submit").click();
  await expect(otherPage.getByTestId("answer-done")).toBeVisible();
  await otherContext.close();

  // #then 元のページはリロードせずともポーリングで集計が更新される
  await expect(page.getByTestId("tally-table")).toBeVisible({ timeout: 10000 });
  await expect(page.getByText("田中")).toBeVisible({ timeout: 10000 });
});
