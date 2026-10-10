/**
 * Helpers de visualización de instancias en Gestión.
 */

import { NODE_KINDS } from "./validation.js";
import { normalizeComponentAttribute } from "./component-input-attributes.js";

/**
 * @param {unknown} val
 */
export function formatInstanceValue(val) {
  if (Array.isArray(val)) return val.filter(Boolean).join(", ") || "—";
  if (val === null || val === undefined || val === "") return "—";
  return String(val);
}

/**
 * Clave en instance.context para un atributo de componente en un paso.
 *
 * @param {string} nodeId
 * @param {string} attrKey
 */
export function componentAttrContextKey(nodeId, attrKey) {
  return `${nodeId}__${attrKey}`;
}

/**
 * @param {string} status
 */
export function isInstanceFinalized(status) {
  return status !== "en_curso";
}

/**
 * @param {string} status
 */
export function instanceStatusBadgeClass(status) {
  if (status === "en_curso") return "curso";
  if (status === "completada") return "completada";
  return "rechazada";
}

/**
 * Texto «label: valor» del primer dato cargado en el Start Event.
 *
 * @param {object} instance
 */
/**
 * @param {string | null | undefined} status
 */
export function formatStepStatusLabel(status) {
  const map = {
    aceptada: "Aceptada",
    rechazada: "Rechazada",
    completada: "Completada",
    pendiente: "Pendiente",
  };
  return map[status ?? ""] ?? status ?? "—";
}

/**
 * Secciones de datos cargados por paso (Start, tareas, contexto por nodo).
 *
 * @param {object} instance
 * @returns {object[]}
 */
export function buildInstanceDataSections(instance) {
  const snap = instance.flowSnapshot;
  const nodes = snap?.nodes ?? [];
  const nodeById = Object.fromEntries(nodes.map((n) => [n.id, n]));
  /** @type {string[]} */
  const sectionOrder = [];
  /** @type {Map<string, object>} */
  const sectionByKey = new Map();

  /**
   * @param {string} key
   * @param {string} fallbackTitle
   */
  const ensureSection = (key, fallbackTitle) => {
    if (!sectionByKey.has(key)) {
      const node = key.includes("__") ? null : nodeById[key];
      const sec = {
        sectionKey: key,
        nodeId: node?.id ?? key,
        title: node?.name ?? fallbackTitle,
        kind: node?.kind ?? "",
        at: null,
        status: null,
        comment: null,
        fields: [],
      };
      sectionByKey.set(key, sec);
      sectionOrder.push(key);
    }
    return sectionByKey.get(key);
  };

  /**
   * @param {object} sec
   * @param {string} label
   * @param {unknown} value
   */
  const addField = (sec, label, value) => {
    if (value === undefined) return;
    const lbl = String(label || "").trim() || "—";
    if (sec.fields.some((f) => f.label === lbl)) return;
    sec.fields.push({ label: lbl, value: formatInstanceValue(value) });
  };

  const start = nodes.find((n) => n.kind === NODE_KINDS.INICIO);
  if (start) {
    const sec = ensureSection(start.id, "Inicio");
    sec.at = instance.startedAt ?? null;
    for (const p of snap.inputParams ?? []) {
      addField(sec, p.label || p.key, instance.inputValues?.[p.key]);
    }
    for (const attr of start.inputAttributes ?? []) {
      const a = normalizeComponentAttribute(attr);
      if (a.key) addField(sec, a.label || a.key, instance.inputValues?.[a.key]);
    }
    const inicioTrace = (instance.trace ?? []).find((t) => t.type === "inicio");
    if (inicioTrace?.dataShown && typeof inicioTrace.dataShown === "object") {
      for (const [k, v] of Object.entries(inicioTrace.dataShown)) {
        addField(sec, k, v);
      }
    }
  }

  for (const [ctxKey, val] of Object.entries(instance.context ?? {})) {
    const m = ctxKey.match(/^(.+)__(.+)$/);
    if (!m) continue;
    const [, nodeId, attrKey] = m;
    const node = nodeById[nodeId];
    const sec = ensureSection(nodeId, node?.name ?? "Paso");
    const attr = (node?.inputAttributes ?? []).find(
      (a) => normalizeComponentAttribute(a).key === attrKey,
    );
    const label = attr ? normalizeComponentAttribute(attr).label || attrKey : attrKey;
    addField(sec, label, val);
  }

  for (const step of instance.steps ?? []) {
    const sec = ensureSection(step.nodeId, "Paso");
    if (!sec.at || new Date(step.at).getTime() >= new Date(sec.at).getTime()) {
      sec.at = step.at;
    }
    sec.status = step.status;
    if (step.comment) sec.comment = step.comment;
  }

  for (const t of instance.trace ?? []) {
    if (!t.nodeId || !t.dataShown || typeof t.dataShown !== "object") continue;
    if (t.type === "inicio") continue;
    const sec = ensureSection(t.nodeId, "Paso");
    if (!sec.at && t.at) sec.at = t.at;
    if (t.decision && !sec.status) {
      sec.status = t.decision === "aceptar" ? "aceptada" : t.decision === "rechazar" ? "rechazada" : t.decision;
    }
    if (t.comment && !sec.comment) sec.comment = t.comment;
    for (const [k, v] of Object.entries(t.dataShown)) {
      const label = k === "comment" ? "Comentario" : k;
      addField(sec, label, v);
    }
  }

  const orphanKey = "__orphan__";
  for (const [k, v] of Object.entries(instance.context ?? {})) {
    if (/^.+__.+$/.test(k)) continue;
    const sec = ensureSection(orphanKey, "Otros datos");
    addField(sec, k, v);
  }

  const ordered = sectionOrder
    .map((k) => sectionByKey.get(k))
    .filter(Boolean)
    .sort((a, b) => {
      if (a.kind === NODE_KINDS.INICIO) return -1;
      if (b.kind === NODE_KINDS.INICIO) return 1;
      if (a.sectionKey === orphanKey) return 1;
      if (b.sectionKey === orphanKey) return -1;
      const ta = a.at ? new Date(a.at).getTime() : 0;
      const tb = b.at ? new Date(b.at).getTime() : 0;
      return ta - tb;
    });

  return ordered.filter((s) => s.fields.length > 0 || s.status || s.comment);
}

export function getFirstStartAttributeDisplay(instance) {
  const snap = instance.flowSnapshot;
  if (!snap) return "—";

  const start = snap.nodes?.find((n) => n.kind === NODE_KINDS.INICIO);
  /** @type {{ label: string; key: string } | null} */
  let first = null;

  if (start?.inputAttributes?.length) {
    const a = start.inputAttributes[0];
    first = { label: a.label || a.key || "?", key: a.key };
  } else if (snap.inputParams?.length) {
    const p = snap.inputParams[0];
    first = { label: p.label || p.key || "?", key: p.key };
  }

  if (!first?.key) return "—";
  const val = instance.inputValues?.[first.key];
  return `${first.label}: ${formatInstanceValue(val)}`;
}
