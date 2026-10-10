/**
 * Modal de atributos de entrada/salida por componente.
 */

import { createId } from "./ids.js";
import { escapeHtml, openModal, toast } from "./ui.js";
import { normalizeFlowContracts } from "./contracts.js";
import {
  cloneAttributeList,
  createEmptyAttribute,
  createEmptyListOption,
  INPUT_CARDINALITY,
  KINDS_WITH_OUTPUT_ATTRIBUTES,
  validateAttributeList,
  summarizeAttributes,
} from "./component-input-attributes.js";

const DATA_TYPE_OPTIONS = [
  { value: "texto", label: "Texto" },
  { value: "numero", label: "Número" },
  { value: "fecha", label: "Fecha" },
  { value: "si_no", label: "Sí / No" },
];

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
function renderAttributeCard(attr, index, scope, readOnly) {
  const dis = readOnly ? " disabled" : "";
  const typeOpts = DATA_TYPE_OPTIONS.map(
    (o) =>
      `<option value="${o.value}" ${attr.dataType === o.value ? "selected" : ""}>${o.label}</option>`,
  ).join("");
  const isLista = attr.cardinality === INPUT_CARDINALITY.LISTA;
  const optionsHtml = (attr.listOptions ?? [])
    .map(
      (opt, oi) => `
      <div class="component-attr-option-row" data-opt-index="${oi}">
        <input type="text" data-field="opt-label" value="${escapeHtml(opt.label)}" placeholder="Etiqueta opción"${dis} />
        <label class="component-attr-opt-req"><input type="checkbox" data-field="opt-required" ${opt.required ? "checked" : ""}${dis} /> Obligatoria</label>
        ${readOnly ? "" : `<button type="button" class="btn btn-sm btn-danger" data-rm-opt>×</button>`}
      </div>`,
    )
    .join("");

  return `
    <div class="component-attr-card" data-attr-index="${index}" data-attr-scope="${scope}">
      <div class="component-attr-card-head">
        <strong>Atributo ${index + 1}</strong>
        ${readOnly ? "" : `<button type="button" class="btn btn-sm btn-danger" data-rm-attr>Eliminar</button>`}
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
        <label class="component-attr-required"><input type="checkbox" data-field="required" ${attr.required ? "checked" : ""}${dis} /> Obligatorio</label>
      </div>
      <div class="component-attr-options" data-options-block style="${isLista ? "" : "display:none"}">
        <div class="component-attr-options-head">
          <span>Opciones (lista)</span>
          ${readOnly ? "" : `<button type="button" class="btn btn-sm" data-add-opt>+ Opción</button>`}
        </div>
        <div class="component-attr-options-list">${optionsHtml || `<p class="component-attr-empty">Agregá al menos una opción.</p>`}</div>
      </div>
    </div>`;
}

/**
 * @param {object[]} attrs
 * @param {string} scope
 * @param {boolean} readOnly
 */
function renderAttributePanel(attrs, scope, readOnly) {
  const cards = attrs.map((a, i) => renderAttributeCard(a, i, scope, readOnly)).join("");
  return `
    <div class="component-attr-panel" data-attr-panel="${scope}">
      <div class="component-attr-list">${cards || `<p class="component-attr-empty">No hay atributos. Usá «+ Atributo».</p>`}</div>
      ${readOnly ? "" : `<button type="button" class="btn btn-sm" data-add-attr data-add-scope="${scope}">+ Atributo</button>`}
    </div>`;
}

/**
 * @param {HTMLElement} panel
 * @param {object[]} attrs
 * @param {string} scope
 * @param {boolean} readOnly
 */
function repaintPanel(panel, attrs, scope, readOnly) {
  const list = panel.querySelector(".component-attr-list");
  if (!list) return;
  list.innerHTML =
    attrs.map((a, i) => renderAttributeCard(a, i, scope, readOnly)).join("") ||
    `<p class="component-attr-empty">No hay atributos. Usá «+ Atributo».</p>`;
}

/**
 * @param {HTMLElement} root
 * @param {string} scope
 * @returns {object[]}
 */
/**
 * @param {HTMLElement} root
 * @param {string} scope
 */
function getAttrPanel(root, scope) {
  return root.querySelector(`[data-attr-panel="${scope}"]`);
}

/**
 * @param {HTMLElement} root
 * @param {string} scope
 * @returns {object[]}
 */
