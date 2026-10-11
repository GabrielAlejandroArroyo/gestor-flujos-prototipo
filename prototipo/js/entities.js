/**
 * Maestro: entidades de negocio (nombre + atributos).
 */

import { resolveConnectedAuthUserId } from "./auth.js";
import { createId } from "./ids.js";

export const ENTITY_REF_TYPE = "referencia_entidad";
export const ENTITY_UUID_TYPE = "uuid";
export const ENTITY_DATE_EXECUTION_TYPE = "dateexecution";
/** Zona horaria fija del valor impactado al instanciar (no hora local). */
export const ENTITY_DATE_EXECUTION_TIMEZONE = "UTC";
export const ENTITY_USER_CONNECTED_TYPE = "userconnected";

/** Tipos cuyo valor se asigna al crear la instancia (no editable en ABM). */
const AUTO_GENERATED_ENTITY_TYPES = new Set([
  ENTITY_UUID_TYPE,
  ENTITY_DATE_EXECUTION_TYPE,
  ENTITY_USER_CONNECTED_TYPE,
]);

export const ENTITY_DATA_TYPES = [
  { value: "texto", label: "Texto" },
  { value: "numero", label: "Número" },
  { value: "fecha", label: "Fecha" },
  { value: "si_no", label: "Sí / No" },
  { value: "texto_largo", label: "Texto largo" },
  { value: ENTITY_UUID_TYPE, label: "UUID (autogenerada)" },
  { value: ENTITY_DATE_EXECUTION_TYPE, label: "Date execution (GETUTCDATE / UTC)" },
  { value: ENTITY_USER_CONNECTED_TYPE, label: "Usuario conectado (userconnected)" },
  { value: ENTITY_REF_TYPE, label: "Referencia a entidad" },
];

const TYPE_SET = new Set(ENTITY_DATA_TYPES.map((t) => t.value));

/**
 * @param {object} state
 * @param {string | null | undefined} entityId
 */
export function getEntityById(state, entityId) {
  if (!entityId) return null;
  return state.entities?.find((e) => e.id === entityId) ?? null;
}

/**
 * @param {object} state
 */
export function ensureEntitiesState(state) {
  if (!state) return state;
  if (!Array.isArray(state.entities)) state.entities = [];
  const validIds = new Set(state.entities.map((e) => e.id));
  for (const entity of state.entities) {
    if (!entity || typeof entity !== "object") continue;
    entity.name = String(entity.name ?? "").trim();
    if (!entity.id) entity.id = createId("entity");
    validIds.add(entity.id);
    if (!Array.isArray(entity.attributes)) entity.attributes = [];
    entity.attributes = entity.attributes.map((a) => {
      const norm = normalizeEntityAttribute(a);
      if (norm.type === ENTITY_REF_TYPE && norm.refEntityId && !validIds.has(norm.refEntityId)) {
        norm.refEntityId = null;
      }
      if (norm.type === ENTITY_REF_TYPE && norm.refEntityId === entity.id) {
        norm.refEntityId = null;
      }
      return norm;
    });
  }
  for (const entity of state.entities) {
    normalizeEntityRecord(entity, state);
  }
  return state;
}

/**
 * @param {object} entity
 * @param {object} state
 */
export function normalizeEntityRecord(entity, state) {
  entity.isBase = !!entity.isBase;
  if (entity.isBase) {
    entity.extendsBaseEntityId = null;
    return entity;
  }
  const extId = entity.extendsBaseEntityId ? String(entity.extendsBaseEntityId) : "";
  if (!extId) {
    entity.extendsBaseEntityId = null;
    return entity;
  }
  const base = getEntityById(state, extId);
  if (!base?.isBase || base.id === entity.id) {
    entity.extendsBaseEntityId = null;
  } else {
    entity.extendsBaseEntityId = extId;
  }
  return entity;
}

/**
 * @param {object} attr
 */
/**
 * Genera un UUID estándar (RFC 4122) para valores de atributo tipo uuid.
 */
export function generateEntityUuidValue() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const hex = () =>
    Math.floor(Math.random() * 65536)
      .toString(16)
      .padStart(4, "0");
  return `${hex()}${hex()}-${hex()}-4${hex().slice(1)}-a${hex().slice(1)}-${hex()}${hex()}${hex()}`;
}

/**
 * Formatea instante en ISO 8601 usando componentes UTC (sufijo `Z`).
 *
 * @param {Date} [at]
 * @returns {string}
 */
