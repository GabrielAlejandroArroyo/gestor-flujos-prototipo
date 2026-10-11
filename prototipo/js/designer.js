import { createId } from "./ids.js";
import {
  validateFlow,
  NODE_KINDS,
  LINE_TYPES,
  GATEWAY_TYPE_CATALOG,
  GATEWAY_TYPES,
  DEFAULT_GATEWAY_TYPE,
  normalizeFlowNodes,
} from "./validation.js";
import {
  LANE_MIN_H,
  LANE_PAD,
  computeLaneLayout,
  getLaneBand,
  getNodePlacementBounds,
  getNodeBox,
} from "./pool-geometry.js";
import {
  isDesignerEditorBlocked,
  isCatalogActionsBlocked,
  designerBlockedMessage,
  designerCatalogCalloutHtml,
  renderDesignerViewportBannerHtml,
} from "./designer-viewport.js";
import { renderActionButton, renderModalCloseButton } from "./action-icons.js";
import { escapeHtml, openModal, renderPageHeader, toast } from "./ui.js";
import { normalizeFlowContracts } from "./contracts.js";
import {
  applyFlowTypeToFlow,
  bindFlowTypeGotoButton,
  renderFlowTypeFormRow,
} from "./flow-types.js";
import { COMPONENTS_WITH_INPUT_ATTRIBUTES } from "./component-input-attributes.js";
import {
  mountComponentAttributesEditor,
  renderComponentAttributeChipsHtml,
} from "./component-attributes-modal.js";
import {
  renderStudioToolbar,
  renderScreenStudio,
  renderAutomationStudio,
  renderAgenteIAStudio,
  bindScreenStudio,
  bindAutomationStudio,
  bindAgenteIAStudio,
} from "./designer-studio.js";
import {
  createVersionDraft,
  publishFlow,
  isFlowEditable,
  designerReadOnlyMessage,
  statusLabel,
  buildCatalogLineageGroups,
  flowStatusBadgeClass,
  formatFlowVersion,
} from "./flow-lifecycle.js";

const TOOL_TO_LINE = {
  sequenceFlow: LINE_TYPES.SEQUENCE,
  messageFlow: LINE_TYPES.MESSAGE,
  association: LINE_TYPES.ASSOCIATION,
};

let designerContext = {
  selectedFlowId: null,
  selectedNodeId: null,
  tool: "select",
  activeLineType: LINE_TYPES.SEQUENCE,
  connectClickFrom: null,
  contextPadOpenTaskMenu: null,
  contextPadOpenGatewayMenu: null,
  view: { zoom: 1, panX: 0, panY: 0 },
  mobilePaletteOpen: false,
  mobilePropsOpen: false,
  copilotOpen: false,
  studioMode: "path",
  catalogView: "flows",
  catalogExpandedLineages: new Set(),
  catalogExpandedActivityFlows: new Set(),
  readOnly: false,
  /** @type {{ flowId: string; nodeId: string; initialTab: string } | null} */
  componentAttrsEditor: null,
  /** Pantalla hero «Nuevo flujo» en el catálogo (sin modal). */
  newFlowScreen: false,
};

export function exitComponentAttributesEditor() {
  designerContext.componentAttrsEditor = null;
}

export function exitNewFlowScreen() {
  designerContext.newFlowScreen = false;
}

function enterNewFlowScreen(mainEl, state, persist) {
  if (isCatalogActionsBlocked()) {
    toast(designerBlockedMessage().body);
    return;
  }
  exitComponentAttributesEditor();
  designerContext.newFlowScreen = true;
  designerContext.selectedFlowId = null;
  designerContext.selectedNodeId = null;
  renderDesigner(mainEl, state, persist);
}

/**
 * @param {HTMLElement} mainEl
 * @param {object} state
 * @param {() => void} persist
 * @param {{ flowId: string; nodeId: string; initialTab?: string }} opts
 */
function enterComponentAttributesEditor(mainEl, state, persist, opts) {
  designerContext.componentAttrsEditor = {
    flowId: opts.flowId,
    nodeId: opts.nodeId,
    initialTab: opts.initialTab ?? "input",
  };
  renderDesigner(mainEl, state, persist);
}

function renderComponentAttributesHero(mainEl, state, persist) {
  const ed = designerContext.componentAttrsEditor;
  if (!ed) return false;
  const flow = state.flows.find((f) => f.id === ed.flowId);
  const node = flow?.nodes?.find((n) => n.id === ed.nodeId);
  if (!flow || !node || !COMPONENTS_WITH_INPUT_ATTRIBUTES.has(node.kind)) {
    exitComponentAttributesEditor();
    return false;
  }

  const readOnly = !isFlowEditable(flow);
  mountComponentAttributesEditor(mainEl, {
    flow,
    node,
    kindLabel: componentKindLabel(node.kind),
    readOnly,
    initialTab: ed.initialTab,
    onSaved: () => {
      persist();
    },
    onClose: () => {
      exitComponentAttributesEditor();
      renderDesigner(mainEl, state, persist);
    },
  });
  return true;
}

function renderFlowStatusBadge(flow) {
  const badgeClass = flowStatusBadgeClass(flow.status);
  return `<span class="badge badge-${badgeClass}">${escapeHtml(statusLabel(flow.status))}</span>`;
}

function createFlowPersist(flow, persist) {
  return () => {
    if (!isFlowEditable(flow)) {
      toast(designerReadOnlyMessage(flow));
      return;
    }
    persist();
  };
}

/** Atributos HTML para campos cuando el diseñador está en solo lectura. */
function propsReadonlyAttrs() {
  return designerContext.readOnly ? ' disabled readonly aria-disabled="true"' : "";
}

const ACTIVITY_NODE_KINDS = new Set([
  NODE_KINDS.MANUAL,
  NODE_KINDS.AUTOMATICA,
  NODE_KINDS.AGENTE_IA,
]);

/** Componentes visibles en el catálogo de actividades (sin Agente IA). */
const ACTIVITY_CATALOG_COMPONENT_KINDS = new Set([
  NODE_KINDS.INICIO,
  NODE_KINDS.FIN,
  NODE_KINDS.GATEWAY,
  NODE_KINDS.MANUAL,
  NODE_KINDS.AUTOMATICA,
]);

/**
 * @param {"flows"|"activities"} view
 */
export function setDesignerCatalogView(view) {
  if (view === "flows" || view === "activities") {
    designerContext.catalogView = view;
  }
}

/**
 * Vuelve al catálogo del diseñador (sin flujo abierto en el lienzo).
 *
 * @param {"flows"|"activities"} catalog
 */
export function enterDesignerCatalog(catalog) {
  exitComponentAttributesEditor();
  exitNewFlowScreen();
  setDesignerCatalogView(catalog);
  designerContext.selectedFlowId = null;
  designerContext.selectedNodeId = null;
  designerContext.studioMode = "path";
  designerContext.connectClickFrom = null;
  designerContext.contextPadOpenTaskMenu = null;
  designerContext.contextPadOpenGatewayMenu = null;
  designerContext.readOnly = false;
}

let activeLinkDrag = null;
let activeCanvasViewport = null;
let activeDesignerSideBind = null;

export function renderDesigner(mainEl, state, persist) {
  if (designerContext.componentAttrsEditor && renderComponentAttributesHero(mainEl, state, persist)) {
    return;
  }

  if (designerContext.newFlowScreen && !designerContext.selectedFlowId) {
    renderNewFlowHero(mainEl, state, persist);
    return;
  }

  if (!designerContext.selectedFlowId && state.flows[0]) {
    designerContext.selectedFlowId = null;
  }

  const flow = state.flows.find((f) => f.id === designerContext.selectedFlowId);

  if (!flow) {
    if (designerContext.catalogView === "activities") {
      mainEl.innerHTML = renderActivityCatalog(state);
      bindActivityCatalog(mainEl, state, persist);
    } else {
      mainEl.innerHTML = renderCatalog(state);
      bindCatalog(mainEl, state, persist);
    }
    return;
  }

  if (isDesignerEditorBlocked()) {
    mainEl.innerHTML = renderDesignerViewportBlocked();
    bindDesignerViewportBlocked(mainEl, state, persist);
    return;
  }

  designerContext.readOnly = !isFlowEditable(flow);
  const flowPersist = createFlowPersist(flow, persist);

  normalizeFlowNodes(flow);
  normalizeFlowContracts(flow);
  const selected = flow.nodes.find((n) => n.id === designerContext.selectedNodeId);
  const validation = validateFlow(flow);

  if (designerContext.readOnly && designerContext.studioMode !== "path") {
    designerContext.studioMode = "path";
  }

  if (
    !designerContext.readOnly &&
    designerContext.studioMode === "screen" &&
    selected?.kind === NODE_KINDS.MANUAL
  ) {
    mainEl.innerHTML = renderStudioShell(flow, selected, validation, "screen");
    bindStudioShell(mainEl, flow, selected, state, flowPersist);
    bindScreenStudio(mainEl, flow, selected, flowPersist, () => renderDesigner(mainEl, state, persist));
    return;
  }
  if (
    !designerContext.readOnly &&
    designerContext.studioMode === "automation" &&
    selected?.kind === NODE_KINDS.AUTOMATICA
  ) {
    mainEl.innerHTML = renderStudioShell(flow, selected, validation, "automation");
    bindStudioShell(mainEl, flow, selected, state, flowPersist);
    bindAutomationStudio(mainEl, flow, selected, flowPersist, () => renderDesigner(mainEl, state, persist));
    return;
  }
  if (
    !designerContext.readOnly &&
    designerContext.studioMode === "agente_ia" &&
    selected?.kind === NODE_KINDS.AGENTE_IA
  ) {
    mainEl.innerHTML = renderStudioShell(flow, selected, validation, "agente_ia");
    bindStudioShell(mainEl, flow, selected, state, flowPersist);
    bindAgenteIAStudio(mainEl, flow, selected, flowPersist, () => renderDesigner(mainEl, state, persist));
    return;
  }

  designerContext.studioMode = "path";
  mainEl.innerHTML = renderFlowEditor(flow);
  bindFlowEditor(mainEl, flow, state, persist, flowPersist);
}

function renderStudioShell(flow, node, validation, mode) {
  return `
    ${renderDesignerViewportBannerHtml()}
    <div class="toolbar">
      <button type="button" class="btn" id="btn-back-catalog">← Catálogo</button>
      <span style="flex:1;font-weight:600">Estudio · ${escapeHtml(flow.name)}</span>
      <button type="button" class="btn" id="btn-flow-meta">Metadatos</button>
    </div>
    ${validation.isValid ? "" : `<ul class="validation-list">${validation.errors.map((e) => `<li>${escapeHtml(e)}</li>`).join("")}</ul>`}
    ${renderStudioToolbar(flow.name, node, mode)}
    <div class="designer-studio-root">${
      mode === "screen"
        ? renderScreenStudio(flow, node)
        : mode === "agente_ia"
          ? renderAgenteIAStudio(flow, node)
          : renderAutomationStudio(flow, node)
    }</div>`;
}

/**
 * @param {object} flow
 * @param {object} state
 * @param {FormData} fd
 * @returns {boolean}
 */
function applyFlowMetaFromForm(flow, state, fd) {
  const flowTypeId = String(fd.get("flowTypeId") ?? "");
  if (!applyFlowTypeToFlow(flow, state, flowTypeId)) {
    toast("Seleccioná un tipo de flujo válido.");
    return false;
  }
  flow.name = String(fd.get("name") ?? "").trim();
  flow.description = String(fd.get("description") ?? "").trim();
  if (!flow.name) {
    toast("El nombre del flujo es obligatorio.");
    return false;
  }
  return true;
}

function bindStudioShell(mainEl, flow, node, state, persist) {
  bindStudioTabs(mainEl, state, persist);
  mainEl.querySelector("#btn-back-catalog")?.addEventListener("click", () => {
    enterDesignerCatalog("flows");
    renderDesigner(mainEl, state, persist);
  });
  mainEl.querySelector("#btn-flow-meta")?.addEventListener("click", () => {
    const { close, root } = openModal(`
      <div class="modal-header"><h2>Metadatos del flujo</h2>${renderModalCloseButton()}</div>
      <form id="form-meta" class="form-grid">
        ${renderFlowTypeFormRow(state, flow)}
        <div class="form-row"><label>Nombre</label><input name="name" value="${escapeHtml(flow.name)}" required /></div>
        <div class="form-row"><label>Descripción</label><textarea name="description">${escapeHtml(flow.description || "")}</textarea></div>
        ${renderActionButton({ icon: "save", label: "Guardar metadatos", variant: "primary", type: "submit", disabled: !(state.flowTypes ?? []).length })}
      </form>
    `);
    bindFlowTypeGotoButton(root, close);
    root.querySelector("#form-meta")?.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!isFlowEditable(flow)) {
        toast("Este flujo no es editable. Usá «Versionar» para crear un borrador.");
        return;
      }
      const fd = new FormData(e.target);
      if (!applyFlowMetaFromForm(flow, state, fd)) return;
      persist();
      close();
      renderDesigner(mainEl, state, persist);
    });
  });
}

function bindStudioTabs(mainEl, state, persist) {
  mainEl.querySelectorAll("[data-studio-mode]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.disabled) return;
      if (designerContext.readOnly) {
        toast("Este flujo no es editable. Usá «Versionar» para crear un borrador.");
        return;
      }
      designerContext.studioMode = btn.dataset.studioMode;
      renderDesigner(mainEl, state, persist);
    });
  });
}

function renderDesignerViewportBlocked() {
  const { title, body } = designerBlockedMessage();
  return `
    <section class="panel designer-viewport-blocked">
      <h2 class="panel-title">${escapeHtml(title)}</h2>
      <p>${escapeHtml(body)}</p>
      <p class="designer-viewport-blocked-meta">Viewport actual: ${typeof window !== "undefined" ? `${window.innerWidth}×${window.innerHeight}` : "—"} px</p>
      <div class="toolbar" style="margin-top:1rem">
        ${renderActionButton({ icon: "back", label: "Volver al catálogo", variant: "primary", id: "btn-viewport-back-catalog" })}
      </div>
    </section>`;
}

function bindDesignerViewportBlocked(mainEl, state, persist) {
  mainEl.querySelector("#btn-viewport-back-catalog")?.addEventListener("click", () => {
    designerContext.selectedFlowId = null;
    designerContext.selectedNodeId = null;
    renderDesigner(mainEl, state, persist);
  });
}

/**
 * Acciones del catálogo según estado: borrador → Activar; listo → Versionar.
 *
 * @param {{ id: string; status?: string; name?: string }} flow
 * @param {boolean} catalogBlocked
 */
function renderCatalogFlowActions(flow, catalogBlocked) {
  const disabled = catalogBlocked;
  const openBtn = renderActionButton({
    icon: "open",
    label: "Abrir flujo",
    disabled,
    data: { "open-flow": flow.id },
  });

  if (flow.status === "listo") {
    return `<span class="action-icon-group">${openBtn}${renderActionButton({
      icon: "version",
      label: "Versionar flujo",
      disabled,
      data: { "version-flow": flow.id },
    })}</span>`;
  }
  if (flow.status === "borrador") {
    return `<span class="action-icon-group">${openBtn}${renderActionButton({
      icon: "activate",
      label: "Activar flujo",
      variant: "success",
      disabled,
      data: { "activate-flow": flow.id },
    })}${renderActionButton({
      icon: "delete",
      label: `Eliminar flujo ${flow.name ?? ""}`,
      variant: "danger",
      disabled,
      data: { "delete-flow": flow.id },
    })}</span>`;
  }
  return openBtn;
}

/**
 * Fila de tabla del catálogo de flujos.
 *
 * @param {object} f
 * @param {boolean} catalogBlocked
 * @param {{ rowClass?: string; namePrefix?: string; lineageId?: string }} [opts]
 */
function renderCatalogTreeToggle(lineageId, expanded, childCount) {
  const label =
    childCount === 1 ? "1 versión anterior" : `${childCount} versiones anteriores`;
  return `<button type="button" class="catalog-tree-toggle ${expanded ? "is-expanded" : ""}" data-toggle-deprecados="${escapeHtml(lineageId)}" aria-expanded="${expanded ? "true" : "false"}" aria-label="${expanded ? `Contraer ${label}` : `Expandir ${label}`}" title="${expanded ? "Ocultar versiones anteriores" : "Ver versiones deprecadas"}">
      <svg class="catalog-tree-chevron" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M6 4l4 4-4 4V4z"/></svg>
    </button>`;
}

function renderCatalogFlowTableRow(f, catalogBlocked, opts = {}) {
  const { rowClass = "", lineageId = "", isChild = false } = opts;
  const lineageAttr = lineageId ? ` data-lineage-child="${lineageId}"` : "";
  const nameCell = isChild
    ? `<td class="catalog-name-cell catalog-name-cell--child">
        <span class="catalog-tree-node">
          <span class="catalog-tree-rail" aria-hidden="true"></span>
          <span class="catalog-flow-name">${escapeHtml(f.name)}</span>
        </span>
      </td>`
    : `<td class="catalog-name-cell"><div class="catalog-name-cell-inner"><span class="catalog-flow-name">${escapeHtml(f.name)}</span></div></td>`;
  return `
    <tr class="${rowClass}"${lineageAttr}>
      ${nameCell}
      <td>${escapeHtml(f.type)}</td>
      <td><span class="catalog-version">${escapeHtml(formatFlowVersion(f))}</span></td>
      <td>${renderFlowStatusBadge(f)}</td>
      <td class="catalog-actions">${renderCatalogFlowActions(f, catalogBlocked)}</td>
    </tr>`;
}

