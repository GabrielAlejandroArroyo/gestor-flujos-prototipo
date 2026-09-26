import { getCurrentNode, countProgress, statusLabel } from "./motor.js";
import { escapeHtml, formatDateTime } from "./ui.js";

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
      <h2 class="panel-title">Reporte de avance</h2>
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
      <div class="split" style="grid-template-columns:1fr 1fr">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Flujo</th><th>Estado</th><th>Avance</th><th>Inicio</th></tr></thead>
            <tbody>
              ${instances.map((i) => {
                const prog = countProgress(i);
                const node = getCurrentNode(i);
                return `<tr data-report-inst="${i.id}" style="cursor:pointer" class="${i.id === selectedReportInstanceId ? "is-selected" : ""}">
                  <td>${escapeHtml(i.flowName)}</td>
                  <td><span class="badge badge-${badgeForStatus(i.status)}">${statusLabel(i.status)}</span></td>
                  <td>${prog.pct}% · ${escapeHtml(node?.name ?? "Finalizado")}</td>
                  <td>${formatDateTime(i.startedAt)}</td>
                </tr>`;
              }).join("") || `<tr><td colspan="4" class="empty-state">Sin instancias.</td></tr>`}
            </tbody>
          </table>
        </div>
        <div class="panel">
          ${selected ? renderDetail(selected) : `<p class="empty-state">Seleccione una instancia.</p>`}
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

  const trace = instance.trace
    .map(
      (t) => `
    <li class="trace-item">
      <time>${formatDateTime(t.at)}</time> — ${escapeHtml(t.message)}
      ${t.comment ? `<div style="color:var(--muted)">Comentario: ${escapeHtml(t.comment)}</div>` : ""}
      ${t.decision ? `<div>Decisión: ${escapeHtml(t.decision)}</div>` : ""}
    </li>`,
    )
    .join("");

  return `
    <h3 style="margin-top:0">${escapeHtml(instance.flowName)}</h3>
    <p><span class="badge badge-${badgeForStatus(instance.status)}">${statusLabel(instance.status)}</span></p>
    <div class="progress-bar"><span style="width:${prog.pct}%"></span></div>
    <p style="font-size:0.8rem;color:var(--muted)">${prog.done} actividades registradas · Paso actual: ${escapeHtml(node?.name ?? "—")}</p>
    <h4>Datos de entrada</h4>
    <ul style="font-size:0.85rem">${inputs || "<li>—</li>"}</ul>
    <h4>Traza</h4>
    <ul class="trace-list">${trace}</ul>`;
}
