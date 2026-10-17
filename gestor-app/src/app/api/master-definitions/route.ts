import { createId } from "@/lib/ids";
import { appendMasterAudit, deleteMasterDefinition, listMasterDefinitions, saveMasterDefinition } from "@/lib/db/repository";
import { getSessionAppUser } from "@/lib/auth/session";
import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse> {
  try {
    const definitions = await listMasterDefinitions();
    return NextResponse.json({ definitions });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as {
      id?: string;
      name?: string;
      description?: string;
      entityIds?: string[];
    };
    const now = new Date().toISOString();
    const id = body.id ?? createId("masterDef");
    const row = await saveMasterDefinition({
      id,
      name: body.name?.trim() || "Maestro",
      description: body.description?.trim() || null,
      entity_ids: body.entityIds ?? [],
      created_at: now,
      updated_at: now,
    });
    const user = await getSessionAppUser();
    await appendMasterAudit({
      id: createId("masterAudit"),
      at: now,
      user_id: user?.id ?? null,
      user_label: user?.display_name ?? null,
      area: "masterDefinition",
      action: body.id ? "update" : "create",
      ref_id: id,
      label: row.name,
      detail: body.description ?? "",
      created_at: now,
    });
    return NextResponse.json({ definition: row }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request): Promise<NextResponse> {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });
    await deleteMasterDefinition(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