function renderCatalog(state) {
  const catalogBlocked = isCatalogActionsBlocked();
  const catalogCallout = designerCatalogCalloutHtml();
  const groups = buildCatalogLineageGroups(state.flows);
  const listoGroups = groups.filter((g) => g.listo);
  const draftOnlyGroups = groups.filter((g) => !g.listo && g.borrador);

  const lineageGroupsHtml = listoGroups
    .map((group) => {
      const f = group.listo;
      if (!f) return "";
      const hasTree =
        group.deprecados.length > 0 || (group.borrador && group.listo && group.borrador.id !== group.listo.id);
      const expanded = designerContext.catalogExpandedLineages.has(group.lineageId);
      const childCount =
        group.deprecados.length + (group.borrador && group.borrador.id !== group.listo?.id ? 1 : 0);
      const toggle = hasTree
        ? renderCatalogTreeToggle(group.lineageId, expanded, childCount)
        : `<span class="catalog-tree-toggle catalog-tree-toggle--spacer" aria-hidden="true"></span>`;
      const countChip =
        hasTree && !expanded
          ? `<span class="catalog-tree-count" title="Versiones anteriores ocultas">${childCount} ${childCount === 1 ? "anterior" : "anteriores"}</span>`
          : "";
      const groupState = expanded ? "is-expanded" : "is-collapsed";
      const parentRow = `
    <tr class="catalog-row catalog-row--parent ${hasTree ? "catalog-row--has-children" : ""} ${expanded ? "catalog-row--expanded" : "catalog-row--collapsed"}" data-lineage-parent="${escapeHtml(group.lineageId)}">
      <td class="catalog-name-cell">
        <div class="catalog-name-cell-inner">
          ${toggle}
          <span class="catalog-flow-name">${escapeHtml(f.name)}</span>
          ${countChip}
        </div>
      </td>
      <td>${escapeHtml(f.type)}</td>
      <td><span class="catalog-version catalog-version--current">${escapeHtml(formatFlowVersion(f))}</span></td>
      <td>${renderFlowStatusBadge(f)}</td>
      <td class="catalog-actions">${renderCatalogFlowActions(f, catalogBlocked)}</td>
    </tr>`;

      let childRowsHtml = "";
      if (expanded && hasTree) {
        const parts = [];
        for (const dep of group.deprecados) {
          parts.push(
            renderCatalogFlowTableRow(dep, catalogBlocked, {
              rowClass: "catalog-row catalog-row--child catalog-row--deprecated",
              lineageId: group.lineageId,
              isChild: true,
            }),
          );
        }
        if (group.borrador && group.borrador.id !== group.listo?.id) {
          parts.push(
            renderCatalogFlowTableRow(group.borrador, catalogBlocked, {
              rowClass: "catalog-row catalog-row--child catalog-row--draft",
              lineageId: group.lineageId,
              isChild: true,
            }),
          );
        }
        childRowsHtml = parts.join("");
      }

      return `<tbody class="catalog-lineage-group ${groupState} ${hasTree ? "has-children" : ""}" data-lineage-group="${escapeHtml(group.lineageId)}">
      ${parentRow}
      ${childRowsHtml}
    </tbody>`;
    })
    .join("");

  const draftRows = draftOnlyGroups
    .map((group) =>
      renderCatalogFlowTableRow(group.borrador, catalogBlocked, {
        rowClass: "catalog-row catalog-row--draft-only",
      }),
    )
    .join("");

  const hasAnyFlow = state.flows.length > 0;
  const hasListo = listoGroups.length > 0;

  const emptyBody =
    !hasAnyFlow
      ? `<div class="empty-state empty-state--rich">
          <svg class="empty-state__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4zM8 10h8M8 14h5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>
          <strong>Sin flujos todavía</strong>
          <p>Creá tu primer flujo BPMN en borrador y usá «Activar» para publicarlo como Listo en Gestión.</p>
          ${renderActionButton({ icon: "add", label: "Nuevo flujo", variant: "primary", id: "btn-new-flow-empty", disabled: catalogBlocked })}
        </div>`
      : !hasListo
        ? `<div class="empty-state empty-state--compact">
          <strong>Sin flujos listos</strong>
          <p>Activá un borrador pendiente para verlo acá como versión publicada.</p>
        </div>`
        : "";

  const listoTable = hasListo
    ? `<div class="table-wrap table-wrap--modern">
        <table class="table-modern catalog-flow-tree">
          <thead>
            <tr><th>Nombre</th><th>Tipo</th><th>Versión</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          ${lineageGroupsHtml}
        </table>
      </div>`
    : "";

  const draftSection =
    draftRows.length > 0
      ? `<div class="catalog-section catalog-section--drafts">
          <h3 class="catalog-section-title">Borradores pendientes</h3>
          <p class="catalog-section-hint">Aún no publicados. Usá «Activar» para pasarlos a Listo.</p>
          <div class="table-wrap table-wrap--modern">
            <table class="table-modern">
              <thead>
                <tr><th>Nombre</th><th>Tipo</th><th>Versión</th><th>Estado</th><th>Acciones</th></tr>
              </thead>
              <tbody>${draftRows}</tbody>
            </table>
          </div>
        </div>`
      : "";

  return `
    <section class="panel panel--catalog">
      ${renderPageHeader(
        "Catálogo de flujos",
        "Se listan los flujos en estado Listo. Desplegá ▸ para ver versiones deprecadas del mismo linaje. Los borradores sin publicar aparecen abajo.",
      )}
      ${catalogCallout}
      ${hasAnyFlow ? `<div class="catalog-toolbar-secondary">
          <p class="catalog-toolbar-secondary__hint">Flujos listos para Gestión. Versioná para editar; las versiones anteriores quedan deprecadas bajo el árbol.</p>
          ${renderActionButton({ icon: "add", label: "Nuevo flujo", variant: "primary", id: "btn-new-flow-table", disabled: catalogBlocked })}
        </div>` : ""}
      ${emptyBody}
      ${listoTable}
      ${draftSection}
    </section>`;
}

function activityKindLabel(kind) {
  if (kind === NODE_KINDS.MANUAL) return "User Task";
  if (kind === NODE_KINDS.AUTOMATICA) return "Service Task";
  if (kind === NODE_KINDS.AGENTE_IA) return "Agente IA";
  return kind;
}

/**
 * Etiqueta BPMN para el catálogo de componentes (sin Agente IA).
 *
 * @param {string} kind
 */
function componentKindLabel(kind) {
  if (kind === NODE_KINDS.INICIO) return "Start Event";
  if (kind === NODE_KINDS.FIN) return "End Event";
  if (kind === NODE_KINDS.GATEWAY) return "Gateway";
  return activityKindLabel(kind);
}

/**
 * @param {string} kind
 */
function componentKindBadgeClass(kind) {
  if (kind === NODE_KINDS.INICIO || kind === NODE_KINDS.FIN) return "borrador";
  if (kind === NODE_KINDS.GATEWAY) return "curso";
  return "listo";
}

/**
 * Flujos listo/borrador para el catálogo de actividades.
 *
 * @param {object[]} flows
 */
function getActivityCatalogFlows(flows) {
  return (flows ?? [])
    .filter((f) => f.status === "listo" || f.status === "borrador")
    .sort((a, b) => {
      if (a.status === "listo" && b.status !== "listo") return -1;
      if (b.status === "listo" && a.status !== "listo") return 1;
      return String(a.name ?? "").localeCompare(String(b.name ?? ""), "es");
    });
}

/**
 * Componentes del flujo en orden BFS (sequence), luego no alcanzables por nombre.
 *
 * @param {object} flow
 */
function listFlowCatalogComponents(flow) {
  const catalogNodes = (flow.nodes ?? []).filter((n) =>
    ACTIVITY_CATALOG_COMPONENT_KINDS.has(n.kind),
  );
  const nodeById = Object.fromEntries((flow.nodes ?? []).map((n) => [n.id, n]));
  const start = flow.nodes?.find((n) => n.kind === NODE_KINDS.INICIO);
  const byFrom = new Map();
  for (const t of flow.transitions ?? []) {
    const lt = t.lineType ?? LINE_TYPES.SEQUENCE;
    if (lt !== LINE_TYPES.SEQUENCE) continue;
    if (!byFrom.has(t.fromId)) byFrom.set(t.fromId, []);
    byFrom.get(t.fromId).push(t.toId);
  }

  const ordered = [];
  const seen = new Set();
  if (start) {
    const queue = [start.id];
    while (queue.length) {
      const id = queue.shift();
      if (seen.has(id)) continue;
      seen.add(id);
      const node = nodeById[id];
      if (node && ACTIVITY_CATALOG_COMPONENT_KINDS.has(node.kind)) {
        ordered.push(node);
      }
      for (const next of byFrom.get(id) ?? []) {
        if (!seen.has(next)) queue.push(next);
      }
    }
  }

  const rest = catalogNodes
    .filter((n) => !seen.has(n.id))
    .sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? ""), "es"));

  return [...ordered, ...rest];
}

/**
 * Icono compacto del tipo de componente (catálogo de actividades).
 *
 * @param {object} node
 */
function renderCatalogComponentIcon(node) {
  const title = escapeHtml(componentKindLabel(node.kind));
  if (node.kind === NODE_KINDS.INICIO) {
    return `<span class="catalog-component-icon-wrap" title="${title}"><span class="palette-shape-icon icon-start catalog-component-shape" aria-hidden="true"></span></span>`;
  }
  if (node.kind === NODE_KINDS.FIN) {
    return `<span class="catalog-component-icon-wrap" title="${title}"><span class="palette-shape-icon icon-end catalog-component-shape" aria-hidden="true"></span></span>`;
  }
  if (node.kind === NODE_KINDS.GATEWAY) {
    const gt = node.gatewayType ?? DEFAULT_GATEWAY_TYPE;
    const mark = gatewayMarkClass(gt);
    return `<span class="catalog-component-icon-wrap catalog-component-icon-wrap--gateway" title="${title}"><span class="icon-gateway-diamond catalog-component-gateway" aria-hidden="true"><span class="gateway-mark ${mark}"></span></span></span>`;
  }
  if (node.kind === NODE_KINDS.MANUAL) {
    return `<span class="catalog-component-icon-wrap catalog-component-glyph" title="${title}" aria-hidden="true">👤</span>`;
  }
  if (node.kind === NODE_KINDS.AUTOMATICA) {
    return `<span class="catalog-component-icon-wrap catalog-component-glyph" title="${title}" aria-hidden="true">⚙</span>`;
  }
  return `<span class="catalog-component-icon-wrap catalog-component-glyph" title="${title}" aria-hidden="true">•</span>`;
}

function renderActivityTreeToggle(flowId, expanded, childCount) {
  const label = childCount === 1 ? "1 componente" : `${childCount} componentes`;
  return `<button type="button" class="catalog-tree-toggle ${expanded ? "is-expanded" : ""}" data-toggle-activity-flow="${escapeHtml(flowId)}" aria-expanded="${expanded ? "true" : "false"}" aria-label="${expanded ? `Contraer ${label}` : `Expandir ${label}`}" title="${expanded ? "Ocultar componentes" : "Ver componentes del flujo"}">
      <svg class="catalog-tree-chevron" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M6 4l4 4-4 4V4z"/></svg>
    </button>`;
}

/**
 * @param {object} node
 * @param {object} flow
 * @param {boolean} catalogBlocked
 */
function renderActivityComponentRow(node, flow, catalogBlocked) {
  const badgeClass = componentKindBadgeClass(node.kind);
  const kindLabel = componentKindLabel(node.kind);
  return `
    <tr class="catalog-row catalog-row--child catalog-row--component" data-activity-flow-child="${escapeHtml(flow.id)}">
      <td class="catalog-name-cell catalog-name-cell--child">
        <span class="catalog-tree-node catalog-tree-node--component">
          <span class="catalog-tree-rail" aria-hidden="true"></span>
          ${renderCatalogComponentIcon(node)}
          <span class="catalog-component-meta">
            <span class="catalog-component-name">${escapeHtml(node.name)}</span>
            <span class="catalog-component-kind-hint">${escapeHtml(kindLabel)}</span>
          </span>
        </span>
      </td>
      <td>—</td>
      <td><span class="badge badge-${badgeClass}">${escapeHtml(kindLabel)}</span></td>
      <td>${escapeHtml(node.description || "—")}</td>
      <td class="catalog-actions">
        ${renderActionButton({ icon: "open", label: "Abrir actividad", disabled: catalogBlocked, data: { "open-activity": flow.id, "node-id": node.id } })}
      </td>
    </tr>`;
}

function renderActivityCatalog(state) {
  const catalogBlocked = isCatalogActionsBlocked();
  const catalogCallout = designerCatalogCalloutHtml();
  const activityFlows = getActivityCatalogFlows(state.flows);

  const flowGroupsHtml = activityFlows
    .map((flow) => {
      const components = listFlowCatalogComponents(flow);
      const expanded = designerContext.catalogExpandedActivityFlows.has(flow.id);
      const childCount = components.length;
      const hasChildren = childCount > 0;
      const toggle = hasChildren
        ? renderActivityTreeToggle(flow.id, expanded, childCount)
        : `<span class="catalog-tree-toggle catalog-tree-toggle--spacer" aria-hidden="true"></span>`;
      const countChip = hasChildren
        ? !expanded
          ? `<span class="catalog-tree-count" title="Componentes del diagrama">${childCount} ${childCount === 1 ? "componente" : "componentes"}</span>`
          : ""
        : `<span class="catalog-tree-count catalog-tree-count--muted" title="Agente IA no se lista en este catálogo">Sin componentes listados</span>`;
      const openFlowBtn = renderActionButton({
        icon: "open",
        label: "Abrir flujo",
        disabled: catalogBlocked,
        data: { "open-flow-only": flow.id },
      });

      const parentRow = `
    <tr class="catalog-row catalog-row--parent catalog-row--activity-flow ${hasChildren ? "catalog-row--has-children" : ""} ${expanded ? "catalog-row--expanded" : "catalog-row--collapsed"}" data-activity-flow-parent="${escapeHtml(flow.id)}">
      <td class="catalog-name-cell">
        <div class="catalog-name-cell-inner">
          ${toggle}
          <span class="catalog-flow-name">${escapeHtml(flow.name)}</span>
          ${countChip}
        </div>
      </td>
      <td>${escapeHtml(flow.type)}</td>
      <td><span class="catalog-version catalog-version--current">${escapeHtml(formatFlowVersion(flow))}</span></td>
      <td>${renderFlowStatusBadge(flow)}</td>
      <td class="catalog-actions">${openFlowBtn}</td>
    </tr>`;

      let childRowsHtml = "";
      if (expanded) {
        if (hasChildren) {
          childRowsHtml = components
            .map((node) => renderActivityComponentRow(node, flow, catalogBlocked))
            .join("");
        } else {
          childRowsHtml = `
    <tr class="catalog-row catalog-row--child catalog-row--empty" data-activity-flow-child="${escapeHtml(flow.id)}">
      <td class="catalog-name-cell catalog-name-cell--child" colspan="5">
        <span class="catalog-tree-node catalog-tree-node--empty">
          <span class="catalog-tree-rail" aria-hidden="true"></span>
          <span class="catalog-muted">Sin componentes listados (Agente IA no aparece en este catálogo).</span>
        </span>
      </td>
    </tr>`;
        }
      }

      const groupState = expanded ? "is-expanded" : "is-collapsed";
      return `<tbody class="catalog-lineage-group catalog-activity-flow-group ${groupState} ${hasChildren ? "has-children" : ""}" data-activity-flow-group="${escapeHtml(flow.id)}">
      ${parentRow}
      ${childRowsHtml}
    </tbody>`;
    })
    .join("");

  const hasFlows = activityFlows.length > 0;

  const emptyBody = !hasFlows
    ? `<div class="empty-state empty-state--rich">
          <strong>Sin flujos para listar</strong>
          <p>Activá un borrador o publicá un flujo en estado Listo. Las versiones deprecadas no aparecen acá.</p>
          <button type="button" class="btn btn-sm" id="btn-goto-flow-catalog">Ir al catálogo de flujos</button>
        </div>`
    : "";

  return `
    <section class="panel panel--catalog">
      ${renderPageHeader(
        "Catálogo de actividades",
        "Flujos en estado Listo o Borrador. Desplegá cada fila para ver Start, End, Gateway y tareas (User/Service). Agente IA no se lista.",
      )}
      ${catalogCallout}
      ${emptyBody}
      ${
        hasFlows
          ? `<div class="table-wrap table-wrap--modern">
        <table class="table-modern catalog-flow-tree catalog-activity-tree">
          <thead>
            <tr><th>Flujo / componente</th><th>Tipo de flujo</th><th>Versión</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          ${flowGroupsHtml}
        </table>
      </div>`
          : ""
      }
    </section>`;
}

function bindActivityCatalog(mainEl, state, persist) {
  mainEl.querySelector("#btn-goto-flow-catalog")?.addEventListener("click", () => {
    designerContext.catalogView = "flows";
    document.querySelector('[data-nav-group="designer"] [data-catalog="flows"]')?.click();
  });

  mainEl.querySelectorAll("[data-toggle-activity-flow]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const flowId = btn.dataset.toggleActivityFlow;
      if (!flowId) return;
      if (designerContext.catalogExpandedActivityFlows.has(flowId)) {
        designerContext.catalogExpandedActivityFlows.delete(flowId);
      } else {
        designerContext.catalogExpandedActivityFlows.add(flowId);
      }
      renderDesigner(mainEl, state, persist);
    });
  });

  mainEl.querySelectorAll("[data-open-flow-only]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.disabled || isCatalogActionsBlocked()) {
        toast(designerBlockedMessage().body);
        return;
      }
      designerContext.selectedFlowId = btn.dataset.openFlowOnly;
      designerContext.selectedNodeId = null;
      renderDesigner(mainEl, state, persist);
    });
  });

  mainEl.querySelectorAll("[data-open-activity]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.disabled || isCatalogActionsBlocked()) {
        toast(designerBlockedMessage().body);
        return;
      }
      const flowId = btn.dataset.openActivity;
      const nodeId = btn.dataset.nodeId;
      const flow = state.flows.find((f) => f.id === flowId);
      const node = flow?.nodes?.find((n) => n.id === nodeId);
      if (!flow || !node || !COMPONENTS_WITH_INPUT_ATTRIBUTES.has(node.kind)) {
        designerContext.selectedFlowId = flowId;
        designerContext.selectedNodeId = nodeId;
        renderDesigner(mainEl, state, persist);
        return;
      }
      enterComponentAttributesEditor(mainEl, state, persist, {
        flowId,
        nodeId,
      });
    });
  });
}

/**
 * @param {FormData} fd
 * @param {object} state
 * @returns {{ flow: object; startId: string } | null}
 */
