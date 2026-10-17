import { expect, test } from "@playwright/test";

test("UC-DATOS-IMPORT — Importar dataset de testing", async ({ page }) => {
  await page.goto("/datos");
  await expect(page.getByRole("heading", { name: "Export / Import" })).toBeVisible();
  await page.getByTestId("import-testing").click();
  await expect(page.getByTestId("datos-message")).toContainText("Import OK", { timeout: 30_000 });
  await expect(page.getByTestId("datos-message")).toContainText("flows");
});

test("UC-DATOS-EXPORT — Exportar estado en formato mock", async ({ page }) => {
  await page.goto("/datos");
  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("export-json").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/gestor-export-.*\.json/);
  await expect(page.getByTestId("datos-message")).toContainText("Export descargado");
});
