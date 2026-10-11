/**
 * Auditoría mock de cambios en maestros (tipos de flujo, entidades).
 */

import { createId } from "./ids.js";
import { getUserById, resolveConnectedAuthUserId } from "./auth.js";

/** @typedef {"flowType" | "entity"} MasterAuditArea */
/** @typedef {"create" | "update" | "delete"} MasterAuditAction */

/**
 * @param {object} state
 */
export function ensureMasterAuditLog(state) {
  if (!state || typeof state !== "object") return state;
  if (!Array.isArray(state.masterAuditLog)) state.masterAuditLog = [];
  return state;
}

/**
 * @param {object} state
 * @param {{ area: MasterAuditArea; action: MasterAuditAction; label: string; refId?: string | null; detail?: string }} entry
 */
export function recordMasterAudit(state, entry) {
  ensureMasterAuditLog(state);
  const userId = resolveConnectedAuthUserId();
  const user = getUserById(userId);
  state.masterAuditLog.unshift({
    id: createId("masterAudit"),
    at: new Date().toISOString(),
    userId,
    userLabel: user?.displayName ?? user?.username ?? userId,
    area: entry.area,
    action: entry.action,
    refId: entry.refId ?? null,
    label: String(entry.label ?? "").trim(),
    detail: String(entry.detail ?? "").trim(),
  });
  if (state.masterAuditLog.length > 500) {
    state.masterAuditLog.length = 500;
  }
}

/**
 * @param {MasterAuditArea} area
 */
export function masterAuditAreaLabel(area) {
  if (area === "flowType") return "Tipo de flujo";
  if (area === "entity") return "Entidad";
  return area;
}

/**
 * @param {MasterAuditAction} action
 */
export function masterAuditActionLabel(action) {
  if (action === "create") return "Alta";
  if (action === "update") return "Modificación";
  if (action === "delete") return "Baja";
  return action;
}
