import { expect, test } from "@playwright/test";

// 作成 → 共有URLを開く → 回答 → 集計反映 の一気通貫フロー
test("create event, answer, and see tally reflected", async ({ page }) => {
  // #given トップページでタイトルを入力して作成フローへ
  await page.goto("/");
  await page.getByTestId("home-title-input").fill("忘年会の日程");
  await page.getByTestId("home-submit").click();

  // #then /new にタイトルが引き継がれている
  await expect(page).toHaveURL(/\/new/);
  await expect(page.getByTestId("title-input")).toHaveValue("忘年会の日程");

  // #when 候補日程を入力して作成
  await page
    .getByTestId("slots-input")
    .fill("12/20(金) 19:00〜\n12/21(土) 18:00〜\n12/23(月) 19:00〜");
  await page.getByTestId("create-submit").click();

  // #then 共有URLが発行される
  const shareUrl = await page.getByTestId("share-url").inputValue();
  const slug = shareUrl.split("/e/")[1];
  expect(slug).toBeTruthy();

  // #when イベントページを開くとまだ回答が無い
  await page.getByTestId("go-to-event").click();
  await expect(page).toHaveURL(new RegExp(`/e/${slug}$`));
  await expect(page.getByTestId("empty-state")).toBeVisible();

  // #when 回答フォームで1つ目を○、残りを×にして送信
  await page.getByTestId("answer-cta").click();
  await expect(page).toHaveURL(new RegExp(`/e/${slug}/answer$`));
  await page.getByTestId("answer-name").fill("山田");

  const slotCards = page.getByTestId("answer-slot");
  await slotCards.nth(0).getByTestId("mark-yes").click();
  await slotCards.nth(1).getByTestId("mark-no").click();
  await slotCards.nth(2).getByTestId("mark-no").click();

  await page.getByTestId("answer-submit").click();
  await expect(page.getByTestId("answer-done")).toBeVisible();

  // #then 集計に戻ると回答が反映され、○最多の候補が「ベスト」
  await page.getByTestId("back-to-event").click();
  await expect(page.getByTestId("tally-table")).toBeVisible();

  const bestRows = page.locator('[data-testid="tally-row"][data-best="true"]');
  await expect(bestRows).toHaveCount(1);
  await expect(page.getByTestId("best-badge")).toBeVisible();
  await expect(page.getByText("山田")).toBeVisible();
});

// 同一端末での再編集導線
test("re-edit own answer from the same device", async ({ page }) => {
  // #given イベントを作成して回答済み
  await page.goto("/new?title=歓迎会");
  await page.getByTestId("slots-input").fill("1/10\n1/11");
  await page.getByTestId("create-submit").click();
  const shareUrl = await page.getByTestId("share-url").inputValue();
  const slug = shareUrl.split("/e/")[1];

  await page.goto(`/e/${slug}/answer`);
  await page.getByTestId("answer-name").fill("佐藤");
  const slots = page.getByTestId("answer-slot");
  await slots.nth(0).getByTestId("mark-yes").click();
  await slots.nth(1).getByTestId("mark-no").click();
  await page.getByTestId("answer-submit").click();
  await expect(page.getByTestId("answer-done")).toBeVisible();

  // #when 同じ端末で回答フォームを再訪
  await page.goto(`/e/${slug}/answer`);

  // #then 既存回答が編集モードで初期表示される
  await expect(page.getByTestId("editing-notice")).toBeVisible();
  await expect(page.getByTestId("answer-name")).toHaveValue("佐藤");

  // #when 2つ目を△に変更して更新
  await slots.nth(1).getByTestId("mark-maybe").click();
  await page.getByTestId("answer-submit").click();
  await expect(page.getByTestId("answer-done")).toBeVisible();

  // #then 集計に佐藤が1人だけ（重複行が増えていない）
  await page.getByTestId("back-to-event").click();
  await expect(page.getByText("佐藤")).toHaveCount(1);
});