function buildNewFlowFromForm(fd, state) {
  const flowTypeId = String(fd.get("flowTypeId") ?? "");
  const startId = createId("node");
  const endId = createId("node");
  const flow = {
    id: createId("flow"),
    type: "",
    flowTypeId: null,
    name: String(fd.get("name")).trim(),
    description: String(fd.get("description")).trim(),
    status: "borrador",
    version: null,
    lineageId: null,
    supersedesFlowId: null,
    inputParams: [],
    nodes: [
      {
        id: startId,
        kind: NODE_KINDS.INICIO,
        name: "Start",
        description: "",
        x: 80,
        y: 220,
        usedParamIds: [],
      },
      {
        id: endId,
        kind: NODE_KINDS.FIN,
        name: "End",
        description: "",
        x: 520,
        y: 220,
        usedParamIds: [],
      },
    ],
    transitions: [],
    screens: {},
    lanes: [{ id: createId("lane"), name: "General", height: 220 }],
  };
  if (!applyFlowTypeToFlow(flow, state, flowTypeId)) {
    toast("Seleccioná un tipo de flujo válido.");
    return null;
  }
  if (!flow.name) {
    toast("El nombre del flujo es obligatorio.");
    return null;
  }
  flow.lineageId = flow.id;
  ensureFlowDiagram(flow);
  const laneId = flow.lanes[0].id;
  const layout = getLaneLayout(flow);
  const startNode = flow.nodes.find((n) => n.id === startId);
  const endNode = flow.nodes.find((n) => n.id === endId);
  if (startNode) {
    startNode.laneId = laneId;
    startNode.x = layout.lanes[0].left + 48;
    startNode.y = centerYInLane(flow, laneId, startNode.kind);
  }
  if (endNode) {
    endNode.laneId = laneId;
    endNode.x = layout.lanes[0].left + 320;
    endNode.y = centerYInLane(flow, laneId, endNode.kind);
  }
  return { flow, startId };
}

/**
 * @param {HTMLElement} mainEl
 * @param {object} state
 * @param {() => void} persist
 */
function renderNewFlowHero(mainEl, state, persist) {
  const hasTypes = (state.flowTypes ?? []).length > 0;
  mainEl.innerHTML = `
    <section class="gestion-hero new-flow-hero panel">
      <header class="gestion-hero-header">
        ${renderActionButton({ icon: "back", label: "Volver al catálogo", className: "gestion-hero-back", extraAttrs: "data-new-flow-back" })}
        <div class="gestion-hero-heading">
          <h2>Nuevo flujo</h2>
          <p class="gestion-hero-subtitle">Definí tipo, nombre y descripción. Al crear se abre el lienzo en borrador con Start y End.</p>
        </div>
      </header>
      <div class="new-flow-hero-body">
        <form id="form-new-flow" class="form-grid new-flow-form">
          ${renderFlowTypeFormRow(state, null)}
          <div class="form-row"><label>Nombre</label><input name="name" required autocomplete="off" ${hasTypes ? "" : "disabled"} /></div>
          <div class="form-row"><label>Descripción</label><textarea name="description" rows="4" ${hasTypes ? "" : "disabled"}></textarea></div>
        </form>
      </div>
      <footer class="component-attr-hero-footer">
        <div class="action-icon-group">
          ${renderActionButton({ icon: "cancel", label: "Cancelar", extraAttrs: "data-new-flow-back" })}
          ${renderActionButton({ icon: "add", label: "Crear flujo", variant: "primary", type: "submit", extraAttrs: 'form="form-new-flow"', disabled: !hasTypes })}
        </div>
      </footer>
    </section>`;

  bindFlowTypeGotoButton(mainEl, () => exitNewFlowScreen());

  const goBack = () => {
    exitNewFlowScreen();
    renderDesigner(mainEl, state, persist);
  };
  mainEl.querySelectorAll("[data-new-flow-back]").forEach((btn) => {
    btn.addEventListener("click", goBack);
  });

  mainEl.querySelector("#form-new-flow")?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (isCatalogActionsBlocked()) {
      toast(designerBlockedMessage().body);
      return;
    }
    const fd = new FormData(e.target);
    const built = buildNewFlowFromForm(fd, state);
    if (!built) return;
    const { flow, startId } = built;
    state.flows.push(flow);
    persist();
    exitNewFlowScreen();
    designerContext.selectedFlowId = flow.id;
    designerContext.selectedNodeId = startId;
    designerContext._viewFitForFlowId = null;
    renderDesigner(mainEl, state, persist);
    toast("Flujo creado con Start y End. Elegí un tipo de línea y conectá desde el puerto del nodo.", 3200, "success");
  });

  if (hasTypes) {
    mainEl.querySelector('#form-new-flow input[name="name"]')?.focus();
  }
}

function bindCatalog(mainEl, state, persist) {
  const onNew = () => enterNewFlowScreen(mainEl, state, persist);
  mainEl.querySelector("#btn-new-flow-empty")?.addEventListener("click", onNew);
  mainEl.querySelector("#btn-new-flow-table")?.addEventListener("click", onNew);

  mainEl.querySelectorAll("[data-open-flow]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.disabled || isCatalogActionsBlocked()) {
        toast(designerBlockedMessage().body);
        return;
      }
      designerContext.selectedFlowId = btn.dataset.openFlow;
      designerContext.selectedNodeId = null;
      renderDesigner(mainEl, state, persist);
    });
  });

  mainEl.querySelectorAll("[data-delete-flow]").forEach((btn) => {
    btn.addEventListener("click", () => {
      attemptDeleteFlow(mainEl, state, persist, btn.dataset.deleteFlow);
    });
  });

  mainEl.querySelectorAll("[data-version-flow]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.disabled || isCatalogActionsBlocked()) {
        toast(designerBlockedMessage().body);
        return;
      }
      attemptVersionFlow(mainEl, state, persist, btn.dataset.versionFlow);
    });
  });

  mainEl.querySelectorAll("[data-activate-flow]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.disabled || isCatalogActionsBlocked()) {
        toast(designerBlockedMessage().body);
        return;
      }
      attemptActivateFlow(mainEl, state, persist, btn.dataset.activateFlow, { returnToCatalog: true });
    });
  });

  mainEl.querySelectorAll("[data-toggle-deprecados]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const lineageId = btn.dataset.toggleDeprecados;
      if (!lineageId) return;
      if (designerContext.catalogExpandedLineages.has(lineageId)) {
        designerContext.catalogExpandedLineages.delete(lineageId);
      } else {
        designerContext.catalogExpandedLineages.add(lineageId);
      }
      renderDesigner(mainEl, state, persist);
    });
  });
}

/**
 * Modal con errores de validateFlow antes de activar.
 *
 * @param {HTMLElement} mainEl
 * @param {object} state
 * @param {() => void} persist
 * @param {{ id: string; name?: string }} flow
 * @param {string[]} errors
 */
function openFlowValidationModal(mainEl, state, persist, flow, errors) {
  const items =
    errors.length > 0
      ? errors.map((e) => `<li>${escapeHtml(e)}</li>`).join("")
      : "<li>Validación fallida sin detalle.</li>";

  const { close, root } = openModal(`
    <div class="modal-header">
      <h2>No se puede activar el flujo</h2>
      ${renderModalCloseButton()}
    </div>
    <div class="validation-modal-body">
      <p class="validation-modal-intro">
        <strong>${escapeHtml(flow.name ?? "Flujo")}</strong> está en borrador. Corregí estos problemas antes de pasar a Listo:
      </p>
      <ul class="validation-list validation-modal-list">${items}</ul>
      <div class="validation-modal-actions">
        <div class="action-icon-group">
          ${renderActionButton({ icon: "open", label: "Abrir flujo", variant: "primary", id: "btn-validation-open-flow" })}
          ${renderModalCloseButton()}
        </div>
      </div>
    </div>
  `);

  root.querySelector("#btn-validation-open-flow")?.addEventListener("click", () => {
    designerContext.selectedFlowId = flow.id;
    designerContext.selectedNodeId = null;
    designerContext.studioMode = "path";
    close();
    renderDesigner(mainEl, state, persist);
  });
}

/**
 * @param {{ returnToCatalog?: boolean }} [options]
 */
function attemptActivateFlow(mainEl, state, persist, flowId, options = {}) {
  const flow = state.flows.find((f) => f.id === flowId);
  if (!flow) return;
  if (flow.status !== "borrador") {
    toast("Solo podés activar flujos en borrador.");
    return;
  }
  const v = validateFlow(flow);
  if (!v.isValid) {
    openFlowValidationModal(mainEl, state, persist, flow, v.errors);
    return;
  }
  const result = publishFlow(state.flows, flow.id);
  if (!result.ok) {
    toast(result.error ?? "No se pudo activar el flujo.");
    return;
  }
  persist();
  toast(
    `Estado Listo (${formatFlowVersion(flow)}). Podés instanciarlo en Gestión o versionarlo desde el catálogo.`,
    3200,
    "success",
  );
  if (options.returnToCatalog) {
    enterDesignerCatalog("flows");
  }
  renderDesigner(mainEl, state, persist);
}

function attemptVersionFlow(mainEl, state, persist, flowId) {
  const { flow: draft, error } = createVersionDraft(state.flows, flowId);
  if (error) {
    toast(error);
    return;
  }
  state.flows.push(draft);
  persist();
  designerContext.selectedFlowId = draft.id;
  designerContext.selectedNodeId = null;
  designerContext._viewFitForFlowId = null;
  toast("Borrador creado. Editá y confirmá la versión cuando esté listo.", 3200, "success");
  renderDesigner(mainEl, state, persist);
}

function attemptDeleteFlow(mainEl, state, persist, flowId) {
  const flow = state.flows.find((f) => f.id === flowId);
  if (!flow) return;

  if (flow.status !== "borrador") {
    toast("Solo podés eliminar flujos en borrador.");
    return;
  }

  const activeForFlow = state.instances.some(
    (i) => i.flowId === flowId && i.status === "en_curso",
  );
  if (activeForFlow) {
    toast("Hay instancias en curso de este flujo; completalas antes de eliminar.");
    return;
  }

  const ok = confirm(`¿Eliminar el flujo "${flow.name}"? Esta acción no se puede deshacer.`);
  if (!ok) return;

  state.flows = state.flows.filter((f) => f.id !== flowId);
  if (designerContext.selectedFlowId === flowId) {
    designerContext.selectedFlowId = null;
    designerContext.selectedNodeId = null;
    designerContext.connectClickFrom = null;
  }
  persist();
  toast("Flujo eliminado.");
  renderDesigner(mainEl, state, persist);
}

/**
 * Bloque colapsable reutilizable (paleta y propiedades).
 *
 * @param sectionId - Identificador estable
 * @param title - Etiqueta del summary
 * @param bodyHtml - Contenido
 * @param isOpen - Expandido por defecto
 * @param extraClass - Clases CSS adicionales
 */
function renderUiCollapse(sectionId, title, bodyHtml, isOpen = false, extraClass = "") {
  return `
    <details class="props-collapse ui-collapse ${extraClass}" data-ui-section="${sectionId}" ${isOpen ? "open" : ""}>
      <summary class="props-collapse-summary">${escapeHtml(title)}</summary>
      <div class="props-collapse-body">${bodyHtml}</div>
    </details>`;
}

function renderPropsCollapse(sectionId, title, bodyHtml, isOpen = false) {
  return `
    <details class="props-collapse ui-collapse props-section-collapse" data-props-section="${sectionId}" data-ui-section="${sectionId}" ${isOpen ? "open" : ""}>
      <summary class="props-collapse-summary">${escapeHtml(title)}</summary>
      <div class="props-collapse-body">${bodyHtml}</div>
    </details>`;
}

function renderPaletteActivitiesBody() {
  return `
        <button type="button" class="palette-tool palette-select ${designerContext.tool === "select" ? "is-tool-active" : ""}" data-tool="select">
          <span class="palette-shape-icon icon-select" aria-hidden="true"></span>
          <span>Seleccionar</span>
        </button>
        <div class="palette-row palette-item palette-inicio" draggable="true" data-palette="inicio">
          <span class="palette-shape-icon icon-start" aria-hidden="true"></span>
          <span>Start Event</span>
        </div>
        <div class="palette-row palette-item palette-task palette-task-toggle">
          <span class="palette-shape-icon icon-task" aria-hidden="true"></span>
          <span>Task</span>
          <button type="button" class="palette-chevron" id="palette-task-menu-btn" aria-expanded="false" aria-label="Tipos de task">▾</button>
        </div>
        <div class="palette-submenu" id="palette-task-submenu" hidden>
          <div class="palette-row palette-item palette-manual" draggable="true" data-palette="manual">
            <span class="palette-kind-icon" aria-hidden="true">👤</span>
            <span>User Task</span>
          </div>
          <div class="palette-row palette-item palette-auto" draggable="true" data-palette="automatica">
            <span class="palette-kind-icon" aria-hidden="true">⚙</span>
            <span>Service Task</span>
          </div>
          <div class="palette-row palette-item palette-agente-ia" draggable="true" data-palette="agente_ia">
            <span class="palette-kind-icon" aria-hidden="true">✨</span>
            <span>Agente IA</span>
          </div>
        </div>
        <div class="palette-row palette-item palette-gateway palette-gateway-toggle">
          ${renderGatewayTypeIcon(GATEWAY_TYPES.EXCLUSIVE)}
          <span>Gateway</span>
          <button type="button" class="palette-chevron" id="palette-gateway-menu-btn" aria-expanded="false" aria-label="Tipos de compuerta">▾</button>
        </div>
        <div class="palette-submenu" id="palette-gateway-submenu" hidden>
          ${renderPaletteGatewaySubmenu()}
        </div>
        <div class="palette-row palette-item palette-fin" draggable="true" data-palette="fin">
          <span class="palette-shape-icon icon-end" aria-hidden="true"></span>
          <span>End Event</span>
        </div>`;
}

function renderPaletteLinesBody() {
  return `
        <button type="button" class="palette-tool palette-line-tool ${designerContext.tool === "sequenceFlow" ? "is-tool-active" : ""}" data-tool="sequenceFlow">
          <span class="palette-line-icon icon-line-sequence" aria-hidden="true"></span>
          <span>Sequence Flow</span>
        </button>
        <button type="button" class="palette-tool palette-line-tool ${designerContext.tool === "messageFlow" ? "is-tool-active" : ""}" data-tool="messageFlow">
          <span class="palette-line-icon icon-line-message" aria-hidden="true"></span>
          <span>Message Flow</span>
        </button>
        <button type="button" class="palette-tool palette-line-tool ${designerContext.tool === "association" ? "is-tool-active" : ""}" data-tool="association">
          <span class="palette-line-icon icon-line-association" aria-hidden="true"></span>
          <span>Association</span>
        </button>`;
}

function renderPropsPanelShell(flow, selected) {
  return `
        <div class="designer-panel-head">
          <h3 class="panel-title">Propiedades</h3>
          <button type="button" class="btn btn-sm designer-panel-close" data-designer-close="props" aria-label="Cerrar propiedades">×</button>
        </div>
        <div class="props-panel-scroll" id="props-panel-scroll">
          ${selected ? renderNodeProps(flow, selected) : renderFlowDiagramProps(flow)}
        </div>`;
}

function designerSplitClassNames() {
  const parts = ["split", "split-designer"];
  if (designerContext.mobilePaletteOpen) parts.push("is-palette-open");
  if (designerContext.mobilePropsOpen) parts.push("is-props-open");
  if (designerContext.copilotOpen) parts.push("is-copilot-open");
  if (designerContext.readOnly) parts.push("is-read-only");
  return parts.join(" ");
}

function renderFlowEditor(flow) {
  ensureFlowDiagram(flow);
  const validation = validateFlow(flow);
  const selected = flow.nodes.find((n) => n.id === designerContext.selectedNodeId);
  const layout = getLaneLayout(flow);
  const { zoom, panX, panY } = designerContext.view;

  return `
    ${renderDesignerViewportBannerHtml()}
    ${selected ? renderStudioToolbar(flow.name, selected, "path") : ""}
    <div class="toolbar toolbar--designer">
      <div class="toolbar-group action-icon-group">
        ${renderActionButton({ icon: "back", label: "Volver al catálogo", id: "btn-back-catalog", className: "action-icon-btn--ghost" })}
      </div>
      <span class="toolbar-divider" aria-hidden="true"></span>
      <span class="toolbar-flow-title">${escapeHtml(flow.name)} ${renderFlowStatusBadge(flow)} <span class="toolbar-flow-version">${escapeHtml(formatFlowVersion(flow))}</span></span>
      <span class="toolbar-divider" aria-hidden="true"></span>
      <div class="toolbar-group action-icon-group">
        ${renderActionButton({ icon: "meta", label: "Metadatos del flujo", id: "btn-flow-meta", disabled: designerContext.readOnly })}
        ${
          flow.status === "borrador"
            ? `${renderActionButton({ icon: "activate", label: "Activar flujo", variant: "success", id: "btn-confirm-version" })}${renderActionButton({ icon: "delete", label: "Eliminar flujo", variant: "danger", id: "btn-delete-flow" })}`
            : ""
        }
        ${
          flow.status === "listo"
            ? renderActionButton({ icon: "version", label: "Versionar flujo", id: "btn-versionar" })
            : ""
        }
      </div>
      <span class="toolbar-divider" aria-hidden="true"></span>
      <div class="toolbar-group action-icon-group">
        ${renderActionButton({ icon: "sparkles", label: "Copilot IA", id: "btn-toggle-copilot" })}
      </div>
    </div>
    ${validation.isValid ? "" : `<ul class="validation-list">${validation.errors.map((e) => `<li>${escapeHtml(e)}</li>`).join("")}</ul>`}
    ${
      designerContext.readOnly
        ? `<p class="flow-readonly-banner" role="status">Vista de solo lectura. ${escapeHtml(designerReadOnlyMessage(flow))}</p>`
        : flow.supersedesFlowId
          ? `<p class="flow-draft-banner" role="status">Borrador de nueva versión. Al confirmar, reemplazará la versión publicada anterior (quedará deprecada).</p>`
          : ""
    }
    <div class="${designerSplitClassNames()}" id="designer-split">
      <aside class="panel palette designer-side-panel" id="designer-palette-panel">
        <div class="designer-panel-head">
          <h3 class="panel-title">Elementos BPMN</h3>
          <button type="button" class="btn btn-sm designer-panel-close" data-designer-close="palette" aria-label="Cerrar elementos">×</button>
        </div>
        <div class="palette-panel-scroll">
          ${renderUiCollapse("palette-activities", "Eventos y actividades", renderPaletteActivitiesBody(), false, "palette-section-collapse")}
          ${renderUiCollapse("palette-lines", "Líneas", renderPaletteLinesBody(), false, "palette-section-collapse")}
          <p class="palette-hint">Expandí cada sección para ver elementos. Conectá con el punto del borde derecho (arrastrar) o «Conectar» en el menú del nodo.</p>
        </div>
      </aside>
      <div class="canvas-wrap" id="canvas-wrap">
        <div class="canvas-view-toolbar" role="toolbar" aria-label="Vista del lienzo">
          <div class="designer-panel-toggles" role="group" aria-label="Paneles del diseñador">
            <button type="button" class="btn btn-sm ${designerContext.mobilePaletteOpen ? "is-toggle-active" : ""}" id="btn-mobile-palette">Elementos</button>
            <button type="button" class="btn btn-sm ${designerContext.mobilePropsOpen ? "is-toggle-active" : ""}" id="btn-mobile-props">Propiedades</button>
          </div>
          <button type="button" class="btn btn-sm" id="btn-zoom-out" title="Alejar">Zoom −</button>
          <button type="button" class="btn btn-sm" id="btn-zoom-in" title="Acercar">Zoom +</button>
          <span class="canvas-zoom-label" id="canvas-zoom-label">${Math.round(zoom * 100)}%</span>
          <button type="button" class="btn btn-sm" id="btn-zoom-100">100%</button>
          <button type="button" class="btn btn-sm" id="btn-zoom-fit">Ajustar</button>
          <button type="button" class="btn btn-sm" id="btn-canvas-fullscreen">Pantalla completa</button>
        </div>
        <div class="canvas-viewport" id="canvas-viewport">
          <div class="canvas-stage" id="canvas-stage" style="transform: translate(${panX}px, ${panY}px) scale(${zoom}); transform-origin: 0 0">
            <div class="canvas" id="flow-canvas" style="min-width:${layout.canvasMinWidth}px;min-height:${layout.canvasMinHeight}px">
              ${renderFlowPoolMarkup(flow)}
              <svg class="connections" id="connections-svg"></svg>
              ${flow.nodes.map((n) => renderNode(n, n.id === designerContext.selectedNodeId)).join("")}
            </div>
          </div>
        </div>
      </div>
      <aside class="panel props-panel designer-side-panel" id="props-panel">
        ${renderPropsPanelShell(flow, selected)}
      </aside>
      <aside class="panel copilot-panel designer-side-panel" id="copilot-panel">
        <div class="designer-panel-head">
          <h3 class="panel-title">✨ Copilot (Mock)</h3>
          <button type="button" class="btn btn-sm designer-panel-close" data-designer-close="copilot" aria-label="Cerrar Copilot">×</button>
        </div>
        <div class="copilot-chat" id="copilot-chat">
          <div class="copilot-message copilot-message--ai">
            ¡Hola! Soy tu asistente de diseño. ¿Qué flujo querés armar o modificar?
          </div>
        </div>
        <form id="form-copilot" class="copilot-input-area">
          <input name="prompt" placeholder="Ej: Agregá un paso de revisión..." autocomplete="off" />
          <button type="submit" class="btn btn-sm btn-primary">Enviar</button>
        </form>
      </aside>
    </div>`;
}

