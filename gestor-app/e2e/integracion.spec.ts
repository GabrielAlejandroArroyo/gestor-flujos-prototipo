import { expect, test } from "@playwright/test";

test("UC-INTEGRA-HEALTH — Ver el estado del servicio", async ({ page }) => {
  await page.goto("/integracion");
  await expect(page.getByRole("heading", { name: "Estado del servicio" })).toBeVisible();
  await expect(page.getByTestId("health-status")).toContainText(/ok|Health/i);
  await expect(page.getByText(/Supabase:/)).toBeVisible();
});

test("UC-INTEGRA-API — Consultar el contrato REST", async ({ page }) => {
  await page.goto("/integracion");
  await expect(page.getByRole("heading", { name: "API REST" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Motor" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Flujos", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ejemplo rápido (curl)" })).toBeVisible();
  await expect(page.getByText("/api/engine/start")).toBeVisible();
});
