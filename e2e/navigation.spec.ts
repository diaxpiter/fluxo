import { test, expect } from "@playwright/test";

const pages = [
  { path: "/dashboard", heading: /oi|hi|olá/i },
  { path: "/dashboard/history", heading: /histórico|history/i },
  { path: "/dashboard/settings", heading: /configurações|settings/i },
];

for (const p of pages) {
  test(`${p.path} loads with no console errors`, async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${err.message}`));

    const response = await page.goto(p.path);
    expect(response?.ok()).toBeTruthy();
    await page.waitForLoadState("networkidle");

    expect(consoleErrors, `console errors on ${p.path}:\n${consoleErrors.join("\n")}`).toHaveLength(0);
  });
}

test("bottom nav links to Home, History, and Settings", async ({ page }) => {
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");

  await page.getByRole("link", { name: /histórico|history/i }).click();
  await expect(page).toHaveURL(/\/dashboard\/history/);

  await page.getByRole("link", { name: /configurações|settings/i }).click();
  await expect(page).toHaveURL(/\/dashboard\/settings/);

  await page.getByRole("link", { name: /início|home/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("a category card in Settings navigates to its detail page", async ({ page }) => {
  await page.goto("/dashboard/settings");
  await page.waitForLoadState("networkidle");

  const categoryLink = page.locator('a[href*="/dashboard/categories/"]').first();
  await categoryLink.click();
  await expect(page).toHaveURL(/\/dashboard\/categories\/[^/]+$/);
  await expect(page.getByText(/transações|transactions/i).first()).toBeVisible();
});