function nodeBox(node) {
  return getNodeBox(node.kind);
}

function nodePortOut(node, condition = null) {
  const box = nodeBox(node);
  const baseX = node.x + box.w;
  const midY = node.y + box.h / 2;
  if (node.kind === NODE_KINDS.GATEWAY && condition === "aceptar") {
    return { x: baseX, y: node.y + box.h * 0.3 };
  }
  if (node.kind === NODE_KINDS.GATEWAY && condition === "rechazar") {
    return { x: baseX, y: node.y + box.h * 0.7 };
  }
  return { x: baseX, y: midY };
}

function nodePortIn(node) {
  const box = nodeBox(node);
  return { x: node.x, y: node.y + box.h / 2 };
}

function nodeAnchor(node) {
  const box = nodeBox(node);
  return {
    x: node.x + box.w / 2,
    y: node.y + box.h / 2,
    w: box.w,
    h: box.h,
  };
}

function lineTypeLabel(lineType) {
  if (lineType === LINE_TYPES.MESSAGE) return "Message";
  if (lineType === LINE_TYPES.ASSOCIATION) return "Association";
  return "Sequence";
}

const PAD_GAP = 80;
/** Margen del pad + ancho aprox. (icono + descriptor) para que el nodo nuevo no quede bajo el pad. */
const CONTEXT_PAD_RESERVE = 118;

function contextPadLabel(text) {
  return `<span class="context-pad-label">${escapeHtml(text)}</span>`;
}

/** Task genérica BPMN (actividad sin distinguir User/Service). */
function renderGenericTaskIcon() {
  return `<span class="palette-shape-icon icon-task" aria-hidden="true"></span>`;
}

/** Persona / engranaje solo en ítems User Task y Service Task. */
function renderTaskKindGlyph(kind) {
  const glyph = kind === NODE_KINDS.AUTOMATICA ? "⚙" : "👤";
  return `<span class="context-pad-kind-icon" aria-hidden="true">${glyph}</span>`;
}

/** @param {string} gatewayTypeId */
function gatewayMarkClass(gatewayTypeId) {
  const marks = {
    [GATEWAY_TYPES.PARALLEL]: "gateway-mark-parallel",
    [GATEWAY_TYPES.EXCLUSIVE]: "gateway-mark-exclusive",
    [GATEWAY_TYPES.INCLUSIVE]: "gateway-mark-inclusive",
    [GATEWAY_TYPES.EVENT_BASED]: "gateway-mark-event",
    [GATEWAY_TYPES.EVENT_BASED_EXCLUSIVE]: "gateway-mark-event-exclusive",
    [GATEWAY_TYPES.EVENT_BASED_PARALLEL]: "gateway-mark-event-parallel",
    [GATEWAY_TYPES.COMPLEX]: "gateway-mark-complex",
  };
  return marks[gatewayTypeId] ?? "gateway-mark-exclusive";
}

/** @param {string} gatewayTypeId */
function renderGatewayTypeIcon(gatewayTypeId) {
  const mark = gatewayMarkClass(gatewayTypeId);
  return `<span class="icon-gateway-diamond" aria-hidden="true"><span class="gateway-mark ${mark}"></span></span>`;
}

/** @param {string} gatewayTypeId */
function gatewayTypeLabel(gatewayTypeId) {
  return GATEWAY_TYPE_CATALOG.find((e) => e.id === gatewayTypeId)?.label ?? "Compuerta";
}

function renderPaletteGatewaySubmenu() {
  return GATEWAY_TYPE_CATALOG.map((entry) => {
    if (entry.enabled) {
      return `
        <div class="palette-row palette-item palette-gateway" draggable="true" data-palette="gateway" data-gateway-type="${entry.id}">
          ${renderGatewayTypeIcon(entry.id)}
          <span>${escapeHtml(entry.label)}</span>
        </div>`;
    }
    return `
        <div class="palette-row palette-item palette-item-future" data-gateway-future="${entry.id}" aria-disabled="true">
          ${renderGatewayTypeIcon(entry.id)}
          <span>${escapeHtml(entry.label)}</span>
          <span class="future-badge">Futuro</span>
        </div>`;
  }).join("");
}

function renderGatewayTypePickerHtml(selectedTypeId) {
  const current = selectedTypeId ?? DEFAULT_GATEWAY_TYPE;
  const lock = designerContext.readOnly ? " disabled" : "";
  const rows = GATEWAY_TYPE_CATALOG.map(
    (entry) => `
    <label class="gateway-type-option ${entry.enabled ? "" : "gateway-type-option-future"}">
      <input type="radio" name="gatewayType" value="${entry.id}" ${entry.id === current ? "checked" : ""} ${entry.enabled && !designerContext.readOnly ? "" : "disabled"}${lock} />
      ${renderGatewayTypeIcon(entry.id)}
      <span>${escapeHtml(entry.label)}</span>
      ${entry.enabled ? "" : `<span class="future-badge">Futuro</span>`}
    </label>`,
  ).join("");
  return `
    <p class="props-intro">Solo la <strong>Compuerta Exclusiva</strong> está disponible en el mock. Las demás se habilitarán en versiones futuras.</p>
    <div class="gateway-type-list">${rows}</div>`;
}

function ensureFlowDiagram(flow) {
  if (!flow.lanes?.length) {
    flow.lanes = [{ id: createId("lane"), name: "General", height: LANE_MIN_H }];
  }
  for (const lane of flow.lanes) {
    if (!lane.height) lane.height = LANE_MIN_H;
  }
  const defaultLaneId = flow.lanes[0].id;
  for (const node of flow.nodes ?? []) {
    if (!node.laneId) node.laneId = defaultLaneId;
  }
}

/** @returns Geometría del pool y lanes en coordenadas del canvas lógico. */
function getLaneLayout(flow) {
  ensureFlowDiagram(flow);
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1280;
  return computeLaneLayout(flow, { viewportWidth });
}

/** Invalida encuadre / sync de lanes si cambió el ancho lógico del pool. */
function syncDesignerLayoutViewport(mainEl, flow, persist) {
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1280;
  if (designerContext._layoutViewportWidth === viewportWidth) return;
  designerContext._layoutViewportWidth = viewportWidth;
  designerContext._viewFitForFlowId = null;
  designerContext._laneSyncForFlowId = null;
  ensureFlowDiagram(flow);
  let changed = false;
  for (const node of flow.nodes) {
    const before = `${node.x},${node.y},${node.laneId}`;
    snapNodeToLane(flow, node, { updateLaneFromY: true });
    if (node.kind === NODE_KINDS.INICIO || node.kind === NODE_KINDS.FIN) {
      clampFlowEventNode(flow, node);
    }
    const after = `${node.x},${node.y},${node.laneId}`;
    if (before !== after) changed = true;
  }
  if (changed) persist();
  designerContext._layoutViewportWidth = viewportWidth;
  if (mainEl.querySelector("#flow-canvas")) {
    drawConnections(mainEl, flow);
  }
}

function findLaneIdAtCenterY(flow, centerY) {
  const layout = getLaneLayout(flow);
  for (const lane of layout.lanes) {
    if (centerY >= lane.top && centerY < lane.top + lane.height) return lane.id;
  }
  let best = layout.lanes[0]?.id;
  let bestDist = Infinity;
  for (const lane of layout.lanes) {
    const mid = lane.top + lane.height / 2;
    const d = Math.abs(centerY - mid);
    if (d < bestDist) {
      bestDist = d;
      best = lane.id;
    }
  }
  return best;
}

function centerYInLane(flow, laneId, kind) {
  const layout = getLaneLayout(flow);
  const lane = layout.laneById[laneId] ?? layout.lanes[0];
  const box = nodeBox({ kind });
  return lane.top + Math.max(LANE_PAD, (lane.height - box.h) / 2);
}

/**
 * Ajusta laneId y posición del nodo dentro de la franja del lane.
 *
 * @param options.updateLaneFromY - si true, infiere lane por centro vertical
 */
function snapNodeToLane(flow, node, options = { updateLaneFromY: true }) {
  if (!node) return;
  const box = nodeBox(node);
  const layout = getLaneLayout(flow);
  if (options.updateLaneFromY) {
    const centerY = node.y + box.h / 2;
    node.laneId = findLaneIdAtCenterY(flow, centerY);
  }
  const lane = getLaneBand(layout, node.laneId);
  if (!lane) return;
  node.laneId = lane.id;
  const { minX, maxX, minY, maxY } = getNodePlacementBounds(node, lane);
  node.x = Math.min(Math.max(minX, node.x), maxX);
  node.y = Math.min(Math.max(minY, node.y), maxY);
}

/**
 * Mantiene Start/End Event dentro del pool (banda del lane).
 *
 * @param {object} flow
 * @param {object} node
 */
function clampFlowEventNode(flow, node) {
  if (node.kind !== NODE_KINDS.INICIO && node.kind !== NODE_KINDS.FIN) return;
  snapNodeToLane(flow, node, { updateLaneFromY: true });
  const layout = getLaneLayout(flow);
  const box = nodeBox(node);
  const centerY = node.y + box.h / 2;
  const inLane = layout.lanes.some((l) => centerY >= l.top && centerY < l.top + l.height);
  if (!inLane) {
    const laneId = findLaneIdAtCenterY(flow, centerY);
    node.laneId = laneId;
    node.y = centerYInLane(flow, laneId, node.kind);
    snapNodeToLane(flow, node, { updateLaneFromY: false });
  }
}

function removeLaneFromFlow(flow, laneId) {
  if (flow.lanes.length <= 1) {
    toast("Debe quedar al menos un lane.");
    return false;
  }
  const fallback = flow.lanes.find((l) => l.id !== laneId)?.id;
  flow.lanes = flow.lanes.filter((l) => l.id !== laneId);
  for (const node of flow.nodes) {
    if (node.laneId === laneId) node.laneId = fallback;
  }
  return true;
}

function deleteFlowTransitionById(flow, transitionId) {
  const len = flow.transitions.length;
  flow.transitions = flow.transitions.filter((t) => t.id !== transitionId);
  return flow.transitions.length < len;
}

function renderFlowPoolMarkup(flow) {
  const layout = getLaneLayout(flow);
  const canRemoveLane = !designerContext.readOnly && flow.lanes.length > 1;
  const lanesHtml = layout.lanes
    .map(
      (lane) => `
    <div class="flow-lane" data-lane-id="${lane.id}" style="height:${lane.height}px">
      <div class="flow-lane-title" title="Rol, grupo o perfil">
        ${
          canRemoveLane
            ? `<button type="button" class="flow-lane-remove" data-remove-lane-canvas="${lane.id}" aria-label="Eliminar lane" title="Eliminar lane">×</button>`
            : ""
        }
        <span class="flow-lane-title-text">${escapeHtml(lane.name)}</span>
      </div>
      <div class="flow-lane-content" aria-hidden="true"></div>
    </div>`,
    )
    .join("");
  return `
    <div class="flow-pool" style="width:${layout.poolWidth}px;height:${layout.poolHeight}px" aria-label="Pool del diagrama">
      <div class="flow-pool-name">${escapeHtml(flow.name)}</div>
      <div class="flow-pool-body">${lanesHtml}</div>
    </div>`;
}

function clientToCanvas(mainEl, clientX, clientY) {
  const viewport = mainEl.querySelector("#canvas-viewport");
  if (!viewport) return { x: 0, y: 0 };
  const rect = viewport.getBoundingClientRect();
  const { zoom, panX, panY } = designerContext.view;
  return {
    x: (clientX - rect.left - panX) / zoom,
    y: (clientY - rect.top - panY) / zoom,
  };
}

function applyCanvasViewTransform(mainEl) {
  const stage = mainEl.querySelector("#canvas-stage");
  if (!stage) return;
  const { zoom, panX, panY } = designerContext.view;
  stage.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
  const label = mainEl.querySelector("#canvas-zoom-label");
  if (label) label.textContent = `${Math.round(zoom * 100)}%`;
}

function getDiagramBounds(flow) {
  const layout = getLaneLayout(flow);
  let minX = layout.poolLeft;
  let minY = layout.poolTop;
  let maxX = layout.poolLeft + layout.poolWidth;
  let maxY = layout.poolTop + layout.poolHeight;
  for (const node of flow.nodes) {
    const b = nodeBox(node);
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + b.w);
    maxY = Math.max(maxY, node.y + b.h);
  }
  return { minX, minY, maxX, maxY };
}

function fitCanvasToView(mainEl, flow) {
  const viewport = mainEl.querySelector("#canvas-viewport");
  if (!viewport) return;
  const { minX, minY, maxX, maxY } = getDiagramBounds(flow);
  const pad = 32;
  const margin = 24;
  const contentW = maxX - minX + pad * 2;
  const contentH = maxY - minY + pad * 2;
  const vr = viewport.getBoundingClientRect();
  if (vr.width <= 0 || vr.height <= 0) return;
  const zoom = Math.min(
    (vr.width - margin * 2) / contentW,
    (vr.height - margin * 2) / contentH,
    3,
  );
  designerContext.view.zoom = Math.max(0.25, zoom);
  const scaledW = contentW * designerContext.view.zoom;
  const scaledH = contentH * designerContext.view.zoom;
  designerContext.view.panX =
    (vr.width - scaledW) / 2 - (minX - pad) * designerContext.view.zoom;
  designerContext.view.panY =
    (vr.height - scaledH) / 2 - (minY - pad) * designerContext.view.zoom;
  applyCanvasViewTransform(mainEl);
}

function renderFlowDiagramProps(flow) {
  ensureFlowDiagram(flow);
  const ro = propsReadonlyAttrs();
  const lanesHtml = flow.lanes
    .map(
      (lane) => `
    <div class="lane-editor-row" data-lane-row="${lane.id}">
      <input type="text" class="lane-name-input" data-lane-id="${lane.id}" value="${escapeHtml(lane.name)}" placeholder="Rol, grupo o perfil" aria-label="Nombre de lane"${ro} />
      ${!designerContext.readOnly && flow.lanes.length > 1 ? `<button type="button" class="btn btn-sm btn-danger" data-remove-lane="${lane.id}" aria-label="Quitar lane">×</button>` : ""}
    </div>`,
    )
    .join("");
  const body = `
    <p class="props-intro">El <strong>pool</strong> muestra el nombre del flujo. Cada <strong>lane</strong> representa un rol, grupo o perfil.</p>
    ${designerContext.readOnly ? `<p class="props-intro props-intro--readonly">${escapeHtml(designerReadOnlyMessage(flow))}</p>` : ""}
    <div class="form-row"><label>Pool (nombre del flujo)</label><input id="flow-pool-name" value="${escapeHtml(flow.name)}" readonly title="Editá el nombre en Metadatos" /></div>
    <h4 class="props-subtitle">Lanes</h4>
    ${lanesHtml}
    ${designerContext.readOnly ? "" : `<button type="button" class="btn btn-sm" id="btn-add-lane" style="margin-top:0.5rem">+ Agregar lane</button>`}`;
  return `<div class="flow-diagram-props">${renderPropsCollapse("pool-lanes", "Pool y lanes", body, true)}</div>`;
}

function contextPadTaskMenuKey(nodeId, condition) {
  return `${nodeId}:${condition}`;
}

function contextPadGatewayMenuKey(nodeId, condition) {
  return `${nodeId}:gw:${condition}`;
}

