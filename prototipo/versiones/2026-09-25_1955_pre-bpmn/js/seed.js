import { createId } from "./ids.js";

export function createSampleFlow() {
  const flowId = createId("flow");
  const pTitulo = createId("param");
  const pMonto = createId("param");
  const nInicio = createId("node");
  const nManual = createId("node");
  const nAuto = createId("node");
  const nFinOk = createId("node");
  const nFinRech = createId("node");

  return {
    id: flowId,
    type: "Aprobación",
    name: "Aprobación de gasto",
    description: "Flujo de ejemplo: revisión manual y registro automático.",
    status: "listo",
    version: 1,
    inputParams: [
      { id: pTitulo, key: "titulo", label: "Título del gasto", type: "texto", required: true },
      { id: pMonto, key: "monto", label: "Monto", type: "numero", required: true },
    ],
    nodes: [
      { id: nInicio, kind: "inicio", name: "Inicio", description: "", x: 80, y: 200, usedParamIds: [] },
      {
        id: nManual,
        kind: "manual",
        name: "Revisión del supervisor",
        description: "Validar monto y concepto",
        x: 320,
        y: 180,
        usedParamIds: [pTitulo, pMonto],
      },
      {
        id: nAuto,
        kind: "automatica",
        name: "Registrar en sistema",
        description: "Acción simbólica en el mock",
        x: 560,
        y: 180,
        usedParamIds: [pTitulo],
      },
      { id: nFinOk, kind: "fin", name: "Fin aprobado", description: "", x: 800, y: 120, usedParamIds: [] },
      { id: nFinRech, kind: "fin", name: "Fin rechazado", description: "", x: 560, y: 320, usedParamIds: [] },
    ],
    transitions: [
      { id: createId("tr"), fromId: nInicio, toId: nManual, condition: "siempre" },
      { id: createId("tr"), fromId: nManual, toId: nAuto, condition: "aceptar" },
      { id: createId("tr"), fromId: nManual, toId: nFinRech, condition: "rechazar" },
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
