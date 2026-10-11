/**
 * Vista de diagrama de flujo de instancia (solo lectura) + datos y traza.
 */

import { renderActionButton } from "./action-icons.js";
import { escapeHtml, formatDateTime } from "./ui.js";
import {
  NODE_KINDS,
  LINE_TYPES,
  normalizeFlowNodes,
} from "./validation.js";
import { computeLaneLayout, getNodeBox } from "./pool-geometry.js";
import { createId } from "./ids.js";
import { statusLabel } from "./motor.js";
import {
  buildInstanceDataSections,
  formatStepStatusLabel,
  instanceStatusBadgeClass,
} from "./gestion-instance-helpers.js";

function nodePortOut(node, condition = null) {
  const box = getNodeBox(node.kind);
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
  const box = getNodeBox(node.kind);
  return { x: node.x, y: node.y + box.h / 2 };
}

function renderPreviewNode(node, currentNodeId) {
  const isCurrent = node.id === currentNodeId;
  const kindLabel = {
    inicio: "Start",
    manual: "User Task",
    automatica: "Service Task",
    gateway: "Gateway",
    fin: "End",
  }[node.kind];
  const icon =
    node.kind === NODE_KINDS.MANUAL
      ? `<span class="bpmn-task-icon" aria-hidden="true">👤</span>`
      : node.kind === NODE_KINDS.AUTOMATICA
        ? `<span class="bpmn-task-icon" aria-hidden="true">⚙</span>`
        : node.kind === NODE_KINDS.GATEWAY
          ? `<span class="bpmn-gateway-x gateway-mark gateway-mark-exclusive" aria-hidden="true"></span>`
          : "";
  const body =
    node.kind === NODE_KINDS.GATEWAY
      ? `<div class="gateway-node-shape">${icon}<div class="node-kind">${kindLabel}</div><div class="node-name">${escapeHtml(node.name)}</div></div>`
      : `${icon}<div class="node-kind">${kindLabel}</div><div class="node-name">${escapeHtml(node.name)}</div>`;

  return `
    <div class="flow-node flow-node--readonly node-${node.kind} ${isCurrent ? "is-instance-current" : ""}"
         style="left:${node.x}px;top:${node.y}px"
         title="${escapeHtml(node.name)}">
      ${body}
    </div>`;
}

/**
 * @param {string} type
 */
function traceTypeLabel(type) {
  const map = {
    inicio: "Inicio",
    manual: "User Task",
    automatica: "Automático",
    gateway: "Gateway",
    integration_request: "Integración",
    integration_response: "Respuesta",
    fin: "Fin",
    error: "Error",
    info: "Info",
  };
  return map[type] ?? type ?? "Evento";
}

/**
 * @param {string} decision
 */
function traceDecisionLabel(decision) {
  if (decision === "aceptar") return "Aprobación / Aceptar";
  if (decision === "rechazar") return "Rechazo";
  return decision;
}

/**
 * @param {object[]} sections
 */
function renderInstanceDataPanel(sections) {
  if (!sections.length) {
    return `<p class="gestion-empty">Todavía no hay datos cargados en esta instancia.</p>`;
  }
  const cards = sections
    .map((sec) => {
      const meta = [
        sec.at ? `<time class="instance-preview-step-time">${formatDateTime(sec.at)}</time>` : "",
        sec.status
          ? `<span class="badge badge-${sec.status === "rechazada" ? "rechazada" : sec.status === "aceptada" ? "completada" : "curso"}">${escapeHtml(formatStepStatusLabel(sec.status))}</span>`
          : "",
      ]
        .filter(Boolean)
        .join("");
      const rows = sec.fields
        .map(
          (f) =>
            `<tr><th scope="row">${escapeHtml(f.label)}</th><td>${escapeHtml(f.value)}</td></tr>`,
        )
        .join("");
      return `
      <article class="instance-preview-step-card">
        <header class="instance-preview-step-head">
          <div>
            <strong>${escapeHtml(sec.title)}</strong>
            ${sec.kind ? `<span class="form-hint instance-preview-step-kind">${escapeHtml(sec.kind)}</span>` : ""}
          </div>
          ${meta ? `<div class="instance-preview-step-meta">${meta}</div>` : ""}
        </header>
        ${sec.comment ? `<p class="form-hint instance-preview-step-comment">Comentario: ${escapeHtml(sec.comment)}</p>` : ""}
        ${
          rows
            ? `<table class="instance-preview-fields table-modern"><tbody>${rows}</tbody></table>`
            : `<p class="form-hint">Sin campos registrados.</p>`
        }
      </article>`;
    })
    .join("");
  return `<div class="instance-preview-data-list">${cards}</div>`;
}

/**
 * @param {object} instance
 */
function renderInstanceTracePanel(instance) {
  const trace = [...(instance.trace ?? [])].sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
  );
  if (!trace.length) {
    return `<p class="gestion-empty">Sin eventos en la traza.</p>`;
  }
  const items = trace
    .map((t) => {
      const node = instance.flowSnapshot?.nodes?.find((n) => n.id === t.nodeId);
      return `
      <li class="trace-item instance-preview-trace-item">
        <div class="instance-preview-trace-head">
          <time>${formatDateTime(t.at)}</time>
          <span class="badge badge-borrador">${escapeHtml(traceTypeLabel(t.type))}</span>
        </div>
        <p class="instance-preview-trace-msg">${escapeHtml(t.message)}</p>
        ${node ? `<p class="form-hint">Paso: ${escapeHtml(node.name)}</p>` : ""}
        ${t.decision ? `<p class="form-hint"><strong>Decisión:</strong> ${escapeHtml(traceDecisionLabel(t.decision))}</p>` : ""}
        ${t.comment ? `<p class="form-hint"><strong>Comentario:</strong> ${escapeHtml(t.comment)}</p>` : ""}
      </li>`;
    })
    .join("");
  return `<ul class="trace-list instance-preview-trace-list">${items}</ul>`;
}

