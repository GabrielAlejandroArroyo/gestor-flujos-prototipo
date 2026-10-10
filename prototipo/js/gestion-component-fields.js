/**
 * Formularios de inputAttributes del nodo en ejecución (Gestión).
 */

import { normalizeComponentAttribute } from "./component-input-attributes.js";
import { readInstanceParamValue, renderInstanceParamField } from "./gestion-input-fields.js";
import { componentAttrContextKey } from "./gestion-instance-helpers.js";

/**
 * @param {object} attr
 * @param {string} nodeId
 * @param {object} instance
 */
function attrToParam(attr, nodeId, instance) {
  const a = normalizeComponentAttribute(attr);
  const ctxKey = componentAttrContextKey(nodeId, a.key);
  const stored = instance.context?.[ctxKey];
  return {
    id: a.id,
    key: `nodeattr_${a.id}`,
    storageKey: ctxKey,
    label: a.label,
    type: a.dataType,
    required: a.required,
    cardinality: a.cardinality,
    listOptions: a.listOptions,
    _prefill: stored,
  };
}

/**
 * @param {object} node
 * @param {object} instance
 */
export function renderNodeInputAttributesForm(node, instance) {
  const attrs = node.inputAttributes ?? [];
  if (!attrs.length) return "";

  const fields = attrs
    .map((attr) => {
      const p = attrToParam(attr, node.id, instance);
      return renderInstanceParamField(p);
    })
    .join("");

  return `
    <section class="gestion-manage-attrs">
      <h3 class="gestion-manage-section-title">Datos del componente</h3>
      <form id="form-node-attrs" class="form-grid">${fields}</form>
    </section>`;
}

/**
 * @param {HTMLFormElement} form
 * @param {object} node
 * @param {object} instance
 */
export function readNodeInputAttributesFromForm(form, node, instance) {
  const errors = [];
  const patch = {};
  const fd = new FormData(form);

  for (const attr of node.inputAttributes ?? []) {
    const p = attrToParam(attr, node.id, instance);
    const { value, errors: fieldErrors } = readInstanceParamValue(fd, p);
    errors.push(...fieldErrors);
    patch[p.storageKey] = value;
  }

  return { errors, patch };
}

/**
 * @param {object} instance
 * @param {Record<string, unknown>} patch
 */
export function applyComponentAttrPatch(instance, patch) {
  if (!instance.context) instance.context = {};
  Object.assign(instance.context, patch);
}