function getContextPadAppendActions(node) {
  const taskMenu = (condition) => ({ type: "taskMenu", condition });
  const gatewayMenu = (condition) => ({ type: "gatewayMenu", condition });
  const append = (kind, condition, icon, title) => ({
    type: "append",
    kind,
    condition,
    icon,
    title,
  });

  switch (node.kind) {
    case NODE_KINDS.INICIO:
      return [
        taskMenu("siempre"),
        gatewayMenu("siempre"),
        append(NODE_KINDS.FIN, "siempre", "icon-end", "End Event"),
      ];
    case NODE_KINDS.MANUAL:
      return [
        gatewayMenu("siempre"),
        taskMenu("siempre"),
        append(NODE_KINDS.FIN, "siempre", "icon-end", "End Event"),
      ];
    case NODE_KINDS.AUTOMATICA:
      return [
        taskMenu("siempre"),
        gatewayMenu("siempre"),
        append(NODE_KINDS.FIN, "siempre", "icon-end", "End Event"),
      ];
    case NODE_KINDS.AGENTE_IA:
      return [
        gatewayMenu("siempre"),
        taskMenu("siempre"),
        append(NODE_KINDS.FIN, "siempre", "icon-end", "End Event"),
      ];
    case NODE_KINDS.GATEWAY:
      return [
        taskMenu("aceptar"),
        append(NODE_KINDS.FIN, "aceptar", "icon-end", "End Event"),
        taskMenu("rechazar"),
        append(NODE_KINDS.FIN, "rechazar", "icon-end", "End Event"),
      ];
    default:
      return [];
  }
}

function renderContextPadTaskMenuBlock(node, condition) {
  const menuKey = contextPadTaskMenuKey(node.id, condition);
  const isOpen = designerContext.contextPadOpenTaskMenu === menuKey;
  const branchBadge =
    condition !== "siempre"
      ? `<span class="context-pad-branch">${condition === "aceptar" ? "A" : "R"}</span>`
      : "";
  const branchTitle =
    condition !== "siempre" ? ` (${condition})` : "";

  return `
    <div class="context-pad-task-block" data-task-menu-block="${menuKey}">
      <div class="context-pad-task-row">
        <button type="button" class="context-pad-btn context-pad-task-main" data-context-task-append data-append-condition="${condition}" title="User Task${branchTitle} (clic rápido)">
          ${renderGenericTaskIcon()}
          ${contextPadLabel("Task")}
          ${branchBadge}
        </button>
        <button type="button" class="context-pad-chevron" data-context-task-toggle data-task-menu-key="${menuKey}" aria-expanded="${isOpen ? "true" : "false"}" aria-label="Elegir User Task o Service Task">▾</button>
      </div>
      <div class="context-pad-submenu" ${isOpen ? "" : "hidden"} data-task-submenu-key="${menuKey}">
        <button type="button" class="context-pad-btn context-pad-submenu-btn" data-append-kind="${NODE_KINDS.MANUAL}" data-append-condition="${condition}" title="User Task${branchTitle}">
          ${renderTaskKindGlyph(NODE_KINDS.MANUAL)}
          ${contextPadLabel("User Task")}
        </button>
        <button type="button" class="context-pad-btn context-pad-submenu-btn" data-append-kind="${NODE_KINDS.AUTOMATICA}" data-append-condition="${condition}" title="Service Task${branchTitle}">
          ${renderTaskKindGlyph(NODE_KINDS.AUTOMATICA)}
          ${contextPadLabel("Service Task")}
        </button>
      </div>
    </div>`;
}

function renderContextPadGatewayMenuBlock(node, condition) {
  const menuKey = contextPadGatewayMenuKey(node.id, condition);
  const isOpen = designerContext.contextPadOpenGatewayMenu === menuKey;
  const branchBadge =
    condition !== "siempre"
      ? `<span class="context-pad-branch">${condition === "aceptar" ? "A" : "R"}</span>`
      : "";
  const branchTitle = condition !== "siempre" ? ` (${condition})` : "";
  const submenuItems = GATEWAY_TYPE_CATALOG.map((entry) => {
    if (entry.enabled) {
      return `
        <button type="button" class="context-pad-btn context-pad-submenu-btn" data-append-kind="${NODE_KINDS.GATEWAY}" data-gateway-type="${entry.id}" data-append-condition="${condition}" title="${escapeHtml(entry.label)}${branchTitle}">
          ${renderGatewayTypeIcon(entry.id)}
          ${contextPadLabel(entry.label.replace(/^Compuerta /, ""))}
        </button>`;
    }
    return `
        <button type="button" class="context-pad-btn context-pad-submenu-btn context-pad-btn-future" data-gateway-future="${entry.id}" disabled title="Próximamente: ${escapeHtml(entry.label)}">
          ${renderGatewayTypeIcon(entry.id)}
          ${contextPadLabel(entry.label.replace(/^Compuerta /, ""))}
          <span class="future-badge">Futuro</span>
        </button>`;
  }).join("");

  return `
    <div class="context-pad-gateway-block" data-gateway-menu-block="${menuKey}">
      <div class="context-pad-task-row">
        <button type="button" class="context-pad-btn context-pad-gateway-main" data-context-gateway-append data-append-condition="${condition}" data-gateway-type="${GATEWAY_TYPES.EXCLUSIVE}" title="Compuerta Exclusiva${branchTitle} (clic rápido)">
          ${renderGatewayTypeIcon(GATEWAY_TYPES.EXCLUSIVE)}
          ${contextPadLabel("Gateway")}
          ${branchBadge}
        </button>
        <button type="button" class="context-pad-chevron" data-context-gateway-toggle data-gateway-menu-key="${menuKey}" aria-expanded="${isOpen ? "true" : "false"}" aria-label="Elegir tipo de compuerta">▾</button>
      </div>
      <div class="context-pad-submenu" ${isOpen ? "" : "hidden"} data-gateway-submenu-key="${menuKey}">
        ${submenuItems}
      </div>
    </div>`;
}

function renderContextPadAppendEntry(node, entry) {
  if (entry.type === "taskMenu") {
    return renderContextPadTaskMenuBlock(node, entry.condition);
  }
  if (entry.type === "gatewayMenu") {
    return renderContextPadGatewayMenuBlock(node, entry.condition);
  }
  const condSuffix = entry.condition !== "siempre" ? ` (${entry.condition})` : "";
  const shortLabel =
    entry.kind === NODE_KINDS.GATEWAY
      ? "Gateway"
      : entry.kind === NODE_KINDS.FIN
        ? "End Event"
        : entry.title;
  return `
    <button type="button" class="context-pad-btn" data-append-kind="${entry.kind}" data-append-condition="${entry.condition}" title="${escapeHtml(entry.title)}${condSuffix}">
      <span class="palette-shape-icon ${entry.icon}" aria-hidden="true"></span>
      ${contextPadLabel(shortLabel)}
      ${entry.condition !== "siempre" ? `<span class="context-pad-branch">${entry.condition === "aceptar" ? "A" : "R"}</span>` : ""}
    </button>`;
}

function syncContextPadGatewayMenuDom(canvas) {
  if (!canvas) return;
  const openKey = designerContext.contextPadOpenGatewayMenu;
  canvas.querySelectorAll("[data-gateway-submenu-key]").forEach((sub) => {
    if (sub.dataset.gatewaySubmenuKey === openKey) sub.removeAttribute("hidden");
    else sub.setAttribute("hidden", "");
  });
  canvas.querySelectorAll("[data-context-gateway-toggle]").forEach((btn) => {
    btn.setAttribute("aria-expanded", btn.dataset.gatewayMenuKey === openKey ? "true" : "false");
  });
}

function syncContextPadTaskMenuDom(canvas) {
  if (!canvas) return;
  const openKey = designerContext.contextPadOpenTaskMenu;
  canvas.querySelectorAll("[data-task-submenu-key]").forEach((sub) => {
    if (sub.dataset.taskSubmenuKey === openKey) sub.removeAttribute("hidden");
    else sub.setAttribute("hidden", "");
  });
  canvas.querySelectorAll("[data-context-task-toggle]").forEach((btn) => {
    btn.setAttribute("aria-expanded", btn.dataset.taskMenuKey === openKey ? "true" : "false");
  });
}

function closeContextPadTaskMenus(canvas) {
  designerContext.contextPadOpenTaskMenu = null;
  syncContextPadTaskMenuDom(canvas);
}

function closeContextPadGatewayMenus(canvas) {
  designerContext.contextPadOpenGatewayMenu = null;
  syncContextPadGatewayMenuDom(canvas);
}

function closeContextPadSubmenus(canvas) {
  closeContextPadTaskMenus(canvas);
  closeContextPadGatewayMenus(canvas);
}

/**
 * Elimina un nodo del flujo y sus transiciones/pantallas asociadas.
 *
 * @returns true si se eliminó
 */
function deleteFlowNode(flow, nodeId) {
  const node = flow.nodes.find((n) => n.id === nodeId);
  if (!node) return false;
  if (node.kind === NODE_KINDS.INICIO) {
    toast("No podés eliminar el Start Event.");
    return false;
  }
  flow.nodes = flow.nodes.filter((n) => n.id !== nodeId);
  flow.transitions = flow.transitions.filter((t) => t.fromId !== nodeId && t.toId !== nodeId);
  delete flow.screens[nodeId];
  return true;
}

function renderFlowPorts(node, isSelected) {
  if (!isSelected || designerContext.readOnly || node.kind === NODE_KINDS.FIN) return "";

  if (node.kind === NODE_KINDS.GATEWAY) {
    return `
      <button type="button" class="flow-port flow-port-accept" data-condition="aceptar" style="top:30%" title="Arrastrá para conectar (aceptar)" aria-label="Conectar rama aceptar"></button>
      <button type="button" class="flow-port flow-port-reject" data-condition="rechazar" style="top:70%" title="Arrastrá para conectar (rechazar)" aria-label="Conectar rama rechazar"></button>`;
  }

  return `<button type="button" class="flow-port" data-condition="siempre" title="Arrastrá para conectar" aria-label="Conectar"></button>`;
}

function renderContextPadConnectButtons(node) {
  if (designerContext.readOnly || node.kind === NODE_KINDS.FIN) return "";

  if (node.kind === NODE_KINDS.GATEWAY) {
    return `
      <button type="button" class="context-pad-btn context-pad-connect" data-context-connect data-connect-condition="aceptar" title="Conectar con elemento existente (aceptar)">
        ${contextPadLabel("Conectar A")}
      </button>
      <button type="button" class="context-pad-btn context-pad-connect" data-context-connect data-connect-condition="rechazar" title="Conectar con elemento existente (rechazar)">
        ${contextPadLabel("Conectar R")}
      </button>`;
  }

  return `
      <button type="button" class="context-pad-btn context-pad-connect" data-context-connect data-connect-condition="siempre" title="Conectar con un elemento existente en el lienzo">
        ${contextPadLabel("Conectar")}
      </button>`;
}

function renderNodeInteractionChrome(node, isSelected) {
  if (!isSelected) return "";
  return `${renderFlowPorts(node, isSelected)}${renderContextPad(node, isSelected)}`;
}

function renderContextPad(node, isSelected) {
  if (!isSelected) return "";

  const selectionHandles = `
    <div class="selection-handles" aria-hidden="true">
      <span class="selection-handle selection-handle-nw"></span>
      <span class="selection-handle selection-handle-ne"></span>
      <span class="selection-handle selection-handle-sw"></span>
      <span class="selection-handle selection-handle-se"></span>
    </div>`;

  if (designerContext.readOnly) {
    return selectionHandles;
  }

  const isEnd = node.kind === NODE_KINDS.FIN;
  const actions = isEnd ? [] : getContextPadAppendActions(node);
  const appendBtns = actions.map((entry) => renderContextPadAppendEntry(node, entry)).join("");
  const connectBtns = renderContextPadConnectButtons(node);

  const deleteBtn =
    node.kind === NODE_KINDS.INICIO
      ? ""
      : `<button type="button" class="context-pad-btn context-pad-btn-danger" data-context-delete-node title="Eliminar elemento" aria-label="Eliminar elemento">
      <span class="context-pad-delete-icon" aria-hidden="true">🗑</span>
      ${contextPadLabel("Eliminar")}
    </button>`;

  return `
    ${selectionHandles}
    <div class="context-pad" role="toolbar" aria-label="Acciones rápidas BPMN">
      ${appendBtns}
      ${connectBtns}
      ${deleteBtn}
    </div>`;
}

function findAppendPosition(flow, from, newKind) {
  const box = nodeBox(from);
  const layout = getLaneLayout(flow);
  const lane = layout.laneById[from.laneId] ?? layout.lanes[0];
  let x = from.x + box.w + PAD_GAP + CONTEXT_PAD_RESERVE;
  let y = centerYInLane(flow, lane.id, newKind);
  const newBox = nodeBox({ kind: newKind });
  const overlaps = () =>
    flow.nodes.some((n) => {
      if (n.id === from.id) return false;
      const b = nodeBox(n);
      return Math.abs(n.x - x) < newBox.w && Math.abs(n.y - y) < newBox.h + 20;
    });
  let tries = 0;
  while (overlaps() && tries < 12) {
    x += 40;
    tries += 1;
  }
  x = Math.max(lane.left + LANE_PAD, x);
  return { x, y };
}

function appendAndConnect(flow, fromId, kind, condition = "siempre", gatewayType = null) {
  const from = flow.nodes.find((n) => n.id === fromId);
  if (!from || from.kind === NODE_KINDS.FIN) return null;

  if (kind === NODE_KINDS.INICIO && flow.nodes.some((n) => n.kind === NODE_KINDS.INICIO)) {
    toast("Solo puede haber un Start Event.");
    return null;
  }

  if (kind === NODE_KINDS.GATEWAY) {
    const gt = gatewayType ?? DEFAULT_GATEWAY_TYPE;
    const catalogEntry = GATEWAY_TYPE_CATALOG.find((e) => e.id === gt);
    if (!catalogEntry?.enabled) {
      toast(`Próximamente: ${catalogEntry?.label ?? gt}`);
      return null;
    }
  }

  const { x, y } = findAppendPosition(flow, from, kind);
  const newNode = {
    id: createId("node"),
    kind,
    name: defaultNodeName(kind),
    description: "",
    x,
    y,
    laneId: from.laneId,
    usedParamIds: [],
  };
  if (kind === NODE_KINDS.GATEWAY) {
    newNode.gatewayType = gatewayType ?? DEFAULT_GATEWAY_TYPE;
    newNode.description = gatewayTypeLabel(newNode.gatewayType);
  }
  flow.nodes.push(newNode);
  snapNodeToLane(flow, newNode, { updateLaneFromY: false });
  if (kind === NODE_KINDS.INICIO || kind === NODE_KINDS.FIN) {
    clampFlowEventNode(flow, newNode);
  }
  if (kind === NODE_KINDS.MANUAL) {
    flow.screens[newNode.id] = { blocks: [{ id: createId("blk"), type: "comentario" }] };
  }

  const cond = from.kind === NODE_KINDS.GATEWAY ? condition : "siempre";
  if (!tryAddTransition(flow, fromId, newNode.id, LINE_TYPES.SEQUENCE, cond)) {
    flow.nodes.pop();
    delete flow.screens[newNode.id];
    return null;
  }
  return newNode.id;
}

function renderNode(node, isSelected) {
  const kindLabel = {
    inicio: "Start Event",
    manual: "User Task",
    automatica: "Service Task",
    gateway: "XOR Gateway",
    fin: "End Event",
  }[node.kind];
  const icon =
    node.kind === "manual"
      ? `<span class="bpmn-task-icon" aria-hidden="true">👤</span>`
      : node.kind === "automatica"
        ? `<span class="bpmn-task-icon" aria-hidden="true">⚙</span>`
        : node.kind === "gateway"
          ? `<span class="bpmn-gateway-x gateway-mark ${gatewayMarkClass(node.gatewayType ?? DEFAULT_GATEWAY_TYPE)}" aria-hidden="true"></span>`
          : "";
  const gwTitle =
    node.kind === NODE_KINDS.GATEWAY
      ? gatewayTypeLabel(node.gatewayType ?? DEFAULT_GATEWAY_TYPE)
      : kindLabel;
  const nodeBody =
    node.kind === NODE_KINDS.GATEWAY
      ? `<div class="gateway-node-shape">${icon}<div class="node-kind">${kindLabel}</div><div class="node-name">${escapeHtml(node.name)}</div></div>`
      : `${icon}<div class="node-kind">${kindLabel}</div><div class="node-name">${escapeHtml(node.name)}</div>`;
  return `
    <div class="flow-node node-${node.kind} ${isSelected ? "is-selected" : ""}"
         data-node-id="${node.id}"
         title="${escapeHtml(gwTitle)}"
         style="left:${node.x}px;top:${node.y}px">
      ${nodeBody}
      ${renderNodeInteractionChrome(node, isSelected)}
    </div>`;
}

function tryAddTransition(flow, fromId, toId, lineType, condition) {
  if (fromId === toId) {
    toast("No podés conectar un nodo consigo mismo.");
    return false;
  }
  const from = flow.nodes.find((n) => n.id === fromId);
  const to = flow.nodes.find((n) => n.id === toId);
  if (!from || !to) return false;
  if (from.kind === NODE_KINDS.FIN) {
    toast("End Event no tiene salidas.");
    return false;
  }

  let lt = lineType ?? LINE_TYPES.SEQUENCE;
  let cond = condition;

  if (lt === LINE_TYPES.SEQUENCE) {
    if (from.kind === NODE_KINDS.GATEWAY) {
      if (cond !== "aceptar" && cond !== "rechazar") {
        toast("Desde el gateway usá los puertos aceptar o rechazar.");
        return false;
      }
    } else if (from.kind === NODE_KINDS.FIN) {
      return false;
    } else {
      cond = "siempre";
    }
  } else {
    cond = null;
  }

  const dup = flow.transitions.some(
    (t) =>
      t.fromId === fromId &&
      t.toId === toId &&
      (t.lineType ?? LINE_TYPES.SEQUENCE) === lt &&
      (lt === LINE_TYPES.SEQUENCE ? t.condition === cond : true),
  );
  if (dup) {
    toast("Esa conexión ya existe.");
    return false;
  }

  flow.transitions.push({
    id: createId("tr"),
    fromId,
    toId,
    lineType: lt,
    condition: cond,
  });
  return true;
}

