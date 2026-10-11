/**
 * Hub de reportes del mock — vistas de solo lectura sobre datos del sistema.
 */

import { formatEntityKindLabel, summarizeEntityAttributesForList } from "./entities.js";
import { countFlowsUsingFlowType } from "./flow-types.js";
import { masterAuditActionLabel, masterAuditAreaLabel } from "./master-audit.js";
import { renderReporte } from "./reporte.js";
import { escapeHtml, formatDateTime, renderPageHeader } from "./ui.js";
import { NODE_KINDS } from "./validation.js";

const ACTIVITY_CATALOG_KINDS = new Set([
  NODE_KINDS.INICIO,
  NODE_KINDS.FIN,
  NODE_KINDS.GATEWAY,
  NODE_KINDS.MANUAL,
  NODE_KINDS.AUTOMATICA,
]);

/** @type {readonly { id: string; title: string; description: string }[]} */
export const REPORT_NAV_ITEMS = [
  {
    id: "report-activities",
    title: "Actividades (ejecución)",
    description: "Instancias en curso o finalizadas, contexto y traza.",
  },
  {
    id: "report-maestros-changes",
    title: "Cambios en maestros",
    description: "Alta, baja y modificación de tipos de flujo y entidades.",
  },
  {
    id: "report-flows",
    title: "Catálogo de flujos",
    description: "Flujos definidos en el diseñador y su estado de publicación.",
  },
  {
    id: "report-flow-types",
    title: "Tipos de flujo",
    description: "Maestro de tipos y uso en flujos.",
  },
  {
    id: "report-entities",
    title: "Entidades",
    description: "Maestro de entidades de negocio y atributos.",
  },
  {
    id: "report-activities-catalog",
    title: "Catálogo de actividades",
    description: "Componentes de actividad por flujo (vista catálogo del diseñador).",
  },
];

/**
 * @param {HTMLElement} mainEl
 * @param {object} state
 * @param {string} reportId
 */
export function renderReportView(mainEl, state, reportId) {
  switch (reportId) {
    case "report-activities":
      renderReporte(mainEl, state, {
        title: "Reporte de actividades",
        subtitle: "Ejecución de instancias: avance, contexto y traza (Operaciones → Gestión).",
      });
      return;
    case "report-maestros-changes":
      renderReportMaestrosChanges(mainEl, state);
      return;
    case "report-flows":
      renderReportFlowsCatalog(mainEl, state);
      return;
    case "report-flow-types":
      renderReportFlowTypes(mainEl, state);
      return;
    case "report-entities":
      renderReportEntities(mainEl, state);
      return;
    case "report-activities-catalog":
      renderReportActivitiesCatalog(mainEl, state);
      return;
    default:
      renderReportHubFallback(mainEl, reportId);
  }
}

/**
 * @param {HTMLElement} mainEl
 * @param {string} reportId
 */
function renderReportHubFallback(mainEl, reportId) {
  const meta = REPORT_NAV_ITEMS.find((r) => r.id === reportId);
  mainEl.innerHTML = `
    <section class="panel">
      ${renderPageHeader(meta?.title ?? "Reporte", meta?.description ?? "Seleccioná un reporte en el menú Reportes.")}
      <p class="gestion-empty">Vista no disponible.</p>
    </section>`;
}

/**
 * @param {HTMLElement} mainEl
 * @param {object} state
 */
function renderReportMaestrosChanges(mainEl, state) {
  const filterArea = mainEl.dataset.auditArea ?? "";
  const filterAction = mainEl.dataset.auditAction ?? "";
  let rows = [...(state.masterAuditLog ?? [])];
  if (filterArea) rows = rows.filter((r) => r.area === filterArea);
  if (filterAction) rows = rows.filter((r) => r.action === filterAction);

  const tbody =
    rows.length === 0
      ? `<tr><td colspan="5"><div class="empty-state empty-state--rich"><strong>Sin registros</strong><p>Los cambios en Maestros (tipos de flujo y entidades) aparecerán aquí.</p></div></td></tr>`
      : rows
          .map(
            (r) => `<tr>
        <td>${formatDateTime(r.at)}</td>
        <td>${escapeHtml(r.userLabel ?? r.userId ?? "—")}</td>
        <td>${escapeHtml(masterAuditAreaLabel(r.area))}</td>
        <td><span class="badge badge-listo">${escapeHtml(masterAuditActionLabel(r.action))}</span></td>
        <td><strong>${escapeHtml(r.label)}</strong>${r.detail ? `<div class="form-hint">${escapeHtml(r.detail)}</div>` : ""}</td>
      </tr>`,
          )
          .join("");

  mainEl.innerHTML = `
    <section class="panel panel--catalog">
      ${renderPageHeader(
        "Gestión de cambios en maestros",
        "Auditoría de altas, bajas y modificaciones en tipos de flujo y entidades.",
      )}
      <div class="filters">
        <div class="form-row">
          <label>Área</label>
          <select id="filter-audit-area">
            <option value="">Todas</option>
            <option value="flowType" ${filterArea === "flowType" ? "selected" : ""}>Tipo de flujo</option>
            <option value="entity" ${filterArea === "entity" ? "selected" : ""}>Entidad</option>
          </select>
        </div>
        <div class="form-row">
          <label>Acción</label>
          <select id="filter-audit-action">
            <option value="">Todas</option>
            <option value="create" ${filterAction === "create" ? "selected" : ""}>Alta</option>
            <option value="update" ${filterAction === "update" ? "selected" : ""}>Modificación</option>
            <option value="delete" ${filterAction === "delete" ? "selected" : ""}>Baja</option>
          </select>
        </div>
      </div>
      <div class="table-wrap table-wrap--modern">
        <table class="table-modern">
          <thead><tr><th>Fecha (UTC/local UI)</th><th>Usuario</th><th>Maestro</th><th>Acción</th><th>Detalle</th></tr></thead>
          <tbody>${tbody}</tbody>
        </table>
      </div>
    </section>`;

  mainEl.querySelector("#filter-audit-area")?.addEventListener("change", (e) => {
    mainEl.dataset.auditArea = e.target.value;
    renderReportMaestrosChanges(mainEl, state);
  });
  mainEl.querySelector("#filter-audit-action")?.addEventListener("change", (e) => {
    mainEl.dataset.auditAction = e.target.value;
    renderReportMaestrosChanges(mainEl, state);
  });
}

