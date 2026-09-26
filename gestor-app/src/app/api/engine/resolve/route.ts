import { getInstance, saveInstance } from "@/lib/db/repository";
import {
  advanceAutomatic,
  getCurrentNode,
  resolveAIHITL,
  resolveManual,
} from "@/lib/engine/core";
import { NODE_KINDS } from "@/lib/engine/flow-types";
import { NextRequest, NextResponse } from "next/server";

interface ResolveBody {
  instanceId?: string;
  kind?: "manual" | "automatica" | "agente_ia";
  decision?: "aceptar" | "rechazar";
  comment?: string;
  formValues?: Record<string, unknown>;
  resolutionData?: Record<string, unknown>;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as ResolveBody;
    const instanceId = body.instanceId;
    if (!instanceId) {
      return NextResponse.json({ error: "instanceId es obligatorio" }, { status: 400 });
    }

    const existing = await getInstance(instanceId);
    if (!existing) {
      return NextResponse.json({ error: "Instancia no encontrada" }, { status: 404 });
    }
    if (existing.status !== "en_curso") {
      return NextResponse.json({ error: "La instancia ya finalizó" }, { status: 409 });
    }

    const current = getCurrentNode(existing);
    if (!current) {
      return NextResponse.json({ error: "No hay nodo pendiente" }, { status: 409 });
    }

    let updated = existing;

    if (body.kind === "automatica" || current.kind === NODE_KINDS.AUTOMATICA) {
      updated = await advanceAutomatic(existing);
    } else if (body.kind === "agente_ia" || current.kind === NODE_KINDS.AGENTE_IA) {
      updated = await resolveAIHITL(existing, body.resolutionData ?? { status: "approved" });
    } else if (body.kind === "manual" || current.kind === NODE_KINDS.MANUAL) {
      const decision = body.decision;
      if (decision !== "aceptar" && decision !== "rechazar") {
        return NextResponse.json({ error: "decision debe ser aceptar o rechazar" }, { status: 400 });
      }
      updated = await resolveManual(
        existing,
        decision,
        body.comment ?? "",
        body.formValues ?? {},
      );
    } else {
      return NextResponse.json(
        { error: `Tipo de nodo no resoluble: ${current.kind}` },
        { status: 400 },
      );
    }

    await saveInstance(updated);
    return NextResponse.json({ instance: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al resolver tarea";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
