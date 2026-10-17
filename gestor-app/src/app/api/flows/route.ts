import { listFlows, listReadyFlows, saveFlow } from "@/lib/db/repository";
import type { MockFlowDefinition } from "@/lib/db/flow-mapper";
import { createId } from "@/lib/ids";
import { NextResponse } from "next/server";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const readyOnly = searchParams.get("readyOnly") === "1" || searchParams.get("ready") === "1";
    if (readyOnly && !searchParams.get("status") && !searchParams.get("q")) {
      const flows = await listReadyFlows();
      return NextResponse.json({ flows });
    }
    const flows = await listFlows({
      status: searchParams.get("status") ?? undefined,
      q: searchParams.get("q") ?? undefined,
      flowTypeId: searchParams.get("flowTypeId") ?? undefined,
      readyOnly,
    });
    return NextResponse.json({ flows });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al listar flujos";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as Partial<MockFlowDefinition>;
    const id = body.id ?? createId("flow");
    const flow: MockFlowDefinition = {
      id,
      name: body.name ?? "Nuevo flujo",
      type: body.type ?? "General",
      description: body.description,
      status: "borrador",
      inputParams: body.inputParams ?? [],
      nodes: body.nodes ?? [],
      transitions: body.transitions ?? [],
      screens: body.screens ?? {},
      lineageId: id,
      version: null,
      supersedesFlowId: null,
      flowTypeId: body.flowTypeId ?? null,
    };
    const saved = await saveFlow(flow);
    return NextResponse.json({ flow: saved }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al crear flujo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
