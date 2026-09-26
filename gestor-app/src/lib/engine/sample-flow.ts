import type { FlowDefinition } from "./flow-types";

function id(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function newFlowId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "00000000-0000-4000-8000-000000000001";
}

/**
 * Flujo de ejemplo: Start → User Task → Gateway → Service Task / End.
 */
export function createSampleFlowDefinition(): FlowDefinition {
  const flowId = newFlowId();
  const pTitulo = id("param");
  const pMonto = id("param");
  const nInicio = id("node");
  const nManual = id("node");
  const nGateway = id("node");
  const nAuto = id("node");
  const nFinOk = id("node");
  const nFinRech = id("node");

  return {
    id: flowId,
    type: "Aprobación",
    name: "Aprobación de gasto",
    description: "Start → actividades → End Event al final de cada camino.",
    status: "listo",
    inputParams: [
      { id: pTitulo, key: "titulo", label: "Título del gasto", type: "texto", required: true },
      { id: pMonto, key: "monto", label: "Monto", type: "numero", required: true },
    ],
    nodes: [
      { id: nInicio, kind: "inicio", name: "Start", usedParamIds: [] },
      {
        id: nManual,
        kind: "manual",
        name: "Revisión del supervisor",
        description: "User Task",
        usedParamIds: [pTitulo, pMonto],
      },
      {
        id: nGateway,
        kind: "gateway",
        gatewayType: "exclusive",
        name: "¿Aprobado?",
        usedParamIds: [],
      },
      {
        id: nAuto,
        kind: "automatica",
        name: "Registrar en sistema",
        usedParamIds: [pTitulo, pMonto],
        integration: {
          adapter: "rest_json",
          executionMode: "mock",
          mockResponse: { registroId: "REG-001", estado: "OK" },
          onError: "fail_instance",
        },
      },
      { id: nFinOk, kind: "fin", name: "End aprobado", usedParamIds: [] },
      { id: nFinRech, kind: "fin", name: "End rechazado", usedParamIds: [] },
    ],
    transitions: [
      { id: id("tr"), fromId: nInicio, toId: nManual, condition: "siempre" },
      { id: id("tr"), fromId: nManual, toId: nGateway, condition: "siempre" },
      { id: id("tr"), fromId: nGateway, toId: nAuto, condition: "aceptar" },
      { id: id("tr"), fromId: nGateway, toId: nFinRech, condition: "rechazar" },
      { id: id("tr"), fromId: nAuto, toId: nFinOk, condition: "siempre" },
    ],
    screens: {
      [nManual]: {
        blocks: [
          { type: "titulo", text: "Revisión de gasto" },
          { type: "dato", paramId: pTitulo },
          { type: "dato", paramId: pMonto },
          { type: "comentario", label: "Motivo", outputKey: "motivoRevision" },
        ],
      },
    },
  };
}
