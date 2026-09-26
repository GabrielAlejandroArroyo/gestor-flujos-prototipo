/**
 * Modelo de flujo BPMN (compatible con el prototipo).
 */

export const NODE_KINDS = {
  INICIO: "inicio",
  MANUAL: "manual",
  AUTOMATICA: "automatica",
  AGENTE_IA: "agente_ia",
  GATEWAY: "gateway",
  FIN: "fin",
} as const;

export type NodeKind = (typeof NODE_KINDS)[keyof typeof NODE_KINDS];

export interface FlowInputParam {
  id: string;
  key: string;
  label: string;
  type: string;
  required?: boolean;
}

export interface FlowNode {
  id: string;
  kind: NodeKind;
  name: string;
  description?: string;
  gatewayType?: string;
  usedParamIds?: string[];
  aiPrompt?: string;
  hitlEmail?: string;
  integration?: {
    adapter?: string;
    executionMode?: string;
    mockResponse?: Record<string, unknown>;
    onError?: string;
  };
}

export interface FlowTransition {
  id: string;
  fromId: string;
  toId: string;
  condition: string;
  lineType?: string;
}

export interface FlowDefinition {
  id: string;
  type: string;
  name: string;
  description?: string;
  status: "borrador" | "listo";
  inputParams: FlowInputParam[];
  nodes: FlowNode[];
  transitions: FlowTransition[];
  screens?: Record<string, { blocks: unknown[] }>;
}

export interface TraceEntry {
  id: string;
  at: string;
  type: string;
  message: string;
  nodeId?: string;
  decision?: string;
  dataShown?: Record<string, unknown>;
}

export interface StepEntry {
  nodeId: string;
  status: string;
  comment?: string;
  at: string;
}

export interface FlowInstance {
  id: string;
  flowId: string;
  flowName: string;
  flowSnapshot: FlowDefinition;
  status: "en_curso" | "completada" | "cerrada_rechazo";
  inputValues: Record<string, unknown>;
  context: Record<string, unknown>;
  currentNodeId: string | null;
  startedAt: string;
  finishedAt: string | null;
  trace: TraceEntry[];
  steps: StepEntry[];
  aiHitlStatus?: string;
  aiHitlSentAt?: string;
  aiHitlReminders?: number;
}
