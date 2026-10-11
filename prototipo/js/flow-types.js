/**
 * Maestro: tipos de flujo (nombre, descripción).
 */

import { createId } from "./ids.js";

/**
 * @param {object} state
 */
export function ensureFlowTypesState(state) {
  if (!state) return state;
  if (!Array.isArray(state.flowTypes)) state.flowTypes = [];

  for (const flow of state.flows ?? []) {
    if (!flow || typeof flow !== "object") continue;
    if (flow.flowTypeId) {
      const ft = state.flowTypes.find((t) => t.id === flow.flowTypeId);
      if (ft) flow.type = String(ft.name ?? "").trim() || flow.type;
      continue;
    }
    const typeName = String(flow.type ?? "").trim();
    if (!typeName) continue;
    let ft = state.flowTypes.find((t) => String(t.name ?? "").trim() === typeName);
    if (!ft) {
      ft = {
        id: createId("flowType"),
        name: typeName,
        description: "",
      };
      state.flowTypes.push(ft);
    }
    flow.flowTypeId = ft.id;
    flow.type = ft.name;
  }

  return state;
}

/**
 * @param {object} state
 * @param {object} flow
 */
export function resolveFlowTypeName(state, flow) {
  if (!flow) return "—";
  const id = flow.flowTypeId;
  if (id) {
    const ft = state.flowTypes?.find((t) => t.id === id);
    if (ft?.name) return ft.name;
  }
  return String(flow.type ?? "").trim() || "—";
}

/**
 * @param {object} state
 * @param {string} flowTypeId
 */
export function countFlowsUsingFlowType(state, flowTypeId) {
  return (state.flows ?? []).filter((f) => f.flowTypeId === flowTypeId).length;
}

/**
 * @param {object} state
 * @param {string} flowTypeId
 * @param {string} newName
 */
export function syncFlowTypeLabelOnFlows(state, flowTypeId, newName) {
  const name = String(newName ?? "").trim();
  for (const flow of state.flows ?? []) {
    if (flow.flowTypeId === flowTypeId) flow.type = name;
  }
}

/**
 * @param {object} state
 * @param {string} selectedId
 */
export function renderFlowTypeSelectOptions(state, selectedId) {
  const types = state.flowTypes ?? [];
  if (!types.length) {
    return `<option value="">— Sin tipos definidos —</option>`;
  }
  return types
    .map((t) => {
      const sel = t.id === selectedId ? " selected" : "";
      return `<option value="${escapeHtmlAttr(t.id)}"${sel}>${escapeHtmlText(t.name)}</option>`;
    })
    .join("");
}

/**
 * @param {object} flow
 * @param {object} state
 * @param {string} flowTypeId
 * @returns {boolean}
 */
export function applyFlowTypeToFlow(flow, state, flowTypeId) {
  const ft = state.flowTypes?.find((t) => t.id === flowTypeId);
  if (!ft) return false;
  flow.flowTypeId = ft.id;
  flow.type = String(ft.name ?? "").trim();
  return true;
}

/**
 * @param {object} state
 * @param {string} name
 * @param {string} [excludeId]
 * @returns {boolean}
 */
export function isFlowTypeNameTaken(state, name, excludeId) {
  const n = String(name ?? "").trim().toLowerCase();
  if (!n) return false;
  return (state.flowTypes ?? []).some(
    (t) => t.id !== excludeId && String(t.name ?? "").trim().toLowerCase() === n,
  );
}

function escapeHtmlText(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeHtmlAttr(value) {
  return escapeHtmlText(value);
}

/**
 * Navega al ABM de tipos de flujo desde otras vistas.
 */
export function navigateToFlowTypesMaster() {
  document.querySelector('[data-nav-group="maestros"] [data-master="flowTypes"]')?.click();
}

/**
 * @param {object} state
 * @param {object | null} flow
 */
export function renderFlowTypeFormRow(state, flow) {
  const types = state.flowTypes ?? [];
  const selectedId =
    flow?.flowTypeId ??
    types.find((t) => String(t.name ?? "").trim() === String(flow?.type ?? "").trim())?.id ??
    "";
  if (!types.length) {
    return `<div class="form-row form-row--flow-type-empty">
      <label>Tipo de flujo</label>
      <p class="form-hint" style="margin:0">No hay tipos definidos en Maestros.</p>
      <button type="button" class="btn btn-sm" data-goto-flow-types style="margin-top:0.5rem">Ir a Tipo de flujo</button>
    </div>`;
  }
  return `<div class="form-row"><label>Tipo de flujo</label><select name="flowTypeId" required>${renderFlowTypeSelectOptions(state, selectedId)}</select></div>`;
}

/**
 * @param {ParentNode} root
 * @param {(() => void) | null} onNavigate
 */
export function bindFlowTypeGotoButton(root, onNavigate) {
  root.querySelector("[data-goto-flow-types]")?.addEventListener("click", () => {
    onNavigate?.();
    navigateToFlowTypesMaster();
  });
}
