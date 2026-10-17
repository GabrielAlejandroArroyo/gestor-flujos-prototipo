import { expect, test } from "@playwright/test";

test("UC-API-HEALTH — Probe HTTP de health", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBeTruthy();
  const json = (await res.json()) as { status?: string; service?: string };
  expect(json.status).toBe("ok");
  expect(json.service).toBe("gestor-app");
});

test("UC-API-FLOWS — Listar flujos por API", async ({ request }) => {
  const res = await request.get("/api/flows");
  expect(res.ok()).toBeTruthy();
  const json = (await res.json()) as { flows?: unknown[] };
  expect(Array.isArray(json.flows)).toBe(true);
  expect((json.flows ?? []).length).toBeGreaterThan(0);
});
