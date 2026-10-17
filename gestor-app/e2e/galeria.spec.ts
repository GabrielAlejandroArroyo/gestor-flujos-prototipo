import { expect, test } from "@playwright/test";
import { USE_CASES } from "../src/lib/e2e/use-cases";

test("UC-E2E-GALERIA — Abrir la galería de casos de uso", async ({ page }) => {
  await page.goto("/e2e");
  await expect(page.getByRole("heading", { name: /Casos de uso/ })).toBeVisible();
  await expect(page.getByTestId("e2e-count")).toContainText(String(USE_CASES.length));
  await expect(page.getByTestId(`uc-card-${USE_CASES[0].id}`)).toBeVisible();
  await expect(page.getByText(USE_CASES[0].perspective)).toBeVisible();
});
