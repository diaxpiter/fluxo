import { test, expect } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

test("visiting the dashboard while logged out redirects to /login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("visiting history while logged out redirects to /login", async ({ page }) => {
  await page.goto("/dashboard/history");
  await expect(page).toHaveURL(/\/login/);
});
