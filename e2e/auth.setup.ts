import { test as setup, expect } from "@playwright/test";

const authFile = "e2e/.auth/user.json";

setup("authenticate", async ({ page }) => {
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "Set TEST_EMAIL and TEST_PASSWORD env vars to a pre-confirmed Supabase account before running e2e tests " +
        "(automated signup is unreliable for this project due to email confirmation + rate limits).",
    );
  }

  await page.goto("/login");
  await page.locator("input[type=email]").fill(email);
  await page.locator("input[type=password]").fill(password);
  await page.getByRole("button", { name: /entrar|log in|sign in|iniciar/i }).click();
  await page.waitForURL("**/dashboard**");
  await expect(page.locator("body")).not.toContainText("error");

  await page.context().storageState({ path: authFile });
});
