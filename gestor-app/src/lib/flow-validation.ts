import { NODE_KINDS, type FlowDefinition, type FlowNode } from "@/lib/engine/flow-types";
import type { MockFlowDefinition } from "@/lib/db/flow-mapper";

function sequenceTransitions(flow: FlowDefinition) {
  return (flow.transitions ?? []).filter((t) => (t.lineType ?? "sequence") === "sequence");
}

function transitionsFrom(flow: FlowDefinition, nodeId: string, condition?: string) {
  return sequenceTransitions(flow).filter(
    (t) => t.fromId === nodeId && (condition == null || t.condition === condition),
  );
}

function transitionsTo(flow: FlowDefinition, nodeId: string) {
  return sequenceTransitions(flow).filter((t) => t.toId === nodeId);
}

function reachableNodeIds(flow: FlowDefinition): Set<string> {
  const start = flow.nodes.find((n) => n.kind === NODE_KINDS.INICIO);
  const reachable = new Set<string>();
  if (!start) return reachable;
  const queue = [start.id];
  while (queue.length) {
    const id = queue.shift()!;
    if (reachable.has(id)) continue;
    reachable.add(id);
    for (const t of transitionsFrom(flow, id)) queue.push(t.toId);
  }
  return reachable;
}

function validateActivitySequenceOut(
  flow: FlowDefinition,
  node: FlowNode,
  label: string,
  errors: string[],
): void {
  if (transitionsFrom(flow, node.id, "siempre").length === 0) {
    errors.push(`${label} "${node.name}" debe tener Sequence Flow de salida «siempre».`);
  }
}

/**
 * Validación BPMN (subset del mock; sin geometría de pool).
 */
export function validateFlow(flow: MockFlowDefinition): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const nodes = flow.nodes ?? [];
  const starts = nodes.filter((n) => n.kind === NODE_KINDS.INICIO);
  const fins = nodes.filter((n) => n.kind === NODE_KINDS.FIN);

  if (starts.length !== 1) {
    errors.push("Debe existir exactamente un Evento de inicio (Start Event).");
  }
  if (fins.length < 1) {
    errors.push("Debe existir al menos un Evento de fin (End Event).");
  }

  const paramIds = new Set((flow.inputParams ?? []).map((p) => p.id));
  const reachable = reachableNodeIds(flow);

  for (const node of nodes) {
    if (node.kind !== NODE_KINDS.INICIO && !reachable.has(node.id)) {
      errors.push(`"${node.name || node.id}" no es alcanzable desde el Start Event.`);
    }

    for (const pid of node.usedParamIds ?? []) {
      if (!paramIds.has(pid)) {
        errors.push(`"${node.name}" usa un parámetro de entrada inexistente.`);
      }
    }

    if (node.kind === NODE_KINDS.INICIO) {
      if (transitionsFrom(flow, node.id, "siempre").length === 0) {
        errors.push("El Start Event debe tener un Sequence Flow de salida.");
      }
    }

    if (node.kind === NODE_KINDS.MANUAL) {
      validateActivitySequenceOut(flow, node, "User Task", errors);
      const screen = flow.screens?.[node.id];
      if (!screen?.blocks?.length) {
        errors.push(`User Task "${node.name}" debe tener una pantalla diseñada.`);
      }
    }

    if (node.kind === NODE_KINDS.AUTOMATICA) {
      validateActivitySequenceOut(flow, node, "Service Task", errors);
    }

    if (node.kind === NODE_KINDS.GATEWAY) {
      if (transitionsTo(flow, node.id).length < 1) {
        errors.push(`Exclusive Gateway "${node.name}" debe tener al menos una entrada.`);
      }
      if (transitionsFrom(flow, node.id, "aceptar").length !== 1) {
        errors.push(`Gateway "${node.name}": falta Sequence Flow «aceptar».`);
      }
      if (transitionsFrom(flow, node.id, "rechazar").length !== 1) {
        errors.push(`Gateway "${node.name}": falta Sequence Flow «rechazar».`);
      }
    }

    if (node.kind === NODE_KINDS.FIN) {
      if (transitionsFrom(flow, node.id).length > 0) {
        errors.push(`End Event "${node.name}" no debe tener salidas.`);
      }
    }
  }

  return { isValid: errors.length === 0, errors };
}

export function cloneFlowSnapshot<T>(flow: T): T {
  return JSON.parse(JSON.stringify(flow)) as T;
}
