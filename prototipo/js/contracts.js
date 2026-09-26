/**
 * Contratos de datos del flujo: definiciones, mappings y contexto de instancia.
 */

import { createId } from "./ids.js";

export const DATA_TYPES = {
  TEXTO: "texto",
  NUMERO: "numero",
  FECHA: "fecha",
  SI_NO: "si_no",
  TEXTO_LARGO: "texto_largo",
  JSON: "json",
};

export const MAPPING_SOURCES = {
  FLOW_INPUT: "flow_input",
  CONTEXT: "context",
  CONSTANT: "constant",
};

const RESERVED_CONTEXT_KEYS = new Set(["__proto__", "constructor"]);

/**
 * @param {object} flow
 */
export function normalizeFlowContracts(flow) {
  if (!flow) return;
  if (!Array.isArray(flow.inputParams)) flow.inputParams = [];
  if (!flow.dataDefinitions) {
    flow.dataDefinitions = flow.inputParams.map((p) => ({
      id: p.id,
      key: p.key,
      label: p.label,
      type: p.type ?? DATA_TYPES.TEXTO,
      required: !!p.required,
      scope: "flow_input",
    }));
  }
  syncInputParamsFromDefinitions(flow);
  if (!flow.nodes) return;
  for (const node of flow.nodes) {
    if (!node.inputMappings && (node.usedParamIds?.length ?? 0) > 0) {
      node.inputMappings = node.usedParamIds.map((paramId) => {
        const def = flow.inputParams.find((p) => p.id === paramId);
        return {
          id: createId("map"),
          source: MAPPING_SOURCES.FLOW_INPUT,
          paramId,
          localKey: def?.key ?? paramId,
        };
      });
    }
    if (!node.outputMappings) node.outputMappings = [];
    if (!node.inputMappings) node.inputMappings = [];
    syncUsedParamIdsFromMappings(node, flow);
  }
}

function syncInputParamsFromDefinitions(flow) {
  flow.inputParams = flow.dataDefinitions.map((d) => ({
    id: d.id,
    key: d.key,
    label: d.label,
    type: d.type,
    required: !!d.required,
  }));
}

function syncUsedParamIdsFromMappings(node, flow) {
  const ids = [];
  for (const m of node.inputMappings ?? []) {
    if (m.source === MAPPING_SOURCES.FLOW_INPUT && m.paramId) ids.push(m.paramId);
    if (m.source === MAPPING_SOURCES.FLOW_INPUT && m.key) {
      const p = flow.inputParams.find((x) => x.key === m.key);
      if (p) ids.push(p.id);
    }
  }
  node.usedParamIds = [...new Set(ids)];
}

/**
 * @param {object} flow
 * @param {object} instance
 * @param {object} node
 */
export function resolveNodeInputBag(flow, instance, node) {
  const bag = { ...instance.inputValues, ...(instance.context ?? {}) };
  const out = {};
  for (const m of node.inputMappings ?? []) {
    if (m.source === MAPPING_SOURCES.CONSTANT) {
      out[m.localKey ?? m.targetKey ?? "value"] = m.constantValue ?? "";
      continue;
    }
    if (m.source === MAPPING_SOURCES.CONTEXT) {
      const k = m.contextKey ?? m.key;
      if (k) out[m.localKey ?? k] = instance.context?.[k];
      continue;
    }
    const param = flow.inputParams.find((p) => p.id === m.paramId || p.key === m.key);
    if (param) out[m.localKey ?? param.key] = bag[param.key] ?? instance.context?.[param.key];
  }
  for (const pid of node.usedParamIds ?? []) {
    const param = flow.inputParams.find((p) => p.id === pid);
    if (param && out[param.key] === undefined) {
      out[param.key] = instance.inputValues[param.key] ?? instance.context?.[param.key];
    }
  }
  return out;
}

/**
 * @param {object} instance
 * @param {object} node
 * @param {Record<string, unknown>} values
 */
