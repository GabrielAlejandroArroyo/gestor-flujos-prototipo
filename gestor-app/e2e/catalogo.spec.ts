import { expect, test } from "@playwright/test";

test("UC-CATALOGO-LISTA — Ver el catálogo de flujos", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Catálogo de flujos" })).toBeVisible();
  const table = page.getByTestId("catalog-table");
  await expect(table).toBeVisible({ timeout: 45_000 });
  await expect(table.getByRole("columnheader", { name: "Nombre" })).toBeVisible();
  await expect(table.getByRole("columnheader", { name: "Estado" })).toBeVisible();
  await expect(table.locator("tbody tr")).not.toHaveCount(0);
});

test("UC-CATALOGO-FILTROS — Filtrar flujos por texto, estado y tipo", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("catalog-table")).toBeVisible({ timeout: 45_000 });

  await page.getByTestId("catalog-search").fill("gasto");
  await expect(page.getByTestId("catalog-table").locator("tbody tr").first()).toBeVisible();

  await page.getByTestId("catalog-status").selectOption("listo");
  await expect(page.getByTestId("catalog-table").getByText("Listo").first()).toBeVisible();

  const typeSelect = page.getByTestId("catalog-type");
  const optionCount = await typeSelect.locator("option").count();
  if (optionCount > 1) {
    const value = await typeSelect.locator("option").nth(1).getAttribute("value");
    if (value) await typeSelect.selectOption(value);
  }
});

test("UC-CATALOGO-NUEVO — Crear un borrador nuevo", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("catalog-new").click();
  await expect(page).toHaveURL(/\/diseno\/flow_/);
  await expect(page.getByRole("heading", { name: "Nuevo flujo" })).toBeVisible();
  await expect(page.getByText(/Borrador/)).toBeVisible();
});
