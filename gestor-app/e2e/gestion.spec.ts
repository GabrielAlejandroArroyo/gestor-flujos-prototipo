import { expect, test } from "@playwright/test";
import { fillVisibleInputs } from "./helpers";

test("UC-GESTION-INICIAR — Instanciar un flujo listo", async ({ page }) => {
  await page.goto("/gestion");
  await expect(page.getByRole("heading", { name: "Instanciar flujo" })).toBeVisible();
  await fillVisibleInputs(page);
  await page.getByTestId("gestion-start").click();
  await expect(page.locator(".instance-card").first()).toBeVisible({ timeout: 15_000 });
});

test("UC-GESTION-ACEPTAR — Resolver una user task aceptando", async ({ page }) => {
  await page.goto("/gestion");
  await fillVisibleInputs(page);
  await page.getByTestId("gestion-start").click();
  const card = page.locator(".instance-card").first();
  await expect(card).toBeVisible({ timeout: 15_000 });
  await card.click();

  const accept = page.getByRole("button", { name: "Aceptar" });
  const execute = page.getByRole("button", { name: "Ejecutar y continuar" });
  await expect(accept.or(execute)).toBeVisible();
  if (await accept.isVisible()) {
    await accept.click();
  } else {
    await execute.click();
  }
  await expect(page.locator(".resolver-panel")).toBeVisible();
});

test("UC-GESTION-TABS — Filtrar instancias por estado", async ({ page }) => {
  await page.goto("/gestion");
  await expect(page.getByTestId("gestion-tab-en_curso")).toBeVisible();
  await page.getByTestId("gestion-tab-completada").click();
  await expect(page.getByTestId("gestion-tab-completada")).toHaveClass(/is-active/);
  await page.getByTestId("gestion-tab-cerrada_rechazo").click();
  await expect(page.getByTestId("gestion-tab-cerrada_rechazo")).toHaveClass(/is-active/);
  await page.getByTestId("gestion-tab-en_curso").click();
  await expect(page.getByTestId("gestion-tab-en_curso")).toHaveClass(/is-active/);
});
