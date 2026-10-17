import { createId } from "@/lib/ids";
import { cloneFlowSnapshot } from "@/lib/flow-validation";
import type { MockFlowDefinition } from "@/lib/db/flow-mapper";

export type FlowStatus = "borrador" | "listo" | "deprecado";

export function normalizeFlowMeta(flow: MockFlowDefinition): void {
  if (!flow.lineageId) flow.lineageId = flow.id;
  if (flow.status === "listo" || flow.status === "deprecado") {
    if (flow.version == null || typeof flow.version !== "number") flow.version = 1;
  } else if (flow.status !== "borrador") {
    flow.status = "borrador";
  }
  if (flow.status === "borrador") flow.version = null;
  if (flow.supersedesFlowId === undefined) flow.supersedesFlowId = null;
}

export function flowStatusLabel(status: FlowStatus | string): string {
  if (status === "listo") return "Listo";
  if (status === "deprecado") return "Deprecado";
  return "Borrador";
}

export function isFlowEditable(flow: { status?: string } | null | undefined): boolean {
  return flow?.status === "borrador";
}

export function findDraftInLineage(
  flows: MockFlowDefinition[],
  lineageId: string,
): MockFlowDefinition | null {
  return flows.find((f) => f.lineageId === lineageId && f.status === "borrador") ?? null;
}

export function findActiveListoInLineage(
  flows: MockFlowDefinition[],
  lineageId: string,
): MockFlowDefinition | null {
  return flows.find((f) => f.lineageId === lineageId && f.status === "listo") ?? null;
}

export function sortFlowsForCatalog(flows: MockFlowDefinition[]): MockFlowDefinition[] {
  return [...flows].sort((a, b) => {
    const la = String(a.lineageId ?? a.id);
    const lb = String(b.lineageId ?? b.id);
    if (la !== lb) return la.localeCompare(lb);
    if (a.status === "borrador" && b.status !== "borrador") return -1;
    if (b.status === "borrador" && a.status !== "borrador") return 1;
    const va = a.version ?? 0;
    const vb = b.version ?? 0;
    return vb - va;
  });
}

export function createVersionDraft(
  flows: MockFlowDefinition[],
  sourceFlowId: string,
): { flow?: MockFlowDefinition; error?: string } {
  const source = flows.find((f) => f.id === sourceFlowId);
  if (!source) return { error: "Flujo no encontrado." };
  if (source.status !== "listo") {
    return { error: "Solo podés versionar un flujo en estado listo." };
  }
  const lineageId = source.lineageId ?? source.id;
  if (findDraftInLineage(flows, lineageId)) {
    return {
      error:
        "Ya hay un borrador en este flujo. Confirmalo o eliminálo antes de versionar de nuevo.",
    };
  }

  const draft = cloneFlowSnapshot(source) as MockFlowDefinition;
  draft.id = createId("flow");
  draft.lineageId = lineageId;
  draft.status = "borrador";
  draft.version = null;
  draft.supersedesFlowId = source.id;
  return { flow: draft };
}

export function publishFlow(
  flows: MockFlowDefinition[],
  flowId: string,
): { ok: boolean; error?: string } {
  const flow = flows.find((f) => f.id === flowId);
  if (!flow) return { ok: false, error: "Flujo no encontrado." };
  if (flow.status !== "borrador") {
    return { ok: false, error: "Solo podés confirmar un flujo en borrador." };
  }

  const lineageId = flow.lineageId ?? flow.id;

  if (flow.supersedesFlowId) {
    const parent = flows.find((f) => f.id === flow.supersedesFlowId);
    if (!parent || parent.status !== "listo") {
      return {
        ok: false,
        error: "No se encontró la versión publicada que este borrador debe reemplazar.",
      };
    }
    const nextVersion = (typeof parent.version === "number" ? parent.version : 0) + 1;
    parent.status = "deprecado";
    flow.version = nextVersion;
    flow.status = "listo";
    flow.supersedesFlowId = null;
    normalizeFlowMeta(flow);
    return { ok: true };
  }

  const existingListo = findActiveListoInLineage(flows, lineageId);
  if (existingListo && existingListo.id !== flow.id) {
    return {
      ok: false,
      error: "Ya existe una versión listo en este flujo. Usá Versionar para crear un borrador.",
    };
  }

  flow.version = 1;
  flow.status = "listo";
  flow.supersedesFlowId = null;
  normalizeFlowMeta(flow);
  return { ok: true };
}
