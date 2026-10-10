/**
 * Atributos de entrada/salida por componente (catálogo de actividades y diseñador).
 */

import { createId } from "./ids.js";

const DEFAULT_DATA_TYPE = "texto";

export const INPUT_CARDINALITY = {
  UNICO: "unico",
  LISTA: "lista",
};

/** @type {Set<string>} */
export const COMPONENTS_WITH_INPUT_ATTRIBUTES = new Set([
  "inicio",
  "fin",
  "manual",
  "automatica",
  "gateway",
]);

/** @type {Set<string>} */
export const KINDS_WITH_OUTPUT_ATTRIBUTES = new Set(["gateway"]);

/**
 * @returns {object}
 */
export function createEmptyListOption() {
  return { id: createId("opt"), label: "", required: false };
}

/**
 * @returns {object}
 */
export function createEmptyAttribute() {
  return {
    id: createId("attr"),
    key: "",
    label: "",
    dataType: DEFAULT_DATA_TYPE,
    cardinality: INPUT_CARDINALITY.UNICO,
    required: false,
    listOptions: [],
  };
}

/**
 * @param {object | undefined} attr
 */
export function normalizeComponentAttribute(attr) {
  if (!attr || typeof attr !== "object") return createEmptyAttribute();
  const cardinality =
    attr.cardinality === INPUT_CARDINALITY.LISTA ? INPUT_CARDINALITY.LISTA : INPUT_CARDINALITY.UNICO;
  const listOptions =
    cardinality === INPUT_CARDINALITY.LISTA && Array.isArray(attr.listOptions)
      ? attr.listOptions.map((o) => ({
          id: o?.id ?? createId("opt"),
          label: String(o?.label ?? "").trim(),
          required: !!o?.required,
        }))
      : [];
  return {
    id: attr.id ?? createId("attr"),
    key: String(attr.key ?? "").trim(),
    label: String(attr.label ?? "").trim(),
    dataType: attr.dataType ?? attr.type ?? DEFAULT_DATA_TYPE,
    cardinality,
    required: !!attr.required,
    listOptions,
  };
}

/**
 * @param {unknown} list
 * @returns {object[]}
 */
export function normalizeAttributeList(list) {
  if (!Array.isArray(list)) return [];
  return list.map((a) => normalizeComponentAttribute(a));
}

/**
 * @param {object} node
 */
export function ensureNodeComponentAttributes(node) {
  if (!node || !COMPONENTS_WITH_INPUT_ATTRIBUTES.has(node.kind)) return;
  if (!Array.isArray(node.inputAttributes)) node.inputAttributes = [];
  else node.inputAttributes = normalizeAttributeList(node.inputAttributes);
  if (KINDS_WITH_OUTPUT_ATTRIBUTES.has(node.kind)) {
    if (!Array.isArray(node.outputAttributes)) node.outputAttributes = [];
    else node.outputAttributes = normalizeAttributeList(node.outputAttributes);
  } else if (node.outputAttributes) {
    delete node.outputAttributes;
  }
}

/**
 * @param {object[]} attrs
 * @param {string} scopeLabel
 * @param {string} nodeName
 * @returns {string[]}
 */
export function validateAttributeList(attrs, scopeLabel, nodeName) {
  const errors = [];
  const keys = new Set();
  const who = nodeName ? `«${nodeName}»` : "componente";
  for (const attr of attrs ?? []) {
    const a = normalizeComponentAttribute(attr);
    if (!a.key) errors.push(`${who} (${scopeLabel}): hay un atributo sin clave.`);
    else if (!/^[a-z0-9_]+$/.test(a.key)) {
      errors.push(`${who} (${scopeLabel}): clave «${a.key}» inválida (use a-z, 0-9, _).`);
    } else if (keys.has(a.key)) {
      errors.push(`${who} (${scopeLabel}): clave duplicada «${a.key}».`);
    } else keys.add(a.key);

    if (!a.label) errors.push(`${who} (${scopeLabel}): atributo «${a.key || "?"}» sin etiqueta.`);

    if (a.cardinality === INPUT_CARDINALITY.LISTA) {
      if (!a.listOptions.length) {
        errors.push(`${who} (${scopeLabel}): «${a.key || "?"}» es lista y debe tener al menos una opción.`);
      }
      for (const opt of a.listOptions) {
        if (!String(opt.label ?? "").trim()) {
          errors.push(`${who} (${scopeLabel}): «${a.key}» tiene una opción sin etiqueta.`);
        }
      }
    }
  }
  return errors;
}

/**
 * @param {object} node
 * @returns {string[]}
 */
export function validateNodeInputAttributes(node) {
  if (!node || !COMPONENTS_WITH_INPUT_ATTRIBUTES.has(node.kind)) return [];
  return validateAttributeList(node.inputAttributes, "entrada", node.name ?? node.id);
}

/**
 * @param {object} node
 * @returns {string[]}
 */
export function validateNodeOutputAttributes(node) {
  if (!node || !KINDS_WITH_OUTPUT_ATTRIBUTES.has(node.kind)) return [];
  return validateAttributeList(node.outputAttributes, "salida", node.name ?? node.id);
}

/**
 * @param {object} node
 * @returns {string[]}
 */
export function validateNodeComponentAttributes(node) {
  return [...validateNodeInputAttributes(node), ...validateNodeOutputAttributes(node)];
}

/**
 * @param {object[]} attrs
 * @returns {object[]}
 */
export function cloneAttributeList(attrs) {
  return normalizeAttributeList(attrs).map((a) => ({
    ...a,
    listOptions: a.listOptions.map((o) => ({ ...o })),
  }));
}

/**
 * Resumen HTML-safe labels for props panel (caller escapes).
 *
 * @param {object[]} attrs
 */
export function summarizeAttributes(attrs) {
  return normalizeAttributeList(attrs).map((a) => ({
    id: a.id,
    label: a.label || a.key || "?",
    key: a.key,
    cardinality: a.cardinality,
    required: a.required,
    dataType: a.dataType,
    optionCount: a.listOptions.length,
  }));
}
