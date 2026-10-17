import { expect, test } from "@playwright/test";

test("UC-LOGIN-OK — Iniciar sesión con usuario mock", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
  await expect(page.locator("[data-hydrated=true]")).toBeVisible({ timeout: 45_000 });
  await page.getByTestId("login-username").fill("luna");
  await page.getByTestId("login-password").fill("1234");
  await page.getByTestId("login-submit").click();
  await expect(page).toHaveURL(/\/gestion/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "Instanciar flujo" })).toBeVisible();
});

test("UC-LOGIN-FAIL — Rechazar credenciales inválidas", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator("[data-hydrated=true]")).toBeVisible({ timeout: 45_000 });
  await page.getByTestId("login-username").fill("nadie");
  await page.getByTestId("login-password").fill("mala");
  await page.getByTestId("login-submit").click();
  await expect(page.getByText(/Usuario o contraseña incorrectos/i)).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});
