import { activateFlow } from "@/lib/db/repository";
import { NextResponse } from "next/server";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, ctx: RouteCtx): Promise<NextResponse> {
  try {
    const { id } = await ctx.params;
    const result = await activateFlow(id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? "No se pudo activar" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
