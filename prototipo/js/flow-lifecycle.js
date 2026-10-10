import { createId } from "./ids.js";
import { cloneFlowSnapshot } from "./validation.js";

/** @typedef {"borrador"|"listo"|"deprecado"} FlowStatus */

/**
 * Normaliza metadatos de versión/linaje en un flujo cargado desde storage.
 *
 * @param {Record<string, unknown>} flow
 */
export function normalizeFlowMeta(flow) {
  if (!flow.lineageId) {
    flow.lineageId = flow.id;
  }
  if (flow.status === "listo" || flow.status === "deprecado") {
    if (flow.version == null || typeof flow.version !== "number") {
      flow.version = 1;
    }
  } else if (flow.status !== "borrador") {
    flow.status = "borrador";
  }
  if (flow.status === "borrador") {
    flow.version = null;
  }
  if (flow.supersedesFlowId === undefined) {
    flow.supersedesFlowId = null;
  }
}

/**
 * @param {FlowStatus} status
 * @returns {string}
 */
export function statusLabel(status) {
  if (status === "listo") return "Listo";
  if (status === "deprecado") return "Deprecado";
  return "Borrador";
}

/**
 * @param {{ status?: string }} flow
 * @returns {boolean}
 */
export function isFlowEditable(flow) {
  return flow?.status === "borrador";
}

/**
 * @param {Array<{ lineageId?: string; status?: string }>} flows
 * @param {string} lineageId
 */
export function findDraftInLineage(flows, lineageId) {
  return flows.find((f) => f.lineageId === lineageId && f.status === "borrador") ?? null;
}

/**
 * @param {Array<{ lineageId?: string; status?: string }>} flows
 * @param {string} lineageId
 */
export function findActiveListoInLineage(flows, lineageId) {
  return flows.find((f) => f.lineageId === lineageId && f.status === "listo") ?? null;
}

/**
 * Ordena flujos para el catálogo: por lineageId, borrador primero, luego versión desc.
 *
 * @template T
 * @param {T[]} flows
 * @returns {T[]}
 */
export function sortFlowsForCatalog(flows) {
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

/**
 * @param {string | null | undefined} status
 * @returns {"borrador"|"listo"|"deprecado"}
 */
export function flowStatusBadgeClass(status) {
  if (status === "listo") return "listo";
  if (status === "deprecado") return "deprecado";
  return "borrador";
}

/**
 * @param {{ version?: number | null; status?: string }} flow
 * @returns {string}
 */
export function formatFlowVersion(flow) {
  if (flow.status === "borrador" || flow.version == null) return "—";
  return `v${flow.version}`;
}

/**
 * Crea un borrador clonado para versionar un flujo listo.
 *
 * @param {Array<Record<string, unknown>>} flows
 * @param {string} sourceFlowId
 * @returns {{ flow?: Record<string, unknown>; error?: string }}
 */
export function createVersionDraft(flows, sourceFlowId) {
  const source = flows.find((f) => f.id === sourceFlowId);
  if (!source) return { error: "Flujo no encontrado." };
  if (source.status !== "listo") {
    return { error: "Solo podés versionar un flujo en estado listo." };
  }
  const lineageId = source.lineageId ?? source.id;
  if (findDraftInLineage(flows, lineageId)) {
    return {
      error: "Ya hay un borrador en este flujo. Confirmalo o eliminálo antes de versionar de nuevo.",
    };
  }

  const draft = cloneFlowSnapshot(source);
  draft.id = createId("flow");
  draft.lineageId = lineageId;
  draft.status = "borrador";
  draft.version = null;
  draft.supersedesFlowId = source.id;

  return { flow: draft };
}

/**
 * Publica un borrador: asigna versión y depreca el listo anterior si aplica.
 *
 * @param {Array<Record<string, unknown>>} flows
 * @param {string} flowId
 * @returns {{ ok: boolean; error?: string }}
 */
export function publishFlow(flows, flowId) {
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
