/**
 * Modal de atributos de entrada/salida por componente.
 * UI: listado arriba, parámetros abajo; 0..n atributos por ámbito (entrada/salida).
 */

import { createId } from "./ids.js";
import { escapeHtml, toast } from "./ui.js";
import { ensureFlowNodeAttributes, syncFlowInputContractFromStart } from "./contracts.js";
import { formatFlowVersion } from "./flow-lifecycle.js";
import {
  cloneAttributeList,
  createEmptyAttribute,
  createEmptyListOption,
  INPUT_CARDINALITY,
  KINDS_WITH_OUTPUT_ATTRIBUTES,
  reindexAttributeOrders,
  validateAttributeList,
  summarizeAttributes,
} from "./component-input-attributes.js";

const DATA_TYPE_OPTIONS = [
  { value: "texto", label: "Texto" },
  { value: "numero", label: "Número" },
  { value: "fecha", label: "Fecha" },
  { value: "si_no", label: "Sí / No" },
];

const ATTR_LIST_ICON_EDIT = `<svg class="component-attr-action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round"/></svg>`;

const ATTR_LIST_ICON_TRASH = `<svg class="component-attr-action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V5h6v2M10 11v6M14 11v6M6 7l1 12h10l1-12" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const ATTR_LIST_ICON_VIEW = `<svg class="component-attr-action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" fill="none" stroke="currentColor" stroke-width="1.75"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.75"/></svg>`;

/**
 * @param {object[]} attrs
 * @param {boolean} readOnly
 */
export function renderComponentAttributeChipsHtml(attrs) {
  const items = summarizeAttributes(attrs);
  if (!items.length) {
    return `<p class="component-attr-empty">Sin atributos definidos.</p>`;
  }
  return items
    .map((a) => {
      const card =
        a.cardinality === INPUT_CARDINALITY.LISTA
          ? `lista · ${a.optionCount} opc.`
          : "único";
      const req = a.required ? " *" : "";
      return `<span class="chip component-attr-chip">${escapeHtml(a.label)} · ${escapeHtml(card)}${req}</span>`;
    })
    .join("");
}

/**
 * @param {object} attr
 * @param {number} index
 * @param {string} scope
 * @param {boolean} readOnly
 */
/**
 * @param {object} attr
 * @returns {string}
 */
function attributeEditSignature(attr) {
  if (!attr) return "";
  return JSON.stringify({
    key: String(attr.key ?? "").trim(),
    label: String(attr.label ?? "").trim(),
    dataType: attr.dataType ?? "texto",
    cardinality: attr.cardinality ?? INPUT_CARDINALITY.UNICO,
    required: !!attr.required,
    order: typeof attr.order === "number" ? attr.order : 0,
    listOptions: (attr.listOptions ?? []).map((o) => ({
      label: String(o.label ?? "").trim(),
      required: !!o.required,
    })),
  });
}

/**
 * @param {object} attr
 * @returns {object}
 */
function cloneAttributeSnapshot(attr) {
  return {
    ...attr,
    listOptions: (attr.listOptions ?? []).map((o) => ({ ...o })),
  };
}

