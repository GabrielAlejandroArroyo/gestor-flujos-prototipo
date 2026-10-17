import { createId } from "@/lib/ids";
import { deleteEntity, listEntities, saveEntity } from "@/lib/db/repository";
import { appendMasterAudit } from "@/lib/db/repository";
import { getSessionAppUser } from "@/lib/auth/session";
import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse> {
  try {
    const entities = await listEntities();
    return NextResponse.json({ entities });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as Record<string, unknown> & { id?: string; name?: string };
    const id = body.id ?? createId("entity");
    const now = new Date().toISOString();
    const payload = { ...body, id, name: body.name ?? "Entidad" };
    const row = await saveEntity({
      id,
      payload,
      created_at: now,
      updated_at: now,
    });
    const user = await getSessionAppUser();
    await appendMasterAudit({
      id: createId("masterAudit"),
      at: now,
      user_id: user?.id ?? null,
      user_label: user?.display_name ?? null,
      area: "entity",
      action: body.id ? "update" : "create",
      ref_id: id,
      label: String(payload.name),
      detail: `${((payload as { attributes?: unknown[] }).attributes)?.length ?? 0} atributo(s)`,
      created_at: now,
    });
    return NextResponse.json({ entity: row }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request): Promise<NextResponse> {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });
    await deleteEntity(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
