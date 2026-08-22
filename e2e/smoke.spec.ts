import { test, expect } from "@playwright/test";

test("board renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("body")).toBeVisible();
});
