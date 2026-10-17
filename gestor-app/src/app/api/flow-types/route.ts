import { createId } from "@/lib/ids";
import { deleteFlowType, listFlowTypes, saveFlowType } from "@/lib/db/repository";
import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse> {
  try {
    const flowTypes = await listFlowTypes();
    return NextResponse.json({ flowTypes });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as { name?: string; description?: string };
    const now = new Date().toISOString();
    const row = await saveFlowType({
      id: createId("flowType"),
      name: body.name?.trim() || "Tipo sin nombre",
      description: body.description?.trim() || null,
      created_at: now,
      updated_at: now,
    });
    return NextResponse.json({ flowType: row }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });
    await deleteFlowType(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