/**
 * @param {HTMLElement} mainEl
 * @param {object} state
 */
function renderReportFlowsCatalog(mainEl, state) {
  const flows = state.flows ?? [];
  const rows =
    flows.length === 0
      ? `<tr><td colspan="4"><p class="gestion-empty">No hay flujos en el catálogo.</p></td></tr>`
      : flows
          .map((f) => {
            const nodeCount = (f.nodes ?? []).length;
            const status = f.status ?? "borrador";
            return `<tr>
          <td><strong>${escapeHtml(f.name)}</strong><div class="form-hint"><code>${escapeHtml(f.id)}</code></div></td>
          <td><span class="badge badge-${status === "listo" ? "listo" : "borrador"}">${status === "listo" ? "Listo" : "Borrador"}</span></td>
          <td>${escapeHtml(f.type ?? "—")}</td>
          <td>${nodeCount} nodos</td>
        </tr>`;
          })
          .join("");

  mainEl.innerHTML = `
    <section class="panel panel--catalog">
      ${renderPageHeader("Reporte — catálogo de flujos", "Snapshot de los flujos definidos en el diseñador.")}
      <div class="table-wrap table-wrap--modern">
        <table class="table-modern">
          <thead><tr><th>Flujo</th><th>Estado</th><th>Tipo</th><th>Diagrama</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>`;
}

/**
 * @param {HTMLElement} mainEl
 * @param {object} state
 */
function renderReportFlowTypes(mainEl, state) {
  const types = state.flowTypes ?? [];
  const rows =
    types.length === 0
      ? `<tr><td colspan="3"><p class="gestion-empty">No hay tipos de flujo.</p></td></tr>`
      : types
          .map((t) => {
            const used = countFlowsUsingFlowType(state, t.id);
            return `<tr>
          <td><strong>${escapeHtml(t.name)}</strong></td>
          <td>${escapeHtml(t.description || "—")}</td>
          <td>${used} ${used === 1 ? "flujo" : "flujos"}</td>
        </tr>`;
          })
          .join("");

  mainEl.innerHTML = `
    <section class="panel panel--catalog">
      ${renderPageHeader("Reporte — tipos de flujo", "Maestro de tipos de flujo y referencias en diseños.")}
      <div class="table-wrap table-wrap--modern">
        <table class="table-modern">
          <thead><tr><th>Nombre</th><th>Descripción</th><th>Uso</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>`;
}

/**
 * @param {HTMLElement} mainEl
 * @param {object} state
 */
function renderReportEntities(mainEl, state) {
  const entities = state.entities ?? [];
  const rows =
    entities.length === 0
      ? `<tr><td colspan="3"><p class="gestion-empty">No hay entidades.</p></td></tr>`
      : entities
          .map((e) => {
            const kind = formatEntityKindLabel(state, e);
            const attrs = summarizeEntityAttributesForList(state, e.attributes);
            return `<tr>
          <td><strong>${escapeHtml(e.name)}</strong></td>
          <td>${kind}</td>
          <td>${escapeHtml(attrs)}</td>
        </tr>`;
          })
          .join("");

  mainEl.innerHTML = `
    <section class="panel panel--catalog">
      ${renderPageHeader("Reporte — entidades", "Maestro de entidades y resumen de atributos.")}
      <div class="table-wrap table-wrap--modern">
        <table class="table-modern">
          <thead><tr><th>Entidad</th><th>Clasificación</th><th>Atributos</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>`;
}

/**
 * @param {object} flow
 */
function listCatalogActivityNodes(flow) {
  return (flow.nodes ?? []).filter((n) => ACTIVITY_CATALOG_KINDS.has(n.kind));
}

/**
 * @param {HTMLElement} mainEl
 * @param {object} state
 */
function renderReportActivitiesCatalog(mainEl, state) {
  const flows = state.flows ?? [];
  const sections = flows
    .map((flow) => {
      const nodes = listCatalogActivityNodes(flow);
      if (!nodes.length) return "";
      const inner = nodes
        .map(
          (n) => `<tr>
        <td>${escapeHtml(n.name ?? n.id)}</td>
        <td><code>${escapeHtml(n.kind)}</code></td>
        <td><code>${escapeHtml(n.id)}</code></td>
      </tr>`,
        )
        .join("");
      return `
      <div class="report-catalog-flow-block">
        <h3 class="report-catalog-flow-title">${escapeHtml(flow.name)}</h3>
        <div class="table-wrap table-wrap--modern">
          <table class="table-modern">
            <thead><tr><th>Componente</th><th>Tipo</th><th>Id</th></tr></thead>
            <tbody>${inner}</tbody>
          </table>
        </div>
      </div>`;
    })
    .filter(Boolean)
    .join("");

  mainEl.innerHTML = `
    <section class="panel panel--catalog">
      ${renderPageHeader(
        "Reporte — catálogo de actividades",
        "Componentes visibles en Diseñador → Catálogo de actividades, agrupados por flujo.",
      )}
      ${sections || `<p class="gestion-empty">No hay componentes de catálogo en los flujos actuales.</p>`}
    </section>`;
}
