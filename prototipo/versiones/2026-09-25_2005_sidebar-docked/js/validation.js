const NODE_KINDS = {
  INICIO: "inicio",
  MANUAL: "manual",
  AUTOMATICA: "automatica",
  GATEWAY: "gateway",
  FIN: "fin",
};

function getStartNode(flow) {
  return flow.nodes.find((n) => n.kind === NODE_KINDS.INICIO) ?? null;
}

function reachableNodeIds(flow) {
  const start = getStartNode(flow);
  if (!start) return new Set();

  const byFrom = new Map();
  for (const t of flow.transitions) {
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
  return flow.transitions.filter(
    (t) => t.fromId === nodeId && (condition === null || t.condition === condition),
  );
}

function transitionsTo(flow, nodeId) {
  return flow.transitions.filter((t) => t.toId === nodeId);
}

export function validateFlow(flow) {
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
      const outs = transitionsFrom(flow, node.id);
      const invalid = outs.filter((t) => t.condition !== "aceptar" && t.condition !== "rechazar");
      if (invalid.length) {
        errors.push(`Gateway "${node.name}": solo salidas «aceptar» y «rechazar».`);
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

export function cloneFlowSnapshot(flow) {
  return JSON.parse(JSON.stringify(flow));
}

export { NODE_KINDS };
