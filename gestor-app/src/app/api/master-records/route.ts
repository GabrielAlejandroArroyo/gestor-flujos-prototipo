import { createId } from "@/lib/ids";
import {
  appendMasterAudit,
  deleteMasterRecord,
  listMasterDefinitions,
  listMasterRecords,
  saveMasterRecord,
} from "@/lib/db/repository";
import { getSessionAppUser } from "@/lib/auth/session";
import { NextResponse } from "next/server";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const definitionId = new URL(request.url).searchParams.get("definitionId") ?? undefined;
    const records = await listMasterRecords(definitionId);
    return NextResponse.json({ records });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as {
      id?: string;
      definitionId: string;
      values: Record<string, unknown>;
    };
    const now = new Date().toISOString();
    const id = body.id ?? createId("masterRecord");
    const defs = await listMasterDefinitions();
    const def = defs.find((d) => d.id === body.definitionId);
    const row = await saveMasterRecord({
      id,
      definition_id: body.definitionId,
      lineage_id: id,
      status: "vigente",
      version: 1,
      values: body.values ?? {},
      history: [],
      created_at: now,
      updated_at: now,
    });
    const user = await getSessionAppUser();
    await appendMasterAudit({
      id: createId("masterAudit"),
      at: now,
      user_id: user?.id ?? null,
      user_label: user?.display_name ?? null,
      area: "masterRecord",
      action: body.id ? "update" : "create",
      ref_id: id,
      label: def?.name ?? "Maestro",
      detail: "v1",
      created_at: now,
    });
    return NextResponse.json({ record: row }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request): Promise<NextResponse> {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });
    await deleteMasterRecord(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