function collectAttributesFromPanel(root, scope) {
  const panel = getAttrPanel(root, scope);
  if (!panel) return [];
  const cards = panel.querySelectorAll(`.component-attr-card[data-attr-scope="${scope}"]`);
  /** @type {object[]} */
  const out = [];
  cards.forEach((card) => {
    const key = card.querySelector('[data-field="key"]')?.value?.trim() ?? "";
    const label = card.querySelector('[data-field="label"]')?.value?.trim() ?? "";
    const dataType = card.querySelector('[data-field="dataType"]')?.value ?? "texto";
    const cardinality = card.querySelector('[data-field="cardinality"]')?.value ?? INPUT_CARDINALITY.UNICO;
    const required = card.querySelector('[data-field="required"]')?.checked ?? false;
    const listOptions = [];
    if (cardinality === INPUT_CARDINALITY.LISTA) {
      card.querySelectorAll(".component-attr-option-row").forEach((row) => {
        listOptions.push({
          id: row.dataset.optId || undefined,
          label: row.querySelector('[data-field="opt-label"]')?.value?.trim() ?? "",
          required: row.querySelector('[data-field="opt-required"]')?.checked ?? false,
        });
      });
    }
    out.push({
      id: card.dataset.attrId || createId("attr"),
      key,
      label,
      dataType,
      cardinality,
      required,
      listOptions: listOptions.map((o) => ({
        id: o.id || createId("opt"),
        label: o.label,
        required: o.required,
      })),
    });
  });
  return out;
}

/**
 * @param {object} options
 * @param {object} options.flow
 * @param {object} options.node
 * @param {string} [options.kindLabel]
 * @param {boolean} options.readOnly
 * @param {() => void} options.onSaved
 * @param {() => void} [options.onOpenCanvas]
 * @param {"input"|"output"} [options.initialTab]
 */
