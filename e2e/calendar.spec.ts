import { expect, test } from "@playwright/test";

// カレンダーモードで候補日 × 時刻テンプレを選んでイベントを作成するフロー
test("create event via calendar mode with time presets", async ({ page }) => {
  // #given /new を開いてタイトルを入力
  await page.goto("/new?title=カレンダー飲み会");
  await expect(page.getByTestId("title-input")).toHaveValue("カレンダー飲み会");

  // #when カレンダーモードに切り替える
  await page.getByTestId("mode-calendar").click();
  await expect(page.getByTestId("calendar-mode")).toBeVisible();

  // #when 現在表示中の月(=今月)の2日を data-day 属性で確定的に選択する
  //     (カレンダーは過去日を無効化しないため月移動不要。data-day で日付を一意に特定)
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  await page.locator(`[data-day="${ym}-10"] button`).click();
  await page.locator(`[data-day="${ym}-15"] button`).click();

  // #then 選択した2日分の時刻プリセット行が表示される
  await expect(page.getByTestId("calendar-day")).toHaveCount(2);

  // #when それぞれに時刻テンプレを適用(1日目は19:00と12:00の2つ、2日目は19:00)
  const dayRows = page.getByTestId("calendar-day");
  await dayRows.nth(0).getByTestId("time-preset-19").click();
  await dayRows.nth(0).getByTestId("time-preset-12").click();
  await dayRows.nth(1).getByTestId("time-preset-19").click();

  // #then 作成される候補(slot)が3件になる
  await expect(page.getByTestId("selected-slot")).toHaveCount(3);

  // #when 作成を実行
  await page.getByTestId("create-submit").click();

  // #then 共有URLが発行される
  const shareUrl = await page.getByTestId("share-url").inputValue();
  const slug = shareUrl.split("/e/")[1];
  expect(slug).toBeTruthy();

  // #then イベントページを開くと候補が3件表示される(回答フォーム側で確認)
  await page.goto(`/e/${slug}/answer`);
  await expect(page.getByTestId("answer-slot")).toHaveCount(3);
});

// 候補が上限(50件)を超えたら送信前にエラーで弾く(サーバー到達前のUXガード)
test("rejects more than 50 slots before submitting", async ({ page }) => {
  // #given /new を開く
  await page.goto("/new?title=大量候補");

  // #when 51 行の候補を入力して作成を押す
  const lines = Array.from({ length: 51 }, (_, i) => `候補${i + 1}`).join("\n");
  await page.getByTestId("slots-input").fill(lines);
  await page.getByTestId("create-submit").click();

  // #then 共有URLは発行されず、上限エラーが表示される
  await expect(page.getByTestId("new-event-error")).toContainText("最大50件");
  await expect(page.getByTestId("created-card")).toHaveCount(0);
});

// テキストモードとカレンダーモードを切り替えられ、テキストモードが既定であること
test("mode toggle defaults to text and preserves slots-input", async ({
  page,
}) => {
  // #given /new を開く
  await page.goto("/new");

  // #then 既定でテキスト入力(slots-input)が使える
  await expect(page.getByTestId("slots-input")).toBeVisible();

  // #when カレンダーに切替 → テキストへ戻す
  await page.getByTestId("mode-calendar").click();
  await expect(page.getByTestId("slots-input")).toHaveCount(0);
  await page.getByTestId("mode-text").click();

  // #then テキスト入力に戻っている
  await expect(page.getByTestId("slots-input")).toBeVisible();
});