function renderNodeProps(flow, node) {
  const ro = propsReadonlyAttrs();
  const roCheck = designerContext.readOnly || node.kind === "inicio" ? " disabled" : "";
  const paramsHtml = flow.inputParams
    .map(
      (p) => `
      <label style="display:flex;gap:0.35rem;align-items:center;font-size:0.85rem;margin-bottom:0.35rem">
        <input type="checkbox" data-used-param="${p.id}" ${(node.usedParamIds ?? []).includes(p.id) ? "checked" : ""}${roCheck} />
        ${escapeHtml(p.label)} (${escapeHtml(p.key)})
      </label>`,
    )
    .join("") || "<p style='font-size:0.8rem;color:var(--muted)'>Sin parámetros. Defínalos en el nodo Inicio.</p>";

  const transitions = flow.transitions.filter((t) => t.fromId === node.id);
  const incomingTransitions = flow.transitions.filter((t) => t.toId === node.id);
  const targets = flow.nodes.filter((n) => n.id !== node.id);

  let connectConditions = "";
  if (node.kind === NODE_KINDS.GATEWAY) {
    connectConditions = `
      <option value="aceptar">Aceptar</option>
      <option value="rechazar">Rechazar</option>`;
  } else if (node.kind === NODE_KINDS.FIN) {
    connectConditions = "";
  } else {
    connectConditions = `<option value="siempre">Siempre (Sequence Flow)</option>`;
  }

  const screenBtn =
    node.kind === NODE_KINDS.MANUAL && !designerContext.readOnly
      ? `<button type="button" class="btn btn-primary btn-sm" id="btn-design-screen" style="width:100%;margin-top:0.5rem">Diseñar pantalla (estudio)</button>`
      : "";
  const automationBtn =
    node.kind === NODE_KINDS.AUTOMATICA && !designerContext.readOnly
      ? `<button type="button" class="btn btn-primary btn-sm" id="btn-design-automation" style="width:100%;margin-top:0.5rem">Diseñar automatización</button>`
      : "";
  const agenteIABtn =
    node.kind === NODE_KINDS.AGENTE_IA && !designerContext.readOnly
      ? `<button type="button" class="btn btn-primary btn-sm" id="btn-design-agente-ia" style="width:100%;margin-top:0.5rem">Configurar Agente IA</button>`
      : "";

  ensureFlowDiagram(flow);
  const laneOptions = flow.lanes
    .map(
      (lane) =>
        `<option value="${lane.id}" ${node.laneId === lane.id ? "selected" : ""}>${escapeHtml(lane.name)}</option>`,
    )
    .join("");

  const eventPoolHint =
    node.kind === NODE_KINDS.INICIO || node.kind === NODE_KINDS.FIN
      ? `<p class="props-intro">Debe permanecer dentro del pool; podés usar otro lane (rol / grupo).</p>`
      : "";

  const generalBody = `
      ${designerContext.readOnly ? `<p class="props-intro props-intro--readonly">${escapeHtml(designerReadOnlyMessage(flow))}</p>` : ""}
      <div class="form-row"><label>Nombre</label><input name="name" value="${escapeHtml(node.name)}" required${ro} /></div>
      <div class="form-row"><label>Descripción</label><textarea name="description"${ro}>${escapeHtml(node.description || "")}</textarea></div>
      <div class="form-row"><label>Lane (rol / perfil)</label><select name="laneId"${ro}>${laneOptions}</select></div>
      ${eventPoolHint}
      ${screenBtn}
      ${automationBtn}
      ${agenteIABtn}`;

  const inputDataSection =
    node.kind !== NODE_KINDS.INICIO &&
    node.kind !== NODE_KINDS.FIN &&
    node.kind !== NODE_KINDS.GATEWAY
      ? renderPropsCollapse("input-data", "Datos de entrada que usa", paramsHtml, false)
      : "";

  const componentAttrsKinds = COMPONENTS_WITH_INPUT_ATTRIBUTES.has(node.kind);
  const editAttrsBtn = (tab = "input") =>
    !designerContext.readOnly && componentAttrsKinds
      ? `<button type="button" class="btn btn-sm btn-primary" id="btn-edit-component-attrs" data-attr-tab="${tab}" style="margin-top:0.5rem">Editar parámetros de entrada</button>`
      : "";

  const componentInputSection = componentAttrsKinds
    ? renderPropsCollapse(
        "component-input-attrs",
        node.kind === NODE_KINDS.INICIO
          ? "Parámetros de entrada del flujo"
          : "Parámetros de entrada del componente",
        `<div class="component-attr-chip-list">${renderComponentAttributeChipsHtml(node.inputAttributes ?? [])}</div>${editAttrsBtn("input")}`,
        false,
      )
    : "";

  const componentOutputSection =
    node.kind === NODE_KINDS.GATEWAY
      ? renderPropsCollapse(
          "component-output-attrs",
          "Parámetros de salida del componente",
          `<div class="component-attr-chip-list">${renderComponentAttributeChipsHtml(node.outputAttributes ?? [])}</div>${
            !designerContext.readOnly
              ? `<button type="button" class="btn btn-sm" id="btn-edit-component-attrs-out" data-attr-tab="output" style="margin-top:0.5rem">Editar parámetros de salida</button>`
              : ""
          }`,
          false,
        )
      : "";

  const connectionListItem = (t, peerId, arrow) => {
    const peer = flow.nodes.find((n) => n.id === peerId);
    const lt = t.lineType ?? LINE_TYPES.SEQUENCE;
    const badge = lineTypeLabel(lt);
    const cond = t.condition ? ` · ${t.condition}` : "";
    const delBtn = designerContext.readOnly
      ? ""
      : ` <button type="button" class="btn btn-sm btn-danger" data-del-tr="${t.id}">×</button>`;
    return `<li><span class="line-badge line-badge-${lt}">${badge}</span>${cond} ${arrow} ${escapeHtml(peer?.name ?? peerId)}${delBtn}</li>`;
  };

  const connectionsList = `
        <ul class="props-connection-list">
          ${transitions
            .map((t) => connectionListItem(t, t.toId, "→"))
            .join("") || "<li class='props-empty'>Ninguna</li>"}
        </ul>`;

  const incomingList = `
        <ul class="props-connection-list">
          ${incomingTransitions
            .map((t) => connectionListItem(t, t.fromId, "←"))
            .join("") || "<li class='props-empty'>Ninguna</li>"}
        </ul>`;

  const connectionsForm =
    node.kind === NODE_KINDS.FIN || designerContext.readOnly
      ? ""
      : `
        <div class="form-row" style="margin-top:0.5rem">
          <label>Tipo de línea</label>
          <select id="connect-line-type">
            <option value="${LINE_TYPES.SEQUENCE}" ${designerContext.activeLineType === LINE_TYPES.SEQUENCE ? "selected" : ""}>Sequence Flow</option>
            <option value="${LINE_TYPES.MESSAGE}" ${designerContext.activeLineType === LINE_TYPES.MESSAGE ? "selected" : ""}>Message Flow</option>
            <option value="${LINE_TYPES.ASSOCIATION}" ${designerContext.activeLineType === LINE_TYPES.ASSOCIATION ? "selected" : ""}>Association</option>
          </select>
        </div>
        <div class="form-row">
          <label>Nueva conexión hacia</label>
          <select id="connect-target">
            <option value="">— Seleccionar —</option>
            ${targets.map((t) => `<option value="${t.id}">${escapeHtml(t.name)} (${t.kind})</option>`).join("")}
          </select>
        </div>
        <div class="form-row" id="connect-condition-row">
          <label>Condición</label>
          <select id="connect-condition">${connectConditions}</select>
        </div>
        <button type="button" class="btn btn-sm" id="btn-add-transition">Agregar conexión</button>`;

  const connectionsSection = renderPropsCollapse(
    "connections",
    "Conexiones salientes",
    `${connectionsList}${connectionsForm}`,
    false,
  );

  const incomingSection = renderPropsCollapse(
    "connections-in",
    "Conexiones entrantes",
    incomingList,
    incomingTransitions.length > 0,
  );

  return `
    <form id="node-props-form" class="form-grid props-form">
      ${renderPropsCollapse("general", "General", generalBody, false)}
      ${
        node.kind === NODE_KINDS.GATEWAY
          ? renderPropsCollapse(
              "gateway-type",
              "Tipo de compuerta",
              renderGatewayTypePickerHtml(node.gatewayType),
              false,
            )
          : ""
      }
      ${inputDataSection}
      ${componentInputSection}
      ${componentOutputSection}
      ${incomingSection}
      ${connectionsSection}
      ${designerContext.readOnly ? "" : renderActionButton({ icon: "delete", label: "Eliminar nodo", variant: "danger", id: "btn-delete-node", className: "props-delete-node" })}
    </form>`;
}

/** Sincroniza clases del split y toggles con el estado de paneles laterales. */
function applyDesignerSidePanelState(mainEl) {
  const split = mainEl.querySelector("#designer-split");
  if (!split) return;
  split.classList.toggle("is-palette-open", designerContext.mobilePaletteOpen);
  split.classList.toggle("is-props-open", designerContext.mobilePropsOpen);
  split.classList.toggle("is-copilot-open", designerContext.copilotOpen);
  mainEl.querySelector("#btn-mobile-palette")?.classList.toggle("is-toggle-active", designerContext.mobilePaletteOpen);
  mainEl.querySelector("#btn-mobile-props")?.classList.toggle("is-toggle-active", designerContext.mobilePropsOpen);
  mainEl.querySelector("#btn-toggle-copilot")?.classList.toggle("is-toggle-active", designerContext.copilotOpen);
}

/**
 * Paneles laterales (Elementos / Propiedades): colapsados por defecto; flyout en escritorio.
 */
function bindDesignerSidePanels(mainEl, _state, _persist) {
  const split = mainEl.querySelector("#designer-split");
  if (!split) return;

  applyDesignerSidePanelState(mainEl);

  if (activeDesignerSideBind?.abort) activeDesignerSideBind.abort();
  const abort = new AbortController();
  const { signal } = abort;
  activeDesignerSideBind = { abort: () => abort.abort() };

  mainEl.querySelector("#btn-mobile-palette")?.addEventListener(
    "click",
    () => {
      designerContext.mobilePaletteOpen = !designerContext.mobilePaletteOpen;
      if (designerContext.mobilePaletteOpen) designerContext.mobilePropsOpen = false;
      applyDesignerSidePanelState(mainEl);
    },
    { signal },
  );

  mainEl.querySelector("#btn-mobile-props")?.addEventListener(
    "click",
    () => {
      designerContext.mobilePropsOpen = !designerContext.mobilePropsOpen;
      if (designerContext.mobilePropsOpen) designerContext.mobilePaletteOpen = false;
      applyDesignerSidePanelState(mainEl);
    },
    { signal },
  );

  mainEl.querySelector("#btn-toggle-copilot")?.addEventListener(
    "click",
    () => {
      designerContext.copilotOpen = !designerContext.copilotOpen;
      applyDesignerSidePanelState(mainEl);
    },
    { signal },
  );

  split.addEventListener(
    "click",
    (e) => {
      const closeBtn = e.target.closest("[data-designer-close]");
      if (!closeBtn || !split.contains(closeBtn)) return;
      const target = closeBtn.dataset.designerClose;
      if (target === "palette") designerContext.mobilePaletteOpen = false;
      if (target === "props") designerContext.mobilePropsOpen = false;
      if (target === "copilot") designerContext.copilotOpen = false;
      applyDesignerSidePanelState(mainEl);
    },
    { signal },
  );
}

function bindCopilotChat(mainEl, state, persist) {
  const form = mainEl.querySelector("#form-copilot");
  const chat = mainEl.querySelector("#copilot-chat");
  if (!form || !chat) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = form.querySelector('[name="prompt"]');
    const prompt = input.value.trim();
    if (!prompt) return;

    input.value = "";
    
    // Mensaje del usuario
    const userMsg = document.createElement("div");
    userMsg.className = "copilot-message copilot-message--user";
    userMsg.textContent = prompt;
    chat.appendChild(userMsg);
    chat.scrollTop = chat.scrollHeight;

    // Loading mock
    const loadingMsg = document.createElement("div");
    loadingMsg.className = "copilot-message copilot-message--ai";
    loadingMsg.innerHTML = `<span class="copilot-loading">Generando...</span>`;
    chat.appendChild(loadingMsg);
    chat.scrollTop = chat.scrollHeight;

    setTimeout(() => {
      loadingMsg.remove();
      const aiMsg = document.createElement("div");
      aiMsg.className = "copilot-message copilot-message--ai";
      
      // Simulación básica de acciones
      if (prompt.toLowerCase().includes("vacaciones")) {
        aiMsg.textContent = "¡Listo! Armé un flujo básico de vacaciones con revisión y notificación.";
        // Acá se inyectaría el JSON mock
      } else if (prompt.toLowerCase().includes("notificaci")) {
        aiMsg.textContent = "Agregué un paso de notificación al final del flujo.";
        // Acá se agregaría un nodo
      } else {
        aiMsg.textContent = "Entendido. (Mock: en la versión final la IA modificaría el flujo basándose en este prompt).";
      }
      
      chat.appendChild(aiMsg);
      chat.scrollTop = chat.scrollHeight;
    }, 1200);
  });
}

function bindFlowEditor(mainEl, flow, state, persist, flowPersist) {
  const canvas = mainEl.querySelector("#flow-canvas");
  const wrap = mainEl.querySelector("#canvas-wrap");
  const saveFlow = flowPersist ?? createFlowPersist(flow, persist);

  bindDesignerSidePanels(mainEl, state, persist);
  bindStudioTabs(mainEl, state, persist);

  syncDesignerLayoutViewport(mainEl, flow, saveFlow);

  if (designerContext._laneSyncForFlowId !== flow.id) {
    ensureFlowDiagram(flow);
    let changed = false;
    for (const node of flow.nodes) {
      const before = `${node.x},${node.y},${node.laneId}`;
      snapNodeToLane(flow, node, { updateLaneFromY: true });
      if (node.kind === NODE_KINDS.INICIO || node.kind === NODE_KINDS.FIN) {
        clampFlowEventNode(flow, node);
      }
      const after = `${node.x},${node.y},${node.laneId}`;
      if (before !== after) changed = true;
    }
    designerContext._laneSyncForFlowId = flow.id;
    if (changed) saveFlow();
  }

  mainEl.querySelector("#btn-back-catalog")?.addEventListener("click", () => {
    enterDesignerCatalog("flows");
    renderDesigner(mainEl, state, persist);
  });

  mainEl.querySelector("#btn-delete-flow")?.addEventListener("click", () => {
    attemptDeleteFlow(mainEl, state, persist, flow.id);
  });

  mainEl.querySelector("#btn-confirm-version")?.addEventListener("click", () => {
    attemptActivateFlow(mainEl, state, persist, flow.id);
  });

  mainEl.querySelector("#btn-versionar")?.addEventListener("click", () => {
    attemptVersionFlow(mainEl, state, persist, flow.id);
  });

  mainEl.querySelector("#btn-flow-meta")?.addEventListener("click", () => {
    if (!isFlowEditable(flow)) {
      toast("Metadatos de solo lectura. Versioná el flujo para editarlos.");
      return;
    }
    const { close, root } = openModal(`
      <div class="modal-header"><h2>Metadatos del flujo</h2>${renderModalCloseButton()}</div>
      <form id="form-meta" class="form-grid">
        ${renderFlowTypeFormRow(state, flow)}
        <div class="form-row"><label>Nombre</label><input name="name" value="${escapeHtml(flow.name)}" required /></div>
        <div class="form-row"><label>Descripción</label><textarea name="description">${escapeHtml(flow.description || "")}</textarea></div>
        ${renderActionButton({ icon: "save", label: "Guardar metadatos", variant: "primary", type: "submit", disabled: !(state.flowTypes ?? []).length })}
      </form>
    `);
    bindFlowTypeGotoButton(root, close);
    root.querySelector("#form-meta").addEventListener("submit", (e) => {
      e.preventDefault();
      if (!isFlowEditable(flow)) return;
      const fd = new FormData(e.target);
      if (!applyFlowMetaFromForm(flow, state, fd)) return;
      saveFlow();
      close();
      renderDesigner(mainEl, state, persist);
    });
  });

  wrap.addEventListener("dragover", (e) => {
    if (designerContext.readOnly) return;
    e.preventDefault();
  });
  wrap.addEventListener("drop", (e) => {
    e.preventDefault();
    if (designerContext.readOnly) {
      toast("Este flujo no es editable. Usá «Versionar» para crear un borrador.");
      return;
    }
    const kind = e.dataTransfer.getData("palette-kind");
    if (!kind) return;

    if (kind === NODE_KINDS.INICIO && flow.nodes.some((n) => n.kind === NODE_KINDS.INICIO)) {
      toast("Solo puede haber un Start Event.");
      return;
    }

    const pt = clientToCanvas(mainEl, e.clientX, e.clientY);
    const x = pt.x - 70;
    const y = pt.y - 24;

    const droppedGatewayType = e.dataTransfer.getData("gateway-type") || DEFAULT_GATEWAY_TYPE;
    if (kind === NODE_KINDS.GATEWAY) {
      const catalogEntry = GATEWAY_TYPE_CATALOG.find((entry) => entry.id === droppedGatewayType);
      if (!catalogEntry?.enabled) {
        toast(`Próximamente: ${catalogEntry?.label ?? droppedGatewayType}`);
        return;
      }
    }

    const node = {
      id: createId("node"),
      kind,
      name: defaultNodeName(kind),
      description: "",
      x,
      y,
      laneId: flow.lanes[0]?.id,
      usedParamIds: [],
    };
    if (kind === NODE_KINDS.GATEWAY) {
      node.gatewayType = droppedGatewayType;
      node.description = gatewayTypeLabel(droppedGatewayType);
    }
    snapNodeToLane(flow, node, { updateLaneFromY: true });
    if (kind === NODE_KINDS.INICIO || kind === NODE_KINDS.FIN) {
      const rawX = node.x;
      const rawY = node.y;
      clampFlowEventNode(flow, node);
      if (Math.abs(node.x - rawX) > 8 || Math.abs(node.y - rawY) > 8) {
        toast("El evento se ubica dentro del flujo.");
      }
    }
    flow.nodes.push(node);
    if (kind === NODE_KINDS.MANUAL) {
      flow.screens[node.id] = { blocks: [{ id: createId("blk"), type: "comentario" }] };
    }
    designerContext.selectedNodeId = node.id;
    saveFlow();
    renderDesigner(mainEl, state, persist);
  });

  mainEl.querySelectorAll(".palette-item[data-palette]").forEach((item) => {
    item.addEventListener("dragstart", (e) => {
      if (designerContext.readOnly) {
        e.preventDefault();
        return;
      }
      e.dataTransfer.setData("palette-kind", item.dataset.palette);
      if (item.dataset.gatewayType) {
        e.dataTransfer.setData("gateway-type", item.dataset.gatewayType);
      }
    });
  });

  mainEl.querySelectorAll("[data-gateway-future]").forEach((item) => {
    item.addEventListener("click", () => {
      const id = item.dataset.gatewayFuture;
      toast(`Próximamente: ${gatewayTypeLabel(id)}`);
    });
  });

  mainEl.querySelector("#palette-task-menu-btn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    const sub = mainEl.querySelector("#palette-task-submenu");
    const btn = e.currentTarget;
    const open = sub?.hasAttribute("hidden");
    if (open) sub.removeAttribute("hidden");
    else sub?.setAttribute("hidden", "");
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  });

  mainEl.querySelector("#palette-gateway-menu-btn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    const sub = mainEl.querySelector("#palette-gateway-submenu");
    const btn = e.currentTarget;
    const open = sub?.hasAttribute("hidden");
    if (open) sub.removeAttribute("hidden");
    else sub?.setAttribute("hidden", "");
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  });

  mainEl.querySelectorAll("[data-tool]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (designerContext.readOnly && btn.dataset.tool !== "select") {
        toast(designerReadOnlyMessage(flow));
        return;
      }
      designerContext.tool = btn.dataset.tool;
      designerContext.connectClickFrom = null;
      if (btn.dataset.tool === "select") {
        designerContext.activeLineType = LINE_TYPES.SEQUENCE;
      } else if (TOOL_TO_LINE[btn.dataset.tool]) {
        designerContext.activeLineType = TOOL_TO_LINE[btn.dataset.tool];
      }
      renderDesigner(mainEl, state, persist);
    });
  });

  bindNodeDrag(mainEl, flow, saveFlow, state);
  bindLinkDrag(mainEl, flow, saveFlow, state);
  bindContextPad(mainEl, flow, state, saveFlow);
  bindCanvasViewport(mainEl, flow, state, persist);
  bindCanvasPan(mainEl, flow, state, persist);
  drawConnections(mainEl, flow);
  bindConnectionInteractions(mainEl, flow, state, saveFlow);
  bindLaneChrome(mainEl, flow, state, saveFlow);
  applyCanvasViewTransform(mainEl);

  if (designerContext._viewFitForFlowId !== flow.id) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        fitCanvasToView(mainEl, flow);
        designerContext._viewFitForFlowId = flow.id;
        designerContext._layoutViewportWidth =
          typeof window !== "undefined" ? window.innerWidth : 1280;
      });
    });
  }

  const selected = flow.nodes.find((n) => n.id === designerContext.selectedNodeId);
  if (selected) {
    bindNodeProps(mainEl, flow, selected, state, saveFlow);
    bindComponentAttributesEditor(mainEl, flow, selected, state, saveFlow);
  } else bindFlowDiagramProps(mainEl, flow, state, saveFlow);
}