export function openComponentAttributesModal({
  flow,
  node,
  kindLabel,
  readOnly,
  onSaved,
  onOpenCanvas,
  initialTab = "input",
}) {
  const hasOutput = KINDS_WITH_OUTPUT_ATTRIBUTES.has(node.kind);
  let activeTab = hasOutput && initialTab === "output" ? "output" : "input";

  /** @type {{ input: object[]; output: object[] }} */
  const draft = {
    input: cloneAttributeList(node.inputAttributes ?? []),
    output: hasOutput ? cloneAttributeList(node.outputAttributes ?? []) : [],
  };

  const tabsHtml = hasOutput
    ? `<div class="component-attr-tabs" role="tablist">
        <button type="button" class="component-attr-tab ${activeTab === "input" ? "is-active" : ""}" data-attr-tab="input" role="tab">Entrada</button>
        <button type="button" class="component-attr-tab ${activeTab === "output" ? "is-active" : ""}" data-attr-tab="output" role="tab">Salida</button>
      </div>`
    : "";

  const bodyHtml = hasOutput
    ? `${renderAttributePanel(draft.input, "input", readOnly)}
       ${renderAttributePanel(draft.output, "output", readOnly)}`
    : renderAttributePanel(draft.input, "input", readOnly);

  const titleKind = kindLabel ? escapeHtml(kindLabel) : escapeHtml(node.kind);
  const { close, root } = openModal(`
    <div class="modal-header modal-header--component-attrs">
      <div>
        <h2>Atributos del componente</h2>
        <p class="modal-subtitle">${titleKind} · ${escapeHtml(node.name)} · ${escapeHtml(flow.name ?? "")}</p>
      </div>
      <button type="button" class="btn btn-sm" data-modal-close>Cerrar</button>
    </div>
    <div class="component-attr-modal-body">
      ${readOnly ? `<p class="props-intro props-intro--readonly">Solo lectura: el flujo no está en borrador.</p>` : ""}
      ${tabsHtml}
      <div class="component-attr-panels">${bodyHtml}</div>
    </div>
    <div class="modal-footer component-attr-modal-footer">
      ${onOpenCanvas ? `<button type="button" class="btn btn-sm" data-open-canvas>${readOnly ? "Ver en lienzo" : "Guardar y abrir lienzo"}</button>` : ""}
      ${readOnly ? "" : `<button type="button" class="btn btn-primary" data-save-attrs>Guardar</button>`}
    </div>
  `);

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

  const pullDraftFromDom = () => {
    draft.input = collectAttributesFromPanel(root, "input");
    if (hasOutput) draft.output = collectAttributesFromPanel(root, "output");
  };

  const assignIdsToCards = (scope, attrs) => {
    const panel = getAttrPanel(root, scope);
    if (!panel) return;
    const cards = panel.querySelectorAll(`.component-attr-card[data-attr-scope="${scope}"]`);
    cards.forEach((card, i) => {
      if (attrs[i]?.id) card.dataset.attrId = attrs[i].id;
      if (attrs[i]?.listOptions) {
        const rows = card.querySelectorAll(".component-attr-option-row");
        rows.forEach((row, oi) => {
          if (attrs[i].listOptions[oi]?.id) row.dataset.optId = attrs[i].listOptions[oi].id;
        });
      }
    });
  };

  const persistDraftToNode = () => {
    pullDraftFromDom();
    const errors = [
      ...validateAttributeList(draft.input, "entrada", node.name),
      ...(hasOutput ? validateAttributeList(draft.output, "salida", node.name) : []),
    ];
    if (errors.length) {
      toast(errors[0]);
      return false;
    }
    node.inputAttributes = cloneAttributeList(draft.input);
    if (hasOutput) node.outputAttributes = cloneAttributeList(draft.output);
    normalizeFlowContracts(flow);
    onSaved();
    return true;
  };

  root.querySelectorAll("[data-attr-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      pullDraftFromDom();
      activeTab = btn.dataset.attrTab === "output" ? "output" : "input";
      syncTabVisibility();
    });
  });

  root.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;

    if (t.matches("[data-add-attr]")) {
      const scope = t.dataset.addScope ?? "input";
      pullDraftFromDom();
      if (scope === "output") draft.output.push(createEmptyAttribute());
      else draft.input.push(createEmptyAttribute());
      const panelAdd = getAttrPanel(root, scope);
      if (panelAdd) repaintPanel(panelAdd, scope === "output" ? draft.output : draft.input, scope, readOnly);
      assignIdsToCards(scope, scope === "output" ? draft.output : draft.input);
      return;
    }

    if (t.matches("[data-rm-attr]")) {
      const card = t.closest(".component-attr-card");
      if (!card) return;
      const scope = card.dataset.attrScope ?? "input";
      pullDraftFromDom();
      const panelRm = getAttrPanel(root, scope);
      const cards = panelRm ? [...panelRm.querySelectorAll(`.component-attr-card[data-attr-scope="${scope}"]`)] : [];
      const idx = cards.indexOf(card);
      const list = scope === "output" ? draft.output : draft.input;
      if (idx >= 0) list.splice(idx, 1);
      if (panelRm) repaintPanel(panelRm, list, scope, readOnly);
      assignIdsToCards(scope, list);
      return;
    }

    if (t.matches("[data-add-opt]")) {
      const card = t.closest(".component-attr-card");
      if (!card) return;
      const scope = card.dataset.attrScope ?? "input";
      pullDraftFromDom();
      const panelOpt = getAttrPanel(root, scope);
      const cards = panelOpt ? [...panelOpt.querySelectorAll(`.component-attr-card[data-attr-scope="${scope}"]`)] : [];
      const idx = cards.indexOf(card);
      const list = scope === "output" ? draft.output : draft.input;
      const attr = idx >= 0 ? list[idx] : null;
      if (!attr) return;
      if (!attr.listOptions) attr.listOptions = [];
      attr.listOptions.push(createEmptyListOption());
      if (panelOpt) repaintPanel(panelOpt, list, scope, readOnly);
      assignIdsToCards(scope, list);
      return;
    }

    if (t.matches("[data-rm-opt]")) {
      const row = t.closest(".component-attr-option-row");
      const card = t.closest(".component-attr-card");
      if (!row || !card) return;
      const scope = card.dataset.attrScope ?? "input";
      pullDraftFromDom();
      const panelRmOpt = getAttrPanel(root, scope);
      const cards = panelRmOpt ? [...panelRmOpt.querySelectorAll(`.component-attr-card[data-attr-scope="${scope}"]`)] : [];
      const idx = cards.indexOf(card);
      const optionRows = card ? [...card.querySelectorAll(".component-attr-option-row")] : [];
      const oi = optionRows.indexOf(row);
      const list = scope === "output" ? draft.output : draft.input;
      if (idx >= 0 && oi >= 0) list[idx]?.listOptions?.splice(oi, 1);
      if (panelRmOpt) repaintPanel(panelRmOpt, list, scope, readOnly);
      assignIdsToCards(scope, list);
    }
  });

  root.addEventListener("change", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (t.matches('[data-field="cardinality"]')) {
      const card = t.closest(".component-attr-card");
      const block = card?.querySelector("[data-options-block]");
      if (block) block.style.display = t.value === INPUT_CARDINALITY.LISTA ? "" : "none";
    }
  });

  root.querySelector("[data-save-attrs]")?.addEventListener("click", () => {
    if (persistDraftToNode()) close();
  });

  root.querySelector("[data-open-canvas]")?.addEventListener("click", () => {
    if (!readOnly && !persistDraftToNode()) return;
    if (readOnly) pullDraftFromDom();
    close();
    onOpenCanvas?.();
  });

  assignIdsToCards("input", draft.input);
  if (hasOutput) assignIdsToCards("output", draft.output);
}