export function applyNodeOutputMappings(instance, node, values) {
  if (!instance.context) instance.context = {};
  for (const m of node.outputMappings ?? []) {
    const srcKey = m.localKey ?? m.sourceKey ?? m.fieldKey;
    const target = m.contextKey ?? m.targetKey;
    if (!target || RESERVED_CONTEXT_KEYS.has(target)) continue;
    if (values[srcKey] !== undefined) instance.context[target] = values[srcKey];
  }
  for (const [k, v] of Object.entries(values)) {
    if (k.startsWith("_")) continue;
    if (RESERVED_CONTEXT_KEYS.has(k)) continue;
    const mapped = (node.outputMappings ?? []).some((m) => (m.localKey ?? m.sourceKey ?? m.fieldKey) === k);
    const mappedTarget = (node.outputMappings ?? []).some((m) => (m.contextKey ?? m.targetKey) === k);
    if (mappedTarget) continue;
    if (!mapped && (node.kind === "manual" || node.kind === "automatica")) {
      instance.context[k] = v;
    }
  }
}

/**
 * @param {object} flow
 * @returns {string[]}
 */
export function validateFlowContracts(flow) {
  const errors = [];
  normalizeFlowContracts(flow);
  const keys = new Set();
  for (const d of flow.dataDefinitions ?? []) {
    if (!d.key?.trim()) errors.push("Contrato: hay una definición sin clave.");
    if (keys.has(d.key)) errors.push(`Contrato: clave duplicada «${d.key}».`);
    keys.add(d.key);
  }
  for (const node of flow.nodes ?? []) {
    for (const m of node.outputMappings ?? []) {
      const t = m.contextKey ?? m.targetKey;
      if (t && RESERVED_CONTEXT_KEYS.has(t)) {
        errors.push(`«${node.name}»: clave de contexto reservada «${t}».`);
      }
    }
    if (node.kind === "automatica" && node.integration?.adapter !== "simulation") {
      if (!node.integration?.adapter) {
        errors.push(`Service Task «${node.name}»: falta adaptador de integración.`);
      }
    }
  }
  return errors;
}

/**
 * @param {object} screen
 * @param {Record<string, unknown>} raw
 */
export function validateScreenSubmission(screen, raw) {
  const errors = [];
  const values = {};
  for (const b of screen?.blocks ?? []) {
    if (b.type === "comentario" || b.type === "campo_texto" || b.type === "campo_texto_largo") {
      const key = b.outputKey ?? b.fieldKey ?? (b.type === "comentario" ? "comment" : b.id);
      values[key] = raw[key] ?? raw[`field_${b.id}`] ?? "";
      if (b.required && !String(values[key]).trim()) errors.push(`Campo obligatorio: ${b.label ?? key}.`);
    }
    if (b.type === "campo_numero") {
      const key = b.outputKey ?? b.fieldKey ?? b.id;
      const v = raw[key] ?? raw[`field_${b.id}`];
      if (b.required && (v === "" || v === undefined)) errors.push(`Campo obligatorio: ${b.label ?? key}.`);
      values[key] = v === "" || v === undefined ? null : Number(v);
    }
    if (b.type === "campo_fecha" || b.type === "campo_si_no") {
      const key = b.outputKey ?? b.fieldKey ?? b.id;
      values[key] = raw[key] ?? raw[`field_${b.id}`] ?? "";
      if (b.required && !String(values[key]).trim()) errors.push(`Campo obligatorio: ${b.label ?? key}.`);
    }
  }
  if (raw.comment !== undefined) values.comment = raw.comment;
  return { values, errors };
}

/**
 * @param {unknown} payload
 */
export function redactSecrets(payload) {
  try {
    const s = JSON.stringify(payload);
    return JSON.parse(
      s.replace(/"(authorization|api[_-]?key|password|secret|token)"\s*:\s*"[^"]*"/gi, '"$1":"***"'),
    );
  } catch {
    return payload;
  }
}
