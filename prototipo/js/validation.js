import { isFlowEventInsidePool } from "./pool-geometry.js";
import { normalizeFlowContracts, validateFlowContracts } from "./contracts.js";
import { validateNodeIntegration } from "./integrations.js";

const NODE_KINDS = {
  INICIO: "inicio",
  MANUAL: "manual",
  AUTOMATICA: "automatica",
  AGENTE_IA: "agente_ia",
  GATEWAY: "gateway",
  FIN: "fin",
};

const LINE_TYPES = {
  SEQUENCE: "sequence",
  MESSAGE: "message",
  ASSOCIATION: "association",
};

const GATEWAY_TYPES = {
  PARALLEL: "parallel",
  EXCLUSIVE: "exclusive",
  INCLUSIVE: "inclusive",
  EVENT_BASED: "eventBased",
  EVENT_BASED_EXCLUSIVE: "eventBasedExclusive",
  EVENT_BASED_PARALLEL: "eventBasedParallel",
  COMPLEX: "complex",
};

const DEFAULT_GATEWAY_TYPE = GATEWAY_TYPES.EXCLUSIVE;

/** @type {{ id: string; label: string; enabled: boolean }[]} */
const GATEWAY_TYPE_CATALOG = [
  { id: GATEWAY_TYPES.PARALLEL, label: "Compuerta Paralela", enabled: false },
  { id: GATEWAY_TYPES.EXCLUSIVE, label: "Compuerta Exclusiva", enabled: true },
  { id: GATEWAY_TYPES.INCLUSIVE, label: "Compuerta Inclusiva", enabled: false },
  { id: GATEWAY_TYPES.EVENT_BASED, label: "Compuerta Basada en Eventos", enabled: false },
  { id: GATEWAY_TYPES.EVENT_BASED_EXCLUSIVE, label: "Compuerta Exclusiva Basada en Eventos", enabled: false },
  { id: GATEWAY_TYPES.EVENT_BASED_PARALLEL, label: "Compuerta Paralela Basada en Eventos", enabled: false },
  { id: GATEWAY_TYPES.COMPLEX, label: "Compuerta Compleja", enabled: false },
];

/**
 * Normaliza gatewayType en nodos gateway (datos legacy).
 *
 * @param {object} node - Nodo del flujo
 */
export function ensureGatewayNode(node) {
  if (node?.kind !== NODE_KINDS.GATEWAY) return;
  if (!node.gatewayType) node.gatewayType = DEFAULT_GATEWAY_TYPE;
}

/**
 * @param {object} flow - Flujo BPMN
 */
export function normalizeFlowNodes(flow) {
  if (!flow?.nodes) return;
  normalizeFlowContracts(flow);
  for (const node of flow.nodes) ensureGatewayNode(node);
}

function isSequenceTransition(t) {
  const lineType = t.lineType ?? LINE_TYPES.SEQUENCE;
  return lineType === LINE_TYPES.SEQUENCE;
}

function sequenceTransitions(flow) {
  return (flow.transitions ?? []).filter(isSequenceTransition);
}

export function normalizeFlowTransitions(flow) {
  if (!flow?.transitions) return;
  for (const t of flow.transitions) {
    if (!t.lineType) t.lineType = LINE_TYPES.SEQUENCE;
    if (t.lineType !== LINE_TYPES.SEQUENCE) t.condition = null;
  }
}

function getStartNode(flow) {
  return flow.nodes.find((n) => n.kind === NODE_KINDS.INICIO) ?? null;
}

function reachableNodeIds(flow) {
  const start = getStartNode(flow);
  if (!start) return new Set();

  const byFrom = new Map();
  for (const t of sequenceTransitions(flow)) {
    if (!byFrom.has(t.fromId)) byFrom.set(t.fromId, []);
    byFrom.get(t.fromId).push(t.toId);
  }

  const seen = new Set();
  const queue = [start.id];
  while (queue.length) {
    const id = queue.shift();
    if (seen.has(id)) continue;
    seen.add(id);
    for (const next of byFrom.get(id) ?? []) queue.push(next);
  }
  return seen;
}

function transitionsFrom(flow, nodeId, condition = null) {
  return sequenceTransitions(flow).filter(
    (t) => t.fromId === nodeId && (condition === null || t.condition === condition),
  );
}

function transitionsTo(flow, nodeId) {
  return sequenceTransitions(flow).filter((t) => t.toId === nodeId);
}

