/**
 * Estudio: Pantalla (User Task) y Automatización (Service Task).
 */

import { createId } from "./ids.js";
import { NODE_KINDS } from "./validation.js";
import { escapeHtml, toast } from "./ui.js";
import { normalizeFlowContracts, resolveNodeInputBag } from "./contracts.js";
import {
  ADAPTER_CATALOG,
  ADAPTER_KINDS,
  defaultIntegration,
  executeIntegration,
  validateNodeIntegration,
} from "./integrations.js";

const SCREEN_COMPONENTS = [
  { type: "titulo", label: "Título" },
  { type: "texto", label: "Texto" },
  { type: "dato", label: "Dato entrada (lectura)" },
  { type: "campo_texto", label: "Campo texto" },
  { type: "campo_numero", label: "Campo número" },
  { type: "campo_fecha", label: "Campo fecha" },
  { type: "campo_si_no", label: "Sí / No" },
  { type: "campo_texto_largo", label: "Texto largo" },
  { type: "comentario", label: "Comentario" },
  { type: "separador", label: "Separador" },
];

/**
 * @param {string} flowName
 * @param {object} node
 * @param {string} studioMode
 */
export function renderStudioToolbar(flowName, node, studioMode) {
  const isManual = node?.kind === NODE_KINDS.MANUAL;
  const isAuto = node?.kind === NODE_KINDS.AUTOMATICA;
  const tab = (mode, label, enabled) =>
    `<button type="button" class="btn btn-sm studio-tab ${studioMode === mode ? "is-toggle-active" : ""}" data-studio-mode="${mode}" role="tab" ${enabled ? "" : "disabled"}>${label}</button>`;
  const kindBadge = isManual
    ? `<span class="node-kind-badge">User Task</span>`
    : isAuto
      ? `<span class="node-kind-badge node-kind-badge--auto">Service Task</span>`
      : "";
  return `<div class="designer-studio-bar" role="tablist" aria-label="Modo de diseño">
    <div class="segmented-control">
    ${tab("path", "Camino", true)}
    ${tab("screen", "Pantalla", isManual)}
    ${tab("automation", "Automatización", isAuto)}
    </div>
    <span class="designer-studio-meta">${escapeHtml(flowName)} · ${escapeHtml(node?.name ?? "—")}${kindBadge}</span>
  </div>`;
}

function collectScreenOutputKeys(screen) {
  const keys = [];
  for (const b of screen?.blocks ?? []) {
    const k = b.outputKey ?? b.fieldKey ?? (b.type === "comentario" ? "comment" : null);
    if (k && !keys.includes(k)) keys.push(k);
  }
  return keys;
}

function blockLabel(flow, b) {
  if (b.type === "titulo" || b.type === "texto") return `${b.type}: ${b.text ?? ""}`;
  if (b.type === "dato") {
    const p = flow.inputParams.find((x) => x.id === b.paramId);
    return `dato: ${p?.label ?? "?"}`;
  }
  if (b.type === "separador") return "separador";
  return `${b.type}: ${b.label ?? b.outputKey ?? ""}`;
}

/**
 * @param {object} flow
 * @param {object} screen
 */
