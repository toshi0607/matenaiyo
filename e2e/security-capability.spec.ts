import { expect, test } from "@playwright/test";
import postgres from "postgres";
import { beginEventCreation, selectCurrentMonthDays } from "./helpers";

test("answer and admin private data require a verified local capability", async ({
  page,
  browser,
}) => {
  await beginEventCreation(page, "能力確認テスト");
  await selectCurrentMonthDays(page, [10]);
  await page.getByTestId("create-submit").click();
  const shareUrl = await page.getByTestId("share-url").inputValue();
  const slug = shareUrl.split("/e/")[1];
  const privateComment = "PRIVATE-COMMENT-MUST-NOT-LEAK";

  await page.goto(`/e/${slug}/answer`);
  await page.getByTestId("answer-name").fill("秘密の回答者");
  await page.getByTestId("answer-comment").fill(privateComment);
  await page.getByTestId("answer-submit").click();
  await expect(page.getByTestId("answer-done")).toBeVisible();

  const participantId = await page.evaluate((eventSlug) => {
    const stored = localStorage.getItem(`chosei:edit:${eventSlug}`);
    if (!stored) throw new Error("missing edit credential");
    return (JSON.parse(stored) as { participantId: string }).participantId;
  }, slug);

  // 同じ端末の有効な編集資格は本人の回答だけを再表示できる。
  await page.goto(`/e/${slug}/answer`);
  await expect(page.getByTestId("editing-notice")).toBeVisible();
  await expect(page.getByTestId("answer-comment")).toHaveValue(privateComment);

  const freshContext = await browser.newContext();
  const freshPage = await freshContext.newPage();
  const freshAnswerResponse = await freshPage.goto(`/e/${slug}/answer`);
  const freshAnswerHtml = await freshAnswerResponse?.text();
  expect(freshAnswerHtml).not.toContain(privateComment);
  expect(freshAnswerHtml).not.toContain(participantId);
  await expect(freshPage.getByTestId("answer-form")).toBeVisible();
  await expect(freshPage.locator("body")).not.toContainText(privateComment);
  const freshAdminResponse = await freshPage.goto(`/e/${slug}/admin`);
  const freshAdminHtml = await freshAdminResponse?.text();
  expect(freshAdminHtml).not.toContain(privateComment);
  expect(freshAdminHtml).not.toContain(participantId);
  await expect(freshPage.getByTestId("admin-not-recognized")).toBeVisible();
  await expect(freshPage.locator("body")).not.toContainText(privateComment);

  const forgedContext = await browser.newContext();
  const forgedPage = await forgedContext.newPage();
  await forgedPage.goto(`/e/${slug}`);
  await forgedPage.evaluate(
    ({ eventSlug }) => {
      localStorage.setItem(
        `chosei:edit:${eventSlug}`,
        JSON.stringify({
          participantId: "00000000-0000-4000-8000-000000000000",
          editToken: "forged-token",
        }),
      );
      localStorage.setItem(`chosei:admin:${eventSlug}`, "forged-token");
    },
    { eventSlug: slug },
  );
  await forgedPage.goto(`/e/${slug}/answer`);
  await expect(forgedPage.getByTestId("answer-form")).toBeVisible();
  await expect(forgedPage.locator("body")).not.toContainText(privateComment);
  await forgedPage.goto(`/e/${slug}/admin`);
  await expect(forgedPage.getByTestId("admin-not-recognized")).toBeVisible();
  await expect(forgedPage.locator("body")).not.toContainText(privateComment);

  await freshContext.close();
  await forgedContext.close();
});

test("the 101st participant is rejected without extending retention", async ({
  page,
}) => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required for this test");
  const sql = postgres(databaseUrl, { max: 1 });

  try {
    await beginEventCreation(page, "回答上限テスト");
    await selectCurrentMonthDays(page, [10]);
    await page.getByTestId("create-submit").click();
    const shareUrl = await page.getByTestId("share-url").inputValue();
    const slug = shareUrl.split("/e/")[1];

    const [event] = await sql<
      { id: string; last_activity_at: Date }[]
    >`select id, last_activity_at from events where slug = ${slug}`;
    await sql`
      insert into participants (event_id, name, edit_token)
      select ${event.id}, 'seed-' || n, 'unused-test-token'
      from generate_series(1, 100) as n
    `;

    await page.goto(`/e/${slug}/answer`);
    await page.getByTestId("answer-name").fill("101人目");
    await page.getByTestId("answer-submit").click();
    await expect(page.getByTestId("answer-error")).toContainText(
      "回答者は最大100人",
    );

    const [after] = await sql<
      { participant_count: number; last_activity_at: Date }[]
    >`
      select
        (select count(*)::int from participants where event_id = ${event.id}) as participant_count,
        last_activity_at
      from events
      where id = ${event.id}
    `;
    expect(after.participant_count).toBe(100);
    expect(after.last_activity_at.getTime()).toBe(
      event.last_activity_at.getTime(),
    );
  } finally {
    await sql.end();
  }
});
