import { readFile } from "node:fs/promises";
import path from "node:path";
import { importAppState } from "@/lib/db/import-state";
import { parseBootstrapToAppState, type BootstrapFile } from "@/lib/mock/bootstrap";
import { NextResponse } from "next/server";

async function loadTestingBootstrap(): Promise<BootstrapFile> {
  const filePath = path.join(
    process.cwd(),
    "..",
    "prototipo",
    "data",
    "environments",
    "testing-bootstrap.json",
  );
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as BootstrapFile;
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    let bootstrap: BootstrapFile;
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = (await request.json()) as BootstrapFile | { useTestingBootstrap?: boolean };
      if ("useTestingBootstrap" in body && body.useTestingBootstrap) {
        bootstrap = await loadTestingBootstrap();
      } else if ("entries" in body) {
        bootstrap = body;
      } else {
        bootstrap = await loadTestingBootstrap();
      }
    } else {
      bootstrap = await loadTestingBootstrap();
    }
    const state = parseBootstrapToAppState(bootstrap);
    await importAppState(state);
    return NextResponse.json({
      ok: true,
      counts: {
        flows: state.flows.length,
        instances: state.instances.length,
        flowTypes: state.flowTypes.length,
        entities: state.entities.length,
        masterDefinitions: state.masterDefinitions.length,
        masterRecords: state.masterRecords.length,
        masterAudit: state.masterAudit.length,
        appUsers: state.appUsers.length,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al importar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
