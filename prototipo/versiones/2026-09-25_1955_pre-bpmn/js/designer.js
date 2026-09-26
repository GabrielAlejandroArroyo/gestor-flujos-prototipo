import { createId } from "./ids.js";
import { validateFlow, NODE_KINDS } from "./validation.js";
import { escapeHtml, openModal, toast } from "./ui.js";

let designerContext = {
  selectedFlowId: null,
  selectedNodeId: null,
  connectMode: null,
};

export function renderDesigner(mainEl, state, persist) {
  if (!designerContext.selectedFlowId && state.flows[0]) {
    designerContext.selectedFlowId = null;
  }

  const flow = state.flows.find((f) => f.id === designerContext.selectedFlowId);

  if (!flow) {
    mainEl.innerHTML = renderCatalog(state);
    bindCatalog(mainEl, state, persist);
    return;
  }

  mainEl.innerHTML = renderFlowEditor(flow);
  bindFlowEditor(mainEl, flow, state, persist);
}

function renderCatalog(state) {
  const rows = state.flows
    .map(
      (f) => `
    <tr>
      <td>${escapeHtml(f.name)}</td>
      <td>${escapeHtml(f.type)}</td>
      <td>${escapeHtml(f.description || "—")}</td>
      <td><span class="badge badge-${f.status === "listo" ? "listo" : "borrador"}">${f.status === "listo" ? "Listo" : "Borrador"}</span></td>
      <td>
        <button type="button" class="btn btn-sm" data-open-flow="${f.id}">Abrir</button>
      </td>
    </tr>`,
    )
    .join("");

  return `
    <section class="panel">
      <h2 class="panel-title">Diseñador de flujo — Catálogo</h2>
      <p style="color:var(--muted);font-size:0.9rem;margin-top:0">Cree y edite flujos. Marque como listo cuando pasen la validación para instanciarlos en Gestión de actividades.</p>
      <div class="toolbar">
        <button type="button" class="btn btn-primary" id="btn-new-flow">Nuevo flujo</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Nombre</th><th>Tipo</th><th>Descripción</th><th>Estado</th><th></th></tr>
          </thead>
          <tbody>${rows || `<tr><td colspan="5" class="empty-state">Sin flujos. Cree uno nuevo.</td></tr>`}</tbody>
        </table>
      </div>
    </section>`;
}

function bindCatalog(mainEl, state, persist) {
  mainEl.querySelector("#btn-new-flow")?.addEventListener("click", () => {
    const { close, root } = openModal(`
      <div class="modal-header">
        <h2>Nuevo flujo</h2>
        <button type="button" class="btn btn-sm" data-modal-close>Cerrar</button>
      </div>
      <form id="form-new-flow" class="form-grid">
        <div class="form-row"><label>Tipo</label><input name="type" required placeholder="Ej. Aprobación" /></div>
        <div class="form-row"><label>Nombre</label><input name="name" required /></div>
        <div class="form-row"><label>Descripción</label><textarea name="description"></textarea></div>
        <button type="submit" class="btn btn-primary">Crear</button>
      </form>
    `);

    root.querySelector("#form-new-flow").addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const flow = {
        id: createId("flow"),
        type: String(fd.get("type")).trim(),
        name: String(fd.get("name")).trim(),
        description: String(fd.get("description")).trim(),
        status: "borrador",
        version: 1,
        inputParams: [],
        nodes: [],
        transitions: [],
        screens: {},
      };
      state.flows.push(flow);
      persist();
      designerContext.selectedFlowId = flow.id;
      close();
      renderDesigner(mainEl, state, persist);
      toast("Flujo creado. Arrastre un Inicio al lienzo.");
    });
  });

  mainEl.querySelectorAll("[data-open-flow]").forEach((btn) => {
    btn.addEventListener("click", () => {
      designerContext.selectedFlowId = btn.dataset.openFlow;
      designerContext.selectedNodeId = null;
      renderDesigner(mainEl, state, persist);
    });
  });
}