export function renderScreenPreviewHtml(flow, screen) {
  let html = "";
  for (const b of screen?.blocks ?? []) {
    if (b.type === "titulo") html += `<h3>${escapeHtml(b.text || "Título")}</h3>`;
    if (b.type === "texto") html += `<p>${escapeHtml(b.text || "")}</p>`;
    if (b.type === "separador") html += `<hr class="studio-separator" />`;
    if (b.type === "dato") {
      const p = flow.inputParams.find((x) => x.id === b.paramId);
      html += `<div class="preview-field"><div class="preview-label">${escapeHtml(p?.label ?? "Dato")}</div><input readonly value="(instancia)" /></div>`;
    }
    if (b.type === "comentario") {
      html += `<div class="preview-field"><div class="preview-label">${escapeHtml(b.label ?? "Comentario")}</div><textarea name="comment"></textarea></div>`;
    }
    if (b.type === "campo_texto") {
      const name = b.outputKey ?? b.fieldKey ?? b.id;
      html += `<div class="preview-field"><div class="preview-label">${escapeHtml(b.label ?? name)}</div><input name="${escapeHtml(name)}" /></div>`;
    }
    if (b.type === "campo_texto_largo") {
      const name = b.outputKey ?? b.fieldKey ?? b.id;
      html += `<div class="preview-field"><div class="preview-label">${escapeHtml(b.label ?? name)}</div><textarea name="${escapeHtml(name)}"></textarea></div>`;
    }
    if (b.type === "campo_numero") {
      const name = b.outputKey ?? b.fieldKey ?? b.id;
      html += `<div class="preview-field"><div class="preview-label">${escapeHtml(b.label ?? name)}</div><input type="number" name="${escapeHtml(name)}" /></div>`;
    }
    if (b.type === "campo_fecha") {
      const name = b.outputKey ?? b.fieldKey ?? b.id;
      html += `<div class="preview-field"><div class="preview-label">${escapeHtml(b.label ?? name)}</div><input type="date" name="${escapeHtml(name)}" /></div>`;
    }
    if (b.type === "campo_si_no") {
      const name = b.outputKey ?? b.fieldKey ?? b.id;
      html += `<div class="preview-field"><div class="preview-label">${escapeHtml(b.label ?? name)}</div><select name="${escapeHtml(name)}"><option value="">—</option><option value="si">Sí</option><option value="no">No</option></select></div>`;
    }
  }
  html += `<div class="preview-actions"><button type="button" class="btn btn-success" disabled>Aceptar</button><button type="button" class="btn btn-danger" disabled>Rechazar</button></div>`;
  return html;
}

/**
 * @param {object} flow
 * @param {object} node
 */
export function renderScreenStudio(flow, node) {
  normalizeFlowContracts(flow);
  if (!flow.screens[node.id]) flow.screens[node.id] = { blocks: [] };
  const screen = flow.screens[node.id];
  const blocksHtml =
    screen.blocks
      .map(
        (b, i) => `<div class="studio-block-row"><span class="studio-block-handle" aria-hidden="true"></span><span>${escapeHtml(blockLabel(flow, b))}</span>
    <span class="studio-block-actions"><button type="button" class="btn btn-sm" data-block-up="${i}" aria-label="Subir">↑</button>
    <button type="button" class="btn btn-sm" data-block-down="${i}" aria-label="Bajar">↓</button>
    <button type="button" class="btn btn-sm btn-danger" data-block-rm="${i}" aria-label="Eliminar">×</button></span></div>`,
      )
      .join("") || "<p class='empty-state gestion-empty'>Agregá componentes desde la izquierda.</p>";
  const components = SCREEN_COMPONENTS.map(
    (c) =>
      `<button type="button" class="studio-component-tile" data-add-block="${c.type}">${escapeHtml(c.label)}</button>`,
  ).join("");
  const outKeys = collectScreenOutputKeys(screen);
  const outTable =
    outKeys.length === 0
      ? `<p class="form-hint">Sin claves de salida aún.</p>`
      : `<table class="studio-map-table"><thead><tr><th>context</th></tr></thead><tbody>${outKeys.map((k) => `<tr><td><code>${escapeHtml(k)}</code></td></tr>`).join("")}</tbody></table>`;
  return `<div class="designer-studio workspace-screen">
    <aside class="studio-panel"><h3 class="panel-title">Componentes</h3><div class="studio-component-grid">${components}</div></aside>
    <main class="studio-panel"><h3 class="panel-title">Estructura</h3><div id="studio-blocks-list">${blocksHtml}</div>
    <div class="screen-preview-frame"><p class="preview-caption">Como en Gestión</p><div class="screen-preview" id="studio-screen-preview">${renderScreenPreviewHtml(flow, screen)}</div></div></main>
    <aside class="studio-panel"><h3 class="panel-title">Salidas</h3><p class="form-hint">Valores en <code>context</code> de la instancia.</p>${outTable}</aside>
  </div>`;
}

/**
 * @param {object} flow
 * @param {object} node
 */
