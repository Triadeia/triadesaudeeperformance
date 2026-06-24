import { test as base, expect, type Page } from "@playwright/test";

/**
 * Shared fixtures and helpers for Triade tasks E2E tests.
 *
 * Reads credentials from env. If credentials are missing, the affected
 * tests are skipped (not failed) so the suite can still run partially
 * during backend handoff.
 */

export interface TestCredentials {
  email: string;
  password: string;
}

export function getCreds(slot: "A" | "B"): TestCredentials | null {
  const email = process.env[`TEST_USER_${slot}_EMAIL`];
  const password = process.env[`TEST_USER_${slot}_PASSWORD`];
  if (!email || !password) return null;
  return { email, password };
}

export async function loginAs(page: Page, creds: TestCredentials) {
  await page.goto("/login");
  // The actual login form selectors will need adjustment once the auth
  // page is finalized. Using accessible labels rather than name attrs
  // so a small markup change does not break every test.
  const emailInput = page.getByLabel(/e-?mail/i).first();
  const passwordInput = page.getByLabel(/senha|password/i).first();
  await emailInput.fill(creds.email);
  await passwordInput.fill(creds.password);
  await page.getByRole("button", { name: /entrar|login/i }).click();
  await page.waitForURL(/\/app(\/|$)/, { timeout: 10_000 });
}

export async function gotoTasks(page: Page) {
  await page.goto("/app/tarefas");
  await expect(page.getByRole("heading", { name: /tarefas/i })).toBeVisible();
}

export const test = base.extend<{
  authedPageA: Page;
}>({
  authedPageA: async ({ page }, useFixture) => {
    const creds = getCreds("A");
    test.skip(!creds, "TEST_USER_A_EMAIL / TEST_USER_A_PASSWORD not configured");
    await loginAs(page, creds!);
    await useFixture(page);
  },
});

export { expect };