function bindComponentAttributesEditor(mainEl, flow, node, state, persist) {
  if (!COMPONENTS_WITH_INPUT_ATTRIBUTES.has(node.kind)) return;
  const openEditor = (initialTab) => {
    enterComponentAttributesEditor(mainEl, state, persist, {
      flowId: flow.id,
      nodeId: node.id,
      initialTab,
    });
  };
  mainEl.querySelector("#btn-edit-component-attrs")?.addEventListener("click", () => {
    const tab = mainEl.querySelector("#btn-edit-component-attrs")?.dataset.attrTab;
    openEditor(tab === "output" ? "output" : "input");
  });
  mainEl.querySelector("#btn-edit-component-attrs-out")?.addEventListener("click", () => {
    openEditor("output");
  });
}

function bindCanvasViewport(mainEl, flow, state, persist) {
  const wrap = mainEl.querySelector("#canvas-wrap");
  const viewport = mainEl.querySelector("#canvas-viewport");

  if (activeCanvasViewport?.abort) activeCanvasViewport.abort();
  const abort = new AbortController();
  const { signal } = abort;
  activeCanvasViewport = { abort: () => abort.abort() };

  mainEl.querySelector("#btn-zoom-in")?.addEventListener(
    "click",
    () => {
      designerContext.view.zoom = Math.min(3, designerContext.view.zoom * 1.2);
      applyCanvasViewTransform(mainEl);
    },
    { signal },
  );
  mainEl.querySelector("#btn-zoom-out")?.addEventListener(
    "click",
    () => {
      designerContext.view.zoom = Math.max(0.25, designerContext.view.zoom / 1.2);
      applyCanvasViewTransform(mainEl);
    },
    { signal },
  );
  mainEl.querySelector("#btn-zoom-100")?.addEventListener(
    "click",
    () => {
      designerContext.view.zoom = 1;
      designerContext.view.panX = 0;
      designerContext.view.panY = 0;
      applyCanvasViewTransform(mainEl);
    },
    { signal },
  );
  mainEl.querySelector("#btn-zoom-fit")?.addEventListener(
    "click",
    () => {
      fitCanvasToView(mainEl, flow);
    },
    { signal },
  );
  mainEl.querySelector("#btn-canvas-fullscreen")?.addEventListener(
    "click",
    async () => {
      if (!wrap) return;
      if (document.fullscreenElement === wrap) {
        await document.exitFullscreen();
      } else {
        await wrap.requestFullscreen();
      }
    },
    { signal },
  );

  document.addEventListener(
    "fullscreenchange",
    () => {
      if (!wrap || !mainEl.contains(wrap)) return;
      requestAnimationFrame(() => fitCanvasToView(mainEl, flow));
    },
    { signal },
  );

  viewport?.addEventListener(
    "wheel",
    (e) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const rect = viewport.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const { zoom, panX, panY } = designerContext.view;
      const wx = (mx - panX) / zoom;
      const wy = (my - panY) / zoom;
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const next = Math.min(3, Math.max(0.25, zoom * delta));
      designerContext.view.zoom = next;
      designerContext.view.panX = mx - wx * next;
      designerContext.view.panY = my - wy * next;
      applyCanvasViewTransform(mainEl);
    },
    { passive: false, signal },
  );
}

function bindCanvasPan(mainEl, flow, state, persist) {
  const canvas = mainEl.querySelector("#flow-canvas");
  if (!canvas) return;

  canvas.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    if (designerContext.tool !== "select") return;
    if (
      e.target.closest(".flow-node") ||
      e.target.closest(".context-pad") ||
      e.target.closest(".flow-connection-hit") ||
      e.target.closest(".flow-lane-remove")
    ) {
      return;
    }

    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startPanX = designerContext.view.panX;
    const startPanY = designerContext.view.panY;
    let moved = false;

    const onMove = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
      designerContext.view.panX = startPanX + dx;
      designerContext.view.panY = startPanY + dy;
      applyCanvasViewTransform(mainEl);
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      if (!moved) {
        designerContext.selectedNodeId = null;
        designerContext.connectClickFrom = null;
        designerContext.contextPadOpenTaskMenu = null;
        designerContext.contextPadOpenGatewayMenu = null;
        renderDesigner(mainEl, state, persist);
      }
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  });
}

function bindFlowDiagramProps(mainEl, flow, state, persist) {
  if (designerContext.readOnly) return;

  mainEl.querySelector("#btn-add-lane")?.addEventListener("click", () => {
    if (designerContext.readOnly) {
      toast("Este flujo no es editable.");
      return;
    }
    const lane = { id: createId("lane"), name: "Nuevo rol", height: 180 };
    flow.lanes.push(lane);
    persist();
    renderDesigner(mainEl, state, persist);
  });

  mainEl.querySelectorAll(".lane-name-input").forEach((input) => {
    input.addEventListener("change", () => {
      const lane = flow.lanes.find((l) => l.id === input.dataset.laneId);
      if (!lane) return;
      lane.name = String(input.value).trim() || "Lane";
      persist();
      renderDesigner(mainEl, state, persist);
    });
  });

  mainEl.querySelectorAll("[data-remove-lane]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (designerContext.readOnly) {
        toast("Este flujo no es editable.");
        return;
      }
      const laneId = btn.dataset.removeLane;
      if (!removeLaneFromFlow(flow, laneId)) return;
      persist();
      renderDesigner(mainEl, state, persist);
    });
  });
}

function bindLaneChrome(mainEl, flow, state, persist) {
  mainEl.querySelectorAll("[data-remove-lane-canvas]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (designerContext.readOnly) {
        toast("Este flujo no es editable. Usá «Versionar» para crear un borrador.");
        return;
      }
      const laneId = btn.dataset.removeLaneCanvas;
      if (!laneId) return;
      if (!removeLaneFromFlow(flow, laneId)) return;
      persist();
      renderDesigner(mainEl, state, persist);
      toast("Lane eliminado.");
    });
  });
}

function bindConnectionInteractions(mainEl, flow, state, persist) {
  const canvas = mainEl.querySelector("#flow-canvas");
  if (!canvas) return;

  canvas.addEventListener("click", (e) => {
    const hit = e.target.closest(".flow-connection-hit");
    if (!hit) return;
    if (designerContext.tool !== "select") return;
    e.stopPropagation();
    if (designerContext.readOnly) {
      toast("Este flujo no es editable.");
      return;
    }
    const group = hit.closest(".flow-connection-group");
    const transitionId = group?.dataset.transitionId;
    if (!transitionId) return;
    if (!deleteFlowTransitionById(flow, transitionId)) return;
    persist();
    renderDesigner(mainEl, state, persist);
    toast("Conexión eliminada.");
  });
}

function defaultNodeName(kind) {
  return {
    inicio: "Start",
    manual: "User Task",
    automatica: "Service Task",
    gateway: "Decisión XOR",
    fin: "End",
  }[kind];
}

let activeDrag = null;

function bindNodeDrag(mainEl, flow, persist, state) {
  const canvas = mainEl.querySelector("#flow-canvas");
  if (!canvas) return;

  if (activeDrag?.abort) activeDrag.abort();
  const abort = new AbortController();
  const { signal } = abort;
  activeDrag = { abort: () => abort.abort() };

  let dragNode = null;
  let offsetX = 0;
  let offsetY = 0;

  canvas.querySelectorAll(".flow-node").forEach((el) => {
    el.addEventListener(
      "mousedown",
      (e) => {
        if (e.button !== 0) return;
        if (e.target.closest(".flow-port") || e.target.closest(".context-pad")) return;
        const nodeId = el.dataset.nodeId;

        if (designerContext.connectClickFrom && designerContext.connectClickFrom.fromId !== nodeId) {
          e.preventDefault();
          e.stopPropagation();
          if (designerContext.readOnly) {
            toast("Este flujo no es editable.");
            return;
          }
          const { fromId, condition } = designerContext.connectClickFrom;
          const lineType = designerContext.activeLineType ?? LINE_TYPES.SEQUENCE;
          if (tryAddTransition(flow, fromId, nodeId, lineType, condition ?? null)) {
            persist();
            designerContext.connectClickFrom = null;
            renderDesigner(mainEl, state, persist);
          }
          return;
        }

        if (designerContext.tool !== "select") {
          e.preventDefault();
          e.stopPropagation();
          if (designerContext.readOnly) {
            toast("Este flujo no es editable. Usá «Versionar» para crear un borrador.");
            return;
          }
          const lineType = designerContext.activeLineType;
          if (designerContext.connectClickFrom?.fromId === nodeId) {
            designerContext.connectClickFrom = null;
            return;
          }
          if (designerContext.connectClickFrom) {
            const fromId = designerContext.connectClickFrom.fromId;
            const cond = designerContext.connectClickFrom.condition ?? null;
            if (tryAddTransition(flow, fromId, nodeId, lineType, cond)) {
              persist();
              designerContext.connectClickFrom = null;
              renderDesigner(mainEl, state, persist);
            }
          } else {
            const fromNode = flow.nodes.find((n) => n.id === nodeId);
            if (
              fromNode?.kind === NODE_KINDS.GATEWAY &&
              lineType === LINE_TYPES.SEQUENCE
            ) {
              toast("Desde el gateway usá los puertos A/R o «Conectar A / R» en el menú.");
              return;
            }
            const cond = lineType === LINE_TYPES.SEQUENCE ? "siempre" : null;
            designerContext.connectClickFrom = { fromId: nodeId, condition: cond };
            designerContext.selectedNodeId = nodeId;
            toast("Seleccioná el nodo destino.");
            renderDesigner(mainEl, state, persist);
          }
          return;
        }

        designerContext.selectedNodeId = nodeId;
        designerContext.connectClickFrom = null;
        designerContext.contextPadOpenTaskMenu = null;
        designerContext.contextPadOpenGatewayMenu = null;
        designerContext.mobilePropsOpen = true;
        designerContext.mobilePaletteOpen = false;
        applyDesignerSidePanelState(mainEl);
        canvas.querySelectorAll(".flow-node").forEach((n) => n.classList.remove("is-selected"));
        el.classList.add("is-selected");
        const selected = flow.nodes.find((n) => n.id === nodeId);
        dragNode = selected;
        refreshNodeChrome(canvas, el, selected);
        const propsPanel = mainEl.querySelector("#props-panel");
        if (selected && propsPanel) {
          propsPanel.innerHTML = renderPropsPanelShell(flow, selected);
          bindNodeProps(mainEl, flow, selected, state, persist);
          applyDesignerSidePanelState(mainEl);
        }
        if (designerContext.readOnly) {
          e.preventDefault();
          return;
        }
        const pt = clientToCanvas(mainEl, e.clientX, e.clientY);
        offsetX = pt.x - dragNode.x;
        offsetY = pt.y - dragNode.y;
        e.preventDefault();
      },
      { signal },
    );
  });

  const onMove = (e) => {
    if (!dragNode) return;
    const pt = clientToCanvas(mainEl, e.clientX, e.clientY);
    dragNode.x = Math.max(0, pt.x - offsetX);
    dragNode.y = Math.max(0, pt.y - offsetY);
    if (dragNode.kind === NODE_KINDS.INICIO || dragNode.kind === NODE_KINDS.FIN) {
      clampFlowEventNode(flow, dragNode);
    }
    const el = canvas.querySelector(`[data-node-id="${dragNode.id}"]`);
    if (el) {
      el.style.left = `${dragNode.x}px`;
      el.style.top = `${dragNode.y}px`;
    }
    drawConnections(mainEl, flow);
  };

  const onUp = () => {
    if (!dragNode) return;
    snapNodeToLane(flow, dragNode, { updateLaneFromY: true });
    if (dragNode.kind === NODE_KINDS.INICIO || dragNode.kind === NODE_KINDS.FIN) {
      clampFlowEventNode(flow, dragNode);
    }
    const el = canvas.querySelector(`[data-node-id="${dragNode.id}"]`);
    if (el) {
      el.style.left = `${dragNode.x}px`;
      el.style.top = `${dragNode.y}px`;
    }
    drawConnections(mainEl, flow);
    persist();
    dragNode = null;
  };

  window.addEventListener("mousemove", onMove, { signal });
  window.addEventListener("mouseup", onUp, { signal });
}

function refreshNodeChrome(canvas, el, node) {
  if (!canvas) return;
  canvas.querySelectorAll(".context-pad, .selection-handles, .flow-port").forEach((p) => p.remove());
  canvas.querySelectorAll(".flow-node").forEach((n) => n.classList.remove("is-selected"));
  if (!el || !node) return;
  el.classList.add("is-selected");
  const html = renderNodeInteractionChrome(node, true);
  if (html) el.insertAdjacentHTML("beforeend", html);
}