function renderAttributeDetailForm(attr, index, scope, readOnly) {
  const dis = readOnly ? " disabled" : "";
  const typeOpts = DATA_TYPE_OPTIONS.map(
    (o) =>
      `<option value="${o.value}" ${attr.dataType === o.value ? "selected" : ""}>${o.label}</option>`,
  ).join("");
  const isLista = attr.cardinality === INPUT_CARDINALITY.LISTA;
  const optionsHtml = (attr.listOptions ?? [])
    .map(
      (opt, oi) => `
      <div class="component-attr-option-row" data-opt-index="${oi}" ${opt.id ? `data-opt-id="${escapeHtml(opt.id)}"` : ""}>
        <input type="text" data-field="opt-label" value="${escapeHtml(opt.label)}" placeholder="Etiqueta opción"${dis} />
        <label class="component-attr-opt-req"><input type="checkbox" data-field="opt-required" ${opt.required ? "checked" : ""}${dis} /> Obligatoria</label>
        ${readOnly ? "" : `<button type="button" class="btn btn-sm btn-danger" data-rm-opt>×</button>`}
      </div>`,
    )
    .join("");

  return `
    <div class="component-attr-detail-form" data-attr-detail data-attr-index="${index}" data-attr-scope="${scope}" ${attr.id ? `data-attr-id="${escapeHtml(attr.id)}"` : ""}>
      <div class="component-attr-detail-head">
        <strong>Parámetros del atributo</strong>
      </div>
      <div class="form-grid component-attr-fields">
        <div class="form-row"><label>Clave</label><input data-field="key" pattern="[a-z0-9_]+" required value="${escapeHtml(attr.key)}" placeholder="ej. monto"${dis} /></div>
        <div class="form-row"><label>Etiqueta</label><input data-field="label" required value="${escapeHtml(attr.label)}"${dis} /></div>
        <div class="form-row"><label>Tipo</label><select data-field="dataType"${dis}>${typeOpts}</select></div>
        <div class="form-row"><label>Cardinalidad</label>
          <select data-field="cardinality"${dis}>
            <option value="unico" ${!isLista ? "selected" : ""}>Único</option>
            <option value="lista" ${isLista ? "selected" : ""}>Lista</option>
          </select>
        </div>
        <div class="form-row component-attr-order-row">
          <label>Orden</label>
          <input type="number" data-field="order" min="1" step="1" value="${(typeof attr.order === "number" ? attr.order : index) + 1}"${dis} />
          <span class="form-hint component-attr-order-hint">También podés arrastrar filas en el listado.</span>
        </div>
        <label class="component-attr-required"><input type="checkbox" data-field="required" ${attr.required ? "checked" : ""}${dis} /> Obligatorio</label>
      </div>
      <div class="component-attr-options" data-options-block style="${isLista ? "" : "display:none"}">
        <div class="component-attr-options-head">
          <span>Opciones (lista)</span>
          ${readOnly ? "" : `<button type="button" class="btn btn-sm" data-add-opt>+ Opción</button>`}
        </div>
        <div class="component-attr-options-list">${optionsHtml || `<p class="component-attr-empty">Agregá al menos una opción.</p>`}</div>
      </div>
      <div class="component-attr-detail-footer">
        ${
          readOnly
            ? `<button type="button" class="btn btn-sm" data-close-attr-detail data-close-scope="${scope}">Cerrar</button>`
            : `<button type="button" class="btn btn-sm" data-cancel-attr-detail data-cancel-scope="${scope}">Cancelar</button>
               <button type="button" class="btn btn-sm btn-primary" data-save-attr-detail data-save-scope="${scope}" disabled>Guardar</button>`
        }
      </div>
    </div>`;
}

/**
 * @param {object[]} attrs
 * @param {string} scope
 * @param {boolean} readOnly
 * @param {number} selectedIndex
 */
/**
 * @param {object} attr
 */
function attributeListTypeLabel(attr) {
  return DATA_TYPE_OPTIONS.find((o) => o.value === attr.dataType)?.label ?? attr.dataType ?? "—";
}

/**
 * @param {object} attr
 */
function attributeListCardinalityLabel(attr) {
  return attr.cardinality === INPUT_CARDINALITY.LISTA ? "Lista" : "Único";
}

/**
 * @param {object[]} attrs
 * @param {string} scope
 * @param {number} selectedIndex
 */
