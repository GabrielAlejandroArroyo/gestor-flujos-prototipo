import {
  NODE_KINDS,
  type FlowDefinition,
  type FlowInstance,
  type FlowNode,
  type TraceEntry,
} from "./flow-types";

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function isSequenceTransition(t: { lineType?: string }): boolean {
  const lineType = t.lineType ?? "sequence";
  return lineType === "sequence";
}

function findNode(snapshot: FlowDefinition, nodeId: string): FlowNode | null {
  return snapshot.nodes.find((n) => n.id === nodeId) ?? null;
}

function nextNodeId(snapshot: FlowDefinition, fromId: string, condition: string): string | null {
  const t = snapshot.transitions.find(
    (tr) =>
      tr.fromId === fromId &&
      tr.condition === condition &&
      isSequenceTransition(tr),
  );
  return t?.toId ?? null;
}

function appendTrace(instance: FlowInstance, entry: Omit<TraceEntry, "id" | "at">): void {
  instance.trace.push({
    id: createId("tr"),
    at: new Date().toISOString(),
    ...entry,
  });
}

function resolveStatusOnEnd(node: FlowNode): FlowInstance["status"] {
  if (node.kind !== NODE_KINDS.FIN) return "en_curso";
  const name = (node.name || "").toLowerCase();
  if (name.includes("rechaz") || name.includes("deneg")) return "cerrada_rechazo";
  return "completada";
}

function completeStep(
  instance: FlowInstance,
  nodeId: string,
  status: string,
  comment = "",
): void {
  instance.steps.push({
    nodeId,
    status,
    comment,
    at: new Date().toISOString(),
  });
}

const ACTIVITY_KINDS = new Set<string>([
  NODE_KINDS.MANUAL,
  NODE_KINDS.AUTOMATICA,
  NODE_KINDS.AGENTE_IA,
  NODE_KINDS.GATEWAY,
]);

/**
 * Regla de diseño: Start al inicio, actividades en el medio, End Event solo al final de cada camino.
 */
export function validateFlowStructure(flow: FlowDefinition): string[] {
  const errors: string[] = [];
  const starts = flow.nodes.filter((n) => n.kind === NODE_KINDS.INICIO);
  const fins = flow.nodes.filter((n) => n.kind === NODE_KINDS.FIN);

  if (starts.length !== 1) {
    errors.push("Debe existir exactamente un Start Event.");
  }
  if (fins.length < 1) {
    errors.push("Debe existir al menos un End Event al final de cada camino.");
  }

  for (const fin of fins) {
    const outs = flow.transitions.filter((t) => t.fromId === fin.id && isSequenceTransition(t));
    if (outs.length > 0) {
      errors.push(`End Event "${fin.name}" no puede tener salidas; va siempre al final.`);
    }
  }

  const start = starts[0];
  if (start) {
    const firstId = nextNodeId(flow, start.id, "siempre");
    const firstNode = firstId ? findNode(flow, firstId) : null;
    if (firstNode?.kind === NODE_KINDS.FIN) {
      errors.push("Entre Start y End Event debe haber al menos una actividad intermedia.");
    }
    if (firstNode && !ACTIVITY_KINDS.has(firstNode.kind) && firstNode.kind !== NODE_KINDS.INICIO) {
      errors.push("Tras el Start Event deben seguir actividades (tasks, gateway o agente IA).");
    }
  }

  return errors;
}

async function runAutomaticNode(instance: FlowInstance, node: FlowNode): Promise<string | null> {
  appendTrace(instance, {
    type: "integration_request",
    message: `Service Task: ${node.name}`,
    nodeId: node.id,
  });

  const mock = node.integration?.mockResponse ?? { ok: true };
  const ok = true;

  appendTrace(instance, {
    type: ok ? "integration_response" : "error",
    message: ok ? "Integración OK (mock)" : "Integración falló",
    nodeId: node.id,
    dataShown: mock as Record<string, unknown>,
  });

  if (!ok && node.integration?.onError === "fail_instance") {
    instance.status = "cerrada_rechazo";
    instance.finishedAt = new Date().toISOString();
    instance.currentNodeId = null;
    return null;
  }

  Object.assign(instance.context, mock);
  completeStep(instance, node.id, "completada");
  appendTrace(instance, {
    type: "automatica",
    message: `Service Task ejecutada: ${node.name}`,
    nodeId: node.id,
    decision: "siempre",
  });
  return nextNodeId(instance.flowSnapshot, node.id, "siempre");
}

async function proceedFromNode(
  instance: FlowInstance,
  nodeId: string,
  gatewayDecision: string | null = null,
): Promise<FlowInstance> {
  let currentId: string | null = nodeId;

  while (currentId) {
    const node = findNode(instance.flowSnapshot, currentId);
    if (!node) break;

    if (node.kind === NODE_KINDS.MANUAL) {
      instance.currentNodeId = currentId;
      appendTrace(instance, {
        type: "pendiente",
        message: `User Task pendiente: ${node.name}`,
        nodeId: currentId,
      });
      return instance;
    }

    if (node.kind === NODE_KINDS.AGENTE_IA) {
      instance.currentNodeId = currentId;
      instance.aiHitlStatus = "waiting";
      instance.aiHitlSentAt = new Date().toISOString();
      instance.aiHitlReminders = 0;
      appendTrace(instance, {
        type: "pendiente",
        message: `Agente IA pendiente (HITL): ${node.name}`,
        nodeId: currentId,
      });
      return instance;
    }

    if (node.kind === NODE_KINDS.GATEWAY) {
      if (!gatewayDecision) {
        instance.currentNodeId = currentId;
        appendTrace(instance, {
          type: "error",
          message: `Gateway "${node.name}" requiere decisión Aceptar/Rechazar.`,
          nodeId: currentId,
        });
        return instance;
      }
      appendTrace(instance, {
        type: "gateway",
        message: `Exclusive Gateway: ${gatewayDecision}`,
        nodeId: currentId,
        decision: gatewayDecision,
      });
      currentId = nextNodeId(instance.flowSnapshot, currentId, gatewayDecision);
      gatewayDecision = null;
      instance.currentNodeId = currentId;
      continue;
    }

    if (node.kind === NODE_KINDS.FIN) {
      completeStep(instance, currentId, "completada");
      instance.status = resolveStatusOnEnd(node);
      instance.finishedAt = new Date().toISOString();
      instance.currentNodeId = null;
      appendTrace(instance, {
        type: "fin",
        message: `End Event: ${node.name}`,
        nodeId: currentId,
      });
      return instance;
    }

    if (node.kind === NODE_KINDS.AUTOMATICA) {
      currentId = await runAutomaticNode(instance, node);
      instance.currentNodeId = currentId;
      if (!currentId) return instance;
      continue;
    }

    if (node.kind === NODE_KINDS.INICIO) {
      currentId = nextNodeId(instance.flowSnapshot, currentId, "siempre");
      instance.currentNodeId = currentId;
      continue;
    }

    break;
  }

  return instance;
}

