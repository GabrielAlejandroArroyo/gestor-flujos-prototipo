const NODE_KINDS = {
  INICIO: "inicio",
  MANUAL: "manual",
  AUTOMATICA: "automatica",
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

export function validateFlow(flow) {
  const errors = [];
  const starts = flow.nodes.filter((n) => n.kind === NODE_KINDS.INICIO);
  const fins = flow.nodes.filter((n) => n.kind === NODE_KINDS.FIN);

  if (starts.length !== 1) errors.push("Debe existir exactamente un nodo Inicio.");
  if (fins.length < 1) errors.push("Debe existir al menos un nodo Fin.");

  const paramIds = new Set(flow.inputParams.map((p) => p.id));
  const reachable = reachableNodeIds(flow);

  for (const node of flow.nodes) {
    if (node.kind === NODE_KINDS.INICIO) continue;
    if (!reachable.has(node.id)) {
      errors.push(`El nodo "${node.name || node.id}" no es alcanzable desde el Inicio.`);
    }

    for (const pid of node.usedParamIds ?? []) {
      if (!paramIds.has(pid)) {
        errors.push(`"${node.name}" usa un parámetro de entrada inexistente.`);
      }
    }

    if (node.kind === NODE_KINDS.MANUAL) {
      if (transitionsFrom(flow, node.id, "aceptar").length === 0) {
        errors.push(`"${node.name}" debe tener transición de Aceptar.`);
      }
      if (transitionsFrom(flow, node.id, "rechazar").length === 0) {
        errors.push(`"${node.name}" debe tener transición de Rechazar.`);
      }
      const screen = flow.screens?.[node.id];
      if (!screen?.blocks?.length) {
        errors.push(`"${node.name}" debe tener una pantalla diseñada.`);
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
        errors.push(`"${node.name}" (automática) debe tener transición de continuación.`);
      }
    }
  }

  if (starts.length === 1) {
    const out = transitionsFrom(flow, starts[0].id, "siempre");
    if (out.length === 0) errors.push("El Inicio debe conectar con al menos una actividad.");
  }

  return { isValid: errors.length === 0, errors };
}

export function cloneFlowSnapshot(flow) {
  return JSON.parse(JSON.stringify(flow));
}

export { NODE_KINDS };