function renderDefinedAttributesList(attrs, scope, selectedIndex, readOnly, detailOpen) {
  if (!attrs.length) {
    return `<p class="component-attr-empty">No hay atributos definidos. Usá «+ Atributo» para agregar uno.</p>`;
  }
  const safeIndex = Math.min(Math.max(0, selectedIndex), attrs.length - 1);
  const dragHint = readOnly ? "" : ` data-attr-dnd-list="${scope}"`;
  const rows = attrs
    .map((a, i) => {
      const keyCell = a.key?.trim() ? `<code>${escapeHtml(a.key)}</code>` : `<span class="component-attr-cell-muted">—</span>`;
      const labelCell = a.label?.trim()
        ? escapeHtml(a.label)
        : `<span class="component-attr-cell-muted">—</span>`;
      const orderNum = (typeof a.order === "number" ? a.order : i) + 1;
      const requiredCell = a.required ? "Sí" : "No";
      const dragHandle = readOnly
        ? `<span class="component-attr-list-drag component-attr-list-drag--placeholder" aria-hidden="true"></span>`
        : `<span class="component-attr-list-drag" draggable="true" data-attr-drag-handle="${i}" data-drag-scope="${scope}" title="Arrastrar para reordenar" aria-hidden="true">⋮⋮</span>`;
      const editBtn = readOnly
        ? `<button type="button" class="component-attr-icon-btn" data-list-edit-attr="${i}" data-list-scope="${scope}" title="Ver parámetros" aria-label="Ver parámetros">${ATTR_LIST_ICON_VIEW}</button>`
        : `<button type="button" class="component-attr-icon-btn" data-list-edit-attr="${i}" data-list-scope="${scope}" title="Editar parámetros" aria-label="Editar parámetros">${ATTR_LIST_ICON_EDIT}</button>`;
      const deleteBtn = readOnly
        ? ""
        : `<button type="button" class="component-attr-icon-btn component-attr-icon-btn--danger" data-list-rm-attr="${i}" data-list-scope="${scope}" title="Eliminar atributo" aria-label="Eliminar atributo">${ATTR_LIST_ICON_TRASH}</button>`;
      const isEditing = detailOpen && i === safeIndex;
      return `<li class="component-attr-defined-row ${isEditing ? "is-selected" : ""}" data-attr-list-index="${i}" data-attr-list-scope="${scope}" role="option" aria-selected="${isEditing ? "true" : "false"}">
        ${dragHandle}
        <span class="component-attr-cell component-attr-cell-ord">${orderNum}</span>
        <span class="component-attr-cell component-attr-cell-key">${keyCell}</span>
        <span class="component-attr-cell component-attr-cell-label">${labelCell}</span>
        <span class="component-attr-cell">${escapeHtml(attributeListTypeLabel(a))}</span>
        <span class="component-attr-cell">${escapeHtml(attributeListCardinalityLabel(a))}</span>
        <span class="component-attr-cell component-attr-cell-req ${a.required ? "is-yes" : ""}">${requiredCell}</span>
        <div class="component-attr-row-actions">${editBtn}${deleteBtn}</div>
      </li>`;
    })
    .join("");

  return `<div class="component-attr-table">
    <div class="component-attr-table-head" aria-hidden="false">
      <span class="component-attr-th component-attr-th-drag"></span>
      <span class="component-attr-th component-attr-th-ord">#</span>
      <span class="component-attr-th">Clave</span>
      <span class="component-attr-th">Etiqueta</span>
      <span class="component-attr-th">Tipo</span>
      <span class="component-attr-th">Cardinalidad</span>
      <span class="component-attr-th">Obligatorio</span>
      <span class="component-attr-th component-attr-th-actions">Acciones</span>
    </div>
    <ul class="component-attr-defined-list" role="listbox" aria-label="Atributos definidos"${dragHint}>${rows}</ul>
  </div>`;
}

function renderAttributeMasterDetail(attrs, scope, readOnly, selectedIndex, detailOpen) {
  const safeIndex = attrs.length ? Math.min(Math.max(0, selectedIndex), attrs.length - 1) : 0;
  const listHtml = renderDefinedAttributesList(attrs, scope, safeIndex, readOnly, detailOpen);

  let detailHtml = "";
  if (detailOpen && attrs.length > 0) {
    detailHtml = renderAttributeDetailForm(attrs[safeIndex], safeIndex, scope, readOnly);
  }

  return `
    <div class="component-attr-panel component-attr-panel--split" data-attr-panel="${scope}">
      <div class="component-attr-master">
        <div class="component-attr-master-head">
          <span>Atributos definidos (${scope === "output" ? "salida" : "entrada"})</span>
          ${readOnly ? "" : `<button type="button" class="btn btn-sm" data-add-attr data-add-scope="${scope}">+ Atributo</button>`}
        </div>
        <div class="component-attr-list-select">${listHtml}</div>
      </div>
      <div class="component-attr-detail ${detailOpen ? "is-open" : ""}" data-attr-detail-panel="${scope}" ${detailOpen ? "" : "hidden"}>${detailHtml}</div>
    </div>`;
}

/**
 * @param {HTMLElement} panel
 * @param {object[]} attrs
 * @param {string} scope
 * @param {boolean} readOnly
 * @param {number} selectedIndex
 */
function repaintPanel(panel, attrs, scope, readOnly, selectedIndex, detailOpen) {
  const wrap = panel.closest(".component-attr-panels");
  if (!wrap) return;
  const html = renderAttributeMasterDetail(attrs, scope, readOnly, selectedIndex, detailOpen);
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  const next = tmp.firstElementChild;
  if (next) panel.replaceWith(next);
}

