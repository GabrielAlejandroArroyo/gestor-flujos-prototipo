import { expect, test } from "@playwright/test";

test("UC-MAESTROS-LISTA — Consultar tipos, entidades y maestros", async ({ page }) => {
  await page.goto("/maestros");
  await expect(page.getByRole("heading", { name: "Maestros y entidades" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tipos de flujo" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Entidades/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Definiciones de maestros/ })).toBeVisible();
});

test("UC-MAESTROS-TIPO — Agregar un tipo de flujo", async ({ page }) => {
  await page.goto("/maestros");
  const name = `Tipo E2E ${Date.now()}`;
  await page.getByTestId("flow-type-name").fill(name);
  await page.getByTestId("flow-type-add").click();
  await expect(page.getByText(name)).toBeVisible();
});
