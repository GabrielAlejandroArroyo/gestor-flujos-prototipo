import { expect, test as setup } from "@playwright/test";

setup("preparar dataset testing en memoria", async ({ request }) => {
  const res = await request.post("/api/data/import", {
    data: { useTestingBootstrap: true },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  const json = (await res.json()) as { ok?: boolean; counts?: { flows?: number } };
  expect(json.ok).toBe(true);
  expect(json.counts?.flows ?? 0).toBeGreaterThan(0);
});