/**
 * Actualiza solo el listado superior sin reemplazar el formulario de detalle.
 *
 * @param {HTMLElement} root
 * @param {string} scope
 * @param {object[]} attrs
 * @param {number} selectedIndex
 */
function refreshDefinedListDom(root, scope, attrs, selectedIndex, readOnly, detailOpen) {
  const panel = getAttrPanel(root, scope);
  const host = panel?.querySelector(".component-attr-list-select");
  if (!host) return;
  host.innerHTML = renderDefinedAttributesList(attrs, scope, selectedIndex, readOnly, detailOpen);
}

/**
 * @param {HTMLElement} root
 * @param {string} scope
 */
function getAttrPanel(root, scope) {
  return root.querySelector(`[data-attr-panel="${scope}"]`);
}

/**
 * @param {HTMLElement} detail
 * @returns {object | null}
 */
function readAttributeFromDetailForm(detail) {
  if (!detail) return null;
  const key = detail.querySelector('[data-field="key"]')?.value?.trim() ?? "";
  const label = detail.querySelector('[data-field="label"]')?.value?.trim() ?? "";
  const dataType = detail.querySelector('[data-field="dataType"]')?.value ?? "texto";
  const cardinality = detail.querySelector('[data-field="cardinality"]')?.value ?? INPUT_CARDINALITY.UNICO;
  const required = detail.querySelector('[data-field="required"]')?.checked ?? false;
  const listOptions = [];
  if (cardinality === INPUT_CARDINALITY.LISTA) {
    detail.querySelectorAll(".component-attr-option-row").forEach((row) => {
      listOptions.push({
        id: row.dataset.optId || undefined,
        label: row.querySelector('[data-field="opt-label"]')?.value?.trim() ?? "",
        required: row.querySelector('[data-field="opt-required"]')?.checked ?? false,
      });
    });
  }
  const orderInput = detail.querySelector('[data-field="order"]');
  let order =
    orderInput instanceof HTMLInputElement && orderInput.value !== ""
      ? Math.max(0, Math.floor(Number(orderInput.value)) - 1)
      : undefined;
  if (order === undefined || Number.isNaN(order)) {
    order = Number(detail.dataset.attrIndex) || 0;
  }

  return {
    id: detail.dataset.attrId || createId("attr"),
    key,
    label,
    dataType,
    cardinality,
    required,
    order,
    listOptions: listOptions.map((o) => ({
      id: o.id || createId("opt"),
      label: o.label,
      required: o.required,
    })),
  };
}

/**
 * @param {HTMLElement} root
 * @param {string} scope
 * @param {object[]} list
 * @param {number} selectedIndex
 */
function syncDetailFormToList(root, scope, list, selectedIndex) {
  const panel = getAttrPanel(root, scope);
  const detail = panel?.querySelector("[data-attr-detail]");
  if (!detail || !list.length) return;
  const idx = Math.min(Math.max(0, selectedIndex), list.length - 1);
  const parsed = readAttributeFromDetailForm(detail);
  if (parsed) list[idx] = parsed;
}

/**
 * @param {object[]} list
 * @param {number} fromIndex
 * @param {number} toIndex
 * @returns {number}
 */
function reorderAttributeInList(list, fromIndex, toIndex) {
  const max = list.length - 1;
  if (max < 0 || fromIndex < 0 || fromIndex > max) return fromIndex;
  const clampedTo = Math.min(max, Math.max(0, toIndex));
  if (fromIndex === clampedTo) return fromIndex;
  const [item] = list.splice(fromIndex, 1);
  list.splice(clampedTo, 0, item);
  reindexAttributeOrders(list);
  return clampedTo;
}

/**
 * @param {object[]} list
 * @param {number} selectedIndex
 * @param {number} oneBasedOrder
 * @returns {number}
 */
function moveAttributeByOrderField(list, selectedIndex, oneBasedOrder) {
  if (!list.length) return 0;
  const target = Math.min(list.length, Math.max(1, Math.floor(oneBasedOrder)));
  return reorderAttributeInList(list, selectedIndex, target - 1);
}

/**
 * @param {Element} el
 * @param {string} attrName
 * @returns {number | null}
 */