function renderFlowEditor(flow) {
  const validation = validateFlow(flow);
  const selected = flow.nodes.find((n) => n.id === designerContext.selectedNodeId);

  return `
    <div class="toolbar">
      <button type="button" class="btn" id="btn-back-catalog">← Catálogo</button>
      <span style="flex:1;font-weight:600">${escapeHtml(flow.name)} <span class="badge badge-${flow.status === "listo" ? "listo" : "borrador"}">${flow.status === "listo" ? "Listo" : "Borrador"}</span></span>
      <button type="button" class="btn" id="btn-flow-meta">Metadatos</button>
      <button type="button" class="btn btn-success" id="btn-mark-ready" ${validation.isValid ? "" : "disabled"}>Marcar listo</button>
      <button type="button" class="btn" id="btn-mark-draft">Volver a borrador</button>
    </div>
    ${validation.isValid ? "" : `<ul class="validation-list">${validation.errors.map((e) => `<li>${escapeHtml(e)}</li>`).join("")}</ul>`}
    <div class="split split-designer">
      <aside class="panel palette">
        <h3 class="panel-title">Actividades</h3>
        <div class="palette-item palette-inicio" draggable="true" data-palette="inicio">Inicio</div>
        <div class="palette-item palette-manual" draggable="true" data-palette="manual">Actividad manual</div>
        <div class="palette-item palette-auto" draggable="true" data-palette="automatica">Actividad automática</div>
        <div class="palette-item palette-fin" draggable="true" data-palette="fin">Fin</div>
        <p style="font-size:0.75rem;color:var(--muted);margin:0.5rem 0 0">Arrastre al lienzo. Seleccione un nodo para editar propiedades y conexiones.</p>
      </aside>
      <div class="canvas-wrap" id="canvas-wrap">
        <div class="canvas" id="flow-canvas">
          <svg class="connections" id="connections-svg"></svg>
          ${flow.nodes.map((n) => renderNode(n, n.id === designerContext.selectedNodeId)).join("")}
        </div>
      </div>
      <aside class="panel" id="props-panel">
        <h3 class="panel-title">Propiedades</h3>
        ${selected ? renderNodeProps(flow, selected) : "<p style='color:var(--muted);font-size:0.85rem'>Seleccione un nodo del lienzo.</p>"}
      </aside>
    </div>`;
}

function renderNode(node, isSelected) {
  const kindLabel = {
    inicio: "Inicio",
    manual: "Manual",
    automatica: "Automática",
    fin: "Fin",
  }[node.kind];
  return `
    <div class="flow-node node-${node.kind} ${isSelected ? "is-selected" : ""}"
         data-node-id="${node.id}"
         style="left:${node.x}px;top:${node.y}px">
      <div class="node-kind">${kindLabel}</div>
      <div class="node-name">${escapeHtml(node.name)}</div>
    </div>`;
}

function renderNodeProps(flow, node) {
  const paramsHtml = flow.inputParams
    .map(
      (p) => `
      <label style="display:flex;gap:0.35rem;align-items:center;font-size:0.85rem;margin-bottom:0.35rem">
        <input type="checkbox" data-used-param="${p.id}" ${(node.usedParamIds ?? []).includes(p.id) ? "checked" : ""} ${node.kind === "inicio" ? "disabled" : ""} />
        ${escapeHtml(p.label)} (${escapeHtml(p.key)})
      </label>`,
    )
    .join("") || "<p style='font-size:0.8rem;color:var(--muted)'>Sin parámetros. Defínalos en el nodo Inicio.</p>";

  const transitions = flow.transitions.filter((t) => t.fromId === node.id);
  const targets = flow.nodes.filter((n) => n.id !== node.id);

  let connectConditions = "";
  if (node.kind === NODE_KINDS.MANUAL) {
    connectConditions = `
      <option value="aceptar">Aceptar</option>
      <option value="rechazar">Rechazar</option>`;
  } else {
    connectConditions = `<option value="siempre">Siempre</option>`;
  }

  const inicioParams =
    node.kind === NODE_KINDS.INICIO
      ? `
    <div class="props-section">
      <h4>Parámetros de entrada del flujo</h4>
      <div id="input-params-list">${renderInputParamsList(flow)}</div>
      <button type="button" class="btn btn-sm" id="btn-add-param">+ Parámetro</button>
    </div>`
      : "";

  const screenBtn =
    node.kind === NODE_KINDS.MANUAL
      ? `<button type="button" class="btn btn-primary btn-sm" id="btn-design-screen" style="width:100%;margin-top:0.5rem">Diseñar pantalla</button>`
      : "";

  return `
    <form id="node-props-form" class="form-grid">
      <div class="form-row"><label>Nombre</label><input name="name" value="${escapeHtml(node.name)}" required /></div>
      <div class="form-row"><label>Descripción</label><textarea name="description">${escapeHtml(node.description || "")}</textarea></div>
      ${node.kind !== NODE_KINDS.INICIO && node.kind !== NODE_KINDS.FIN ? `
      <div class="props-section">
        <h4>Datos de entrada que usa</h4>
        ${paramsHtml}
      </div>` : ""}
      ${inicioParams}
      ${screenBtn}
      <div class="props-section">
        <h4>Transiciones salientes</h4>
        <ul style="margin:0;padding-left:1rem;font-size:0.8rem">
          ${transitions.map((t) => {
            const to = flow.nodes.find((n) => n.id === t.toId);
            return `<li>${escapeHtml(t.condition)} → ${escapeHtml(to?.name ?? t.toId)} <button type="button" class="btn btn-sm btn-danger" data-del-tr="${t.id}">×</button></li>`;
          }).join("") || "<li style='color:var(--muted)'>Ninguna</li>"}
        </ul>
        <div class="form-row" style="margin-top:0.5rem">
          <label>Nueva conexión hacia</label>
          <select id="connect-target">
            <option value="">— Seleccionar —</option>
            ${targets.map((t) => `<option value="${t.id}">${escapeHtml(t.name)} (${t.kind})</option>`).join("")}
          </select>
        </div>
        <div class="form-row">
          <label>Condición</label>
          <select id="connect-condition">${connectConditions}</select>
        </div>
        <button type="button" class="btn btn-sm" id="btn-add-transition">Agregar conexión</button>
      </div>
      <button type="button" class="btn btn-danger btn-sm" id="btn-delete-node">Eliminar nodo</button>
    </form>`;
}