export function validateFlow(flow) {
  normalizeFlowNodes(flow);
  const errors = [];
  const starts = flow.nodes.filter((n) => n.kind === NODE_KINDS.INICIO);
  const fins = flow.nodes.filter((n) => n.kind === NODE_KINDS.FIN);

  if (starts.length !== 1) {
    errors.push("Debe existir exactamente un Evento de inicio (Start Event).");
  }
  if (fins.length < 1) {
    errors.push("Debe existir al menos un Evento de fin (End Event).");
  }

  const paramIds = new Set(flow.inputParams.map((p) => p.id));
  const reachable = reachableNodeIds(flow);

  for (const node of flow.nodes) {
    if (node.kind !== NODE_KINDS.INICIO && !reachable.has(node.id)) {
      errors.push(`"${node.name || node.id}" no es alcanzable desde el Start Event.`);
    }

    for (const pid of node.usedParamIds ?? []) {
      if (!paramIds.has(pid)) {
        errors.push(`"${node.name}" usa un parámetro de entrada inexistente.`);
      }
    }

    if (node.kind === NODE_KINDS.INICIO) {
      if (!isFlowEventInsidePool(flow, node)) {
        const laneName = flow.lanes?.find((l) => l.id === node.laneId)?.name ?? "pool";
        errors.push(`Start Event "${node.name}" debe estar dentro del pool (lane ${laneName}).`);
      }
      if (transitionsFrom(flow, node.id, "siempre").length === 0) {
        errors.push("El Start Event debe tener un Sequence Flow de salida.");
      }
      const bad = transitionsFrom(flow, node.id).filter((t) => t.condition !== "siempre");
      if (bad.length) errors.push("Desde el Start Event solo salen Sequence Flow «siempre».");
    }

    if (node.kind === NODE_KINDS.MANUAL) {
      const outs = transitionsFrom(flow, node.id);
      const siempre = transitionsFrom(flow, node.id, "siempre");
      if (siempre.length !== 1) {
        errors.push(`User Task "${node.name}": debe tener exactamente una salida «siempre» hacia el gateway.`);
      }
      const bad = outs.filter((t) => t.condition !== "siempre");
      if (bad.length) {
        errors.push(`User Task "${node.name}": Aceptar/Rechazar se modelan en el Exclusive Gateway, no aquí.`);
      }
      if (siempre.length === 1) {
        const target = flow.nodes.find((n) => n.id === siempre[0].toId);
        if (target?.kind !== NODE_KINDS.GATEWAY) {
          errors.push(`User Task "${node.name}": la salida «siempre» debe ir a un Exclusive Gateway.`);
        }
      }
      const screen = flow.screens?.[node.id];
      if (!screen?.blocks?.length) {
        errors.push(`User Task "${node.name}" debe tener una pantalla diseñada.`);
      } else {
        for (const block of screen.blocks) {
          if (block.type === "dato" && block.paramId && !paramIds.has(block.paramId)) {
            errors.push(`Pantalla de "${node.name}": dato de entrada inválido.`);
          }
          if (block.type === "dato" && block.paramId && !(node.usedParamIds ?? []).includes(block.paramId)) {
            errors.push(`Pantalla de "${node.name}": el dato mostrado debe estar en "datos que usa".`);
          }
        }
      }
    }

    if (node.kind === NODE_KINDS.AUTOMATICA) {
      if (transitionsFrom(flow, node.id, "siempre").length === 0) {
        errors.push(`Service Task "${node.name}" debe tener Sequence Flow de continuación.`);
      }
    }

    if (node.kind === NODE_KINDS.AGENTE_IA) {
      if (transitionsFrom(flow, node.id, "siempre").length === 0) {
        errors.push(`Agente IA "${node.name}" debe tener Sequence Flow de continuación.`);
      }
      if (!node.aiPrompt || !node.aiPrompt.trim()) {
        errors.push(`Agente IA "${node.name}" debe tener un prompt configurado.`);
      }
    }

    if (node.kind === NODE_KINDS.GATEWAY) {
      const gwType = node.gatewayType ?? DEFAULT_GATEWAY_TYPE;
      if (gwType !== GATEWAY_TYPES.EXCLUSIVE) {
        errors.push(
          `Gateway "${node.name}": tipo «${gwType}» no soportado en el mock (solo Compuerta Exclusiva).`,
        );
      }
      if (transitionsTo(flow, node.id).length < 1) {
        errors.push(`Exclusive Gateway "${node.name}" debe tener al menos una entrada.`);
      }
      if (transitionsFrom(flow, node.id, "aceptar").length !== 1) {
        errors.push(`Gateway "${node.name}": falta Sequence Flow «aceptar».`);
      }
      if (transitionsFrom(flow, node.id, "rechazar").length !== 1) {
        errors.push(`Gateway "${node.name}": falta Sequence Flow «rechazar».`);
      }
      const outs = transitionsFrom(flow, node.id);
      const invalid = outs.filter((t) => t.condition !== "aceptar" && t.condition !== "rechazar");
      if (invalid.length) {
        errors.push(`Gateway "${node.name}": solo salidas «aceptar» y «rechazar».`);
      }
    }

    if (node.kind === NODE_KINDS.FIN) {
      if (!isFlowEventInsidePool(flow, node)) {
        const laneName = flow.lanes?.find((l) => l.id === node.laneId)?.name ?? "pool";
        errors.push(`End Event "${node.name}" debe estar dentro del pool (lane ${laneName}).`);
      }
      if (transitionsFrom(flow, node.id).length > 0) {
        errors.push(`End Event "${node.name}" no debe tener salidas.`);
      }
    }
  }

  errors.push(...validateFlowContracts(flow));
  for (const node of flow.nodes ?? []) {
    errors.push(...validateNodeIntegration(node));
  }

  return { isValid: errors.length === 0, errors };
}

export function cloneFlowSnapshot(flow) {
  return JSON.parse(JSON.stringify(flow));
}

export {
  NODE_KINDS,
  LINE_TYPES,
  isSequenceTransition,
  GATEWAY_TYPES,
  GATEWAY_TYPE_CATALOG,
  DEFAULT_GATEWAY_TYPE,
};
