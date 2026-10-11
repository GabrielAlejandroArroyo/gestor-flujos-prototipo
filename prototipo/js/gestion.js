import { cloneFlowSnapshot, validateFlow, NODE_KINDS } from "./validation.js";
import {
  createInstance,
  getCurrentNode,
  resolveManual,
  resolveGateway,
  advanceAutomatic,
  statusLabel,
  simulateAIHITLReminder,
  resolveAIHITL,
} from "./motor.js";
import { validateScreenSubmission } from "./contracts.js";
import { renderActionButton, renderModalCloseButton } from "./action-icons.js";
import { escapeHtml, formatDateTime, openModal, renderPageHeader, toast } from "./ui.js";
import {
  bindNativeDateFields,
  readInstanceParamValue,
  renderInputFieldsHtml,
} from "./gestion-input-fields.js";
import {
  formatFlowCatalogLabel,
  getReadyFlowsByType,
  listReadyFlowTypes,
} from "./gestion-catalog.js";
import {
  getFirstStartAttributeDisplay,
  instanceStatusBadgeClass,
} from "./gestion-instance-helpers.js";
import {
  applyComponentAttrPatch,
  readNodeInputAttributesFromForm,
  renderNodeInputAttributesForm,
} from "./gestion-component-fields.js";
import { bindFlowPreviewPage, renderFlowPreviewPageHtml } from "./gestion-flow-preview.js";

/** @type {{ mode: "list" | "manage" | "preview"; instanceId: string | null }} */
let gestionScreen = { mode: "list", instanceId: null };

/** @type {"en_curso" | "completada" | "cerrada_rechazo"} */
let gestionHubTab = "en_curso";

/** @readonly */
const GESTION_HUB_TABS = [
  { id: "en_curso", label: "En curso" },
  { id: "completada", label: "Completadas" },
  { id: "cerrada_rechazo", label: "Cerradas por rechazo" },
];

export function enterGestionHub() {
  gestionScreen = { mode: "list", instanceId: null };
}

/**
 * @param {object | null | undefined} node
 */
function stepKindBadge(node) {
  if (!node) return "";
  if (node.kind === NODE_KINDS.MANUAL) return `<span class="badge badge-curso">Manual</span>`;
  if (node.kind === NODE_KINDS.AUTOMATICA) return `<span class="badge badge-listo">Auto</span>`;
  if (node.kind === NODE_KINDS.GATEWAY) return `<span class="badge badge-borrador">Gateway</span>`;
  if (node.kind === NODE_KINDS.AGENTE_IA) return `<span class="badge badge-curso">Agente IA</span>`;
  return "";
}

/**
 * @param {object[]} activeInstances
 */
function sortInstancesByStarted(activeInstances) {
  return [...activeInstances].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  );
}

/**
 * @param {object[]} instances
 */
function sortInstancesByFinished(instances) {
  return [...instances].sort((a, b) => {
    const aEnd = a.finishedAt ? new Date(a.finishedAt).getTime() : 0;
    const bEnd = b.finishedAt ? new Date(b.finishedAt).getTime() : 0;
    if (bEnd !== aEnd) return bEnd - aEnd;
    return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
  });
}

/**
 * @param {string} status
 */
function renderInstanceStatusBadge(status) {
  const cls = instanceStatusBadgeClass(status);
  return `<span class="badge badge-${cls}">${escapeHtml(statusLabel(status))}</span>`;
}