function renderInputParamsList(flow) {
  return flow.inputParams
    .map(
      (p) => `
    <div class="chip-list" style="margin-bottom:0.5rem">
      <span class="chip">${escapeHtml(p.label)} · ${escapeHtml(p.type)} ${p.required ? "*" : ""}
        <button type="button" data-del-param="${p.id}" title="Eliminar">×</button>
      </span>
    </div>`,
    )
    .join("");
}

function bindFlowEditor(mainEl, flow, state, persist) {
  const canvas = mainEl.querySelector("#flow-canvas");
  const wrap = mainEl.querySelector("#canvas-wrap");

  mainEl.querySelector("#btn-back-catalog")?.addEventListener("click", () => {
    designerContext.selectedFlowId = null;
    designerContext.selectedNodeId = null;
    renderDesigner(mainEl, state, persist);
  });

  mainEl.querySelector("#btn-mark-ready")?.addEventListener("click", () => {
    const v = validateFlow(flow);
    if (!v.isValid) {
      toast("Corrija la validación antes de marcar listo.");
      return;
    }
    flow.status = "listo";
    flow.version += 1;
    persist();
    toast("Flujo marcado como listo.");
    renderDesigner(mainEl, state, persist);
  });

  mainEl.querySelector("#btn-mark-draft")?.addEventListener("click", () => {
    flow.status = "borrador";
    persist();
    renderDesigner(mainEl, state, persist);
  });

  mainEl.querySelector("#btn-flow-meta")?.addEventListener("click", () => {
    const { close, root } = openModal(`
      <div class="modal-header"><h2>Metadatos del flujo</h2><button type="button" class="btn btn-sm" data-modal-close>Cerrar</button></div>
      <form id="form-meta" class="form-grid">
        <div class="form-row"><label>Tipo</label><input name="type" value="${escapeHtml(flow.type)}" required /></div>
        <div class="form-row"><label>Nombre</label><input name="name" value="${escapeHtml(flow.name)}" required /></div>
        <div class="form-row"><label>Descripción</label><textarea name="description">${escapeHtml(flow.description || "")}</textarea></div>
        <button type="submit" class="btn btn-primary">Guardar</button>
      </form>
    `);
    root.querySelector("#form-meta").addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      flow.type = String(fd.get("type")).trim();
      flow.name = String(fd.get("name")).trim();
      flow.description = String(fd.get("description")).trim();
      persist();
      close();
      renderDesigner(mainEl, state, persist);
    });
  });

  wrap.addEventListener("dragover", (e) => e.preventDefault());
  wrap.addEventListener("drop", (e) => {
    e.preventDefault();
    const kind = e.dataTransfer.getData("palette-kind");
    if (!kind) return;

    if (kind === NODE_KINDS.INICIO && flow.nodes.some((n) => n.kind === NODE_KINDS.INICIO)) {
      toast("Solo puede haber un nodo Inicio.");
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left + wrap.scrollLeft - 70;
    const y = e.clientY - rect.top + wrap.scrollTop - 24;

    const node = {
      id: createId("node"),
      kind,
      name: defaultNodeName(kind),
      description: "",
      x: Math.max(20, x),
      y: Math.max(20, y),
      usedParamIds: [],
    };
    flow.nodes.push(node);
    if (kind === NODE_KINDS.MANUAL) {
      flow.screens[node.id] = { blocks: [{ id: createId("blk"), type: "comentario" }] };
    }
    designerContext.selectedNodeId = node.id;
    persist();
    renderDesigner(mainEl, state, persist);
  });

  mainEl.querySelectorAll(".palette-item").forEach((item) => {
    item.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("palette-kind", item.dataset.palette);
    });
  });

  bindNodeDrag(mainEl, flow, persist, state);
  drawConnections(mainEl, flow);

  const selected = flow.nodes.find((n) => n.id === designerContext.selectedNodeId);
  if (selected) bindNodeProps(mainEl, flow, selected, state, persist);
}

