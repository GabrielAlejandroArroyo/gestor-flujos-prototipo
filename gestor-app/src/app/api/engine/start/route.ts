import { getFlowById, saveInstance } from "@/lib/db/repository";
import { startInstance } from "@/lib/engine/core";
import { NextRequest, NextResponse } from "next/server";

interface StartBody {
  flowId?: string;
  inputValues?: Record<string, unknown>;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as StartBody;
    const flowId = body.flowId;
    if (!flowId) {
      return NextResponse.json({ error: "flowId es obligatorio" }, { status: 400 });
    }

    const flow = await getFlowById(flowId);
    if (!flow || flow.status !== "listo") {
      return NextResponse.json({ error: "Flujo no encontrado o no está listo" }, { status: 404 });
    }

    const instance = await startInstance(flow, body.inputValues ?? {});
    await saveInstance(instance);

    return NextResponse.json({ instance }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al iniciar instancia";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
