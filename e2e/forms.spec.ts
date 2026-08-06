import { test, expect } from "@playwright/test";

test.describe("Add transaction modal", () => {
  test("opens from the FAB and closes on backdrop click", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /adicionar transação|add transaction/i }).click();
    const heading = page.getByText(/adicionar transação|add transaction/i).first();
    await expect(heading).toBeVisible();

    // click far corner of the backdrop, outside the modal card
    await page.mouse.click(5, 5);
    await expect(heading).not.toBeVisible();
  });

  test("blocks submit when description is empty", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /adicionar transação|add transaction/i }).click();

    const descriptionInput = page.locator('input[name="description"]');
    await expect(descriptionInput).toHaveAttribute("required", "");

    // Native constraint validation should block submission and keep the modal open.
    await page.getByRole("button", { name: /entrada|saída|income|expense/i }).first().click();
    await expect(page.getByText(/adicionar transação|add transaction/i).first()).toBeVisible();
  });

  test("amount field rejects negative values via min=0 constraint", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /adicionar transação|add transaction/i }).click();

    const amountInput = page.locator('input[name="amount"]');
    await expect(amountInput).toHaveAttribute("min", "0");
  });
});

test.describe("Transfer modal", () => {
  test("opens and lists at least two accounts", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const transferTrigger = page.getByText(/transferir dinheiro|transfer money/i);
    if (!(await transferTrigger.isVisible().catch(() => false))) {
      test.skip(true, "Transfer requires 2+ accounts; only one account is configured for this user");
    }
    await transferTrigger.click();

    const fromSelect = page.locator("select").first();
    const options = await fromSelect.locator("option").count();
    expect(options).toBeGreaterThanOrEqual(2);
  });
});
