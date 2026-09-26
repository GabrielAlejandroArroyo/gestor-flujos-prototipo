import { createId } from "./ids.js";

export function createSampleFlow() {
  const flowId = createId("flow");
  const pTitulo = createId("param");
  const pMonto = createId("param");
  const nInicio = createId("node");
  const nManual = createId("node");
  const nGateway = createId("node");
  const nAuto = createId("node");
  const nFinOk = createId("node");
  const nFinRech = createId("node");

  return {
    id: flowId,
    type: "Aprobación",
    name: "Aprobación de gasto",
    description: "Ejemplo BPMN: Start → User Task → XOR Gateway → Service Task / End.",
    status: "listo",
    version: 1,
    notation: "bpmn",
    inputParams: [
      { id: pTitulo, key: "titulo", label: "Título del gasto", type: "texto", required: true },
      { id: pMonto, key: "monto", label: "Monto", type: "numero", required: true },
    ],
    nodes: [
      { id: nInicio, kind: "inicio", name: "Start", description: "", x: 60, y: 200, usedParamIds: [] },
      {
        id: nManual,
        kind: "manual",
        name: "Revisión del supervisor",
        description: "User Task — validar monto y concepto",
        x: 200,
        y: 180,
        usedParamIds: [pTitulo, pMonto],
      },
      {
        id: nGateway,
        kind: "gateway",
        name: "¿Aprobado?",
        description: "Exclusive Gateway",
        x: 420,
        y: 200,
        usedParamIds: [],
      },
      {
        id: nAuto,
        kind: "automatica",
        name: "Registrar en sistema",
        description: "Service Task (mock)",
        x: 580,
        y: 120,
        usedParamIds: [pTitulo],
      },
      { id: nFinOk, kind: "fin", name: "End aprobado", description: "", x: 780, y: 120, usedParamIds: [] },
      { id: nFinRech, kind: "fin", name: "End rechazado", description: "", x: 580, y: 300, usedParamIds: [] },
    ],
    transitions: [
      { id: createId("tr"), fromId: nInicio, toId: nManual, condition: "siempre" },
      { id: createId("tr"), fromId: nManual, toId: nGateway, condition: "siempre" },
      { id: createId("tr"), fromId: nGateway, toId: nAuto, condition: "aceptar" },
      { id: createId("tr"), fromId: nGateway, toId: nFinRech, condition: "rechazar" },
      { id: createId("tr"), fromId: nAuto, toId: nFinOk, condition: "siempre" },
    ],
    screens: {
      [nManual]: {
        blocks: [
          { id: createId("blk"), type: "titulo", text: "Revisión de gasto" },
          { id: createId("blk"), type: "texto", text: "Verifique los datos antes de aprobar o rechazar." },
          { id: createId("blk"), type: "dato", paramId: pTitulo },
          { id: createId("blk"), type: "dato", paramId: pMonto },
          { id: createId("blk"), type: "comentario" },
        ],
      },
    },
  };
}

export function ensureSeed(state) {
  if (state.flows.length > 0) return state;
  return { ...state, flows: [createSampleFlow()] };
}
