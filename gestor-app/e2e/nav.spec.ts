import { expect, test } from "@playwright/test";
import { openApp } from "./helpers";

test("UC-NAV-MENU — Recorrer el menú de trabajo", async ({ page }) => {
  await openApp(page, "/");
  await expect(page.getByRole("heading", { name: "Catálogo de flujos" })).toBeVisible();

  await page.getByRole("link", { name: "Catálogo de actividades" }).click();
  await expect(page.getByRole("heading", { name: "Catálogo de actividades" })).toBeVisible();

  const items: Array<{ name: string; heading: string | RegExp }> = [
    { name: "Gestión de actividades", heading: /Instanciar flujo|Cargando motor/ },
    { name: "Maestros", heading: /Maestros y entidades|Tipos de flujo/ },
    { name: "Reporte", heading: /Reportes|Auditoría de maestros/ },
    { name: "Datos", heading: /Datos|Export \/ Import/ },
    { name: "Integración", heading: /Integración|Estado del servicio/ },
    { name: "Login", heading: "Iniciar sesión" },
    { name: "Casos de uso", heading: /Casos de uso/ },
  ];

  for (const item of items) {
    await page.getByRole("link", { name: item.name }).click();
    await expect(page.getByRole("heading", { name: item.heading }).first()).toBeVisible();
  }
});

test("UC-NAV-THEME — Alternar tema claro y oscuro", async ({ page }) => {
  await openApp(page, "/");
  const initial = await page.locator("html").getAttribute("data-theme");
  await page.getByRole("button", { name: "Alternar tema" }).click();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", initial ?? "");
  await page.getByRole("button", { name: "Alternar tema" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", initial ?? "dark");
});

test("UC-NAV-ACTIVIDADES — Abrir el catálogo de actividades", async ({ page }) => {
  await openApp(page, "/catalogo/actividades");
  await expect(page.getByRole("heading", { name: "Catálogo de actividades" })).toBeVisible();
  await expect(page.getByText(/reutilizar actividades/i)).toBeVisible();
});