function parseListRowIndex(el, attrName) {
  const idx = Number.parseInt(el.getAttribute(attrName) ?? "", 10);
  return Number.isNaN(idx) ? null : idx;
}

/**
 * Monta el editor de atributos a pantalla completa en el área principal (hero).
 *
 * @param {HTMLElement} mainEl
 * @param {object} options
 */
export function mountComponentAttributesEditor(mainEl, {
  flow,
  node,
  kindLabel,
  readOnly,
  onSaved,
  onClose,
  initialTab = "input",
}) {
  const editingNodeId = node.id;

  const getEditingNode = () => flow.nodes?.find((n) => n.id === editingNodeId) ?? null;

  const initialNode = getEditingNode() ?? node;
  const hasOutput = KINDS_WITH_OUTPUT_ATTRIBUTES.has(initialNode.kind);
  let activeTab = hasOutput && initialTab === "output" ? "output" : "input";

  /** @type {{ input: object[]; output: object[] }} */
  const draft = {
    input: cloneAttributeList(initialNode.inputAttributes ?? []),
    output: hasOutput ? cloneAttributeList(initialNode.outputAttributes ?? []) : [],
  };

  let selectedInputIndex = 0;
  let selectedOutputIndex = 0;

  /** @type {{ input: boolean; output: boolean }} */
  const detailEditorOpen = { input: false, output: false };

  /** @type {{ input: object | null; output: object | null }} */
  const editSnapshot = { input: null, output: null };

  const scopeKey = (scope) => (scope === "output" ? "output" : "input");

  const tabsHtml = hasOutput
    ? `<div class="component-attr-tabs" role="tablist">
        <button type="button" class="component-attr-tab ${activeTab === "input" ? "is-active" : ""}" data-attr-tab="input" role="tab">Entrada</button>
        <button type="button" class="component-attr-tab ${activeTab === "output" ? "is-active" : ""}" data-attr-tab="output" role="tab">Salida</button>
      </div>`
    : "";

  const bodyHtml = hasOutput
    ? `${renderAttributeMasterDetail(draft.input, "input", readOnly, selectedInputIndex, false)}
       ${renderAttributeMasterDetail(draft.output, "output", readOnly, selectedOutputIndex, false)}`
    : renderAttributeMasterDetail(draft.input, "input", readOnly, selectedInputIndex, false);

  const titleKind = kindLabel ? escapeHtml(kindLabel) : escapeHtml(initialNode.kind);
  const flowVersionLabel = escapeHtml(formatFlowVersion(flow));
  mainEl.innerHTML = `
    <section class="gestion-hero component-attr-hero panel">
      <header class="gestion-hero-header">
        <button type="button" class="btn btn-sm gestion-hero-back" data-component-attrs-back>Volver</button>
        <div class="gestion-hero-heading">
          <h2>Atributos del componente</h2>
          <p class="gestion-hero-subtitle">${titleKind} · ${escapeHtml(initialNode.name)} · ${escapeHtml(flow.name ?? "")} · ${flowVersionLabel}</p>
        </div>
      </header>
      <div class="component-attr-modal-body component-attr-hero-body">
        ${readOnly ? `<p class="props-intro props-intro--readonly">Solo lectura: el flujo no está en borrador.</p>` : ""}
        <p class="form-hint component-attr-hint">Usá el icono de edición en cada fila para abrir los parámetros. Guardá o cancelá desde ese panel; el botón «Guardar» del pie persiste todos los cambios en el flujo${hasOutput ? " (entrada y salida son listas independientes)" : ""}.</p>
        ${tabsHtml}
        <div class="component-attr-panels">${bodyHtml}</div>
      </div>
      <footer class="component-attr-hero-footer">
        ${readOnly ? "" : `<button type="button" class="btn btn-primary" data-save-attrs>Guardar</button>`}
      </footer>
    </section>`;

  const root = mainEl;

  const syncTabVisibility = () => {
    if (!hasOutput) return;
    root.querySelectorAll(".component-attr-tab").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.attrTab === activeTab);
    });
    root.querySelectorAll("[data-attr-panel]").forEach((panel) => {
      const show = panel.dataset.attrPanel === activeTab;
      panel.hidden = !show;
    });
  };
  syncTabVisibility();

  const getScopeState = (scope) => (scope === "output" ? draft.output : draft.input);

  const getSelectedIndex = (scope) => (scope === "output" ? selectedOutputIndex : selectedInputIndex);

  const setSelectedIndex = (scope, idx) => {
    if (scope === "output") selectedOutputIndex = idx;
    else selectedInputIndex = idx;
  };

  const pullDraftFromDom = () => {
    if (detailEditorOpen.input) {
      syncDetailFormToList(root, "input", draft.input, selectedInputIndex);
    }
    if (hasOutput && detailEditorOpen.output) {
      syncDetailFormToList(root, "output", draft.output, selectedOutputIndex);
    }
  };

  const updateDetailSaveButton = (scope) => {
    const key = scopeKey(scope);
    const panel = getAttrPanel(root, scope);
    const detail = panel?.querySelector("[data-attr-detail]");
    const btn = panel?.querySelector("[data-save-attr-detail]");
    if (!detail || !btn || readOnly || !detailEditorOpen[key]) return;
    const snap = editSnapshot[key];
    const current = readAttributeFromDetailForm(detail);
    btn.disabled =
      !snap || !current || attributeEditSignature(current) === attributeEditSignature(snap);
  };

  const closeDetailEditor = (scope, revert) => {
    const key = scopeKey(scope);
    if (!detailEditorOpen[key]) return;
    if (revert && editSnapshot[key]) {
      const list = getScopeState(scope);
      const idx = getSelectedIndex(scope);
      if (idx >= 0 && idx < list.length) {
        list[idx] = cloneAttributeSnapshot(editSnapshot[key]);
      }
    }
    detailEditorOpen[key] = false;
    editSnapshot[key] = null;
  };

  const openDetailEditor = (scope, idx) => {
    const key = scopeKey(scope);
    if (detailEditorOpen[key]) {
      closeDetailEditor(scope, true);
    }
    const list = getScopeState(scope);
    if (idx < 0 || idx >= list.length) return;
    setSelectedIndex(scope, idx);
    editSnapshot[key] = cloneAttributeSnapshot(list[idx]);
    detailEditorOpen[key] = true;
    refreshPanel(scope);
    updateDetailSaveButton(scope);
  };

  const refreshPanel = (scope) => {
    const panel = getAttrPanel(root, scope);
    if (!panel) return;
    const list = getScopeState(scope);
    const key = scopeKey(scope);
    repaintPanel(panel, list, scope, readOnly, getSelectedIndex(scope), detailEditorOpen[key]);
    updateDetailSaveButton(scope);
  };

  const reloadDraftFromNode = () => {
    const editing = getEditingNode();
    if (!editing) return;
    draft.input = cloneAttributeList(editing.inputAttributes ?? []);
    if (hasOutput) draft.output = cloneAttributeList(editing.outputAttributes ?? []);
    selectedInputIndex = draft.input.length
      ? Math.min(selectedInputIndex, draft.input.length - 1)
      : 0;
    selectedOutputIndex = draft.output.length
      ? Math.min(selectedOutputIndex, draft.output.length - 1)
      : 0;
  };

  const refreshListsAfterSave = () => {
    reloadDraftFromNode();
    closeDetailEditor("input", false);
    if (hasOutput) closeDetailEditor("output", false);
    refreshPanel("input");
    if (hasOutput) refreshPanel("output");
    syncTabVisibility();
  };

  const removeAttributeAt = (scope, index) => {
    const key = scopeKey(scope);
    if (detailEditorOpen[key] && getSelectedIndex(scope) === index) {
      closeDetailEditor(scope, false);
    }
    const list = getScopeState(scope);
    if (index < 0 || index >= list.length) return;
    list.splice(index, 1);
    reindexAttributeOrders(list);
    setSelectedIndex(scope, list.length ? Math.min(index, list.length - 1) : 0);
    refreshPanel(scope);
  };

  const applyDetailEditorToDraft = (scope) => {
    const key = scopeKey(scope);
    const list = getScopeState(scope);
    const idx = getSelectedIndex(scope);
    const panel = getAttrPanel(root, scope);
    const detail = panel?.querySelector("[data-attr-detail]");
    const parsed = readAttributeFromDetailForm(detail);
    if (!parsed || idx < 0 || idx >= list.length) return false;

    const prevOrder = list[idx].order;
    list[idx] = parsed;
    if (parsed.order !== prevOrder) {
      moveAttributeByOrderField(list, idx, (parsed.order ?? idx) + 1);
      const newIdx = list.findIndex((a) => a.id === parsed.id);
      if (newIdx >= 0) setSelectedIndex(scope, newIdx);
    }
    reindexAttributeOrders(list);

    const scopeLabel = scope === "output" ? "salida" : "entrada";
    const editing = getEditingNode();
    const errors = validateAttributeList(list, scopeLabel, editing?.name ?? "");
    if (errors.length) {
      toast(errors[0]);
      return false;
    }
    editSnapshot[key] = cloneAttributeSnapshot(list[getSelectedIndex(scope)]);
    updateDetailSaveButton(scope);
    refreshDefinedListDom(
      root,
      scope,
      list,
      getSelectedIndex(scope),
      readOnly,
      detailEditorOpen[key],
    );
    return true;
  };

  const persistDraftToNode = () => {
    const editing = getEditingNode();
    if (!editing) {
      toast("No se encontró el componente en el flujo.");
      return false;
    }
    pullDraftFromDom();
    reindexAttributeOrders(draft.input);
    if (hasOutput) reindexAttributeOrders(draft.output);
    const errors = [
      ...validateAttributeList(draft.input, "entrada", editing.name),
      ...(hasOutput ? validateAttributeList(draft.output, "salida", editing.name) : []),
    ];
    if (errors.length) {
      toast(errors[0]);
      return false;
    }
    editing.inputAttributes = cloneAttributeList(draft.input);
    if (hasOutput) editing.outputAttributes = cloneAttributeList(draft.output);
    ensureFlowNodeAttributes(flow);
    if (editing.kind === "inicio") {
      syncFlowInputContractFromStart(flow);
    }
    onSaved();
    return true;
  };

  root.querySelectorAll("[data-attr-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      closeDetailEditor("input", true);
      if (hasOutput) closeDetailEditor("output", true);
      refreshPanel("input");
      if (hasOutput) refreshPanel("output");
      activeTab = btn.dataset.attrTab === "output" ? "output" : "input";
      syncTabVisibility();
    });
  });

  root.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;

    const rmBtn = t.closest("[data-list-rm-attr]");
    if (rmBtn) {
      const scope = rmBtn.getAttribute("data-list-scope") ?? "input";
      const idx = parseListRowIndex(rmBtn, "data-list-rm-attr");
      if (idx === null) return;
      removeAttributeAt(scope, idx);
      return;
    }

    const editBtn = t.closest("[data-list-edit-attr]");
    if (editBtn) {
      const scope = editBtn.getAttribute("data-list-scope") ?? "input";
      const idx = parseListRowIndex(editBtn, "data-list-edit-attr");
      if (idx === null) return;
      openDetailEditor(scope, idx);
      return;
    }

    const cancelBtn = t.closest("[data-cancel-attr-detail]");
    if (cancelBtn) {
      const scope = cancelBtn.getAttribute("data-cancel-scope") ?? "input";
      closeDetailEditor(scope, true);
      refreshPanel(scope);
      return;
    }

    const closeBtn = t.closest("[data-close-attr-detail]");
    if (closeBtn) {
      const scope = closeBtn.getAttribute("data-close-scope") ?? "input";
      closeDetailEditor(scope, false);
      refreshPanel(scope);
      return;
    }

    const saveDetailBtn = t.closest("[data-save-attr-detail]");
    if (saveDetailBtn) {
      const scope = saveDetailBtn.getAttribute("data-save-scope") ?? "input";
      if (!applyDetailEditorToDraft(scope)) return;
      closeDetailEditor(scope, false);
      refreshPanel(scope);
      toast("Cambios del atributo aplicados al borrador.", 2200, "success");
      return;
    }

    const addAttrBtn = t.closest("[data-add-attr]");
    if (addAttrBtn) {
      const scope = addAttrBtn.getAttribute("data-add-scope") ?? "input";
      const key = scopeKey(scope);
      if (detailEditorOpen[key]) closeDetailEditor(scope, true);
      const list = getScopeState(scope);
      const next = createEmptyAttribute();
      next.order = list.length;
      list.push(next);
      reindexAttributeOrders(list);
      openDetailEditor(scope, list.length - 1);
      return;
    }

    if (t.closest("[data-add-opt]")) {
      const detail = t.closest("[data-attr-detail]");
      if (!detail) return;
      const scope = detail.dataset.attrScope ?? "input";
      const list = getScopeState(scope);
      const idx = getSelectedIndex(scope);
      const attr = list[idx];
      if (!attr) return;
      if (!attr.listOptions) attr.listOptions = [];
      attr.listOptions.push(createEmptyListOption());
      refreshPanel(scope);
      updateDetailSaveButton(scope);
      return;
    }

    if (t.closest("[data-rm-opt]")) {
      const row = t.closest(".component-attr-option-row");
      const detail = t.closest("[data-attr-detail]");
      if (!row || !detail) return;
      const scope = detail.dataset.attrScope ?? "input";
      const list = getScopeState(scope);
      const idx = getSelectedIndex(scope);
      const optionRows = [...detail.querySelectorAll(".component-attr-option-row")];
      const oi = optionRows.indexOf(row);
      if (idx >= 0 && oi >= 0) list[idx]?.listOptions?.splice(oi, 1);
      refreshPanel(scope);
      updateDetailSaveButton(scope);
    }
  });

  root.addEventListener("change", (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.matches('[data-field="cardinality"]')) {
      const detail = t.closest("[data-attr-detail]");
      const block = detail?.querySelector("[data-options-block]");
      if (block) block.style.display = t.value === INPUT_CARDINALITY.LISTA ? "" : "none";
    }
    const detail = t.closest("[data-attr-detail]");
    if (detail) {
      const scope = detail.dataset.attrScope ?? "input";
      updateDetailSaveButton(scope);
    }
  });

  root.addEventListener("input", (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const detail = t.closest("[data-attr-detail]");
    if (!detail) return;
    const scope = detail.dataset.attrScope ?? "input";
    updateDetailSaveButton(scope);
  });

  /** @type {{ scope: string; fromIndex: number } | null} */
  let dragState = null;

  root.addEventListener("dragstart", (e) => {
    if (readOnly) return;
    const handle = e.target instanceof Element ? e.target.closest("[data-attr-drag-handle]") : null;
    if (!handle) return;
    const scope = handle.dataset.dragScope ?? "input";
    const fromIndex = Number(handle.dataset.attrDragHandle);
    if (Number.isNaN(fromIndex)) return;
    closeDetailEditor(scope, true);
    dragState = { scope, fromIndex };
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(fromIndex));
    }
    handle.closest(".component-attr-defined-row")?.classList.add("is-dragging");
  });

  root.addEventListener("dragend", (e) => {
    root.querySelectorAll(".component-attr-defined-row.is-dragging").forEach((el) => {
      el.classList.remove("is-dragging");
    });
    root.querySelectorAll(".component-attr-defined-row.is-drop-target").forEach((el) => {
      el.classList.remove("is-drop-target");
    });
    dragState = null;
  });

  root.addEventListener("dragover", (e) => {
    if (readOnly || !dragState) return;
    const row = e.target instanceof Element ? e.target.closest(".component-attr-defined-row") : null;
    if (!row || row.dataset.attrListScope !== dragState.scope) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    root
      .querySelectorAll(`.component-attr-defined-row[data-attr-list-scope="${dragState.scope}"]`)
      .forEach((el) => el.classList.toggle("is-drop-target", el === row));
  });

  root.addEventListener("dragleave", (e) => {
    const row = e.target instanceof Element ? e.target.closest(".component-attr-defined-row") : null;
    if (row) row.classList.remove("is-drop-target");
  });

  root.addEventListener("drop", (e) => {
    if (readOnly || !dragState) return;
    const row = e.target instanceof Element ? e.target.closest(".component-attr-defined-row") : null;
    if (!row || row.dataset.attrListScope !== dragState.scope) return;
    e.preventDefault();
    const toIndex = Number(row.dataset.attrListIndex);
    const { scope, fromIndex } = dragState;
    if (Number.isNaN(toIndex) || Number.isNaN(fromIndex)) return;
    const list = getScopeState(scope);
    reorderAttributeInList(list, fromIndex, toIndex);
    dragState = null;
    refreshPanel(scope);
  });

  root.querySelector("[data-component-attrs-back]")?.addEventListener("click", () => {
    onClose?.();
  });

  root.querySelector("[data-save-attrs]")?.addEventListener("click", () => {
    if (!persistDraftToNode()) return;
    refreshListsAfterSave();
    toast("Atributos guardados.", 2500, "success");
  });
}