function bindContextPad(mainEl, flow, state, persist) {
  const canvas = mainEl.querySelector("#flow-canvas");
  if (!canvas) return;

  canvas.addEventListener("click", (e) => {
    if (!e.target.closest(".context-pad")) {
      closeContextPadSubmenus(canvas);
    }

    const gatewayToggleBtn = e.target.closest("[data-context-gateway-toggle]");
    if (gatewayToggleBtn) {
      e.stopPropagation();
      e.preventDefault();
      const menuKey = gatewayToggleBtn.dataset.gatewayMenuKey;
      const pad = gatewayToggleBtn.closest(".context-pad");
      pad?.querySelectorAll("[data-gateway-submenu-key]").forEach((sub) => {
        if (sub.dataset.gatewaySubmenuKey !== menuKey) sub.setAttribute("hidden", "");
      });
      const sub = pad?.querySelector(`[data-gateway-submenu-key="${menuKey}"]`);
      const willOpen = sub?.hasAttribute("hidden");
      designerContext.contextPadOpenGatewayMenu = willOpen ? menuKey : null;
      designerContext.contextPadOpenTaskMenu = null;
      syncContextPadGatewayMenuDom(canvas);
      syncContextPadTaskMenuDom(canvas);
      return;
    }

    const toggleBtn = e.target.closest("[data-context-task-toggle]");
    if (toggleBtn) {
      e.stopPropagation();
      e.preventDefault();
      const menuKey = toggleBtn.dataset.taskMenuKey;
      const pad = toggleBtn.closest(".context-pad");
      pad?.querySelectorAll("[data-task-submenu-key]").forEach((sub) => {
        if (sub.dataset.taskSubmenuKey !== menuKey) sub.setAttribute("hidden", "");
      });
      const sub = pad?.querySelector(`[data-task-submenu-key="${menuKey}"]`);
      const willOpen = sub?.hasAttribute("hidden");
      designerContext.contextPadOpenTaskMenu = willOpen ? menuKey : null;
      designerContext.contextPadOpenGatewayMenu = null;
      syncContextPadTaskMenuDom(canvas);
      syncContextPadGatewayMenuDom(canvas);
      return;
    }

    const connectBtn = e.target.closest("[data-context-connect]");
    if (connectBtn) {
      e.stopPropagation();
      e.preventDefault();
      if (designerContext.readOnly) {
        toast("Este flujo no es editable.");
        return;
      }
      const nodeEl = connectBtn.closest(".flow-node");
      const fromId = nodeEl?.dataset.nodeId;
      if (!fromId) return;
      const fromNode = flow.nodes.find((n) => n.id === fromId);
      if (!fromNode || fromNode.kind === NODE_KINDS.FIN) return;
      const branch = connectBtn.dataset.connectCondition || "siempre";
      const lineType = designerContext.activeLineType;
      let condition = null;
      if (lineType === LINE_TYPES.SEQUENCE) {
        condition = branch === "siempre" ? "siempre" : branch;
      }
      designerContext.connectClickFrom = { fromId, condition };
      designerContext.selectedNodeId = fromId;
      closeContextPadSubmenus(canvas);
      toast("Seleccioná el nodo destino en el lienzo.");
      renderDesigner(mainEl, state, persist);
      return;
    }

    const deleteBtn = e.target.closest("[data-context-delete-node]");
    if (deleteBtn) {
      e.stopPropagation();
      e.preventDefault();
      const nodeEl = deleteBtn.closest(".flow-node");
      const nodeId = nodeEl?.dataset.nodeId;
      if (!nodeId) return;
      if (!deleteFlowNode(flow, nodeId)) return;
      designerContext.selectedNodeId = null;
      designerContext.connectClickFrom = null;
      designerContext.contextPadOpenTaskMenu = null;
      designerContext.contextPadOpenGatewayMenu = null;
      persist();
      toast("Elemento eliminado.");
      renderDesigner(mainEl, state, persist);
      return;
    }

    const quickGatewayBtn = e.target.closest("[data-context-gateway-append]");
    if (quickGatewayBtn) {
      e.stopPropagation();
      e.preventDefault();
      const nodeEl = quickGatewayBtn.closest(".flow-node");
      const fromId = nodeEl?.dataset.nodeId;
      if (!fromId) return;
      const condition = quickGatewayBtn.dataset.appendCondition || "siempre";
      const gatewayType = quickGatewayBtn.dataset.gatewayType || DEFAULT_GATEWAY_TYPE;
      const newId = appendAndConnect(flow, fromId, NODE_KINDS.GATEWAY, condition, gatewayType);
      if (!newId) return;
      designerContext.selectedNodeId = newId;
      designerContext.connectClickFrom = null;
      closeContextPadSubmenus(canvas);
      persist();
      toast("Elemento agregado y conectado.");
      renderDesigner(mainEl, state, persist);
      return;
    }

    const quickTaskBtn = e.target.closest("[data-context-task-append]");
    if (quickTaskBtn) {
      e.stopPropagation();
      e.preventDefault();
      const nodeEl = quickTaskBtn.closest(".flow-node");
      const fromId = nodeEl?.dataset.nodeId;
      if (!fromId) return;
      const condition = quickTaskBtn.dataset.appendCondition || "siempre";
      const newId = appendAndConnect(flow, fromId, NODE_KINDS.MANUAL, condition);
      if (!newId) return;
      designerContext.selectedNodeId = newId;
      designerContext.connectClickFrom = null;
      closeContextPadSubmenus(canvas);
      persist();
      toast("Elemento agregado y conectado.");
      renderDesigner(mainEl, state, persist);
      return;
    }

    const appendBtn = e.target.closest("[data-append-kind]");
    if (!appendBtn) return;
    e.stopPropagation();
    e.preventDefault();
    const nodeEl = appendBtn.closest(".flow-node");
    const fromId = nodeEl?.dataset.nodeId;
    if (!fromId) return;
    const kind = appendBtn.dataset.appendKind;
    const condition = appendBtn.dataset.appendCondition || "siempre";
    const gatewayType = appendBtn.dataset.gatewayType || null;
    const newId = appendAndConnect(flow, fromId, kind, condition, gatewayType);
    if (!newId) return;
    designerContext.selectedNodeId = newId;
    designerContext.connectClickFrom = null;
    closeContextPadSubmenus(canvas);
    persist();
    toast("Elemento agregado y conectado.");
    renderDesigner(mainEl, state, persist);
  });
}

function bindLinkDrag(mainEl, flow, persist, state) {
  const canvas = mainEl.querySelector("#flow-canvas");
  if (!canvas) return;

  if (activeLinkDrag?.abort) activeLinkDrag.abort();
  const abort = new AbortController();
  const { signal } = abort;
  activeLinkDrag = { abort: () => abort.abort() };

  let drag = null;

  canvas.addEventListener(
    "mousedown",
    (e) => {
      const port = e.target.closest(".flow-port");
      if (!port) return;
      e.stopPropagation();
      e.preventDefault();
      if (designerContext.readOnly) {
        toast("Este flujo no es editable. Usá «Versionar» para crear un borrador.");
        return;
      }
      const nodeEl = port.closest(".flow-node");
      const fromId = nodeEl?.dataset.nodeId;
      if (!fromId) return;
      const condition = port.dataset.condition || null;
      const lineType =
        condition === "aceptar" || condition === "rechazar"
          ? LINE_TYPES.SEQUENCE
          : designerContext.activeLineType;
      drag = { fromId, condition: condition || null, lineType };
    },
    { signal },
  );

  const onMove = (e) => {
    if (!drag) return;
    const svg = mainEl.querySelector("#connections-svg");
    const from = flow.nodes.find((n) => n.id === drag.fromId);
    if (!from || !svg) return;
    const a = nodePortOut(from, drag.condition);
    const pt = clientToCanvas(mainEl, e.clientX, e.clientY);
    const x2 = pt.x;
    const y2 = pt.y;
    const preview = buildLineSvg(a.x, a.y, x2, y2, drag.lineType, true);
    const existing = svg.querySelector("#link-preview");
    if (existing) existing.remove();
    svg.insertAdjacentHTML("beforeend", preview);
  };

  const onUp = (e) => {
    if (!drag) return;
    const target = document.elementFromPoint(e.clientX, e.clientY)?.closest(".flow-node");
    const toId = target?.dataset.nodeId;
    if (toId && tryAddTransition(flow, drag.fromId, toId, drag.lineType, drag.condition)) {
      persist();
      renderDesigner(mainEl, state, persist);
    }
    drag = null;
    mainEl.querySelector("#connections-svg #link-preview")?.remove();
  };

  window.addEventListener("mousemove", onMove, { signal });
  window.addEventListener("mouseup", onUp, { signal });
}

function connectionLineStyle(lineType) {
  const lt = lineType ?? LINE_TYPES.SEQUENCE;
  let stroke = "#38bdf8";
  let dash = "";
  let markerStart = "";
  let markerEnd = "url(#arrow-seq)";
  if (lt === LINE_TYPES.MESSAGE) {
    stroke = "#94a3b8";
    dash = ' stroke-dasharray="6 4"';
    markerStart = ' marker-start="url(#message-start)"';
    markerEnd = "url(#arrow-msg)";
  } else if (lt === LINE_TYPES.ASSOCIATION) {
    stroke = "#64748b";
    dash = ' stroke-dasharray="4 3"';
    markerEnd = "url(#arrow-assoc)";
  }
  return { stroke, dash, markerStart, markerEnd };
}

function buildLineSvg(x1, y1, x2, y2, lineType, isPreview) {
  const { stroke, dash, markerStart, markerEnd } = connectionLineStyle(lineType);
  const idAttr = isPreview ? ' id="link-preview"' : "";
  const op = isPreview ? ' opacity="0.9"' : "";
  return `<line${idAttr} x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="2"${dash}${markerStart} marker-end="${markerEnd}"${op} />`;
}

function buildConnectionSvgGroup(x1, y1, x2, y2, lineType, transitionId) {
  const { stroke, dash, markerStart, markerEnd } = connectionLineStyle(lineType);
  const hit =
    !designerContext.readOnly && transitionId
      ? `<line class="flow-connection-hit" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="transparent" stroke-width="14" pointer-events="stroke" />`
      : "";
  const title =
    !designerContext.readOnly && transitionId
      ? `<title>Clic para eliminar conexión</title>`
      : "";
  return `<g class="flow-connection-group" data-transition-id="${transitionId}">${title}${hit}<line class="flow-connection-line" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="2"${dash}${markerStart} marker-end="${markerEnd}" pointer-events="none" /></g>`;
}

function drawConnections(mainEl, flow) {
  const svg = mainEl.querySelector("#connections-svg");
  if (!svg) return;

  const nodeById = Object.fromEntries(flow.nodes.map((n) => [n.id, n]));
  const paths = flow.transitions
    .map((t) => {
      const from = nodeById[t.fromId];
      const to = nodeById[t.toId];
      if (!from || !to) return "";
      const lt = t.lineType ?? LINE_TYPES.SEQUENCE;
      const a = nodePortOut(from, lt === LINE_TYPES.SEQUENCE ? t.condition : null);
      const b = nodePortIn(to);
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      let label = "";
      if (lt === LINE_TYPES.SEQUENCE && t.condition && t.condition !== "siempre") {
        const color = t.condition === "aceptar" ? "#4ade80" : "#f87171";
        label = `<text x="${mx}" y="${my - 6}" fill="${color}" font-size="11" text-anchor="middle">${escapeHtml(t.condition)}</text>`;
      }
      return `${buildConnectionSvgGroup(a.x, a.y, b.x, b.y, lt, t.id)}${label}`;
    })
    .join("");

  svg.innerHTML = `
    <defs>
      <marker id="arrow-seq" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
        <path d="M0,0 L6,3 L0,6 Z" fill="#94a3b8" />
      </marker>
      <marker id="arrow-msg" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
        <path d="M0,0 L6,3 L0,6 Z" fill="#94a3b8" />
      </marker>
      <marker id="arrow-assoc" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
        <path d="M0,0 L6,3 L0,6 Z" fill="#64748b" />
      </marker>
      <marker id="message-start" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
        <circle cx="4" cy="4" r="3" fill="none" stroke="#94a3b8" stroke-width="1.5" />
      </marker>
    </defs>
    ${paths}`;
}

function bindNodeProps(mainEl, flow, node, state, persist) {
  if (designerContext.readOnly) return;

  const form = mainEl.querySelector("#node-props-form");
  form?.querySelector('[name="name"]')?.addEventListener("change", (e) => {
    node.name = e.target.value;
    persist();
    renderDesigner(mainEl, state, persist);
  });
  form?.querySelector('[name="description"]')?.addEventListener("change", (e) => {
    node.description = e.target.value;
    persist();
  });
  form?.querySelector('[name="laneId"]')?.addEventListener("change", (e) => {
    node.laneId = e.target.value;
    snapNodeToLane(flow, node, { updateLaneFromY: false });
    if (node.kind === NODE_KINDS.INICIO || node.kind === NODE_KINDS.FIN) {
      node.y = centerYInLane(flow, node.laneId, node.kind);
      clampFlowEventNode(flow, node);
    }
    persist();
    renderDesigner(mainEl, state, persist);
    toast("Lane actualizada.");
  });

  form?.querySelectorAll("[data-used-param]").forEach((cb) => {
    cb.addEventListener("change", () => {
      if (!node.usedParamIds) node.usedParamIds = [];
      if (cb.checked) node.usedParamIds.push(cb.dataset.usedParam);
      else node.usedParamIds = node.usedParamIds.filter((id) => id !== cb.dataset.usedParam);
      persist();
    });
  });

  const lineTypeSelect = mainEl.querySelector("#connect-line-type");
  const conditionRow = mainEl.querySelector("#connect-condition-row");
  const syncConditionRow = () => {
    const lt = lineTypeSelect?.value ?? LINE_TYPES.SEQUENCE;
    if (conditionRow) conditionRow.style.display = lt === LINE_TYPES.SEQUENCE ? "" : "none";
  };
  lineTypeSelect?.addEventListener("change", syncConditionRow);
  syncConditionRow();

  mainEl.querySelector("#btn-add-transition")?.addEventListener("click", () => {
    const toId = mainEl.querySelector("#connect-target")?.value;
    const lineType = lineTypeSelect?.value ?? designerContext.activeLineType;
    const condition =
      lineType === LINE_TYPES.SEQUENCE ? mainEl.querySelector("#connect-condition")?.value : null;
    if (!toId) {
      toast("Seleccioná destino.");
      return;
    }
    if (lineType === LINE_TYPES.SEQUENCE && !condition) {
      toast("Seleccioná condición.");
      return;
    }
    if (tryAddTransition(flow, node.id, toId, lineType, condition)) {
      persist();
      renderDesigner(mainEl, state, persist);
    }
  });

  mainEl.querySelectorAll("[data-del-tr]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (designerContext.readOnly) {
        toast("Este flujo no es editable.");
        return;
      }
      if (!deleteFlowTransitionById(flow, btn.dataset.delTr)) return;
      persist();
      renderDesigner(mainEl, state, persist);
    });
  });

  mainEl.querySelector("#btn-delete-node")?.addEventListener("click", () => {
    if (!deleteFlowNode(flow, node.id)) return;
    designerContext.selectedNodeId = null;
    persist();
    renderDesigner(mainEl, state, persist);
  });

  mainEl.querySelector("#btn-design-screen")?.addEventListener("click", () => {
    designerContext.studioMode = "screen";
    renderDesigner(mainEl, state, persist);
  });

  mainEl.querySelector("#btn-design-automation")?.addEventListener("click", () => {
    designerContext.studioMode = "automation";
    renderDesigner(mainEl, state, persist);
  });

  mainEl.querySelector("#btn-design-agente-ia")?.addEventListener("click", () => {
    designerContext.studioMode = "agente_ia";
    renderDesigner(mainEl, state, persist);
  });
}

function openScreenDesigner(flow, node, onSave) {
  if (!flow.screens[node.id]) flow.screens[node.id] = { blocks: [] };
  const screen = flow.screens[node.id];

  const renderBlocks = () =>
    screen.blocks
      .map((b, i) => {
        let label = b.type;
        if (b.type === "titulo" || b.type === "texto") label += `: ${b.text || ""}`;
        if (b.type === "dato") {
          const p = flow.inputParams.find((x) => x.id === b.paramId);
          label += `: ${p?.label ?? "?"}`;
        }
        return `<div class="screen-block" data-idx="${i}">
          <span style="flex:1">${escapeHtml(label)}</span>
          <button type="button" class="btn btn-sm" data-move-up="${i}">↑</button>
          <button type="button" class="btn btn-sm" data-move-down="${i}">↓</button>
          <button type="button" class="btn btn-sm btn-danger" data-rm-block="${i}">×</button>
        </div>`;
      })
      .join("");

  const renderPreview = () => {
    let html = "";
    for (const b of screen.blocks) {
      if (b.type === "titulo") html += `<h3>${escapeHtml(b.text || "Título")}</h3>`;
      if (b.type === "texto") html += `<p>${escapeHtml(b.text || "")}</p>`;
      if (b.type === "dato") {
        const p = flow.inputParams.find((x) => x.id === b.paramId);
        html += `<div class="preview-field"><div class="preview-label">${escapeHtml(p?.label ?? "Dato")}</div><input readonly value="(valor de instancia)" /></div>`;
      }
      if (b.type === "comentario") {
        html += `<div class="preview-field"><div class="preview-label">Comentario</div><textarea placeholder="Notas del revisor"></textarea></div>`;
      }
    }
    html += `<div class="preview-actions"><button type="button" class="btn btn-success" disabled>Aceptar</button><button type="button" class="btn btn-danger" disabled>Rechazar</button></div>`;
    return html;
  };

  const { close, root } = openModal(`
    <div class="modal-header">
      <h2>Pantalla: ${escapeHtml(node.name)}</h2>
      ${renderModalCloseButton()}
    </div>
    <div class="screen-designer">
      <div>
        <p style="font-size:0.85rem;color:var(--muted)">Arrastre bloques o use los botones. Aceptar/Rechazar siempre aparecen al ejecutar.</p>
        <div class="toolbar">
          <button type="button" class="btn btn-sm" data-add="titulo">+ Título</button>
          <button type="button" class="btn btn-sm" data-add="texto">+ Texto</button>
          <button type="button" class="btn btn-sm" data-add="dato">+ Dato entrada</button>
          <button type="button" class="btn btn-sm" data-add="comentario">+ Comentario</button>
        </div>
        <div class="screen-blocks" id="screen-blocks">${renderBlocks()}</div>
        ${renderActionButton({ icon: "save", label: "Guardar pantalla", variant: "primary", id: "btn-save-screen", className: "screen-save-action" })}
      </div>
      <div class="screen-preview" id="screen-preview">${renderPreview()}</div>
    </div>
  `);

  const refresh = () => {
    root.querySelector("#screen-blocks").innerHTML = renderBlocks();
    root.querySelector("#screen-preview").innerHTML = renderPreview();
    bindBlockActions();
  };

  const bindBlockActions = () => {
    root.querySelectorAll("[data-rm-block]").forEach((btn) => {
      btn.addEventListener("click", () => {
        screen.blocks.splice(Number(btn.dataset.rmBlock), 1);
        refresh();
      });
    });
    root.querySelectorAll("[data-move-up]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const i = Number(btn.dataset.moveUp);
        if (i <= 0) return;
        [screen.blocks[i - 1], screen.blocks[i]] = [screen.blocks[i], screen.blocks[i - 1]];
        refresh();
      });
    });
    root.querySelectorAll("[data-move-down]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const i = Number(btn.dataset.moveDown);
        if (i >= screen.blocks.length - 1) return;
        [screen.blocks[i + 1], screen.blocks[i]] = [screen.blocks[i], screen.blocks[i + 1]];
        refresh();
      });
    });
  };

  root.querySelectorAll("[data-add]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const type = btn.dataset.add;
      if (type === "dato") {
        const usable = flow.inputParams.filter((p) => (node.usedParamIds ?? []).includes(p.id));
        if (usable.length === 0) {
          toast("Marque primero los datos que usa la actividad.");
          return;
        }
        const paramId = usable[0].id;
        screen.blocks.push({ id: createId("blk"), type: "dato", paramId });
      } else if (type === "titulo") {
        const text = prompt("Texto del título:", "Título");
        if (text === null) return;
        screen.blocks.push({ id: createId("blk"), type: "titulo", text });
      } else if (type === "texto") {
        const text = prompt("Texto fijo:", "");
        if (text === null) return;
        screen.blocks.push({ id: createId("blk"), type: "texto", text });
      } else {
        if (!screen.blocks.some((b) => b.type === "comentario")) {
          screen.blocks.push({ id: createId("blk"), type: "comentario" });
        }
      }
      refresh();
    });
  });

  bindBlockActions();

  root.querySelector("#btn-save-screen").addEventListener("click", () => {
    if (!screen.blocks.some((b) => b.type === "comentario")) {
      screen.blocks.push({ id: createId("blk"), type: "comentario" });
    }
    onSave();
    close();
    toast("Pantalla guardada.");
  });
}
