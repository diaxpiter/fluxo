import { test, expect } from "@playwright/test";

test("month label in History is visible and not squeezed to zero width", async ({ page }) => {
  await page.goto("/dashboard/history");
  await page.waitForLoadState("networkidle");

  const monthLabel = page.locator("button span").first();
  await expect(monthLabel).toBeVisible();

  const text = await monthLabel.textContent();
  expect(text?.trim().length ?? 0).toBeGreaterThan(0);

  const box = await monthLabel.boundingBox();
  expect(box, "month label should have a real bounding box").not.toBeNull();
  // Regression guard for the "month name swallowed by fixed-width grid columns" bug:
  // a real month name (even the shortest, e.g. "Maio") needs meaningfully more than a few px.
  expect(box!.width).toBeGreaterThan(20);
});

test("month row can be expanded to reveal its transactions", async ({ page }) => {
  await page.goto("/dashboard/history");
  await page.waitForLoadState("networkidle");

  const firstMonthButton = page.locator("button").filter({ hasText: /\d{4}|[a-zà-ú]+/i }).first();
  const rowsBefore = await page.locator("text=Editar").count();
  await firstMonthButton.click();
  await page.waitForTimeout(300);
  const rowsAfter = await page.locator("text=Editar").count();

  expect(rowsAfter).not.toBe(rowsBefore);
});
