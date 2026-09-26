import { getCurrentNode, countProgress, statusLabel } from "./motor.js";
import { escapeHtml, formatDateTime, renderPageHeader } from "./ui.js";

let selectedReportInstanceId = null;

export function renderReporte(mainEl, state) {
  const filterFlow = mainEl.dataset.filterFlow ?? "";
  const filterStatus = mainEl.dataset.filterStatus ?? "";

  let instances = [...state.instances];
  if (filterFlow) instances = instances.filter((i) => i.flowId === filterFlow);
  if (filterStatus) instances = instances.filter((i) => i.status === filterStatus);

  const selected = instances.find((i) => i.id === selectedReportInstanceId) ?? instances[0] ?? null;
  if (selected) selectedReportInstanceId = selected.id;

  mainEl.innerHTML = `
    <section class="panel">
      ${renderPageHeader(
        "Reporte de avance",
        "Filtrá instancias y revisá contexto, entradas y traza de ejecución.",
      )}
      <div class="filters">
        <div class="form-row">
          <label>Flujo</label>
          <select id="filter-flow">
            <option value="">Todos</option>
            ${state.flows.map((f) => `<option value="${f.id}" ${filterFlow === f.id ? "selected" : ""}>${escapeHtml(f.name)}</option>`).join("")}
          </select>
        </div>
        <div class="form-row">
          <label>Estado</label>
          <select id="filter-status">
            <option value="">Todos</option>
            <option value="en_curso" ${filterStatus === "en_curso" ? "selected" : ""}>En curso</option>
            <option value="completada" ${filterStatus === "completada" ? "selected" : ""}>Completada</option>
            <option value="cerrada_rechazo" ${filterStatus === "cerrada_rechazo" ? "selected" : ""}>Cerrada por rechazo</option>
          </select>
        </div>
      </div>
      <div class="report-split">
        <div class="table-wrap table-wrap--modern">
          <table class="table-modern">
            <thead><tr><th>Flujo</th><th>Estado</th><th>Avance</th><th>Inicio</th></tr></thead>
            <tbody>
              ${instances
                .map((i) => {
                  const prog = countProgress(i);
                  const node = getCurrentNode(i);
                  return `<tr data-report-inst="${i.id}" class="table-row-selectable ${i.id === selectedReportInstanceId ? "is-selected" : ""}">
                  <td>${escapeHtml(i.flowName)}</td>
                  <td><span class="badge badge-${badgeForStatus(i.status)}">${statusLabel(i.status)}</span></td>
                  <td>${prog.pct}% · ${escapeHtml(node?.name ?? "Finalizado")}</td>
                  <td>${formatDateTime(i.startedAt)}</td>
                </tr>`;
                })
                .join("") || `<tr><td colspan="4"><div class="empty-state empty-state--rich"><strong>Sin instancias</strong><p>Iniciá un flujo en Gestión para ver reportes aquí.</p></div></td></tr>`}
            </tbody>
          </table>
        </div>
        <div class="panel">
          ${selected ? renderDetail(selected) : `<p class="gestion-empty">Seleccioná una instancia.</p>`}
        </div>
      </div>
    </section>`;

  mainEl.querySelector("#filter-flow")?.addEventListener("change", (e) => {
    mainEl.dataset.filterFlow = e.target.value;
    renderReporte(mainEl, state);
  });
  mainEl.querySelector("#filter-status")?.addEventListener("change", (e) => {
    mainEl.dataset.filterStatus = e.target.value;
    renderReporte(mainEl, state);
  });

  mainEl.querySelectorAll("[data-report-inst]").forEach((row) => {
    row.addEventListener("click", () => {
      selectedReportInstanceId = row.dataset.reportInst;
      renderReporte(mainEl, state);
    });
  });
}

function badgeForStatus(status) {
  if (status === "en_curso") return "curso";
  if (status === "completada") return "completada";
  return "rechazada";
}

function renderDetail(instance) {
  const prog = countProgress(instance);
  const node = getCurrentNode(instance);
  const inputs = Object.entries(instance.inputValues)
    .map(([k, v]) => `<li><strong>${escapeHtml(k)}:</strong> ${escapeHtml(String(v))}</li>`)
    .join("");
  const ctxEntries = Object.entries(instance.context ?? {});
  const context =
    ctxEntries.length === 0
      ? "<li>—</li>"
      : `<pre class="report-context-json">${escapeHtml(JSON.stringify(Object.fromEntries(ctxEntries), null, 2))}</pre>`;

  const trace = instance.trace
    .map(
      (t) => `
    <li class="trace-item">
      <time>${formatDateTime(t.at)}</time> — ${escapeHtml(t.message)}
      ${t.comment ? `<div class="form-hint">Comentario: ${escapeHtml(t.comment)}</div>` : ""}
      ${t.decision ? `<div class="form-hint">Decisión: ${escapeHtml(t.decision)}</div>` : ""}
    </li>`,
    )
    .join("");

  return `
    <h3 class="report-detail-title">${escapeHtml(instance.flowName)}</h3>
    <p><span class="badge badge-${badgeForStatus(instance.status)}">${statusLabel(instance.status)}</span></p>
    <div class="progress-bar"><span style="width:${prog.pct}%"></span></div>
    <p class="form-hint">${prog.done} actividades registradas · Paso actual: ${escapeHtml(node?.name ?? "—")}</p>
    <h4>Datos de entrada</h4>
    <ul class="trace-list">${inputs || "<li>—</li>"}</ul>
    <h4>Contexto de instancia</h4>
    ${context.startsWith("<pre") ? context : `<ul class="trace-list">${context}</ul>`}
    <h4>Traza</h4>
    <ul class="trace-list">${trace || "<li>—</li>"}</ul>`;
}