export function formatEntityDateExecutionUtc(at = new Date()) {
  const d = at instanceof Date && !Number.isNaN(at.getTime()) ? at : new Date();
  const pad = (n, width = 2) => String(n).padStart(width, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}.${pad(d.getUTCMilliseconds(), 3)}Z`;
}

/**
 * Equivalente mock a GETUTCDATE(): impacto siempre en UTC al instanciar.
 */
export function generateEntityDateExecutionValue() {
  return formatEntityDateExecutionUtc(new Date());
}

/**
 * Id del usuario en sesión o, sin login, `prueabaomigracion` (usuario de sistema).
 */
export function generateEntityUserConnectedValue() {
  return resolveConnectedAuthUserId();
}

/**
 * @param {object | null | undefined} attr
 * @returns {string | null}
 */
export function generateEntityAttributeAutoValue(attr) {
  const type = attr?.type ?? "";
  if (type === ENTITY_UUID_TYPE) return generateEntityUuidValue();
  if (type === ENTITY_DATE_EXECUTION_TYPE) return generateEntityDateExecutionValue();
  if (type === ENTITY_USER_CONNECTED_TYPE) return generateEntityUserConnectedValue();
  return null;
}

export function isEntityAttributeAutoGenerated(attr) {
  const type = attr?.type ?? "";
  return AUTO_GENERATED_ENTITY_TYPES.has(type);
}

export function normalizeEntityAttribute(attr) {
  const type = TYPE_SET.has(attr?.type) ? attr.type : "texto";
  const autoGenerated = AUTO_GENERATED_ENTITY_TYPES.has(type);
  const base = {
    id: attr?.id ? String(attr.id) : createId("entityAttr"),
    key: String(attr?.key ?? "").trim(),
    label: String(attr?.label ?? "").trim(),
    type,
    required: autoGenerated ? true : !!attr?.required,
    autoGenerated,
  };
  if (type === ENTITY_REF_TYPE) {
    const ref = attr?.refEntityId ? String(attr.refEntityId) : "";
    return { ...base, refEntityId: ref || null };
  }
  if (type === ENTITY_DATE_EXECUTION_TYPE) {
    return {
      ...base,
      refEntityId: null,
      timezone: ENTITY_DATE_EXECUTION_TIMEZONE,
      valueFormat: "iso8601_utc",
    };
  }
  return { ...base, refEntityId: null };
}

/**
 * @param {object} state
 * @param {string} name
 * @param {string} [excludeId]
 */
export function isEntityNameTaken(state, name, excludeId) {
  const n = String(name ?? "").trim().toLowerCase();
  if (!n) return false;
  return (state.entities ?? []).some(
    (e) => e.id !== excludeId && String(e.name ?? "").trim().toLowerCase() === n,
  );
}

/**
 * @param {object} state
 * @param {string} targetEntityId
 */
export function countEntitiesReferencingEntity(state, targetEntityId) {
  let count = 0;
  for (const entity of state.entities ?? []) {
    const refs = (entity.attributes ?? []).some(
      (a) => a.type === ENTITY_REF_TYPE && a.refEntityId === targetEntityId,
    );
    if (refs) count += 1;
  }
  return count;
}

/**
 * @param {object} state
 * @param {string} baseEntityId
 */
export function countEntitiesExtendingBase(state, baseEntityId) {
  return (state.entities ?? []).filter(
    (e) => !e.isBase && e.extendsBaseEntityId === baseEntityId,
  ).length;
}

/**
 * @param {object} state
 * @param {string | null | undefined} excludeEntityId
 * @param {string | null | undefined} selectedId
 */
export function renderEntityBaseSelectOptions(state, excludeEntityId, selectedId) {
  const bases = (state.entities ?? []).filter((e) => e.isBase && e.id !== excludeEntityId);
  if (!bases.length) {
    return `<option value="">— Sin entidades base —</option>`;
  }
  const opts = [`<option value="">— Ninguna (independiente) —</option>`];
  for (const e of bases) {
    const sel = e.id === selectedId ? " selected" : "";
    opts.push(`<option value="${escapeAttr(e.id)}"${sel}>${escapeText(e.name)}</option>`);
  }
  return opts.join("");
}

/**
 * @param {object} state
 * @param {string | null} entityId
 * @param {{ isBase: boolean; extendsBaseEntityId: string | null }} meta
 * @returns {{ ok: true } | { ok: false; message: string }}
 */
export function validateEntityExtensionRules(state, entityId, meta) {
  const isBase = !!meta.isBase;
  const extendsId = meta.extendsBaseEntityId ? String(meta.extendsBaseEntityId) : null;

  if (isBase) {
    if (extendsId) {
      return { ok: false, message: "Una entidad base no puede extender otra entidad." };
    }
    return { ok: true };
  }

  if (!extendsId) return { ok: true };

  if (entityId && extendsId === entityId) {
    return { ok: false, message: "Una entidad no puede extenderse a sí misma." };
  }

  const base = getEntityById(state, extendsId);
  if (!base) {
    return { ok: false, message: "La entidad base seleccionada ya no existe." };
  }
  if (!base.isBase) {
    return {
      ok: false,
      message: `Solo podés extender entidades marcadas como base. «${base.name}» no es base.`,
    };
  }

  return { ok: true };
}

/**
 * @param {object} state
 * @param {string} entityId
 * @param {boolean} nextIsBase
 * @returns {{ ok: true } | { ok: false; message: string }}
 */
export function validateEntityBaseFlagChange(state, entityId, nextIsBase) {
  if (nextIsBase) return { ok: true };
  const extenders = countEntitiesExtendingBase(state, entityId);
  if (extenders > 0) {
    const entity = getEntityById(state, entityId);
    return {
      ok: false,
      message: `No podés quitar «base» de «${entity?.name ?? "entidad"}»: ${extenders} ${extenders === 1 ? "entidad la extiende" : "entidades la extienden"}.`,
    };
  }
  return { ok: true };
}

/**
 * @param {object} state
 * @param {object} entity
 */
export function formatEntityKindLabel(state, entity) {
  if (!entity) return "";
  if (entity.isBase) {
    return `<span class="badge badge-listo">Base</span>`;
  }
  if (entity.extendsBaseEntityId) {
    const baseName = getEntityById(state, entity.extendsBaseEntityId)?.name ?? "?";
    return `<span class="catalog-muted">Extiende «${escapeText(baseName)}»</span>`;
  }
  return `<span class="catalog-muted">Independiente</span>`;
}

/**
 * @param {string} selected
 */
export function renderEntityDataTypeOptions(selected) {
  return ENTITY_DATA_TYPES.map((t) => {
    const sel = t.value === selected ? " selected" : "";
    return `<option value="${escapeAttr(t.value)}"${sel}>${escapeText(t.label)}</option>`;
  }).join("");
}

/**
 * @param {object} state
 * @param {string | null | undefined} excludeEntityId
 * @param {string | null | undefined} selectedId
 */
export function renderEntityRefSelectOptions(state, excludeEntityId, selectedId) {
  const candidates = (state.entities ?? []).filter((e) => e.id !== excludeEntityId);
  if (!candidates.length) {
    return `<option value="">— Sin otras entidades —</option>`;
  }
  const opts = [`<option value="">— Seleccionar entidad —</option>`];
  for (const e of candidates) {
    const sel = e.id === selectedId ? " selected" : "";
    opts.push(`<option value="${escapeAttr(e.id)}"${sel}>${escapeText(e.name)}</option>`);
  }
  return opts.join("");
}

/**
 * @param {object} state
 * @param {{ entityId?: string | null; attributes?: object[] } | null} [override]
 * @returns {Map<string, Set<string>>}
 */
export function buildEntityRefAdjacency(state, override = null) {
  /** @type {Map<string, Set<string>>} */
  const adj = new Map();
  const addEdge = (fromId, toId) => {
    if (!fromId || !toId || fromId === toId) return;
    if (!adj.has(fromId)) adj.set(fromId, new Set());
    adj.get(fromId).add(toId);
  };

  for (const entity of state.entities ?? []) {
    const attrs =
      override?.entityId && entity.id === override.entityId
        ? (override.attributes ?? [])
        : (entity.attributes ?? []);
    for (const raw of attrs) {
      const attr = normalizeEntityAttribute(raw);
      if (attr.type !== ENTITY_REF_TYPE || !attr.refEntityId) continue;
      addEdge(entity.id, attr.refEntityId);
    }
  }

  if (override?.entityId && !state.entities?.some((e) => e.id === override.entityId)) {
    for (const raw of override.attributes ?? []) {
      const attr = normalizeEntityAttribute(raw);
      if (attr.type !== ENTITY_REF_TYPE || !attr.refEntityId) continue;
      addEdge(override.entityId, attr.refEntityId);
    }
  }

  return adj;
}

/**
 * @param {Map<string, Set<string>>} adj
 * @param {string} fromId
 * @param {string} toId
 */
export function hasEntityRefPath(adj, fromId, toId) {
  if (!fromId || !toId || fromId === toId) return fromId === toId;
  const seen = new Set([fromId]);
  const stack = [fromId];
  while (stack.length) {
    const cur = stack.pop();
    const next = adj.get(cur);
    if (!next) continue;
    for (const id of next) {
      if (id === toId) return true;
      if (seen.has(id)) continue;
      seen.add(id);
      stack.push(id);
    }
  }
  return false;
}

/**
 * @param {object} state
 * @param {string | null} entityId
 * @param {object[]} attributes
 * @returns {{ ok: true } | { ok: false; message: string }}
 */
export function validateEntityRefRules(state, entityId, attributes) {
  const entity = entityId ? getEntityById(state, entityId) : null;
  const entityLabel = entity?.name ?? "esta entidad";
  const refTargets = new Set();

  for (const raw of attributes ?? []) {
    const attr = normalizeEntityAttribute(raw);
    if (attr.type !== ENTITY_REF_TYPE) continue;
    if (!attr.key && !attr.label) continue;

    if (!attr.refEntityId) {
      return {
        ok: false,
        message: `El atributo «${attr.label || attr.key}» debe seleccionar una entidad referenciada.`,
      };
    }

    const target = getEntityById(state, attr.refEntityId);
    if (!target) {
      return { ok: false, message: "La entidad referenciada ya no existe. Elegí otra." };
    }

    if (entityId && attr.refEntityId === entityId) {
      return { ok: false, message: "Una entidad no puede referenciarse a sí misma." };
    }

    if (refTargets.has(attr.refEntityId)) {
      return {
        ok: false,
        message: `No podés referenciar «${target.name}» más de una vez en ${entityLabel}.`,
      };
    }
    refTargets.add(attr.refEntityId);
  }

  if (!entityId) {
    return { ok: true };
  }

  const adjWithoutDraft = buildEntityRefAdjacency(state, {
    entityId,
    attributes: [],
  });

  for (const raw of attributes ?? []) {
    const attr = normalizeEntityAttribute(raw);
    if (attr.type !== ENTITY_REF_TYPE || !attr.refEntityId) continue;
    if (!attr.key && !attr.label) continue;

    const targetId = attr.refEntityId;
    if (hasEntityRefPath(adjWithoutDraft, targetId, entityId)) {
      const target = getEntityById(state, targetId);
      return {
        ok: false,
        message: `La referencia a «${target?.name ?? targetId}» generaría un ciclo con «${entityLabel}».`,
      };
    }
  }

  return { ok: true };
}

/**
 * @param {string} name
 * @param {object[]} attributes
 * @returns {{ ok: true } | { ok: false; message: string }}
 */
export function validateEntityDefinition(name, attributes) {
  const entityName = String(name ?? "").trim();
  if (!entityName) {
    return { ok: false, message: "El nombre de la entidad es obligatorio." };
  }
  const keys = new Set();
  for (const raw of attributes ?? []) {
    const attr = normalizeEntityAttribute(raw);
    if (!attr.key && !attr.label) continue;
    if (!attr.key) {
      return { ok: false, message: "Cada atributo necesita clave (key)." };
    }
    if (!attr.label) {
      return { ok: false, message: `El atributo «${attr.key}» necesita etiqueta.` };
    }
    const keyLower = attr.key.toLowerCase();
    if (keys.has(keyLower)) {
      return { ok: false, message: `Clave duplicada: «${attr.key}».` };
    }
    keys.add(keyLower);
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(attr.key)) {
      return {
        ok: false,
        message: `Clave inválida «${attr.key}». Usá letras, números y guión bajo (empezá con letra).`,
      };
    }
  }
  return { ok: true };
}

/**
 * @param {object} state
 * @param {object[]} attributes
 */
export function summarizeEntityAttributesForList(state, attributes) {
  const list = attributes ?? [];
  if (!list.length) return "—";
  const parts = list.slice(0, 5).map((raw) => {
    const a = normalizeEntityAttribute(raw);
    if (a.type === ENTITY_REF_TYPE && a.refEntityId) {
      const name = getEntityById(state, a.refEntityId)?.name ?? "?";
      return `→ ${name}`;
    }
    if (a.type === ENTITY_UUID_TYPE) {
      return `${a.label || a.key} (UUID autogenerado)`;
    }
    if (a.type === ENTITY_DATE_EXECUTION_TYPE) {
      return `${a.label || a.key} (dateexecution / UTC)`;
    }
    if (a.type === ENTITY_USER_CONNECTED_TYPE) {
      return `${a.label || a.key} (userconnected)`;
    }
    return a.label || a.key;
  });
  const preview = parts.filter(Boolean).join(", ");
  return list.length > 5 ? `${preview}…` : preview;
}

/**
 * @param {object[]} attributes
 */
export function cloneEntityAttributes(attributes) {
  return (attributes ?? []).map((a) => normalizeEntityAttribute({ ...a }));
}

function escapeText(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value) {
  return escapeText(value);
}
