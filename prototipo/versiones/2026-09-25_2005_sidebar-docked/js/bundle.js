(() => {
  // js/theme-icons.js
  var THEME_TOGGLE_ICONS = `
<svg class="theme-icon theme-icon-sun" viewBox="0 0 24 24" aria-hidden="true">
  <circle cx="12" cy="12" r="4"></circle>
  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path>
</svg>
<svg class="theme-icon theme-icon-moon" viewBox="0 0 24 24" aria-hidden="true">
  <path d="M21 14.5A8.5 8.5 0 0 1 9.5 3 7 7 0 1 0 21 14.5z"></path>
</svg>`;
  function ensureThemeToggleIcons() {
    const btn = document.getElementById("theme-toggle");
    if (!btn || btn.querySelector(".theme-icon-sun")) return;
    btn.innerHTML = THEME_TOGGLE_ICONS;
  }

  // js/theme.js
  var THEME_KEY = "gestor_flujos_theme_v1";
  function getTheme() {
    return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  }
  function setTheme(theme) {
    const next = theme === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem(THEME_KEY, next);
    updateThemeToggleA11y();
  }
  function toggleTheme() {
    setTheme(getTheme() === "dark" ? "light" : "dark");
  }
  function updateThemeToggleA11y() {
    const btn = document.getElementById("theme-toggle");
    if (!btn) return;
    const isDark = getTheme() === "dark";
    btn.setAttribute("aria-label", isDark ? "Activar modo claro" : "Activar modo oscuro");
    btn.setAttribute("aria-pressed", isDark ? "true" : "false");
  }
  function bindThemeToggle() {
    ensureThemeToggleIcons();
    document.getElementById("theme-toggle")?.addEventListener("click", toggleTheme);
    updateThemeToggleA11y();
  }
  bindThemeToggle();

  // js/storage.js
  var STORAGE_KEY = "gestor_flujos_prototipo_v2";
  var emptyState = () => ({
    flows: [],
    instances: []
  });
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyState();
      const parsed = JSON.parse(raw);
      return {
        flows: Array.isArray(parsed.flows) ? parsed.flows : [],
        instances: Array.isArray(parsed.instances) ? parsed.instances : []
      };
    } catch {
      return emptyState();
    }
  }
  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  // js/ids.js
  function createId(prefix = "id") {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
    }
    const rand = Math.random().toString(36).slice(2, 10);
    const time = Date.now().toString(36);
    return `${prefix}_${time}_${rand}`;
  }

  // js/seed.js
  function createSampleFlow() {
    const flowId = createId("flow");
    const pTitulo = createId("param");
    const pMonto = createId("param");
    const nInicio = createId("node");
    const nManual = createId("node");
    const nGateway = createId("node");
    const nAuto = createId("node");
    const nFinOk = createId("node");
    const nFinRech = createId("node");
    return {
      id: flowId,
      type: "Aprobaci\xF3n",
      name: "Aprobaci\xF3n de gasto",
      description: "Ejemplo BPMN: Start \u2192 User Task \u2192 XOR Gateway \u2192 Service Task / End.",
      status: "listo",
      version: 1,
      notation: "bpmn",
      inputParams: [
        { id: pTitulo, key: "titulo", label: "T\xEDtulo del gasto", type: "texto", required: true },
        { id: pMonto, key: "monto", label: "Monto", type: "numero", required: true }
      ],
      nodes: [
        { id: nInicio, kind: "inicio", name: "Start", description: "", x: 60, y: 200, usedParamIds: [] },
        {
          id: nManual,
          kind: "manual",
          name: "Revisi\xF3n del supervisor",
          description: "User Task \u2014 validar monto y concepto",
          x: 200,
          y: 180,
          usedParamIds: [pTitulo, pMonto]
        },
        {
          id: nGateway,
          kind: "gateway",
          name: "\xBFAprobado?",
          description: "Exclusive Gateway",
          x: 420,
          y: 200,
          usedParamIds: []
        },
        {
          id: nAuto,
          kind: "automatica",
          name: "Registrar en sistema",
          description: "Service Task (mock)",
          x: 580,
          y: 120,
          usedParamIds: [pTitulo]
        },
        { id: nFinOk, kind: "fin", name: "End aprobado", description: "", x: 780, y: 120, usedParamIds: [] },
        { id: nFinRech, kind: "fin", name: "End rechazado", description: "", x: 580, y: 300, usedParamIds: [] }
      ],
      transitions: [
        { id: createId("tr"), fromId: nInicio, toId: nManual, condition: "siempre" },
        { id: createId("tr"), fromId: nManual, toId: nGateway, condition: "siempre" },
        { id: createId("tr"), fromId: nGateway, toId: nAuto, condition: "aceptar" },
        { id: createId("tr"), fromId: nGateway, toId: nFinRech, condition: "rechazar" },
        { id: createId("tr"), fromId: nAuto, toId: nFinOk, condition: "siempre" }
      ],
      screens: {
        [nManual]: {
          blocks: [
            { id: createId("blk"), type: "titulo", text: "Revisi\xF3n de gasto" },
            { id: createId("blk"), type: "texto", text: "Verifique los datos antes de aprobar o rechazar." },
            { id: createId("blk"), type: "dato", paramId: pTitulo },
            { id: createId("blk"), type: "dato", paramId: pMonto },
            { id: createId("blk"), type: "comentario" }
          ]
        }
      }
    };
  }
  function ensureSeed(state) {
    if (state.flows.length > 0) return state;
    return { ...state, flows: [createSampleFlow()] };
  }

  // js/validation.js
  var NODE_KINDS = {
    INICIO: "inicio",
    MANUAL: "manual",
    AUTOMATICA: "automatica",
    GATEWAY: "gateway",
    FIN: "fin"
  };
  function getStartNode(flow) {
    return flow.nodes.find((n) => n.kind === NODE_KINDS.INICIO) ?? null;
  }
  function reachableNodeIds(flow) {
    const start = getStartNode(flow);
    if (!start) return /* @__PURE__ */ new Set();
    const byFrom = /* @__PURE__ */ new Map();
    for (const t of flow.transitions) {
      if (!byFrom.has(t.fromId)) byFrom.set(t.fromId, []);
      byFrom.get(t.fromId).push(t.toId);
    }
    const seen = /* @__PURE__ */ new Set();
    const queue = [start.id];
    while (queue.length) {
      const id = queue.shift();
      if (seen.has(id)) continue;
      seen.add(id);
      for (const next of byFrom.get(id) ?? []) queue.push(next);
    }
    return seen;
  }
  function transitionsFrom(flow, nodeId, condition = null) {
    return flow.transitions.filter(
      (t) => t.fromId === nodeId && (condition === null || t.condition === condition)
    );
  }
  function transitionsTo(flow, nodeId) {
    return flow.transitions.filter((t) => t.toId === nodeId);
  }
  function validateFlow(flow) {
    const errors = [];
    const starts = flow.nodes.filter((n) => n.kind === NODE_KINDS.INICIO);
    const fins = flow.nodes.filter((n) => n.kind === NODE_KINDS.FIN);
    if (starts.length !== 1) {
      errors.push("Debe existir exactamente un Evento de inicio (Start Event).");
    }
    if (fins.length < 1) {
      errors.push("Debe existir al menos un Evento de fin (End Event).");
    }
    const paramIds = new Set(flow.inputParams.map((p) => p.id));
    const reachable = reachableNodeIds(flow);
    for (const node of flow.nodes) {
      if (node.kind !== NODE_KINDS.INICIO && !reachable.has(node.id)) {
        errors.push(`"${node.name || node.id}" no es alcanzable desde el Start Event.`);
      }
      for (const pid of node.usedParamIds ?? []) {
        if (!paramIds.has(pid)) {
          errors.push(`"${node.name}" usa un par\xE1metro de entrada inexistente.`);
        }
      }
      if (node.kind === NODE_KINDS.INICIO) {
        if (transitionsFrom(flow, node.id, "siempre").length === 0) {
          errors.push("El Start Event debe tener un Sequence Flow de salida.");
        }
        const bad = transitionsFrom(flow, node.id).filter((t) => t.condition !== "siempre");
        if (bad.length) errors.push("Desde el Start Event solo salen Sequence Flow \xABsiempre\xBB.");
      }
      if (node.kind === NODE_KINDS.MANUAL) {
        const outs = transitionsFrom(flow, node.id);
        const siempre = transitionsFrom(flow, node.id, "siempre");
        if (siempre.length !== 1) {
          errors.push(`User Task "${node.name}": debe tener exactamente una salida \xABsiempre\xBB hacia el gateway.`);
        }
        const bad = outs.filter((t) => t.condition !== "siempre");
        if (bad.length) {
          errors.push(`User Task "${node.name}": Aceptar/Rechazar se modelan en el Exclusive Gateway, no aqu\xED.`);
        }
        if (siempre.length === 1) {
          const target = flow.nodes.find((n) => n.id === siempre[0].toId);
          if (target?.kind !== NODE_KINDS.GATEWAY) {
            errors.push(`User Task "${node.name}": la salida \xABsiempre\xBB debe ir a un Exclusive Gateway.`);
          }
        }
        const screen = flow.screens?.[node.id];
        if (!screen?.blocks?.length) {
          errors.push(`User Task "${node.name}" debe tener una pantalla dise\xF1ada.`);
        } else {
          for (const block of screen.blocks) {
            if (block.type === "dato" && block.paramId && !paramIds.has(block.paramId)) {
              errors.push(`Pantalla de "${node.name}": dato de entrada inv\xE1lido.`);
            }
            if (block.type === "dato" && block.paramId && !(node.usedParamIds ?? []).includes(block.paramId)) {
              errors.push(`Pantalla de "${node.name}": el dato mostrado debe estar en "datos que usa".`);
            }
          }
        }
      }
      if (node.kind === NODE_KINDS.AUTOMATICA) {
        if (transitionsFrom(flow, node.id, "siempre").length === 0) {
          errors.push(`Service Task "${node.name}" debe tener Sequence Flow de continuaci\xF3n.`);
        }
      }
      if (node.kind === NODE_KINDS.GATEWAY) {
        if (transitionsTo(flow, node.id).length < 1) {
          errors.push(`Exclusive Gateway "${node.name}" debe tener al menos una entrada.`);
        }
        if (transitionsFrom(flow, node.id, "aceptar").length !== 1) {
          errors.push(`Gateway "${node.name}": falta Sequence Flow \xABaceptar\xBB.`);
        }
        if (transitionsFrom(flow, node.id, "rechazar").length !== 1) {
          errors.push(`Gateway "${node.name}": falta Sequence Flow \xABrechazar\xBB.`);
        }
        const outs = transitionsFrom(flow, node.id);
        const invalid = outs.filter((t) => t.condition !== "aceptar" && t.condition !== "rechazar");
        if (invalid.length) {
          errors.push(`Gateway "${node.name}": solo salidas \xABaceptar\xBB y \xABrechazar\xBB.`);
        }
      }
      if (node.kind === NODE_KINDS.FIN) {
        if (transitionsFrom(flow, node.id).length > 0) {
          errors.push(`End Event "${node.name}" no debe tener salidas.`);
        }
      }
    }
    return { isValid: errors.length === 0, errors };
  }
  function cloneFlowSnapshot(flow) {
    return JSON.parse(JSON.stringify(flow));
  }

  // js/ui.js
  function toast(message, durationMs = 3200) {
    const root = document.getElementById("toast-root");
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = message;
    root.appendChild(el);
    setTimeout(() => el.remove(), durationMs);
  }
  function openModal(html, onClose) {
    const root = document.getElementById("modal-root");
    root.hidden = false;
    root.innerHTML = `<div class="modal" role="dialog">${html}</div>`;
    const close = () => {
      root.hidden = true;
      root.innerHTML = "";
      onClose?.();
    };
    root.querySelector("[data-modal-close]")?.addEventListener("click", close);
    root.addEventListener("click", (e) => {
      if (e.target === root) close();
    });
    return { close, root: root.querySelector(".modal") };
  }
  function escapeHtml(text) {
    return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function formatDateTime(iso) {
    if (!iso) return "\u2014";
    try {
      return new Date(iso).toLocaleString("es-AR");
    } catch {
      return iso;
    }
  }

  // js/designer.js
  var designerContext = {
    selectedFlowId: null,
    selectedNodeId: null,
    connectMode: null
  };
  function renderDesigner(mainEl, state, persist) {
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
    const rows = state.flows.map(
      (f) => `
    <tr>
      <td>${escapeHtml(f.name)}</td>
      <td>${escapeHtml(f.type)}</td>
      <td>${escapeHtml(f.description || "\u2014")}</td>
      <td><span class="badge badge-${f.status === "listo" ? "listo" : "borrador"}">${f.status === "listo" ? "Listo" : "Borrador"}</span></td>
      <td>
        <button type="button" class="btn btn-sm" data-open-flow="${f.id}">Abrir</button>
      </td>
    </tr>`
    ).join("");
    return `
    <section class="panel">
      <h2 class="panel-title">Dise\xF1ador de flujo \u2014 Cat\xE1logo</h2>
      <p style="color:var(--muted);font-size:0.9rem;margin-top:0">Cree y edite flujos. Marque como listo cuando pasen la validaci\xF3n para instanciarlos en Gesti\xF3n de actividades.</p>
      <div class="toolbar">
        <button type="button" class="btn btn-primary" id="btn-new-flow">Nuevo flujo</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Nombre</th><th>Tipo</th><th>Descripci\xF3n</th><th>Estado</th><th></th></tr>
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
        <div class="form-row"><label>Tipo</label><input name="type" required placeholder="Ej. Aprobaci\xF3n" /></div>
        <div class="form-row"><label>Nombre</label><input name="name" required /></div>
        <div class="form-row"><label>Descripci\xF3n</label><textarea name="description"></textarea></div>
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
          screens: {}
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
      <button type="button" class="btn" id="btn-back-catalog">\u2190 Cat\xE1logo</button>
      <span style="flex:1;font-weight:600">${escapeHtml(flow.name)} <span class="badge badge-${flow.status === "listo" ? "listo" : "borrador"}">${flow.status === "listo" ? "Listo" : "Borrador"}</span></span>
      <button type="button" class="btn" id="btn-flow-meta">Metadatos</button>
      <button type="button" class="btn btn-success" id="btn-mark-ready" ${validation.isValid ? "" : "disabled"}>Marcar listo</button>
      <button type="button" class="btn" id="btn-mark-draft">Volver a borrador</button>
    </div>
    ${validation.isValid ? "" : `<ul class="validation-list">${validation.errors.map((e) => `<li>${escapeHtml(e)}</li>`).join("")}</ul>`}
    <div class="split split-designer">
      <aside class="panel palette">
        <h3 class="panel-title">Elementos BPMN</h3>
        <div class="palette-item palette-inicio" draggable="true" data-palette="inicio">Start Event</div>
        <div class="palette-item palette-manual" draggable="true" data-palette="manual">User Task</div>
        <div class="palette-item palette-auto" draggable="true" data-palette="automatica">Service Task</div>
        <div class="palette-item palette-gateway" draggable="true" data-palette="gateway">Exclusive Gateway</div>
        <div class="palette-item palette-fin" draggable="true" data-palette="fin">End Event</div>
        <p style="font-size:0.75rem;color:var(--muted);margin:0.5rem 0 0">Sequence Flow: User Task \u2192 Gateway (siempre); Gateway \u2192 ramas aceptar/rechazar.</p>
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
      inicio: "Start Event",
      manual: "User Task",
      automatica: "Service Task",
      gateway: "XOR Gateway",
      fin: "End Event"
    }[node.kind];
    const icon = node.kind === "manual" ? `<span class="bpmn-task-icon" aria-hidden="true">\u{1F464}</span>` : node.kind === "automatica" ? `<span class="bpmn-task-icon" aria-hidden="true">\u2699</span>` : node.kind === "gateway" ? `<span class="bpmn-gateway-x" aria-hidden="true">\xD7</span>` : "";
    return `
    <div class="flow-node node-${node.kind} ${isSelected ? "is-selected" : ""}"
         data-node-id="${node.id}"
         style="left:${node.x}px;top:${node.y}px">
      ${icon}
      <div class="node-kind">${kindLabel}</div>
      <div class="node-name">${escapeHtml(node.name)}</div>
    </div>`;
  }
  function nodeAnchor(node) {
    const box = {
      inicio: { w: 52, h: 52 },
      fin: { w: 52, h: 52 },
      gateway: { w: 56, h: 56 },
      manual: { w: 148, h: 64 },
      automatica: { w: 148, h: 64 }
    }[node.kind] ?? { w: 140, h: 56 };
    return {
      x: node.x + box.w / 2,
      y: node.y + box.h / 2,
      w: box.w,
      h: box.h
    };
  }
  function renderNodeProps(flow, node) {
    const paramsHtml = flow.inputParams.map(
      (p) => `
      <label style="display:flex;gap:0.35rem;align-items:center;font-size:0.85rem;margin-bottom:0.35rem">
        <input type="checkbox" data-used-param="${p.id}" ${(node.usedParamIds ?? []).includes(p.id) ? "checked" : ""} ${node.kind === "inicio" ? "disabled" : ""} />
        ${escapeHtml(p.label)} (${escapeHtml(p.key)})
      </label>`
    ).join("") || "<p style='font-size:0.8rem;color:var(--muted)'>Sin par\xE1metros. Def\xEDnalos en el nodo Inicio.</p>";
    const transitions = flow.transitions.filter((t) => t.fromId === node.id);
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
    const inicioParams = node.kind === NODE_KINDS.INICIO ? `
    <div class="props-section">
      <h4>Par\xE1metros de entrada del flujo</h4>
      <div id="input-params-list">${renderInputParamsList(flow)}</div>
      <button type="button" class="btn btn-sm" id="btn-add-param">+ Par\xE1metro</button>
    </div>` : "";
    const screenBtn = node.kind === NODE_KINDS.MANUAL ? `<button type="button" class="btn btn-primary btn-sm" id="btn-design-screen" style="width:100%;margin-top:0.5rem">Dise\xF1ar pantalla</button>` : "";
    return `
    <form id="node-props-form" class="form-grid">
      <div class="form-row"><label>Nombre</label><input name="name" value="${escapeHtml(node.name)}" required /></div>
      <div class="form-row"><label>Descripci\xF3n</label><textarea name="description">${escapeHtml(node.description || "")}</textarea></div>
      ${node.kind !== NODE_KINDS.INICIO && node.kind !== NODE_KINDS.FIN && node.kind !== NODE_KINDS.GATEWAY ? `
      <div class="props-section">
        <h4>Datos de entrada que usa</h4>
        ${paramsHtml}
      </div>` : ""}
      ${inicioParams}
      ${screenBtn}
      <div class="props-section">
        <h4>Sequence Flow salientes</h4>
        <ul style="margin:0;padding-left:1rem;font-size:0.8rem">
          ${transitions.map((t) => {
      const to = flow.nodes.find((n) => n.id === t.toId);
      return `<li>${escapeHtml(t.condition)} \u2192 ${escapeHtml(to?.name ?? t.toId)} <button type="button" class="btn btn-sm btn-danger" data-del-tr="${t.id}">\xD7</button></li>`;
    }).join("") || "<li style='color:var(--muted)'>Ninguna</li>"}
        </ul>
        <div class="form-row" style="margin-top:0.5rem">
          <label>Nueva conexi\xF3n hacia</label>
          <select id="connect-target">
            <option value="">\u2014 Seleccionar \u2014</option>
            ${targets.map((t) => `<option value="${t.id}">${escapeHtml(t.name)} (${t.kind})</option>`).join("")}
          </select>
        </div>
        <div class="form-row">
          <label>Condici\xF3n</label>
          <select id="connect-condition">${connectConditions}</select>
        </div>
        <button type="button" class="btn btn-sm" id="btn-add-transition">Agregar conexi\xF3n</button>
      </div>
      <button type="button" class="btn btn-danger btn-sm" id="btn-delete-node">Eliminar nodo</button>
    </form>`;
  }
  function renderInputParamsList(flow) {
    return flow.inputParams.map(
      (p) => `
    <div class="chip-list" style="margin-bottom:0.5rem">
      <span class="chip">${escapeHtml(p.label)} \xB7 ${escapeHtml(p.type)} ${p.required ? "*" : ""}
        <button type="button" data-del-param="${p.id}" title="Eliminar">\xD7</button>
      </span>
    </div>`
    ).join("");
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
        toast("Corrija la validaci\xF3n antes de marcar listo.");
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
        <div class="form-row"><label>Descripci\xF3n</label><textarea name="description">${escapeHtml(flow.description || "")}</textarea></div>
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
        toast("Solo puede haber un Start Event.");
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
        usedParamIds: []
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
      inicio: "Start",
      manual: "User Task",
      automatica: "Service Task",
      gateway: "Decisi\xF3n XOR",
      fin: "End"
    }[kind];
  }
  var activeDrag = null;
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
        { signal }
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
    const paths = flow.transitions.map((t) => {
      const from = nodeById[t.fromId];
      const to = nodeById[t.toId];
      if (!from || !to) return "";
      const a = nodeAnchor(from);
      const b = nodeAnchor(to);
      const x1 = a.x;
      const y1 = a.y;
      const x2 = b.x;
      const y2 = b.y;
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      const color = t.condition === "aceptar" ? "#4ade80" : t.condition === "rechazar" ? "#f87171" : "#38bdf8";
      const label = t.condition === "siempre" ? "" : `<text x="${mx}" y="${my - 6}" fill="${color}" font-size="11" text-anchor="middle">${escapeHtml(t.condition)}</text>`;
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="2" marker-end="url(#arrow)" />${label}`;
    }).join("");
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
            (b) => !(b.type === "dato" && b.paramId === pid)
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
        toast("Seleccione destino y condici\xF3n.");
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
        toast("No puede eliminar el Start Event.");
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
    <div class="modal-header"><h2>${isEdit ? "Editar" : "Nuevo"} par\xE1metro</h2><button type="button" class="btn btn-sm" data-modal-close>Cerrar</button></div>
    <form id="form-param" class="form-grid">
      <div class="form-row"><label>Clave</label><input name="key" required pattern="[a-z0-9_]+" value="${param ? escapeHtml(param.key) : ""}" placeholder="ej. monto" /></div>
      <div class="form-row"><label>Etiqueta</label><input name="label" required value="${param ? escapeHtml(param.label) : ""}" /></div>
      <div class="form-row"><label>Tipo</label>
        <select name="type">
          <option value="texto" ${param?.type === "texto" ? "selected" : ""}>Texto</option>
          <option value="numero" ${param?.type === "numero" ? "selected" : ""}>N\xFAmero</option>
          <option value="fecha" ${param?.type === "fecha" ? "selected" : ""}>Fecha</option>
          <option value="si_no" ${param?.type === "si_no" ? "selected" : ""}>S\xED / No</option>
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
        required: fd.get("required") === "on"
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
    const renderBlocks = () => screen.blocks.map((b, i) => {
      let label = b.type;
      if (b.type === "titulo" || b.type === "texto") label += `: ${b.text || ""}`;
      if (b.type === "dato") {
        const p = flow.inputParams.find((x) => x.id === b.paramId);
        label += `: ${p?.label ?? "?"}`;
      }
      return `<div class="screen-block" data-idx="${i}">
          <span style="flex:1">${escapeHtml(label)}</span>
          <button type="button" class="btn btn-sm" data-move-up="${i}">\u2191</button>
          <button type="button" class="btn btn-sm" data-move-down="${i}">\u2193</button>
          <button type="button" class="btn btn-sm btn-danger" data-rm-block="${i}">\xD7</button>
        </div>`;
    }).join("");
    const renderPreview = () => {
      let html = "";
      for (const b of screen.blocks) {
        if (b.type === "titulo") html += `<h3>${escapeHtml(b.text || "T\xEDtulo")}</h3>`;
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
          <button type="button" class="btn btn-sm" data-add="titulo">+ T\xEDtulo</button>
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
          const text = prompt("Texto del t\xEDtulo:", "T\xEDtulo");
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

  // js/motor.js
  function findNode(snapshot, nodeId) {
    return snapshot.nodes.find((n) => n.id === nodeId) ?? null;
  }
  function nextNodeId(snapshot, fromId, condition) {
    const t = snapshot.transitions.find(
      (tr) => tr.fromId === fromId && tr.condition === condition
    );
    return t?.toId ?? null;
  }
  function appendTrace(instance, entry) {
    instance.trace.push({
      id: createId("tr"),
      at: (/* @__PURE__ */ new Date()).toISOString(),
      ...entry
    });
  }
  function resolveStatusOnEnd(node) {
    if (node.kind !== NODE_KINDS.FIN) return "en_curso";
    const name = (node.name || "").toLowerCase();
    if (name.includes("rechaz") || name.includes("deneg")) return "cerrada_rechazo";
    return "completada";
  }
  function completeStep(instance, nodeId, status, comment = "") {
    instance.steps.push({
      nodeId,
      status,
      comment,
      at: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  function pickDataForNode(instance, node) {
    const out = {};
    const params = instance.flowSnapshot.inputParams ?? [];
    for (const pid of node.usedParamIds ?? []) {
      const p = params.find((x) => x.id === pid);
      if (p) out[p.key] = instance.inputValues[p.key];
    }
    return out;
  }
  function proceedFromNode(instance, nodeId, gatewayDecision = null) {
    let currentId = nodeId;
    while (currentId) {
      const node = findNode(instance.flowSnapshot, currentId);
      if (!node) break;
      if (node.kind === NODE_KINDS.MANUAL) {
        instance.currentNodeId = currentId;
        appendTrace(instance, {
          type: "pendiente",
          message: `User Task pendiente: ${node.name}`,
          nodeId: currentId
        });
        return instance;
      }
      if (node.kind === NODE_KINDS.GATEWAY) {
        if (!gatewayDecision) {
          instance.currentNodeId = currentId;
          appendTrace(instance, {
            type: "error",
            message: `Gateway "${node.name}" requiere decisi\xF3n Aceptar/Rechazar.`,
            nodeId: currentId
          });
          return instance;
        }
        appendTrace(instance, {
          type: "gateway",
          message: `Exclusive Gateway: ${gatewayDecision}`,
          nodeId: currentId,
          decision: gatewayDecision
        });
        currentId = nextNodeId(instance.flowSnapshot, currentId, gatewayDecision);
        gatewayDecision = null;
        instance.currentNodeId = currentId;
        continue;
      }
      if (node.kind === NODE_KINDS.FIN) {
        completeStep(instance, currentId, "completada");
        instance.status = resolveStatusOnEnd(node);
        instance.finishedAt = (/* @__PURE__ */ new Date()).toISOString();
        instance.currentNodeId = null;
        appendTrace(instance, {
          type: "fin",
          message: `End Event: ${node.name}`,
          nodeId: currentId
        });
        return instance;
      }
      if (node.kind === NODE_KINDS.AUTOMATICA) {
        completeStep(instance, currentId, "completada");
        appendTrace(instance, {
          type: "automatica",
          message: `Service Task ejecutada: ${node.name}`,
          nodeId: currentId,
          decision: "siempre"
        });
        currentId = nextNodeId(instance.flowSnapshot, currentId, "siempre");
        instance.currentNodeId = currentId;
        continue;
      }
      if (node.kind === NODE_KINDS.INICIO) {
        currentId = nextNodeId(instance.flowSnapshot, currentId, "siempre");
        instance.currentNodeId = currentId;
        continue;
      }
      break;
    }
    return instance;
  }
  function createInstance(flowSnapshot, inputValues) {
    const start = flowSnapshot.nodes.find((n) => n.kind === NODE_KINDS.INICIO);
    if (!start) throw new Error("Flujo sin Start Event");
    const firstId = nextNodeId(flowSnapshot, start.id, "siempre");
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const instance = {
      id: createId("inst"),
      flowId: flowSnapshot.id,
      flowName: flowSnapshot.name,
      flowSnapshot,
      status: "en_curso",
      inputValues: { ...inputValues },
      currentNodeId: firstId,
      startedAt: now,
      finishedAt: null,
      trace: [],
      steps: []
    };
    appendTrace(instance, {
      type: "inicio",
      message: `Instancia iniciada \u2014 flujo "${flowSnapshot.name}"`,
      nodeId: start.id,
      dataShown: { ...inputValues }
    });
    if (!firstId) {
      instance.status = "completada";
      instance.finishedAt = now;
      appendTrace(instance, {
        type: "fin",
        message: "Flujo sin actividades posteriores al Start Event.",
        nodeId: start.id
      });
      return instance;
    }
    return proceedFromNode(instance, firstId);
  }
  function advanceAutomatic(instance) {
    return proceedFromNode(instance, instance.currentNodeId);
  }
  function resolveManual(instance, decision, comment = "") {
    const nodeId = instance.currentNodeId;
    const node = findNode(instance.flowSnapshot, nodeId);
    if (!node || node.kind !== NODE_KINDS.MANUAL) {
      throw new Error("No hay User Task pendiente");
    }
    const status = decision === "aceptar" ? "aceptada" : "rechazada";
    completeStep(instance, nodeId, status, comment);
    appendTrace(instance, {
      type: "manual",
      message: `${node.name}: ${decision}`,
      nodeId,
      decision,
      comment,
      dataShown: pickDataForNode(instance, node)
    });
    const nextId = nextNodeId(instance.flowSnapshot, nodeId, "siempre");
    if (!nextId) {
      instance.status = decision === "rechazar" ? "cerrada_rechazo" : "completada";
      instance.finishedAt = (/* @__PURE__ */ new Date()).toISOString();
      instance.currentNodeId = null;
      return instance;
    }
    instance.currentNodeId = nextId;
    return proceedFromNode(instance, nextId, decision);
  }
  function getCurrentNode(instance) {
    if (!instance.currentNodeId) return null;
    return findNode(instance.flowSnapshot, instance.currentNodeId);
  }
  function countProgress(instance) {
    const totalSteps = instance.flowSnapshot.nodes.filter(
      (n) => n.kind === NODE_KINDS.MANUAL || n.kind === NODE_KINDS.AUTOMATICA
    ).length;
    const done = instance.steps.length;
    const pct = totalSteps === 0 ? 100 : Math.min(100, Math.round(done / totalSteps * 100));
    return { done, totalSteps, pct };
  }
  function statusLabel(status) {
    const map = {
      en_curso: "En curso",
      completada: "Completada",
      cerrada_rechazo: "Cerrada por rechazo"
    };
    return map[status] ?? status;
  }

  // js/gestion.js
  var selectedInstanceId = null;
  function renderGestion(mainEl, state, persist) {
    const readyFlows = state.flows.filter((f) => f.status === "listo");
    const activeInstances = state.instances.filter((i) => i.status === "en_curso");
    const selected = state.instances.find((i) => i.id === selectedInstanceId);
    mainEl.innerHTML = `
    <div class="gestion-layout">
      <section class="panel">
        <h2 class="panel-title">Instanciar flujo</h2>
        ${readyFlows.length === 0 ? `<p style="color:var(--muted);font-size:0.85rem">No hay flujos listos. M\xE1rquelos en el dise\xF1ador.</p>` : `
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
      <div style="font-size:0.85rem;margin-top:0.5rem">Pendiente: ${escapeHtml(node?.name ?? "\u2014")}</div>
    </article>`;
  }
  function renderInputFields(flow) {
    return flow.inputParams.map((p) => {
      let input = `<input name="${escapeHtml(p.key)}" ${p.required ? "required" : ""} />`;
      if (p.type === "fecha") input = `<input type="date" name="${escapeHtml(p.key)}" ${p.required ? "required" : ""} />`;
      if (p.type === "numero") input = `<input type="number" name="${escapeHtml(p.key)}" ${p.required ? "required" : ""} />`;
      if (p.type === "si_no") {
        input = `<select name="${escapeHtml(p.key)}" ${p.required ? "required" : ""}><option value="">\u2014</option><option value="si">S\xED</option><option value="no">No</option></select>`;
      }
      return `<div class="form-row"><label>${escapeHtml(p.label)}</label>${input}</div>`;
    }).join("");
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
        toast("El flujo ya no cumple validaci\xF3n.");
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
      <p><strong>${escapeHtml(node.name)}</strong> (autom\xE1tica)</p>
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

  // js/reporte.js
  var selectedReportInstanceId = null;
  function renderReporte(mainEl, state) {
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
                  <td>${prog.pct}% \xB7 ${escapeHtml(node?.name ?? "Finalizado")}</td>
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
    const inputs = Object.entries(instance.inputValues).map(([k, v]) => `<li><strong>${escapeHtml(k)}:</strong> ${escapeHtml(String(v))}</li>`).join("");
    const trace = instance.trace.map(
      (t) => `
    <li class="trace-item">
      <time>${formatDateTime(t.at)}</time> \u2014 ${escapeHtml(t.message)}
      ${t.comment ? `<div style="color:var(--muted)">Comentario: ${escapeHtml(t.comment)}</div>` : ""}
      ${t.decision ? `<div>Decisi\xF3n: ${escapeHtml(t.decision)}</div>` : ""}
    </li>`
    ).join("");
    return `
    <h3 style="margin-top:0">${escapeHtml(instance.flowName)}</h3>
    <p><span class="badge badge-${badgeForStatus(instance.status)}">${statusLabel(instance.status)}</span></p>
    <div class="progress-bar"><span style="width:${prog.pct}%"></span></div>
    <p style="font-size:0.8rem;color:var(--muted)">${prog.done} actividades registradas \xB7 Paso actual: ${escapeHtml(node?.name ?? "\u2014")}</p>
    <h4>Datos de entrada</h4>
    <ul style="font-size:0.85rem">${inputs || "<li>\u2014</li>"}</ul>
    <h4>Traza</h4>
    <ul class="trace-list">${trace}</ul>`;
  }

  // js/shell.js
  var DOCKED_MQ = window.matchMedia("(min-width: 768px)");
  function isDockedNav() {
    return DOCKED_MQ.matches;
  }
  function isNavOpen(drawer, shell) {
    if (isDockedNav()) {
      return !shell?.classList.contains("is-nav-collapsed");
    }
    return drawer?.classList.contains("is-open") ?? false;
  }
  function syncToggleA11y(toggle, open) {
    toggle?.setAttribute("aria-expanded", open ? "true" : "false");
    toggle?.setAttribute("aria-label", open ? "Cerrar men\xFA" : "Abrir men\xFA");
  }
  function bindNavDrawer(onNavigate) {
    const shell = document.getElementById("app-shell");
    const drawer = document.getElementById("nav-drawer");
    const overlay = document.getElementById("nav-overlay");
    const toggle = document.getElementById("menu-toggle");
    const setOpen = (open2) => {
      drawer?.classList.toggle("is-open", open2);
      drawer?.setAttribute("aria-hidden", open2 ? "false" : "true");
      if (isDockedNav()) {
        shell?.classList.toggle("is-nav-collapsed", !open2);
        overlay?.classList.remove("is-open");
        document.body.classList.remove("nav-open");
      } else {
        overlay?.classList.toggle("is-open", open2);
        document.body.classList.toggle("nav-open", open2);
      }
      syncToggleA11y(toggle, open2);
    };
    const close = () => setOpen(false);
    const open = () => setOpen(true);
    setOpen(true);
    toggle?.addEventListener("click", (e) => {
      e.stopPropagation();
      setOpen(!isNavOpen(drawer, shell));
    });
    overlay?.addEventListener("click", () => {
      if (!isDockedNav()) close();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !isDockedNav()) close();
    });
    DOCKED_MQ.addEventListener("change", () => {
      const openNow = isNavOpen(drawer, shell);
      setOpen(openNow);
    });
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        onNavigate(btn.dataset.view);
        if (!isDockedNav()) close();
      });
    });
    return { close, open };
  }

  // js/app.js
  function showBootError(message) {
    const mainEl = document.getElementById("app-main");
    if (!mainEl) return;
    mainEl.innerHTML = `
    <section class="panel">
      <h2 class="panel-title">No se pudo iniciar el mock</h2>
      <p style="color:var(--danger)">${message}</p>
      <p style="font-size:0.9rem;color:var(--muted)">Pruebe abrir con un servidor local, por ejemplo: <code>python -m http.server 8765</code> en la carpeta <code>prototipo</code>.</p>
    </section>`;
  }
  try {
    let persist = function() {
      saveState(state);
    }, render = function() {
      if (currentView === "designer") renderDesigner(mainEl, state, persist);
      if (currentView === "gestion") renderGestion(mainEl, state, persist);
      if (currentView === "reporte") renderReporte(mainEl, state);
    };
    const mainEl = document.getElementById("app-main");
    if (!mainEl) {
      throw new Error("Falta el contenedor principal #app-main.");
    }
    let state = ensureSeed(loadState());
    let currentView = "designer";
    bindNavDrawer((view) => {
      currentView = view;
      render();
    });
    render();
  } catch (err) {
    console.error(err);
    showBootError(err instanceof Error ? err.message : "Error desconocido.");
  }
})();
