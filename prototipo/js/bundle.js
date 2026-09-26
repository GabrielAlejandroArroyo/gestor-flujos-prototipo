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

  // js/pool-geometry.js
  var POOL_INSET = 12;
  var POOL_LABEL_W = 36;
  var LANE_TITLE_W = 44;
  var LANE_CONTENT_WIDTH_MIN = 520;
  var LANE_CONTENT_WIDTH_MAX = 960;
  var LANE_MIN_H = 180;
  var LANE_PAD = 16;
  var DESIGNER_LAYOUT_SHELL_PAD = 72;
  function resolveLaneContentWidth(viewportWidth, options = {}) {
    const shellPad = options.shellPad ?? DESIGNER_LAYOUT_SHELL_PAD;
    const fixedPoolChrome = POOL_INSET * 2 + POOL_LABEL_W + LANE_TITLE_W;
    const usable = viewportWidth - shellPad - fixedPoolChrome;
    return Math.max(
      LANE_CONTENT_WIDTH_MIN,
      Math.min(LANE_CONTENT_WIDTH_MAX, Math.floor(usable))
    );
  }
  function getNodeBox(kind) {
    return {
      inicio: { w: 52, h: 52 },
      fin: { w: 52, h: 52 },
      gateway: { w: 56, h: 56 },
      manual: { w: 148, h: 64 },
      automatica: { w: 148, h: 64 }
    }[kind] ?? { w: 140, h: 56 };
  }
  function computeLaneLayout(flow, options = {}) {
    const viewportWidth = options.viewportWidth ?? (typeof window !== "undefined" ? window.innerWidth : 1280);
    const laneContentWidth = resolveLaneContentWidth(viewportWidth, options);
    if (!flow?.lanes?.length) {
      return {
        poolTop: POOL_INSET,
        poolLeft: POOL_INSET,
        poolWidth: 0,
        poolHeight: 0,
        canvasMinWidth: POOL_INSET * 2,
        canvasMinHeight: 600,
        lanes: [],
        laneById: {}
      };
    }
    let top = POOL_INSET;
    const contentLeft = POOL_INSET + POOL_LABEL_W + LANE_TITLE_W;
    const lanes = flow.lanes.map((lane) => {
      const height = lane.height ?? LANE_MIN_H;
      const band = {
        id: lane.id,
        name: lane.name,
        top,
        left: contentLeft,
        width: laneContentWidth,
        height
      };
      top += height;
      return band;
    });
    const poolHeight = top - POOL_INSET;
    const poolWidth = POOL_LABEL_W + LANE_TITLE_W + laneContentWidth;
    return {
      poolTop: POOL_INSET,
      poolLeft: POOL_INSET,
      poolWidth,
      poolHeight,
      canvasMinWidth: POOL_INSET * 2 + poolWidth,
      canvasMinHeight: Math.max(600, top + POOL_INSET),
      lanes,
      laneById: Object.fromEntries(lanes.map((l) => [l.id, l]))
    };
  }
  function getLaneBand(layout, laneId) {
    return layout.laneById[laneId] ?? layout.lanes[0] ?? null;
  }
  function getNodePlacementBounds(node, lane) {
    const box = getNodeBox(node.kind);
    if (!lane) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    }
    const minX = lane.left + LANE_PAD;
    const maxX = lane.left + lane.width - box.w - LANE_PAD;
    const minY = lane.top + LANE_PAD;
    const maxY = lane.top + lane.height - box.h - LANE_PAD;
    return {
      minX,
      maxX: Math.max(minX, maxX),
      minY,
      maxY: Math.max(minY, maxY)
    };
  }
  function isFlowEventInsidePool(flow, node) {
    if (node.kind !== "inicio" && node.kind !== "fin") return true;
    if (!flow?.lanes?.length || !node.laneId) return false;
    const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1280;
    const layout = computeLaneLayout(flow, { viewportWidth });
    const lane = getLaneBand(layout, node.laneId);
    if (!lane) return false;
    const box = getNodeBox(node.kind);
    return node.x >= lane.left + LANE_PAD && node.x + box.w <= lane.left + lane.width - LANE_PAD && node.y >= lane.top + LANE_PAD && node.y + box.h <= lane.top + lane.height - LANE_PAD;
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

  // js/contracts.js
  var DATA_TYPES = {
    TEXTO: "texto",
    NUMERO: "numero",
    FECHA: "fecha",
    SI_NO: "si_no",
    TEXTO_LARGO: "texto_largo",
    JSON: "json"
  };
  var MAPPING_SOURCES = {
    FLOW_INPUT: "flow_input",
    CONTEXT: "context",
    CONSTANT: "constant"
  };
  var RESERVED_CONTEXT_KEYS = /* @__PURE__ */ new Set(["__proto__", "constructor"]);
  function normalizeFlowContracts(flow) {
    if (!flow) return;
    if (!Array.isArray(flow.inputParams)) flow.inputParams = [];
    if (!flow.dataDefinitions) {
      flow.dataDefinitions = flow.inputParams.map((p) => ({
        id: p.id,
        key: p.key,
        label: p.label,
        type: p.type ?? DATA_TYPES.TEXTO,
        required: !!p.required,
        scope: "flow_input"
      }));
    }
    syncInputParamsFromDefinitions(flow);
    if (!flow.nodes) return;
    for (const node of flow.nodes) {
      if (!node.inputMappings && (node.usedParamIds?.length ?? 0) > 0) {
        node.inputMappings = node.usedParamIds.map((paramId) => {
          const def = flow.inputParams.find((p) => p.id === paramId);
          return {
            id: createId("map"),
            source: MAPPING_SOURCES.FLOW_INPUT,
            paramId,
            localKey: def?.key ?? paramId
          };
        });
      }
      if (!node.outputMappings) node.outputMappings = [];
      if (!node.inputMappings) node.inputMappings = [];
      syncUsedParamIdsFromMappings(node, flow);
    }
  }
  function syncInputParamsFromDefinitions(flow) {
    flow.inputParams = flow.dataDefinitions.map((d) => ({
      id: d.id,
      key: d.key,
      label: d.label,
      type: d.type,
      required: !!d.required
    }));
  }
  function syncUsedParamIdsFromMappings(node, flow) {
    const ids = [];
    for (const m of node.inputMappings ?? []) {
      if (m.source === MAPPING_SOURCES.FLOW_INPUT && m.paramId) ids.push(m.paramId);
      if (m.source === MAPPING_SOURCES.FLOW_INPUT && m.key) {
        const p = flow.inputParams.find((x) => x.key === m.key);
        if (p) ids.push(p.id);
      }
    }
    node.usedParamIds = [...new Set(ids)];
  }
  function resolveNodeInputBag(flow, instance, node) {
    const bag = { ...instance.inputValues, ...instance.context ?? {} };
    const out = {};
    for (const m of node.inputMappings ?? []) {
      if (m.source === MAPPING_SOURCES.CONSTANT) {
        out[m.localKey ?? m.targetKey ?? "value"] = m.constantValue ?? "";
        continue;
      }
      if (m.source === MAPPING_SOURCES.CONTEXT) {
        const k = m.contextKey ?? m.key;
        if (k) out[m.localKey ?? k] = instance.context?.[k];
        continue;
      }
      const param = flow.inputParams.find((p) => p.id === m.paramId || p.key === m.key);
      if (param) out[m.localKey ?? param.key] = bag[param.key] ?? instance.context?.[param.key];
    }
    for (const pid of node.usedParamIds ?? []) {
      const param = flow.inputParams.find((p) => p.id === pid);
      if (param && out[param.key] === void 0) {
        out[param.key] = instance.inputValues[param.key] ?? instance.context?.[param.key];
      }
    }
    return out;
  }
  function applyNodeOutputMappings(instance, node, values) {
    if (!instance.context) instance.context = {};
    for (const m of node.outputMappings ?? []) {
      const srcKey = m.localKey ?? m.sourceKey ?? m.fieldKey;
      const target = m.contextKey ?? m.targetKey;
      if (!target || RESERVED_CONTEXT_KEYS.has(target)) continue;
      if (values[srcKey] !== void 0) instance.context[target] = values[srcKey];
    }
    for (const [k, v] of Object.entries(values)) {
      if (k.startsWith("_")) continue;
      if (RESERVED_CONTEXT_KEYS.has(k)) continue;
      const mapped = (node.outputMappings ?? []).some((m) => (m.localKey ?? m.sourceKey ?? m.fieldKey) === k);
      const mappedTarget = (node.outputMappings ?? []).some((m) => (m.contextKey ?? m.targetKey) === k);
      if (mappedTarget) continue;
      if (!mapped && (node.kind === "manual" || node.kind === "automatica")) {
        instance.context[k] = v;
      }
    }
  }
  function validateFlowContracts(flow) {
    const errors = [];
    normalizeFlowContracts(flow);
    const keys = /* @__PURE__ */ new Set();
    for (const d of flow.dataDefinitions ?? []) {
      if (!d.key?.trim()) errors.push("Contrato: hay una definici\xF3n sin clave.");
      if (keys.has(d.key)) errors.push(`Contrato: clave duplicada \xAB${d.key}\xBB.`);
      keys.add(d.key);
    }
    for (const node of flow.nodes ?? []) {
      for (const m of node.outputMappings ?? []) {
        const t = m.contextKey ?? m.targetKey;
        if (t && RESERVED_CONTEXT_KEYS.has(t)) {
          errors.push(`\xAB${node.name}\xBB: clave de contexto reservada \xAB${t}\xBB.`);
        }
      }
      if (node.kind === "automatica" && node.integration?.adapter !== "simulation") {
        if (!node.integration?.adapter) {
          errors.push(`Service Task \xAB${node.name}\xBB: falta adaptador de integraci\xF3n.`);
        }
      }
    }
    return errors;
  }
  function validateScreenSubmission(screen, raw) {
    const errors = [];
    const values = {};
    for (const b of screen?.blocks ?? []) {
      if (b.type === "comentario" || b.type === "campo_texto" || b.type === "campo_texto_largo") {
        const key = b.outputKey ?? b.fieldKey ?? (b.type === "comentario" ? "comment" : b.id);
        values[key] = raw[key] ?? raw[`field_${b.id}`] ?? "";
        if (b.required && !String(values[key]).trim()) errors.push(`Campo obligatorio: ${b.label ?? key}.`);
      }
      if (b.type === "campo_numero") {
        const key = b.outputKey ?? b.fieldKey ?? b.id;
        const v = raw[key] ?? raw[`field_${b.id}`];
        if (b.required && (v === "" || v === void 0)) errors.push(`Campo obligatorio: ${b.label ?? key}.`);
        values[key] = v === "" || v === void 0 ? null : Number(v);
      }
      if (b.type === "campo_fecha" || b.type === "campo_si_no") {
        const key = b.outputKey ?? b.fieldKey ?? b.id;
        values[key] = raw[key] ?? raw[`field_${b.id}`] ?? "";
        if (b.required && !String(values[key]).trim()) errors.push(`Campo obligatorio: ${b.label ?? key}.`);
      }
    }
    if (raw.comment !== void 0) values.comment = raw.comment;
    return { values, errors };
  }
  function redactSecrets(payload) {
    try {
      const s = JSON.stringify(payload);
      return JSON.parse(
        s.replace(/"(authorization|api[_-]?key|password|secret|token)"\s*:\s*"[^"]*"/gi, '"$1":"***"')
      );
    } catch {
      return payload;
    }
  }

  // js/integrations.js
  var ADAPTER_KINDS = {
    SIMULATION: "simulation",
    REST_JSON: "rest_json",
    SOAP_XML: "soap_xml",
    GRAPHQL: "graphql",
    CONNECTOR: "connector"
  };
  var ADAPTER_CATALOG = [
    { id: ADAPTER_KINDS.SIMULATION, label: "Simulaci\xF3n (sin API)", execution: "mock" },
    { id: ADAPTER_KINDS.REST_JSON, label: "REST / JSON", execution: "mock_or_live" },
    { id: ADAPTER_KINDS.SOAP_XML, label: "SOAP / XML", execution: "mock" },
    { id: ADAPTER_KINDS.GRAPHQL, label: "GraphQL", execution: "mock" },
    { id: ADAPTER_KINDS.CONNECTOR, label: "Conector de sistema", execution: "mock" }
  ];
  function defaultIntegration(kind = ADAPTER_KINDS.SIMULATION) {
    const base = {
      adapter: kind,
      executionMode: "mock",
      onError: "fail_instance",
      retries: 0,
      timeoutMs: 15e3,
      credentialRef: "",
      requestMappings: [],
      responseMappings: []
    };
    if (kind === ADAPTER_KINDS.REST_JSON) {
      return {
        ...base,
        method: "POST",
        urlTemplate: "https://api.ejemplo.local/registrar",
        headers: { "Content-Type": "application/json" },
        bodyTemplate: "{}"
      };
    }
    if (kind === ADAPTER_KINDS.SOAP_XML) {
      return {
        ...base,
        endpoint: "https://legacy.ejemplo.local/soap",
        soapAction: "Registrar",
        bodyTemplate: "<Envelope></Envelope>",
        responsePath: "//id"
      };
    }
    if (kind === ADAPTER_KINDS.GRAPHQL) {
      return {
        ...base,
        endpoint: "https://api.ejemplo.local/graphql",
        query: "mutation Registrar($input: Input!) { registrar(input: $input) { id estado } }",
        variablesTemplate: "{}",
        responsePath: "data.registrar"
      };
    }
    if (kind === ADAPTER_KINDS.CONNECTOR) {
      return {
        ...base,
        connectorId: "erp_generico",
        operation: "registrarGasto",
        fields: {}
      };
    }
    return base;
  }
  function buildRestBody(integration, inputs) {
    if (integration.bodyTemplate?.trim()) {
      let raw = integration.bodyTemplate;
      for (const [k, v] of Object.entries(inputs)) {
        const token = `{{${k}}}`;
        raw = raw.split(token).join(typeof v === "number" ? String(v) : JSON.stringify(v ?? ""));
      }
      try {
        const tpl = JSON.parse(raw);
        return applyMappingToObject(tpl, inputs, integration.requestMappings);
      } catch {
        return { ...inputs };
      }
    }
    return applyMappingToObject({}, inputs, integration.requestMappings);
  }
  function applyMappingToObject(target, inputs, mappings) {
    const out = { ...target };
    for (const m of mappings ?? []) {
      const src = m.sourceKey ?? m.localKey;
      const tgt = m.targetKey ?? m.jsonPath ?? src;
      if (src && tgt) out[tgt] = inputs[src];
    }
    if ((mappings ?? []).length === 0) Object.assign(out, inputs);
    return out;
  }
  async function executeIntegration(node, inputs, options = {}) {
    const integration = node.integration ?? defaultIntegration();
    const mode = options.executionMode ?? integration.executionMode ?? "mock";
    const started = Date.now();
    const adapter = integration.adapter ?? ADAPTER_KINDS.SIMULATION;
    if (adapter === ADAPTER_KINDS.SIMULATION) {
      return {
        ok: true,
        durationMs: Date.now() - started,
        request: redactSecrets({ simulated: true, inputs }),
        response: { ok: true, message: `Simulado: ${node.name}` },
        mapped: { integrationStatus: "simulated" }
      };
    }
    if (adapter === ADAPTER_KINDS.REST_JSON) {
      const url = integration.urlTemplate ?? "";
      const method = (integration.method ?? "POST").toUpperCase();
      const body = buildRestBody(integration, inputs);
      const request = { method, url, headers: integration.headers ?? {}, body };
      if (mode === "live" && typeof fetch === "function" && !isFileProtocol()) {
        try {
          const res = await fetch(url, {
            method,
            headers: { ...integration.headers ?? {}, "Content-Type": "application/json" },
            body: method === "GET" ? void 0 : JSON.stringify(body)
          });
          const text = await res.text();
          let parsed;
          try {
            parsed = JSON.parse(text);
          } catch {
            parsed = { raw: text };
          }
          const mapped = mapResponse(integration, parsed);
          return {
            ok: res.ok,
            durationMs: Date.now() - started,
            request: redactSecrets(request),
            response: redactSecrets(parsed),
            mapped,
            httpStatus: res.status
          };
        } catch (err) {
          return {
            ok: false,
            durationMs: Date.now() - started,
            request: redactSecrets(request),
            response: { error: String(err?.message ?? err) },
            mapped: {}
          };
        }
      }
      const mockResponse2 = integration.mockResponse ?? {
        registroId: createId("reg"),
        estado: "OK",
        echo: body
      };
      return {
        ok: true,
        durationMs: Date.now() - started,
        request: redactSecrets(request),
        response: redactSecrets(mockResponse2),
        mapped: mapResponse(integration, mockResponse2),
        simulated: true
      };
    }
    const mockResponse = getSimulatedResponse(adapter, integration, inputs);
    return {
      ok: true,
      durationMs: Date.now() - started,
      request: redactSecrets({ adapter, inputs }),
      response: redactSecrets(mockResponse),
      mapped: mapResponse(integration, mockResponse),
      simulated: true
    };
  }
  function mapResponse(integration, response) {
    const mapped = {};
    for (const m of integration.responseMappings ?? []) {
      const path = m.jsonPath ?? m.responsePath ?? m.sourcePath;
      const target = m.contextKey ?? m.targetKey;
      if (!target) continue;
      if (path && typeof response === "object" && response !== null) {
        mapped[target] = getByPath(response, path.replace(/^\$\.?/, ""));
      } else if (m.sourceKey && response?.[m.sourceKey] !== void 0) {
        mapped[target] = response[m.sourceKey];
      }
    }
    if ((integration.responseMappings ?? []).length === 0 && typeof response === "object") {
      for (const [k, v] of Object.entries(response)) {
        if (typeof v !== "object") mapped[k] = v;
      }
    }
    return mapped;
  }
  function getByPath(obj, path) {
    const parts = path.split(".").filter(Boolean);
    let cur = obj;
    for (const p of parts) {
      if (cur == null) return void 0;
      cur = cur[p];
    }
    return cur;
  }
  function getSimulatedResponse(adapter, integration, inputs) {
    if (adapter === ADAPTER_KINDS.SOAP_XML) {
      return { envelopeId: createId("soap"), status: "OK", payload: inputs };
    }
    if (adapter === ADAPTER_KINDS.GRAPHQL) {
      return { data: { registrar: { id: createId("gql"), estado: "OK", input: inputs } } };
    }
    if (adapter === ADAPTER_KINDS.CONNECTOR) {
      return {
        connectorId: integration.connectorId ?? "erp",
        operation: integration.operation ?? "op",
        externalId: createId("ext"),
        status: "OK"
      };
    }
    return { status: "OK" };
  }
  function isFileProtocol() {
    return typeof window !== "undefined" && window.location?.protocol === "file:";
  }
  function validateNodeIntegration(node) {
    const errors = [];
    if (node.kind !== "automatica") return errors;
    const i = node.integration;
    if (!i || i.adapter === ADAPTER_KINDS.SIMULATION) return errors;
    if (i.adapter === ADAPTER_KINDS.REST_JSON && !i.urlTemplate?.trim()) {
      errors.push(`Service Task \xAB${node.name}\xBB: URL REST requerida.`);
    }
    return errors;
  }

  // js/validation.js
  var NODE_KINDS = {
    INICIO: "inicio",
    MANUAL: "manual",
    AUTOMATICA: "automatica",
    AGENTE_IA: "agente_ia",
    GATEWAY: "gateway",
    FIN: "fin"
  };
  var LINE_TYPES = {
    SEQUENCE: "sequence",
    MESSAGE: "message",
    ASSOCIATION: "association"
  };
  var GATEWAY_TYPES = {
    PARALLEL: "parallel",
    EXCLUSIVE: "exclusive",
    INCLUSIVE: "inclusive",
    EVENT_BASED: "eventBased",
    EVENT_BASED_EXCLUSIVE: "eventBasedExclusive",
    EVENT_BASED_PARALLEL: "eventBasedParallel",
    COMPLEX: "complex"
  };
  var DEFAULT_GATEWAY_TYPE = GATEWAY_TYPES.EXCLUSIVE;
  var GATEWAY_TYPE_CATALOG = [
    { id: GATEWAY_TYPES.PARALLEL, label: "Compuerta Paralela", enabled: false },
    { id: GATEWAY_TYPES.EXCLUSIVE, label: "Compuerta Exclusiva", enabled: true },
    { id: GATEWAY_TYPES.INCLUSIVE, label: "Compuerta Inclusiva", enabled: false },
    { id: GATEWAY_TYPES.EVENT_BASED, label: "Compuerta Basada en Eventos", enabled: false },
    { id: GATEWAY_TYPES.EVENT_BASED_EXCLUSIVE, label: "Compuerta Exclusiva Basada en Eventos", enabled: false },
    { id: GATEWAY_TYPES.EVENT_BASED_PARALLEL, label: "Compuerta Paralela Basada en Eventos", enabled: false },
    { id: GATEWAY_TYPES.COMPLEX, label: "Compuerta Compleja", enabled: false }
  ];
  function ensureGatewayNode(node) {
    if (node?.kind !== NODE_KINDS.GATEWAY) return;
    if (!node.gatewayType) node.gatewayType = DEFAULT_GATEWAY_TYPE;
  }
  function normalizeFlowNodes(flow) {
    if (!flow?.nodes) return;
    normalizeFlowContracts(flow);
    for (const node of flow.nodes) ensureGatewayNode(node);
  }
  function isSequenceTransition(t) {
    const lineType = t.lineType ?? LINE_TYPES.SEQUENCE;
    return lineType === LINE_TYPES.SEQUENCE;
  }
  function sequenceTransitions(flow) {
    return (flow.transitions ?? []).filter(isSequenceTransition);
  }
  function normalizeFlowTransitions(flow) {
    if (!flow?.transitions) return;
    for (const t of flow.transitions) {
      if (!t.lineType) t.lineType = LINE_TYPES.SEQUENCE;
      if (t.lineType !== LINE_TYPES.SEQUENCE) t.condition = null;
    }
  }
  function getStartNode(flow) {
    return flow.nodes.find((n) => n.kind === NODE_KINDS.INICIO) ?? null;
  }
  function reachableNodeIds(flow) {
    const start = getStartNode(flow);
    if (!start) return /* @__PURE__ */ new Set();
    const byFrom = /* @__PURE__ */ new Map();
    for (const t of sequenceTransitions(flow)) {
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
    return sequenceTransitions(flow).filter(
      (t) => t.fromId === nodeId && (condition === null || t.condition === condition)
    );
  }
  function transitionsTo(flow, nodeId) {
    return sequenceTransitions(flow).filter((t) => t.toId === nodeId);
  }
  function validateFlow(flow) {
    normalizeFlowNodes(flow);
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
        if (!isFlowEventInsidePool(flow, node)) {
          const laneName = flow.lanes?.find((l) => l.id === node.laneId)?.name ?? "pool";
          errors.push(`Start Event "${node.name}" debe estar dentro del pool (lane ${laneName}).`);
        }
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
      if (node.kind === NODE_KINDS.AGENTE_IA) {
        if (transitionsFrom(flow, node.id, "siempre").length === 0) {
          errors.push(`Agente IA "${node.name}" debe tener Sequence Flow de continuaci\xF3n.`);
        }
        if (!node.aiPrompt || !node.aiPrompt.trim()) {
          errors.push(`Agente IA "${node.name}" debe tener un prompt configurado.`);
        }
      }
      if (node.kind === NODE_KINDS.GATEWAY) {
        const gwType = node.gatewayType ?? DEFAULT_GATEWAY_TYPE;
        if (gwType !== GATEWAY_TYPES.EXCLUSIVE) {
          errors.push(
            `Gateway "${node.name}": tipo \xAB${gwType}\xBB no soportado en el mock (solo Compuerta Exclusiva).`
          );
        }
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
        if (!isFlowEventInsidePool(flow, node)) {
          const laneName = flow.lanes?.find((l) => l.id === node.laneId)?.name ?? "pool";
          errors.push(`End Event "${node.name}" debe estar dentro del pool (lane ${laneName}).`);
        }
        if (transitionsFrom(flow, node.id).length > 0) {
          errors.push(`End Event "${node.name}" no debe tener salidas.`);
        }
      }
    }
    errors.push(...validateFlowContracts(flow));
    for (const node of flow.nodes ?? []) {
      errors.push(...validateNodeIntegration(node));
    }
    return { isValid: errors.length === 0, errors };
  }
  function cloneFlowSnapshot(flow) {
    return JSON.parse(JSON.stringify(flow));
  }

  // js/storage.js
  var STORAGE_KEY = "gestor_flujos_prototipo_v3";
  var LEGACY_STORAGE_KEY = "gestor_flujos_prototipo_v2";
  var emptyState = () => ({
    flows: [],
    instances: []
  });
  function normalizeLoadedState(parsed) {
    const flows = Array.isArray(parsed.flows) ? parsed.flows : [];
    for (const flow of flows) {
      normalizeFlowTransitions(flow);
      normalizeFlowContracts(flow);
    }
    const instances = Array.isArray(parsed.instances) ? parsed.instances : [];
    for (const inst of instances) {
      if (!inst.context) inst.context = {};
      if (inst.flowSnapshot) {
        normalizeFlowTransitions(inst.flowSnapshot);
        normalizeFlowContracts(inst.flowSnapshot);
      }
    }
    return { flows, instances };
  }
  function loadState() {
    try {
      let raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacy) {
          raw = legacy;
          localStorage.setItem(STORAGE_KEY, legacy);
        }
      }
      if (!raw) return emptyState();
      return normalizeLoadedState(JSON.parse(raw));
    } catch {
      return emptyState();
    }
  }
  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
  var AI_CONFIG_KEY = "gestor_flujos_ai_config";
  function loadAiConfig() {
    try {
      const raw = localStorage.getItem(AI_CONFIG_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error("Error cargando config IA", e);
    }
    return { provider: "openai", apiKey: "", model: "gpt-4o" };
  }
  function saveAiConfig(config) {
    localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(config));
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
          usedParamIds: [pTitulo, pMonto],
          outputMappings: [{ id: createId("omap"), localKey: "motivoRevision", contextKey: "motivoRevision" }]
        },
        {
          id: nGateway,
          kind: "gateway",
          gatewayType: "exclusive",
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
          description: "Service Task REST (mock)",
          x: 580,
          y: 120,
          usedParamIds: [pTitulo, pMonto],
          inputMappings: [
            { id: createId("map"), source: "flow_input", paramId: pTitulo, localKey: "titulo" },
            { id: createId("map"), source: "flow_input", paramId: pMonto, localKey: "monto" },
            { id: createId("map"), source: "context", contextKey: "motivoRevision", localKey: "motivoRevision" }
          ],
          integration: {
            adapter: "rest_json",
            executionMode: "mock",
            method: "POST",
            urlTemplate: "https://api.ejemplo.local/registrar-gasto",
            headers: { "Content-Type": "application/json" },
            bodyTemplate: '{"titulo":"{{titulo}}","monto":{{monto}},"motivo":"{{motivoRevision}}"}',
            mockResponse: { registroId: "REG-001", estado: "OK" },
            responseMappings: [
              { contextKey: "registroId", jsonPath: "registroId" },
              { contextKey: "estadoRegistro", jsonPath: "estado" }
            ],
            onError: "fail_instance",
            credentialRef: "vault://erp/registrar"
          }
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
            { id: createId("blk"), type: "comentario", label: "Motivo de revisi\xF3n", outputKey: "motivoRevision", required: true }
          ]
        }
      }
    };
  }
  function ensureSeed(state) {
    if (state.flows.length > 0) return state;
    return { ...state, flows: [createSampleFlow()] };
  }

  // js/designer-viewport.js
  var DESIGNER_RECOMMENDED_WIDTH = 1024;
  var DESIGNER_RECOMMENDED_HEIGHT = 768;
  function isMobileDesignerContext() {
    if (typeof window === "undefined") return false;
    const narrowPhone = window.matchMedia("(max-width: 767px)").matches;
    const coarseTablet = window.matchMedia("(pointer: coarse)").matches && window.matchMedia("(max-width: 1023px)").matches;
    return narrowPhone || coarseTablet;
  }
  function isDesignerViewportTooSmall() {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 800 || window.innerHeight <= 600;
  }
  function isDesignerEditorBlocked() {
    return isMobileDesignerContext() || isDesignerViewportTooSmall();
  }
  function isTabletDesignerContext() {
    if (typeof window === "undefined") return false;
    if (isMobileDesignerContext()) return false;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const tabletWidth = window.innerWidth >= 768 && window.innerWidth <= 1023 && window.matchMedia("(min-width: 768px)").matches;
    return coarse || tabletWidth;
  }
  function getDesignerViewportTier() {
    if (isDesignerEditorBlocked()) return "blocked";
    const w = window.innerWidth;
    const h = window.innerHeight;
    const belowRecommended = w < DESIGNER_RECOMMENDED_WIDTH || h < DESIGNER_RECOMMENDED_HEIGHT;
    if (belowRecommended) return "critical";
    if (isTabletDesignerContext()) return "tabletWarn";
    return "ok";
  }
  function designerBlockedMessage() {
    if (isMobileDesignerContext()) {
      return {
        title: "Dise\xF1ador de flujo no disponible en este dispositivo",
        body: "Esto no se puede hacer en tu dispositivo. Para editar flujos necesit\xE1s una pantalla m\xE1s grande: us\xE1 una tablet en horizontal (1024\xD7768 o m\xE1s) o una computadora."
      };
    }
    return {
      title: "Pantalla demasiado peque\xF1a para dise\xF1ar",
      body: "El dise\xF1ador requiere una ventana mayor a 800\xD7600 p\xEDxeles. Ampli\xE1 la ventana del navegador o us\xE1 una tablet horizontal / computadora con al menos 1024\xD7768 recomendados."
    };
  }
  function designerCriticalMessage() {
    return "Gran problema: tu resoluci\xF3n es inferior a 1024\xD7768. Pod\xE9s intentar dise\xF1ar, pero la experiencia ser\xE1 muy limitada. Recomendamos un monitor m\xE1s grande o maximizar la ventana.";
  }
  function designerTabletWarnMessage() {
    return "Est\xE1s en tablet (o pantalla t\xE1ctil grande): pod\xE9s dise\xF1ar, pero es probable que tengas problemas de dise\xF1o y visualizaci\xF3n en el lienzo, los paneles y el zoom.";
  }
  function designerCatalogCalloutHtml() {
    const tier = getDesignerViewportTier();
    if (tier === "blocked") {
      const { body } = designerBlockedMessage();
      return `<div class="catalog-viewport-warning catalog-viewport-warning--blocked" role="alert">${body}</div>`;
    }
    if (tier === "critical") {
      return `<div class="catalog-viewport-warning catalog-viewport-warning--critical" role="status">${designerCriticalMessage()}</div>`;
    }
    if (tier === "tabletWarn") {
      return `<div class="catalog-viewport-warning catalog-viewport-warning--tablet" role="status">${designerTabletWarnMessage()}</div>`;
    }
    return "";
  }
  function renderDesignerViewportBannerHtml() {
    const tier = getDesignerViewportTier();
    if (tier === "critical") {
      return `<div class="designer-viewport-banner designer-viewport-banner--critical" role="alert">${designerCriticalMessage()}</div>`;
    }
    if (tier === "tabletWarn") {
      return `<div class="designer-viewport-banner designer-viewport-banner--tablet" role="status">${designerTabletWarnMessage()}</div>`;
    }
    return "";
  }

  // js/ui.js
  function toast(message, durationMs = 3200, variant = "default") {
    const root = document.getElementById("toast-root");
    const el = document.createElement("div");
    el.className = `toast${variant === "success" ? " toast--success" : ""}${variant === "error" ? " toast--error" : ""}`;
    el.textContent = message;
    root.appendChild(el);
    setTimeout(() => el.remove(), durationMs);
  }
  function renderPageHeader(title, description = "", actionsHtml = "") {
    return `<header class="page-header">
    <div class="page-header__text">
      <h2>${title}</h2>
      ${description ? `<p>${description}</p>` : ""}
    </div>
    ${actionsHtml ? `<div class="page-header__actions">${actionsHtml}</div>` : ""}
  </header>`;
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

  // js/designer-studio.js
  var SCREEN_COMPONENTS = [
    { type: "titulo", label: "T\xEDtulo" },
    { type: "texto", label: "Texto" },
    { type: "dato", label: "Dato entrada (lectura)" },
    { type: "campo_texto", label: "Campo texto" },
    { type: "campo_numero", label: "Campo n\xFAmero" },
    { type: "campo_fecha", label: "Campo fecha" },
    { type: "campo_si_no", label: "S\xED / No" },
    { type: "campo_texto_largo", label: "Texto largo" },
    { type: "comentario", label: "Comentario" },
    { type: "separador", label: "Separador" }
  ];
  function renderStudioToolbar(flowName, node, studioMode) {
    const isManual = node?.kind === NODE_KINDS.MANUAL;
    const isAuto = node?.kind === NODE_KINDS.AUTOMATICA;
    const isAgenteIA = node?.kind === NODE_KINDS.AGENTE_IA;
    const tab = (mode, label, enabled) => `<button type="button" class="btn btn-sm studio-tab ${studioMode === mode ? "is-toggle-active" : ""}" data-studio-mode="${mode}" role="tab" ${enabled ? "" : "disabled"}>${label}</button>`;
    const kindBadge = isManual ? `<span class="node-kind-badge">User Task</span>` : isAuto ? `<span class="node-kind-badge node-kind-badge--auto">Service Task</span>` : isAgenteIA ? `<span class="node-kind-badge node-kind-badge--ai">Agente IA</span>` : "";
    return `<div class="designer-studio-bar" role="tablist" aria-label="Modo de dise\xF1o">
    <div class="segmented-control">
    ${tab("path", "Camino", true)}
    ${tab("screen", "Pantalla", isManual)}
    ${tab("automation", "Automatizaci\xF3n", isAuto)}
    ${tab("agente_ia", "Agente IA", isAgenteIA)}
    </div>
    <span class="designer-studio-meta">${escapeHtml(flowName)} \xB7 ${escapeHtml(node?.name ?? "\u2014")}${kindBadge}</span>
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
  function renderScreenPreviewHtml(flow, screen) {
    let html = "";
    for (const b of screen?.blocks ?? []) {
      if (b.type === "titulo") html += `<h3>${escapeHtml(b.text || "T\xEDtulo")}</h3>`;
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
        html += `<div class="preview-field"><div class="preview-label">${escapeHtml(b.label ?? name)}</div><select name="${escapeHtml(name)}"><option value="">\u2014</option><option value="si">S\xED</option><option value="no">No</option></select></div>`;
      }
    }
    html += `<div class="preview-actions"><button type="button" class="btn btn-success" disabled>Aceptar</button><button type="button" class="btn btn-danger" disabled>Rechazar</button></div>`;
    return html;
  }
  function renderScreenStudio(flow, node) {
    normalizeFlowContracts(flow);
    if (!flow.screens[node.id]) flow.screens[node.id] = { blocks: [] };
    const screen = flow.screens[node.id];
    const blocksHtml = screen.blocks.map(
      (b, i) => `<div class="studio-block-row"><span class="studio-block-handle" aria-hidden="true"></span><span>${escapeHtml(blockLabel(flow, b))}</span>
    <span class="studio-block-actions"><button type="button" class="btn btn-sm" data-block-up="${i}" aria-label="Subir">\u2191</button>
    <button type="button" class="btn btn-sm" data-block-down="${i}" aria-label="Bajar">\u2193</button>
    <button type="button" class="btn btn-sm btn-danger" data-block-rm="${i}" aria-label="Eliminar">\xD7</button></span></div>`
    ).join("") || "<p class='empty-state gestion-empty'>Agreg\xE1 componentes desde la izquierda.</p>";
    const components = SCREEN_COMPONENTS.map(
      (c) => `<button type="button" class="studio-component-tile" data-add-block="${c.type}">${escapeHtml(c.label)}</button>`
    ).join("");
    const outKeys = collectScreenOutputKeys(screen);
    const outTable = outKeys.length === 0 ? `<p class="form-hint">Sin claves de salida a\xFAn.</p>` : `<table class="studio-map-table"><thead><tr><th>context</th></tr></thead><tbody>${outKeys.map((k) => `<tr><td><code>${escapeHtml(k)}</code></td></tr>`).join("")}</tbody></table>`;
    return `<div class="designer-studio workspace-screen">
    <aside class="studio-panel"><h3 class="panel-title">Componentes</h3><div class="studio-component-grid">${components}</div></aside>
    <main class="studio-panel"><h3 class="panel-title">Estructura</h3><div id="studio-blocks-list">${blocksHtml}</div>
    <div class="screen-preview-frame"><p class="preview-caption">Como en Gesti\xF3n</p><div class="screen-preview" id="studio-screen-preview">${renderScreenPreviewHtml(flow, screen)}</div></div></main>
    <aside class="studio-panel"><h3 class="panel-title">Salidas</h3><p class="form-hint">Valores en <code>context</code> de la instancia.</p>${outTable}</aside>
  </div>`;
  }
  function renderAutomationStudio(flow, node) {
    normalizeFlowContracts(flow);
    if (!node.integration) node.integration = defaultIntegration(ADAPTER_KINDS.REST_JSON);
    const i = node.integration;
    const adapterOptions = ADAPTER_CATALOG.map(
      (a) => `<option value="${a.id}" ${i.adapter === a.id ? "selected" : ""}>${escapeHtml(a.label)}</option>`
    ).join("");
    let adapterFields = `<p class="props-intro">Simulaci\xF3n sin API externa.</p>`;
    if (i.adapter === ADAPTER_KINDS.REST_JSON) {
      adapterFields = `<div class="form-row"><label>M\xE9todo</label><select name="method"><option ${i.method === "GET" ? "selected" : ""}>GET</option><option ${i.method === "POST" ? "selected" : ""}>POST</option></select></div>
    <div class="form-row"><label>URL</label><input name="urlTemplate" value="${escapeHtml(i.urlTemplate ?? "")}" /></div>
    <div class="form-row"><label>Body JSON</label><textarea name="bodyTemplate" rows="4">${escapeHtml(i.bodyTemplate ?? "{}")}</textarea></div>`;
    } else if (i.adapter === ADAPTER_KINDS.SOAP_XML) {
      adapterFields = `<div class="form-row"><label>Endpoint</label><input name="endpoint" value="${escapeHtml(i.endpoint ?? "")}" /></div><p class="props-intro">SOAP simulado en v1.</p>`;
    } else if (i.adapter === ADAPTER_KINDS.GRAPHQL) {
      adapterFields = `<div class="form-row"><label>Endpoint</label><input name="endpoint" value="${escapeHtml(i.endpoint ?? "")}" /></div><p class="props-intro">GraphQL simulado en v1.</p>`;
    } else if (i.adapter === ADAPTER_KINDS.CONNECTOR) {
      adapterFields = `<div class="form-row"><label>Conector</label><input name="connectorId" value="${escapeHtml(i.connectorId ?? "erp_generico")}" /></div>
    <div class="form-row"><label>Operaci\xF3n</label><input name="operation" value="${escapeHtml(i.operation ?? "")}" /></div>`;
    }
    const resp = (i.responseMappings ?? []).map(
      (m, idx) => `<div class="form-row"><input data-resp-ctx="${idx}" value="${escapeHtml(m.contextKey ?? "")}" placeholder="context key" /><input data-resp-path="${idx}" value="${escapeHtml(m.jsonPath ?? "")}" placeholder="json path" /></div>`
    ).join("");
    const modeBadge = i.executionMode === "live" ? `<span class="badge-mock">LIVE</span>` : `<span class="badge-mock">MOCK</span>`;
    const simNote = i.adapter !== ADAPTER_KINDS.REST_JSON || i.executionMode !== "live" ? `<span class="badge-mock">SIM</span>` : "";
    return `<div class="designer-studio workspace-automation">
    <aside class="studio-panel"><h3 class="panel-title">Adaptador</h3>
    <div class="form-row"><label>Tipo</label><select id="integration-adapter">${adapterOptions}</select></div>
    <div class="form-row"><label>Modo</label><select id="integration-exec-mode"><option value="mock">Mock</option><option value="live" ${i.executionMode === "live" ? "selected" : ""}>Live REST</option></select></div>
    <div class="form-row"><label>credentialRef</label><input id="integration-cred-ref" value="${escapeHtml(i.credentialRef ?? "")}" placeholder="vault://\u2026" /><p class="form-hint">Referencia only; sin secretos en el navegador.</p></div></aside>
    <main class="studio-panel"><div class="studio-section" style="margin-top:0;padding-top:0;border-top:none"><h3 class="studio-section-title">Request</h3><form id="form-integration" class="form-grid">${adapterFields}</form></div>
    <div class="studio-section"><h3 class="studio-section-title">Respuesta \u2192 contexto</h3><div id="response-mappings">${resp}</div>
    <button type="button" class="btn btn-sm" id="btn-add-resp-map">+ mapping</button></div>
    <div class="studio-section">
    <button type="button" class="btn btn-primary" id="btn-test-integration">Probar contrato</button>${modeBadge}${simNote}
    <pre class="integration-test-output" id="integration-test-output"></pre></div></main></div>`;
  }
  function bindScreenStudio(mainEl, flow, node, persist, rerender) {
    const screen = flow.screens[node.id];
    mainEl.querySelectorAll("[data-add-block]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const type = btn.dataset.addBlock;
        const block = { id: createId("blk"), type };
        if (type === "titulo") block.text = "T\xEDtulo";
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
  function bindAutomationStudio(mainEl, flow, node, persist, rerender) {
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
  function renderAgenteIAStudio(flow, node) {
    const prompt2 = node.aiPrompt || "";
    const hitlEmail = node.hitlEmail || "";
    const hitlType = node.hitlType || "approval";
    const hitlInterval = node.hitlInterval || "5";
    return `
    <div class="studio-layout">
      <aside class="studio-sidebar">
        <h3>Configuraci\xF3n del Agente IA</h3>
        <p class="props-intro">Define el prompt y la interacci\xF3n humana (HITL).</p>
      </aside>
      <main class="studio-main">
        <div class="studio-section">
          <h4>Prompt del Agente</h4>
          <textarea id="ai-prompt" style="width:100%;height:150px;font-family:monospace" placeholder="Ej: Analiza el reclamo y decide si aplica reembolso...">${escapeHtml(prompt2)}</textarea>
        </div>
        <div class="studio-section">
          <h4>Human-in-the-loop (HITL)</h4>
          <div class="form-grid">
            <div class="form-row">
              <label>Correo responsable</label>
              <input type="email" id="hitl-email" value="${escapeHtml(hitlEmail)}" placeholder="operador@empresa.com" />
            </div>
            <div class="form-row">
              <label>Tipo de interacci\xF3n</label>
              <select id="hitl-type">
                <option value="approval" ${hitlType === "approval" ? "selected" : ""}>Aprobaci\xF3n (S\xED/No)</option>
                <option value="input" ${hitlType === "input" ? "selected" : ""}>Entrada de datos (Texto)</option>
              </select>
            </div>
            <div class="form-row">
              <label>Recordatorio (Horas)</label>
              <input type="number" id="hitl-interval" value="${escapeHtml(hitlInterval)}" min="1" max="72" />
            </div>
          </div>
        </div>
      </main>
    </div>
  `;
  }
  function bindAgenteIAStudio(mainEl, flow, node, persist, rerender) {
    const promptEl = mainEl.querySelector("#ai-prompt");
    const emailEl = mainEl.querySelector("#hitl-email");
    const typeEl = mainEl.querySelector("#hitl-type");
    const intervalEl = mainEl.querySelector("#hitl-interval");
    const save = () => {
      node.aiPrompt = promptEl?.value || "";
      node.hitlEmail = emailEl?.value || "";
      node.hitlType = typeEl?.value || "approval";
      node.hitlInterval = intervalEl?.value || "5";
      persist();
    };
    promptEl?.addEventListener("input", save);
    emailEl?.addEventListener("input", save);
    typeEl?.addEventListener("change", save);
    intervalEl?.addEventListener("input", save);
  }

  // js/designer.js
  var TOOL_TO_LINE = {
    sequenceFlow: LINE_TYPES.SEQUENCE,
    messageFlow: LINE_TYPES.MESSAGE,
    association: LINE_TYPES.ASSOCIATION
  };
  var designerContext = {
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
    studioMode: "path"
  };
  var activeLinkDrag = null;
  var activeCanvasViewport = null;
  var activeDesignerSideBind = null;
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
    if (isDesignerEditorBlocked()) {
      mainEl.innerHTML = renderDesignerViewportBlocked();
      bindDesignerViewportBlocked(mainEl, state, persist);
      return;
    }
    normalizeFlowNodes(flow);
    normalizeFlowContracts(flow);
    const selected = flow.nodes.find((n) => n.id === designerContext.selectedNodeId);
    const validation = validateFlow(flow);
    if (designerContext.studioMode === "screen" && selected?.kind === NODE_KINDS.MANUAL) {
      mainEl.innerHTML = renderStudioShell(flow, selected, validation, "screen");
      bindStudioShell(mainEl, flow, selected, state, persist);
      bindScreenStudio(mainEl, flow, selected, persist, () => renderDesigner(mainEl, state, persist));
      return;
    }
    if (designerContext.studioMode === "automation" && selected?.kind === NODE_KINDS.AUTOMATICA) {
      mainEl.innerHTML = renderStudioShell(flow, selected, validation, "automation");
      bindStudioShell(mainEl, flow, selected, state, persist);
      bindAutomationStudio(mainEl, flow, selected, persist, () => renderDesigner(mainEl, state, persist));
      return;
    }
    if (designerContext.studioMode === "agente_ia" && selected?.kind === NODE_KINDS.AGENTE_IA) {
      mainEl.innerHTML = renderStudioShell(flow, selected, validation, "agente_ia");
      bindStudioShell(mainEl, flow, selected, state, persist);
      bindAgenteIAStudio(mainEl, flow, selected, persist, () => renderDesigner(mainEl, state, persist));
      return;
    }
    designerContext.studioMode = "path";
    mainEl.innerHTML = renderFlowEditor(flow);
    bindFlowEditor(mainEl, flow, state, persist);
  }
  function renderStudioShell(flow, node, validation, mode) {
    return `
    ${renderDesignerViewportBannerHtml()}
    <div class="toolbar">
      <button type="button" class="btn" id="btn-back-catalog">\u2190 Cat\xE1logo</button>
      <span style="flex:1;font-weight:600">Estudio \xB7 ${escapeHtml(flow.name)}</span>
      <button type="button" class="btn" id="btn-flow-meta">Metadatos</button>
    </div>
    ${validation.isValid ? "" : `<ul class="validation-list">${validation.errors.map((e) => `<li>${escapeHtml(e)}</li>`).join("")}</ul>`}
    ${renderStudioToolbar(flow.name, node, mode)}
    <div class="designer-studio-root">${mode === "screen" ? renderScreenStudio(flow, node) : mode === "agente_ia" ? renderAgenteIAStudio(flow, node) : renderAutomationStudio(flow, node)}</div>`;
  }
  function bindStudioShell(mainEl, flow, node, state, persist) {
    bindStudioTabs(mainEl, state, persist);
    mainEl.querySelector("#btn-back-catalog")?.addEventListener("click", () => {
      designerContext.selectedFlowId = null;
      designerContext.selectedNodeId = null;
      designerContext.studioMode = "path";
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
      root.querySelector("#form-meta")?.addEventListener("submit", (e) => {
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
  }
  function bindStudioTabs(mainEl, state, persist) {
    mainEl.querySelectorAll("[data-studio-mode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.disabled) return;
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
      <p class="designer-viewport-blocked-meta">Viewport actual: ${typeof window !== "undefined" ? `${window.innerWidth}\xD7${window.innerHeight}` : "\u2014"} px</p>
      <div class="toolbar" style="margin-top:1rem">
        <button type="button" class="btn btn-primary" id="btn-viewport-back-catalog">Volver al cat\xE1logo</button>
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
  function renderCatalog(state) {
    const editorBlocked = isDesignerEditorBlocked();
    const catalogCallout = designerCatalogCalloutHtml();
    const rows = state.flows.map(
      (f) => `
    <tr>
      <td>${escapeHtml(f.name)}</td>
      <td>${escapeHtml(f.type)}</td>
      <td>${escapeHtml(f.description || "\u2014")}</td>
      <td><span class="badge badge-${f.status === "listo" ? "listo" : "borrador"}">${f.status === "listo" ? "Listo" : "Borrador"}</span></td>
      <td class="catalog-actions">
        <button type="button" class="btn btn-sm" data-open-flow="${f.id}" ${editorBlocked ? 'disabled aria-disabled="true"' : ""}>Abrir</button>
        ${f.status === "listo" ? "" : `<button type="button" class="btn btn-sm btn-danger" data-delete-flow="${f.id}" aria-label="Eliminar flujo ${escapeHtml(f.name)}">Eliminar</button>`}
      </td>
    </tr>`
    ).join("");
    const emptyBody = rows === "" ? `<div class="empty-state empty-state--rich">
          <svg class="empty-state__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4zM8 10h8M8 14h5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>
          <strong>Sin flujos todav\xEDa</strong>
          <p>Cre\xE1 tu primer flujo BPMN y marc\xE1lo como listo para instanciarlo en Gesti\xF3n.</p>
          <button type="button" class="btn btn-primary" id="btn-new-flow-empty" ${editorBlocked ? "disabled" : ""}>Nuevo flujo</button>
        </div>` : "";
    return `
    <section class="panel panel--catalog">
      ${renderPageHeader(
      "Cat\xE1logo de flujos",
      "Cre\xE1 y edit\xE1 flujos. Cuando pasen la validaci\xF3n, marcalos como listos para Gesti\xF3n de actividades.",
      `<button type="button" class="btn btn-primary" id="btn-new-flow" ${editorBlocked ? 'disabled aria-disabled="true"' : ""}>Nuevo flujo</button>`
    )}
      ${catalogCallout}
      ${emptyBody}
      ${rows ? `<div class="table-wrap table-wrap--modern">
        <table class="table-modern">
          <thead>
            <tr><th>Nombre</th><th>Tipo</th><th>Descripci\xF3n</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>` : ""}
    </section>`;
  }
  function openNewFlowModal(mainEl, state, persist) {
    if (isDesignerEditorBlocked()) {
      toast(designerBlockedMessage().body);
      return;
    }
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
      if (isDesignerEditorBlocked()) {
        toast(designerBlockedMessage().body);
        return;
      }
      const fd = new FormData(e.target);
      const startId = createId("node");
      const endId = createId("node");
      const flow = {
        id: createId("flow"),
        type: String(fd.get("type")).trim(),
        name: String(fd.get("name")).trim(),
        description: String(fd.get("description")).trim(),
        status: "borrador",
        version: 1,
        inputParams: [],
        nodes: [
          {
            id: startId,
            kind: NODE_KINDS.INICIO,
            name: "Start",
            description: "",
            x: 80,
            y: 220,
            usedParamIds: []
          },
          {
            id: endId,
            kind: NODE_KINDS.FIN,
            name: "End",
            description: "",
            x: 520,
            y: 220,
            usedParamIds: []
          }
        ],
        transitions: [],
        screens: {},
        lanes: [{ id: createId("lane"), name: "General", height: 220 }]
      };
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
      state.flows.push(flow);
      persist();
      designerContext.selectedFlowId = flow.id;
      designerContext.selectedNodeId = startId;
      designerContext._viewFitForFlowId = null;
      close();
      renderDesigner(mainEl, state, persist);
      toast("Flujo creado con Start y End. Eleg\xED un tipo de l\xEDnea y conect\xE1 desde el puerto del nodo.", 3200, "success");
    });
  }
  function bindCatalog(mainEl, state, persist) {
    const onNew = () => openNewFlowModal(mainEl, state, persist);
    mainEl.querySelector("#btn-new-flow")?.addEventListener("click", onNew);
    mainEl.querySelector("#btn-new-flow-empty")?.addEventListener("click", onNew);
    mainEl.querySelectorAll("[data-open-flow]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.disabled || isDesignerEditorBlocked()) {
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
  }
  function attemptDeleteFlow(mainEl, state, persist, flowId) {
    const flow = state.flows.find((f) => f.id === flowId);
    if (!flow) return;
    if (flow.status === "listo") {
      toast("Solo pod\xE9s eliminar flujos en borrador.");
      return;
    }
    const activeForFlow = state.instances.some(
      (i) => i.flowId === flowId && i.status === "en_curso"
    );
    if (activeForFlow) {
      toast("Hay instancias en curso de este flujo; completalas antes de eliminar.");
      return;
    }
    const ok = confirm(`\xBFEliminar el flujo "${flow.name}"? Esta acci\xF3n no se puede deshacer.`);
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
          <button type="button" class="palette-chevron" id="palette-task-menu-btn" aria-expanded="false" aria-label="Tipos de task">\u25BE</button>
        </div>
        <div class="palette-submenu" id="palette-task-submenu" hidden>
          <div class="palette-row palette-item palette-manual" draggable="true" data-palette="manual">
            <span class="palette-kind-icon" aria-hidden="true">\u{1F464}</span>
            <span>User Task</span>
          </div>
          <div class="palette-row palette-item palette-auto" draggable="true" data-palette="automatica">
            <span class="palette-kind-icon" aria-hidden="true">\u2699</span>
            <span>Service Task</span>
          </div>
          <div class="palette-row palette-item palette-agente-ia" draggable="true" data-palette="agente_ia">
            <span class="palette-kind-icon" aria-hidden="true">\u2728</span>
            <span>Agente IA</span>
          </div>
        </div>
        <div class="palette-row palette-item palette-gateway palette-gateway-toggle">
          ${renderGatewayTypeIcon(GATEWAY_TYPES.EXCLUSIVE)}
          <span>Gateway</span>
          <button type="button" class="palette-chevron" id="palette-gateway-menu-btn" aria-expanded="false" aria-label="Tipos de compuerta">\u25BE</button>
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
          <button type="button" class="btn btn-sm designer-panel-close" data-designer-close="props" aria-label="Cerrar propiedades">\xD7</button>
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
      <div class="toolbar-group">
        <button type="button" class="btn btn-ghost" id="btn-back-catalog">\u2190 Cat\xE1logo</button>
      </div>
      <span class="toolbar-divider" aria-hidden="true"></span>
      <span class="toolbar-flow-title">${escapeHtml(flow.name)} <span class="badge badge-${flow.status === "listo" ? "listo" : "borrador"}">${flow.status === "listo" ? "Listo" : "Borrador"}</span></span>
      <span class="toolbar-divider" aria-hidden="true"></span>
      <div class="toolbar-group">
        <button type="button" class="btn btn-sm" id="btn-flow-meta">Metadatos</button>
        <button type="button" class="btn btn-sm btn-success" id="btn-mark-ready" ${validation.isValid ? "" : "disabled"}>Marcar listo</button>
        <button type="button" class="btn btn-sm" id="btn-mark-draft">Borrador</button>
        ${flow.status === "listo" ? "" : `<button type="button" class="btn btn-sm btn-danger" id="btn-delete-flow">Eliminar</button>`}
      </div>
      <span class="toolbar-divider" aria-hidden="true"></span>
      <div class="toolbar-group">
        <button type="button" class="btn btn-sm" id="btn-toggle-copilot">\u2728 Copilot</button>
      </div>
    </div>
    ${validation.isValid ? "" : `<ul class="validation-list">${validation.errors.map((e) => `<li>${escapeHtml(e)}</li>`).join("")}</ul>`}
    <div class="${designerSplitClassNames()}" id="designer-split">
      <aside class="panel palette designer-side-panel" id="designer-palette-panel">
        <div class="designer-panel-head">
          <h3 class="panel-title">Elementos BPMN</h3>
          <button type="button" class="btn btn-sm designer-panel-close" data-designer-close="palette" aria-label="Cerrar elementos">\xD7</button>
        </div>
        <div class="palette-panel-scroll">
          ${renderUiCollapse("palette-activities", "Eventos y actividades", renderPaletteActivitiesBody(), false, "palette-section-collapse")}
          ${renderUiCollapse("palette-lines", "L\xEDneas", renderPaletteLinesBody(), false, "palette-section-collapse")}
          <p class="palette-hint">Expand\xED cada secci\xF3n para ver elementos. Context pad: Task \u25BE y Gateway \u25BE.</p>
        </div>
      </aside>
      <div class="canvas-wrap" id="canvas-wrap">
        <div class="canvas-view-toolbar" role="toolbar" aria-label="Vista del lienzo">
          <div class="designer-panel-toggles" role="group" aria-label="Paneles del dise\xF1ador">
            <button type="button" class="btn btn-sm ${designerContext.mobilePaletteOpen ? "is-toggle-active" : ""}" id="btn-mobile-palette">Elementos</button>
            <button type="button" class="btn btn-sm ${designerContext.mobilePropsOpen ? "is-toggle-active" : ""}" id="btn-mobile-props">Propiedades</button>
          </div>
          <button type="button" class="btn btn-sm" id="btn-zoom-out" title="Alejar">Zoom \u2212</button>
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
          <h3 class="panel-title">\u2728 Copilot (Mock)</h3>
          <button type="button" class="btn btn-sm designer-panel-close" data-designer-close="copilot" aria-label="Cerrar Copilot">\xD7</button>
        </div>
        <div class="copilot-chat" id="copilot-chat">
          <div class="copilot-message copilot-message--ai">
            \xA1Hola! Soy tu asistente de dise\xF1o. \xBFQu\xE9 flujo quer\xE9s armar o modificar?
          </div>
        </div>
        <form id="form-copilot" class="copilot-input-area">
          <input name="prompt" placeholder="Ej: Agreg\xE1 un paso de revisi\xF3n..." autocomplete="off" />
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
  function lineTypeLabel(lineType) {
    if (lineType === LINE_TYPES.MESSAGE) return "Message";
    if (lineType === LINE_TYPES.ASSOCIATION) return "Association";
    return "Sequence";
  }
  var PAD_GAP = 80;
  var CONTEXT_PAD_RESERVE = 118;
  function contextPadLabel(text) {
    return `<span class="context-pad-label">${escapeHtml(text)}</span>`;
  }
  function renderGenericTaskIcon() {
    return `<span class="palette-shape-icon icon-task" aria-hidden="true"></span>`;
  }
  function renderTaskKindGlyph(kind) {
    const glyph = kind === NODE_KINDS.AUTOMATICA ? "\u2699" : "\u{1F464}";
    return `<span class="context-pad-kind-icon" aria-hidden="true">${glyph}</span>`;
  }
  function gatewayMarkClass(gatewayTypeId) {
    const marks = {
      [GATEWAY_TYPES.PARALLEL]: "gateway-mark-parallel",
      [GATEWAY_TYPES.EXCLUSIVE]: "gateway-mark-exclusive",
      [GATEWAY_TYPES.INCLUSIVE]: "gateway-mark-inclusive",
      [GATEWAY_TYPES.EVENT_BASED]: "gateway-mark-event",
      [GATEWAY_TYPES.EVENT_BASED_EXCLUSIVE]: "gateway-mark-event-exclusive",
      [GATEWAY_TYPES.EVENT_BASED_PARALLEL]: "gateway-mark-event-parallel",
      [GATEWAY_TYPES.COMPLEX]: "gateway-mark-complex"
    };
    return marks[gatewayTypeId] ?? "gateway-mark-exclusive";
  }
  function renderGatewayTypeIcon(gatewayTypeId) {
    const mark = gatewayMarkClass(gatewayTypeId);
    return `<span class="icon-gateway-diamond" aria-hidden="true"><span class="gateway-mark ${mark}"></span></span>`;
  }
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
    const rows = GATEWAY_TYPE_CATALOG.map(
      (entry) => `
    <label class="gateway-type-option ${entry.enabled ? "" : "gateway-type-option-future"}">
      <input type="radio" name="gatewayType" value="${entry.id}" ${entry.id === current ? "checked" : ""} ${entry.enabled ? "" : "disabled"} />
      ${renderGatewayTypeIcon(entry.id)}
      <span>${escapeHtml(entry.label)}</span>
      ${entry.enabled ? "" : `<span class="future-badge">Futuro</span>`}
    </label>`
    ).join("");
    return `
    <p class="props-intro">Solo la <strong>Compuerta Exclusiva</strong> est\xE1 disponible en el mock. Las dem\xE1s se habilitar\xE1n en versiones futuras.</p>
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
  function getLaneLayout(flow) {
    ensureFlowDiagram(flow);
    const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1280;
    return computeLaneLayout(flow, { viewportWidth });
  }
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
  function renderFlowPoolMarkup(flow) {
    const layout = getLaneLayout(flow);
    const lanesHtml = layout.lanes.map(
      (lane) => `
    <div class="flow-lane" data-lane-id="${lane.id}" style="height:${lane.height}px">
      <div class="flow-lane-title" title="Rol, grupo o perfil">${escapeHtml(lane.name)}</div>
      <div class="flow-lane-content" aria-hidden="true"></div>
    </div>`
    ).join("");
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
      y: (clientY - rect.top - panY) / zoom
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
      3
    );
    designerContext.view.zoom = Math.max(0.25, zoom);
    const scaledW = contentW * designerContext.view.zoom;
    const scaledH = contentH * designerContext.view.zoom;
    designerContext.view.panX = (vr.width - scaledW) / 2 - (minX - pad) * designerContext.view.zoom;
    designerContext.view.panY = (vr.height - scaledH) / 2 - (minY - pad) * designerContext.view.zoom;
    applyCanvasViewTransform(mainEl);
  }
  function renderFlowDiagramProps(flow) {
    ensureFlowDiagram(flow);
    const lanesHtml = flow.lanes.map(
      (lane) => `
    <div class="lane-editor-row" data-lane-row="${lane.id}">
      <input type="text" class="lane-name-input" data-lane-id="${lane.id}" value="${escapeHtml(lane.name)}" placeholder="Rol, grupo o perfil" aria-label="Nombre de lane" />
      ${flow.lanes.length > 1 ? `<button type="button" class="btn btn-sm btn-danger" data-remove-lane="${lane.id}" aria-label="Quitar lane">\xD7</button>` : ""}
    </div>`
    ).join("");
    const body = `
    <p class="props-intro">El <strong>pool</strong> muestra el nombre del flujo. Cada <strong>lane</strong> representa un rol, grupo o perfil.</p>
    <div class="form-row"><label>Pool (nombre del flujo)</label><input id="flow-pool-name" value="${escapeHtml(flow.name)}" readonly title="Edit\xE1 el nombre en Metadatos" /></div>
    <h4 class="props-subtitle">Lanes</h4>
    ${lanesHtml}
    <button type="button" class="btn btn-sm" id="btn-add-lane" style="margin-top:0.5rem">+ Agregar lane</button>`;
    return `<div class="flow-diagram-props">${renderPropsCollapse("pool-lanes", "Pool y lanes", body, false)}</div>`;
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
      title
    });
    switch (node.kind) {
      case NODE_KINDS.INICIO:
        return [
          taskMenu("siempre"),
          gatewayMenu("siempre"),
          append(NODE_KINDS.FIN, "siempre", "icon-end", "End Event")
        ];
      case NODE_KINDS.MANUAL:
        return [
          gatewayMenu("siempre"),
          taskMenu("siempre"),
          append(NODE_KINDS.FIN, "siempre", "icon-end", "End Event")
        ];
      case NODE_KINDS.AUTOMATICA:
        return [
          taskMenu("siempre"),
          gatewayMenu("siempre"),
          append(NODE_KINDS.FIN, "siempre", "icon-end", "End Event")
        ];
      case NODE_KINDS.GATEWAY:
        return [
          taskMenu("aceptar"),
          append(NODE_KINDS.FIN, "aceptar", "icon-end", "End Event"),
          taskMenu("rechazar"),
          append(NODE_KINDS.FIN, "rechazar", "icon-end", "End Event")
        ];
      default:
        return [];
    }
  }
  function renderContextPadTaskMenuBlock(node, condition) {
    const menuKey = contextPadTaskMenuKey(node.id, condition);
    const isOpen = designerContext.contextPadOpenTaskMenu === menuKey;
    const branchBadge = condition !== "siempre" ? `<span class="context-pad-branch">${condition === "aceptar" ? "A" : "R"}</span>` : "";
    const branchTitle = condition !== "siempre" ? ` (${condition})` : "";
    return `
    <div class="context-pad-task-block" data-task-menu-block="${menuKey}">
      <div class="context-pad-task-row">
        <button type="button" class="context-pad-btn context-pad-task-main" data-context-task-append data-append-condition="${condition}" title="User Task${branchTitle} (clic r\xE1pido)">
          ${renderGenericTaskIcon()}
          ${contextPadLabel("Task")}
          ${branchBadge}
        </button>
        <button type="button" class="context-pad-chevron" data-context-task-toggle data-task-menu-key="${menuKey}" aria-expanded="${isOpen ? "true" : "false"}" aria-label="Elegir User Task o Service Task">\u25BE</button>
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
    const branchBadge = condition !== "siempre" ? `<span class="context-pad-branch">${condition === "aceptar" ? "A" : "R"}</span>` : "";
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
        <button type="button" class="context-pad-btn context-pad-submenu-btn context-pad-btn-future" data-gateway-future="${entry.id}" disabled title="Pr\xF3ximamente: ${escapeHtml(entry.label)}">
          ${renderGatewayTypeIcon(entry.id)}
          ${contextPadLabel(entry.label.replace(/^Compuerta /, ""))}
          <span class="future-badge">Futuro</span>
        </button>`;
    }).join("");
    return `
    <div class="context-pad-gateway-block" data-gateway-menu-block="${menuKey}">
      <div class="context-pad-task-row">
        <button type="button" class="context-pad-btn context-pad-gateway-main" data-context-gateway-append data-append-condition="${condition}" data-gateway-type="${GATEWAY_TYPES.EXCLUSIVE}" title="Compuerta Exclusiva${branchTitle} (clic r\xE1pido)">
          ${renderGatewayTypeIcon(GATEWAY_TYPES.EXCLUSIVE)}
          ${contextPadLabel("Gateway")}
          ${branchBadge}
        </button>
        <button type="button" class="context-pad-chevron" data-context-gateway-toggle data-gateway-menu-key="${menuKey}" aria-expanded="${isOpen ? "true" : "false"}" aria-label="Elegir tipo de compuerta">\u25BE</button>
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
    const shortLabel = entry.kind === NODE_KINDS.GATEWAY ? "Gateway" : entry.kind === NODE_KINDS.FIN ? "End Event" : entry.title;
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
  function deleteFlowNode(flow, nodeId) {
    const node = flow.nodes.find((n) => n.id === nodeId);
    if (!node) return false;
    if (node.kind === NODE_KINDS.INICIO) {
      toast("No pod\xE9s eliminar el Start Event.");
      return false;
    }
    flow.nodes = flow.nodes.filter((n) => n.id !== nodeId);
    flow.transitions = flow.transitions.filter((t) => t.fromId !== nodeId && t.toId !== nodeId);
    delete flow.screens[nodeId];
    return true;
  }
  function renderContextPad(node, isSelected) {
    if (!isSelected) return "";
    const isEnd = node.kind === NODE_KINDS.FIN;
    const actions = isEnd ? [] : getContextPadAppendActions(node);
    const appendBtns = actions.map((entry) => renderContextPadAppendEntry(node, entry)).join("");
    const deleteBtn = node.kind === NODE_KINDS.INICIO ? "" : `<button type="button" class="context-pad-btn context-pad-btn-danger" data-context-delete-node title="Eliminar elemento" aria-label="Eliminar elemento">
      <span class="context-pad-delete-icon" aria-hidden="true">\u{1F5D1}</span>
      ${contextPadLabel("Eliminar")}
    </button>`;
    return `
    <div class="selection-handles" aria-hidden="true">
      <span class="selection-handle selection-handle-nw"></span>
      <span class="selection-handle selection-handle-ne"></span>
      <span class="selection-handle selection-handle-sw"></span>
      <span class="selection-handle selection-handle-se"></span>
    </div>
    <div class="context-pad" role="toolbar" aria-label="Acciones r\xE1pidas BPMN">
      ${appendBtns}
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
    const overlaps = () => flow.nodes.some((n) => {
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
        toast(`Pr\xF3ximamente: ${catalogEntry?.label ?? gt}`);
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
      usedParamIds: []
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
      fin: "End Event"
    }[node.kind];
    const icon = node.kind === "manual" ? `<span class="bpmn-task-icon" aria-hidden="true">\u{1F464}</span>` : node.kind === "automatica" ? `<span class="bpmn-task-icon" aria-hidden="true">\u2699</span>` : node.kind === "gateway" ? `<span class="bpmn-gateway-x gateway-mark ${gatewayMarkClass(node.gatewayType ?? DEFAULT_GATEWAY_TYPE)}" aria-hidden="true"></span>` : "";
    const gwTitle = node.kind === NODE_KINDS.GATEWAY ? gatewayTypeLabel(node.gatewayType ?? DEFAULT_GATEWAY_TYPE) : kindLabel;
    const nodeBody = node.kind === NODE_KINDS.GATEWAY ? `<div class="gateway-node-shape">${icon}<div class="node-kind">${kindLabel}</div><div class="node-name">${escapeHtml(node.name)}</div></div>` : `${icon}<div class="node-kind">${kindLabel}</div><div class="node-name">${escapeHtml(node.name)}</div>`;
    return `
    <div class="flow-node node-${node.kind} ${isSelected ? "is-selected" : ""}"
         data-node-id="${node.id}"
         title="${escapeHtml(gwTitle)}"
         style="left:${node.x}px;top:${node.y}px">
      ${nodeBody}
      ${renderContextPad(node, isSelected)}
    </div>`;
  }
  function tryAddTransition(flow, fromId, toId, lineType, condition) {
    if (fromId === toId) {
      toast("No pod\xE9s conectar un nodo consigo mismo.");
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
          toast("Desde el gateway us\xE1 los puertos aceptar o rechazar.");
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
      (t) => t.fromId === fromId && t.toId === toId && (t.lineType ?? LINE_TYPES.SEQUENCE) === lt && (lt === LINE_TYPES.SEQUENCE ? t.condition === cond : true)
    );
    if (dup) {
      toast("Esa conexi\xF3n ya existe.");
      return false;
    }
    flow.transitions.push({
      id: createId("tr"),
      fromId,
      toId,
      lineType: lt,
      condition: cond
    });
    return true;
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
    const screenBtn = node.kind === NODE_KINDS.MANUAL ? `<button type="button" class="btn btn-primary btn-sm" id="btn-design-screen" style="width:100%;margin-top:0.5rem">Dise\xF1ar pantalla (estudio)</button>` : "";
    const automationBtn = node.kind === NODE_KINDS.AUTOMATICA ? `<button type="button" class="btn btn-primary btn-sm" id="btn-design-automation" style="width:100%;margin-top:0.5rem">Dise\xF1ar automatizaci\xF3n</button>` : "";
    const agenteIABtn = node.kind === NODE_KINDS.AGENTE_IA ? `<button type="button" class="btn btn-primary btn-sm" id="btn-design-agente-ia" style="width:100%;margin-top:0.5rem">Configurar Agente IA</button>` : "";
    ensureFlowDiagram(flow);
    const laneOptions = flow.lanes.map(
      (lane) => `<option value="${lane.id}" ${node.laneId === lane.id ? "selected" : ""}>${escapeHtml(lane.name)}</option>`
    ).join("");
    const eventPoolHint = node.kind === NODE_KINDS.INICIO || node.kind === NODE_KINDS.FIN ? `<p class="props-intro">Debe permanecer dentro del pool; pod\xE9s usar otro lane (rol / grupo).</p>` : "";
    const generalBody = `
      <div class="form-row"><label>Nombre</label><input name="name" value="${escapeHtml(node.name)}" required /></div>
      <div class="form-row"><label>Descripci\xF3n</label><textarea name="description">${escapeHtml(node.description || "")}</textarea></div>
      <div class="form-row"><label>Lane (rol / perfil)</label><select name="laneId">${laneOptions}</select></div>
      ${eventPoolHint}
      ${screenBtn}
      ${automationBtn}
      ${agenteIABtn}`;
    const inputDataSection = node.kind !== NODE_KINDS.INICIO && node.kind !== NODE_KINDS.FIN && node.kind !== NODE_KINDS.GATEWAY ? renderPropsCollapse("input-data", "Datos de entrada que usa", paramsHtml, false) : "";
    const flowParamsSection = node.kind === NODE_KINDS.INICIO ? renderPropsCollapse(
      "flow-params",
      "Par\xE1metros de entrada del flujo",
      `<div id="input-params-list">${renderInputParamsList(flow)}</div>
      <button type="button" class="btn btn-sm" id="btn-add-param">+ Par\xE1metro</button>`,
      false
    ) : "";
    const connectionsList = `
        <ul class="props-connection-list">
          ${transitions.map((t) => {
      const to = flow.nodes.find((n) => n.id === t.toId);
      const lt = t.lineType ?? LINE_TYPES.SEQUENCE;
      const badge = lineTypeLabel(lt);
      const cond = t.condition ? ` \xB7 ${t.condition}` : "";
      return `<li><span class="line-badge line-badge-${lt}">${badge}</span>${cond} \u2192 ${escapeHtml(to?.name ?? t.toId)} <button type="button" class="btn btn-sm btn-danger" data-del-tr="${t.id}">\xD7</button></li>`;
    }).join("") || "<li class='props-empty'>Ninguna</li>"}
        </ul>`;
    const connectionsForm = node.kind === NODE_KINDS.FIN ? "" : `
        <div class="form-row" style="margin-top:0.5rem">
          <label>Tipo de l\xEDnea</label>
          <select id="connect-line-type">
            <option value="${LINE_TYPES.SEQUENCE}" ${designerContext.activeLineType === LINE_TYPES.SEQUENCE ? "selected" : ""}>Sequence Flow</option>
            <option value="${LINE_TYPES.MESSAGE}" ${designerContext.activeLineType === LINE_TYPES.MESSAGE ? "selected" : ""}>Message Flow</option>
            <option value="${LINE_TYPES.ASSOCIATION}" ${designerContext.activeLineType === LINE_TYPES.ASSOCIATION ? "selected" : ""}>Association</option>
          </select>
        </div>
        <div class="form-row">
          <label>Nueva conexi\xF3n hacia</label>
          <select id="connect-target">
            <option value="">\u2014 Seleccionar \u2014</option>
            ${targets.map((t) => `<option value="${t.id}">${escapeHtml(t.name)} (${t.kind})</option>`).join("")}
          </select>
        </div>
        <div class="form-row" id="connect-condition-row">
          <label>Condici\xF3n</label>
          <select id="connect-condition">${connectConditions}</select>
        </div>
        <button type="button" class="btn btn-sm" id="btn-add-transition">Agregar conexi\xF3n</button>`;
    const connectionsSection = renderPropsCollapse(
      "connections",
      "Conexiones salientes",
      `${connectionsList}${connectionsForm}`,
      false
    );
    return `
    <form id="node-props-form" class="form-grid props-form">
      ${renderPropsCollapse("general", "General", generalBody, false)}
      ${node.kind === NODE_KINDS.GATEWAY ? renderPropsCollapse(
      "gateway-type",
      "Tipo de compuerta",
      renderGatewayTypePickerHtml(node.gatewayType),
      false
    ) : ""}
      ${inputDataSection}
      ${flowParamsSection}
      ${connectionsSection}
      <button type="button" class="btn btn-danger btn-sm props-delete-node" id="btn-delete-node">Eliminar nodo</button>
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
      { signal }
    );
    mainEl.querySelector("#btn-mobile-props")?.addEventListener(
      "click",
      () => {
        designerContext.mobilePropsOpen = !designerContext.mobilePropsOpen;
        if (designerContext.mobilePropsOpen) designerContext.mobilePaletteOpen = false;
        applyDesignerSidePanelState(mainEl);
      },
      { signal }
    );
    mainEl.querySelector("#btn-toggle-copilot")?.addEventListener(
      "click",
      () => {
        designerContext.copilotOpen = !designerContext.copilotOpen;
        applyDesignerSidePanelState(mainEl);
      },
      { signal }
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
      { signal }
    );
  }
  function bindFlowEditor(mainEl, flow, state, persist) {
    const canvas = mainEl.querySelector("#flow-canvas");
    const wrap2 = mainEl.querySelector("#canvas-wrap");
    bindDesignerSidePanels(mainEl, state, persist);
    bindStudioTabs(mainEl, state, persist);
    syncDesignerLayoutViewport(mainEl, flow, persist);
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
      if (changed) persist();
    }
    mainEl.querySelector("#btn-back-catalog")?.addEventListener("click", () => {
      designerContext.selectedFlowId = null;
      designerContext.selectedNodeId = null;
      renderDesigner(mainEl, state, persist);
    });
    mainEl.querySelector("#btn-delete-flow")?.addEventListener("click", () => {
      attemptDeleteFlow(mainEl, state, persist, flow.id);
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
    wrap2.addEventListener("dragover", (e) => e.preventDefault());
    wrap2.addEventListener("drop", (e) => {
      e.preventDefault();
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
          toast(`Pr\xF3ximamente: ${catalogEntry?.label ?? droppedGatewayType}`);
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
        usedParamIds: []
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
      persist();
      renderDesigner(mainEl, state, persist);
    });
    mainEl.querySelectorAll(".palette-item[data-palette]").forEach((item) => {
      item.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("palette-kind", item.dataset.palette);
        if (item.dataset.gatewayType) {
          e.dataTransfer.setData("gateway-type", item.dataset.gatewayType);
        }
      });
    });
    mainEl.querySelectorAll("[data-gateway-future]").forEach((item) => {
      item.addEventListener("click", () => {
        const id = item.dataset.gatewayFuture;
        toast(`Pr\xF3ximamente: ${gatewayTypeLabel(id)}`);
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
    bindNodeDrag(mainEl, flow, persist, state);
    bindLinkDrag(mainEl, flow, persist, state);
    bindContextPad(mainEl, flow, state, persist);
    bindCanvasViewport(mainEl, flow, state, persist);
    bindCanvasPan(mainEl, flow, state, persist);
    drawConnections(mainEl, flow);
    applyCanvasViewTransform(mainEl);
    if (designerContext._viewFitForFlowId !== flow.id) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          fitCanvasToView(mainEl, flow);
          designerContext._viewFitForFlowId = flow.id;
          designerContext._layoutViewportWidth = typeof window !== "undefined" ? window.innerWidth : 1280;
        });
      });
    }
    const selected = flow.nodes.find((n) => n.id === designerContext.selectedNodeId);
    if (selected) bindNodeProps(mainEl, flow, selected, state, persist);
    else bindFlowDiagramProps(mainEl, flow, state, persist);
  }
  function bindCanvasViewport(mainEl, flow, state, persist) {
    const wrap2 = mainEl.querySelector("#canvas-wrap");
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
      { signal }
    );
    mainEl.querySelector("#btn-zoom-out")?.addEventListener(
      "click",
      () => {
        designerContext.view.zoom = Math.max(0.25, designerContext.view.zoom / 1.2);
        applyCanvasViewTransform(mainEl);
      },
      { signal }
    );
    mainEl.querySelector("#btn-zoom-100")?.addEventListener(
      "click",
      () => {
        designerContext.view.zoom = 1;
        designerContext.view.panX = 0;
        designerContext.view.panY = 0;
        applyCanvasViewTransform(mainEl);
      },
      { signal }
    );
    mainEl.querySelector("#btn-zoom-fit")?.addEventListener(
      "click",
      () => {
        fitCanvasToView(mainEl, flow);
      },
      { signal }
    );
    mainEl.querySelector("#btn-canvas-fullscreen")?.addEventListener(
      "click",
      async () => {
        if (!wrap2) return;
        if (document.fullscreenElement === wrap2) {
          await document.exitFullscreen();
        } else {
          await wrap2.requestFullscreen();
        }
      },
      { signal }
    );
    document.addEventListener(
      "fullscreenchange",
      () => {
        if (!wrap2 || !mainEl.contains(wrap2)) return;
        requestAnimationFrame(() => fitCanvasToView(mainEl, flow));
      },
      { signal }
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
      { passive: false, signal }
    );
  }
  function bindCanvasPan(mainEl, flow, state, persist) {
    const canvas = mainEl.querySelector("#flow-canvas");
    if (!canvas) return;
    canvas.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      if (designerContext.tool !== "select") return;
      if (e.target.closest(".flow-node") || e.target.closest(".context-pad")) return;
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
    mainEl.querySelector("#btn-add-lane")?.addEventListener("click", () => {
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
        const laneId = btn.dataset.removeLane;
        if (flow.lanes.length <= 1) return;
        const fallback = flow.lanes.find((l) => l.id !== laneId)?.id;
        flow.lanes = flow.lanes.filter((l) => l.id !== laneId);
        for (const node of flow.nodes) {
          if (node.laneId === laneId) node.laneId = fallback;
        }
        persist();
        renderDesigner(mainEl, state, persist);
      });
    });
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
          if (e.target.closest(".flow-port") || e.target.closest(".context-pad")) return;
          const nodeId = el.dataset.nodeId;
          if (designerContext.tool !== "select") {
            e.preventDefault();
            e.stopPropagation();
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
              designerContext.connectClickFrom = { fromId: nodeId, condition: null };
              designerContext.selectedNodeId = nodeId;
              toast("Seleccion\xE1 el nodo destino.");
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
          const pt = clientToCanvas(mainEl, e.clientX, e.clientY);
          offsetX = pt.x - dragNode.x;
          offsetY = pt.y - dragNode.y;
          e.preventDefault();
        },
        { signal }
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
    canvas.querySelectorAll(".context-pad, .selection-handles").forEach((p) => p.remove());
    canvas.querySelectorAll(".flow-node").forEach((n) => n.classList.remove("is-selected"));
    if (!el || !node) return;
    el.classList.add("is-selected");
    const html = renderContextPad(node, true);
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
        pad?.querySelectorAll("[data-gateway-submenu-key]").forEach((sub2) => {
          if (sub2.dataset.gatewaySubmenuKey !== menuKey) sub2.setAttribute("hidden", "");
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
        pad?.querySelectorAll("[data-task-submenu-key]").forEach((sub2) => {
          if (sub2.dataset.taskSubmenuKey !== menuKey) sub2.setAttribute("hidden", "");
        });
        const sub = pad?.querySelector(`[data-task-submenu-key="${menuKey}"]`);
        const willOpen = sub?.hasAttribute("hidden");
        designerContext.contextPadOpenTaskMenu = willOpen ? menuKey : null;
        designerContext.contextPadOpenGatewayMenu = null;
        syncContextPadTaskMenuDom(canvas);
        syncContextPadGatewayMenuDom(canvas);
        return;
      }
      const deleteBtn = e.target.closest("[data-context-delete-node]");
      if (deleteBtn) {
        e.stopPropagation();
        e.preventDefault();
        const nodeEl2 = deleteBtn.closest(".flow-node");
        const nodeId = nodeEl2?.dataset.nodeId;
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
        const nodeEl2 = quickGatewayBtn.closest(".flow-node");
        const fromId2 = nodeEl2?.dataset.nodeId;
        if (!fromId2) return;
        const condition2 = quickGatewayBtn.dataset.appendCondition || "siempre";
        const gatewayType2 = quickGatewayBtn.dataset.gatewayType || DEFAULT_GATEWAY_TYPE;
        const newId2 = appendAndConnect(flow, fromId2, NODE_KINDS.GATEWAY, condition2, gatewayType2);
        if (!newId2) return;
        designerContext.selectedNodeId = newId2;
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
        const nodeEl2 = quickTaskBtn.closest(".flow-node");
        const fromId2 = nodeEl2?.dataset.nodeId;
        if (!fromId2) return;
        const condition2 = quickTaskBtn.dataset.appendCondition || "siempre";
        const newId2 = appendAndConnect(flow, fromId2, NODE_KINDS.MANUAL, condition2);
        if (!newId2) return;
        designerContext.selectedNodeId = newId2;
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
        const nodeEl = port.closest(".flow-node");
        const fromId = nodeEl?.dataset.nodeId;
        if (!fromId) return;
        const condition = port.dataset.condition || null;
        const lineType = condition === "aceptar" || condition === "rechazar" ? LINE_TYPES.SEQUENCE : designerContext.activeLineType;
        drag = { fromId, condition: condition || null, lineType };
      },
      { signal }
    );
    const onMove = (e) => {
      if (!drag) return;
      const svg = mainEl.querySelector("#connections-svg");
      const from = flow.nodes.find((n) => n.id === drag.fromId);
      if (!from || !svg || !wrap) return;
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
  function buildLineSvg(x1, y1, x2, y2, lineType, isPreview) {
    const lt = lineType ?? LINE_TYPES.SEQUENCE;
    const idAttr = isPreview ? ' id="link-preview"' : "";
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
    const op = isPreview ? ' opacity="0.9"' : "";
    return `<line${idAttr} x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="2"${dash}${markerStart} marker-end="${markerEnd}"${op} />`;
  }
  function drawConnections(mainEl, flow) {
    const svg = mainEl.querySelector("#connections-svg");
    if (!svg) return;
    const nodeById = Object.fromEntries(flow.nodes.map((n) => [n.id, n]));
    const paths = flow.transitions.map((t) => {
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
      return `${buildLineSvg(a.x, a.y, b.x, b.y, lt, false)}${label}`;
    }).join("");
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
      const condition = lineType === LINE_TYPES.SEQUENCE ? mainEl.querySelector("#connect-condition")?.value : null;
      if (!toId) {
        toast("Seleccion\xE1 destino.");
        return;
      }
      if (lineType === LINE_TYPES.SEQUENCE && !condition) {
        toast("Seleccion\xE1 condici\xF3n.");
        return;
      }
      if (tryAddTransition(flow, node.id, toId, lineType, condition)) {
        persist();
        renderDesigner(mainEl, state, persist);
      }
    });
    mainEl.querySelectorAll("[data-del-tr]").forEach((btn) => {
      btn.addEventListener("click", () => {
        flow.transitions = flow.transitions.filter((t) => t.id !== btn.dataset.delTr);
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

  // js/motor.js
  function findNode(snapshot, nodeId) {
    return snapshot.nodes.find((n) => n.id === nodeId) ?? null;
  }
  function nextNodeId(snapshot, fromId, condition) {
    const t = snapshot.transitions.find(
      (tr) => tr.fromId === fromId && tr.condition === condition && isSequenceTransition(tr)
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
    return resolveNodeInputBag(instance.flowSnapshot, instance, node);
  }
  async function runAutomaticNode(instance, node) {
    const inputs = pickDataForNode(instance, node);
    appendTrace(instance, {
      type: "integration_request",
      message: `Service Task: ${node.name}`,
      nodeId: node.id,
      dataShown: redactSecrets(inputs)
    });
    const result = await executeIntegration(node, inputs);
    appendTrace(instance, {
      type: result.ok ? "integration_response" : "error",
      message: result.ok ? `Integraci\xF3n OK (${result.durationMs}ms)` : "Integraci\xF3n fall\xF3",
      nodeId: node.id,
      dataShown: redactSecrets(result.response),
      httpStatus: result.httpStatus,
      simulated: result.simulated
    });
    if (!result.ok && node.integration?.onError === "fail_instance") {
      instance.status = "cerrada_rechazo";
      instance.finishedAt = (/* @__PURE__ */ new Date()).toISOString();
      instance.currentNodeId = null;
      appendTrace(instance, {
        type: "error",
        message: `Service Task detenida: ${node.name}`,
        nodeId: node.id
      });
      return null;
    }
    applyNodeOutputMappings(instance, node, result.mapped ?? {});
    completeStep(instance, node.id, "completada");
    appendTrace(instance, {
      type: "automatica",
      message: `Service Task ejecutada: ${node.name}`,
      nodeId: node.id,
      decision: "siempre",
      dataShown: redactSecrets(result.mapped)
    });
    return nextNodeId(instance.flowSnapshot, node.id, "siempre");
  }
  async function proceedFromNode(instance, nodeId, gatewayDecision = null) {
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
      if (node.kind === NODE_KINDS.AGENTE_IA) {
        instance.currentNodeId = currentId;
        instance.aiHitlStatus = "waiting";
        instance.aiHitlSentAt = (/* @__PURE__ */ new Date()).toISOString();
        instance.aiHitlReminders = 0;
        appendTrace(instance, {
          type: "pendiente",
          message: `Agente IA pendiente (HITL): ${node.name} - Correo: ${node.hitlEmail || "no definido"}`,
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
        currentId = await runAutomaticNode(instance, node);
        instance.currentNodeId = currentId;
        if (!currentId) return instance;
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
  async function createInstance(flowSnapshot, inputValues) {
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
      context: {},
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
    return await proceedFromNode(instance, firstId);
  }
  async function advanceAutomatic(instance) {
    return await proceedFromNode(instance, instance.currentNodeId);
  }
  async function resolveManual(instance, decision, comment = "", formValues = {}) {
    const nodeId = instance.currentNodeId;
    const node = findNode(instance.flowSnapshot, nodeId);
    if (!node || node.kind !== NODE_KINDS.MANUAL) {
      throw new Error("No hay User Task pendiente");
    }
    const status = decision === "aceptar" ? "aceptada" : "rechazada";
    completeStep(instance, nodeId, status, comment);
    const values = { ...formValues, comment };
    applyNodeOutputMappings(instance, node, values);
    appendTrace(instance, {
      type: "manual",
      message: `${node.name}: ${decision}`,
      nodeId,
      decision,
      comment,
      dataShown: redactSecrets({ ...pickDataForNode(instance, node), ...values })
    });
    const nextId = nextNodeId(instance.flowSnapshot, nodeId, "siempre");
    if (!nextId) {
      instance.status = decision === "rechazar" ? "cerrada_rechazo" : "completada";
      instance.finishedAt = (/* @__PURE__ */ new Date()).toISOString();
      instance.currentNodeId = null;
      return instance;
    }
    instance.currentNodeId = nextId;
    return await proceedFromNode(instance, nextId, decision);
  }
  function simulateAIHITLReminder(instance) {
    const nodeId = instance.currentNodeId;
    const node = findNode(instance.flowSnapshot, nodeId);
    if (!node || node.kind !== NODE_KINDS.AGENTE_IA) {
      throw new Error("No hay Agente IA esperando respuesta");
    }
    instance.aiHitlReminders = (instance.aiHitlReminders || 0) + 1;
    appendTrace(instance, {
      type: "info",
      message: `Recordatorio enviado a ${node.hitlEmail || "operador"} (Intento ${instance.aiHitlReminders})`,
      nodeId
    });
    return instance;
  }
  async function resolveAIHITL(instance, resolutionData) {
    const nodeId = instance.currentNodeId;
    const node = findNode(instance.flowSnapshot, nodeId);
    if (!node || node.kind !== NODE_KINDS.AGENTE_IA) {
      throw new Error("No hay Agente IA esperando respuesta");
    }
    instance.aiHitlStatus = "resolved";
    completeStep(instance, nodeId, "completada", "Resuelto por IA/HITL");
    appendTrace(instance, {
      type: "automatica",
      message: `Agente IA resuelto: ${node.name}`,
      nodeId,
      dataShown: resolutionData
    });
    const nextId = nextNodeId(instance.flowSnapshot, nodeId, "siempre");
    if (!nextId) {
      instance.status = "completada";
      instance.finishedAt = (/* @__PURE__ */ new Date()).toISOString();
      instance.currentNodeId = null;
      return instance;
    }
    instance.currentNodeId = nextId;
    return await proceedFromNode(instance, nextId);
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
    ${renderPageHeader(
      "Gesti\xF3n de actividades",
      "Instanci\xE1 flujos listos y complet\xE1 User Tasks. Los datos quedan en el contexto de cada instancia."
    )}
    <div class="kpi-row">
      <span class="stat-chip">Flujos listos <strong>${readyFlows.length}</strong></span>
      <span class="stat-chip">En curso <strong>${activeInstances.length}</strong></span>
    </div>
    <div class="gestion-layout">
      <section class="panel">
        <h2 class="panel-title">Instanciar flujo</h2>
        ${readyFlows.length === 0 ? `<p class="gestion-empty">No hay flujos listos. Marc\xE1 uno en el dise\xF1ador.</p>` : `
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
          ${activeInstances.map((i) => renderInstanceCard(i, i.id === selectedInstanceId)).join("") || `<p class="gestion-empty">Sin instancias activas.</p>`}
        </div>
      </section>
      <section class="panel resolver-panel">
        <h2 class="panel-title">Resolver actividad</h2>
        ${selected ? renderResolver(selected, state) : `<p class="gestion-empty">Seleccion\xE1 una instancia en curso.</p>`}
      </section>
    </div>`;
    bindGestion(mainEl, state, persist, readyFlows);
  }
  function renderInstanceCard(instance, isSelected) {
    const node = getCurrentNode(instance);
    const kindBadge = node?.kind === NODE_KINDS.AUTOMATICA ? `<span class="badge badge-listo">Auto</span>` : node?.kind === NODE_KINDS.MANUAL ? `<span class="badge badge-curso">Manual</span>` : "";
    return `
    <article class="panel instance-card ${isSelected ? "is-selected" : ""}" data-inst="${instance.id}">
      <strong>${escapeHtml(instance.flowName)}</strong>
      <div class="instance-card__meta">${formatDateTime(instance.startedAt)}</div>
      <div class="instance-card__step">Pendiente: ${escapeHtml(node?.name ?? "\u2014")} ${kindBadge}</div>
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
    mainEl.querySelector("#form-new-instance")?.addEventListener("submit", async (e) => {
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
      const instance = await createInstance(snapshot, inputValues);
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
      const adapter = node.integration?.adapter ?? "simulation";
      return `
      <p><strong>${escapeHtml(node.name)}</strong> (Service Task)</p>
      <p style="font-size:0.85rem;color:var(--muted)">${escapeHtml(node.description || "")}</p>
      <p style="font-size:0.8rem;color:var(--muted)">Adaptador: ${escapeHtml(adapter)} \xB7 modo ${escapeHtml(node.integration?.executionMode ?? "mock")}</p>
      <button type="button" class="btn btn-primary" id="btn-run-auto">Ejecutar y continuar</button>`;
    }
    if (node.kind === NODE_KINDS.MANUAL) {
      const screen = instance.flowSnapshot.screens?.[node.id];
      return `
      <p style="font-size:0.85rem;color:var(--muted);margin-bottom:1rem">${escapeHtml(node.description || "")}</p>
      <form id="form-manual" class="screen-preview">${renderScreenForInstance(instance, screen)}</form>`;
    }
    if (node.kind === NODE_KINDS.AGENTE_IA) {
      return `
      <p><strong>${escapeHtml(node.name)}</strong> (Agente IA)</p>
      <p style="font-size:0.85rem;color:var(--muted)">${escapeHtml(node.description || "")}</p>
      <div style="background:var(--bg-card);padding:1rem;border-radius:6px;margin:1rem 0;border:1px solid var(--border)">
        <p style="margin:0 0 0.5rem 0;font-size:0.85rem"><strong>Estado:</strong> Esperando respuesta de ${escapeHtml(node.hitlEmail || "operador")}</p>
        <p style="margin:0 0 1rem 0;font-size:0.85rem"><strong>Recordatorios enviados:</strong> ${instance.aiHitlReminders || 0}</p>
        <div style="display:flex;gap:0.5rem">
          <button type="button" class="btn btn-sm" id="btn-ai-remind">Simular +5 horas (Recordatorio)</button>
          <button type="button" class="btn btn-sm btn-primary" id="btn-ai-resolve">Simular respuesta recibida</button>
        </div>
      </div>
    `;
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
        html += `<div class="preview-field"><div class="preview-label">${escapeHtml(b.label ?? name)}</div><select name="${escapeHtml(name)}" ${b.required ? "required" : ""}><option value="">\u2014</option><option value="si">S\xED</option><option value="no">No</option></select></div>`;
      }
    }
    html += `<div class="preview-actions preview-actions--sticky"><button type="button" class="btn btn-success" data-decision="aceptar">Aceptar</button><button type="button" class="btn btn-danger" data-decision="rechazar">Rechazar</button></div>`;
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
  function bindResolver(mainEl, state, persist) {
    mainEl.querySelector("#btn-run-auto")?.addEventListener("click", async () => {
      const instance = state.instances.find((i) => i.id === selectedInstanceId);
      if (!instance) return;
      await advanceAutomatic(instance);
      persist();
      renderGestion(mainEl, state, persist);
    });
    mainEl.querySelector("#btn-ai-remind")?.addEventListener("click", async () => {
      const instance = state.instances.find((i) => i.id === selectedInstanceId);
      if (!instance) return;
      simulateAIHITLReminder(instance);
      persist();
      toast("Se simul\xF3 el paso de 5 horas y se envi\xF3 un recordatorio.");
      renderGestion(mainEl, state, persist);
    });
    mainEl.querySelector("#btn-ai-resolve")?.addEventListener("click", async () => {
      const instance = state.instances.find((i) => i.id === selectedInstanceId);
      if (!instance) return;
      await resolveAIHITL(instance, { status: "approved", note: "Aprobado v\xEDa correo" });
      persist();
      toast("Respuesta recibida. Flujo avanza.");
      renderGestion(mainEl, state, persist);
    });
    const form = mainEl.querySelector("#form-manual");
    if (!form) return;
    form.querySelectorAll("[data-decision]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const instance = state.instances.find((i) => i.id === selectedInstanceId);
        if (!instance) return;
        const node = getCurrentNode(instance);
        const screen = instance.flowSnapshot.screens?.[node?.id];
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
      ${renderPageHeader(
      "Reporte de avance",
      "Filtr\xE1 instancias y revis\xE1 contexto, entradas y traza de ejecuci\xF3n."
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
              ${instances.map((i) => {
      const prog = countProgress(i);
      const node = getCurrentNode(i);
      return `<tr data-report-inst="${i.id}" class="table-row-selectable ${i.id === selectedReportInstanceId ? "is-selected" : ""}">
                  <td>${escapeHtml(i.flowName)}</td>
                  <td><span class="badge badge-${badgeForStatus(i.status)}">${statusLabel(i.status)}</span></td>
                  <td>${prog.pct}% \xB7 ${escapeHtml(node?.name ?? "Finalizado")}</td>
                  <td>${formatDateTime(i.startedAt)}</td>
                </tr>`;
    }).join("") || `<tr><td colspan="4"><div class="empty-state empty-state--rich"><strong>Sin instancias</strong><p>Inici\xE1 un flujo en Gesti\xF3n para ver reportes aqu\xED.</p></div></td></tr>`}
            </tbody>
          </table>
        </div>
        <div class="panel">
          ${selected ? renderDetail(selected) : `<p class="gestion-empty">Seleccion\xE1 una instancia.</p>`}
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
    const ctxEntries = Object.entries(instance.context ?? {});
    const context = ctxEntries.length === 0 ? "<li>\u2014</li>" : `<pre class="report-context-json">${escapeHtml(JSON.stringify(Object.fromEntries(ctxEntries), null, 2))}</pre>`;
    const trace = instance.trace.map(
      (t) => `
    <li class="trace-item">
      <time>${formatDateTime(t.at)}</time> \u2014 ${escapeHtml(t.message)}
      ${t.comment ? `<div class="form-hint">Comentario: ${escapeHtml(t.comment)}</div>` : ""}
      ${t.decision ? `<div class="form-hint">Decisi\xF3n: ${escapeHtml(t.decision)}</div>` : ""}
    </li>`
    ).join("");
    return `
    <h3 class="report-detail-title">${escapeHtml(instance.flowName)}</h3>
    <p><span class="badge badge-${badgeForStatus(instance.status)}">${statusLabel(instance.status)}</span></p>
    <div class="progress-bar"><span style="width:${prog.pct}%"></span></div>
    <p class="form-hint">${prog.done} actividades registradas \xB7 Paso actual: ${escapeHtml(node?.name ?? "\u2014")}</p>
    <h4>Datos de entrada</h4>
    <ul class="trace-list">${inputs || "<li>\u2014</li>"}</ul>
    <h4>Contexto de instancia</h4>
    ${context.startsWith("<pre") ? context : `<ul class="trace-list">${context}</ul>`}
    <h4>Traza</h4>
    <ul class="trace-list">${trace || "<li>\u2014</li>"}</ul>`;
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
    let resizeTimer = null;
    window.addEventListener("resize", () => {
      if (resizeTimer) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        if (currentView === "designer") render();
      }, 150);
    });
    bindNavDrawer((view) => {
      currentView = view;
      render();
    });
    document.getElementById("btn-ai-config")?.addEventListener("click", () => {
      const config = loadAiConfig();
      const { close, root } = openModal(`
      <div class="modal-header">
        <h2>Configuraci\xF3n IA (Mock)</h2>
        <button type="button" class="btn btn-sm" data-modal-close>Cerrar</button>
      </div>
      <form id="form-ai-config" class="form-grid">
        <p class="form-hint" style="margin-top:0;margin-bottom:0.5rem">
          En este prototipo est\xE1tico no se hacen llamadas reales a las APIs. La configuraci\xF3n habilita la UI del Copilot y los Nodos Agente.
        </p>
        <div class="form-row">
          <label>Proveedor</label>
          <select name="provider" id="ai-provider-select">
            <option value="openai" ${config.provider === "openai" ? "selected" : ""}>OpenAI</option>
            <option value="anthropic" ${config.provider === "anthropic" ? "selected" : ""}>Anthropic</option>
            <option value="google" ${config.provider === "google" ? "selected" : ""}>Google (Gemini)</option>
            <option value="groq" ${config.provider === "groq" ? "selected" : ""}>Groq</option>
            <option value="ollama" ${config.provider === "ollama" ? "selected" : ""}>Ollama (Local)</option>
            <option value="custom" ${config.provider === "custom" ? "selected" : ""}>Otro (Custom)</option>
          </select>
        </div>
        <div class="form-row">
          <label>Modelo por defecto</label>
          <select name="model" id="ai-model-select">
            <!-- Se llena din\xE1micamente -->
          </select>
          <input type="text" name="customModel" id="ai-custom-model" style="display:none; margin-top:0.5rem;" placeholder="Escribe el nombre del modelo..." />
        </div>
        <div class="form-row">
          <label>API Key (Token)</label>
          <input type="password" name="apiKey" value="${config.apiKey || ""}" placeholder="Ingresa tu token..." required />
          <p class="form-hint">Se guarda en localStorage. Necesario para habilitar la IA.</p>
        </div>
        <div style="margin-top:0.5rem">
          <button type="submit" class="btn btn-primary">Guardar configuraci\xF3n</button>
        </div>
      </form>
    `);
      const providerSelect = root.querySelector("#ai-provider-select");
      const modelSelect = root.querySelector("#ai-model-select");
      const customModelInput = root.querySelector("#ai-custom-model");
      const modelsByProvider = {
        openai: ["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"],
        anthropic: ["claude-3-5-sonnet", "claude-3-opus", "claude-3-haiku"],
        google: ["gemini-1.5-pro", "gemini-1.5-flash"],
        groq: ["llama3-70b-8192", "llama3-8b-8192", "mixtral-8x7b-32768", "gemma-7b-it", "qwen-2.5-32b"],
        ollama: ["llama3", "mistral", "phi3"],
        custom: []
      };
      function updateModels() {
        const provider = providerSelect.value;
        const models = modelsByProvider[provider] || [];
        modelSelect.innerHTML = "";
        if (models.length > 0) {
          modelSelect.style.display = "block";
          customModelInput.style.display = "none";
          models.forEach((m) => {
            const opt = document.createElement("option");
            opt.value = m;
            opt.textContent = m;
            if (config.model === m) opt.selected = true;
            modelSelect.appendChild(opt);
          });
          if (config.model && !models.includes(config.model) && provider === config.provider) {
            const opt = document.createElement("option");
            opt.value = config.model;
            opt.textContent = config.model + " (Actual)";
            opt.selected = true;
            modelSelect.appendChild(opt);
          }
        } else {
          modelSelect.style.display = "none";
          customModelInput.style.display = "block";
          customModelInput.value = config.model || "";
        }
      }
      providerSelect.addEventListener("change", updateModels);
      updateModels();
      root.querySelector("#form-ai-config").addEventListener("submit", (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const provider = fd.get("provider");
        const model = provider === "custom" ? fd.get("customModel") : fd.get("model");
        saveAiConfig({
          provider,
          model,
          apiKey: fd.get("apiKey")
        });
        toast("Configuraci\xF3n IA guardada (Mock)", 2500, "success");
        close();
      });
    });
    render();
  } catch (err) {
    console.error(err);
    showBootError(err instanceof Error ? err.message : "Error desconocido.");
  }
})();
