import { deleteFlow, getFlowById, saveFlow } from "@/lib/db/repository";
import type { MockFlowDefinition } from "@/lib/db/flow-mapper";
import { isFlowEditable } from "@/lib/flow-lifecycle";
import { NextResponse } from "next/server";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: RouteCtx): Promise<NextResponse> {
  try {
    const { id } = await ctx.params;
    const flow = await getFlowById(id);
    if (!flow) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json({ flow });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, ctx: RouteCtx): Promise<NextResponse> {
  try {
    const { id } = await ctx.params;
    const existing = (await getFlowById(id)) as MockFlowDefinition | null;
    if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    if (!isFlowEditable(existing)) {
      return NextResponse.json({ error: "El flujo no es editable en este estado." }, { status: 400 });
    }
    const patch = (await request.json()) as Partial<MockFlowDefinition>;
    const merged: MockFlowDefinition = { ...existing, ...patch, id: existing.id, status: existing.status };
    const saved = await saveFlow(merged);
    return NextResponse.json({ flow: saved });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, ctx: RouteCtx): Promise<NextResponse> {
  try {
    const { id } = await ctx.params;
    const existing = (await getFlowById(id)) as MockFlowDefinition | null;
    if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    if (existing.status === "listo") {
      return NextResponse.json({ error: "No se puede eliminar un flujo listo." }, { status: 400 });
    }
    await deleteFlow(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
