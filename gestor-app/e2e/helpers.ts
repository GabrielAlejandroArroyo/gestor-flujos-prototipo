import { expect, type Page } from "@playwright/test";

export async function openApp(page: Page, route = "/"): Promise<void> {
  await page.goto(route, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Gestor de flujos" })).toBeVisible();
  await page.locator("#app-main").waitFor({ state: "visible" });
}

/** Espera a que el JS de Next hidrate (los data-testid interactivos existen). */
export async function waitForHydration(page: Page, testId: string): Promise<void> {
  await expect(page.getByTestId(testId)).toBeVisible({ timeout: 45_000 });
}

export async function loginAsLuna(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByTestId("login-username").fill("luna");
  await page.getByTestId("login-password").fill("1234");
  await page.getByTestId("login-submit").click();
  await expect(page).toHaveURL(/\/gestion/);
}

export async function importTestingFromUi(page: Page): Promise<void> {
  await page.goto("/datos");
  await page.getByTestId("import-testing").click();
  await expect(page.getByTestId("datos-message")).toContainText("Import OK", { timeout: 30_000 });
}

export async function fillVisibleInputs(page: Page): Promise<void> {
  const inputs = page.locator("form.form-grid input:not([type=hidden])");
  const count = await inputs.count();
  for (let i = 0; i < count; i += 1) {
    const input = inputs.nth(i);
    const name = (await input.getAttribute("name")) ?? `campo_${i}`;
    await input.fill(name.includes("monto") ? "1500" : `e2e-${name}`);
  }
}