/**
 * @param {object} instance
 */
function renderFlowDiagramPanel(instance) {
  const flow = JSON.parse(JSON.stringify(instance.flowSnapshot));
  if (!flow.lanes?.length) {
    flow.lanes = [{ id: createId("lane"), name: "General", height: 180 }];
  }
  normalizeFlowNodes(flow);

  const layout = computeLaneLayout(flow, { viewportWidth: 960 });
  const nodeById = Object.fromEntries((flow.nodes ?? []).map((n) => [n.id, n]));

  const laneHtml = layout.lanes
    .map(
      (lane) =>
        `<div class="flow-lane-band" style="top:${lane.top}px;left:${lane.left}px;width:${lane.width}px;height:${lane.height}px">
          <div class="flow-lane-title">${escapeHtml(lane.name)}</div>
        </div>`,
    )
    .join("");

  const paths = (flow.transitions ?? [])
    .map((t) => {
      const from = nodeById[t.fromId];
      const to = nodeById[t.toId];
      if (!from || !to) return "";
      const lt = t.lineType ?? LINE_TYPES.SEQUENCE;
      if (lt !== LINE_TYPES.SEQUENCE) return "";
      const cond = lt === LINE_TYPES.SEQUENCE ? t.condition : null;
      const a = nodePortOut(from, cond === "siempre" ? null : cond);
      const b = nodePortIn(to);
      return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#94a3b8" stroke-width="2" marker-end="url(#arrow-preview)" />`;
    })
    .join("");

  const nodesHtml = (flow.nodes ?? [])
    .map((n) => renderPreviewNode(n, instance.currentNodeId))
    .join("");

  const legend = instance.currentNodeId
    ? `<p class="gestion-preview-legend">El paso resaltado es el paso actual de la instancia.</p>`
    : `<p class="gestion-preview-legend">Instancia finalizada — diagrama en solo lectura.</p>`;

  return `
    ${legend}
    <div class="gestion-flow-preview-wrap">
      <div class="gestion-flow-preview-canvas" style="width:${layout.canvasMinWidth}px;height:${layout.canvasMinHeight}px">
        <svg class="gestion-flow-preview-svg" width="${layout.canvasMinWidth}" height="${layout.canvasMinHeight}">
          <defs>
            <marker id="arrow-preview" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#94a3b8" />
            </marker>
          </defs>
          ${paths}
        </svg>
        ${laneHtml}
        ${nodesHtml}
      </div>
    </div>`;
}

/**
 * @param {ParentNode} root
 * @param {string} activeTab
 */
function bindPreviewTabs(root, activeTab) {
  let tab = activeTab;
  const sync = () => {
    root.querySelectorAll("[data-preview-tab]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.previewTab === tab);
      btn.setAttribute("aria-selected", btn.dataset.previewTab === tab ? "true" : "false");
    });
    root.querySelectorAll("[data-preview-panel]").forEach((panel) => {
      const show = panel.dataset.previewPanel === tab;
      panel.hidden = !show;
    });
  };
  root.querySelectorAll("[data-preview-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      tab = btn.dataset.previewTab ?? "datos";
      sync();
    });
  });
  sync();
}

/**
 * @param {object} instance
 */
export function renderFlowPreviewPageHtml(instance) {
  const dataSections = buildInstanceDataSections(instance);
  const statusBadge = `<span class="badge badge-${instanceStatusBadgeClass(instance.status)}">${escapeHtml(statusLabel(instance.status))}</span>`;

  return `
    <section class="gestion-hero gestion-hero--preview panel">
      <header class="gestion-hero-header">
        ${renderActionButton({ icon: "back", label: "Volver al listado", className: "gestion-hero-back", extraAttrs: "data-gestion-back" })}
        <div class="gestion-hero-heading">
          <h2>Visualizar flujo</h2>
          <p class="gestion-hero-subtitle">${escapeHtml(instance.flowName)} · ${statusBadge}</p>
        </div>
      </header>
      <div class="gestion-preview-tabs component-attr-tabs" role="tablist">
        <button type="button" class="component-attr-tab is-active" data-preview-tab="datos" role="tab" aria-selected="true">Datos</button>
        <button type="button" class="component-attr-tab" data-preview-tab="traza" role="tab" aria-selected="false">Traza</button>
        <button type="button" class="component-attr-tab" data-preview-tab="diagrama" role="tab" aria-selected="false">Diagrama</button>
      </div>
      <div class="gestion-preview-panels gestion-preview-panels--hero">
        <div class="gestion-preview-panel" data-preview-panel="datos" role="tabpanel">
          <p class="gestion-preview-legend">Valores cargados en cada paso del flujo (inicio, tareas y atributos de componente).</p>
          ${renderInstanceDataPanel(dataSections)}
        </div>
        <div class="gestion-preview-panel" data-preview-panel="traza" role="tabpanel" hidden>
          <p class="gestion-preview-legend">Historial de acciones con fecha y hora, decisiones y comentarios.</p>
          ${renderInstanceTracePanel(instance)}
        </div>
        <div class="gestion-preview-panel" data-preview-panel="diagrama" role="tabpanel" hidden>
          ${renderFlowDiagramPanel(instance)}
        </div>
      </div>
    </section>`;
}

/**
 * @param {ParentNode} root
 * @param {object} instance
 * @param {string} [activeTab]
 */
export function bindFlowPreviewPage(root, instance, activeTab = "datos") {
  bindPreviewTabs(root, activeTab);
}
