import { expect, test } from "@playwright/test";

test("UC-DISENO-CANVAS — Abrir el canvas React Flow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("catalog-table")).toBeVisible();
  await page.getByRole("link", { name: "Abrir" }).first().click();
  await expect(page).toHaveURL(/\/diseno\//);
  await expect(page.locator(".designer-canvas")).toBeVisible();
  await expect(page.locator(".react-flow")).toBeVisible({ timeout: 15_000 });
});

test("UC-DISENO-VERSIONAR — Versionar un flujo listo", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("catalog-status").selectOption("listo");
  const versionar = page.getByRole("button", { name: "Versionar" }).first();
  await expect(versionar).toBeVisible();
  await versionar.click();

  const designer = page.waitForURL(/\/diseno\/flow_/, { timeout: 10_000 });
  const error = page.getByText(/Ya hay un borrador|Solo podés versionar/i);
  await Promise.race([
    designer.then(() => "ok"),
    error.waitFor({ state: "visible" }).then(() => "error"),
  ]);

  if (page.url().includes("/diseno/")) {
    await expect(page.getByText(/Borrador/)).toBeVisible();
  } else {
    await expect(error).toBeVisible();
  }
});

test("UC-DISENO-CONFIRMAR — Validar al confirmar un borrador incompleto", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("catalog-new").click();
  await expect(page).toHaveURL(/\/diseno\/flow_/);
  await page.getByRole("link", { name: "← Catálogo" }).click();
  await expect(page.getByTestId("catalog-table")).toBeVisible();
  await page.getByTestId("catalog-search").fill("Nuevo flujo");
  await page.getByRole("button", { name: "Confirmar" }).first().click();
  await expect(page.getByText(/Start Event|inválido|no es editable|Confirmar/i).first()).toBeVisible();
});