export function renderAutomationStudio(flow, node) {
  normalizeFlowContracts(flow);
  if (!node.integration) node.integration = defaultIntegration(ADAPTER_KINDS.REST_JSON);
  const i = node.integration;
  const adapterOptions = ADAPTER_CATALOG.map(
    (a) => `<option value="${a.id}" ${i.adapter === a.id ? "selected" : ""}>${escapeHtml(a.label)}</option>`,
  ).join("");
  let adapterFields = `<p class="props-intro">Simulación sin API externa.</p>`;
  if (i.adapter === ADAPTER_KINDS.REST_JSON) {
    adapterFields = `<div class="form-row"><label>Método</label><select name="method"><option ${i.method === "GET" ? "selected" : ""}>GET</option><option ${i.method === "POST" ? "selected" : ""}>POST</option></select></div>
    <div class="form-row"><label>URL</label><input name="urlTemplate" value="${escapeHtml(i.urlTemplate ?? "")}" /></div>
    <div class="form-row"><label>Body JSON</label><textarea name="bodyTemplate" rows="4">${escapeHtml(i.bodyTemplate ?? "{}")}</textarea></div>`;
  } else if (i.adapter === ADAPTER_KINDS.SOAP_XML) {
    adapterFields = `<div class="form-row"><label>Endpoint</label><input name="endpoint" value="${escapeHtml(i.endpoint ?? "")}" /></div><p class="props-intro">SOAP simulado en v1.</p>`;
  } else if (i.adapter === ADAPTER_KINDS.GRAPHQL) {
    adapterFields = `<div class="form-row"><label>Endpoint</label><input name="endpoint" value="${escapeHtml(i.endpoint ?? "")}" /></div><p class="props-intro">GraphQL simulado en v1.</p>`;
  } else if (i.adapter === ADAPTER_KINDS.CONNECTOR) {
    adapterFields = `<div class="form-row"><label>Conector</label><input name="connectorId" value="${escapeHtml(i.connectorId ?? "erp_generico")}" /></div>
    <div class="form-row"><label>Operación</label><input name="operation" value="${escapeHtml(i.operation ?? "")}" /></div>`;
  }
  const resp = (i.responseMappings ?? [])
    .map(
      (m, idx) =>
        `<div class="form-row"><input data-resp-ctx="${idx}" value="${escapeHtml(m.contextKey ?? "")}" placeholder="context key" /><input data-resp-path="${idx}" value="${escapeHtml(m.jsonPath ?? "")}" placeholder="json path" /></div>`,
    )
    .join("");
  const modeBadge =
    i.executionMode === "live"
      ? `<span class="badge-mock">LIVE</span>`
      : `<span class="badge-mock">MOCK</span>`;
  const simNote =
    i.adapter !== ADAPTER_KINDS.REST_JSON || i.executionMode !== "live"
      ? `<span class="badge-mock">SIM</span>`
      : "";
  return `<div class="designer-studio workspace-automation">
    <aside class="studio-panel"><h3 class="panel-title">Adaptador</h3>
    <div class="form-row"><label>Tipo</label><select id="integration-adapter">${adapterOptions}</select></div>
    <div class="form-row"><label>Modo</label><select id="integration-exec-mode"><option value="mock">Mock</option><option value="live" ${i.executionMode === "live" ? "selected" : ""}>Live REST</option></select></div>
    <div class="form-row"><label>credentialRef</label><input id="integration-cred-ref" value="${escapeHtml(i.credentialRef ?? "")}" placeholder="vault://…" /><p class="form-hint">Referencia only; sin secretos en el navegador.</p></div></aside>
    <main class="studio-panel"><div class="studio-section" style="margin-top:0;padding-top:0;border-top:none"><h3 class="studio-section-title">Request</h3><form id="form-integration" class="form-grid">${adapterFields}</form></div>
    <div class="studio-section"><h3 class="studio-section-title">Respuesta → contexto</h3><div id="response-mappings">${resp}</div>
    <button type="button" class="btn btn-sm" id="btn-add-resp-map">+ mapping</button></div>
    <div class="studio-section">
    <button type="button" class="btn btn-primary" id="btn-test-integration">Probar contrato</button>${modeBadge}${simNote}
    <pre class="integration-test-output" id="integration-test-output"></pre></div></main></div>`;
}

/**
 * @param {HTMLElement} mainEl
 * @param {object} flow
 * @param {object} node
 * @param {Function} persist
 * @param {Function} rerender
 */
