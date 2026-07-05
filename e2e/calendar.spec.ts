import { expect, test } from "@playwright/test";
import { selectCurrentMonthDays } from "./helpers";

// カレンダーで候補日を選び、既定時刻+プリセットで候補を作ってイベントを作成するフロー
test("create event by selecting days and adding a preset time", async ({
  page,
}) => {
  // #given /new を開いてタイトルを確認
  await page.goto("/new?title=カレンダー飲み会");
  await expect(page.getByTestId("title-input")).toHaveValue("カレンダー飲み会");

  // #when 当月の2日を選ぶ(各日に既定時刻19:00が自動で付き、候補2件になる)
  await selectCurrentMonthDays(page, [10, 15]);
  await expect(page.getByTestId("selected-slot")).toHaveCount(2);

  // #when 1日目に12:00をクイック追加して候補を3件にする
  await page
    .getByTestId("calendar-day")
    .nth(0)
    .getByTestId("time-preset-12")
    .click();
  await expect(page.getByTestId("selected-slot")).toHaveCount(3);

  // #when 作成を実行
  await page.getByTestId("create-submit").click();

  // #then 共有URLが発行される
  const shareUrl = await page.getByTestId("share-url").inputValue();
  const slug = shareUrl.split("/e/")[1];
  expect(slug).toBeTruthy();

  // #then イベントページを開くと候補が3件表示される
  await page.goto(`/e/${slug}/answer`);
  await expect(page.getByTestId("answer-slot")).toHaveCount(3);
});

// 開始時刻を自由入力で編集でき、生成される候補ラベルに反映される(統合方式の中核)
test("start time can be freely edited and reflects in the preview", async ({
  page,
}) => {
  // #given /new を開いて当月の1日を選ぶ
  await page.goto("/new?title=時刻編集テスト");
  await selectCurrentMonthDays(page, [12]);

  // #then 既定時刻19:00の候補が1件できている
  await expect(page.getByTestId("selected-slot")).toContainText("19:00〜");

  // #when 時刻入力を21:30に書き換える
  await page.getByTestId("day-time-input").fill("21:30");

  // #then 生成される候補ラベルが21:30に変わる
  await expect(page.getByTestId("selected-slot")).toContainText("21:30〜");

  // #when 終日をクイック追加する
  await page.getByTestId("time-preset-allday").click();

  // #then 時刻なしの「終日」候補が追加され、候補は2件になる
  await expect(page.getByTestId("selected-slot")).toHaveCount(2);
  await expect(page.getByTestId("selected-slot").nth(1)).toContainText("終日");
});

// 候補が上限(50件)を超えたら送信前にエラーで弾く(サーバー到達前のUXガード)
test("rejects more than 50 slots before submitting", async ({ page }) => {
  // #given /new を開いて当月の1日を選ぶ(既定時刻で1件)
  await page.goto("/new?title=大量候補");
  await selectCurrentMonthDays(page, [10]);

  // #when 「時間を追加」で候補を51件まで増やす
  const addTime = page
    .getByTestId("calendar-day")
    .nth(0)
    .getByTestId("add-time");
  for (let i = 0; i < 50; i += 1) {
    await addTime.click();
  }
  await expect(page.getByTestId("selected-slot")).toHaveCount(51);

  // #when 作成を押す
  await page.getByTestId("create-submit").click();

  // #then 共有URLは発行されず、上限エラーが表示される
  await expect(page.getByTestId("new-event-error")).toContainText("最大50件");
  await expect(page.getByTestId("created-card")).toHaveCount(0);
});
