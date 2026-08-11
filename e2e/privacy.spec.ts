import { expect, test } from "@playwright/test";
import { selectCurrentMonthDays } from "./helpers";

test("participant comments are absent from unauthenticated answer data", async ({
  page: organizerPage,
  browser,
}) => {
  const sentinelComment = "PRIVATE-COMMENT-8f2e58d4";

  await organizerPage.goto("/new?title=コメント非公開テスト");
  await selectCurrentMonthDays(organizerPage, [20]);
  await organizerPage.getByTestId("create-submit").click();
  const shareUrl = await organizerPage.getByTestId("share-url").inputValue();
  const slug = shareUrl.split("/e/")[1];
  expect(slug).toBeTruthy();

  const participantContext = await browser.newContext();
  const participantPage = await participantContext.newPage();
  await participantPage.goto(`/e/${slug}/answer`);
  await participantPage.getByTestId("answer-name").fill("回答者");
  await participantPage.getByTestId("answer-comment").fill(sentinelComment);
  await participantPage.getByTestId("answer-submit").click();
  await expect(participantPage.getByTestId("answer-done")).toBeVisible();

  // The answer owner keeps the local capability and can re-load their own comment.
  await participantPage.goto(`/e/${slug}/answer`);
  await expect(participantPage.getByTestId("answer-comment")).toHaveValue(
    sentinelComment,
  );

  // A fresh device receives no participant comment in the page payload.
  const visitorContext = await browser.newContext();
  const visitorPage = await visitorContext.newPage();
  const response = await visitorPage.goto(`/e/${slug}/answer`);
  expect(await response?.text()).not.toContain(sentinelComment);
  await expect(visitorPage.getByTestId("answer-comment")).toHaveValue("");

  const adminVisitorContext = await browser.newContext();
  const adminVisitorPage = await adminVisitorContext.newPage();
  const adminResponse = await adminVisitorPage.goto(`/e/${slug}/admin`);
  expect(await adminResponse?.text()).not.toContain(sentinelComment);
  await expect(
    adminVisitorPage.getByTestId("admin-not-recognized"),
  ).toBeVisible();

  // The event creator's local capability can still retrieve all comments for management.
  await organizerPage.goto(`/e/${slug}/admin`);
  await expect(organizerPage.getByTestId("admin-panel")).toBeVisible();
  await expect(organizerPage.getByText(sentinelComment)).toBeVisible();
  await organizerPage.locator('[data-testid^="delete-participant-"]').click();
  await organizerPage
    .locator('[data-testid^="confirm-delete-participant-"]')
    .click();
  await expect(organizerPage.getByText(sentinelComment)).toHaveCount(0);

  // Deleted credentials are indistinguishable from transient read failures.
  // The stored credential stays in place, but the participant can answer anew.
  await participantPage.goto(`/e/${slug}/answer`);
  await expect(participantPage.getByTestId("answer-error")).toHaveCount(0);
  await expect(participantPage.getByTestId("answer-name")).toHaveValue("");
  await expect(
    participantPage
      .getByTestId("answer-slot")
      .first()
      .getByTestId("mark-maybe"),
  ).toHaveAttribute("data-active", "true");
  await participantPage.getByTestId("answer-name").fill("回答し直し");
  await participantPage.getByTestId("answer-submit").click();
  await expect(participantPage.getByTestId("answer-done")).toBeVisible();

  await participantContext.close();
  await visitorContext.close();
  await adminVisitorContext.close();
});
