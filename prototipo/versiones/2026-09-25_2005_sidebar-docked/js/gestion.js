import { cloneFlowSnapshot, validateFlow, NODE_KINDS } from "./validation.js";
import {
  createInstance,
  getCurrentNode,
  resolveManual,
  advanceAutomatic,
  statusLabel,
} from "./motor.js";
import { escapeHtml, formatDateTime, toast } from "./ui.js";

let selectedInstanceId = null;

export function renderGestion(mainEl, state, persist) {
  const readyFlows = state.flows.filter((f) => f.status === "listo");
  const activeInstances = state.instances.filter((i) => i.status === "en_curso");
  const selected = state.instances.find((i) => i.id === selectedInstanceId);

  mainEl.innerHTML = `
    <div class="gestion-layout">
      <section class="panel">
        <h2 class="panel-title">Instanciar flujo</h2>
        ${readyFlows.length === 0 ? `<p style="color:var(--muted);font-size:0.85rem">No hay flujos listos. Márquelos en el diseñador.</p>` : `
        <form id="form-new-instance" class="form-grid">
          <div class="form-row">
            <label>Flujo</label>
            <select name="flowId" id="select-flow" required>
              ${readyFlows.map((f) => `<option value="${f.id}">${escapeHtml(f.name)}</option>`).join("")}
            </select>
          </div>
          <div id="input-fields"></div>
          <button type="submit" class="btn btn-primary">Iniciar instancia</button>
        </form>`}
        <h3 class="panel-title" style="margin-top:1.25rem">En curso (${activeInstances.length})</h3>
        <div class="card-grid">
          ${activeInstances.map((i) => renderInstanceCard(i, i.id === selectedInstanceId)).join("") || `<p class="empty-state" style="padding:1rem">Sin instancias activas.</p>`}
        </div>
      </section>
      <section class="panel">
        <h2 class="panel-title">Resolver actividad</h2>
        ${selected ? renderResolver(selected, state) : `<p style="color:var(--muted)">Seleccione una instancia en curso.</p>`}
      </section>
    </div>`;

  bindGestion(mainEl, state, persist, readyFlows);
}

function renderInstanceCard(instance, isSelected) {
  const node = getCurrentNode(instance);
  return `
    <article class="panel instance-card ${isSelected ? "is-selected" : ""}" data-inst="${instance.id}">
      <strong>${escapeHtml(instance.flowName)}</strong>
      <div style="font-size:0.8rem;color:var(--muted);margin-top:0.35rem">${formatDateTime(instance.startedAt)}</div>
      <div style="font-size:0.85rem;margin-top:0.5rem">Pendiente: ${escapeHtml(node?.name ?? "—")}</div>
    </article>`;
}

function renderInputFields(flow) {
  return flow.inputParams
    .map((p) => {
      let input = `<input name="${escapeHtml(p.key)}" ${p.required ? "required" : ""} />`;
      if (p.type === "fecha") input = `<input type="date" name="${escapeHtml(p.key)}" ${p.required ? "required" : ""} />`;
      if (p.type === "numero") input = `<input type="number" name="${escapeHtml(p.key)}" ${p.required ? "required" : ""} />`;
      if (p.type === "si_no") {
        input = `<select name="${escapeHtml(p.key)}" ${p.required ? "required" : ""}><option value="">—</option><option value="si">Sí</option><option value="no">No</option></select>`;
      }
      return `<div class="form-row"><label>${escapeHtml(p.label)}</label>${input}</div>`;
    })
    .join("");
}