export async function startInstance(
  flowSnapshot: FlowDefinition,
  inputValues: Record<string, unknown>,
): Promise<FlowInstance> {
  const structureErrors = validateFlowStructure(flowSnapshot);
  if (structureErrors.length > 0) {
    throw new Error(structureErrors[0]);
  }

  const start = flowSnapshot.nodes.find((n) => n.kind === NODE_KINDS.INICIO);
  if (!start) throw new Error("Flujo sin Start Event");

  const firstId = nextNodeId(flowSnapshot, start.id, "siempre");
  const now = new Date().toISOString();

  const instance: FlowInstance = {
    id: createId("inst"),
    flowId: flowSnapshot.id,
    flowName: flowSnapshot.name,
    flowSnapshot: structuredClone(flowSnapshot),
    status: "en_curso",
    inputValues: { ...inputValues },
    context: {},
    currentNodeId: firstId,
    startedAt: now,
    finishedAt: null,
    trace: [],
    steps: [],
  };

  appendTrace(instance, {
    type: "inicio",
    message: `Instancia iniciada — flujo "${flowSnapshot.name}"`,
    nodeId: start.id,
    dataShown: { ...inputValues },
  });

  if (!firstId) {
    instance.status = "completada";
    instance.finishedAt = now;
    appendTrace(instance, {
      type: "fin",
      message: "Flujo sin actividades posteriores al Start Event.",
      nodeId: start.id,
    });
    return instance;
  }

  return proceedFromNode(instance, firstId);
}

export async function advanceAutomatic(instance: FlowInstance): Promise<FlowInstance> {
  if (!instance.currentNodeId) return instance;
  return proceedFromNode(instance, instance.currentNodeId);
}

export async function resolveManual(
  instance: FlowInstance,
  decision: "aceptar" | "rechazar",
  comment = "",
  formValues: Record<string, unknown> = {},
): Promise<FlowInstance> {
  const nodeId = instance.currentNodeId;
  if (!nodeId) throw new Error("No hay tarea pendiente");

  const node = findNode(instance.flowSnapshot, nodeId);
  if (!node || node.kind !== NODE_KINDS.MANUAL) {
    throw new Error("No hay User Task pendiente");
  }

  const status = decision === "aceptar" ? "aceptada" : "rechazada";
  completeStep(instance, nodeId, status, comment);
  Object.assign(instance.context, formValues, { comment });

  appendTrace(instance, {
    type: "manual",
    message: `${node.name}: ${decision}`,
    nodeId,
    decision,
    dataShown: { comment, ...formValues },
  });

  const nextId = nextNodeId(instance.flowSnapshot, nodeId, "siempre");
  if (!nextId) {
    instance.status = decision === "rechazar" ? "cerrada_rechazo" : "completada";
    instance.finishedAt = new Date().toISOString();
    instance.currentNodeId = null;
    return instance;
  }

  instance.currentNodeId = nextId;
  return proceedFromNode(instance, nextId, decision);
}

export async function resolveAIHITL(
  instance: FlowInstance,
  resolutionData: Record<string, unknown>,
): Promise<FlowInstance> {
  const nodeId = instance.currentNodeId;
  if (!nodeId) throw new Error("No hay tarea pendiente");

  const node = findNode(instance.flowSnapshot, nodeId);
  if (!node || node.kind !== NODE_KINDS.AGENTE_IA) {
    throw new Error("No hay Agente IA esperando respuesta");
  }

  instance.aiHitlStatus = "resolved";
  completeStep(instance, nodeId, "completada", "Resuelto por IA/HITL");
  appendTrace(instance, {
    type: "automatica",
    message: `Agente IA resuelto: ${node.name}`,
    nodeId,
    dataShown: resolutionData,
  });

  const nextId = nextNodeId(instance.flowSnapshot, nodeId, "siempre");
  if (!nextId) {
    instance.status = "completada";
    instance.finishedAt = new Date().toISOString();
    instance.currentNodeId = null;
    return instance;
  }

  instance.currentNodeId = nextId;
  return proceedFromNode(instance, nextId);
}

export function getCurrentNode(instance: FlowInstance): FlowNode | null {
  if (!instance.currentNodeId) return null;
  return findNode(instance.flowSnapshot, instance.currentNodeId);
}

export function statusLabel(status: FlowInstance["status"]): string {
  const map: Record<FlowInstance["status"], string> = {
    en_curso: "En curso",
    completada: "Completada",
    cerrada_rechazo: "Cerrada por rechazo",
  };
  return map[status] ?? status;
}
