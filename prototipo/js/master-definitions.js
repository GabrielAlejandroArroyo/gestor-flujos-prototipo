/**
 * Definiciones de maestro: agrupan una o más entidades del catálogo Maestros → Entidades.
 */

import { createId } from "./ids.js";
import { getEntityById } from "./entities.js";

/** @typedef {{ id: string; name: string; description: string; entityIds: string[] }} MasterDefinitionRecord */

/**
 * @param {object} state
 * @param {string | null | undefined} definitionId
 */
export function getMasterDefinitionById(state, definitionId) {
  if (!definitionId) return null;
  return state.masterDefinitions?.find((d) => d.id === definitionId) ?? null;
}

/**
 * Definiciones creadas en Maestros → Definición de maestros, aptas para ABM (con entidades).
 *
 * @param {object} state
 */
export function listMasterDefinitionsForAbm(state) {
  return (state.masterDefinitions ?? []).filter((d) => (d.entityIds ?? []).length > 0);
}

/**
 * @param {object} state
 * @param {string | null | undefined} definitionId
 */
export function isMasterDefinitionAvailableForAbm(state, definitionId) {
  const def = getMasterDefinitionById(state, definitionId);
  return !!def && (def.entityIds ?? []).length > 0;
}

/**
 * @param {object} state
 */
export function ensureMasterDefinitionsState(state) {
  if (!state || typeof state !== "object") return state;
  if (!Array.isArray(state.masterDefinitions)) state.masterDefinitions = [];
  const validEntityIds = new Set((state.entities ?? []).map((e) => e.id));
  state.masterDefinitions = state.masterDefinitions.map((raw) => normalizeMasterDefinition(raw, validEntityIds));
  return state;
}

/**
 * @param {object} raw
 * @param {Set<string>} validEntityIds
 * @returns {MasterDefinitionRecord}
 */
export function normalizeMasterDefinition(raw, validEntityIds) {
  const entityIds = (raw?.entityIds ?? [])
    .map((id) => String(id))
    .filter((id) => validEntityIds.has(id));
  const unique = [...new Set(entityIds)];
  return {
    id: raw?.id ? String(raw.id) : createId("masterDef"),
    name: String(raw?.name ?? "").trim(),
    description: String(raw?.description ?? "").trim(),
    entityIds: unique,
  };
}

/**
 * @param {object} state
 * @param {string} name
 * @param {string} [excludeId]
 */
export function isMasterDefinitionNameTaken(state, name, excludeId) {
  const n = String(name ?? "").trim().toLowerCase();
  if (!n) return false;
  return (state.masterDefinitions ?? []).some(
    (d) => d.id !== excludeId && String(d.name ?? "").trim().toLowerCase() === n,
  );
}

/**
 * @param {object} state
 * @param {string} entityId
 */
export function countMasterDefinitionsUsingEntity(state, entityId) {
  if (!entityId) return 0;
  return (state.masterDefinitions ?? []).filter((d) => (d.entityIds ?? []).includes(entityId)).length;
}

/**
 * @param {object} state
 * @param {string} name
 * @param {string[]} entityIds
 * @param {string} [excludeId]
 * @returns {{ ok: true } | { ok: false; message: string }}
 */
export function validateMasterDefinition(state, name, entityIds, excludeId) {
  const label = String(name ?? "").trim();
  if (!label) {
    return { ok: false, message: "El nombre de la definición es obligatorio." };
  }
  if (isMasterDefinitionNameTaken(state, label, excludeId)) {
    return { ok: false, message: `Ya existe una definición con el nombre «${label}».` };
  }
  const ids = [...new Set((entityIds ?? []).map((id) => String(id)).filter(Boolean))];
  if (!ids.length) {
    return { ok: false, message: "Seleccioná al menos una entidad del maestro." };
  }
  for (const id of ids) {
    if (!getEntityById(state, id)) {
      return { ok: false, message: "Una entidad seleccionada ya no existe. Actualizá la definición." };
    }
  }
  return { ok: true };
}

/**
 * @param {object} state
 * @param {MasterDefinitionRecord} def
 */
export function summarizeMasterDefinitionEntities(state, def) {
  const names = (def.entityIds ?? [])
    .map((id) => getEntityById(state, id)?.name)
    .filter(Boolean);
  if (!names.length) return "—";
  const preview = names.slice(0, 4).join(", ");
  return names.length > 4 ? `${preview}… (+${names.length - 4})` : preview;
}

function escapeText(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * @param {object} state
 * @param {string[]} selectedIds
 */
export function renderMasterDefinitionEntityChecklist(state, selectedIds) {
  const selected = new Set(selectedIds ?? []);
  const entities = state.entities ?? [];
  if (!entities.length) {
    return `<p class="form-hint">No hay entidades. Creá al menos una en Maestros → Entidades.</p>`;
  }
  return `<div class="master-def-entity-checklist" role="group" aria-label="Entidades incluidas">
    ${entities
      .map((e) => {
        const checked = selected.has(e.id) ? " checked" : "";
        const attrCount = (e.attributes ?? []).length;
        return `<label class="master-def-entity-check">
          <input type="checkbox" name="entityIds" value="${escapeText(e.id)}"${checked} />
          <span class="master-def-entity-check__label">
            <strong>${escapeText(e.name)}</strong>
            <span class="form-hint">${attrCount} ${attrCount === 1 ? "atributo" : "atributos"} · <code>${escapeText(e.id)}</code></span>
          </span>
        </label>`;
      })
      .join("")}
  </div>`;
}
