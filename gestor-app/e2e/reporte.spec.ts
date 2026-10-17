import { expect, test } from "@playwright/test";

test("UC-REPORTE-AUDIT — Leer la auditoría de maestros", async ({ page }) => {
  await page.goto("/reporte");
  await expect(page.getByRole("heading", { name: "Auditoría de maestros" })).toBeVisible();
  const table = page.locator("table.data-table");
  await expect(table.getByRole("columnheader", { name: "Fecha" })).toBeVisible();
  await expect(table.getByRole("columnheader", { name: "Acción" })).toBeVisible();
});