function renderActiveInstancesTable(instances) {
  if (!instances.length) {
    return `<p class="gestion-empty">No hay instancias en curso.</p>`;
  }
  const rows = instances
    .map((inst) => {
      const node = getCurrentNode(inst);
      const flowType = inst.flowSnapshot?.type ?? "—";
      const startAttr = getFirstStartAttributeDisplay(inst);
      return `
    <tr class="gestion-instance-row" data-inst-row="${inst.id}">
      <td><strong>${escapeHtml(inst.flowName)}</strong></td>
      <td>${escapeHtml(flowType)}</td>
      <td class="gestion-cell-muted">${formatDateTime(inst.startedAt)}</td>
      <td class="gestion-cell-muted">${escapeHtml(startAttr)}</td>
      <td>
        <span class="gestion-step-label">${escapeHtml(node?.name ?? "—")}</span>
        ${stepKindBadge(node)}
      </td>
      <td class="gestion-instance-actions action-icon-group">
        ${renderActionButton({ icon: "manage", label: "Gestionar instancia", variant: "primary", data: { "manage-inst": inst.id } })}
        ${renderActionButton({ icon: "view", label: "Visualizar instancia", data: { "view-inst": inst.id } })}
      </td>
    </tr>`;
    })
    .join("");
  return `
    <div class="table-wrap table-wrap--modern">
      <table class="table-modern gestion-instance-list">
        <thead>
          <tr>
            <th>Flujo</th>
            <th>Tipo</th>
            <th>Inicio</th>
            <th>Dato inicio</th>
            <th>Paso actual</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function renderFinalizedInstancesTable(instances) {
  if (!instances.length) {
    return `<p class="gestion-empty">No hay instancias en este estado.</p>`;
  }
  const rows = instances
    .map((inst) => {
      const flowType = inst.flowSnapshot?.type ?? "—";
      const startAttr = getFirstStartAttributeDisplay(inst);
      const finished = inst.finishedAt ? formatDateTime(inst.finishedAt) : "—";
      return `
    <tr class="gestion-instance-row gestion-instance-row--final" data-inst-row="${inst.id}">
      <td><strong>${escapeHtml(inst.flowName)}</strong></td>
      <td>${escapeHtml(flowType)}</td>
      <td class="gestion-cell-muted">${formatDateTime(inst.startedAt)}</td>
      <td class="gestion-cell-muted">${escapeHtml(startAttr)}</td>
      <td>${renderInstanceStatusBadge(inst.status)}</td>
      <td class="gestion-cell-muted">${finished}</td>
      <td class="gestion-instance-actions action-icon-group">
        ${renderActionButton({ icon: "view", label: "Visualizar instancia", data: { "view-inst": inst.id } })}
      </td>
    </tr>`;
    })
    .join("");
  return `
    <div class="table-wrap table-wrap--modern">
      <table class="table-modern gestion-instance-list gestion-instance-list--final">
        <thead>
          <tr>
            <th>Flujo</th>
            <th>Tipo</th>
            <th>Inicio</th>
            <th>Dato inicio</th>
            <th>Estado</th>
            <th>Fin</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

/**
 * @param {object[]} readyFlows
 * @param {string[]} types
 */
function renderNewInstanceFormFields(readyFlows, types) {
  if (!readyFlows.length) {
    return `<p class="gestion-empty">No hay flujos listos. Activá uno en el diseñador.</p>`;
  }
  const typeOptions = types
    .map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`)
    .join("");
  return `
    <form id="form-new-instance" class="form-grid">
      <div class="form-row">
        <label>Tipo de flujo</label>
        <select id="select-flow-type" required>
          <option value="">— Elegí un tipo —</option>
          ${typeOptions}
        </select>
      </div>
      <div class="form-row">
        <label>Flujo (listo)</label>
        <select name="flowId" id="select-flow" required disabled>
          <option value="">— Elegí tipo primero —</option>
        </select>
      </div>
      <div id="input-fields"></div>
      <div class="modal-footer" style="margin-top:0;padding-top:0;border:0">
        <div class="action-icon-group">
          ${renderModalCloseButton("Cancelar")}
          ${renderActionButton({ icon: "start", label: "Iniciar instancia", variant: "primary", type: "submit" })}
        </div>
      </div>
    </form>`;
}

function bindGestionBack(mainEl, state, persist) {
  mainEl.querySelector("[data-gestion-back]")?.addEventListener("click", () => {
    enterGestionHub();
    renderGestion(mainEl, state, persist);
  });
}

/**
 * @param {HTMLElement} mainEl
 * @param {object} state
 * @param {() => void} persist
 * @param {string} instanceId
 */
function renderGestionManage(mainEl, state, persist, instanceId) {
  const instance = state.instances.find((i) => i.id === instanceId);
  if (!instance || instance.status !== "en_curso") {
    enterGestionHub();
    renderGestion(mainEl, state, persist);
    return;
  }
  const node = getCurrentNode(instance);
  if (!node) {
    toast("La instancia ya no tiene pasos pendientes.");
    enterGestionHub();
    renderGestion(mainEl, state, persist);
    return;
  }

  mainEl.innerHTML = `
    <section class="gestion-hero gestion-hero--manage panel">
      <header class="gestion-hero-header">
        ${renderActionButton({ icon: "back", label: "Volver al listado", className: "gestion-hero-back", extraAttrs: "data-gestion-back" })}
        <div class="gestion-hero-heading">
          <h2>Gestionar flujo</h2>
          <p class="gestion-hero-subtitle">${escapeHtml(instance.flowName)} · Paso actual: <strong>${escapeHtml(node.name)}</strong> ${stepKindBadge(node)}</p>
        </div>
      </header>
      <div class="gestion-manage-body gestion-manage-body--hero">
        ${renderNodeInputAttributesForm(node, instance)}
        <div class="gestion-manage-resolver">${renderResolver(instance)}</div>
      </div>
    </section>`;

  const done = () => {
    enterGestionHub();
    renderGestion(mainEl, state, persist);
  };

  bindGestionBack(mainEl, state, persist);
  bindInstanceResolver(mainEl, instance, node, persist, done);
  bindNativeDateFields(mainEl);
}

/**
 * @param {HTMLElement} mainEl
 * @param {object} state
 * @param {() => void} persist
 * @param {string} instanceId
 */
function renderGestionPreview(mainEl, state, persist, instanceId) {
  const instance = state.instances.find((i) => i.id === instanceId);
  if (!instance) {
    enterGestionHub();
    renderGestion(mainEl, state, persist);
    return;
  }

  mainEl.innerHTML = renderFlowPreviewPageHtml(instance);
  bindGestionBack(mainEl, state, persist);
  bindFlowPreviewPage(mainEl, instance, "datos");
}

function openManageInstanceScreen(mainEl, state, persist, instanceId) {
  gestionScreen = { mode: "manage", instanceId };
  renderGestion(mainEl, state, persist);
}

function openPreviewInstanceScreen(mainEl, state, persist, instanceId) {
  const id = instanceId?.trim?.() ?? instanceId;
  if (!id) {
    toast("No se pudo abrir la instancia.");
    return;
  }
  if (!state.instances.some((i) => i.id === id)) {
    toast("Instancia no encontrada.");
    return;
  }
  gestionScreen = { mode: "preview", instanceId: id };
  renderGestion(mainEl, state, persist);
}

/**
 * @param {Record<string, number>} counts
 */
function renderGestionHubTabs(counts) {
  return `<div class="gestion-hub-tabs component-attr-tabs" role="tablist" aria-label="Instancias por estado">
    ${GESTION_HUB_TABS.map((tab) => {
      const n = counts[tab.id] ?? 0;
      const active = gestionHubTab === tab.id ? " is-active" : "";
      return `<button type="button" class="component-attr-tab${active}" data-gestion-tab="${tab.id}" role="tab" aria-selected="${gestionHubTab === tab.id ? "true" : "false"}">${escapeHtml(tab.label)} <span class="gestion-tab-count">${n}</span></button>`;
    }).join("")}
  </div>`;
}

function renderGestionHub(mainEl, state, persist) {
  const readyFlows = state.flows.filter((f) => f.status === "listo");
  const byType = getReadyFlowsByType(state.flows);
  const types = listReadyFlowTypes(byType);
  const activeInstances = sortInstancesByStarted(state.instances.filter((i) => i.status === "en_curso"));
  const completedInstances = sortInstancesByFinished(
    state.instances.filter((i) => i.status === "completada"),
  );
  const rejectedInstances = sortInstancesByFinished(
    state.instances.filter((i) => i.status === "cerrada_rechazo"),
  );
  const counts = {
    en_curso: activeInstances.length,
    completada: completedInstances.length,
    cerrada_rechazo: rejectedInstances.length,
  };

  const enCursoPanel = `
    ${renderActiveInstancesTable(activeInstances)}
    <div class="gestion-start-actions">
      ${
        readyFlows.length
          ? renderActionButton({ icon: "start", label: "Iniciar instancia", variant: "primary", id: "btn-open-start-modal" })
          : `<p class="gestion-empty gestion-empty--inline">No hay flujos listos para instanciar.</p>`
      }
    </div>`;

  mainEl.innerHTML = `
    ${renderPageHeader(
      "Gestión de actividades",
      "Filtrá instancias por estado. Por defecto se muestran las en curso; completadas y cerradas por rechazo están en las otras pestañas.",
    )}
    <div class="kpi-row">
      <span class="stat-chip">Flujos listos <strong>${readyFlows.length}</strong></span>
      <span class="stat-chip">En curso <strong>${counts.en_curso}</strong></span>
      <span class="stat-chip">Completadas <strong>${counts.completada}</strong></span>
      <span class="stat-chip">Cerradas <strong>${counts.cerrada_rechazo}</strong></span>
    </div>
    <div class="gestion-layout gestion-layout--hub">
      <section class="panel gestion-panel-list gestion-panel-hub">
        ${renderGestionHubTabs(counts)}
        <div class="gestion-hub-panels">
          <div class="gestion-hub-panel" data-gestion-panel="en_curso" ${gestionHubTab === "en_curso" ? "" : "hidden"}>
            ${enCursoPanel}
          </div>
          <div class="gestion-hub-panel" data-gestion-panel="completada" ${gestionHubTab === "completada" ? "" : "hidden"}>
            ${renderFinalizedInstancesTable(completedInstances)}
          </div>
          <div class="gestion-hub-panel" data-gestion-panel="cerrada_rechazo" ${gestionHubTab === "cerrada_rechazo" ? "" : "hidden"}>
            ${renderFinalizedInstancesTable(rejectedInstances)}
          </div>
        </div>
      </section>
    </div>`;

  bindGestionHubTabs(mainEl);
  bindGestion(mainEl, state, persist, byType, types, readyFlows);
}

/**
 * @param {HTMLElement} mainEl
 */
function bindGestionHubTabs(mainEl) {
  mainEl.querySelectorAll("[data-gestion-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.getAttribute("data-gestion-tab");
      if (!tab || tab === gestionHubTab) return;
      if (!GESTION_HUB_TABS.some((t) => t.id === tab)) return;
      gestionHubTab = /** @type {typeof gestionHubTab} */ (tab);
      mainEl.querySelectorAll("[data-gestion-tab]").forEach((el) => {
        const id = el.getAttribute("data-gestion-tab");
        const isActive = id === gestionHubTab;
        el.classList.toggle("is-active", isActive);
        el.setAttribute("aria-selected", isActive ? "true" : "false");
      });
      mainEl.querySelectorAll("[data-gestion-panel]").forEach((panel) => {
        const show = panel.getAttribute("data-gestion-panel") === gestionHubTab;
        if (show) panel.removeAttribute("hidden");
        else panel.setAttribute("hidden", "");
      });
    });
  });
}

export function renderGestion(mainEl, state, persist) {
  if (gestionScreen.mode === "manage" && gestionScreen.instanceId) {
    renderGestionManage(mainEl, state, persist, gestionScreen.instanceId);
    return;
  }
  if (gestionScreen.mode === "preview" && gestionScreen.instanceId) {
    renderGestionPreview(mainEl, state, persist, gestionScreen.instanceId);
    return;
  }
  renderGestionHub(mainEl, state, persist);
}

function renderInputFields(flow) {
  return renderInputFieldsHtml(flow);
}

function bindGestion(mainEl, state, persist, byType, types, readyFlows) {
  mainEl.querySelector("#btn-open-start-modal")?.addEventListener("click", () => {
    openStartInstanceModal(mainEl, state, persist, byType, types, readyFlows);
  });

  if (mainEl.dataset.gestionRowActionsBound !== "1") {
    mainEl.dataset.gestionRowActionsBound = "1";
    mainEl.addEventListener("click", (e) => {
      const viewBtn = e.target.closest("[data-view-inst]");
      if (viewBtn && mainEl.contains(viewBtn)) {
        e.preventDefault();
        e.stopPropagation();
        openPreviewInstanceScreen(
          mainEl,
          state,
          persist,
          viewBtn.getAttribute("data-view-inst"),
        );
        return;
      }
      const manageBtn = e.target.closest("[data-manage-inst]");
      if (manageBtn && mainEl.contains(manageBtn)) {
        e.preventDefault();
        e.stopPropagation();
        openManageInstanceScreen(
          mainEl,
          state,
          persist,
          manageBtn.getAttribute("data-manage-inst"),
        );
      }
    });
  }
}

/**
 * @param {HTMLElement} root
 * @param {object} node
 * @param {object} instance
 */
function persistNodeAttrsFromModal(root, node, instance) {
  const form = root.querySelector("#form-node-attrs");
  if (!form) return true;
  const { errors, patch } = readNodeInputAttributesFromForm(form, node, instance);
  if (errors.length) {
    toast(errors[0]);
    return false;
  }
  applyComponentAttrPatch(instance, patch);
  return true;
}

/**
 * @param {HTMLElement} mainEl
 * @param {object} state
 * @param {() => void} persist
 * @param {Map<string, object[]>} byType
 * @param {string[]} types
 * @param {object[]} readyFlows
 */
function openStartInstanceModal(mainEl, state, persist, byType, types, readyFlows) {
  const { close, root } = openModal(`
    <div class="modal-header">
      <h2>Iniciar instancia</h2>
      <button type="button" class="btn btn-sm" data-modal-close>Cerrar</button>
    </div>
    ${renderNewInstanceFormFields(readyFlows, types)}
  `);

  const form = root.querySelector("#form-new-instance");
  if (!form) return;

  const selectType = root.querySelector("#select-flow-type");
  const selectFlow = root.querySelector("#select-flow");
  const inputFields = root.querySelector("#input-fields");

  const syncFlowOptions = () => {
    if (!selectType || !selectFlow) return;
    const type = selectType.value;
    const flows = byType.get(type) ?? [];
    if (!type) {
      selectFlow.disabled = true;
      selectFlow.innerHTML = `<option value="">— Elegí tipo primero —</option>`;
      if (inputFields) inputFields.innerHTML = "";
      return;
    }
    selectFlow.disabled = false;
    selectFlow.innerHTML = flows
      .map((f) => `<option value="${f.id}">${escapeHtml(formatFlowCatalogLabel(f))}</option>`)
      .join("");
    if (flows.length === 1) selectFlow.value = flows[0].id;
    updateInputFields();
  };

  const updateInputFields = () => {
    if (!selectFlow || !inputFields) return;
    const flow = state.flows.find((f) => f.id === selectFlow.value);
    inputFields.innerHTML = flow ? renderInputFields(flow) : "";
    bindNativeDateFields(root);
  };

  selectType?.addEventListener("change", syncFlowOptions);
  selectFlow?.addEventListener("change", updateInputFields);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const flowId = fd.get("flowId");
    const flow = state.flows.find((f) => f.id === flowId);
    if (!flow || flow.status !== "listo") return;

    const v = validateFlow(flow);
    if (!v.isValid) {
      toast("El flujo ya no cumple validación.");
      return;
    }

    const inputValues = {};
    const inputErrors = [];
    for (const p of flow.inputParams) {
      const { value, errors } = readInstanceParamValue(fd, p);
      inputErrors.push(...errors);
      inputValues[p.key] = value ?? "";
    }
    if (inputErrors.length) {
      toast(inputErrors[0]);
      return;
    }

    const snapshot = cloneFlowSnapshot(flow);
    const instance = await createInstance(snapshot, inputValues);
    state.instances.unshift(instance);
    persist();
    close();
    toast("Instancia iniciada.");
    renderGestion(mainEl, state, persist);
    openManageInstanceScreen(mainEl, state, persist, instance.id);
  });
}

function renderResolver(instance) {
  const node = getCurrentNode(instance);
  if (!node) {
    return `<p>Instancia finalizada: <span class="badge badge-${instance.status === "completada" ? "completada" : "rechazada"}">${statusLabel(instance.status)}</span></p>`;
  }

  if (node.kind === NODE_KINDS.GATEWAY) {
    return `
      <section class="gestion-manage-step">
        <h3 class="gestion-manage-section-title">Acción del paso</h3>
        <p style="font-size:0.85rem;color:var(--muted);margin-bottom:1rem">${escapeHtml(node.description || "Elegí la rama del flujo.")}</p>
        <div class="preview-actions">
          ${renderActionButton({ icon: "accept", label: "Aceptar", variant: "success", id: "btn-gateway-aceptar" })}
          ${renderActionButton({ icon: "reject", label: "Rechazar", variant: "danger", id: "btn-gateway-rechazar" })}
        </div>
      </section>`;
  }

  if (node.kind === NODE_KINDS.AUTOMATICA) {
    const adapter = node.integration?.adapter ?? "simulation";
    return `
      <section class="gestion-manage-step">
        <h3 class="gestion-manage-section-title">Acción del paso</h3>
        <p style="font-size:0.85rem;color:var(--muted)">${escapeHtml(node.description || "")}</p>
        <p style="font-size:0.8rem;color:var(--muted)">Adaptador: ${escapeHtml(adapter)}</p>
        ${renderActionButton({ icon: "play", label: "Ejecutar y continuar", variant: "primary", id: "btn-run-auto" })}
      </section>`;
  }

  if (node.kind === NODE_KINDS.MANUAL) {
    const screen = instance.flowSnapshot.screens?.[node.id];
    return `
      <section class="gestion-manage-step">
        <h3 class="gestion-manage-section-title">Acción del paso</h3>
        <p style="font-size:0.85rem;color:var(--muted);margin-bottom:1rem">${escapeHtml(node.description || "")}</p>
        <form id="form-manual" class="screen-preview">${renderScreenForInstance(instance, screen)}</form>
      </section>`;
  }

  if (node.kind === NODE_KINDS.AGENTE_IA) {
    return `
      <section class="gestion-manage-step">
        <h3 class="gestion-manage-section-title">Acción del paso</h3>
        <p style="font-size:0.85rem;color:var(--muted)">${escapeHtml(node.description || "")}</p>
        <div style="background:var(--bg-card);padding:1rem;border-radius:6px;margin:1rem 0;border:1px solid var(--border)">
          <p style="margin:0 0 0.5rem 0;font-size:0.85rem"><strong>Estado:</strong> Esperando respuesta de ${escapeHtml(node.hitlEmail || "operador")}</p>
          <p style="margin:0 0 1rem 0;font-size:0.85rem"><strong>Recordatorios:</strong> ${instance.aiHitlReminders || 0}</p>
          <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
            <button type="button" class="btn btn-sm" id="btn-ai-remind">Simular +5 h (recordatorio)</button>
            <button type="button" class="btn btn-sm btn-primary" id="btn-ai-resolve">Simular respuesta recibida</button>
          </div>
        </div>
      </section>`;
  }

  if (node.kind === NODE_KINDS.INICIO || node.kind === NODE_KINDS.FIN) {
    return `
      <section class="gestion-manage-step">
        <p style="font-size:0.85rem;color:var(--muted)">Completá los datos del componente arriba si aplica. Este evento no requiere más acciones en el mock.</p>
      </section>`;
  }

  return `<p>Nodo inesperado: ${escapeHtml(node.name)}</p>`;
}

function renderScreenForInstance(instance, screen) {
  const flow = instance.flowSnapshot;
  const params = flow.inputParams ?? [];
  const ctx = instance.context ?? {};
  let html = "";
  for (const b of screen?.blocks ?? []) {
    if (b.type === "titulo") html += `<h3>${escapeHtml(b.text || "")}</h3>`;
    if (b.type === "texto") html += `<p>${escapeHtml(b.text || "")}</p>`;
    if (b.type === "separador") html += `<hr class="studio-separator" />`;
    if (b.type === "dato") {
      const p = params.find((x) => x.id === b.paramId);
      const val = p ? instance.inputValues[p.key] ?? ctx[p.key] : "";
      html += `<div class="preview-field"><div class="preview-label">${escapeHtml(p?.label ?? "Dato")}</div><input readonly value="${escapeHtml(String(val ?? ""))}" /></div>`;
    }
    if (b.type === "comentario") {
      html += `<div class="preview-field"><div class="preview-label">${escapeHtml(b.label ?? "Comentario")}</div><textarea name="comment" placeholder="Notas"></textarea></div>`;
    }
    if (b.type === "campo_texto") {
      const name = b.outputKey ?? b.fieldKey ?? b.id;
      html += `<div class="preview-field"><div class="preview-label">${escapeHtml(b.label ?? name)}</div><input name="${escapeHtml(name)}" ${b.required ? "required" : ""} /></div>`;
    }
    if (b.type === "campo_texto_largo") {
      const name = b.outputKey ?? b.fieldKey ?? b.id;
      html += `<div class="preview-field"><div class="preview-label">${escapeHtml(b.label ?? name)}</div><textarea name="${escapeHtml(name)}" ${b.required ? "required" : ""}></textarea></div>`;
    }
    if (b.type === "campo_numero") {
      const name = b.outputKey ?? b.fieldKey ?? b.id;
      html += `<div class="preview-field"><div class="preview-label">${escapeHtml(b.label ?? name)}</div><input type="number" name="${escapeHtml(name)}" ${b.required ? "required" : ""} /></div>`;
    }
    if (b.type === "campo_fecha") {
      const name = b.outputKey ?? b.fieldKey ?? b.id;
      html += `<div class="preview-field"><div class="preview-label">${escapeHtml(b.label ?? name)}</div><input type="date" name="${escapeHtml(name)}" ${b.required ? "required" : ""} /></div>`;
    }
    if (b.type === "campo_si_no") {
      const name = b.outputKey ?? b.fieldKey ?? b.id;
      html += `<div class="preview-field"><div class="preview-label">${escapeHtml(b.label ?? name)}</div><select name="${escapeHtml(name)}" ${b.required ? "required" : ""}><option value="">—</option><option value="si">Sí</option><option value="no">No</option></select></div>`;
    }
  }
  html += `<div class="preview-actions preview-actions--sticky action-icon-group">${renderActionButton({ icon: "accept", label: "Aceptar", variant: "success", data: { decision: "aceptar" } })}${renderActionButton({ icon: "reject", label: "Rechazar", variant: "danger", data: { decision: "rechazar" } })}</div>`;
  return html;
}

function collectFormValues(form, screen) {
  const raw = {};
  const fd = new FormData(form);
  for (const [k, v] of fd.entries()) raw[k] = v;
  for (const b of screen?.blocks ?? []) {
    const key = b.outputKey ?? b.fieldKey ?? (b.type === "comentario" ? "comment" : b.id);
    if (b.type.startsWith("campo_") || b.type === "comentario") {
      raw[key] = form.querySelector(`[name="${key}"]`)?.value ?? raw[key];
    }
  }
  return raw;
}

/**
 * @param {HTMLElement} root
 * @param {object} instance
 * @param {object} node
 * @param {() => void} persist
 * @param {() => void} onDone
 */
function bindInstanceResolver(root, instance, node, persist, onDone) {
  root.querySelector("#btn-run-auto")?.addEventListener("click", async () => {
    if (!persistNodeAttrsFromModal(root, node, instance)) return;
    await advanceAutomatic(instance);
    persist();
    toast("Service Task ejecutada.");
    onDone();
  });

  root.querySelector("#btn-gateway-aceptar")?.addEventListener("click", async () => {
    if (!persistNodeAttrsFromModal(root, node, instance)) return;
    await resolveGateway(instance, "aceptar");
    persist();
    toast("Rama aceptar.");
    onDone();
  });

  root.querySelector("#btn-gateway-rechazar")?.addEventListener("click", async () => {
    if (!persistNodeAttrsFromModal(root, node, instance)) return;
    await resolveGateway(instance, "rechazar");
    persist();
    toast("Rama rechazar.");
    onDone();
  });

  root.querySelector("#btn-ai-remind")?.addEventListener("click", () => {
    simulateAIHITLReminder(instance);
    persist();
    toast("Recordatorio simulado.");
    onDone();
  });

  root.querySelector("#btn-ai-resolve")?.addEventListener("click", async () => {
    if (!persistNodeAttrsFromModal(root, node, instance)) return;
    await resolveAIHITL(instance, { status: "approved", note: "Aprobado vía correo" });
    persist();
    toast("Respuesta recibida.");
    onDone();
  });

  const form = root.querySelector("#form-manual");
  if (!form) return;

  form.querySelectorAll("[data-decision]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!persistNodeAttrsFromModal(root, node, instance)) return;
      const current = getCurrentNode(instance);
      const screen = instance.flowSnapshot.screens?.[current?.id];
      const raw = collectFormValues(form, screen);
      const { values, errors } = validateScreenSubmission(screen, raw);
      if (errors.length) {
        toast(errors[0]);
        return;
      }
      const comment = values.comment ?? form.querySelector('[name="comment"]')?.value ?? "";
      await resolveManual(instance, btn.dataset.decision, comment, values);
      persist();
      toast(btn.dataset.decision === "aceptar" ? "Aceptado." : "Rechazado.");
      onDone();
    });
  });
}

export function resetGestionSelection() {
  gestionHubTab = "en_curso";
  enterGestionHub();
}