function defaultNodeName(kind) {
  return {
    inicio: "Inicio",
    manual: "Actividad manual",
    automatica: "Actividad automática",
    fin: "Fin",
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
        const nodeId = el.dataset.nodeId;
        designerContext.selectedNodeId = nodeId;
        canvas.querySelectorAll(".flow-node").forEach((n) => n.classList.remove("is-selected"));
        el.classList.add("is-selected");
        const selected = flow.nodes.find((n) => n.id === nodeId);
        dragNode = selected;
        const propsPanel = mainEl.querySelector("#props-panel");
        if (selected && propsPanel) {
          propsPanel.innerHTML = `<h3 class="panel-title">Propiedades</h3>${renderNodeProps(flow, selected)}`;
          bindNodeProps(mainEl, flow, selected, state, persist);
        }
        const rect = el.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        e.preventDefault();
      },
      { signal },
    );
  });

  const onMove = (e) => {
    if (!dragNode) return;
    const wrap = mainEl.querySelector("#canvas-wrap");
    const rect = canvas.getBoundingClientRect();
    dragNode.x = Math.max(0, e.clientX - rect.left + wrap.scrollLeft - offsetX);
    dragNode.y = Math.max(0, e.clientY - rect.top + wrap.scrollTop - offsetY);
    const el = canvas.querySelector(`[data-node-id="${dragNode.id}"]`);
    if (el) {
      el.style.left = `${dragNode.x}px`;
      el.style.top = `${dragNode.y}px`;
    }
    drawConnections(mainEl, flow);
  };

  const onUp = () => {
    if (!dragNode) return;
    persist();
    dragNode = null;
  };

  window.addEventListener("mousemove", onMove, { signal });
  window.addEventListener("mouseup", onUp, { signal });
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
      const x1 = from.x + 70;
      const y1 = from.y + 28;
      const x2 = to.x + 70;
      const y2 = to.y + 28;
      const color =
        t.condition === "aceptar" ? "#4ade80" : t.condition === "rechazar" ? "#f87171" : "#38bdf8";
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="2" marker-end="url(#arrow)" />`;
    })
    .join("");

  svg.innerHTML = `
    <defs>
      <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
        <path d="M0,0 L6,3 L0,6 Z" fill="#94a3b8" />
      </marker>
    </defs>
    ${paths}`;
}

function bindNodeProps(mainEl, flow, node, state, persist) {
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

  form?.querySelectorAll("[data-used-param]").forEach((cb) => {
    cb.addEventListener("change", () => {
      if (!node.usedParamIds) node.usedParamIds = [];
      if (cb.checked) node.usedParamIds.push(cb.dataset.usedParam);
      else node.usedParamIds = node.usedParamIds.filter((id) => id !== cb.dataset.usedParam);
      persist();
    });
  });

  mainEl.querySelector("#btn-add-param")?.addEventListener("click", () => {
    openParamModal(flow, null, () => {
      persist();
      renderDesigner(mainEl, state, persist);
    });
  });

  mainEl.querySelectorAll("[data-del-param]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const pid = btn.dataset.delParam;
      flow.inputParams = flow.inputParams.filter((p) => p.id !== pid);
      for (const n of flow.nodes) {
        n.usedParamIds = (n.usedParamIds ?? []).filter((id) => id !== pid);
      }
      for (const nid of Object.keys(flow.screens)) {
        flow.screens[nid].blocks = flow.screens[nid].blocks.filter(
          (b) => !(b.type === "dato" && b.paramId === pid),
        );
      }
      persist();
      renderDesigner(mainEl, state, persist);
    });
  });

  mainEl.querySelector("#btn-add-transition")?.addEventListener("click", () => {
    const toId = mainEl.querySelector("#connect-target")?.value;
    const condition = mainEl.querySelector("#connect-condition")?.value;
    if (!toId || !condition) {
      toast("Seleccione destino y condición.");
      return;
    }
    flow.transitions.push({ id: createId("tr"), fromId: node.id, toId, condition });
    persist();
    renderDesigner(mainEl, state, persist);
  });

  mainEl.querySelectorAll("[data-del-tr]").forEach((btn) => {
    btn.addEventListener("click", () => {
      flow.transitions = flow.transitions.filter((t) => t.id !== btn.dataset.delTr);
      persist();
      renderDesigner(mainEl, state, persist);
    });
  });

  mainEl.querySelector("#btn-delete-node")?.addEventListener("click", () => {
    if (node.kind === NODE_KINDS.INICIO) {
      toast("No puede eliminar el nodo Inicio.");
      return;
    }
    flow.nodes = flow.nodes.filter((n) => n.id !== node.id);
    flow.transitions = flow.transitions.filter((t) => t.fromId !== node.id && t.toId !== node.id);
    delete flow.screens[node.id];
    designerContext.selectedNodeId = null;
    persist();
    renderDesigner(mainEl, state, persist);
  });

  mainEl.querySelector("#btn-design-screen")?.addEventListener("click", () => {
    openScreenDesigner(flow, node, () => {
      persist();
      renderDesigner(mainEl, state, persist);
    });
  });
}

function openParamModal(flow, param, onSave) {
  const isEdit = !!param;
  const { close, root } = openModal(`
    <div class="modal-header"><h2>${isEdit ? "Editar" : "Nuevo"} parámetro</h2><button type="button" class="btn btn-sm" data-modal-close>Cerrar</button></div>
    <form id="form-param" class="form-grid">
      <div class="form-row"><label>Clave</label><input name="key" required pattern="[a-z0-9_]+" value="${param ? escapeHtml(param.key) : ""}" placeholder="ej. monto" /></div>
      <div class="form-row"><label>Etiqueta</label><input name="label" required value="${param ? escapeHtml(param.label) : ""}" /></div>
      <div class="form-row"><label>Tipo</label>
        <select name="type">
          <option value="texto" ${param?.type === "texto" ? "selected" : ""}>Texto</option>
          <option value="numero" ${param?.type === "numero" ? "selected" : ""}>Número</option>
          <option value="fecha" ${param?.type === "fecha" ? "selected" : ""}>Fecha</option>
          <option value="si_no" ${param?.type === "si_no" ? "selected" : ""}>Sí / No</option>
        </select>
      </div>
      <label style="font-size:0.85rem"><input type="checkbox" name="required" ${param?.required ? "checked" : ""} /> Obligatorio</label>
      <button type="submit" class="btn btn-primary">Guardar</button>
    </form>
  `);

  root.querySelector("#form-param").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const entry = {
      id: param?.id ?? createId("param"),
      key: String(fd.get("key")).trim(),
      label: String(fd.get("label")).trim(),
      type: fd.get("type"),
      required: fd.get("required") === "on",
    };
    if (isEdit) {
      const idx = flow.inputParams.findIndex((p) => p.id === param.id);
      flow.inputParams[idx] = entry;
    } else {
      flow.inputParams.push(entry);
    }
    onSave();
    close();
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
      <button type="button" class="btn btn-sm" data-modal-close>Cerrar</button>
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
        <button type="button" class="btn btn-primary" id="btn-save-screen" style="margin-top:0.75rem">Guardar pantalla</button>
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
