import { expect, test } from "@playwright/test";
import { selectCurrentMonthDays } from "./helpers";

// 幹事管理: starts_at 付き候補を作成 → 回答 → 確定 →
// イベントページに確定バナー + .ics/Google カレンダー連携が出ることを検証する。
test("admin decides a dated slot and calendar links appear", async ({
  page,
}) => {
  // #given starts_at 付き候補を1件作成する(作成端末に adminToken が保存される)
  await page.goto("/new?title=確定テスト飲み会");
  // 当月の1日を選ぶと既定時刻19:00の starts_at 付き候補が1件できる
  await selectCurrentMonthDays(page, [15]);
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

  // #then 確定画面で各候補の集計(○△×)とベスト表示を確認できる(集計ページに戻らなくてよい)
  await expect(page.getByTestId("slot-tally").first()).toContainText("○ 1");
  await expect(page.getByTestId("admin-best-badge").first()).toBeVisible();

  const decideButton = page.locator('[data-testid^="decide-slot-"]').first();
  await decideButton.click();
  // #then 確定した行は状態バッジになり、押しても何も起きない確定ボタンは消える
  await expect(page.getByTestId("admin-decided-badge")).toBeVisible();
  await expect(decideButton).toHaveCount(0);

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

// 幹事管理: 候補日程の追加と削除。追加分は集計表に列(未回答)として現れ、
// 最後の1件は削除できない。
test("organizer adds and deletes candidate slots", async ({ page }) => {
  // #given 候補1件のイベントを作り、回答を1件登録する
  await page.goto("/new?title=候補追加テスト");
  await selectCurrentMonthDays(page, [10]);
  await page.getByTestId("create-submit").click();
  const shareUrl = await page.getByTestId("share-url").inputValue();
  const slug = shareUrl.split("/e/")[1];
  expect(slug).toBeTruthy();

  await page.goto(`/e/${slug}/answer`);
  await page.getByTestId("answer-name").fill("回答者");
  await page.getByTestId("answer-slot").nth(0).getByTestId("mark-yes").click();
  await page.getByTestId("answer-submit").click();
  await expect(page.getByTestId("answer-done")).toBeVisible();

  // #then 候補が1件だけのうちは削除ボタンが無効
  await page.goto(`/e/${slug}/admin`);
  await expect(page.getByTestId("candidate-row")).toHaveCount(1);
  await expect(page.locator('[data-testid^="delete-slot-"]')).toBeDisabled();

  // #when 幹事管理画面で「候補を追加」を開き、カレンダーで候補を2件追加する
  await expect(page.getByTestId("add-slots-card")).toHaveCount(0);
  await page.getByTestId("add-slots-toggle").click();
  await selectCurrentMonthDays(page, [11, 12]);
  await expect(page.getByTestId("selected-slot")).toHaveCount(2);
  await page.getByTestId("add-slots-submit").click();

  // #then 候補は3件になり、追加パネルは閉じて選択もクリアされる
  await expect(page.getByTestId("candidate-row")).toHaveCount(3);
  await expect(page.getByTestId("add-slots-card")).toHaveCount(0);

  // #then 集計ページにも3行として反映される(追加分は未回答)
  await page.goto(`/e/${slug}`);
  await expect(page.getByTestId("tally-row")).toHaveCount(3);

  // #when すでにある候補と同じ日時をもう一度追加しようとする
  await page.goto(`/e/${slug}/admin`);
  await page.getByTestId("add-slots-toggle").click();
  await selectCurrentMonthDays(page, [11]);
  await page.getByTestId("add-slots-submit").click();

  // #then 重複として拒否され、エラーは操作した追加パネル内に出る
  const addPanelError = page
    .getByTestId("add-slots-card")
    .getByTestId("admin-error");
  await expect(addPanelError).toContainText("選んだ候補はすべて追加済みです");
  await expect(page.getByTestId("candidate-row")).toHaveCount(3);

  // #when 追加した候補を確定してから、その候補を削除する
  await page.goto(`/e/${slug}/admin`);
  const lastDecide = page.locator('[data-testid^="decide-slot-"]').last();
  await lastDecide.click();
  await expect(page.getByTestId("admin-decided-badge")).toBeVisible();
  await page.goto(`/e/${slug}`);
  await expect(page.getByTestId("decided-banner")).toBeVisible();

  // #when 削除は確認を挟む(一度キャンセルしてから削除する)
  await page.goto(`/e/${slug}/admin`);
  const lastSlotId = await page
    .locator('[data-testid^="delete-slot-"]')
    .last()
    .getAttribute("data-testid");
  const slotSuffix = lastSlotId?.replace("delete-slot-", "");
  await page.getByTestId(`delete-slot-${slotSuffix}`).click();
  // 削除トリガーが消えるため、フォーカスは安全側の「やめる」に移る
  await expect(
    page.getByTestId(`cancel-delete-slot-${slotSuffix}`),
  ).toBeFocused();
  await page.getByTestId(`cancel-delete-slot-${slotSuffix}`).click();
  await expect(page.getByTestId("candidate-row")).toHaveCount(3);

  await page.getByTestId(`delete-slot-${slotSuffix}`).click();
  await page.getByTestId(`confirm-delete-slot-${slotSuffix}`).click();

  // #then 候補は2件になり、確定も解除される
  await expect(page.getByTestId("candidate-row")).toHaveCount(2);
  await page.goto(`/e/${slug}`);
  await expect(page.getByTestId("tally-row")).toHaveCount(2);
  await expect(page.getByTestId("decided-banner")).toHaveCount(0);
});

// 回答後に幹事が候補を追加したとき、既存回答者の再編集画面で新候補が
// 未選択(=未回答)のまま扱われ、幹事画面には未回答数が出ることを検証する。
test("a slot added after answering stays unanswered for the existing respondent", async ({
  page,
}) => {
  // #given 候補2件のイベントに1人が回答している
  await page.goto("/new?title=新候補テスト");
  await selectCurrentMonthDays(page, [10, 11]);
  await page.getByTestId("create-submit").click();
  const shareUrl = await page.getByTestId("share-url").inputValue();
  const slug = shareUrl.split("/e/")[1];

  await page.goto(`/e/${slug}/answer`);
  await page.getByTestId("answer-name").fill("田中");
  await page.getByTestId("answer-slot").nth(0).getByTestId("mark-yes").click();
  await page.getByTestId("answer-slot").nth(1).getByTestId("mark-no").click();
  await page.getByTestId("answer-submit").click();
  await expect(page.getByTestId("answer-done")).toBeVisible();

  // #when 幹事が候補を1件追加する
  await page.goto(`/e/${slug}/admin`);
  await page.getByTestId("add-slots-toggle").click();
  await selectCurrentMonthDays(page, [20]);
  await page.getByTestId("add-slots-submit").click();
  await expect(page.getByTestId("candidate-row")).toHaveCount(3);

  // #then 同じ端末で回答フォームを開くと、追加分だけが未選択で「新しい候補」と分かる
  await page.goto(`/e/${slug}/answer`);
  await expect(page.getByTestId("editing-notice")).toContainText(
    "あとから追加された候補が1件あります",
  );
  await expect(page.getByTestId("new-slot-badge")).toHaveCount(1);
  const newSlotCard = page.getByTestId("answer-slot").nth(2);
  await expect(newSlotCard.getByTestId("new-slot-badge")).toBeVisible();
  await expect(
    newSlotCard.locator('[data-testid^="mark-"][data-active="true"]'),
  ).toHaveCount(0);

  // #when 追加分に触れずに更新する
  await page.getByTestId("answer-submit").click();
  await expect(page.getByTestId("answer-done")).toBeVisible();

  // #then 集計表では追加分が未回答のまま(未定として記録されない)
  await page.goto(`/e/${slug}`);
  await expect(page.getByTestId("tally-row").nth(2)).toContainText("未回答");

  // #then 幹事画面の集計には未回答数が出る
  await page.goto(`/e/${slug}/admin`);
  await expect(page.getByTestId("slot-tally").nth(2)).toContainText("未回答 1");
});

// adminToken を持たない端末では幹事管理リンクが出ず、admin 画面は非認識メッセージを出す。
test("non-admin device sees no admin link and a not-recognized notice", async ({
  page,
  browser,
}) => {
  // #given 作成端末でイベントを作る
  await page.goto("/new?title=非幹事テスト");
  await selectCurrentMonthDays(page, [1, 2]);
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