function bindGestion(mainEl, state, persist, readyFlows) {
  const selectFlow = mainEl.querySelector("#select-flow");
  const inputFields = mainEl.querySelector("#input-fields");

  const updateFields = () => {
    if (!selectFlow || !inputFields) return;
    const flow = state.flows.find((f) => f.id === selectFlow.value);
    inputFields.innerHTML = flow ? renderInputFields(flow) : "";
  };

  selectFlow?.addEventListener("change", updateFields);
  updateFields();

  mainEl.querySelector("#form-new-instance")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const flowId = fd.get("flowId");
    const flow = state.flows.find((f) => f.id === flowId);
    if (!flow || flow.status !== "listo") return;

    const v = validateFlow(flow);
    if (!v.isValid) {
      toast("El flujo ya no cumple validación.");
      return;
    }

    const inputValues = {};
    for (const p of flow.inputParams) {
      let val = fd.get(p.key);
      if (p.type === "numero" && val !== "") val = Number(val);
      inputValues[p.key] = val ?? "";
    }

    const snapshot = cloneFlowSnapshot(flow);
    const instance = createInstance(snapshot, inputValues);
    state.instances.unshift(instance);
    selectedInstanceId = instance.id;
    persist();
    toast("Instancia iniciada.");
    renderGestion(mainEl, state, persist);
  });

  mainEl.querySelectorAll("[data-inst]").forEach((card) => {
    card.addEventListener("click", () => {
      selectedInstanceId = card.dataset.inst;
      renderGestion(mainEl, state, persist);
    });
  });

  bindResolver(mainEl, state, persist);
}

function renderResolver(instance, state) {
  const node = getCurrentNode(instance);
  if (!node) {
    return `<p>Instancia finalizada: <span class="badge badge-${instance.status === "completada" ? "completada" : "rechazada"}">${statusLabel(instance.status)}</span></p>`;
  }

  if (node.kind === NODE_KINDS.AUTOMATICA) {
    return `
      <p><strong>${escapeHtml(node.name)}</strong> (automática)</p>
      <p style="font-size:0.85rem;color:var(--muted)">${escapeHtml(node.description || "")}</p>
      <button type="button" class="btn btn-primary" id="btn-run-auto">Ejecutar y continuar</button>`;
  }

  if (node.kind === NODE_KINDS.MANUAL) {
    const screen = instance.flowSnapshot.screens?.[node.id];
    return `
      <p style="font-size:0.85rem;color:var(--muted);margin-bottom:1rem">${escapeHtml(node.description || "")}</p>
      <form id="form-manual" class="screen-preview">${renderScreenForInstance(instance, screen)}</form>`;
  }

  return `<p>Nodo inesperado: ${escapeHtml(node.name)}</p>`;
}

function renderScreenForInstance(instance, screen) {
  const params = instance.flowSnapshot.inputParams ?? [];
  const blocks = screen?.blocks ?? [];
  let html = "";

  for (const b of blocks) {
    if (b.type === "titulo") html += `<h3>${escapeHtml(b.text || "")}</h3>`;
    if (b.type === "texto") html += `<p>${escapeHtml(b.text || "")}</p>`;
    if (b.type === "dato") {
      const p = params.find((x) => x.id === b.paramId);
      const val = p ? instance.inputValues[p.key] : "";
      html += `<div class="preview-field"><div class="preview-label">${escapeHtml(p?.label ?? "Dato")}</div><input readonly value="${escapeHtml(String(val))}" /></div>`;
    }
    if (b.type === "comentario") {
      html += `<div class="preview-field"><div class="preview-label">Comentario</div><textarea name="comment" placeholder="Notas"></textarea></div>`;
    }
  }

  html += `
    <div class="preview-actions">
      <button type="button" class="btn btn-success" data-decision="aceptar">Aceptar</button>
      <button type="button" class="btn btn-danger" data-decision="rechazar">Rechazar</button>
    </div>`;
  return html;
}

function bindResolver(mainEl, state, persist) {
  mainEl.querySelector("#btn-run-auto")?.addEventListener("click", () => {
    const instance = state.instances.find((i) => i.id === selectedInstanceId);
    if (!instance) return;
    advanceAutomatic(instance);
    persist();
    renderGestion(mainEl, state, persist);
  });

  const form = mainEl.querySelector("#form-manual");
  if (!form) return;

  form.querySelectorAll("[data-decision]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const instance = state.instances.find((i) => i.id === selectedInstanceId);
      if (!instance) return;
      const comment = form.querySelector('[name="comment"]')?.value ?? "";
      resolveManual(instance, btn.dataset.decision, comment);
      persist();
      toast(btn.dataset.decision === "aceptar" ? "Aceptado." : "Rechazado.");
      renderGestion(mainEl, state, persist);
    });
  });
}

export function resetGestionSelection() {
  selectedInstanceId = null;
}
