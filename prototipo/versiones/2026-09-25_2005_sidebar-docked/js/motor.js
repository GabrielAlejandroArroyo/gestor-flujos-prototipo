import { createId } from "./ids.js";
import { NODE_KINDS } from "./validation.js";

function findNode(snapshot, nodeId) {
  return snapshot.nodes.find((n) => n.id === nodeId) ?? null;
}

function nextNodeId(snapshot, fromId, condition) {
  const t = snapshot.transitions.find(
    (tr) => tr.fromId === fromId && tr.condition === condition,
  );
  return t?.toId ?? null;
}

function appendTrace(instance, entry) {
  instance.trace.push({
    id: createId("tr"),
    at: new Date().toISOString(),
    ...entry,
  });
}

function resolveStatusOnEnd(node) {
  if (node.kind !== NODE_KINDS.FIN) return "en_curso";
  const name = (node.name || "").toLowerCase();
  if (name.includes("rechaz") || name.includes("deneg")) return "cerrada_rechazo";
  return "completada";
}

function completeStep(instance, nodeId, status, comment = "") {
  instance.steps.push({
    nodeId,
    status,
    comment,
    at: new Date().toISOString(),
  });
}

function pickDataForNode(instance, node) {
  const out = {};
  const params = instance.flowSnapshot.inputParams ?? [];
  for (const pid of node.usedParamIds ?? []) {
    const p = params.find((x) => x.id === pid);
    if (p) out[p.key] = instance.inputValues[p.key];
  }
  return out;
}

function proceedFromNode(instance, nodeId, gatewayDecision = null) {
  let currentId = nodeId;

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
      completeStep(instance, currentId, "completada");
      appendTrace(instance, {
        type: "automatica",
        message: `Service Task ejecutada: ${node.name}`,
        nodeId: currentId,
        decision: "siempre",
      });
      currentId = nextNodeId(instance.flowSnapshot, currentId, "siempre");
      instance.currentNodeId = currentId;
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

export function createInstance(flowSnapshot, inputValues) {
  const start = flowSnapshot.nodes.find((n) => n.kind === NODE_KINDS.INICIO);
  if (!start) throw new Error("Flujo sin Start Event");

  const firstId = nextNodeId(flowSnapshot, start.id, "siempre");
  const now = new Date().toISOString();

  const instance = {
    id: createId("inst"),
    flowId: flowSnapshot.id,
    flowName: flowSnapshot.name,
    flowSnapshot,
    status: "en_curso",
    inputValues: { ...inputValues },
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

export function advanceAutomatic(instance) {
  return proceedFromNode(instance, instance.currentNodeId);
}

export function resolveManual(instance, decision, comment = "") {
  const nodeId = instance.currentNodeId;
  const node = findNode(instance.flowSnapshot, nodeId);
  if (!node || node.kind !== NODE_KINDS.MANUAL) {
    throw new Error("No hay User Task pendiente");
  }

  const status = decision === "aceptar" ? "aceptada" : "rechazada";
  completeStep(instance, nodeId, status, comment);

  appendTrace(instance, {
    type: "manual",
    message: `${node.name}: ${decision}`,
    nodeId,
    decision,
    comment,
    dataShown: pickDataForNode(instance, node),
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

export function getCurrentNode(instance) {
  if (!instance.currentNodeId) return null;
  return findNode(instance.flowSnapshot, instance.currentNodeId);
}

export function countProgress(instance) {
  const totalSteps = instance.flowSnapshot.nodes.filter(
    (n) => n.kind === NODE_KINDS.MANUAL || n.kind === NODE_KINDS.AUTOMATICA,
  ).length;
  const done = instance.steps.length;
  const pct = totalSteps === 0 ? 100 : Math.min(100, Math.round((done / totalSteps) * 100));
  return { done, totalSteps, pct };
}

export function statusLabel(status) {
  const map = {
    en_curso: "En curso",
    completada: "Completada",
    cerrada_rechazo: "Cerrada por rechazo",
  };
  return map[status] ?? status;
}