export function bindScreenStudio(mainEl, flow, node, persist, rerender) {
  const screen = flow.screens[node.id];
  mainEl.querySelectorAll("[data-add-block]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const type = btn.dataset.addBlock;
      const block = { id: createId("blk"), type };
      if (type === "titulo") block.text = "Título";
      if (type === "texto") block.text = "Texto";
      if (type === "dato") block.paramId = flow.inputParams[0]?.id;
      if (type === "comentario") {
        block.label = "Comentario";
        block.outputKey = "motivoRevision";
        block.required = true;
      }
      if (type.startsWith("campo_")) {
        block.label = "Campo";
        block.outputKey = createId("out").replace("out_", "f_");
      }
      screen.blocks.push(block);
      persist();
      rerender();
    });
  });
  mainEl.querySelectorAll("[data-block-rm]").forEach((btn) => {
    btn.addEventListener("click", () => {
      screen.blocks.splice(Number(btn.dataset.blockRm), 1);
      persist();
      rerender();
    });
  });
  mainEl.querySelectorAll("[data-block-up]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.blockUp);
      if (idx <= 0) return;
      [screen.blocks[idx - 1], screen.blocks[idx]] = [screen.blocks[idx], screen.blocks[idx - 1]];
      persist();
      rerender();
    });
  });
  mainEl.querySelectorAll("[data-block-down]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.blockDown);
      if (idx >= screen.blocks.length - 1) return;
      [screen.blocks[idx + 1], screen.blocks[idx]] = [screen.blocks[idx], screen.blocks[idx + 1]];
      persist();
      rerender();
    });
  });
}

/**
 * @param {HTMLElement} mainEl
 * @param {object} flow
 * @param {object} node
 * @param {Function} persist
 * @param {Function} rerender
 */
export function bindAutomationStudio(mainEl, flow, node, persist, rerender) {
  mainEl.querySelector("#integration-adapter")?.addEventListener("change", (e) => {
    node.integration = defaultIntegration(e.target.value);
    persist();
    rerender();
  });
  const form = mainEl.querySelector("#form-integration");
  form?.addEventListener("input", () => {
    const integration = node.integration;
    if (!integration) return;
    if (integration.adapter === ADAPTER_KINDS.REST_JSON) {
      integration.method = form.querySelector('[name="method"]')?.value ?? "POST";
      integration.urlTemplate = form.querySelector('[name="urlTemplate"]')?.value ?? "";
      integration.bodyTemplate = form.querySelector('[name="bodyTemplate"]')?.value ?? "{}";
    }
    if (integration.adapter === ADAPTER_KINDS.SOAP_XML) {
      integration.endpoint = form.querySelector('[name="endpoint"]')?.value ?? "";
    }
    if (integration.adapter === ADAPTER_KINDS.GRAPHQL) {
      integration.endpoint = form.querySelector('[name="endpoint"]')?.value ?? "";
    }
    if (integration.adapter === ADAPTER_KINDS.CONNECTOR) {
      integration.connectorId = form.querySelector('[name="connectorId"]')?.value ?? "";
      integration.operation = form.querySelector('[name="operation"]')?.value ?? "";
    }
    persist();
  });
  mainEl.querySelector("#integration-exec-mode")?.addEventListener("change", (e) => {
    node.integration.executionMode = e.target.value;
    if (e.target.value === "live") {
      toast("Live REST: CORS/file:// pueden bloquear. Sin secretos en localStorage.");
    }
    persist();
  });
  mainEl.querySelector("#integration-cred-ref")?.addEventListener("change", (e) => {
    node.integration.credentialRef = e.target.value;
    persist();
  });
  mainEl.querySelector("#btn-add-resp-map")?.addEventListener("click", () => {
    if (!node.integration.responseMappings) node.integration.responseMappings = [];
    node.integration.responseMappings.push({ contextKey: "registroId", jsonPath: "registroId" });
    persist();
    rerender();
  });
  mainEl.querySelector("#btn-test-integration")?.addEventListener("click", async () => {
    const out = mainEl.querySelector("#integration-test-output");
    const fake = { inputValues: {}, context: { motivoRevision: "demo" }, flowSnapshot: flow };
    for (const p of flow.inputParams) fake.inputValues[p.key] = p.type === "numero" ? 100 : "demo";
    const inputs = resolveNodeInputBag(flow, fake, node);
    const result = await executeIntegration(node, inputs);
    if (out) out.textContent = JSON.stringify(result, null, 2);
    const errs = validateNodeIntegration(node);
    if (errs.length) toast(errs[0]);
  });
}
