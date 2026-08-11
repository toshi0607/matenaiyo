import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const readSource = (path: string) =>
  readFile(`${process.cwd()}/${path}`, "utf8");

describe("analytics privacy boundary", () => {
  it("keeps Google Analytics out of the root layout and all event UI", async () => {
    const paths = [
      "src/app/layout.tsx",
      "src/app/e/[slug]/answer/answer-form.tsx",
      "src/app/e/[slug]/admin/admin-panel.tsx",
    ];

    for (const path of paths) {
      await expect(readSource(path)).resolves.not.toContain(
        "third-parties/google",
      );
      await expect(readSource(path)).resolves.not.toContain("sendGAEvent");
    }
  });

  it("does not ship browser analytics from any application route", async () => {
    await expect(readSource("src/app/page.tsx")).resolves.not.toContain(
      "GoogleAnalytics",
    );
    await expect(readSource("src/app/new/page.tsx")).resolves.not.toContain(
      "GoogleAnalytics",
    );
    await expect(readSource("package.json")).resolves.not.toContain(
      "@next/third-parties",
    );
  });

  it("uses a hard navigation from the created card to an event route", async () => {
    const source = await readSource("src/app/new/new-event-form.tsx");
    expect(source).toMatch(/<a\s+href=\{`\/e\/\$\{created\.slug\}`\}/);
    expect(source).not.toContain('import Link from "next/link"');
  });
});
