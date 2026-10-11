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

  // js/component-input-attributes.js
  var DEFAULT_DATA_TYPE = "texto";
  var INPUT_CARDINALITY = {
    UNICO: "unico",
    LISTA: "lista"
  };
  var COMPONENTS_WITH_INPUT_ATTRIBUTES = /* @__PURE__ */ new Set([
    "inicio",
    "fin",
    "manual",
    "automatica",
    "gateway"
  ]);
  var KINDS_WITH_OUTPUT_ATTRIBUTES = /* @__PURE__ */ new Set(["gateway"]);
  function createEmptyListOption() {
    return { id: createId("opt"), label: "", required: false };
  }
  function createEmptyAttribute() {
    return {
      id: createId("attr"),
      key: "",
      label: "",
      dataType: DEFAULT_DATA_TYPE,
      cardinality: INPUT_CARDINALITY.UNICO,
      required: false,
      listOptions: []
    };
  }
  function normalizeComponentAttribute(attr) {
    if (!attr || typeof attr !== "object") return createEmptyAttribute();
    const cardinality = attr.cardinality === INPUT_CARDINALITY.LISTA ? INPUT_CARDINALITY.LISTA : INPUT_CARDINALITY.UNICO;
    const listOptions = cardinality === INPUT_CARDINALITY.LISTA && Array.isArray(attr.listOptions) ? attr.listOptions.map((o) => ({
      id: o?.id ?? createId("opt"),
      label: String(o?.label ?? "").trim(),
      required: !!o?.required
    })) : [];
    const orderRaw = attr.order;
    const order = typeof orderRaw === "number" && Number.isFinite(orderRaw) ? Math.floor(orderRaw) : void 0;
    return {
      id: attr.id ?? createId("attr"),
      key: String(attr.key ?? "").trim(),
      label: String(attr.label ?? "").trim(),
      dataType: attr.dataType ?? attr.type ?? DEFAULT_DATA_TYPE,
      cardinality,
      required: !!attr.required,
      listOptions,
      order
    };
  }
  function reindexAttributeOrders(list) {
    if (!Array.isArray(list)) return;
    list.forEach((attr, index) => {
      attr.order = index;
    });
  }
  function sortAttributesByOrder(list) {
    if (!Array.isArray(list)) return [];
    return [...list].sort((a, b) => {
      const ao = typeof a.order === "number" ? a.order : Number.MAX_SAFE_INTEGER;
      const bo = typeof b.order === "number" ? b.order : Number.MAX_SAFE_INTEGER;
      return ao - bo;
    });
  }
  function normalizeAttributeList(list) {
    if (!Array.isArray(list)) return [];
    const normalized = list.map((a, index) => {
      const item = normalizeComponentAttribute(a);
      if (item.order === void 0) item.order = index;
      return item;
    });
    const sorted = sortAttributesByOrder(normalized);
    reindexAttributeOrders(sorted);
    return sorted;
  }
  function ensureNodeComponentAttributes(node) {
    if (!node || !COMPONENTS_WITH_INPUT_ATTRIBUTES.has(node.kind)) return;
    if (!Array.isArray(node.inputAttributes)) node.inputAttributes = [];
    else node.inputAttributes = normalizeAttributeList(node.inputAttributes);
    if (KINDS_WITH_OUTPUT_ATTRIBUTES.has(node.kind)) {
      if (!Array.isArray(node.outputAttributes)) node.outputAttributes = [];
      else node.outputAttributes = normalizeAttributeList(node.outputAttributes);
    } else if (node.outputAttributes) {
      delete node.outputAttributes;
    }
  }
  function validateAttributeList(attrs, scopeLabel, nodeName) {
    const errors = [];
    const keys = /* @__PURE__ */ new Set();
    const who = nodeName ? `\xAB${nodeName}\xBB` : "componente";
    for (const attr of attrs ?? []) {
      const a = normalizeComponentAttribute(attr);
      if (!a.key) errors.push(`${who} (${scopeLabel}): hay un atributo sin clave.`);
      else if (!/^[a-z0-9_]+$/.test(a.key)) {
        errors.push(`${who} (${scopeLabel}): clave \xAB${a.key}\xBB inv\xE1lida (use a-z, 0-9, _).`);
      } else if (keys.has(a.key)) {
        errors.push(`${who} (${scopeLabel}): clave duplicada \xAB${a.key}\xBB.`);
      } else keys.add(a.key);
      if (!a.label) errors.push(`${who} (${scopeLabel}): atributo \xAB${a.key || "?"}\xBB sin etiqueta.`);
      if (a.cardinality === INPUT_CARDINALITY.LISTA) {
        if (!a.listOptions.length) {
          errors.push(`${who} (${scopeLabel}): \xAB${a.key || "?"}\xBB es lista y debe tener al menos una opci\xF3n.`);
        }
        for (const opt of a.listOptions) {
          if (!String(opt.label ?? "").trim()) {
            errors.push(`${who} (${scopeLabel}): \xAB${a.key}\xBB tiene una opci\xF3n sin etiqueta.`);
          }
        }
      }
    }
    return errors;
  }
  function validateNodeInputAttributes(node) {
    if (!node || !COMPONENTS_WITH_INPUT_ATTRIBUTES.has(node.kind)) return [];
    return validateAttributeList(node.inputAttributes, "entrada", node.name ?? node.id);
  }
  function validateNodeOutputAttributes(node) {
    if (!node || !KINDS_WITH_OUTPUT_ATTRIBUTES.has(node.kind)) return [];
    return validateAttributeList(node.outputAttributes, "salida", node.name ?? node.id);
  }
  function validateNodeComponentAttributes(node) {
    return [...validateNodeInputAttributes(node), ...validateNodeOutputAttributes(node)];
  }
  function cloneAttributeList(attrs) {
    return normalizeAttributeList(attrs).map((a) => ({
      ...a,
      listOptions: a.listOptions.map((o) => ({ ...o }))
    }));
  }
  function summarizeAttributes(attrs) {
    return normalizeAttributeList(attrs).map((a) => ({
      id: a.id,
      label: a.label || a.key || "?",
      key: a.key,
      cardinality: a.cardinality,
      required: a.required,
      dataType: a.dataType,
      optionCount: a.listOptions.length,
      order: a.order
    }));
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
  function ensureFlowNodeAttributes(flow) {
    if (!flow?.nodes) return;
    const seenInput = /* @__PURE__ */ new Set();
    const seenOutput = /* @__PURE__ */ new Set();
    for (const node of flow.nodes) {
      if (Array.isArray(node.inputAttributes)) {
        if (seenInput.has(node.inputAttributes)) {
          node.inputAttributes = cloneAttributeList(node.inputAttributes);
        } else {
          seenInput.add(node.inputAttributes);
        }
      }
      if (Array.isArray(node.outputAttributes)) {
        if (seenOutput.has(node.outputAttributes)) {
          node.outputAttributes = cloneAttributeList(node.outputAttributes);
        } else {
          seenOutput.add(node.outputAttributes);
        }
      }
      ensureNodeComponentAttributes(node);
    }
  }
  function migrateLegacyFlowInputToStart(flow) {
    if (!flow?.nodes) return;
    if (!Array.isArray(flow.inputParams)) flow.inputParams = [];
    if (!flow.dataDefinitions) {
      flow.dataDefinitions = flow.inputParams.map((p) => ({
        id: p.id,
        key: p.key,
        label: p.label,
        type: p.type ?? DATA_TYPES.TEXTO,
        required: !!p.required,
        scope: "flow_input",
        cardinality: p.cardinality ?? INPUT_CARDINALITY.UNICO,
        listOptions: Array.isArray(p.listOptions) ? p.listOptions : []
      }));
    }
    const startNode = flow.nodes.find((n) => n.kind === "inicio");
    if (!startNode) return;
    ensureNodeComponentAttributes(startNode);
    if (!startNode.inputAttributes.length && (flow.dataDefinitions?.length ?? 0) > 0) {
      startNode.inputAttributes = flow.dataDefinitions.map(
        (d) => normalizeComponentAttribute({
          id: d.id,
          key: d.key,
          label: d.label,
          dataType: d.type,
          cardinality: d.cardinality ?? INPUT_CARDINALITY.UNICO,
          required: d.required,
          listOptions: d.listOptions ?? []
        })
      );
    }
  }
  function syncFlowInputContractFromStart(flow) {
    if (!flow?.nodes) return;
    const startNode = flow.nodes.find((n) => n.kind === "inicio");
    if (!startNode) return;
    ensureNodeComponentAttributes(startNode);
    flow.dataDefinitions = startNode.inputAttributes.map((attr) => attributeToFlowDefinition(attr));
    syncInputParamsFromDefinitions(flow);
  }
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
        scope: "flow_input",
        cardinality: p.cardinality ?? INPUT_CARDINALITY.UNICO,
        listOptions: Array.isArray(p.listOptions) ? p.listOptions : []
      }));
    }
    ensureFlowNodeAttributes(flow);
    syncFlowInputContractFromStart(flow);
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
  function attributeToFlowDefinition(attr) {
    const a = normalizeComponentAttribute(attr);
    return {
      id: a.id,
      key: a.key,
      label: a.label,
      type: a.dataType,
      required: a.required,
      scope: "flow_input",
      cardinality: a.cardinality,
      listOptions: a.cardinality === INPUT_CARDINALITY.LISTA ? a.listOptions.map((o) => ({ id: o.id, label: o.label, required: !!o.required })) : []
    };
  }
  function syncInputParamsFromDefinitions(flow) {
    flow.inputParams = (flow.dataDefinitions ?? []).map((d) => ({
      id: d.id,
      key: d.key,
      label: d.label,
      type: d.type,
      required: !!d.required,
      cardinality: d.cardinality ?? INPUT_CARDINALITY.UNICO,
      listOptions: Array.isArray(d.listOptions) ? d.listOptions : []
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
      errors.push(...validateNodeComponentAttributes(node));
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
  var SIEMPRE_CONTINUATION_KINDS = /* @__PURE__ */ new Set([
    NODE_KINDS.MANUAL,
    NODE_KINDS.AUTOMATICA,
    NODE_KINDS.AGENTE_IA,
    NODE_KINDS.GATEWAY,
    NODE_KINDS.FIN
  ]);
  function validateActivitySequenceOut(flow, node, taskLabel, errors) {
    const outs = transitionsFrom(flow, node.id);
    const siempre = transitionsFrom(flow, node.id, "siempre");
    if (siempre.length !== 1) {
      errors.push(`${taskLabel} "${node.name}": debe tener exactamente una salida \xABsiempre\xBB.`);
    }
    const bad = outs.filter((t) => t.condition !== "siempre");
    if (bad.length) {
      errors.push(
        `${taskLabel} "${node.name}": Aceptar/Rechazar se modelan en el Exclusive Gateway, no en la actividad.`
      );
    }
    if (siempre.length === 1) {
      const target = flow.nodes.find((n) => n.id === siempre[0].toId);
      if (!target || !SIEMPRE_CONTINUATION_KINDS.has(target.kind)) {
        errors.push(
          `${taskLabel} "${node.name}": la salida \xABsiempre\xBB debe ir a otra actividad, un gateway o un End Event.`
        );
      }
    }
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
        validateActivitySequenceOut(flow, node, "User Task", errors);
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
        validateActivitySequenceOut(flow, node, "Service Task", errors);
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

  // js/flow-types.js
  function ensureFlowTypesState(state) {
    if (!state) return state;
    if (!Array.isArray(state.flowTypes)) state.flowTypes = [];
    for (const flow of state.flows ?? []) {
      if (!flow || typeof flow !== "object") continue;
      if (flow.flowTypeId) {
        const ft2 = state.flowTypes.find((t) => t.id === flow.flowTypeId);
        if (ft2) flow.type = String(ft2.name ?? "").trim() || flow.type;
        continue;
      }
      const typeName = String(flow.type ?? "").trim();
      if (!typeName) continue;
      let ft = state.flowTypes.find((t) => String(t.name ?? "").trim() === typeName);
      if (!ft) {
        ft = {
          id: createId("flowType"),
          name: typeName,
          description: ""
        };
        state.flowTypes.push(ft);
      }
      flow.flowTypeId = ft.id;
      flow.type = ft.name;
    }
    return state;
  }
  function countFlowsUsingFlowType(state, flowTypeId) {
    return (state.flows ?? []).filter((f) => f.flowTypeId === flowTypeId).length;
  }
  function syncFlowTypeLabelOnFlows(state, flowTypeId, newName) {
    const name = String(newName ?? "").trim();
    for (const flow of state.flows ?? []) {
      if (flow.flowTypeId === flowTypeId) flow.type = name;
    }
  }
  function renderFlowTypeSelectOptions(state, selectedId) {
    const types = state.flowTypes ?? [];
    if (!types.length) {
      return `<option value="">\u2014 Sin tipos definidos \u2014</option>`;
    }
    return types.map((t) => {
      const sel = t.id === selectedId ? " selected" : "";
      return `<option value="${escapeHtmlAttr(t.id)}"${sel}>${escapeHtmlText(t.name)}</option>`;
    }).join("");
  }
  function applyFlowTypeToFlow(flow, state, flowTypeId) {
    const ft = state.flowTypes?.find((t) => t.id === flowTypeId);
    if (!ft) return false;
    flow.flowTypeId = ft.id;
    flow.type = String(ft.name ?? "").trim();
    return true;
  }
  function isFlowTypeNameTaken(state, name, excludeId) {
    const n = String(name ?? "").trim().toLowerCase();
    if (!n) return false;
    return (state.flowTypes ?? []).some(
      (t) => t.id !== excludeId && String(t.name ?? "").trim().toLowerCase() === n
    );
  }
  function escapeHtmlText(value) {
    return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function escapeHtmlAttr(value) {
    return escapeHtmlText(value);
  }
  function navigateToFlowTypesMaster() {
    document.querySelector('[data-nav-group="maestros"] [data-master="flowTypes"]')?.click();
  }
  function renderFlowTypeFormRow(state, flow) {
    const types = state.flowTypes ?? [];
    const selectedId = flow?.flowTypeId ?? types.find((t) => String(t.name ?? "").trim() === String(flow?.type ?? "").trim())?.id ?? "";
    if (!types.length) {
      return `<div class="form-row form-row--flow-type-empty">
      <label>Tipo de flujo</label>
      <p class="form-hint" style="margin:0">No hay tipos definidos en Maestros.</p>
      <button type="button" class="btn btn-sm" data-goto-flow-types style="margin-top:0.5rem">Ir a Tipo de flujo</button>
    </div>`;
    }
    return `<div class="form-row"><label>Tipo de flujo</label><select name="flowTypeId" required>${renderFlowTypeSelectOptions(state, selectedId)}</select></div>`;
  }
  function bindFlowTypeGotoButton(root, onNavigate) {
    root.querySelector("[data-goto-flow-types]")?.addEventListener("click", () => {
      onNavigate?.();
      navigateToFlowTypesMaster();
    });
  }

  // js/auth.js
  var AUTH_USERS_KEY = "gestor_flujos_auth_users_v1";
  var AUTH_SESSION_KEY = "gestor_flujos_session_v1";
  var AUTH_PROVIDER_LOCAL = "local";
  var cachedSession = null;
  var DEMO_USERS = [
    { username: "luna", displayName: "Luna Rivera", avatarSeed: "luna-aurora" },
    { username: "mateo", displayName: "Mateo D\xEDaz", avatarSeed: "mateo-bosque" },
    { username: "sofia", displayName: "Sof\xEDa Luna", avatarSeed: "sofia-brillo" },
    { username: "bruno", displayName: "Bruno Paz", avatarSeed: "bruno-roca" },
    { username: "clara", displayName: "Clara Mora", avatarSeed: "clara-marea" }
  ];
  var DEMO_PASSWORD = "1234";
  var SYSTEM_MIGRATION_USER_ID = "user_sys_prueabaomigracion";
  var SYSTEM_MIGRATION_USERNAME = "prueabaomigracion";
  function createSystemMigrationUserRecord() {
    return {
      id: SYSTEM_MIGRATION_USER_ID,
      username: SYSTEM_MIGRATION_USERNAME,
      displayName: "Usuario gen\xE9rico de migraci\xF3n",
      password: "",
      active: true,
      avatarSeed: "system-prueabaomigracion",
      isSystem: true,
      loginAllowed: false
    };
  }
  function ensureSystemMigrationUser(users) {
    const list = [...users];
    const idx = list.findIndex((u) => u.username === SYSTEM_MIGRATION_USERNAME);
    const canonical = createSystemMigrationUserRecord();
    if (idx === -1) {
      list.push(canonical);
      return list;
    }
    list[idx] = {
      ...list[idx],
      ...canonical,
      id: list[idx].id || canonical.id,
      displayName: list[idx].displayName || canonical.displayName,
      isSystem: true,
      loginAllowed: false,
      active: list[idx].active !== false
    };
    return list;
  }
  function isSystemAuthUser(user) {
    return !!user?.isSystem;
  }
  function canUserLogin(user) {
    if (!user?.active) return false;
    if (user.isSystem) return false;
    if (user.loginAllowed === false) return false;
    return true;
  }
  function getSystemMigrationUser() {
    return loadAuthUsers().find((u) => u.username === SYSTEM_MIGRATION_USERNAME) ?? createSystemMigrationUserRecord();
  }
  function resolveConnectedAuthUserId() {
    const session = getSession();
    if (session?.userId) return session.userId;
    return getSystemMigrationUser().id;
  }
  var listeners = /* @__PURE__ */ new Set();
  function notifyAuthChange(session) {
    for (const fn of listeners) {
      try {
        fn(session);
      } catch (e) {
        console.error(e);
      }
    }
  }
  function loadAuthUsers() {
    let users;
    try {
      const raw = localStorage.getItem(AUTH_USERS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed?.users)) users = normalizeAuthUsers(parsed.users);
      }
    } catch {
    }
    if (!users) users = seedAuthUsersIfEmpty();
    const merged = ensureSystemMigrationUser(users);
    if (merged.length !== users.length || merged.some((u, i) => u.isSystem !== users[i]?.isSystem)) {
      saveAuthUsers(merged);
    }
    return merged;
  }
  function saveAuthUsers(users) {
    localStorage.setItem(AUTH_USERS_KEY, JSON.stringify({ users: normalizeAuthUsers(users) }));
  }
  function seedAuthUsersIfEmpty() {
    const users = DEMO_USERS.map((u) => ({
      id: createId("user"),
      username: u.username,
      displayName: u.displayName,
      password: DEMO_PASSWORD,
      active: true,
      avatarSeed: u.avatarSeed ?? u.username,
      isSystem: false,
      loginAllowed: true
    }));
    const withSystem = ensureSystemMigrationUser(users);
    saveAuthUsers(withSystem);
    return withSystem;
  }
  function normalizeAuthUsers(users) {
    return (users ?? []).map((u) => {
      const isSystem = !!u.isSystem || u.username === SYSTEM_MIGRATION_USERNAME;
      const loginAllowed = isSystem ? false : u.loginAllowed !== false;
      return {
        id: String(u.id ?? createId("user")),
        username: String(u.username ?? "").trim().toLowerCase(),
        displayName: String(u.displayName ?? u.username ?? "").trim(),
        password: String(u.password ?? ""),
        active: u.active !== false,
        avatarSeed: String(u.avatarSeed ?? u.username ?? u.id ?? "user"),
        isSystem,
        loginAllowed
      };
    });
  }
  function hashStringToInt(value) {
    let h = 0;
    const s = String(value ?? "");
    for (let i = 0; i < s.length; i += 1) {
      h = (h << 5) - h + s.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  }
  function getUserInitials(user) {
    const name = String(user.displayName ?? user.username ?? "?").trim();
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  function getUserAvatarImageUrl(user) {
    const seed = encodeURIComponent(String(user.avatarSeed ?? user.username ?? user.id ?? "user"));
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
  }
  function getUserById(userId) {
    if (!userId) return null;
    return loadAuthUsers().find((u) => u.id === userId) ?? null;
  }
  function getCurrentUserProfile() {
    const session = getSession();
    if (!session) return null;
    const user = getUserById(session.userId);
    if (!user) return null;
    return { session, user };
  }
  function persistSession(session) {
    cachedSession = session;
    if (!session) {
      sessionStorage.removeItem(AUTH_SESSION_KEY);
      return;
    }
    sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  }
  function restoreAuthSession() {
    if (cachedSession) return cachedSession;
    try {
      const raw = sessionStorage.getItem(AUTH_SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed?.userId || !parsed?.username) return null;
      cachedSession = {
        userId: String(parsed.userId),
        username: String(parsed.username),
        displayName: String(parsed.displayName ?? parsed.username),
        provider: String(parsed.provider ?? AUTH_PROVIDER_LOCAL),
        at: String(parsed.at ?? (/* @__PURE__ */ new Date()).toISOString())
      };
      return cachedSession;
    } catch {
      return null;
    }
  }
  function getSession() {
    return cachedSession ?? restoreAuthSession();
  }
  function isAuthenticated() {
    return !!getSession();
  }
  function authenticate(credentials) {
    const username = String(credentials.username ?? "").trim().toLowerCase();
    const password = String(credentials.password ?? "");
    if (!username || !password) {
      return { ok: false, message: "Ingres\xE1 usuario y clave." };
    }
    const users = loadAuthUsers();
    const user = users.find((u) => u.username === username && u.active);
    if (!user || !canUserLogin(user)) {
      return { ok: false, message: "Usuario o clave incorrectos." };
    }
    if (user.password !== password) {
      return { ok: false, message: "Usuario o clave incorrectos." };
    }
    const session = {
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      provider: AUTH_PROVIDER_LOCAL,
      at: (/* @__PURE__ */ new Date()).toISOString()
    };
    persistSession(session);
    notifyAuthChange(session);
    return { ok: true, session };
  }
  function logout() {
    persistSession(null);
    notifyAuthChange(null);
  }
  function listLoginUsers() {
    return loadAuthUsers().filter((u) => canUserLogin(u));
  }

  // js/entities.js
  var ENTITY_REF_TYPE = "referencia_entidad";
  var ENTITY_UUID_TYPE = "uuid";
  var ENTITY_DATE_EXECUTION_TYPE = "dateexecution";
  var ENTITY_DATE_EXECUTION_TIMEZONE = "UTC";
  var ENTITY_USER_CONNECTED_TYPE = "userconnected";
  var AUTO_GENERATED_ENTITY_TYPES = /* @__PURE__ */ new Set([
    ENTITY_UUID_TYPE,
    ENTITY_DATE_EXECUTION_TYPE,
    ENTITY_USER_CONNECTED_TYPE
  ]);
  var ENTITY_DATA_TYPES = [
    { value: "texto", label: "Texto" },
    { value: "numero", label: "N\xFAmero" },
    { value: "fecha", label: "Fecha" },
    { value: "si_no", label: "S\xED / No" },
    { value: "texto_largo", label: "Texto largo" },
    { value: ENTITY_UUID_TYPE, label: "UUID (autogenerada)" },
    { value: ENTITY_DATE_EXECUTION_TYPE, label: "Date execution (GETUTCDATE / UTC)" },
    { value: ENTITY_USER_CONNECTED_TYPE, label: "Usuario conectado (userconnected)" },
    { value: ENTITY_REF_TYPE, label: "Referencia a entidad" }
  ];
  var TYPE_SET = new Set(ENTITY_DATA_TYPES.map((t) => t.value));
  function getEntityById(state, entityId) {
    if (!entityId) return null;
    return state.entities?.find((e) => e.id === entityId) ?? null;
  }
  function ensureEntitiesState(state) {
    if (!state) return state;
    if (!Array.isArray(state.entities)) state.entities = [];
    const validIds = new Set(state.entities.map((e) => e.id));
    for (const entity of state.entities) {
      if (!entity || typeof entity !== "object") continue;
      entity.name = String(entity.name ?? "").trim();
      if (!entity.id) entity.id = createId("entity");
      validIds.add(entity.id);
      if (!Array.isArray(entity.attributes)) entity.attributes = [];
      entity.attributes = entity.attributes.map((a) => {
        const norm = normalizeEntityAttribute(a);
        if (norm.type === ENTITY_REF_TYPE && norm.refEntityId && !validIds.has(norm.refEntityId)) {
          norm.refEntityId = null;
        }
        if (norm.type === ENTITY_REF_TYPE && norm.refEntityId === entity.id) {
          norm.refEntityId = null;
        }
        return norm;
      });
    }
    for (const entity of state.entities) {
      normalizeEntityRecord(entity, state);
    }
    return state;
  }
  function normalizeEntityRecord(entity, state) {
    entity.isBase = !!entity.isBase;
    if (entity.isBase) {
      entity.extendsBaseEntityId = null;
      return entity;
    }
    const extId = entity.extendsBaseEntityId ? String(entity.extendsBaseEntityId) : "";
    if (!extId) {
      entity.extendsBaseEntityId = null;
      return entity;
    }
    const base = getEntityById(state, extId);
    if (!base?.isBase || base.id === entity.id) {
      entity.extendsBaseEntityId = null;
    } else {
      entity.extendsBaseEntityId = extId;
    }
    return entity;
  }
  function generateEntityUuidValue() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    const hex = () => Math.floor(Math.random() * 65536).toString(16).padStart(4, "0");
    return `${hex()}${hex()}-${hex()}-4${hex().slice(1)}-a${hex().slice(1)}-${hex()}${hex()}${hex()}`;
  }
  function formatEntityDateExecutionUtc(at = /* @__PURE__ */ new Date()) {
    const d = at instanceof Date && !Number.isNaN(at.getTime()) ? at : /* @__PURE__ */ new Date();
    const pad = (n, width = 2) => String(n).padStart(width, "0");
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}.${pad(d.getUTCMilliseconds(), 3)}Z`;
  }
  function generateEntityDateExecutionValue() {
    return formatEntityDateExecutionUtc(/* @__PURE__ */ new Date());
  }
  function generateEntityUserConnectedValue() {
    return resolveConnectedAuthUserId();
  }
  function generateEntityAttributeAutoValue(attr) {
    const type = attr?.type ?? "";
    if (type === ENTITY_UUID_TYPE) return generateEntityUuidValue();
    if (type === ENTITY_DATE_EXECUTION_TYPE) return generateEntityDateExecutionValue();
    if (type === ENTITY_USER_CONNECTED_TYPE) return generateEntityUserConnectedValue();
    return null;
  }
  function isEntityAttributeAutoGenerated(attr) {
    const type = attr?.type ?? "";
    return AUTO_GENERATED_ENTITY_TYPES.has(type);
  }
  function normalizeEntityAttribute(attr) {
    const type = TYPE_SET.has(attr?.type) ? attr.type : "texto";
    const autoGenerated = AUTO_GENERATED_ENTITY_TYPES.has(type);
    const base = {
      id: attr?.id ? String(attr.id) : createId("entityAttr"),
      key: String(attr?.key ?? "").trim(),
      label: String(attr?.label ?? "").trim(),
      type,
      required: autoGenerated ? true : !!attr?.required,
      autoGenerated
    };
    if (type === ENTITY_REF_TYPE) {
      const ref = attr?.refEntityId ? String(attr.refEntityId) : "";
      return { ...base, refEntityId: ref || null };
    }
    if (type === ENTITY_DATE_EXECUTION_TYPE) {
      return {
        ...base,
        refEntityId: null,
        timezone: ENTITY_DATE_EXECUTION_TIMEZONE,
        valueFormat: "iso8601_utc"
      };
    }
    return { ...base, refEntityId: null };
  }
  function isEntityNameTaken(state, name, excludeId) {
    const n = String(name ?? "").trim().toLowerCase();
    if (!n) return false;
    return (state.entities ?? []).some(
      (e) => e.id !== excludeId && String(e.name ?? "").trim().toLowerCase() === n
    );
  }
  function countEntitiesReferencingEntity(state, targetEntityId) {
    let count = 0;
    for (const entity of state.entities ?? []) {
      const refs = (entity.attributes ?? []).some(
        (a) => a.type === ENTITY_REF_TYPE && a.refEntityId === targetEntityId
      );
      if (refs) count += 1;
    }
    return count;
  }
  function countEntitiesExtendingBase(state, baseEntityId) {
    return (state.entities ?? []).filter(
      (e) => !e.isBase && e.extendsBaseEntityId === baseEntityId
    ).length;
  }
  function renderEntityBaseSelectOptions(state, excludeEntityId, selectedId) {
    const bases = (state.entities ?? []).filter((e) => e.isBase && e.id !== excludeEntityId);
    if (!bases.length) {
      return `<option value="">\u2014 Sin entidades base \u2014</option>`;
    }
    const opts = [`<option value="">\u2014 Ninguna (independiente) \u2014</option>`];
    for (const e of bases) {
      const sel = e.id === selectedId ? " selected" : "";
      opts.push(`<option value="${escapeAttr(e.id)}"${sel}>${escapeText(e.name)}</option>`);
    }
    return opts.join("");
  }
  function validateEntityExtensionRules(state, entityId, meta) {
    const isBase = !!meta.isBase;
    const extendsId = meta.extendsBaseEntityId ? String(meta.extendsBaseEntityId) : null;
    if (isBase) {
      if (extendsId) {
        return { ok: false, message: "Una entidad base no puede extender otra entidad." };
      }
      return { ok: true };
    }
    if (!extendsId) return { ok: true };
    if (entityId && extendsId === entityId) {
      return { ok: false, message: "Una entidad no puede extenderse a s\xED misma." };
    }
    const base = getEntityById(state, extendsId);
    if (!base) {
      return { ok: false, message: "La entidad base seleccionada ya no existe." };
    }
    if (!base.isBase) {
      return {
        ok: false,
        message: `Solo pod\xE9s extender entidades marcadas como base. \xAB${base.name}\xBB no es base.`
      };
    }
    return { ok: true };
  }
  function validateEntityBaseFlagChange(state, entityId, nextIsBase) {
    if (nextIsBase) return { ok: true };
    const extenders = countEntitiesExtendingBase(state, entityId);
    if (extenders > 0) {
      const entity = getEntityById(state, entityId);
      return {
        ok: false,
        message: `No pod\xE9s quitar \xABbase\xBB de \xAB${entity?.name ?? "entidad"}\xBB: ${extenders} ${extenders === 1 ? "entidad la extiende" : "entidades la extienden"}.`
      };
    }
    return { ok: true };
  }
  function formatEntityKindLabel(state, entity) {
    if (!entity) return "";
    if (entity.isBase) {
      return `<span class="badge badge-listo">Base</span>`;
    }
    if (entity.extendsBaseEntityId) {
      const baseName = getEntityById(state, entity.extendsBaseEntityId)?.name ?? "?";
      return `<span class="catalog-muted">Extiende \xAB${escapeText(baseName)}\xBB</span>`;
    }
    return `<span class="catalog-muted">Independiente</span>`;
  }
  function renderEntityDataTypeOptions(selected) {
    return ENTITY_DATA_TYPES.map((t) => {
      const sel = t.value === selected ? " selected" : "";
      return `<option value="${escapeAttr(t.value)}"${sel}>${escapeText(t.label)}</option>`;
    }).join("");
  }
  function renderEntityRefSelectOptions(state, excludeEntityId, selectedId) {
    const candidates = (state.entities ?? []).filter((e) => e.id !== excludeEntityId);
    if (!candidates.length) {
      return `<option value="">\u2014 Sin otras entidades \u2014</option>`;
    }
    const opts = [`<option value="">\u2014 Seleccionar entidad \u2014</option>`];
    for (const e of candidates) {
      const sel = e.id === selectedId ? " selected" : "";
      opts.push(`<option value="${escapeAttr(e.id)}"${sel}>${escapeText(e.name)}</option>`);
    }
    return opts.join("");
  }
  function buildEntityRefAdjacency(state, override = null) {
    const adj = /* @__PURE__ */ new Map();
    const addEdge = (fromId, toId) => {
      if (!fromId || !toId || fromId === toId) return;
      if (!adj.has(fromId)) adj.set(fromId, /* @__PURE__ */ new Set());
      adj.get(fromId).add(toId);
    };
    for (const entity of state.entities ?? []) {
      const attrs = override?.entityId && entity.id === override.entityId ? override.attributes ?? [] : entity.attributes ?? [];
      for (const raw of attrs) {
        const attr = normalizeEntityAttribute(raw);
        if (attr.type !== ENTITY_REF_TYPE || !attr.refEntityId) continue;
        addEdge(entity.id, attr.refEntityId);
      }
    }
    if (override?.entityId && !state.entities?.some((e) => e.id === override.entityId)) {
      for (const raw of override.attributes ?? []) {
        const attr = normalizeEntityAttribute(raw);
        if (attr.type !== ENTITY_REF_TYPE || !attr.refEntityId) continue;
        addEdge(override.entityId, attr.refEntityId);
      }
    }
    return adj;
  }
  function hasEntityRefPath(adj, fromId, toId) {
    if (!fromId || !toId || fromId === toId) return fromId === toId;
    const seen = /* @__PURE__ */ new Set([fromId]);
    const stack = [fromId];
    while (stack.length) {
      const cur = stack.pop();
      const next = adj.get(cur);
      if (!next) continue;
      for (const id of next) {
        if (id === toId) return true;
        if (seen.has(id)) continue;
        seen.add(id);
        stack.push(id);
      }
    }
    return false;
  }
  function validateEntityRefRules(state, entityId, attributes) {
    const entity = entityId ? getEntityById(state, entityId) : null;
    const entityLabel = entity?.name ?? "esta entidad";
    const refTargets = /* @__PURE__ */ new Set();
    for (const raw of attributes ?? []) {
      const attr = normalizeEntityAttribute(raw);
      if (attr.type !== ENTITY_REF_TYPE) continue;
      if (!attr.key && !attr.label) continue;
      if (!attr.refEntityId) {
        return {
          ok: false,
          message: `El atributo \xAB${attr.label || attr.key}\xBB debe seleccionar una entidad referenciada.`
        };
      }
      const target = getEntityById(state, attr.refEntityId);
      if (!target) {
        return { ok: false, message: "La entidad referenciada ya no existe. Eleg\xED otra." };
      }
      if (entityId && attr.refEntityId === entityId) {
        return { ok: false, message: "Una entidad no puede referenciarse a s\xED misma." };
      }
      if (refTargets.has(attr.refEntityId)) {
        return {
          ok: false,
          message: `No pod\xE9s referenciar \xAB${target.name}\xBB m\xE1s de una vez en ${entityLabel}.`
        };
      }
      refTargets.add(attr.refEntityId);
    }
    if (!entityId) {
      return { ok: true };
    }
    const adjWithoutDraft = buildEntityRefAdjacency(state, {
      entityId,
      attributes: []
    });
    for (const raw of attributes ?? []) {
      const attr = normalizeEntityAttribute(raw);
      if (attr.type !== ENTITY_REF_TYPE || !attr.refEntityId) continue;
      if (!attr.key && !attr.label) continue;
      const targetId = attr.refEntityId;
      if (hasEntityRefPath(adjWithoutDraft, targetId, entityId)) {
        const target = getEntityById(state, targetId);
        return {
          ok: false,
          message: `La referencia a \xAB${target?.name ?? targetId}\xBB generar\xEDa un ciclo con \xAB${entityLabel}\xBB.`
        };
      }
    }
    return { ok: true };
  }
  function validateEntityDefinition(name, attributes) {
    const entityName = String(name ?? "").trim();
    if (!entityName) {
      return { ok: false, message: "El nombre de la entidad es obligatorio." };
    }
    const keys = /* @__PURE__ */ new Set();
    for (const raw of attributes ?? []) {
      const attr = normalizeEntityAttribute(raw);
      if (!attr.key && !attr.label) continue;
      if (!attr.key) {
        return { ok: false, message: "Cada atributo necesita clave (key)." };
      }
      if (!attr.label) {
        return { ok: false, message: `El atributo \xAB${attr.key}\xBB necesita etiqueta.` };
      }
      const keyLower = attr.key.toLowerCase();
      if (keys.has(keyLower)) {
        return { ok: false, message: `Clave duplicada: \xAB${attr.key}\xBB.` };
      }
      keys.add(keyLower);
      if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(attr.key)) {
        return {
          ok: false,
          message: `Clave inv\xE1lida \xAB${attr.key}\xBB. Us\xE1 letras, n\xFAmeros y gui\xF3n bajo (empez\xE1 con letra).`
        };
      }
    }
    return { ok: true };
  }
  function summarizeEntityAttributesForList(state, attributes) {
    const list = attributes ?? [];
    if (!list.length) return "\u2014";
    const parts = list.slice(0, 5).map((raw) => {
      const a = normalizeEntityAttribute(raw);
      if (a.type === ENTITY_REF_TYPE && a.refEntityId) {
        const name = getEntityById(state, a.refEntityId)?.name ?? "?";
        return `\u2192 ${name}`;
      }
      if (a.type === ENTITY_UUID_TYPE) {
        return `${a.label || a.key} (UUID autogenerado)`;
      }
      if (a.type === ENTITY_DATE_EXECUTION_TYPE) {
        return `${a.label || a.key} (dateexecution / UTC)`;
      }
      if (a.type === ENTITY_USER_CONNECTED_TYPE) {
        return `${a.label || a.key} (userconnected)`;
      }
      return a.label || a.key;
    });
    const preview = parts.filter(Boolean).join(", ");
    return list.length > 5 ? `${preview}\u2026` : preview;
  }
  function cloneEntityAttributes(attributes) {
    return (attributes ?? []).map((a) => normalizeEntityAttribute({ ...a }));
  }
  function escapeText(value) {
    return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function escapeAttr(value) {
    return escapeText(value);
  }

  // js/master-audit.js
  function ensureMasterAuditLog(state) {
    if (!state || typeof state !== "object") return state;
    if (!Array.isArray(state.masterAuditLog)) state.masterAuditLog = [];
    return state;
  }
  function recordMasterAudit(state, entry) {
    ensureMasterAuditLog(state);
    const userId = resolveConnectedAuthUserId();
    const user = getUserById(userId);
    state.masterAuditLog.unshift({
      id: createId("masterAudit"),
      at: (/* @__PURE__ */ new Date()).toISOString(),
      userId,
      userLabel: user?.displayName ?? user?.username ?? userId,
      area: entry.area,
      action: entry.action,
      refId: entry.refId ?? null,
      label: String(entry.label ?? "").trim(),
      detail: String(entry.detail ?? "").trim()
    });
    if (state.masterAuditLog.length > 500) {
      state.masterAuditLog.length = 500;
    }
  }
  function masterAuditAreaLabel(area) {
    if (area === "flowType") return "Tipo de flujo";
    if (area === "entity") return "Entidad";
    if (area === "masterDefinition") return "Definici\xF3n de maestros";
    if (area === "masterRecord") return "Registro de maestro";
    return area;
  }
  function masterAuditActionLabel(action) {
    if (action === "create") return "Alta";
    if (action === "update") return "Modificaci\xF3n";
    if (action === "delete") return "Baja";
    return action;
  }

  // js/master-definitions.js
  function getMasterDefinitionById(state, definitionId) {
    if (!definitionId) return null;
    return state.masterDefinitions?.find((d) => d.id === definitionId) ?? null;
  }
  function listMasterDefinitionsForAbm(state) {
    return (state.masterDefinitions ?? []).filter((d) => (d.entityIds ?? []).length > 0);
  }
  function isMasterDefinitionAvailableForAbm(state, definitionId) {
    const def = getMasterDefinitionById(state, definitionId);
    return !!def && (def.entityIds ?? []).length > 0;
  }
  function ensureMasterDefinitionsState(state) {
    if (!state || typeof state !== "object") return state;
    if (!Array.isArray(state.masterDefinitions)) state.masterDefinitions = [];
    const validEntityIds = new Set((state.entities ?? []).map((e) => e.id));
    state.masterDefinitions = state.masterDefinitions.map((raw) => normalizeMasterDefinition(raw, validEntityIds));
    return state;
  }
  function normalizeMasterDefinition(raw, validEntityIds) {
    const entityIds = (raw?.entityIds ?? []).map((id) => String(id)).filter((id) => validEntityIds.has(id));
    const unique = [...new Set(entityIds)];
    return {
      id: raw?.id ? String(raw.id) : createId("masterDef"),
      name: String(raw?.name ?? "").trim(),
      description: String(raw?.description ?? "").trim(),
      entityIds: unique
    };
  }
  function isMasterDefinitionNameTaken(state, name, excludeId) {
    const n = String(name ?? "").trim().toLowerCase();
    if (!n) return false;
    return (state.masterDefinitions ?? []).some(
      (d) => d.id !== excludeId && String(d.name ?? "").trim().toLowerCase() === n
    );
  }
  function countMasterDefinitionsUsingEntity(state, entityId) {
    if (!entityId) return 0;
    return (state.masterDefinitions ?? []).filter((d) => (d.entityIds ?? []).includes(entityId)).length;
  }
  function validateMasterDefinition(state, name, entityIds, excludeId) {
    const label = String(name ?? "").trim();
    if (!label) {
      return { ok: false, message: "El nombre de la definici\xF3n es obligatorio." };
    }
    if (isMasterDefinitionNameTaken(state, label, excludeId)) {
      return { ok: false, message: `Ya existe una definici\xF3n con el nombre \xAB${label}\xBB.` };
    }
    const ids = [...new Set((entityIds ?? []).map((id) => String(id)).filter(Boolean))];
    if (!ids.length) {
      return { ok: false, message: "Seleccion\xE1 al menos una entidad del maestro." };
    }
    for (const id of ids) {
      if (!getEntityById(state, id)) {
        return { ok: false, message: "Una entidad seleccionada ya no existe. Actualiz\xE1 la definici\xF3n." };
      }
    }
    return { ok: true };
  }
  function summarizeMasterDefinitionEntities(state, def) {
    const names = (def.entityIds ?? []).map((id) => getEntityById(state, id)?.name).filter(Boolean);
    if (!names.length) return "\u2014";
    const preview = names.slice(0, 4).join(", ");
    return names.length > 4 ? `${preview}\u2026 (+${names.length - 4})` : preview;
  }
  function escapeText2(value) {
    return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function renderMasterDefinitionEntityChecklist(state, selectedIds) {
    const selected = new Set(selectedIds ?? []);
    const entities = state.entities ?? [];
    if (!entities.length) {
      return `<p class="form-hint">No hay entidades. Cre\xE1 al menos una en Maestros \u2192 Entidades.</p>`;
    }
    return `<div class="master-def-entity-checklist" role="group" aria-label="Entidades incluidas">
    ${entities.map((e) => {
      const checked = selected.has(e.id) ? " checked" : "";
      const attrCount = (e.attributes ?? []).length;
      return `<label class="master-def-entity-check">
          <input type="checkbox" name="entityIds" value="${escapeText2(e.id)}"${checked} />
          <span class="master-def-entity-check__label">
            <strong>${escapeText2(e.name)}</strong>
            <span class="form-hint">${attrCount} ${attrCount === 1 ? "atributo" : "atributos"} \xB7 <code>${escapeText2(e.id)}</code></span>
          </span>
        </label>`;
    }).join("")}
  </div>`;
  }

  // js/master-records.js
  function ensureMasterRecordsState(state) {
    if (!state || typeof state !== "object") return state;
    if (!Array.isArray(state.masterRecords)) state.masterRecords = [];
    const validDefIds = new Set((state.masterDefinitions ?? []).map((d) => d.id));
    state.masterRecords = state.masterRecords.filter((r) => validDefIds.has(String(r.definitionId))).map((r) => {
      const norm = normalizeMasterRecord(r);
      norm.values = syncMasterRecordValuesWithDefinition(state, norm.definitionId, norm.values);
      return norm;
    });
    return state;
  }
  function syncMasterRecordValuesWithDefinition(state, definitionId, values) {
    const base = buildEmptyValuesForDefinition(state, definitionId);
    const def = getMasterDefinitionById(state, definitionId);
    if (!def) return base;
    const merged = {};
    for (const entityId of def.entityIds ?? []) {
      const entity = getEntityById(state, entityId);
      const allowedKeys = new Set(
        (entity?.attributes ?? []).map((a) => normalizeEntityAttribute(a).key).filter(Boolean)
      );
      merged[entityId] = { ...base[entityId] ?? {} };
      const prev = values?.[entityId] ?? {};
      for (const key of allowedKeys) {
        if (Object.prototype.hasOwnProperty.call(prev, key)) {
          merged[entityId][key] = prev[key];
        }
      }
    }
    return merged;
  }
  function cloneMasterRecordValues(values) {
    const out = {};
    if (!values || typeof values !== "object") return out;
    for (const [entityId, bag] of Object.entries(values)) {
      if (!bag || typeof bag !== "object") continue;
      out[String(entityId)] = { ...bag };
    }
    return out;
  }
  function normalizeMasterRecordHistory(raw) {
    if (!Array.isArray(raw)) return [];
    const entries = [];
    for (const item of raw) {
      if (!item || typeof item !== "object") continue;
      const version = Number(item.version);
      if (!Number.isFinite(version) || version < 1) continue;
      entries.push({
        version,
        values: cloneMasterRecordValues(item.values),
        archivedAt: String(item.archivedAt ?? (/* @__PURE__ */ new Date()).toISOString()),
        updatedAt: item.updatedAt ? String(item.updatedAt) : void 0
      });
    }
    return entries.sort((a, b) => b.version - a.version);
  }
  function normalizeMasterRecord(raw) {
    const values = cloneMasterRecordValues(raw?.values);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const id = raw?.id ? String(raw.id) : createId("masterRecord");
    const statusRaw = raw?.status;
    const status = statusRaw === "historico" ? "historico" : "vigente";
    const version = typeof raw?.version === "number" && raw.version >= 1 ? raw.version : 1;
    return {
      id,
      definitionId: String(raw?.definitionId ?? ""),
      values,
      createdAt: String(raw?.createdAt ?? now),
      updatedAt: String(raw?.updatedAt ?? raw?.createdAt ?? now),
      status,
      version,
      history: normalizeMasterRecordHistory(raw?.history),
      lineageId: String(raw?.lineageId ?? id)
    };
  }
  function masterRecordUsageStatusLabel(record) {
    if (record?.status === "historico") return "Hist\xF3rico";
    const v = record?.version ?? 1;
    return v > 1 ? `Vigente \xB7 v${v}` : "Vigente";
  }
  function listVigenteMasterRecordsForDefinition(state, definitionId) {
    if (!definitionId) return [];
    return (state.masterRecords ?? []).filter(
      (r) => r.definitionId === definitionId && (r.status ?? "vigente") === "vigente"
    );
  }
  function masterRecordValuesEqual(a, b) {
    return JSON.stringify(a ?? {}) === JSON.stringify(b ?? {});
  }
  function pushMasterRecordHistoryBeforeUpdate(record) {
    if (!Array.isArray(record.history)) record.history = [];
    const prevVersion = record.version ?? 1;
    record.history.unshift({
      version: prevVersion,
      values: cloneMasterRecordValues(record.values),
      archivedAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: record.updatedAt
    });
    if (record.history.length > 100) {
      record.history.length = 100;
    }
    record.version = prevVersion + 1;
  }
  function countMasterRecordsForDefinition(state, definitionId) {
    return listVigenteMasterRecordsForDefinition(state, definitionId).length;
  }
  function getMasterRecordById(state, recordId) {
    if (!recordId) return null;
    return state.masterRecords?.find((r) => r.id === recordId) ?? null;
  }
  function buildEmptyValuesForDefinition(state, definitionId) {
    const values = {};
    const def = getMasterDefinitionById(state, definitionId);
    if (!def) return values;
    for (const entityId of def.entityIds ?? []) {
      const entity = getEntityById(state, entityId);
      if (!entity) continue;
      values[entityId] = {};
      for (const raw of entity.attributes ?? []) {
        const attr = normalizeEntityAttribute(raw);
        if (!attr.key) continue;
        if (isEntityAttributeAutoGenerated(attr)) {
          values[entityId][attr.key] = "";
        } else if (attr.type === "si_no") {
          values[entityId][attr.key] = false;
        } else {
          values[entityId][attr.key] = "";
        }
      }
    }
    return values;
  }
  function applyAutoGeneratedAttributeValues(state, definitionId, values, opts = {}) {
    const def = getMasterDefinitionById(state, definitionId);
    if (!def) return values;
    for (const entityId of def.entityIds ?? []) {
      const entity = getEntityById(state, entityId);
      if (!entity) continue;
      if (!values[entityId]) values[entityId] = {};
      for (const raw of entity.attributes ?? []) {
        const attr = normalizeEntityAttribute(raw);
        if (!attr.key || !isEntityAttributeAutoGenerated(attr)) continue;
        const current = values[entityId][attr.key];
        if (opts.isCreate || current === "" || current == null) {
          values[entityId][attr.key] = generateEntityAttributeAutoValue(attr) ?? "";
        }
      }
    }
    return values;
  }
  function validateMasterRecordValues(state, definitionId, values) {
    const def = getMasterDefinitionById(state, definitionId);
    if (!def) {
      return { ok: false, message: "La definici\xF3n de maestros seleccionada ya no existe." };
    }
    if (!(def.entityIds ?? []).length) {
      return { ok: false, message: "La definici\xF3n no tiene entidades configuradas." };
    }
    for (const entityId of def.entityIds) {
      const entity = getEntityById(state, entityId);
      if (!entity) {
        return { ok: false, message: "Falta una entidad de la definici\xF3n en el cat\xE1logo." };
      }
      const entityValues = values[entityId] ?? {};
      for (const raw of entity.attributes ?? []) {
        const attr = normalizeEntityAttribute(raw);
        if (!attr.key || isEntityAttributeAutoGenerated(attr)) continue;
        if (!attr.required) continue;
        const val = entityValues[attr.key];
        if (attr.type === "si_no") {
          continue;
        }
        if (val === "" || val == null) {
          return {
            ok: false,
            message: `\xAB${attr.label || attr.key}\xBB (${entity.name}) es obligatorio.`
          };
        }
      }
    }
    return { ok: true };
  }
  function summarizeMasterRecordValues(state, definitionId, values) {
    return summarizeMasterRecordForList(state, {
      definitionId,
      values
    });
  }
  function summarizeMasterRecordForList(state, record) {
    const def = getMasterDefinitionById(state, record.definitionId);
    const parts = [];
    for (const entityId of def?.entityIds ?? []) {
      const entity = getEntityById(state, entityId);
      if (!entity) continue;
      const bag = record.values?.[entityId] ?? {};
      for (const raw of entity.attributes ?? []) {
        const attr = normalizeEntityAttribute(raw);
        if (!attr.key || isEntityAttributeAutoGenerated(attr)) continue;
        const v = bag[attr.key];
        if (v === "" || v == null) continue;
        parts.push(`${attr.label || attr.key}: ${String(v)}`);
        if (parts.length >= 3) break;
      }
      if (parts.length >= 3) break;
    }
    return parts.length ? parts.join(" \xB7 ") : "\u2014";
  }

  // js/flow-lifecycle.js
  function normalizeFlowMeta(flow) {
    if (!flow.lineageId) {
      flow.lineageId = flow.id;
    }
    if (flow.status === "listo" || flow.status === "deprecado") {
      if (flow.version == null || typeof flow.version !== "number") {
        flow.version = 1;
      }
    } else if (flow.status !== "borrador") {
      flow.status = "borrador";
    }
    if (flow.status === "borrador") {
      flow.version = null;
    }
    if (flow.supersedesFlowId === void 0) {
      flow.supersedesFlowId = null;
    }
  }
  function statusLabel(status) {
    if (status === "listo") return "Listo";
    if (status === "deprecado") return "Deprecado";
    return "Borrador";
  }
  function isFlowEditable(flow) {
    return flow?.status === "borrador";
  }
  function isFlowDeprecated(flow) {
    return flow?.status === "deprecado";
  }
  function designerReadOnlyMessage(flow) {
    if (isFlowDeprecated(flow)) {
      return "Esta versi\xF3n est\xE1 deprecada. Solo pod\xE9s consultar el diagrama; no se puede editar.";
    }
    if (flow?.status === "listo") {
      return "Flujo en estado Listo. Us\xE1 \xABVersionar\xBB en el cat\xE1logo para crear un borrador editable.";
    }
    return "Este flujo no es editable.";
  }
  function findDraftInLineage(flows, lineageId) {
    return flows.find((f) => f.lineageId === lineageId && f.status === "borrador") ?? null;
  }
  function findActiveListoInLineage(flows, lineageId) {
    return flows.find((f) => f.lineageId === lineageId && f.status === "listo") ?? null;
  }
  function buildCatalogLineageGroups(flows) {
    const byLineage = /* @__PURE__ */ new Map();
    for (const flow of flows ?? []) {
      const lineageId = String(flow.lineageId ?? flow.id);
      if (!byLineage.has(lineageId)) byLineage.set(lineageId, []);
      byLineage.get(lineageId).push(flow);
    }
    const groups = [];
    for (const [lineageId, members] of byLineage) {
      const listo = members.find((f) => f.status === "listo") ?? null;
      const borrador = members.find((f) => f.status === "borrador") ?? null;
      const deprecados = members.filter((f) => f.status === "deprecado").sort((a, b) => (Number(b.version) || 0) - (Number(a.version) || 0));
      const anchor = listo ?? borrador ?? members[0];
      groups.push({
        lineageId,
        listo,
        borrador,
        deprecados,
        displayName: String(anchor?.name ?? "Flujo")
      });
    }
    groups.sort((a, b) => a.displayName.localeCompare(b.displayName, "es"));
    return groups;
  }
  function flowStatusBadgeClass(status) {
    if (status === "listo") return "listo";
    if (status === "deprecado") return "deprecado";
    return "borrador";
  }
  function formatFlowVersion(flow) {
    if (flow.status === "borrador" || flow.version == null) return "\u2014";
    return `v${flow.version}`;
  }
  function createVersionDraft(flows, sourceFlowId) {
    const source = flows.find((f) => f.id === sourceFlowId);
    if (!source) return { error: "Flujo no encontrado." };
    if (source.status !== "listo") {
      return { error: "Solo pod\xE9s versionar un flujo en estado listo." };
    }
    const lineageId = source.lineageId ?? source.id;
    if (findDraftInLineage(flows, lineageId)) {
      return {
        error: "Ya hay un borrador en este flujo. Confirmalo o elimin\xE1lo antes de versionar de nuevo."
      };
    }
    const draft = cloneFlowSnapshot(source);
    draft.id = createId("flow");
    draft.lineageId = lineageId;
    draft.status = "borrador";
    draft.version = null;
    draft.supersedesFlowId = source.id;
    return { flow: draft };
  }
  function publishFlow(flows, flowId) {
    const flow = flows.find((f) => f.id === flowId);
    if (!flow) return { ok: false, error: "Flujo no encontrado." };
    if (flow.status !== "borrador") {
      return { ok: false, error: "Solo pod\xE9s confirmar un flujo en borrador." };
    }
    const lineageId = flow.lineageId ?? flow.id;
    if (flow.supersedesFlowId) {
      const parent = flows.find((f) => f.id === flow.supersedesFlowId);
      if (!parent || parent.status !== "listo") {
        return {
          ok: false,
          error: "No se encontr\xF3 la versi\xF3n publicada que este borrador debe reemplazar."
        };
      }
      const nextVersion = (typeof parent.version === "number" ? parent.version : 0) + 1;
      parent.status = "deprecado";
      flow.version = nextVersion;
      flow.status = "listo";
      flow.supersedesFlowId = null;
      normalizeFlowMeta(flow);
      return { ok: true };
    }
    const existingListo = findActiveListoInLineage(flows, lineageId);
    if (existingListo && existingListo.id !== flow.id) {
      return {
        ok: false,
        error: "Ya existe una versi\xF3n listo en este flujo. Us\xE1 Versionar para crear un borrador."
      };
    }
    flow.version = 1;
    flow.status = "listo";
    flow.supersedesFlowId = null;
    normalizeFlowMeta(flow);
    return { ok: true };
  }

  // js/storage.js
  var STORAGE_KEY = "gestor_flujos_prototipo_v3";
  var LEGACY_STORAGE_KEY = "gestor_flujos_prototipo_v2";
  var emptyState = () => ({
    flows: [],
    instances: [],
    flowTypes: [],
    entities: [],
    masterAuditLog: [],
    masterDefinitions: [],
    masterRecords: []
  });
  function normalizeLoadedState(parsed) {
    const flows = Array.isArray(parsed.flows) ? parsed.flows : [];
    for (const flow of flows) {
      normalizeFlowMeta(flow);
      normalizeFlowTransitions(flow);
      migrateLegacyFlowInputToStart(flow);
      normalizeFlowContracts(flow);
    }
    const instances = Array.isArray(parsed.instances) ? parsed.instances : [];
    for (const inst of instances) {
      if (!inst.context) inst.context = {};
      if (inst.flowSnapshot) {
        normalizeFlowTransitions(inst.flowSnapshot);
        migrateLegacyFlowInputToStart(inst.flowSnapshot);
        normalizeFlowContracts(inst.flowSnapshot);
      }
    }
    const base = {
      flows,
      instances,
      flowTypes: Array.isArray(parsed.flowTypes) ? parsed.flowTypes : [],
      entities: Array.isArray(parsed.entities) ? parsed.entities : [],
      masterAuditLog: Array.isArray(parsed.masterAuditLog) ? parsed.masterAuditLog : [],
      masterDefinitions: Array.isArray(parsed.masterDefinitions) ? parsed.masterDefinitions : [],
      masterRecords: Array.isArray(parsed.masterRecords) ? parsed.masterRecords : []
    };
    const withMasters = ensureMasterDefinitionsState(ensureEntitiesState(ensureFlowTypesState(base)));
    return ensureMasterAuditLog(ensureMasterRecordsState(withMasters));
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
  var sampleFlowTypeId = null;
  function setSampleFlowTypeId(flowTypeId) {
    sampleFlowTypeId = flowTypeId;
  }
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
      lineageId: flowId,
      type: "Aprobaci\xF3n",
      flowTypeId: sampleFlowTypeId ?? void 0,
      name: "Aprobaci\xF3n de gasto",
      description: "Ejemplo BPMN: Start \u2192 User Task \u2192 XOR Gateway \u2192 Service Task / End.",
      status: "listo",
      version: 1,
      supersedesFlowId: null,
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
    if (!Array.isArray(state.flowTypes)) state.flowTypes = [];
    if (!Array.isArray(state.entities)) state.entities = [];
    if (state.flows.length > 0) return state;
    const gastoEntityId = createId("entity");
    state.entities.push({
      id: gastoEntityId,
      name: "Gasto",
      isBase: true,
      extendsBaseEntityId: null,
      attributes: [
        { id: createId("entityAttr"), key: "titulo", label: "T\xEDtulo del gasto", type: "texto", required: true },
        { id: createId("entityAttr"), key: "monto", label: "Monto", type: "numero", required: true }
      ]
    });
    if (!Array.isArray(state.masterDefinitions)) state.masterDefinitions = [];
    const masterDefId = createId("masterDef");
    state.masterDefinitions.push({
      id: masterDefId,
      name: "Maestro de gastos",
      description: "Definici\xF3n basada en la entidad Gasto.",
      entityIds: [gastoEntityId]
    });
    if (!Array.isArray(state.masterRecords)) state.masterRecords = [];
    const seedRecordId = createId("masterRecord");
    const seedNow = (/* @__PURE__ */ new Date()).toISOString();
    state.masterRecords.push({
      id: seedRecordId,
      lineageId: seedRecordId,
      definitionId: masterDefId,
      values: {
        [gastoEntityId]: { titulo: "Gasto demo seed", monto: 1500 }
      },
      status: "vigente",
      version: 1,
      history: [],
      createdAt: seedNow,
      updatedAt: seedNow
    });
    const approvalTypeId = createId("flowType");
    state.flowTypes.push({
      id: approvalTypeId,
      name: "Aprobaci\xF3n",
      description: "Flujos de aprobaci\xF3n y validaci\xF3n (ejemplo del mock)."
    });
    setSampleFlowTypeId(approvalTypeId);
    state.flows.push(createSampleFlow());
    return state;
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
  function isCatalogActionsBlocked() {
    return isMobileDesignerContext();
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
    if (isCatalogActionsBlocked()) {
      const { body } = designerBlockedMessage();
      return `<div class="catalog-viewport-warning catalog-viewport-warning--blocked" role="alert">${body}</div>`;
    }
    const tier = getDesignerViewportTier();
    if (tier === "blocked") {
      return `<div class="catalog-viewport-warning catalog-viewport-warning--critical" role="status">Pod\xE9s crear y gestionar flujos desde ac\xE1. El lienzo BPMN requiere una ventana mayor a 800\xD7600 p\xEDxeles.</div>`;
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

  // js/component-attributes-modal.js
  var DATA_TYPE_OPTIONS = [
    { value: "texto", label: "Texto" },
    { value: "numero", label: "N\xFAmero" },
    { value: "fecha", label: "Fecha" },
    { value: "si_no", label: "S\xED / No" }
  ];
  var ATTR_LIST_ICON_EDIT = `<svg class="component-attr-action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round"/></svg>`;
  var ATTR_LIST_ICON_TRASH = `<svg class="component-attr-action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V5h6v2M10 11v6M14 11v6M6 7l1 12h10l1-12" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  var ATTR_LIST_ICON_VIEW = `<svg class="component-attr-action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" fill="none" stroke="currentColor" stroke-width="1.75"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.75"/></svg>`;
  function renderComponentAttributeChipsHtml(attrs) {
    const items = summarizeAttributes(attrs);
    if (!items.length) {
      return `<p class="component-attr-empty">Sin atributos definidos.</p>`;
    }
    return items.map((a) => {
      const card = a.cardinality === INPUT_CARDINALITY.LISTA ? `lista \xB7 ${a.optionCount} opc.` : "\xFAnico";
      const req = a.required ? " *" : "";
      return `<span class="chip component-attr-chip">${escapeHtml(a.label)} \xB7 ${escapeHtml(card)}${req}</span>`;
    }).join("");
  }
  function attributeEditSignature(attr) {
    if (!attr) return "";
    return JSON.stringify({
      key: String(attr.key ?? "").trim(),
      label: String(attr.label ?? "").trim(),
      dataType: attr.dataType ?? "texto",
      cardinality: attr.cardinality ?? INPUT_CARDINALITY.UNICO,
      required: !!attr.required,
      order: typeof attr.order === "number" ? attr.order : 0,
      listOptions: (attr.listOptions ?? []).map((o) => ({
        label: String(o.label ?? "").trim(),
        required: !!o.required
      }))
    });
  }
  function cloneAttributeSnapshot(attr) {
    return {
      ...attr,
      listOptions: (attr.listOptions ?? []).map((o) => ({ ...o }))
    };
  }
  function renderAttributeDetailForm(attr, index, scope, readOnly) {
    const dis = readOnly ? " disabled" : "";
    const typeOpts = DATA_TYPE_OPTIONS.map(
      (o) => `<option value="${o.value}" ${attr.dataType === o.value ? "selected" : ""}>${o.label}</option>`
    ).join("");
    const isLista = attr.cardinality === INPUT_CARDINALITY.LISTA;
    const optionsHtml = (attr.listOptions ?? []).map(
      (opt, oi) => `
      <div class="component-attr-option-row" data-opt-index="${oi}" ${opt.id ? `data-opt-id="${escapeHtml(opt.id)}"` : ""}>
        <input type="text" data-field="opt-label" value="${escapeHtml(opt.label)}" placeholder="Etiqueta opci\xF3n"${dis} />
        <label class="component-attr-opt-req"><input type="checkbox" data-field="opt-required" ${opt.required ? "checked" : ""}${dis} /> Obligatoria</label>
        ${readOnly ? "" : `<button type="button" class="btn btn-sm btn-danger" data-rm-opt>\xD7</button>`}
      </div>`
    ).join("");
    return `
    <div class="component-attr-detail-form" data-attr-detail data-attr-index="${index}" data-attr-scope="${scope}" ${attr.id ? `data-attr-id="${escapeHtml(attr.id)}"` : ""}>
      <div class="component-attr-detail-head">
        <strong>Par\xE1metros del atributo</strong>
      </div>
      <div class="form-grid component-attr-fields">
        <div class="form-row"><label>Clave</label><input data-field="key" pattern="[a-z0-9_]+" required value="${escapeHtml(attr.key)}" placeholder="ej. monto"${dis} /></div>
        <div class="form-row"><label>Etiqueta</label><input data-field="label" required value="${escapeHtml(attr.label)}"${dis} /></div>
        <div class="form-row"><label>Tipo</label><select data-field="dataType"${dis}>${typeOpts}</select></div>
        <div class="form-row"><label>Cardinalidad</label>
          <select data-field="cardinality"${dis}>
            <option value="unico" ${!isLista ? "selected" : ""}>\xDAnico</option>
            <option value="lista" ${isLista ? "selected" : ""}>Lista</option>
          </select>
        </div>
        <div class="form-row component-attr-order-row">
          <label>Orden</label>
          <input type="number" data-field="order" min="1" step="1" value="${(typeof attr.order === "number" ? attr.order : index) + 1}"${dis} />
          <span class="form-hint component-attr-order-hint">Tambi\xE9n pod\xE9s arrastrar filas en el listado.</span>
        </div>
        <label class="component-attr-required"><input type="checkbox" data-field="required" ${attr.required ? "checked" : ""}${dis} /> Obligatorio</label>
      </div>
      <div class="component-attr-options" data-options-block style="${isLista ? "" : "display:none"}">
        <div class="component-attr-options-head">
          <span>Opciones (lista)</span>
          ${readOnly ? "" : `<button type="button" class="btn btn-sm" data-add-opt>+ Opci\xF3n</button>`}
        </div>
        <div class="component-attr-options-list">${optionsHtml || `<p class="component-attr-empty">Agreg\xE1 al menos una opci\xF3n.</p>`}</div>
      </div>
      <div class="component-attr-detail-footer">
        ${readOnly ? `<button type="button" class="btn btn-sm" data-close-attr-detail data-close-scope="${scope}">Cerrar</button>` : `<button type="button" class="btn btn-sm" data-cancel-attr-detail data-cancel-scope="${scope}">Cancelar</button>
               <button type="button" class="btn btn-sm btn-primary" data-save-attr-detail data-save-scope="${scope}" disabled>Guardar</button>`}
      </div>
    </div>`;
  }
  function attributeListTypeLabel(attr) {
    return DATA_TYPE_OPTIONS.find((o) => o.value === attr.dataType)?.label ?? attr.dataType ?? "\u2014";
  }
  function attributeListCardinalityLabel(attr) {
    return attr.cardinality === INPUT_CARDINALITY.LISTA ? "Lista" : "\xDAnico";
  }
  function renderDefinedAttributesList(attrs, scope, selectedIndex, readOnly, detailOpen) {
    if (!attrs.length) {
      return `<p class="component-attr-empty">No hay atributos definidos. Us\xE1 \xAB+ Atributo\xBB para agregar uno.</p>`;
    }
    const safeIndex = Math.min(Math.max(0, selectedIndex), attrs.length - 1);
    const dragHint = readOnly ? "" : ` data-attr-dnd-list="${scope}"`;
    const rows = attrs.map((a, i) => {
      const keyCell = a.key?.trim() ? `<code>${escapeHtml(a.key)}</code>` : `<span class="component-attr-cell-muted">\u2014</span>`;
      const labelCell = a.label?.trim() ? escapeHtml(a.label) : `<span class="component-attr-cell-muted">\u2014</span>`;
      const orderNum = (typeof a.order === "number" ? a.order : i) + 1;
      const requiredCell = a.required ? "S\xED" : "No";
      const dragHandle = readOnly ? `<span class="component-attr-list-drag component-attr-list-drag--placeholder" aria-hidden="true"></span>` : `<span class="component-attr-list-drag" draggable="true" data-attr-drag-handle="${i}" data-drag-scope="${scope}" title="Arrastrar para reordenar" aria-hidden="true">\u22EE\u22EE</span>`;
      const editBtn = readOnly ? `<button type="button" class="component-attr-icon-btn" data-list-edit-attr="${i}" data-list-scope="${scope}" title="Ver par\xE1metros" aria-label="Ver par\xE1metros">${ATTR_LIST_ICON_VIEW}</button>` : `<button type="button" class="component-attr-icon-btn" data-list-edit-attr="${i}" data-list-scope="${scope}" title="Editar par\xE1metros" aria-label="Editar par\xE1metros">${ATTR_LIST_ICON_EDIT}</button>`;
      const deleteBtn = readOnly ? "" : `<button type="button" class="component-attr-icon-btn component-attr-icon-btn--danger" data-list-rm-attr="${i}" data-list-scope="${scope}" title="Eliminar atributo" aria-label="Eliminar atributo">${ATTR_LIST_ICON_TRASH}</button>`;
      const isEditing = detailOpen && i === safeIndex;
      return `<li class="component-attr-defined-row ${isEditing ? "is-selected" : ""}" data-attr-list-index="${i}" data-attr-list-scope="${scope}" role="option" aria-selected="${isEditing ? "true" : "false"}">
        ${dragHandle}
        <span class="component-attr-cell component-attr-cell-ord">${orderNum}</span>
        <span class="component-attr-cell component-attr-cell-key">${keyCell}</span>
        <span class="component-attr-cell component-attr-cell-label">${labelCell}</span>
        <span class="component-attr-cell">${escapeHtml(attributeListTypeLabel(a))}</span>
        <span class="component-attr-cell">${escapeHtml(attributeListCardinalityLabel(a))}</span>
        <span class="component-attr-cell component-attr-cell-req ${a.required ? "is-yes" : ""}">${requiredCell}</span>
        <div class="component-attr-row-actions">${editBtn}${deleteBtn}</div>
      </li>`;
    }).join("");
    return `<div class="component-attr-table">
    <div class="component-attr-table-head" aria-hidden="false">
      <span class="component-attr-th component-attr-th-drag"></span>
      <span class="component-attr-th component-attr-th-ord">#</span>
      <span class="component-attr-th">Clave</span>
      <span class="component-attr-th">Etiqueta</span>
      <span class="component-attr-th">Tipo</span>
      <span class="component-attr-th">Cardinalidad</span>
      <span class="component-attr-th">Obligatorio</span>
      <span class="component-attr-th component-attr-th-actions">Acciones</span>
    </div>
    <ul class="component-attr-defined-list" role="listbox" aria-label="Atributos definidos"${dragHint}>${rows}</ul>
  </div>`;
  }
  function renderAttributeMasterDetail(attrs, scope, readOnly, selectedIndex, detailOpen) {
    const safeIndex = attrs.length ? Math.min(Math.max(0, selectedIndex), attrs.length - 1) : 0;
    const listHtml = renderDefinedAttributesList(attrs, scope, safeIndex, readOnly, detailOpen);
    let detailHtml = "";
    if (detailOpen && attrs.length > 0) {
      detailHtml = renderAttributeDetailForm(attrs[safeIndex], safeIndex, scope, readOnly);
    }
    return `
    <div class="component-attr-panel component-attr-panel--split" data-attr-panel="${scope}">
      <div class="component-attr-master">
        <div class="component-attr-master-head">
          <span>Atributos definidos (${scope === "output" ? "salida" : "entrada"})</span>
          ${readOnly ? "" : `<button type="button" class="btn btn-sm" data-add-attr data-add-scope="${scope}">+ Atributo</button>`}
        </div>
        <div class="component-attr-list-select">${listHtml}</div>
      </div>
      <div class="component-attr-detail ${detailOpen ? "is-open" : ""}" data-attr-detail-panel="${scope}" ${detailOpen ? "" : "hidden"}>${detailHtml}</div>
    </div>`;
  }
  function repaintPanel(panel, attrs, scope, readOnly, selectedIndex, detailOpen) {
    const wrap = panel.closest(".component-attr-panels");
    if (!wrap) return;
    const html = renderAttributeMasterDetail(attrs, scope, readOnly, selectedIndex, detailOpen);
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    const next = tmp.firstElementChild;
    if (next) panel.replaceWith(next);
  }
  function refreshDefinedListDom(root, scope, attrs, selectedIndex, readOnly, detailOpen) {
    const panel = getAttrPanel(root, scope);
    const host = panel?.querySelector(".component-attr-list-select");
    if (!host) return;
    host.innerHTML = renderDefinedAttributesList(attrs, scope, selectedIndex, readOnly, detailOpen);
  }
  function getAttrPanel(root, scope) {
    return root.querySelector(`[data-attr-panel="${scope}"]`);
  }
  function readAttributeFromDetailForm(detail) {
    if (!detail) return null;
    const key = detail.querySelector('[data-field="key"]')?.value?.trim() ?? "";
    const label = detail.querySelector('[data-field="label"]')?.value?.trim() ?? "";
    const dataType = detail.querySelector('[data-field="dataType"]')?.value ?? "texto";
    const cardinality = detail.querySelector('[data-field="cardinality"]')?.value ?? INPUT_CARDINALITY.UNICO;
    const required = detail.querySelector('[data-field="required"]')?.checked ?? false;
    const listOptions = [];
    if (cardinality === INPUT_CARDINALITY.LISTA) {
      detail.querySelectorAll(".component-attr-option-row").forEach((row) => {
        listOptions.push({
          id: row.dataset.optId || void 0,
          label: row.querySelector('[data-field="opt-label"]')?.value?.trim() ?? "",
          required: row.querySelector('[data-field="opt-required"]')?.checked ?? false
        });
      });
    }
    const orderInput = detail.querySelector('[data-field="order"]');
    let order = orderInput instanceof HTMLInputElement && orderInput.value !== "" ? Math.max(0, Math.floor(Number(orderInput.value)) - 1) : void 0;
    if (order === void 0 || Number.isNaN(order)) {
      order = Number(detail.dataset.attrIndex) || 0;
    }
    return {
      id: detail.dataset.attrId || createId("attr"),
      key,
      label,
      dataType,
      cardinality,
      required,
      order,
      listOptions: listOptions.map((o) => ({
        id: o.id || createId("opt"),
        label: o.label,
        required: o.required
      }))
    };
  }
  function syncDetailFormToList(root, scope, list, selectedIndex) {
    const panel = getAttrPanel(root, scope);
    const detail = panel?.querySelector("[data-attr-detail]");
    if (!detail || !list.length) return;
    const idx = Math.min(Math.max(0, selectedIndex), list.length - 1);
    const parsed = readAttributeFromDetailForm(detail);
    if (parsed) list[idx] = parsed;
  }
  function reorderAttributeInList(list, fromIndex, toIndex) {
    const max = list.length - 1;
    if (max < 0 || fromIndex < 0 || fromIndex > max) return fromIndex;
    const clampedTo = Math.min(max, Math.max(0, toIndex));
    if (fromIndex === clampedTo) return fromIndex;
    const [item] = list.splice(fromIndex, 1);
    list.splice(clampedTo, 0, item);
    reindexAttributeOrders(list);
    return clampedTo;
  }
  function moveAttributeByOrderField(list, selectedIndex, oneBasedOrder) {
    if (!list.length) return 0;
    const target = Math.min(list.length, Math.max(1, Math.floor(oneBasedOrder)));
    return reorderAttributeInList(list, selectedIndex, target - 1);
  }
  function parseListRowIndex(el, attrName) {
    const idx = Number.parseInt(el.getAttribute(attrName) ?? "", 10);
    return Number.isNaN(idx) ? null : idx;
  }
  function mountComponentAttributesEditor(mainEl, {
    flow,
    node,
    kindLabel,
    readOnly,
    onSaved,
    onClose,
    initialTab = "input"
  }) {
    const editingNodeId = node.id;
    const getEditingNode = () => flow.nodes?.find((n) => n.id === editingNodeId) ?? null;
    const initialNode = getEditingNode() ?? node;
    const hasOutput = KINDS_WITH_OUTPUT_ATTRIBUTES.has(initialNode.kind);
    let activeTab = hasOutput && initialTab === "output" ? "output" : "input";
    const draft = {
      input: cloneAttributeList(initialNode.inputAttributes ?? []),
      output: hasOutput ? cloneAttributeList(initialNode.outputAttributes ?? []) : []
    };
    let selectedInputIndex = 0;
    let selectedOutputIndex = 0;
    const detailEditorOpen = { input: false, output: false };
    const editSnapshot = { input: null, output: null };
    const scopeKey = (scope) => scope === "output" ? "output" : "input";
    const tabsHtml = hasOutput ? `<div class="component-attr-tabs" role="tablist">
        <button type="button" class="component-attr-tab ${activeTab === "input" ? "is-active" : ""}" data-attr-tab="input" role="tab">Entrada</button>
        <button type="button" class="component-attr-tab ${activeTab === "output" ? "is-active" : ""}" data-attr-tab="output" role="tab">Salida</button>
      </div>` : "";
    const bodyHtml = hasOutput ? `${renderAttributeMasterDetail(draft.input, "input", readOnly, selectedInputIndex, false)}
       ${renderAttributeMasterDetail(draft.output, "output", readOnly, selectedOutputIndex, false)}` : renderAttributeMasterDetail(draft.input, "input", readOnly, selectedInputIndex, false);
    const titleKind = kindLabel ? escapeHtml(kindLabel) : escapeHtml(initialNode.kind);
    const flowVersionLabel = escapeHtml(formatFlowVersion(flow));
    mainEl.innerHTML = `
    <section class="gestion-hero component-attr-hero panel">
      <header class="gestion-hero-header">
        <button type="button" class="btn btn-sm gestion-hero-back" data-component-attrs-back>Volver</button>
        <div class="gestion-hero-heading">
          <h2>Atributos del componente</h2>
          <p class="gestion-hero-subtitle">${titleKind} \xB7 ${escapeHtml(initialNode.name)} \xB7 ${escapeHtml(flow.name ?? "")} \xB7 ${flowVersionLabel}</p>
        </div>
      </header>
      <div class="component-attr-modal-body component-attr-hero-body">
        ${readOnly ? `<p class="props-intro props-intro--readonly">Solo lectura: el flujo no est\xE1 en borrador.</p>` : ""}
        <p class="form-hint component-attr-hint">Us\xE1 el icono de edici\xF3n en cada fila para abrir los par\xE1metros. Guard\xE1 o cancel\xE1 desde ese panel; el bot\xF3n \xABGuardar\xBB del pie persiste todos los cambios en el flujo${hasOutput ? " (entrada y salida son listas independientes)" : ""}.</p>
        ${tabsHtml}
        <div class="component-attr-panels">${bodyHtml}</div>
      </div>
      <footer class="component-attr-hero-footer">
        ${readOnly ? "" : `<button type="button" class="btn btn-primary" data-save-attrs>Guardar</button>`}
      </footer>
    </section>`;
    const root = mainEl;
    const syncTabVisibility = () => {
      if (!hasOutput) return;
      root.querySelectorAll(".component-attr-tab").forEach((btn) => {
        btn.classList.toggle("is-active", btn.dataset.attrTab === activeTab);
      });
      root.querySelectorAll("[data-attr-panel]").forEach((panel) => {
        const show = panel.dataset.attrPanel === activeTab;
        panel.hidden = !show;
      });
    };
    syncTabVisibility();
    const getScopeState = (scope) => scope === "output" ? draft.output : draft.input;
    const getSelectedIndex = (scope) => scope === "output" ? selectedOutputIndex : selectedInputIndex;
    const setSelectedIndex = (scope, idx) => {
      if (scope === "output") selectedOutputIndex = idx;
      else selectedInputIndex = idx;
    };
    const pullDraftFromDom = () => {
      if (detailEditorOpen.input) {
        syncDetailFormToList(root, "input", draft.input, selectedInputIndex);
      }
      if (hasOutput && detailEditorOpen.output) {
        syncDetailFormToList(root, "output", draft.output, selectedOutputIndex);
      }
    };
    const updateDetailSaveButton = (scope) => {
      const key = scopeKey(scope);
      const panel = getAttrPanel(root, scope);
      const detail = panel?.querySelector("[data-attr-detail]");
      const btn = panel?.querySelector("[data-save-attr-detail]");
      if (!detail || !btn || readOnly || !detailEditorOpen[key]) return;
      const snap = editSnapshot[key];
      const current = readAttributeFromDetailForm(detail);
      btn.disabled = !snap || !current || attributeEditSignature(current) === attributeEditSignature(snap);
    };
    const closeDetailEditor = (scope, revert) => {
      const key = scopeKey(scope);
      if (!detailEditorOpen[key]) return;
      if (revert && editSnapshot[key]) {
        const list = getScopeState(scope);
        const idx = getSelectedIndex(scope);
        if (idx >= 0 && idx < list.length) {
          list[idx] = cloneAttributeSnapshot(editSnapshot[key]);
        }
      }
      detailEditorOpen[key] = false;
      editSnapshot[key] = null;
    };
    const openDetailEditor = (scope, idx) => {
      const key = scopeKey(scope);
      if (detailEditorOpen[key]) {
        closeDetailEditor(scope, true);
      }
      const list = getScopeState(scope);
      if (idx < 0 || idx >= list.length) return;
      setSelectedIndex(scope, idx);
      editSnapshot[key] = cloneAttributeSnapshot(list[idx]);
      detailEditorOpen[key] = true;
      refreshPanel(scope);
      updateDetailSaveButton(scope);
    };
    const refreshPanel = (scope) => {
      const panel = getAttrPanel(root, scope);
      if (!panel) return;
      const list = getScopeState(scope);
      const key = scopeKey(scope);
      repaintPanel(panel, list, scope, readOnly, getSelectedIndex(scope), detailEditorOpen[key]);
      updateDetailSaveButton(scope);
    };
    const reloadDraftFromNode = () => {
      const editing = getEditingNode();
      if (!editing) return;
      draft.input = cloneAttributeList(editing.inputAttributes ?? []);
      if (hasOutput) draft.output = cloneAttributeList(editing.outputAttributes ?? []);
      selectedInputIndex = draft.input.length ? Math.min(selectedInputIndex, draft.input.length - 1) : 0;
      selectedOutputIndex = draft.output.length ? Math.min(selectedOutputIndex, draft.output.length - 1) : 0;
    };
    const refreshListsAfterSave = () => {
      reloadDraftFromNode();
      closeDetailEditor("input", false);
      if (hasOutput) closeDetailEditor("output", false);
      refreshPanel("input");
      if (hasOutput) refreshPanel("output");
      syncTabVisibility();
    };
    const removeAttributeAt = (scope, index) => {
      const key = scopeKey(scope);
      if (detailEditorOpen[key] && getSelectedIndex(scope) === index) {
        closeDetailEditor(scope, false);
      }
      const list = getScopeState(scope);
      if (index < 0 || index >= list.length) return;
      list.splice(index, 1);
      reindexAttributeOrders(list);
      setSelectedIndex(scope, list.length ? Math.min(index, list.length - 1) : 0);
      refreshPanel(scope);
    };
    const applyDetailEditorToDraft = (scope) => {
      const key = scopeKey(scope);
      const list = getScopeState(scope);
      const idx = getSelectedIndex(scope);
      const panel = getAttrPanel(root, scope);
      const detail = panel?.querySelector("[data-attr-detail]");
      const parsed = readAttributeFromDetailForm(detail);
      if (!parsed || idx < 0 || idx >= list.length) return false;
      const prevOrder = list[idx].order;
      list[idx] = parsed;
      if (parsed.order !== prevOrder) {
        moveAttributeByOrderField(list, idx, (parsed.order ?? idx) + 1);
        const newIdx = list.findIndex((a) => a.id === parsed.id);
        if (newIdx >= 0) setSelectedIndex(scope, newIdx);
      }
      reindexAttributeOrders(list);
      const scopeLabel = scope === "output" ? "salida" : "entrada";
      const editing = getEditingNode();
      const errors = validateAttributeList(list, scopeLabel, editing?.name ?? "");
      if (errors.length) {
        toast(errors[0]);
        return false;
      }
      editSnapshot[key] = cloneAttributeSnapshot(list[getSelectedIndex(scope)]);
      updateDetailSaveButton(scope);
      refreshDefinedListDom(
        root,
        scope,
        list,
        getSelectedIndex(scope),
        readOnly,
        detailEditorOpen[key]
      );
      return true;
    };
    const persistDraftToNode = () => {
      const editing = getEditingNode();
      if (!editing) {
        toast("No se encontr\xF3 el componente en el flujo.");
        return false;
      }
      pullDraftFromDom();
      reindexAttributeOrders(draft.input);
      if (hasOutput) reindexAttributeOrders(draft.output);
      const errors = [
        ...validateAttributeList(draft.input, "entrada", editing.name),
        ...hasOutput ? validateAttributeList(draft.output, "salida", editing.name) : []
      ];
      if (errors.length) {
        toast(errors[0]);
        return false;
      }
      editing.inputAttributes = cloneAttributeList(draft.input);
      if (hasOutput) editing.outputAttributes = cloneAttributeList(draft.output);
      ensureFlowNodeAttributes(flow);
      if (editing.kind === "inicio") {
        syncFlowInputContractFromStart(flow);
      }
      onSaved();
      return true;
    };
    root.querySelectorAll("[data-attr-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        closeDetailEditor("input", true);
        if (hasOutput) closeDetailEditor("output", true);
        refreshPanel("input");
        if (hasOutput) refreshPanel("output");
        activeTab = btn.dataset.attrTab === "output" ? "output" : "input";
        syncTabVisibility();
      });
    });
    root.addEventListener("click", (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      const rmBtn = t.closest("[data-list-rm-attr]");
      if (rmBtn) {
        const scope = rmBtn.getAttribute("data-list-scope") ?? "input";
        const idx = parseListRowIndex(rmBtn, "data-list-rm-attr");
        if (idx === null) return;
        removeAttributeAt(scope, idx);
        return;
      }
      const editBtn = t.closest("[data-list-edit-attr]");
      if (editBtn) {
        const scope = editBtn.getAttribute("data-list-scope") ?? "input";
        const idx = parseListRowIndex(editBtn, "data-list-edit-attr");
        if (idx === null) return;
        openDetailEditor(scope, idx);
        return;
      }
      const cancelBtn = t.closest("[data-cancel-attr-detail]");
      if (cancelBtn) {
        const scope = cancelBtn.getAttribute("data-cancel-scope") ?? "input";
        closeDetailEditor(scope, true);
        refreshPanel(scope);
        return;
      }
      const closeBtn = t.closest("[data-close-attr-detail]");
      if (closeBtn) {
        const scope = closeBtn.getAttribute("data-close-scope") ?? "input";
        closeDetailEditor(scope, false);
        refreshPanel(scope);
        return;
      }
      const saveDetailBtn = t.closest("[data-save-attr-detail]");
      if (saveDetailBtn) {
        const scope = saveDetailBtn.getAttribute("data-save-scope") ?? "input";
        if (!applyDetailEditorToDraft(scope)) return;
        closeDetailEditor(scope, false);
        refreshPanel(scope);
        toast("Cambios del atributo aplicados al borrador.", 2200, "success");
        return;
      }
      const addAttrBtn = t.closest("[data-add-attr]");
      if (addAttrBtn) {
        const scope = addAttrBtn.getAttribute("data-add-scope") ?? "input";
        const key = scopeKey(scope);
        if (detailEditorOpen[key]) closeDetailEditor(scope, true);
        const list = getScopeState(scope);
        const next = createEmptyAttribute();
        next.order = list.length;
        list.push(next);
        reindexAttributeOrders(list);
        openDetailEditor(scope, list.length - 1);
        return;
      }
      if (t.closest("[data-add-opt]")) {
        const detail = t.closest("[data-attr-detail]");
        if (!detail) return;
        const scope = detail.dataset.attrScope ?? "input";
        const list = getScopeState(scope);
        const idx = getSelectedIndex(scope);
        const attr = list[idx];
        if (!attr) return;
        if (!attr.listOptions) attr.listOptions = [];
        attr.listOptions.push(createEmptyListOption());
        refreshPanel(scope);
        updateDetailSaveButton(scope);
        return;
      }
      if (t.closest("[data-rm-opt]")) {
        const row = t.closest(".component-attr-option-row");
        const detail = t.closest("[data-attr-detail]");
        if (!row || !detail) return;
        const scope = detail.dataset.attrScope ?? "input";
        const list = getScopeState(scope);
        const idx = getSelectedIndex(scope);
        const optionRows = [...detail.querySelectorAll(".component-attr-option-row")];
        const oi = optionRows.indexOf(row);
        if (idx >= 0 && oi >= 0) list[idx]?.listOptions?.splice(oi, 1);
        refreshPanel(scope);
        updateDetailSaveButton(scope);
      }
    });
    root.addEventListener("change", (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.matches('[data-field="cardinality"]')) {
        const detail2 = t.closest("[data-attr-detail]");
        const block = detail2?.querySelector("[data-options-block]");
        if (block) block.style.display = t.value === INPUT_CARDINALITY.LISTA ? "" : "none";
      }
      const detail = t.closest("[data-attr-detail]");
      if (detail) {
        const scope = detail.dataset.attrScope ?? "input";
        updateDetailSaveButton(scope);
      }
    });
    root.addEventListener("input", (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      const detail = t.closest("[data-attr-detail]");
      if (!detail) return;
      const scope = detail.dataset.attrScope ?? "input";
      updateDetailSaveButton(scope);
    });
    let dragState = null;
    root.addEventListener("dragstart", (e) => {
      if (readOnly) return;
      const handle = e.target instanceof Element ? e.target.closest("[data-attr-drag-handle]") : null;
      if (!handle) return;
      const scope = handle.dataset.dragScope ?? "input";
      const fromIndex = Number(handle.dataset.attrDragHandle);
      if (Number.isNaN(fromIndex)) return;
      closeDetailEditor(scope, true);
      dragState = { scope, fromIndex };
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(fromIndex));
      }
      handle.closest(".component-attr-defined-row")?.classList.add("is-dragging");
    });
    root.addEventListener("dragend", (e) => {
      root.querySelectorAll(".component-attr-defined-row.is-dragging").forEach((el) => {
        el.classList.remove("is-dragging");
      });
      root.querySelectorAll(".component-attr-defined-row.is-drop-target").forEach((el) => {
        el.classList.remove("is-drop-target");
      });
      dragState = null;
    });
    root.addEventListener("dragover", (e) => {
      if (readOnly || !dragState) return;
      const row = e.target instanceof Element ? e.target.closest(".component-attr-defined-row") : null;
      if (!row || row.dataset.attrListScope !== dragState.scope) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
      root.querySelectorAll(`.component-attr-defined-row[data-attr-list-scope="${dragState.scope}"]`).forEach((el) => el.classList.toggle("is-drop-target", el === row));
    });
    root.addEventListener("dragleave", (e) => {
      const row = e.target instanceof Element ? e.target.closest(".component-attr-defined-row") : null;
      if (row) row.classList.remove("is-drop-target");
    });
    root.addEventListener("drop", (e) => {
      if (readOnly || !dragState) return;
      const row = e.target instanceof Element ? e.target.closest(".component-attr-defined-row") : null;
      if (!row || row.dataset.attrListScope !== dragState.scope) return;
      e.preventDefault();
      const toIndex = Number(row.dataset.attrListIndex);
      const { scope, fromIndex } = dragState;
      if (Number.isNaN(toIndex) || Number.isNaN(fromIndex)) return;
      const list = getScopeState(scope);
      reorderAttributeInList(list, fromIndex, toIndex);
      dragState = null;
      refreshPanel(scope);
    });
    root.querySelector("[data-component-attrs-back]")?.addEventListener("click", () => {
      onClose?.();
    });
    root.querySelector("[data-save-attrs]")?.addEventListener("click", () => {
      if (!persistDraftToNode()) return;
      refreshListsAfterSave();
      toast("Atributos guardados.", 2500, "success");
    });
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
    studioMode: "path",
    catalogView: "flows",
    catalogExpandedLineages: /* @__PURE__ */ new Set(),
    catalogExpandedActivityFlows: /* @__PURE__ */ new Set(),
    readOnly: false,
    /** @type {{ flowId: string; nodeId: string; initialTab: string } | null} */
    componentAttrsEditor: null,
    /** Pantalla hero «Nuevo flujo» en el catálogo (sin modal). */
    newFlowScreen: false
  };
  function exitComponentAttributesEditor() {
    designerContext.componentAttrsEditor = null;
  }
  function exitNewFlowScreen() {
    designerContext.newFlowScreen = false;
  }
  function enterNewFlowScreen(mainEl, state, persist) {
    if (isCatalogActionsBlocked()) {
      toast(designerBlockedMessage().body);
      return;
    }
    exitComponentAttributesEditor();
    designerContext.newFlowScreen = true;
    designerContext.selectedFlowId = null;
    designerContext.selectedNodeId = null;
    renderDesigner(mainEl, state, persist);
  }
  function enterComponentAttributesEditor(mainEl, state, persist, opts) {
    designerContext.componentAttrsEditor = {
      flowId: opts.flowId,
      nodeId: opts.nodeId,
      initialTab: opts.initialTab ?? "input"
    };
    renderDesigner(mainEl, state, persist);
  }
  function renderComponentAttributesHero(mainEl, state, persist) {
    const ed = designerContext.componentAttrsEditor;
    if (!ed) return false;
    const flow = state.flows.find((f) => f.id === ed.flowId);
    const node = flow?.nodes?.find((n) => n.id === ed.nodeId);
    if (!flow || !node || !COMPONENTS_WITH_INPUT_ATTRIBUTES.has(node.kind)) {
      exitComponentAttributesEditor();
      return false;
    }
    const readOnly = !isFlowEditable(flow);
    mountComponentAttributesEditor(mainEl, {
      flow,
      node,
      kindLabel: componentKindLabel(node.kind),
      readOnly,
      initialTab: ed.initialTab,
      onSaved: () => {
        persist();
      },
      onClose: () => {
        exitComponentAttributesEditor();
        renderDesigner(mainEl, state, persist);
      }
    });
    return true;
  }
  function renderFlowStatusBadge(flow) {
    const badgeClass = flowStatusBadgeClass(flow.status);
    return `<span class="badge badge-${badgeClass}">${escapeHtml(statusLabel(flow.status))}</span>`;
  }
  function createFlowPersist(flow, persist) {
    return () => {
      if (!isFlowEditable(flow)) {
        toast(designerReadOnlyMessage(flow));
        return;
      }
      persist();
    };
  }
  function propsReadonlyAttrs() {
    return designerContext.readOnly ? ' disabled readonly aria-disabled="true"' : "";
  }
  var ACTIVITY_NODE_KINDS = /* @__PURE__ */ new Set([
    NODE_KINDS.MANUAL,
    NODE_KINDS.AUTOMATICA,
    NODE_KINDS.AGENTE_IA
  ]);
  var ACTIVITY_CATALOG_COMPONENT_KINDS = /* @__PURE__ */ new Set([
    NODE_KINDS.INICIO,
    NODE_KINDS.FIN,
    NODE_KINDS.GATEWAY,
    NODE_KINDS.MANUAL,
    NODE_KINDS.AUTOMATICA
  ]);
  function setDesignerCatalogView(view) {
    if (view === "flows" || view === "activities") {
      designerContext.catalogView = view;
    }
  }
  function enterDesignerCatalog(catalog) {
    exitComponentAttributesEditor();
    exitNewFlowScreen();
    setDesignerCatalogView(catalog);
    designerContext.selectedFlowId = null;
    designerContext.selectedNodeId = null;
    designerContext.studioMode = "path";
    designerContext.connectClickFrom = null;
    designerContext.contextPadOpenTaskMenu = null;
    designerContext.contextPadOpenGatewayMenu = null;
    designerContext.readOnly = false;
  }
  var activeLinkDrag = null;
  var activeCanvasViewport = null;
  var activeDesignerSideBind = null;
  function renderDesigner(mainEl, state, persist) {
    if (designerContext.componentAttrsEditor && renderComponentAttributesHero(mainEl, state, persist)) {
      return;
    }
    if (designerContext.newFlowScreen && !designerContext.selectedFlowId) {
      renderNewFlowHero(mainEl, state, persist);
      return;
    }
    if (!designerContext.selectedFlowId && state.flows[0]) {
      designerContext.selectedFlowId = null;
    }
    const flow = state.flows.find((f) => f.id === designerContext.selectedFlowId);
    if (!flow) {
      if (designerContext.catalogView === "activities") {
        mainEl.innerHTML = renderActivityCatalog(state);
        bindActivityCatalog(mainEl, state, persist);
      } else {
        mainEl.innerHTML = renderCatalog(state);
        bindCatalog(mainEl, state, persist);
      }
      return;
    }
    if (isDesignerEditorBlocked()) {
      mainEl.innerHTML = renderDesignerViewportBlocked();
      bindDesignerViewportBlocked(mainEl, state, persist);
      return;
    }
    designerContext.readOnly = !isFlowEditable(flow);
    const flowPersist = createFlowPersist(flow, persist);
    normalizeFlowNodes(flow);
    normalizeFlowContracts(flow);
    const selected = flow.nodes.find((n) => n.id === designerContext.selectedNodeId);
    const validation = validateFlow(flow);
    if (designerContext.readOnly && designerContext.studioMode !== "path") {
      designerContext.studioMode = "path";
    }
    if (!designerContext.readOnly && designerContext.studioMode === "screen" && selected?.kind === NODE_KINDS.MANUAL) {
      mainEl.innerHTML = renderStudioShell(flow, selected, validation, "screen");
      bindStudioShell(mainEl, flow, selected, state, flowPersist);
      bindScreenStudio(mainEl, flow, selected, flowPersist, () => renderDesigner(mainEl, state, persist));
      return;
    }
    if (!designerContext.readOnly && designerContext.studioMode === "automation" && selected?.kind === NODE_KINDS.AUTOMATICA) {
      mainEl.innerHTML = renderStudioShell(flow, selected, validation, "automation");
      bindStudioShell(mainEl, flow, selected, state, flowPersist);
      bindAutomationStudio(mainEl, flow, selected, flowPersist, () => renderDesigner(mainEl, state, persist));
      return;
    }
    if (!designerContext.readOnly && designerContext.studioMode === "agente_ia" && selected?.kind === NODE_KINDS.AGENTE_IA) {
      mainEl.innerHTML = renderStudioShell(flow, selected, validation, "agente_ia");
      bindStudioShell(mainEl, flow, selected, state, flowPersist);
      bindAgenteIAStudio(mainEl, flow, selected, flowPersist, () => renderDesigner(mainEl, state, persist));
      return;
    }
    designerContext.studioMode = "path";
    mainEl.innerHTML = renderFlowEditor(flow);
    bindFlowEditor(mainEl, flow, state, persist, flowPersist);
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
  function applyFlowMetaFromForm(flow, state, fd) {
    const flowTypeId = String(fd.get("flowTypeId") ?? "");
    if (!applyFlowTypeToFlow(flow, state, flowTypeId)) {
      toast("Seleccion\xE1 un tipo de flujo v\xE1lido.");
      return false;
    }
    flow.name = String(fd.get("name") ?? "").trim();
    flow.description = String(fd.get("description") ?? "").trim();
    if (!flow.name) {
      toast("El nombre del flujo es obligatorio.");
      return false;
    }
    return true;
  }
  function bindStudioShell(mainEl, flow, node, state, persist) {
    bindStudioTabs(mainEl, state, persist);
    mainEl.querySelector("#btn-back-catalog")?.addEventListener("click", () => {
      enterDesignerCatalog("flows");
      renderDesigner(mainEl, state, persist);
    });
    mainEl.querySelector("#btn-flow-meta")?.addEventListener("click", () => {
      const { close, root } = openModal(`
      <div class="modal-header"><h2>Metadatos del flujo</h2><button type="button" class="btn btn-sm" data-modal-close>Cerrar</button></div>
      <form id="form-meta" class="form-grid">
        ${renderFlowTypeFormRow(state, flow)}
        <div class="form-row"><label>Nombre</label><input name="name" value="${escapeHtml(flow.name)}" required /></div>
        <div class="form-row"><label>Descripci\xF3n</label><textarea name="description">${escapeHtml(flow.description || "")}</textarea></div>
        <button type="submit" class="btn btn-primary" ${(state.flowTypes ?? []).length ? "" : "disabled"}>Guardar</button>
      </form>
    `);
      bindFlowTypeGotoButton(root, close);
      root.querySelector("#form-meta")?.addEventListener("submit", (e) => {
        e.preventDefault();
        if (!isFlowEditable(flow)) {
          toast("Este flujo no es editable. Us\xE1 \xABVersionar\xBB para crear un borrador.");
          return;
        }
        const fd = new FormData(e.target);
        if (!applyFlowMetaFromForm(flow, state, fd)) return;
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
        if (designerContext.readOnly) {
          toast("Este flujo no es editable. Us\xE1 \xABVersionar\xBB para crear un borrador.");
          return;
        }
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
  function renderCatalogFlowActions(flow, catalogBlocked) {
    const disabled = catalogBlocked ? 'disabled aria-disabled="true"' : "";
    const openBtn = `<button type="button" class="btn btn-sm" data-open-flow="${flow.id}" ${disabled}>Abrir</button>`;
    if (flow.status === "listo") {
      return `${openBtn}
        <button type="button" class="btn btn-sm" data-version-flow="${flow.id}" ${disabled}>Versionar</button>`;
    }
    if (flow.status === "borrador") {
      return `${openBtn}
        <button type="button" class="btn btn-sm btn-success" data-activate-flow="${flow.id}" ${disabled}>Activar</button>
        <button type="button" class="btn btn-sm btn-danger" data-delete-flow="${flow.id}" aria-label="Eliminar flujo ${escapeHtml(flow.name ?? "")}">Eliminar</button>`;
    }
    return openBtn;
  }
  function renderCatalogTreeToggle(lineageId, expanded, childCount) {
    const label = childCount === 1 ? "1 versi\xF3n anterior" : `${childCount} versiones anteriores`;
    return `<button type="button" class="catalog-tree-toggle ${expanded ? "is-expanded" : ""}" data-toggle-deprecados="${escapeHtml(lineageId)}" aria-expanded="${expanded ? "true" : "false"}" aria-label="${expanded ? `Contraer ${label}` : `Expandir ${label}`}" title="${expanded ? "Ocultar versiones anteriores" : "Ver versiones deprecadas"}">
      <svg class="catalog-tree-chevron" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M6 4l4 4-4 4V4z"/></svg>
    </button>`;
  }
  function renderCatalogFlowTableRow(f, catalogBlocked, opts = {}) {
    const { rowClass = "", lineageId = "", isChild = false } = opts;
    const lineageAttr = lineageId ? ` data-lineage-child="${lineageId}"` : "";
    const nameCell = isChild ? `<td class="catalog-name-cell catalog-name-cell--child">
        <span class="catalog-tree-node">
          <span class="catalog-tree-rail" aria-hidden="true"></span>
          <span class="catalog-flow-name">${escapeHtml(f.name)}</span>
        </span>
      </td>` : `<td class="catalog-name-cell"><div class="catalog-name-cell-inner"><span class="catalog-flow-name">${escapeHtml(f.name)}</span></div></td>`;
    return `
    <tr class="${rowClass}"${lineageAttr}>
      ${nameCell}
      <td>${escapeHtml(f.type)}</td>
      <td><span class="catalog-version">${escapeHtml(formatFlowVersion(f))}</span></td>
      <td>${renderFlowStatusBadge(f)}</td>
      <td class="catalog-actions">${renderCatalogFlowActions(f, catalogBlocked)}</td>
    </tr>`;
  }
  function renderCatalog(state) {
    const catalogBlocked = isCatalogActionsBlocked();
    const catalogCallout = designerCatalogCalloutHtml();
    const groups = buildCatalogLineageGroups(state.flows);
    const listoGroups = groups.filter((g) => g.listo);
    const draftOnlyGroups = groups.filter((g) => !g.listo && g.borrador);
    const lineageGroupsHtml = listoGroups.map((group) => {
      const f = group.listo;
      if (!f) return "";
      const hasTree = group.deprecados.length > 0 || group.borrador && group.listo && group.borrador.id !== group.listo.id;
      const expanded = designerContext.catalogExpandedLineages.has(group.lineageId);
      const childCount = group.deprecados.length + (group.borrador && group.borrador.id !== group.listo?.id ? 1 : 0);
      const toggle = hasTree ? renderCatalogTreeToggle(group.lineageId, expanded, childCount) : `<span class="catalog-tree-toggle catalog-tree-toggle--spacer" aria-hidden="true"></span>`;
      const countChip = hasTree && !expanded ? `<span class="catalog-tree-count" title="Versiones anteriores ocultas">${childCount} ${childCount === 1 ? "anterior" : "anteriores"}</span>` : "";
      const groupState = expanded ? "is-expanded" : "is-collapsed";
      const parentRow = `
    <tr class="catalog-row catalog-row--parent ${hasTree ? "catalog-row--has-children" : ""} ${expanded ? "catalog-row--expanded" : "catalog-row--collapsed"}" data-lineage-parent="${escapeHtml(group.lineageId)}">
      <td class="catalog-name-cell">
        <div class="catalog-name-cell-inner">
          ${toggle}
          <span class="catalog-flow-name">${escapeHtml(f.name)}</span>
          ${countChip}
        </div>
      </td>
      <td>${escapeHtml(f.type)}</td>
      <td><span class="catalog-version catalog-version--current">${escapeHtml(formatFlowVersion(f))}</span></td>
      <td>${renderFlowStatusBadge(f)}</td>
      <td class="catalog-actions">${renderCatalogFlowActions(f, catalogBlocked)}</td>
    </tr>`;
      let childRowsHtml = "";
      if (expanded && hasTree) {
        const parts = [];
        for (const dep of group.deprecados) {
          parts.push(
            renderCatalogFlowTableRow(dep, catalogBlocked, {
              rowClass: "catalog-row catalog-row--child catalog-row--deprecated",
              lineageId: group.lineageId,
              isChild: true
            })
          );
        }
        if (group.borrador && group.borrador.id !== group.listo?.id) {
          parts.push(
            renderCatalogFlowTableRow(group.borrador, catalogBlocked, {
              rowClass: "catalog-row catalog-row--child catalog-row--draft",
              lineageId: group.lineageId,
              isChild: true
            })
          );
        }
        childRowsHtml = parts.join("");
      }
      return `<tbody class="catalog-lineage-group ${groupState} ${hasTree ? "has-children" : ""}" data-lineage-group="${escapeHtml(group.lineageId)}">
      ${parentRow}
      ${childRowsHtml}
    </tbody>`;
    }).join("");
    const draftRows = draftOnlyGroups.map(
      (group) => renderCatalogFlowTableRow(group.borrador, catalogBlocked, {
        rowClass: "catalog-row catalog-row--draft-only"
      })
    ).join("");
    const hasAnyFlow = state.flows.length > 0;
    const hasListo = listoGroups.length > 0;
    const emptyBody = !hasAnyFlow ? `<div class="empty-state empty-state--rich">
          <svg class="empty-state__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4zM8 10h8M8 14h5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>
          <strong>Sin flujos todav\xEDa</strong>
          <p>Cre\xE1 tu primer flujo BPMN en borrador y us\xE1 \xABActivar\xBB para publicarlo como Listo en Gesti\xF3n.</p>
          <button type="button" class="btn btn-primary" id="btn-new-flow-empty" ${catalogBlocked ? "disabled" : ""}>Nuevo flujo</button>
        </div>` : !hasListo ? `<div class="empty-state empty-state--compact">
          <strong>Sin flujos listos</strong>
          <p>Activ\xE1 un borrador pendiente para verlo ac\xE1 como versi\xF3n publicada.</p>
        </div>` : "";
    const listoTable = hasListo ? `<div class="table-wrap table-wrap--modern">
        <table class="table-modern catalog-flow-tree">
          <thead>
            <tr><th>Nombre</th><th>Tipo</th><th>Versi\xF3n</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          ${lineageGroupsHtml}
        </table>
      </div>` : "";
    const draftSection = draftRows.length > 0 ? `<div class="catalog-section catalog-section--drafts">
          <h3 class="catalog-section-title">Borradores pendientes</h3>
          <p class="catalog-section-hint">A\xFAn no publicados. Us\xE1 \xABActivar\xBB para pasarlos a Listo.</p>
          <div class="table-wrap table-wrap--modern">
            <table class="table-modern">
              <thead>
                <tr><th>Nombre</th><th>Tipo</th><th>Versi\xF3n</th><th>Estado</th><th>Acciones</th></tr>
              </thead>
              <tbody>${draftRows}</tbody>
            </table>
          </div>
        </div>` : "";
    return `
    <section class="panel panel--catalog">
      ${renderPageHeader(
      "Cat\xE1logo de flujos",
      "Se listan los flujos en estado Listo. Despleg\xE1 \u25B8 para ver versiones deprecadas del mismo linaje. Los borradores sin publicar aparecen abajo."
    )}
      ${catalogCallout}
      ${hasAnyFlow ? `<div class="catalog-toolbar-secondary">
          <p class="catalog-toolbar-secondary__hint">Flujos listos para Gesti\xF3n. Version\xE1 para editar; las versiones anteriores quedan deprecadas bajo el \xE1rbol.</p>
          <button type="button" class="btn btn-primary" id="btn-new-flow-table" ${catalogBlocked ? 'disabled aria-disabled="true"' : ""}>Nuevo flujo</button>
        </div>` : ""}
      ${emptyBody}
      ${listoTable}
      ${draftSection}
    </section>`;
  }
  function activityKindLabel(kind) {
    if (kind === NODE_KINDS.MANUAL) return "User Task";
    if (kind === NODE_KINDS.AUTOMATICA) return "Service Task";
    if (kind === NODE_KINDS.AGENTE_IA) return "Agente IA";
    return kind;
  }
  function componentKindLabel(kind) {
    if (kind === NODE_KINDS.INICIO) return "Start Event";
    if (kind === NODE_KINDS.FIN) return "End Event";
    if (kind === NODE_KINDS.GATEWAY) return "Gateway";
    return activityKindLabel(kind);
  }
  function componentKindBadgeClass(kind) {
    if (kind === NODE_KINDS.INICIO || kind === NODE_KINDS.FIN) return "borrador";
    if (kind === NODE_KINDS.GATEWAY) return "curso";
    return "listo";
  }
  function getActivityCatalogFlows(flows) {
    return (flows ?? []).filter((f) => f.status === "listo" || f.status === "borrador").sort((a, b) => {
      if (a.status === "listo" && b.status !== "listo") return -1;
      if (b.status === "listo" && a.status !== "listo") return 1;
      return String(a.name ?? "").localeCompare(String(b.name ?? ""), "es");
    });
  }
  function listFlowCatalogComponents(flow) {
    const catalogNodes = (flow.nodes ?? []).filter(
      (n) => ACTIVITY_CATALOG_COMPONENT_KINDS.has(n.kind)
    );
    const nodeById = Object.fromEntries((flow.nodes ?? []).map((n) => [n.id, n]));
    const start = flow.nodes?.find((n) => n.kind === NODE_KINDS.INICIO);
    const byFrom = /* @__PURE__ */ new Map();
    for (const t of flow.transitions ?? []) {
      const lt = t.lineType ?? LINE_TYPES.SEQUENCE;
      if (lt !== LINE_TYPES.SEQUENCE) continue;
      if (!byFrom.has(t.fromId)) byFrom.set(t.fromId, []);
      byFrom.get(t.fromId).push(t.toId);
    }
    const ordered = [];
    const seen = /* @__PURE__ */ new Set();
    if (start) {
      const queue = [start.id];
      while (queue.length) {
        const id = queue.shift();
        if (seen.has(id)) continue;
        seen.add(id);
        const node = nodeById[id];
        if (node && ACTIVITY_CATALOG_COMPONENT_KINDS.has(node.kind)) {
          ordered.push(node);
        }
        for (const next of byFrom.get(id) ?? []) {
          if (!seen.has(next)) queue.push(next);
        }
      }
    }
    const rest = catalogNodes.filter((n) => !seen.has(n.id)).sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? ""), "es"));
    return [...ordered, ...rest];
  }
  function renderCatalogComponentIcon(node) {
    const title = escapeHtml(componentKindLabel(node.kind));
    if (node.kind === NODE_KINDS.INICIO) {
      return `<span class="catalog-component-icon-wrap" title="${title}"><span class="palette-shape-icon icon-start catalog-component-shape" aria-hidden="true"></span></span>`;
    }
    if (node.kind === NODE_KINDS.FIN) {
      return `<span class="catalog-component-icon-wrap" title="${title}"><span class="palette-shape-icon icon-end catalog-component-shape" aria-hidden="true"></span></span>`;
    }
    if (node.kind === NODE_KINDS.GATEWAY) {
      const gt = node.gatewayType ?? DEFAULT_GATEWAY_TYPE;
      const mark = gatewayMarkClass(gt);
      return `<span class="catalog-component-icon-wrap catalog-component-icon-wrap--gateway" title="${title}"><span class="icon-gateway-diamond catalog-component-gateway" aria-hidden="true"><span class="gateway-mark ${mark}"></span></span></span>`;
    }
    if (node.kind === NODE_KINDS.MANUAL) {
      return `<span class="catalog-component-icon-wrap catalog-component-glyph" title="${title}" aria-hidden="true">\u{1F464}</span>`;
    }
    if (node.kind === NODE_KINDS.AUTOMATICA) {
      return `<span class="catalog-component-icon-wrap catalog-component-glyph" title="${title}" aria-hidden="true">\u2699</span>`;
    }
    return `<span class="catalog-component-icon-wrap catalog-component-glyph" title="${title}" aria-hidden="true">\u2022</span>`;
  }
  function renderActivityTreeToggle(flowId, expanded, childCount) {
    const label = childCount === 1 ? "1 componente" : `${childCount} componentes`;
    return `<button type="button" class="catalog-tree-toggle ${expanded ? "is-expanded" : ""}" data-toggle-activity-flow="${escapeHtml(flowId)}" aria-expanded="${expanded ? "true" : "false"}" aria-label="${expanded ? `Contraer ${label}` : `Expandir ${label}`}" title="${expanded ? "Ocultar componentes" : "Ver componentes del flujo"}">
      <svg class="catalog-tree-chevron" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M6 4l4 4-4 4V4z"/></svg>
    </button>`;
  }
  function renderActivityComponentRow(node, flow, catalogBlocked) {
    const badgeClass = componentKindBadgeClass(node.kind);
    const kindLabel = componentKindLabel(node.kind);
    return `
    <tr class="catalog-row catalog-row--child catalog-row--component" data-activity-flow-child="${escapeHtml(flow.id)}">
      <td class="catalog-name-cell catalog-name-cell--child">
        <span class="catalog-tree-node catalog-tree-node--component">
          <span class="catalog-tree-rail" aria-hidden="true"></span>
          ${renderCatalogComponentIcon(node)}
          <span class="catalog-component-meta">
            <span class="catalog-component-name">${escapeHtml(node.name)}</span>
            <span class="catalog-component-kind-hint">${escapeHtml(kindLabel)}</span>
          </span>
        </span>
      </td>
      <td>\u2014</td>
      <td><span class="badge badge-${badgeClass}">${escapeHtml(kindLabel)}</span></td>
      <td>${escapeHtml(node.description || "\u2014")}</td>
      <td class="catalog-actions">
        <button type="button" class="btn btn-sm" data-open-activity="${flow.id}" data-node-id="${node.id}" ${catalogBlocked ? 'disabled aria-disabled="true"' : ""}>Abrir</button>
      </td>
    </tr>`;
  }
  function renderActivityCatalog(state) {
    const catalogBlocked = isCatalogActionsBlocked();
    const catalogCallout = designerCatalogCalloutHtml();
    const activityFlows = getActivityCatalogFlows(state.flows);
    const flowGroupsHtml = activityFlows.map((flow) => {
      const components = listFlowCatalogComponents(flow);
      const expanded = designerContext.catalogExpandedActivityFlows.has(flow.id);
      const childCount = components.length;
      const hasChildren = childCount > 0;
      const toggle = hasChildren ? renderActivityTreeToggle(flow.id, expanded, childCount) : `<span class="catalog-tree-toggle catalog-tree-toggle--spacer" aria-hidden="true"></span>`;
      const countChip = hasChildren ? !expanded ? `<span class="catalog-tree-count" title="Componentes del diagrama">${childCount} ${childCount === 1 ? "componente" : "componentes"}</span>` : "" : `<span class="catalog-tree-count catalog-tree-count--muted" title="Agente IA no se lista en este cat\xE1logo">Sin componentes listados</span>`;
      const openFlowBtn = `<button type="button" class="btn btn-sm" data-open-flow-only="${flow.id}" ${catalogBlocked ? 'disabled aria-disabled="true"' : ""}>Abrir flujo</button>`;
      const parentRow = `
    <tr class="catalog-row catalog-row--parent catalog-row--activity-flow ${hasChildren ? "catalog-row--has-children" : ""} ${expanded ? "catalog-row--expanded" : "catalog-row--collapsed"}" data-activity-flow-parent="${escapeHtml(flow.id)}">
      <td class="catalog-name-cell">
        <div class="catalog-name-cell-inner">
          ${toggle}
          <span class="catalog-flow-name">${escapeHtml(flow.name)}</span>
          ${countChip}
        </div>
      </td>
      <td>${escapeHtml(flow.type)}</td>
      <td><span class="catalog-version catalog-version--current">${escapeHtml(formatFlowVersion(flow))}</span></td>
      <td>${renderFlowStatusBadge(flow)}</td>
      <td class="catalog-actions">${openFlowBtn}</td>
    </tr>`;
      let childRowsHtml = "";
      if (expanded) {
        if (hasChildren) {
          childRowsHtml = components.map((node) => renderActivityComponentRow(node, flow, catalogBlocked)).join("");
        } else {
          childRowsHtml = `
    <tr class="catalog-row catalog-row--child catalog-row--empty" data-activity-flow-child="${escapeHtml(flow.id)}">
      <td class="catalog-name-cell catalog-name-cell--child" colspan="5">
        <span class="catalog-tree-node catalog-tree-node--empty">
          <span class="catalog-tree-rail" aria-hidden="true"></span>
          <span class="catalog-muted">Sin componentes listados (Agente IA no aparece en este cat\xE1logo).</span>
        </span>
      </td>
    </tr>`;
        }
      }
      const groupState = expanded ? "is-expanded" : "is-collapsed";
      return `<tbody class="catalog-lineage-group catalog-activity-flow-group ${groupState} ${hasChildren ? "has-children" : ""}" data-activity-flow-group="${escapeHtml(flow.id)}">
      ${parentRow}
      ${childRowsHtml}
    </tbody>`;
    }).join("");
    const hasFlows = activityFlows.length > 0;
    const emptyBody = !hasFlows ? `<div class="empty-state empty-state--rich">
          <strong>Sin flujos para listar</strong>
          <p>Activ\xE1 un borrador o public\xE1 un flujo en estado Listo. Las versiones deprecadas no aparecen ac\xE1.</p>
          <button type="button" class="btn btn-sm" id="btn-goto-flow-catalog">Ir al cat\xE1logo de flujos</button>
        </div>` : "";
    return `
    <section class="panel panel--catalog">
      ${renderPageHeader(
      "Cat\xE1logo de actividades",
      "Flujos en estado Listo o Borrador. Despleg\xE1 cada fila para ver Start, End, Gateway y tareas (User/Service). Agente IA no se lista."
    )}
      ${catalogCallout}
      ${emptyBody}
      ${hasFlows ? `<div class="table-wrap table-wrap--modern">
        <table class="table-modern catalog-flow-tree catalog-activity-tree">
          <thead>
            <tr><th>Flujo / componente</th><th>Tipo de flujo</th><th>Versi\xF3n</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          ${flowGroupsHtml}
        </table>
      </div>` : ""}
    </section>`;
  }
  function bindActivityCatalog(mainEl, state, persist) {
    mainEl.querySelector("#btn-goto-flow-catalog")?.addEventListener("click", () => {
      designerContext.catalogView = "flows";
      document.querySelector('[data-nav-group="designer"] [data-catalog="flows"]')?.click();
    });
    mainEl.querySelectorAll("[data-toggle-activity-flow]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const flowId = btn.dataset.toggleActivityFlow;
        if (!flowId) return;
        if (designerContext.catalogExpandedActivityFlows.has(flowId)) {
          designerContext.catalogExpandedActivityFlows.delete(flowId);
        } else {
          designerContext.catalogExpandedActivityFlows.add(flowId);
        }
        renderDesigner(mainEl, state, persist);
      });
    });
    mainEl.querySelectorAll("[data-open-flow-only]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.disabled || isCatalogActionsBlocked()) {
          toast(designerBlockedMessage().body);
          return;
        }
        designerContext.selectedFlowId = btn.dataset.openFlowOnly;
        designerContext.selectedNodeId = null;
        renderDesigner(mainEl, state, persist);
      });
    });
    mainEl.querySelectorAll("[data-open-activity]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.disabled || isCatalogActionsBlocked()) {
          toast(designerBlockedMessage().body);
          return;
        }
        const flowId = btn.dataset.openActivity;
        const nodeId = btn.dataset.nodeId;
        const flow = state.flows.find((f) => f.id === flowId);
        const node = flow?.nodes?.find((n) => n.id === nodeId);
        if (!flow || !node || !COMPONENTS_WITH_INPUT_ATTRIBUTES.has(node.kind)) {
          designerContext.selectedFlowId = flowId;
          designerContext.selectedNodeId = nodeId;
          renderDesigner(mainEl, state, persist);
          return;
        }
        enterComponentAttributesEditor(mainEl, state, persist, {
          flowId,
          nodeId
        });
      });
    });
  }
  function buildNewFlowFromForm(fd, state) {
    const flowTypeId = String(fd.get("flowTypeId") ?? "");
    const startId = createId("node");
    const endId = createId("node");
    const flow = {
      id: createId("flow"),
      type: "",
      flowTypeId: null,
      name: String(fd.get("name")).trim(),
      description: String(fd.get("description")).trim(),
      status: "borrador",
      version: null,
      lineageId: null,
      supersedesFlowId: null,
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
    if (!applyFlowTypeToFlow(flow, state, flowTypeId)) {
      toast("Seleccion\xE1 un tipo de flujo v\xE1lido.");
      return null;
    }
    if (!flow.name) {
      toast("El nombre del flujo es obligatorio.");
      return null;
    }
    flow.lineageId = flow.id;
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
    return { flow, startId };
  }
  function renderNewFlowHero(mainEl, state, persist) {
    const hasTypes = (state.flowTypes ?? []).length > 0;
    mainEl.innerHTML = `
    <section class="gestion-hero new-flow-hero panel">
      <header class="gestion-hero-header">
        <button type="button" class="btn btn-sm gestion-hero-back" data-new-flow-back>Volver al cat\xE1logo</button>
        <div class="gestion-hero-heading">
          <h2>Nuevo flujo</h2>
          <p class="gestion-hero-subtitle">Defin\xED tipo, nombre y descripci\xF3n. Al crear se abre el lienzo en borrador con Start y End.</p>
        </div>
      </header>
      <div class="new-flow-hero-body">
        <form id="form-new-flow" class="form-grid new-flow-form">
          ${renderFlowTypeFormRow(state, null)}
          <div class="form-row"><label>Nombre</label><input name="name" required autocomplete="off" ${hasTypes ? "" : "disabled"} /></div>
          <div class="form-row"><label>Descripci\xF3n</label><textarea name="description" rows="4" ${hasTypes ? "" : "disabled"}></textarea></div>
        </form>
      </div>
      <footer class="component-attr-hero-footer">
        <button type="button" class="btn btn-sm" data-new-flow-back>Cancelar</button>
        <button type="submit" form="form-new-flow" class="btn btn-primary" ${hasTypes ? "" : "disabled"}>Crear flujo</button>
      </footer>
    </section>`;
    bindFlowTypeGotoButton(mainEl, () => exitNewFlowScreen());
    const goBack = () => {
      exitNewFlowScreen();
      renderDesigner(mainEl, state, persist);
    };
    mainEl.querySelectorAll("[data-new-flow-back]").forEach((btn) => {
      btn.addEventListener("click", goBack);
    });
    mainEl.querySelector("#form-new-flow")?.addEventListener("submit", (e) => {
      e.preventDefault();
      if (isCatalogActionsBlocked()) {
        toast(designerBlockedMessage().body);
        return;
      }
      const fd = new FormData(e.target);
      const built = buildNewFlowFromForm(fd, state);
      if (!built) return;
      const { flow, startId } = built;
      state.flows.push(flow);
      persist();
      exitNewFlowScreen();
      designerContext.selectedFlowId = flow.id;
      designerContext.selectedNodeId = startId;
      designerContext._viewFitForFlowId = null;
      renderDesigner(mainEl, state, persist);
      toast("Flujo creado con Start y End. Eleg\xED un tipo de l\xEDnea y conect\xE1 desde el puerto del nodo.", 3200, "success");
    });
    if (hasTypes) {
      mainEl.querySelector('#form-new-flow input[name="name"]')?.focus();
    }
  }
  function bindCatalog(mainEl, state, persist) {
    const onNew = () => enterNewFlowScreen(mainEl, state, persist);
    mainEl.querySelector("#btn-new-flow-empty")?.addEventListener("click", onNew);
    mainEl.querySelector("#btn-new-flow-table")?.addEventListener("click", onNew);
    mainEl.querySelectorAll("[data-open-flow]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.disabled || isCatalogActionsBlocked()) {
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
    mainEl.querySelectorAll("[data-version-flow]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.disabled || isCatalogActionsBlocked()) {
          toast(designerBlockedMessage().body);
          return;
        }
        attemptVersionFlow(mainEl, state, persist, btn.dataset.versionFlow);
      });
    });
    mainEl.querySelectorAll("[data-activate-flow]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.disabled || isCatalogActionsBlocked()) {
          toast(designerBlockedMessage().body);
          return;
        }
        attemptActivateFlow(mainEl, state, persist, btn.dataset.activateFlow, { returnToCatalog: true });
      });
    });
    mainEl.querySelectorAll("[data-toggle-deprecados]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const lineageId = btn.dataset.toggleDeprecados;
        if (!lineageId) return;
        if (designerContext.catalogExpandedLineages.has(lineageId)) {
          designerContext.catalogExpandedLineages.delete(lineageId);
        } else {
          designerContext.catalogExpandedLineages.add(lineageId);
        }
        renderDesigner(mainEl, state, persist);
      });
    });
  }
  function openFlowValidationModal(mainEl, state, persist, flow, errors) {
    const items = errors.length > 0 ? errors.map((e) => `<li>${escapeHtml(e)}</li>`).join("") : "<li>Validaci\xF3n fallida sin detalle.</li>";
    const { close, root } = openModal(`
    <div class="modal-header">
      <h2>No se puede activar el flujo</h2>
      <button type="button" class="btn btn-sm" data-modal-close>Cerrar</button>
    </div>
    <div class="validation-modal-body">
      <p class="validation-modal-intro">
        <strong>${escapeHtml(flow.name ?? "Flujo")}</strong> est\xE1 en borrador. Correg\xED estos problemas antes de pasar a Listo:
      </p>
      <ul class="validation-list validation-modal-list">${items}</ul>
      <div class="validation-modal-actions">
        <button type="button" class="btn btn-primary" id="btn-validation-open-flow">Abrir flujo</button>
        <button type="button" class="btn" data-modal-close>Cerrar</button>
      </div>
    </div>
  `);
    root.querySelector("#btn-validation-open-flow")?.addEventListener("click", () => {
      designerContext.selectedFlowId = flow.id;
      designerContext.selectedNodeId = null;
      designerContext.studioMode = "path";
      close();
      renderDesigner(mainEl, state, persist);
    });
  }
  function attemptActivateFlow(mainEl, state, persist, flowId, options = {}) {
    const flow = state.flows.find((f) => f.id === flowId);
    if (!flow) return;
    if (flow.status !== "borrador") {
      toast("Solo pod\xE9s activar flujos en borrador.");
      return;
    }
    const v = validateFlow(flow);
    if (!v.isValid) {
      openFlowValidationModal(mainEl, state, persist, flow, v.errors);
      return;
    }
    const result = publishFlow(state.flows, flow.id);
    if (!result.ok) {
      toast(result.error ?? "No se pudo activar el flujo.");
      return;
    }
    persist();
    toast(
      `Estado Listo (${formatFlowVersion(flow)}). Pod\xE9s instanciarlo en Gesti\xF3n o versionarlo desde el cat\xE1logo.`,
      3200,
      "success"
    );
    if (options.returnToCatalog) {
      enterDesignerCatalog("flows");
    }
    renderDesigner(mainEl, state, persist);
  }
  function attemptVersionFlow(mainEl, state, persist, flowId) {
    const { flow: draft, error } = createVersionDraft(state.flows, flowId);
    if (error) {
      toast(error);
      return;
    }
    state.flows.push(draft);
    persist();
    designerContext.selectedFlowId = draft.id;
    designerContext.selectedNodeId = null;
    designerContext._viewFitForFlowId = null;
    toast("Borrador creado. Edit\xE1 y confirm\xE1 la versi\xF3n cuando est\xE9 listo.", 3200, "success");
    renderDesigner(mainEl, state, persist);
  }
  function attemptDeleteFlow(mainEl, state, persist, flowId) {
    const flow = state.flows.find((f) => f.id === flowId);
    if (!flow) return;
    if (flow.status !== "borrador") {
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
    if (designerContext.readOnly) parts.push("is-read-only");
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
      <span class="toolbar-flow-title">${escapeHtml(flow.name)} ${renderFlowStatusBadge(flow)} <span class="toolbar-flow-version">${escapeHtml(formatFlowVersion(flow))}</span></span>
      <span class="toolbar-divider" aria-hidden="true"></span>
      <div class="toolbar-group">
        <button type="button" class="btn btn-sm" id="btn-flow-meta" ${designerContext.readOnly ? 'disabled aria-disabled="true"' : ""}>Metadatos</button>
        ${flow.status === "borrador" ? `<button type="button" class="btn btn-sm btn-success" id="btn-confirm-version">Activar</button>
        <button type="button" class="btn btn-sm btn-danger" id="btn-delete-flow">Eliminar</button>` : ""}
        ${flow.status === "listo" ? `<button type="button" class="btn btn-sm" id="btn-versionar">Versionar</button>` : ""}
      </div>
      <span class="toolbar-divider" aria-hidden="true"></span>
      <div class="toolbar-group">
        <button type="button" class="btn btn-sm" id="btn-toggle-copilot">\u2728 Copilot</button>
      </div>
    </div>
    ${validation.isValid ? "" : `<ul class="validation-list">${validation.errors.map((e) => `<li>${escapeHtml(e)}</li>`).join("")}</ul>`}
    ${designerContext.readOnly ? `<p class="flow-readonly-banner" role="status">Vista de solo lectura. ${escapeHtml(designerReadOnlyMessage(flow))}</p>` : flow.supersedesFlowId ? `<p class="flow-draft-banner" role="status">Borrador de nueva versi\xF3n. Al confirmar, reemplazar\xE1 la versi\xF3n publicada anterior (quedar\xE1 deprecada).</p>` : ""}
    <div class="${designerSplitClassNames()}" id="designer-split">
      <aside class="panel palette designer-side-panel" id="designer-palette-panel">
        <div class="designer-panel-head">
          <h3 class="panel-title">Elementos BPMN</h3>
          <button type="button" class="btn btn-sm designer-panel-close" data-designer-close="palette" aria-label="Cerrar elementos">\xD7</button>
        </div>
        <div class="palette-panel-scroll">
          ${renderUiCollapse("palette-activities", "Eventos y actividades", renderPaletteActivitiesBody(), false, "palette-section-collapse")}
          ${renderUiCollapse("palette-lines", "L\xEDneas", renderPaletteLinesBody(), false, "palette-section-collapse")}
          <p class="palette-hint">Expand\xED cada secci\xF3n para ver elementos. Conect\xE1 con el punto del borde derecho (arrastrar) o \xABConectar\xBB en el men\xFA del nodo.</p>
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
    const lock = designerContext.readOnly ? " disabled" : "";
    const rows = GATEWAY_TYPE_CATALOG.map(
      (entry) => `
    <label class="gateway-type-option ${entry.enabled ? "" : "gateway-type-option-future"}">
      <input type="radio" name="gatewayType" value="${entry.id}" ${entry.id === current ? "checked" : ""} ${entry.enabled && !designerContext.readOnly ? "" : "disabled"}${lock} />
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
  function removeLaneFromFlow(flow, laneId) {
    if (flow.lanes.length <= 1) {
      toast("Debe quedar al menos un lane.");
      return false;
    }
    const fallback = flow.lanes.find((l) => l.id !== laneId)?.id;
    flow.lanes = flow.lanes.filter((l) => l.id !== laneId);
    for (const node of flow.nodes) {
      if (node.laneId === laneId) node.laneId = fallback;
    }
    return true;
  }
  function deleteFlowTransitionById(flow, transitionId) {
    const len = flow.transitions.length;
    flow.transitions = flow.transitions.filter((t) => t.id !== transitionId);
    return flow.transitions.length < len;
  }
  function renderFlowPoolMarkup(flow) {
    const layout = getLaneLayout(flow);
    const canRemoveLane = !designerContext.readOnly && flow.lanes.length > 1;
    const lanesHtml = layout.lanes.map(
      (lane) => `
    <div class="flow-lane" data-lane-id="${lane.id}" style="height:${lane.height}px">
      <div class="flow-lane-title" title="Rol, grupo o perfil">
        ${canRemoveLane ? `<button type="button" class="flow-lane-remove" data-remove-lane-canvas="${lane.id}" aria-label="Eliminar lane" title="Eliminar lane">\xD7</button>` : ""}
        <span class="flow-lane-title-text">${escapeHtml(lane.name)}</span>
      </div>
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
    const ro = propsReadonlyAttrs();
    const lanesHtml = flow.lanes.map(
      (lane) => `
    <div class="lane-editor-row" data-lane-row="${lane.id}">
      <input type="text" class="lane-name-input" data-lane-id="${lane.id}" value="${escapeHtml(lane.name)}" placeholder="Rol, grupo o perfil" aria-label="Nombre de lane"${ro} />
      ${!designerContext.readOnly && flow.lanes.length > 1 ? `<button type="button" class="btn btn-sm btn-danger" data-remove-lane="${lane.id}" aria-label="Quitar lane">\xD7</button>` : ""}
    </div>`
    ).join("");
    const body = `
    <p class="props-intro">El <strong>pool</strong> muestra el nombre del flujo. Cada <strong>lane</strong> representa un rol, grupo o perfil.</p>
    ${designerContext.readOnly ? `<p class="props-intro props-intro--readonly">${escapeHtml(designerReadOnlyMessage(flow))}</p>` : ""}
    <div class="form-row"><label>Pool (nombre del flujo)</label><input id="flow-pool-name" value="${escapeHtml(flow.name)}" readonly title="Edit\xE1 el nombre en Metadatos" /></div>
    <h4 class="props-subtitle">Lanes</h4>
    ${lanesHtml}
    ${designerContext.readOnly ? "" : `<button type="button" class="btn btn-sm" id="btn-add-lane" style="margin-top:0.5rem">+ Agregar lane</button>`}`;
    return `<div class="flow-diagram-props">${renderPropsCollapse("pool-lanes", "Pool y lanes", body, true)}</div>`;
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
      case NODE_KINDS.AGENTE_IA:
        return [
          gatewayMenu("siempre"),
          taskMenu("siempre"),
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
  function renderFlowPorts(node, isSelected) {
    if (!isSelected || designerContext.readOnly || node.kind === NODE_KINDS.FIN) return "";
    if (node.kind === NODE_KINDS.GATEWAY) {
      return `
      <button type="button" class="flow-port flow-port-accept" data-condition="aceptar" style="top:30%" title="Arrastr\xE1 para conectar (aceptar)" aria-label="Conectar rama aceptar"></button>
      <button type="button" class="flow-port flow-port-reject" data-condition="rechazar" style="top:70%" title="Arrastr\xE1 para conectar (rechazar)" aria-label="Conectar rama rechazar"></button>`;
    }
    return `<button type="button" class="flow-port" data-condition="siempre" title="Arrastr\xE1 para conectar" aria-label="Conectar"></button>`;
  }
  function renderContextPadConnectButtons(node) {
    if (designerContext.readOnly || node.kind === NODE_KINDS.FIN) return "";
    if (node.kind === NODE_KINDS.GATEWAY) {
      return `
      <button type="button" class="context-pad-btn context-pad-connect" data-context-connect data-connect-condition="aceptar" title="Conectar con elemento existente (aceptar)">
        ${contextPadLabel("Conectar A")}
      </button>
      <button type="button" class="context-pad-btn context-pad-connect" data-context-connect data-connect-condition="rechazar" title="Conectar con elemento existente (rechazar)">
        ${contextPadLabel("Conectar R")}
      </button>`;
    }
    return `
      <button type="button" class="context-pad-btn context-pad-connect" data-context-connect data-connect-condition="siempre" title="Conectar con un elemento existente en el lienzo">
        ${contextPadLabel("Conectar")}
      </button>`;
  }
  function renderNodeInteractionChrome(node, isSelected) {
    if (!isSelected) return "";
    return `${renderFlowPorts(node, isSelected)}${renderContextPad(node, isSelected)}`;
  }
  function renderContextPad(node, isSelected) {
    if (!isSelected) return "";
    const selectionHandles = `
    <div class="selection-handles" aria-hidden="true">
      <span class="selection-handle selection-handle-nw"></span>
      <span class="selection-handle selection-handle-ne"></span>
      <span class="selection-handle selection-handle-sw"></span>
      <span class="selection-handle selection-handle-se"></span>
    </div>`;
    if (designerContext.readOnly) {
      return selectionHandles;
    }
    const isEnd = node.kind === NODE_KINDS.FIN;
    const actions = isEnd ? [] : getContextPadAppendActions(node);
    const appendBtns = actions.map((entry) => renderContextPadAppendEntry(node, entry)).join("");
    const connectBtns = renderContextPadConnectButtons(node);
    const deleteBtn = node.kind === NODE_KINDS.INICIO ? "" : `<button type="button" class="context-pad-btn context-pad-btn-danger" data-context-delete-node title="Eliminar elemento" aria-label="Eliminar elemento">
      <span class="context-pad-delete-icon" aria-hidden="true">\u{1F5D1}</span>
      ${contextPadLabel("Eliminar")}
    </button>`;
    return `
    ${selectionHandles}
    <div class="context-pad" role="toolbar" aria-label="Acciones r\xE1pidas BPMN">
      ${appendBtns}
      ${connectBtns}
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
      ${renderNodeInteractionChrome(node, isSelected)}
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
    const ro = propsReadonlyAttrs();
    const roCheck = designerContext.readOnly || node.kind === "inicio" ? " disabled" : "";
    const paramsHtml = flow.inputParams.map(
      (p) => `
      <label style="display:flex;gap:0.35rem;align-items:center;font-size:0.85rem;margin-bottom:0.35rem">
        <input type="checkbox" data-used-param="${p.id}" ${(node.usedParamIds ?? []).includes(p.id) ? "checked" : ""}${roCheck} />
        ${escapeHtml(p.label)} (${escapeHtml(p.key)})
      </label>`
    ).join("") || "<p style='font-size:0.8rem;color:var(--muted)'>Sin par\xE1metros. Def\xEDnalos en el nodo Inicio.</p>";
    const transitions = flow.transitions.filter((t) => t.fromId === node.id);
    const incomingTransitions = flow.transitions.filter((t) => t.toId === node.id);
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
    const screenBtn = node.kind === NODE_KINDS.MANUAL && !designerContext.readOnly ? `<button type="button" class="btn btn-primary btn-sm" id="btn-design-screen" style="width:100%;margin-top:0.5rem">Dise\xF1ar pantalla (estudio)</button>` : "";
    const automationBtn = node.kind === NODE_KINDS.AUTOMATICA && !designerContext.readOnly ? `<button type="button" class="btn btn-primary btn-sm" id="btn-design-automation" style="width:100%;margin-top:0.5rem">Dise\xF1ar automatizaci\xF3n</button>` : "";
    const agenteIABtn = node.kind === NODE_KINDS.AGENTE_IA && !designerContext.readOnly ? `<button type="button" class="btn btn-primary btn-sm" id="btn-design-agente-ia" style="width:100%;margin-top:0.5rem">Configurar Agente IA</button>` : "";
    ensureFlowDiagram(flow);
    const laneOptions = flow.lanes.map(
      (lane) => `<option value="${lane.id}" ${node.laneId === lane.id ? "selected" : ""}>${escapeHtml(lane.name)}</option>`
    ).join("");
    const eventPoolHint = node.kind === NODE_KINDS.INICIO || node.kind === NODE_KINDS.FIN ? `<p class="props-intro">Debe permanecer dentro del pool; pod\xE9s usar otro lane (rol / grupo).</p>` : "";
    const generalBody = `
      ${designerContext.readOnly ? `<p class="props-intro props-intro--readonly">${escapeHtml(designerReadOnlyMessage(flow))}</p>` : ""}
      <div class="form-row"><label>Nombre</label><input name="name" value="${escapeHtml(node.name)}" required${ro} /></div>
      <div class="form-row"><label>Descripci\xF3n</label><textarea name="description"${ro}>${escapeHtml(node.description || "")}</textarea></div>
      <div class="form-row"><label>Lane (rol / perfil)</label><select name="laneId"${ro}>${laneOptions}</select></div>
      ${eventPoolHint}
      ${screenBtn}
      ${automationBtn}
      ${agenteIABtn}`;
    const inputDataSection = node.kind !== NODE_KINDS.INICIO && node.kind !== NODE_KINDS.FIN && node.kind !== NODE_KINDS.GATEWAY ? renderPropsCollapse("input-data", "Datos de entrada que usa", paramsHtml, false) : "";
    const componentAttrsKinds = COMPONENTS_WITH_INPUT_ATTRIBUTES.has(node.kind);
    const editAttrsBtn = (tab = "input") => !designerContext.readOnly && componentAttrsKinds ? `<button type="button" class="btn btn-sm btn-primary" id="btn-edit-component-attrs" data-attr-tab="${tab}" style="margin-top:0.5rem">Editar par\xE1metros de entrada</button>` : "";
    const componentInputSection = componentAttrsKinds ? renderPropsCollapse(
      "component-input-attrs",
      node.kind === NODE_KINDS.INICIO ? "Par\xE1metros de entrada del flujo" : "Par\xE1metros de entrada del componente",
      `<div class="component-attr-chip-list">${renderComponentAttributeChipsHtml(node.inputAttributes ?? [])}</div>${editAttrsBtn("input")}`,
      false
    ) : "";
    const componentOutputSection = node.kind === NODE_KINDS.GATEWAY ? renderPropsCollapse(
      "component-output-attrs",
      "Par\xE1metros de salida del componente",
      `<div class="component-attr-chip-list">${renderComponentAttributeChipsHtml(node.outputAttributes ?? [])}</div>${!designerContext.readOnly ? `<button type="button" class="btn btn-sm" id="btn-edit-component-attrs-out" data-attr-tab="output" style="margin-top:0.5rem">Editar par\xE1metros de salida</button>` : ""}`,
      false
    ) : "";
    const connectionListItem = (t, peerId, arrow) => {
      const peer = flow.nodes.find((n) => n.id === peerId);
      const lt = t.lineType ?? LINE_TYPES.SEQUENCE;
      const badge = lineTypeLabel(lt);
      const cond = t.condition ? ` \xB7 ${t.condition}` : "";
      const delBtn = designerContext.readOnly ? "" : ` <button type="button" class="btn btn-sm btn-danger" data-del-tr="${t.id}">\xD7</button>`;
      return `<li><span class="line-badge line-badge-${lt}">${badge}</span>${cond} ${arrow} ${escapeHtml(peer?.name ?? peerId)}${delBtn}</li>`;
    };
    const connectionsList = `
        <ul class="props-connection-list">
          ${transitions.map((t) => connectionListItem(t, t.toId, "\u2192")).join("") || "<li class='props-empty'>Ninguna</li>"}
        </ul>`;
    const incomingList = `
        <ul class="props-connection-list">
          ${incomingTransitions.map((t) => connectionListItem(t, t.fromId, "\u2190")).join("") || "<li class='props-empty'>Ninguna</li>"}
        </ul>`;
    const connectionsForm = node.kind === NODE_KINDS.FIN || designerContext.readOnly ? "" : `
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
    const incomingSection = renderPropsCollapse(
      "connections-in",
      "Conexiones entrantes",
      incomingList,
      incomingTransitions.length > 0
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
      ${componentInputSection}
      ${componentOutputSection}
      ${incomingSection}
      ${connectionsSection}
      ${designerContext.readOnly ? "" : `<button type="button" class="btn btn-danger btn-sm props-delete-node" id="btn-delete-node">Eliminar nodo</button>`}
    </form>`;
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
  function bindFlowEditor(mainEl, flow, state, persist, flowPersist) {
    const canvas = mainEl.querySelector("#flow-canvas");
    const wrap = mainEl.querySelector("#canvas-wrap");
    const saveFlow = flowPersist ?? createFlowPersist(flow, persist);
    bindDesignerSidePanels(mainEl, state, persist);
    bindStudioTabs(mainEl, state, persist);
    syncDesignerLayoutViewport(mainEl, flow, saveFlow);
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
      if (changed) saveFlow();
    }
    mainEl.querySelector("#btn-back-catalog")?.addEventListener("click", () => {
      enterDesignerCatalog("flows");
      renderDesigner(mainEl, state, persist);
    });
    mainEl.querySelector("#btn-delete-flow")?.addEventListener("click", () => {
      attemptDeleteFlow(mainEl, state, persist, flow.id);
    });
    mainEl.querySelector("#btn-confirm-version")?.addEventListener("click", () => {
      attemptActivateFlow(mainEl, state, persist, flow.id);
    });
    mainEl.querySelector("#btn-versionar")?.addEventListener("click", () => {
      attemptVersionFlow(mainEl, state, persist, flow.id);
    });
    mainEl.querySelector("#btn-flow-meta")?.addEventListener("click", () => {
      if (!isFlowEditable(flow)) {
        toast("Metadatos de solo lectura. Version\xE1 el flujo para editarlos.");
        return;
      }
      const { close, root } = openModal(`
      <div class="modal-header"><h2>Metadatos del flujo</h2><button type="button" class="btn btn-sm" data-modal-close>Cerrar</button></div>
      <form id="form-meta" class="form-grid">
        ${renderFlowTypeFormRow(state, flow)}
        <div class="form-row"><label>Nombre</label><input name="name" value="${escapeHtml(flow.name)}" required /></div>
        <div class="form-row"><label>Descripci\xF3n</label><textarea name="description">${escapeHtml(flow.description || "")}</textarea></div>
        <button type="submit" class="btn btn-primary" ${(state.flowTypes ?? []).length ? "" : "disabled"}>Guardar</button>
      </form>
    `);
      bindFlowTypeGotoButton(root, close);
      root.querySelector("#form-meta").addEventListener("submit", (e) => {
        e.preventDefault();
        if (!isFlowEditable(flow)) return;
        const fd = new FormData(e.target);
        if (!applyFlowMetaFromForm(flow, state, fd)) return;
        saveFlow();
        close();
        renderDesigner(mainEl, state, persist);
      });
    });
    wrap.addEventListener("dragover", (e) => {
      if (designerContext.readOnly) return;
      e.preventDefault();
    });
    wrap.addEventListener("drop", (e) => {
      e.preventDefault();
      if (designerContext.readOnly) {
        toast("Este flujo no es editable. Us\xE1 \xABVersionar\xBB para crear un borrador.");
        return;
      }
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
      saveFlow();
      renderDesigner(mainEl, state, persist);
    });
    mainEl.querySelectorAll(".palette-item[data-palette]").forEach((item) => {
      item.addEventListener("dragstart", (e) => {
        if (designerContext.readOnly) {
          e.preventDefault();
          return;
        }
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
        if (designerContext.readOnly && btn.dataset.tool !== "select") {
          toast(designerReadOnlyMessage(flow));
          return;
        }
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
    bindNodeDrag(mainEl, flow, saveFlow, state);
    bindLinkDrag(mainEl, flow, saveFlow, state);
    bindContextPad(mainEl, flow, state, saveFlow);
    bindCanvasViewport(mainEl, flow, state, persist);
    bindCanvasPan(mainEl, flow, state, persist);
    drawConnections(mainEl, flow);
    bindConnectionInteractions(mainEl, flow, state, saveFlow);
    bindLaneChrome(mainEl, flow, state, saveFlow);
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
    if (selected) {
      bindNodeProps(mainEl, flow, selected, state, saveFlow);
      bindComponentAttributesEditor(mainEl, flow, selected, state, saveFlow);
    } else bindFlowDiagramProps(mainEl, flow, state, saveFlow);
  }
  function bindComponentAttributesEditor(mainEl, flow, node, state, persist) {
    if (!COMPONENTS_WITH_INPUT_ATTRIBUTES.has(node.kind)) return;
    const openEditor = (initialTab) => {
      enterComponentAttributesEditor(mainEl, state, persist, {
        flowId: flow.id,
        nodeId: node.id,
        initialTab
      });
    };
    mainEl.querySelector("#btn-edit-component-attrs")?.addEventListener("click", () => {
      const tab = mainEl.querySelector("#btn-edit-component-attrs")?.dataset.attrTab;
      openEditor(tab === "output" ? "output" : "input");
    });
    mainEl.querySelector("#btn-edit-component-attrs-out")?.addEventListener("click", () => {
      openEditor("output");
    });
  }
  function bindCanvasViewport(mainEl, flow, state, persist) {
    const wrap = mainEl.querySelector("#canvas-wrap");
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
        if (!wrap) return;
        if (document.fullscreenElement === wrap) {
          await document.exitFullscreen();
        } else {
          await wrap.requestFullscreen();
        }
      },
      { signal }
    );
    document.addEventListener(
      "fullscreenchange",
      () => {
        if (!wrap || !mainEl.contains(wrap)) return;
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
      if (e.target.closest(".flow-node") || e.target.closest(".context-pad") || e.target.closest(".flow-connection-hit") || e.target.closest(".flow-lane-remove")) {
        return;
      }
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
          designerContext.connectClickFrom = null;
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
    if (designerContext.readOnly) return;
    mainEl.querySelector("#btn-add-lane")?.addEventListener("click", () => {
      if (designerContext.readOnly) {
        toast("Este flujo no es editable.");
        return;
      }
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
        if (designerContext.readOnly) {
          toast("Este flujo no es editable.");
          return;
        }
        const laneId = btn.dataset.removeLane;
        if (!removeLaneFromFlow(flow, laneId)) return;
        persist();
        renderDesigner(mainEl, state, persist);
      });
    });
  }
  function bindLaneChrome(mainEl, flow, state, persist) {
    mainEl.querySelectorAll("[data-remove-lane-canvas]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (designerContext.readOnly) {
          toast("Este flujo no es editable. Us\xE1 \xABVersionar\xBB para crear un borrador.");
          return;
        }
        const laneId = btn.dataset.removeLaneCanvas;
        if (!laneId) return;
        if (!removeLaneFromFlow(flow, laneId)) return;
        persist();
        renderDesigner(mainEl, state, persist);
        toast("Lane eliminado.");
      });
    });
  }
  function bindConnectionInteractions(mainEl, flow, state, persist) {
    const canvas = mainEl.querySelector("#flow-canvas");
    if (!canvas) return;
    canvas.addEventListener("click", (e) => {
      const hit = e.target.closest(".flow-connection-hit");
      if (!hit) return;
      if (designerContext.tool !== "select") return;
      e.stopPropagation();
      if (designerContext.readOnly) {
        toast("Este flujo no es editable.");
        return;
      }
      const group = hit.closest(".flow-connection-group");
      const transitionId = group?.dataset.transitionId;
      if (!transitionId) return;
      if (!deleteFlowTransitionById(flow, transitionId)) return;
      persist();
      renderDesigner(mainEl, state, persist);
      toast("Conexi\xF3n eliminada.");
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
          if (designerContext.connectClickFrom && designerContext.connectClickFrom.fromId !== nodeId) {
            e.preventDefault();
            e.stopPropagation();
            if (designerContext.readOnly) {
              toast("Este flujo no es editable.");
              return;
            }
            const { fromId, condition } = designerContext.connectClickFrom;
            const lineType = designerContext.activeLineType ?? LINE_TYPES.SEQUENCE;
            if (tryAddTransition(flow, fromId, nodeId, lineType, condition ?? null)) {
              persist();
              designerContext.connectClickFrom = null;
              renderDesigner(mainEl, state, persist);
            }
            return;
          }
          if (designerContext.tool !== "select") {
            e.preventDefault();
            e.stopPropagation();
            if (designerContext.readOnly) {
              toast("Este flujo no es editable. Us\xE1 \xABVersionar\xBB para crear un borrador.");
              return;
            }
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
              const fromNode = flow.nodes.find((n) => n.id === nodeId);
              if (fromNode?.kind === NODE_KINDS.GATEWAY && lineType === LINE_TYPES.SEQUENCE) {
                toast("Desde el gateway us\xE1 los puertos A/R o \xABConectar A / R\xBB en el men\xFA.");
                return;
              }
              const cond = lineType === LINE_TYPES.SEQUENCE ? "siempre" : null;
              designerContext.connectClickFrom = { fromId: nodeId, condition: cond };
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
          if (designerContext.readOnly) {
            e.preventDefault();
            return;
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
    canvas.querySelectorAll(".context-pad, .selection-handles, .flow-port").forEach((p) => p.remove());
    canvas.querySelectorAll(".flow-node").forEach((n) => n.classList.remove("is-selected"));
    if (!el || !node) return;
    el.classList.add("is-selected");
    const html = renderNodeInteractionChrome(node, true);
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
      const connectBtn = e.target.closest("[data-context-connect]");
      if (connectBtn) {
        e.stopPropagation();
        e.preventDefault();
        if (designerContext.readOnly) {
          toast("Este flujo no es editable.");
          return;
        }
        const nodeEl2 = connectBtn.closest(".flow-node");
        const fromId2 = nodeEl2?.dataset.nodeId;
        if (!fromId2) return;
        const fromNode = flow.nodes.find((n) => n.id === fromId2);
        if (!fromNode || fromNode.kind === NODE_KINDS.FIN) return;
        const branch = connectBtn.dataset.connectCondition || "siempre";
        const lineType = designerContext.activeLineType;
        let condition2 = null;
        if (lineType === LINE_TYPES.SEQUENCE) {
          condition2 = branch === "siempre" ? "siempre" : branch;
        }
        designerContext.connectClickFrom = { fromId: fromId2, condition: condition2 };
        designerContext.selectedNodeId = fromId2;
        closeContextPadSubmenus(canvas);
        toast("Seleccion\xE1 el nodo destino en el lienzo.");
        renderDesigner(mainEl, state, persist);
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
        if (designerContext.readOnly) {
          toast("Este flujo no es editable. Us\xE1 \xABVersionar\xBB para crear un borrador.");
          return;
        }
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
      if (!from || !svg) return;
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
  function connectionLineStyle(lineType) {
    const lt = lineType ?? LINE_TYPES.SEQUENCE;
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
    return { stroke, dash, markerStart, markerEnd };
  }
  function buildLineSvg(x1, y1, x2, y2, lineType, isPreview) {
    const { stroke, dash, markerStart, markerEnd } = connectionLineStyle(lineType);
    const idAttr = isPreview ? ' id="link-preview"' : "";
    const op = isPreview ? ' opacity="0.9"' : "";
    return `<line${idAttr} x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="2"${dash}${markerStart} marker-end="${markerEnd}"${op} />`;
  }
  function buildConnectionSvgGroup(x1, y1, x2, y2, lineType, transitionId) {
    const { stroke, dash, markerStart, markerEnd } = connectionLineStyle(lineType);
    const hit = !designerContext.readOnly && transitionId ? `<line class="flow-connection-hit" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="transparent" stroke-width="14" pointer-events="stroke" />` : "";
    const title = !designerContext.readOnly && transitionId ? `<title>Clic para eliminar conexi\xF3n</title>` : "";
    return `<g class="flow-connection-group" data-transition-id="${transitionId}">${title}${hit}<line class="flow-connection-line" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="2"${dash}${markerStart} marker-end="${markerEnd}" pointer-events="none" /></g>`;
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
      return `${buildConnectionSvgGroup(a.x, a.y, b.x, b.y, lt, t.id)}${label}`;
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
    if (designerContext.readOnly) return;
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
        if (designerContext.readOnly) {
          toast("Este flujo no es editable.");
          return;
        }
        if (!deleteFlowTransitionById(flow, btn.dataset.delTr)) return;
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
            type: "pendiente",
            message: `Gateway pendiente: ${node.name}`,
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
  async function resolveGateway(instance, decision) {
    const nodeId = instance.currentNodeId;
    const node = findNode(instance.flowSnapshot, nodeId);
    if (!node || node.kind !== NODE_KINDS.GATEWAY) {
      throw new Error("No hay Gateway pendiente");
    }
    if (decision !== "aceptar" && decision !== "rechazar") {
      throw new Error("Decisi\xF3n de gateway inv\xE1lida");
    }
    completeStep(instance, nodeId, "completada", decision);
    appendTrace(instance, {
      type: "gateway",
      message: `${node.name}: ${decision}`,
      nodeId,
      decision
    });
    const nextId = nextNodeId(instance.flowSnapshot, nodeId, decision);
    if (!nextId) {
      instance.status = decision === "rechazar" ? "cerrada_rechazo" : "completada";
      instance.finishedAt = (/* @__PURE__ */ new Date()).toISOString();
      instance.currentNodeId = null;
      return instance;
    }
    instance.currentNodeId = nextId;
    return await proceedFromNode(instance, nextId);
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
  function statusLabel2(status) {
    const map = {
      en_curso: "En curso",
      completada: "Completada",
      cerrada_rechazo: "Cerrada por rechazo"
    };
    return map[status] ?? status;
  }

  // js/gestion-input-fields.js
  var HTML_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  function localTodayHtmlDate() {
    const d = /* @__PURE__ */ new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  function htmlDateFromUnknown(raw) {
    if (raw === null || raw === void 0 || raw === "") return "";
    const s = String(raw).trim();
    if (HTML_DATE_RE.test(s)) return s;
    if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, 10);
    const dmy = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
    if (dmy) {
      const day = dmy[1].padStart(2, "0");
      const month = dmy[2].padStart(2, "0");
      const year = dmy[3];
      return `${year}-${month}-${day}`;
    }
    const parsed = new Date(s);
    if (!Number.isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, "0");
      const day = String(parsed.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    }
    return "";
  }
  var DATE_PICKER_ICON = `<svg class="date-input-picker-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
  function renderHtmlDateField(name, label, required, prefill) {
    const req = required ? "required" : "";
    const normalized = htmlDateFromUnknown(prefill);
    const value = normalized || localTodayHtmlDate();
    return `
    <div class="form-row form-row--date">
      <label>${escapeHtml(label)}${required ? " *" : ""}</label>
      <div class="date-input-wrap">
        <input type="date" class="input-date-native" name="${name}" ${req} value="${escapeHtml(value)}" />
        <button type="button" class="date-input-picker-btn" data-date-picker-trigger tabindex="-1" aria-label="Abrir calendario">
          ${DATE_PICKER_ICON}
        </button>
      </div>
    </div>`;
  }
  function bindNativeDateFields(root) {
    root.querySelectorAll(".date-input-wrap").forEach((wrap) => {
      const input = wrap.querySelector('input[type="date"]');
      const trigger = wrap.querySelector("[data-date-picker-trigger]");
      if (!input || !trigger || trigger.dataset.dateBound === "1") return;
      trigger.dataset.dateBound = "1";
      const openPicker = () => {
        if (typeof input.showPicker === "function") {
          try {
            input.showPicker();
            return;
          } catch {
          }
        }
        input.focus();
      };
      trigger.addEventListener("click", (e) => {
        e.preventDefault();
        openPicker();
      });
      input.addEventListener("click", () => {
        if (typeof input.showPicker === "function") {
          try {
            input.showPicker();
          } catch {
          }
        }
      });
    });
  }
  function renderInstanceParamField(p) {
    const key = escapeHtml(p.key);
    const req = p.required ? "required" : "";
    const cardinality = p.cardinality ?? INPUT_CARDINALITY.UNICO;
    const options = Array.isArray(p.listOptions) ? p.listOptions : [];
    const prefill = p._prefill;
    if (cardinality === INPUT_CARDINALITY.LISTA && options.length > 0) {
      const selected = Array.isArray(prefill) ? prefill.map(String) : [];
      const boxes = options.map((o, i) => {
        const id = `${key}_opt_${i}`;
        const val = escapeHtml(o.label);
        const checked = selected.includes(o.label) ? "checked" : "";
        return `<label class="instance-list-option" for="${id}"><input type="checkbox" id="${id}" name="${key}__list" value="${val}" data-opt-required="${o.required ? "1" : "0"}" ${checked} /> ${val}${o.required ? " *" : ""}</label>`;
      }).join("");
      return `<div class="form-row form-row--list"><label>${escapeHtml(p.label)}${p.required ? " *" : ""}</label><div class="instance-list-options">${boxes}</div></div>`;
    }
    if (cardinality === INPUT_CARDINALITY.UNICO && options.length > 0) {
      const prefillStr = prefill === null || prefill === void 0 ? "" : String(prefill);
      const optsHtml = options.map((o) => {
        const val = escapeHtml(o.label);
        const sel = prefillStr === o.label ? "selected" : "";
        return `<option value="${val}" ${sel}>${val}${o.required ? " *" : ""}</option>`;
      }).join("");
      const selectReq = p.required ? "required" : "";
      return `<div class="form-row"><label>${escapeHtml(p.label)}</label><select name="${key}" ${selectReq}><option value="">\u2014</option>${optsHtml}</select></div>`;
    }
    const valueAttr = prefill !== null && prefill !== void 0 && prefill !== "" ? ` value="${escapeHtml(String(prefill))}"` : "";
    if (p.type === "fecha") {
      return renderHtmlDateField(key, p.label, !!p.required, prefill);
    }
    let input = `<input name="${key}" ${req}${valueAttr} />`;
    if (p.type === "numero") input = `<input type="number" name="${key}" ${req}${valueAttr} />`;
    if (p.type === "si_no") {
      const pre = prefill === null || prefill === void 0 ? "" : String(prefill);
      input = `<select name="${key}" ${req}><option value="">\u2014</option><option value="si"${pre === "si" ? " selected" : ""}>S\xED</option><option value="no"${pre === "no" ? " selected" : ""}>No</option></select>`;
    }
    return `<div class="form-row"><label>${escapeHtml(p.label)}</label>${input}</div>`;
  }
  function renderInputFieldsHtml(flow) {
    return (flow.inputParams ?? []).map((p) => renderInstanceParamField(p)).join("");
  }
  function readInstanceParamValue(fd, p) {
    const errors = [];
    const raw = fd.get(p.key);
    const cardinality = p.cardinality ?? INPUT_CARDINALITY.UNICO;
    const options = Array.isArray(p.listOptions) ? p.listOptions : [];
    if (cardinality === INPUT_CARDINALITY.LISTA && options.length > 0) {
      const selected = fd.getAll(`${p.key}__list`).map((v) => String(v));
      if (p.required && selected.length === 0) {
        errors.push(`Campo obligatorio: ${p.label ?? p.key}.`);
      }
      for (const o of options) {
        if (o.required && !selected.includes(o.label)) {
          errors.push(`Opci\xF3n obligatoria \xAB${o.label}\xBB en ${p.label ?? p.key}.`);
        }
      }
      return { value: selected, errors };
    }
    if (cardinality === INPUT_CARDINALITY.UNICO && options.length > 0) {
      const val2 = raw === null || raw === void 0 ? "" : String(raw);
      if (p.required && !val2.trim()) {
        errors.push(`Campo obligatorio: ${p.label ?? p.key}.`);
      }
      return { value: val2, errors };
    }
    let val = raw;
    if (p.type === "numero" && val !== "" && val !== null) val = Number(val);
    if (val === null || val === void 0) val = "";
    if (p.required && !String(val).trim()) {
      errors.push(`Campo obligatorio: ${p.label ?? p.key}.`);
    }
    return { value: val, errors };
  }

  // js/gestion-catalog.js
  function getReadyFlowsByType(flows) {
    const map = /* @__PURE__ */ new Map();
    for (const flow of flows ?? []) {
      if (flow.status !== "listo") continue;
      const type = String(flow.type ?? "").trim() || "Sin tipo";
      if (!map.has(type)) map.set(type, []);
      map.get(type).push(flow);
    }
    for (const [, list] of map) {
      list.sort((a, b) => {
        const na = (a.name ?? "").localeCompare(b.name ?? "", "es");
        if (na !== 0) return na;
        return (b.version ?? 0) - (a.version ?? 0);
      });
    }
    return map;
  }
  function listReadyFlowTypes(byType) {
    return [...byType.keys()].sort((a, b) => a.localeCompare(b, "es"));
  }
  function formatFlowCatalogLabel(flow) {
    return `${flow.name ?? "Flujo"} (${formatFlowVersion(flow)})`;
  }

  // js/gestion-instance-helpers.js
  function formatInstanceValue(val) {
    if (Array.isArray(val)) return val.filter(Boolean).join(", ") || "\u2014";
    if (val === null || val === void 0 || val === "") return "\u2014";
    return String(val);
  }
  function componentAttrContextKey(nodeId, attrKey) {
    return `${nodeId}__${attrKey}`;
  }
  function isInstanceFinalized(status) {
    return status !== "en_curso";
  }
  function instanceStatusBadgeClass(status) {
    if (status === "en_curso") return "curso";
    if (status === "completada") return "completada";
    return "rechazada";
  }
  function formatStepStatusLabel(status) {
    const map = {
      aceptada: "Aceptada",
      rechazada: "Rechazada",
      completada: "Completada",
      pendiente: "Pendiente"
    };
    return map[status ?? ""] ?? status ?? "\u2014";
  }
  function buildInstanceDataSections(instance) {
    const snap = instance.flowSnapshot;
    const nodes = snap?.nodes ?? [];
    const nodeById = Object.fromEntries(nodes.map((n) => [n.id, n]));
    const sectionOrder = [];
    const sectionByKey = /* @__PURE__ */ new Map();
    const ensureSection = (key, fallbackTitle) => {
      if (!sectionByKey.has(key)) {
        const node = key.includes("__") ? null : nodeById[key];
        const sec = {
          sectionKey: key,
          nodeId: node?.id ?? key,
          title: node?.name ?? fallbackTitle,
          kind: node?.kind ?? "",
          at: null,
          status: null,
          comment: null,
          fields: []
        };
        sectionByKey.set(key, sec);
        sectionOrder.push(key);
      }
      return sectionByKey.get(key);
    };
    const addField = (sec, label, value) => {
      if (value === void 0) return;
      const lbl = String(label || "").trim() || "\u2014";
      if (sec.fields.some((f) => f.label === lbl)) return;
      sec.fields.push({ label: lbl, value: formatInstanceValue(value) });
    };
    const start = nodes.find((n) => n.kind === NODE_KINDS.INICIO);
    if (start) {
      const sec = ensureSection(start.id, "Inicio");
      sec.at = instance.startedAt ?? null;
      for (const p of snap.inputParams ?? []) {
        addField(sec, p.label || p.key, instance.inputValues?.[p.key]);
      }
      for (const attr of start.inputAttributes ?? []) {
        const a = normalizeComponentAttribute(attr);
        if (a.key) addField(sec, a.label || a.key, instance.inputValues?.[a.key]);
      }
      const inicioTrace = (instance.trace ?? []).find((t) => t.type === "inicio");
      if (inicioTrace?.dataShown && typeof inicioTrace.dataShown === "object") {
        for (const [k, v] of Object.entries(inicioTrace.dataShown)) {
          addField(sec, k, v);
        }
      }
    }
    for (const [ctxKey, val] of Object.entries(instance.context ?? {})) {
      const m = ctxKey.match(/^(.+)__(.+)$/);
      if (!m) continue;
      const [, nodeId, attrKey] = m;
      const node = nodeById[nodeId];
      const sec = ensureSection(nodeId, node?.name ?? "Paso");
      const attr = (node?.inputAttributes ?? []).find(
        (a) => normalizeComponentAttribute(a).key === attrKey
      );
      const label = attr ? normalizeComponentAttribute(attr).label || attrKey : attrKey;
      addField(sec, label, val);
    }
    for (const step of instance.steps ?? []) {
      const sec = ensureSection(step.nodeId, "Paso");
      if (!sec.at || new Date(step.at).getTime() >= new Date(sec.at).getTime()) {
        sec.at = step.at;
      }
      sec.status = step.status;
      if (step.comment) sec.comment = step.comment;
    }
    for (const t of instance.trace ?? []) {
      if (!t.nodeId || !t.dataShown || typeof t.dataShown !== "object") continue;
      if (t.type === "inicio") continue;
      const sec = ensureSection(t.nodeId, "Paso");
      if (!sec.at && t.at) sec.at = t.at;
      if (t.decision && !sec.status) {
        sec.status = t.decision === "aceptar" ? "aceptada" : t.decision === "rechazar" ? "rechazada" : t.decision;
      }
      if (t.comment && !sec.comment) sec.comment = t.comment;
      for (const [k, v] of Object.entries(t.dataShown)) {
        const label = k === "comment" ? "Comentario" : k;
        addField(sec, label, v);
      }
    }
    const orphanKey = "__orphan__";
    for (const [k, v] of Object.entries(instance.context ?? {})) {
      if (/^.+__.+$/.test(k)) continue;
      const sec = ensureSection(orphanKey, "Otros datos");
      addField(sec, k, v);
    }
    const ordered = sectionOrder.map((k) => sectionByKey.get(k)).filter(Boolean).sort((a, b) => {
      if (a.kind === NODE_KINDS.INICIO) return -1;
      if (b.kind === NODE_KINDS.INICIO) return 1;
      if (a.sectionKey === orphanKey) return 1;
      if (b.sectionKey === orphanKey) return -1;
      const ta = a.at ? new Date(a.at).getTime() : 0;
      const tb = b.at ? new Date(b.at).getTime() : 0;
      return ta - tb;
    });
    return ordered.filter((s) => s.fields.length > 0 || s.status || s.comment);
  }
  function getFirstStartAttributeDisplay(instance) {
    const snap = instance.flowSnapshot;
    if (!snap) return "\u2014";
    const start = snap.nodes?.find((n) => n.kind === NODE_KINDS.INICIO);
    let first = null;
    if (start?.inputAttributes?.length) {
      const a = start.inputAttributes[0];
      first = { label: a.label || a.key || "?", key: a.key };
    } else if (snap.inputParams?.length) {
      const p = snap.inputParams[0];
      first = { label: p.label || p.key || "?", key: p.key };
    }
    if (!first?.key) return "\u2014";
    const val = instance.inputValues?.[first.key];
    return `${first.label}: ${formatInstanceValue(val)}`;
  }

  // js/gestion-component-fields.js
  function attrToParam(attr, nodeId, instance) {
    const a = normalizeComponentAttribute(attr);
    const ctxKey = componentAttrContextKey(nodeId, a.key);
    const stored = instance.context?.[ctxKey];
    return {
      id: a.id,
      key: `nodeattr_${a.id}`,
      storageKey: ctxKey,
      label: a.label,
      type: a.dataType,
      required: a.required,
      cardinality: a.cardinality,
      listOptions: a.listOptions,
      _prefill: stored
    };
  }
  function renderNodeInputAttributesForm(node, instance) {
    const attrs = node.inputAttributes ?? [];
    if (!attrs.length) return "";
    const fields = attrs.map((attr) => {
      const p = attrToParam(attr, node.id, instance);
      return renderInstanceParamField(p);
    }).join("");
    return `
    <section class="gestion-manage-attrs">
      <h3 class="gestion-manage-section-title">Datos del componente</h3>
      <form id="form-node-attrs" class="form-grid">${fields}</form>
    </section>`;
  }
  function readNodeInputAttributesFromForm(form, node, instance) {
    const errors = [];
    const patch = {};
    const fd = new FormData(form);
    for (const attr of node.inputAttributes ?? []) {
      const p = attrToParam(attr, node.id, instance);
      const { value, errors: fieldErrors } = readInstanceParamValue(fd, p);
      errors.push(...fieldErrors);
      patch[p.storageKey] = value;
    }
    return { errors, patch };
  }
  function applyComponentAttrPatch(instance, patch) {
    if (!instance.context) instance.context = {};
    Object.assign(instance.context, patch);
  }

  // js/gestion-flow-preview.js
  function nodePortOut2(node, condition = null) {
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
  function nodePortIn2(node) {
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
      fin: "End"
    }[node.kind];
    const icon = node.kind === NODE_KINDS.MANUAL ? `<span class="bpmn-task-icon" aria-hidden="true">\u{1F464}</span>` : node.kind === NODE_KINDS.AUTOMATICA ? `<span class="bpmn-task-icon" aria-hidden="true">\u2699</span>` : node.kind === NODE_KINDS.GATEWAY ? `<span class="bpmn-gateway-x gateway-mark gateway-mark-exclusive" aria-hidden="true"></span>` : "";
    const body = node.kind === NODE_KINDS.GATEWAY ? `<div class="gateway-node-shape">${icon}<div class="node-kind">${kindLabel}</div><div class="node-name">${escapeHtml(node.name)}</div></div>` : `${icon}<div class="node-kind">${kindLabel}</div><div class="node-name">${escapeHtml(node.name)}</div>`;
    return `
    <div class="flow-node flow-node--readonly node-${node.kind} ${isCurrent ? "is-instance-current" : ""}"
         style="left:${node.x}px;top:${node.y}px"
         title="${escapeHtml(node.name)}">
      ${body}
    </div>`;
  }
  function traceTypeLabel(type) {
    const map = {
      inicio: "Inicio",
      manual: "User Task",
      automatica: "Autom\xE1tico",
      gateway: "Gateway",
      integration_request: "Integraci\xF3n",
      integration_response: "Respuesta",
      fin: "Fin",
      error: "Error",
      info: "Info"
    };
    return map[type] ?? type ?? "Evento";
  }
  function traceDecisionLabel(decision) {
    if (decision === "aceptar") return "Aprobaci\xF3n / Aceptar";
    if (decision === "rechazar") return "Rechazo";
    return decision;
  }
  function renderInstanceDataPanel(sections) {
    if (!sections.length) {
      return `<p class="gestion-empty">Todav\xEDa no hay datos cargados en esta instancia.</p>`;
    }
    const cards = sections.map((sec) => {
      const meta = [
        sec.at ? `<time class="instance-preview-step-time">${formatDateTime(sec.at)}</time>` : "",
        sec.status ? `<span class="badge badge-${sec.status === "rechazada" ? "rechazada" : sec.status === "aceptada" ? "completada" : "curso"}">${escapeHtml(formatStepStatusLabel(sec.status))}</span>` : ""
      ].filter(Boolean).join("");
      const rows = sec.fields.map(
        (f) => `<tr><th scope="row">${escapeHtml(f.label)}</th><td>${escapeHtml(f.value)}</td></tr>`
      ).join("");
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
        ${rows ? `<table class="instance-preview-fields table-modern"><tbody>${rows}</tbody></table>` : `<p class="form-hint">Sin campos registrados.</p>`}
      </article>`;
    }).join("");
    return `<div class="instance-preview-data-list">${cards}</div>`;
  }
  function renderInstanceTracePanel(instance) {
    const trace = [...instance.trace ?? []].sort(
      (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()
    );
    if (!trace.length) {
      return `<p class="gestion-empty">Sin eventos en la traza.</p>`;
    }
    const items = trace.map((t) => {
      const node = instance.flowSnapshot?.nodes?.find((n) => n.id === t.nodeId);
      return `
      <li class="trace-item instance-preview-trace-item">
        <div class="instance-preview-trace-head">
          <time>${formatDateTime(t.at)}</time>
          <span class="badge badge-borrador">${escapeHtml(traceTypeLabel(t.type))}</span>
        </div>
        <p class="instance-preview-trace-msg">${escapeHtml(t.message)}</p>
        ${node ? `<p class="form-hint">Paso: ${escapeHtml(node.name)}</p>` : ""}
        ${t.decision ? `<p class="form-hint"><strong>Decisi\xF3n:</strong> ${escapeHtml(traceDecisionLabel(t.decision))}</p>` : ""}
        ${t.comment ? `<p class="form-hint"><strong>Comentario:</strong> ${escapeHtml(t.comment)}</p>` : ""}
      </li>`;
    }).join("");
    return `<ul class="trace-list instance-preview-trace-list">${items}</ul>`;
  }
  function renderFlowDiagramPanel(instance) {
    const flow = JSON.parse(JSON.stringify(instance.flowSnapshot));
    if (!flow.lanes?.length) {
      flow.lanes = [{ id: createId("lane"), name: "General", height: 180 }];
    }
    normalizeFlowNodes(flow);
    const layout = computeLaneLayout(flow, { viewportWidth: 960 });
    const nodeById = Object.fromEntries((flow.nodes ?? []).map((n) => [n.id, n]));
    const laneHtml = layout.lanes.map(
      (lane) => `<div class="flow-lane-band" style="top:${lane.top}px;left:${lane.left}px;width:${lane.width}px;height:${lane.height}px">
          <div class="flow-lane-title">${escapeHtml(lane.name)}</div>
        </div>`
    ).join("");
    const paths = (flow.transitions ?? []).map((t) => {
      const from = nodeById[t.fromId];
      const to = nodeById[t.toId];
      if (!from || !to) return "";
      const lt = t.lineType ?? LINE_TYPES.SEQUENCE;
      if (lt !== LINE_TYPES.SEQUENCE) return "";
      const cond = lt === LINE_TYPES.SEQUENCE ? t.condition : null;
      const a = nodePortOut2(from, cond === "siempre" ? null : cond);
      const b = nodePortIn2(to);
      return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#94a3b8" stroke-width="2" marker-end="url(#arrow-preview)" />`;
    }).join("");
    const nodesHtml = (flow.nodes ?? []).map((n) => renderPreviewNode(n, instance.currentNodeId)).join("");
    const legend = instance.currentNodeId ? `<p class="gestion-preview-legend">El paso resaltado es el paso actual de la instancia.</p>` : `<p class="gestion-preview-legend">Instancia finalizada \u2014 diagrama en solo lectura.</p>`;
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
  function renderFlowPreviewPageHtml(instance) {
    const dataSections = buildInstanceDataSections(instance);
    const statusBadge = `<span class="badge badge-${instanceStatusBadgeClass(instance.status)}">${escapeHtml(statusLabel2(instance.status))}</span>`;
    return `
    <section class="gestion-hero gestion-hero--preview panel">
      <header class="gestion-hero-header">
        <button type="button" class="btn btn-sm gestion-hero-back" data-gestion-back>Volver al listado</button>
        <div class="gestion-hero-heading">
          <h2>Visualizar flujo</h2>
          <p class="gestion-hero-subtitle">${escapeHtml(instance.flowName)} \xB7 ${statusBadge}</p>
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
  function bindFlowPreviewPage(root, instance, activeTab = "datos") {
    bindPreviewTabs(root, activeTab);
  }

  // js/gestion.js
  var gestionScreen = { mode: "list", instanceId: null };
  function enterGestionHub() {
    gestionScreen = { mode: "list", instanceId: null };
  }
  function stepKindBadge(node) {
    if (!node) return "";
    if (node.kind === NODE_KINDS.MANUAL) return `<span class="badge badge-curso">Manual</span>`;
    if (node.kind === NODE_KINDS.AUTOMATICA) return `<span class="badge badge-listo">Auto</span>`;
    if (node.kind === NODE_KINDS.GATEWAY) return `<span class="badge badge-borrador">Gateway</span>`;
    if (node.kind === NODE_KINDS.AGENTE_IA) return `<span class="badge badge-curso">Agente IA</span>`;
    return "";
  }
  function sortInstancesByStarted(activeInstances) {
    return [...activeInstances].sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
  }
  function sortInstancesByFinished(instances) {
    return [...instances].sort((a, b) => {
      const aEnd = a.finishedAt ? new Date(a.finishedAt).getTime() : 0;
      const bEnd = b.finishedAt ? new Date(b.finishedAt).getTime() : 0;
      if (bEnd !== aEnd) return bEnd - aEnd;
      return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
    });
  }
  function renderInstanceStatusBadge(status) {
    const cls = instanceStatusBadgeClass(status);
    return `<span class="badge badge-${cls}">${escapeHtml(statusLabel2(status))}</span>`;
  }
  function renderActiveInstancesTable(instances) {
    if (!instances.length) {
      return `<p class="gestion-empty">No hay instancias en curso.</p>`;
    }
    const rows = instances.map((inst) => {
      const node = getCurrentNode(inst);
      const flowType = inst.flowSnapshot?.type ?? "\u2014";
      const startAttr = getFirstStartAttributeDisplay(inst);
      return `
    <tr class="gestion-instance-row" data-inst-row="${inst.id}">
      <td><strong>${escapeHtml(inst.flowName)}</strong></td>
      <td>${escapeHtml(flowType)}</td>
      <td class="gestion-cell-muted">${formatDateTime(inst.startedAt)}</td>
      <td class="gestion-cell-muted">${escapeHtml(startAttr)}</td>
      <td>
        <span class="gestion-step-label">${escapeHtml(node?.name ?? "\u2014")}</span>
        ${stepKindBadge(node)}
      </td>
      <td class="gestion-instance-actions">
        <button type="button" class="btn btn-sm btn-primary" data-manage-inst="${inst.id}">Gestionar</button>
        <button type="button" class="btn btn-sm" data-view-inst="${inst.id}">Visualizar</button>
      </td>
    </tr>`;
    }).join("");
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
      return `<p class="gestion-empty">No hay instancias finalizadas.</p>`;
    }
    const rows = instances.map((inst) => {
      const flowType = inst.flowSnapshot?.type ?? "\u2014";
      const startAttr = getFirstStartAttributeDisplay(inst);
      const finished = inst.finishedAt ? formatDateTime(inst.finishedAt) : "\u2014";
      return `
    <tr class="gestion-instance-row gestion-instance-row--final" data-inst-row="${inst.id}">
      <td><strong>${escapeHtml(inst.flowName)}</strong></td>
      <td>${escapeHtml(flowType)}</td>
      <td class="gestion-cell-muted">${formatDateTime(inst.startedAt)}</td>
      <td class="gestion-cell-muted">${escapeHtml(startAttr)}</td>
      <td>${renderInstanceStatusBadge(inst.status)}</td>
      <td class="gestion-cell-muted">${finished}</td>
      <td class="gestion-instance-actions">
        <button type="button" class="btn btn-sm" data-view-inst="${inst.id}">Visualizar</button>
      </td>
    </tr>`;
    }).join("");
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
  function renderNewInstanceFormFields(readyFlows, types) {
    if (!readyFlows.length) {
      return `<p class="gestion-empty">No hay flujos listos. Activ\xE1 uno en el dise\xF1ador.</p>`;
    }
    const typeOptions = types.map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("");
    return `
    <form id="form-new-instance" class="form-grid">
      <div class="form-row">
        <label>Tipo de flujo</label>
        <select id="select-flow-type" required>
          <option value="">\u2014 Eleg\xED un tipo \u2014</option>
          ${typeOptions}
        </select>
      </div>
      <div class="form-row">
        <label>Flujo (listo)</label>
        <select name="flowId" id="select-flow" required disabled>
          <option value="">\u2014 Eleg\xED tipo primero \u2014</option>
        </select>
      </div>
      <div id="input-fields"></div>
      <div class="modal-footer" style="margin-top:0;padding-top:0;border:0">
        <button type="button" class="btn btn-sm" data-modal-close>Cancelar</button>
        <button type="submit" class="btn btn-primary">Iniciar instancia</button>
      </div>
    </form>`;
  }
  function bindGestionBack(mainEl, state, persist) {
    mainEl.querySelector("[data-gestion-back]")?.addEventListener("click", () => {
      enterGestionHub();
      renderGestion(mainEl, state, persist);
    });
  }
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
        <button type="button" class="btn btn-sm gestion-hero-back" data-gestion-back>Volver al listado</button>
        <div class="gestion-hero-heading">
          <h2>Gestionar flujo</h2>
          <p class="gestion-hero-subtitle">${escapeHtml(instance.flowName)} \xB7 Paso actual: <strong>${escapeHtml(node.name)}</strong> ${stepKindBadge(node)}</p>
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
  function renderGestionHub(mainEl, state, persist) {
    const readyFlows = state.flows.filter((f) => f.status === "listo");
    const byType = getReadyFlowsByType(state.flows);
    const types = listReadyFlowTypes(byType);
    const activeInstances = sortInstancesByStarted(state.instances.filter((i) => i.status === "en_curso"));
    const finalizedInstances = sortInstancesByFinished(
      state.instances.filter((i) => isInstanceFinalized(i.status))
    );
    mainEl.innerHTML = `
    ${renderPageHeader(
      "Gesti\xF3n de actividades",
      "Instancias en curso y finalizadas: gestion\xE1 el paso actual, visualiz\xE1 el diagrama o revis\xE1 instancias cerradas."
    )}
    <div class="kpi-row">
      <span class="stat-chip">Flujos listos <strong>${readyFlows.length}</strong></span>
      <span class="stat-chip">En curso <strong>${activeInstances.length}</strong></span>
      <span class="stat-chip">Finalizados <strong>${finalizedInstances.length}</strong></span>
    </div>
    <div class="gestion-layout gestion-layout--hub">
      <section class="panel gestion-panel-list">
        <h2 class="panel-title">Instancias en curso</h2>
        ${renderActiveInstancesTable(activeInstances)}
        <div class="gestion-start-actions">
          ${readyFlows.length ? `<button type="button" class="btn btn-primary" id="btn-open-start-modal">Iniciar instancia</button>` : `<p class="gestion-empty gestion-empty--inline">No hay flujos listos para instanciar.</p>`}
        </div>
      </section>
      <section class="panel gestion-panel-list gestion-panel-finished">
        <h2 class="panel-title">Instancias finalizadas</h2>
        ${renderFinalizedInstancesTable(finalizedInstances)}
      </section>
    </div>`;
    bindGestion(mainEl, state, persist, byType, types, readyFlows);
  }
  function renderGestion(mainEl, state, persist) {
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
            viewBtn.getAttribute("data-view-inst")
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
            manageBtn.getAttribute("data-manage-inst")
          );
        }
      });
    }
  }
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
        selectFlow.innerHTML = `<option value="">\u2014 Eleg\xED tipo primero \u2014</option>`;
        if (inputFields) inputFields.innerHTML = "";
        return;
      }
      selectFlow.disabled = false;
      selectFlow.innerHTML = flows.map((f) => `<option value="${f.id}">${escapeHtml(formatFlowCatalogLabel(f))}</option>`).join("");
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
        toast("El flujo ya no cumple validaci\xF3n.");
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
      return `<p>Instancia finalizada: <span class="badge badge-${instance.status === "completada" ? "completada" : "rechazada"}">${statusLabel2(instance.status)}</span></p>`;
    }
    if (node.kind === NODE_KINDS.GATEWAY) {
      return `
      <section class="gestion-manage-step">
        <h3 class="gestion-manage-section-title">Acci\xF3n del paso</h3>
        <p style="font-size:0.85rem;color:var(--muted);margin-bottom:1rem">${escapeHtml(node.description || "Eleg\xED la rama del flujo.")}</p>
        <div class="preview-actions">
          <button type="button" class="btn btn-success" id="btn-gateway-aceptar">Aceptar</button>
          <button type="button" class="btn btn-danger" id="btn-gateway-rechazar">Rechazar</button>
        </div>
      </section>`;
    }
    if (node.kind === NODE_KINDS.AUTOMATICA) {
      const adapter = node.integration?.adapter ?? "simulation";
      return `
      <section class="gestion-manage-step">
        <h3 class="gestion-manage-section-title">Acci\xF3n del paso</h3>
        <p style="font-size:0.85rem;color:var(--muted)">${escapeHtml(node.description || "")}</p>
        <p style="font-size:0.8rem;color:var(--muted)">Adaptador: ${escapeHtml(adapter)}</p>
        <button type="button" class="btn btn-primary" id="btn-run-auto">Ejecutar y continuar</button>
      </section>`;
    }
    if (node.kind === NODE_KINDS.MANUAL) {
      const screen = instance.flowSnapshot.screens?.[node.id];
      return `
      <section class="gestion-manage-step">
        <h3 class="gestion-manage-section-title">Acci\xF3n del paso</h3>
        <p style="font-size:0.85rem;color:var(--muted);margin-bottom:1rem">${escapeHtml(node.description || "")}</p>
        <form id="form-manual" class="screen-preview">${renderScreenForInstance(instance, screen)}</form>
      </section>`;
    }
    if (node.kind === NODE_KINDS.AGENTE_IA) {
      return `
      <section class="gestion-manage-step">
        <h3 class="gestion-manage-section-title">Acci\xF3n del paso</h3>
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
        <p style="font-size:0.85rem;color:var(--muted)">Complet\xE1 los datos del componente arriba si aplica. Este evento no requiere m\xE1s acciones en el mock.</p>
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
      await resolveAIHITL(instance, { status: "approved", note: "Aprobado v\xEDa correo" });
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

  // js/reporte.js
  var selectedReportInstanceId = null;
  function renderReporte(mainEl, state, opts = {}) {
    const pageTitle = opts.title ?? "Reporte de avance";
    const pageSubtitle = opts.subtitle ?? "Filtr\xE1 instancias y revis\xE1 contexto, entradas y traza de ejecuci\xF3n.";
    const filterFlow = mainEl.dataset.filterFlow ?? "";
    const filterStatus = mainEl.dataset.filterStatus ?? "";
    let instances = [...state.instances];
    if (filterFlow) instances = instances.filter((i) => i.flowId === filterFlow);
    if (filterStatus) instances = instances.filter((i) => i.status === filterStatus);
    const selected = instances.find((i) => i.id === selectedReportInstanceId) ?? instances[0] ?? null;
    if (selected) selectedReportInstanceId = selected.id;
    mainEl.innerHTML = `
    <section class="panel">
      ${renderPageHeader(pageTitle, pageSubtitle)}
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
                  <td><span class="badge badge-${badgeForStatus(i.status)}">${statusLabel2(i.status)}</span></td>
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
    <p><span class="badge badge-${badgeForStatus(instance.status)}">${statusLabel2(instance.status)}</span></p>
    <div class="progress-bar"><span style="width:${prog.pct}%"></span></div>
    <p class="form-hint">${prog.done} actividades registradas \xB7 Paso actual: ${escapeHtml(node?.name ?? "\u2014")}</p>
    <h4>Datos de entrada</h4>
    <ul class="trace-list">${inputs || "<li>\u2014</li>"}</ul>
    <h4>Contexto de instancia</h4>
    ${context.startsWith("<pre") ? context : `<ul class="trace-list">${context}</ul>`}
    <h4>Traza</h4>
    <ul class="trace-list">${trace || "<li>\u2014</li>"}</ul>`;
  }

  // js/reports.js
  var ACTIVITY_CATALOG_KINDS = /* @__PURE__ */ new Set([
    NODE_KINDS.INICIO,
    NODE_KINDS.FIN,
    NODE_KINDS.GATEWAY,
    NODE_KINDS.MANUAL,
    NODE_KINDS.AUTOMATICA
  ]);
  var REPORT_NAV_ITEMS = [
    {
      id: "report-activities",
      title: "Actividades (ejecuci\xF3n)",
      description: "Instancias en curso o finalizadas, contexto y traza."
    },
    {
      id: "report-maestros-changes",
      title: "Cambios en maestros",
      description: "Alta, baja y modificaci\xF3n de tipos de flujo (y filtro global)."
    },
    {
      id: "report-entities-changes",
      title: "Cambios de entidades",
      description: "ABM del maestro Entidades: altas, bajas y modificaciones auditadas."
    },
    {
      id: "report-flows",
      title: "Cat\xE1logo de flujos",
      description: "Flujos definidos en el dise\xF1ador y su estado de publicaci\xF3n."
    },
    {
      id: "report-flow-types",
      title: "Tipos de flujo",
      description: "Maestro de tipos y uso en flujos."
    },
    {
      id: "report-entities",
      title: "Entidades",
      description: "Maestro de entidades de negocio y atributos."
    },
    {
      id: "report-activities-catalog",
      title: "Cat\xE1logo de actividades",
      description: "Componentes de actividad por flujo (vista cat\xE1logo del dise\xF1ador)."
    }
  ];
  function renderReportView(mainEl, state, reportId) {
    switch (reportId) {
      case "report-activities":
        renderReporte(mainEl, state, {
          title: "Reporte de actividades",
          subtitle: "Ejecuci\xF3n de instancias: avance, contexto y traza (Operaciones \u2192 Gesti\xF3n)."
        });
        return;
      case "report-maestros-changes":
        renderReportMaestrosChanges(mainEl, state);
        return;
      case "report-entities-changes":
        renderReportEntitiesChanges(mainEl, state);
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
  function renderReportHubFallback(mainEl, reportId) {
    const meta = REPORT_NAV_ITEMS.find((r) => r.id === reportId);
    mainEl.innerHTML = `
    <section class="panel">
      ${renderPageHeader(meta?.title ?? "Reporte", meta?.description ?? "Seleccion\xE1 un reporte en el men\xFA Reportes.")}
      <p class="gestion-empty">Vista no disponible.</p>
    </section>`;
  }
  function entityAuditCurrentStateCell(state, row) {
    if (row.action === "delete") {
      return `<span class="badge badge-borrador">Eliminada</span>`;
    }
    const entity = row.refId ? getEntityById(state, row.refId) : null;
    if (!entity) {
      return `<span class="catalog-muted">Ya no existe</span>`;
    }
    return `<span class="badge badge-listo">En cat\xE1logo</span>`;
  }
  function renderMasterAuditReport(mainEl, state, config) {
    mainEl.dataset.auditReportKey = config.reportKey;
    const filterArea = config.fixedArea ?? mainEl.dataset.auditArea ?? "";
    const filterAction = mainEl.dataset.auditAction ?? "";
    let rows = [...state.masterAuditLog ?? []];
    if (filterArea) rows = rows.filter((r) => r.area === filterArea);
    if (filterAction) rows = rows.filter((r) => r.action === filterAction);
    const isEntitiesMode = config.mode === "entities";
    const tbody = rows.length === 0 ? `<tr><td colspan="${isEntitiesMode ? 7 : 5}"><div class="empty-state empty-state--rich"><strong>Sin registros</strong><p>${escapeHtml(config.emptyHint)}</p></div></td></tr>` : rows.map((r) => {
      if (isEntitiesMode) {
        return `<tr>
        <td>${formatDateTime(r.at)}</td>
        <td>${escapeHtml(r.userLabel ?? r.userId ?? "\u2014")}</td>
        <td><span class="badge badge-listo">${escapeHtml(masterAuditActionLabel(r.action))}</span></td>
        <td><strong>${escapeHtml(r.label)}</strong></td>
        <td><code>${escapeHtml(r.refId ?? "\u2014")}</code></td>
        <td>${r.detail ? escapeHtml(r.detail) : "\u2014"}</td>
        <td>${entityAuditCurrentStateCell(state, r)}</td>
      </tr>`;
      }
      return `<tr>
        <td>${formatDateTime(r.at)}</td>
        <td>${escapeHtml(r.userLabel ?? r.userId ?? "\u2014")}</td>
        <td>${escapeHtml(masterAuditAreaLabel(r.area))}</td>
        <td><span class="badge badge-listo">${escapeHtml(masterAuditActionLabel(r.action))}</span></td>
        <td><strong>${escapeHtml(r.label)}</strong>${r.detail ? `<div class="form-hint">${escapeHtml(r.detail)}</div>` : ""}</td>
      </tr>`;
    }).join("");
    const areaFilterHtml = config.showAreaFilter ? `<div class="form-row">
          <label>\xC1rea</label>
          <select id="filter-audit-area">
            <option value="">Todas</option>
            <option value="flowType" ${filterArea === "flowType" ? "selected" : ""}>Tipo de flujo</option>
            <option value="entity" ${filterArea === "entity" ? "selected" : ""}>Entidad</option>
            <option value="masterDefinition" ${filterArea === "masterDefinition" ? "selected" : ""}>Definici\xF3n de maestros</option>
          </select>
        </div>` : "";
    const tableHead = isEntitiesMode ? `<thead><tr><th>Fecha</th><th>Usuario</th><th>Acci\xF3n ABM</th><th>Entidad</th><th>Id</th><th>Detalle</th><th>Estado actual</th></tr></thead>` : `<thead><tr><th>Fecha</th><th>Usuario</th><th>Maestro</th><th>Acci\xF3n</th><th>Detalle</th></tr></thead>`;
    mainEl.innerHTML = `
    <section class="panel panel--catalog">
      ${renderPageHeader(config.title, config.subtitle)}
      <div class="filters">
        ${areaFilterHtml}
        <div class="form-row">
          <label>Acci\xF3n</label>
          <select id="filter-audit-action">
            <option value="">Todas</option>
            <option value="create" ${filterAction === "create" ? "selected" : ""}>Alta</option>
            <option value="update" ${filterAction === "update" ? "selected" : ""}>Modificaci\xF3n</option>
            <option value="delete" ${filterAction === "delete" ? "selected" : ""}>Baja</option>
          </select>
        </div>
      </div>
      <div class="table-wrap table-wrap--modern">
        <table class="table-modern">
          ${tableHead}
          <tbody>${tbody}</tbody>
        </table>
      </div>
    </section>`;
    const rerender = () => {
      if (config.reportKey === "entities-changes") renderReportEntitiesChanges(mainEl, state);
      else renderReportMaestrosChanges(mainEl, state);
    };
    mainEl.querySelector("#filter-audit-area")?.addEventListener("change", (e) => {
      mainEl.dataset.auditArea = e.target.value;
      rerender();
    });
    mainEl.querySelector("#filter-audit-action")?.addEventListener("change", (e) => {
      mainEl.dataset.auditAction = e.target.value;
      rerender();
    });
  }
  function renderReportMaestrosChanges(mainEl, state) {
    renderMasterAuditReport(mainEl, state, {
      reportKey: "maestros-changes",
      title: "Gesti\xF3n de cambios en maestros",
      subtitle: "Auditor\xEDa de tipos de flujo y, con el filtro, entidades.",
      showAreaFilter: true,
      emptyHint: "Los cambios en Maestros aparecer\xE1n aqu\xED al crear, editar o eliminar registros."
    });
  }
  function renderReportEntitiesChanges(mainEl, state) {
    renderMasterAuditReport(mainEl, state, {
      reportKey: "entities-changes",
      title: "Cambios de entidades",
      subtitle: "Historial del ABM de entidades (Maestros \u2192 Entidades): altas, modificaciones y bajas.",
      fixedArea: "entity",
      showAreaFilter: false,
      emptyHint: "Cre\xE1, edit\xE1 o elimin\xE1 entidades en Maestros para ver el historial aqu\xED.",
      mode: "entities"
    });
  }
  function renderReportFlowsCatalog(mainEl, state) {
    const flows = state.flows ?? [];
    const rows = flows.length === 0 ? `<tr><td colspan="4"><p class="gestion-empty">No hay flujos en el cat\xE1logo.</p></td></tr>` : flows.map((f) => {
      const nodeCount = (f.nodes ?? []).length;
      const status = f.status ?? "borrador";
      return `<tr>
          <td><strong>${escapeHtml(f.name)}</strong><div class="form-hint"><code>${escapeHtml(f.id)}</code></div></td>
          <td><span class="badge badge-${status === "listo" ? "listo" : "borrador"}">${status === "listo" ? "Listo" : "Borrador"}</span></td>
          <td>${escapeHtml(f.type ?? "\u2014")}</td>
          <td>${nodeCount} nodos</td>
        </tr>`;
    }).join("");
    mainEl.innerHTML = `
    <section class="panel panel--catalog">
      ${renderPageHeader("Reporte \u2014 cat\xE1logo de flujos", "Snapshot de los flujos definidos en el dise\xF1ador.")}
      <div class="table-wrap table-wrap--modern">
        <table class="table-modern">
          <thead><tr><th>Flujo</th><th>Estado</th><th>Tipo</th><th>Diagrama</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>`;
  }
  function renderReportFlowTypes(mainEl, state) {
    const types = state.flowTypes ?? [];
    const rows = types.length === 0 ? `<tr><td colspan="3"><p class="gestion-empty">No hay tipos de flujo.</p></td></tr>` : types.map((t) => {
      const used = countFlowsUsingFlowType(state, t.id);
      return `<tr>
          <td><strong>${escapeHtml(t.name)}</strong></td>
          <td>${escapeHtml(t.description || "\u2014")}</td>
          <td>${used} ${used === 1 ? "flujo" : "flujos"}</td>
        </tr>`;
    }).join("");
    mainEl.innerHTML = `
    <section class="panel panel--catalog">
      ${renderPageHeader("Reporte \u2014 tipos de flujo", "Maestro de tipos de flujo y referencias en dise\xF1os.")}
      <div class="table-wrap table-wrap--modern">
        <table class="table-modern">
          <thead><tr><th>Nombre</th><th>Descripci\xF3n</th><th>Uso</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>`;
  }
  function renderReportEntities(mainEl, state) {
    const entities = state.entities ?? [];
    const rows = entities.length === 0 ? `<tr><td colspan="3"><p class="gestion-empty">No hay entidades.</p></td></tr>` : entities.map((e) => {
      const kind = formatEntityKindLabel(state, e);
      const attrs = summarizeEntityAttributesForList(state, e.attributes);
      return `<tr>
          <td><strong>${escapeHtml(e.name)}</strong></td>
          <td>${kind}</td>
          <td>${escapeHtml(attrs)}</td>
        </tr>`;
    }).join("");
    mainEl.innerHTML = `
    <section class="panel panel--catalog">
      ${renderPageHeader("Reporte \u2014 entidades", "Maestro de entidades y resumen de atributos.")}
      <div class="table-wrap table-wrap--modern">
        <table class="table-modern">
          <thead><tr><th>Entidad</th><th>Clasificaci\xF3n</th><th>Atributos</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>`;
  }
  function listCatalogActivityNodes(flow) {
    return (flow.nodes ?? []).filter((n) => ACTIVITY_CATALOG_KINDS.has(n.kind));
  }
  function renderReportActivitiesCatalog(mainEl, state) {
    const flows = state.flows ?? [];
    const sections = flows.map((flow) => {
      const nodes = listCatalogActivityNodes(flow);
      if (!nodes.length) return "";
      const inner = nodes.map(
        (n) => `<tr>
        <td>${escapeHtml(n.name ?? n.id)}</td>
        <td><code>${escapeHtml(n.kind)}</code></td>
        <td><code>${escapeHtml(n.id)}</code></td>
      </tr>`
      ).join("");
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
    }).filter(Boolean).join("");
    mainEl.innerHTML = `
    <section class="panel panel--catalog">
      ${renderPageHeader(
      "Reporte \u2014 cat\xE1logo de actividades",
      "Componentes visibles en Dise\xF1ador \u2192 Cat\xE1logo de actividades, agrupados por flujo."
    )}
      ${sections || `<p class="gestion-empty">No hay componentes de cat\xE1logo en los flujos actuales.</p>`}
    </section>`;
  }

  // js/master-records-nav.js
  var MASTER_RECORD_ABM_PREFIX = "masterRecordAbm:";
  function masterRecordAbmMasterKey(definitionId) {
    return `${MASTER_RECORD_ABM_PREFIX}${definitionId}`;
  }
  function parseMasterRecordAbmDefinitionId(masterKey) {
    if (typeof masterKey !== "string" || !masterKey.startsWith(MASTER_RECORD_ABM_PREFIX)) {
      return null;
    }
    const id = masterKey.slice(MASTER_RECORD_ABM_PREFIX.length);
    return id || null;
  }
  function isMasterRecordsNavScope(masterKey) {
    return masterKey === "masterRecords" || parseMasterRecordAbmDefinitionId(masterKey) != null;
  }

  // js/master-records-import.js
  function normalizeHeaderKey(text) {
    return String(text ?? "").trim().toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/\s+/g, " ");
  }
  function buildMasterRecordImportColumnSpecs(state, definitionId) {
    const def = getMasterDefinitionById(state, definitionId);
    if (!def) return [];
    const specs = [];
    for (const entityId of def.entityIds ?? []) {
      const entity = getEntityById(state, entityId);
      if (!entity) continue;
      for (const raw of entity.attributes ?? []) {
        const attr = normalizeEntityAttribute(raw);
        if (!attr.key || isEntityAttributeAutoGenerated(attr)) continue;
        specs.push({
          entityId,
          entityName: entity.name,
          attrKey: attr.key,
          attrLabel: attr.label || attr.key,
          type: attr.type,
          required: !!attr.required,
          refEntityId: attr.type === ENTITY_REF_TYPE ? attr.refEntityId ?? null : null,
          header: `${entity.name}.${attr.key}`
        });
      }
    }
    return specs;
  }
  function buildMasterRecordImportCsvTemplate(specs) {
    const headers = specs.map((s) => s.header);
    const hints = specs.map((s) => {
      let hint = s.type;
      if (s.required) hint += "; obligatorio";
      if (s.type === ENTITY_REF_TYPE) hint += "; nombre o id de entidad referenciada";
      if (s.type === "si_no") hint += "; s\xED/no, true/false, 1/0";
      if (s.type === "fecha") hint += "; YYYY-MM-DD o DD/MM/YYYY";
      return hint;
    });
    const escape = (v) => {
      const s = String(v ?? "");
      if (/[",;\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    return `${headers.map(escape).join(";")}
${hints.map(escape).join(";")}
`;
  }
  function parseDelimitedImportText(text) {
    const raw = String(text ?? "").replace(/^\uFEFF/, "");
    const lines = raw.split(/\r?\n/).filter((line) => line.trim() !== "");
    if (!lines.length) {
      return { headers: [], rows: [], delimiter: ";" };
    }
    const sample = lines[0];
    const semi = (sample.match(/;/g) ?? []).length;
    const comma = (sample.match(/,/g) ?? []).length;
    const delimiter = semi >= comma ? ";" : ",";
    function splitLine(line) {
      const out = [];
      let cur = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i += 1) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') {
            cur += '"';
            i += 1;
          } else {
            inQuotes = !inQuotes;
          }
          continue;
        }
        if (!inQuotes && ch === delimiter) {
          out.push(cur.trim());
          cur = "";
          continue;
        }
        cur += ch;
      }
      out.push(cur.trim());
      return out;
    }
    const headers = splitLine(lines[0]);
    const rows = lines.slice(1).map((line, idx) => ({
      lineNumber: idx + 2,
      cells: splitLine(line)
    }));
    return { headers, rows, delimiter };
  }
  async function parseMasterRecordImportFile(file) {
    const name = String(file.name ?? "").toLowerCase();
    if (name.endsWith(".csv") || name.endsWith(".txt")) {
      const text = await file.text();
      const parsed = parseDelimitedImportText(text);
      return { ...parsed, format: "csv" };
    }
    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      const xlsx = (
        /** @type {typeof import("xlsx") | undefined} */
        globalThis.XLSX
      );
      if (!xlsx?.read) {
        throw new Error(
          "Excel no disponible sin conexi\xF3n. Guard\xE1 el archivo como CSV o abr\xED el mock con internet para cargar la librer\xEDa XLSX."
        );
      }
      const buf = await file.arrayBuffer();
      const wb = xlsx.read(buf, { type: "array" });
      const sheetName = wb.SheetNames[0];
      if (!sheetName) {
        return { headers: [], rows: [], delimiter: ";", format: "xlsx" };
      }
      const sheet = wb.Sheets[sheetName];
      const matrix = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false });
      if (!matrix.length) {
        return { headers: [], rows: [], delimiter: ";", format: "xlsx" };
      }
      const headers = (matrix[0] ?? []).map((c) => String(c ?? "").trim());
      const rows = matrix.slice(1).map((row, idx) => ({
        lineNumber: idx + 2,
        cells: headers.map((_, colIdx) => String(row?.[colIdx] ?? "").trim())
      }));
      return { headers, rows, delimiter: ";", format: "xlsx" };
    }
    throw new Error("Formato no soportado. Us\xE1 CSV (.csv) o Excel (.xlsx).");
  }
  function headerMatchesSpec(spec, header) {
    const h = normalizeHeaderKey(header);
    if (!h) return false;
    const candidates = [
      spec.header,
      `${spec.entityName}.${spec.attrKey}`,
      `${spec.entityName}.${spec.attrLabel}`,
      spec.attrKey,
      spec.attrLabel,
      `${spec.entityName}_${spec.attrKey}`
    ].map(normalizeHeaderKey);
    return candidates.includes(h);
  }
  function mapImportHeadersToSpecs(specs, headers) {
    const indexToSpec = /* @__PURE__ */ new Map();
    const columnIssues = [];
    const usedSpecs = /* @__PURE__ */ new Set();
    headers.forEach((header, index) => {
      const h = String(header ?? "").trim();
      if (!h || h.startsWith("#")) return;
      const spec = specs.find((s) => !usedSpecs.has(s.header) && headerMatchesSpec(s, h));
      if (spec) {
        indexToSpec.set(index, spec);
        usedSpecs.add(spec.header);
        if (normalizeHeaderKey(h) !== normalizeHeaderKey(spec.header)) {
          columnIssues.push({
            code: "COLUMN_ALIAS",
            severity: "info",
            column: h,
            message: `Columna \xAB${h}\xBB mapeada a \xAB${spec.header}\xBB.`
          });
        }
        return;
      }
      columnIssues.push({
        code: "COLUMN_UNKNOWN",
        severity: "error",
        column: h,
        message: `Columna \xAB${h}\xBB no coincide con ning\xFAn campo del maestro.`
      });
    });
    for (const spec of specs) {
      if (!usedSpecs.has(spec.header)) {
        columnIssues.push({
          code: "COLUMN_MISSING",
          severity: spec.required ? "error" : "warn",
          column: spec.header,
          message: spec.required ? `Falta la columna obligatoria \xAB${spec.header}\xBB.` : `Columna opcional \xAB${spec.header}\xBB no est\xE1 en el archivo.`
        });
      }
    }
    return { indexToSpec, columnIssues };
  }
  function resolveRefEntityValue(state, refEntityId, raw) {
    const trimmed = String(raw ?? "").trim();
    if (!trimmed) return { ok: true, value: "" };
    if (!refEntityId) {
      return { ok: false, message: "Referencia sin entidad destino configurada." };
    }
    const target = getEntityById(state, refEntityId);
    if (!target) {
      return { ok: false, message: "La entidad referenciada no existe en el cat\xE1logo." };
    }
    if (trimmed === target.id) return { ok: true, value: target.id };
    const norm = normalizeHeaderKey(trimmed);
    if (target && normalizeHeaderKey(target.name) === norm) {
      return { ok: true, value: target.id };
    }
    return {
      ok: false,
      message: `No hay match para \xAB${trimmed}\xBB en la entidad \xAB${target.name}\xBB.`,
      suggested: target.name
    };
  }
  function coerceImportCellValue(spec, raw, state) {
    const issues = [];
    let value = String(raw ?? "");
    const trimmed = value.trim();
    if (trimmed !== value) {
      issues.push({
        code: "NORMALIZE_TRIM",
        severity: "warn",
        column: spec.header,
        message: "Espacios al inicio o final.",
        rawValue: value,
        suggested: trimmed
      });
      value = trimmed;
    }
    if (value === "") {
      if (spec.required && spec.type !== "si_no") {
        issues.push({
          code: "REQUIRED",
          severity: "error",
          column: spec.header,
          message: "Valor obligatorio vac\xEDo."
        });
      }
      return { value: spec.type === "si_no" ? false : "", issues };
    }
    if (spec.type === "numero") {
      const normalized = value.replace(/\s/g, "").replace(",", ".");
      const num = Number(normalized);
      if (!Number.isFinite(num)) {
        issues.push({
          code: "TYPE_NUMBER",
          severity: "error",
          column: spec.header,
          message: `\xAB${value}\xBB no es un n\xFAmero v\xE1lido.`,
          rawValue: value
        });
        return { value: "", issues };
      }
      if (normalized !== value.replace(/\s/g, "")) {
        issues.push({
          code: "NORMALIZE_DECIMAL",
          severity: "warn",
          column: spec.header,
          message: "Separador decimal normalizado.",
          rawValue: value,
          suggested: String(num)
        });
      }
      return { value: num, issues };
    }
    if (spec.type === "si_no") {
      const v = normalizeHeaderKey(value);
      if (["si", "s\xED", "true", "1", "yes", "y"].includes(v)) return { value: true, issues };
      if (["no", "false", "0", "n"].includes(v)) return { value: false, issues };
      issues.push({
        code: "TYPE_BOOLEAN",
        severity: "error",
        column: spec.header,
        message: `\xAB${value}\xBB no es un valor s\xED/no reconocido.`,
        rawValue: value,
        suggested: "s\xED / no"
      });
      return { value: false, issues };
    }
    if (spec.type === "fecha") {
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return { value, issues };
      const m = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (m) {
        const dd = m[1].padStart(2, "0");
        const mm = m[2].padStart(2, "0");
        const iso = `${m[3]}-${mm}-${dd}`;
        issues.push({
          code: "NORMALIZE_DATE",
          severity: "warn",
          column: spec.header,
          message: "Fecha convertida a formato ISO.",
          rawValue: value,
          suggested: iso
        });
        return { value: iso, issues };
      }
      issues.push({
        code: "TYPE_DATE",
        severity: "error",
        column: spec.header,
        message: `\xAB${value}\xBB no es una fecha v\xE1lida (use YYYY-MM-DD o DD/MM/YYYY).`,
        rawValue: value
      });
      return { value: "", issues };
    }
    if (spec.type === ENTITY_REF_TYPE) {
      const ref = resolveRefEntityValue(state, spec.refEntityId, value);
      if (!ref.ok) {
        issues.push({
          code: "REF_NO_MATCH",
          severity: "error",
          column: spec.header,
          message: ref.message ?? "Sin match de referencia.",
          rawValue: value,
          suggested: ref.suggested
        });
        return { value: "", issues };
      }
      return { value: ref.value, issues };
    }
    return { value, issues };
  }
  function validateMasterRecordImport(state, definitionId, headers, rows, opts = {}) {
    const specs = buildMasterRecordImportColumnSpecs(state, definitionId);
    const { indexToSpec, columnIssues } = mapImportHeadersToSpecs(specs, headers);
    const hasBlockingColumnErrors = columnIssues.some(
      (i) => i.severity === "error" && i.code.startsWith("COLUMN_")
    );
    const rowResults = [];
    for (const row of rows) {
      const values = {};
      const issues = [];
      for (const spec of specs) {
        if (!values[spec.entityId]) values[spec.entityId] = {};
      }
      indexToSpec.forEach((spec, colIndex) => {
        const raw = row.cells[colIndex] ?? "";
        const coerced = coerceImportCellValue(spec, raw, state);
        let finalValue = coerced.value;
        for (const issue of coerced.issues) {
          if (issue.severity === "warn" && opts.applyNormalizations && issue.suggested != null) {
            if (issue.code === "NORMALIZE_TRIM") finalValue = issue.suggested;
            if (issue.code === "NORMALIZE_DECIMAL") finalValue = Number(issue.suggested);
            if (issue.code === "NORMALIZE_DATE") finalValue = issue.suggested;
          }
          issues.push(issue);
        }
        if (!values[spec.entityId]) values[spec.entityId] = {};
        values[spec.entityId][spec.attrKey] = finalValue;
      });
      if (!hasBlockingColumnErrors) {
        const business = validateMasterRecordValues(state, definitionId, values);
        if (!business.ok) {
          issues.push({
            code: "BUSINESS_RULE",
            severity: "error",
            message: business.message
          });
        }
      }
      const hasError = issues.some((i) => i.severity === "error") || hasBlockingColumnErrors;
      const hasWarn = issues.some((i) => i.severity === "warn");
      rowResults.push({
        lineNumber: row.lineNumber,
        status: hasError ? "invalid" : hasWarn ? "normalize" : "valid",
        values,
        issues
      });
    }
    const summary = {
      totalRows: rowResults.length,
      validRows: rowResults.filter((r) => r.status === "valid").length,
      normalizeRows: rowResults.filter((r) => r.status === "normalize").length,
      invalidRows: rowResults.filter((r) => r.status === "invalid").length,
      columnIssues,
      hasBlockingColumnErrors
    };
    return { specs, rowResults, summary };
  }
  function importIssueLabel(issue) {
    const map = {
      COLUMN_UNKNOWN: "Columna sin match",
      COLUMN_MISSING: "Columna faltante",
      COLUMN_ALIAS: "Columna alias",
      REQUIRED: "Obligatorio",
      TYPE_NUMBER: "Tipo n\xFAmero",
      TYPE_DATE: "Tipo fecha",
      TYPE_BOOLEAN: "Tipo s\xED/no",
      REF_NO_MATCH: "Referencia sin match",
      NORMALIZE_TRIM: "Normalizar espacios",
      NORMALIZE_DECIMAL: "Normalizar decimal",
      NORMALIZE_DATE: "Normalizar fecha",
      BUSINESS_RULE: "Regla de negocio"
    };
    return map[issue.code] ?? issue.code;
  }
  function buildMasterRecordsFromImportRowResults(state, definitionId, rowResults, opts = {}) {
    const includeNormalize = opts.includeNormalizeStatus !== false;
    const eligible = rowResults.filter((r) => {
      if (r.status === "valid") return true;
      if (includeNormalize && r.status === "normalize" && opts.applyNormalizations) return true;
      return false;
    });
    let created = 0;
    let skipped = rowResults.length - eligible.length;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    if (!Array.isArray(state.masterRecords)) state.masterRecords = [];
    for (const row of eligible) {
      const values = structuredClone ? structuredClone(row.values) : JSON.parse(JSON.stringify(row.values));
      applyAutoGeneratedAttributeValues(state, definitionId, values, { isCreate: true });
      const check = validateMasterRecordValues(state, definitionId, values);
      if (!check.ok) {
        skipped += 1;
        continue;
      }
      const newId = createId("masterRecord");
      state.masterRecords.push({
        id: newId,
        lineageId: newId,
        definitionId,
        values,
        status: "vigente",
        version: 1,
        history: [],
        createdAt: now,
        updatedAt: now
      });
      created += 1;
    }
    return { created, skipped };
  }

  // js/master-records-ui.js
  var masterRecordEditorSession = null;
  var masterRecordImportSession = null;
  var masterRecordActiveDefinitionId = null;
  function exitMasterRecordImportSession() {
    masterRecordImportSession = null;
  }
  function hasMasterRecordImportSession() {
    return !!masterRecordImportSession;
  }
  function syncMasterRecordsAbmNav(state) {
    const host = document.getElementById("nav-master-records-abm-items");
    if (!host) return;
    const defs = listMasterDefinitionsForAbm(state);
    if (!defs.length) {
      host.innerHTML = `<p class="nav-master-records-abm-empty">Sin maestros detectados</p>`;
      return;
    }
    host.innerHTML = defs.map((d) => {
      const count = countMasterRecordsForDefinition(state, d.id);
      const countHint = count > 0 ? ` (${count})` : "";
      return `<button type="button" class="nav-btn nav-sub-btn nav-sub-btn--nested nav-sub-btn--abm-def" data-view="maestros" data-master="masterRecordAbm" data-master-def-id="${escapeHtml(d.id)}" title="${escapeHtml(d.id)}">${escapeHtml(d.name)}${countHint}</button>`;
    }).join("");
  }
  function navigateToMasterRecordAbm(definitionId) {
    window.dispatchEvent(
      new CustomEvent("gestor:nav-maestros", { detail: { masterRecordDefId: definitionId } })
    );
  }
  function renderMasterRecordsListView(mainEl, state, persist) {
    if (masterRecordActiveDefinitionId) {
      renderMasterRecordsForDefinition(mainEl, state, persist, masterRecordActiveDefinitionId);
    } else {
      renderMasterRecordsHub(mainEl, state, persist);
    }
  }
  function exitMasterRecordEditor() {
    masterRecordEditorSession = null;
  }
  function hasMasterRecordEditorSession() {
    return !!masterRecordEditorSession;
  }
  function renderMasterRecordFieldInput(state, entityId, attr, value) {
    const norm = normalizeEntityAttribute(attr);
    const name = `field-${entityId}-${norm.key}`;
    const id = name;
    const dis = isEntityAttributeAutoGenerated(norm) ? " disabled readonly" : "";
    const valStr = escapeHtml(value === true ? "true" : value === false ? "false" : String(value ?? ""));
    if (isEntityAttributeAutoGenerated(norm)) {
      const hint = norm.type === "dateexecution" ? "UTC al guardar" : norm.type === "userconnected" ? "Usuario conectado al guardar" : "Autogenerado al guardar";
      const shown = valStr && valStr !== "" ? valStr : hint;
      return `<div class="form-row master-record-field master-record-field--auto">
      <label>${escapeHtml(norm.label || norm.key)}</label>
      <input class="master-record-input" data-entity-id="${escapeHtml(entityId)}" data-attr-key="${escapeHtml(norm.key)}" data-auto="1" value="${shown}" readonly disabled />
      <p class="form-hint">${hint}</p>
    </div>`;
    }
    if (norm.type === "texto_largo") {
      return `<div class="form-row master-record-field">
      <label for="${id}">${escapeHtml(norm.label || norm.key)}${norm.required ? " *" : ""}</label>
      <textarea id="${id}" class="master-record-input" data-entity-id="${escapeHtml(entityId)}" data-attr-key="${escapeHtml(norm.key)}" rows="3"${dis}>${valStr}</textarea>
    </div>`;
    }
    if (norm.type === "si_no") {
      const checked = value === true || value === "true" ? " checked" : "";
      return `<div class="form-row master-record-field">
      <label class="entity-check-label" for="${id}">
        <input type="checkbox" id="${id}" class="master-record-input" data-entity-id="${escapeHtml(entityId)}" data-attr-key="${escapeHtml(norm.key)}"${checked}${dis} />
        ${escapeHtml(norm.label || norm.key)}${norm.required ? " *" : ""}
      </label>
    </div>`;
    }
    if (norm.type === "numero") {
      return `<div class="form-row master-record-field">
      <label for="${id}">${escapeHtml(norm.label || norm.key)}${norm.required ? " *" : ""}</label>
      <input type="number" id="${id}" class="master-record-input" data-entity-id="${escapeHtml(entityId)}" data-attr-key="${escapeHtml(norm.key)}" value="${valStr}" step="any"${dis} />
    </div>`;
    }
    if (norm.type === "fecha") {
      return `<div class="form-row master-record-field">
      <label for="${id}">${escapeHtml(norm.label || norm.key)}${norm.required ? " *" : ""}</label>
      <input type="date" id="${id}" class="master-record-input" data-entity-id="${escapeHtml(entityId)}" data-attr-key="${escapeHtml(norm.key)}" value="${valStr}"${dis} />
    </div>`;
    }
    if (norm.type === ENTITY_REF_TYPE) {
      const refEntity = getEntityById(state, norm.refEntityId);
      const opts = [`<option value="">\u2014 Seleccionar \u2014</option>`];
      if (refEntity) {
        opts.push(
          `<option value="${escapeHtml(refEntity.id)}"${value === refEntity.id ? " selected" : ""}>${escapeHtml(refEntity.name)} (cat\xE1logo)</option>`
        );
      }
      return `<div class="form-row master-record-field">
      <label for="${id}">${escapeHtml(norm.label || norm.key)}${norm.required ? " *" : ""}</label>
      <select id="${id}" class="master-record-input" data-entity-id="${escapeHtml(entityId)}" data-attr-key="${escapeHtml(norm.key)}"${dis}>${opts.join("")}</select>
    </div>`;
    }
    return `<div class="form-row master-record-field">
    <label for="${id}">${escapeHtml(norm.label || norm.key)}${norm.required ? " *" : ""}</label>
    <input type="text" id="${id}" class="master-record-input" data-entity-id="${escapeHtml(entityId)}" data-attr-key="${escapeHtml(norm.key)}" value="${valStr}"${dis} />
  </div>`;
  }
  function collectMasterRecordValuesFromDom(mainEl) {
    const values = {};
    mainEl.querySelectorAll(".master-record-input").forEach((el) => {
      if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)) {
        return;
      }
      if (el.dataset.auto === "1") return;
      const entityId = el.dataset.entityId ?? "";
      const key = el.dataset.attrKey ?? "";
      if (!entityId || !key) return;
      if (!values[entityId]) values[entityId] = {};
      if (el instanceof HTMLInputElement && el.type === "checkbox") {
        values[entityId][key] = el.checked;
      } else if (el instanceof HTMLInputElement && el.type === "number") {
        values[entityId][key] = el.value === "" ? "" : Number(el.value);
      } else {
        values[entityId][key] = el.value;
      }
    });
    return values;
  }
  function openMasterRecordEditorForDefinition(mainEl, state, persist, definitionId) {
    if (!isMasterDefinitionAvailableForAbm(state, definitionId)) {
      toast("Esa definici\xF3n ya no est\xE1 disponible. Actualiz\xE1 Definici\xF3n de maestros.");
      return;
    }
    exitMasterRecordImportSession();
    masterRecordEditorSession = { mode: "create", definitionId };
    renderMasterRecordEditorHero(mainEl, state, persist);
  }
  function openMasterRecordHistoryModal(state, record) {
    const def = getMasterDefinitionById(state, record.definitionId);
    const history = [...record.history ?? []].sort((a, b) => b.version - a.version);
    const rows = history.length === 0 ? `<tr><td colspan="4"><p class="gestion-empty">Todav\xEDa no hay revisiones anteriores.</p></td></tr>` : history.map((entry) => {
      const summary = summarizeMasterRecordValues(state, record.definitionId, entry.values);
      const when = entry.archivedAt ? new Date(entry.archivedAt).toLocaleString("es-AR") : "\u2014";
      return `<tr>
              <td><strong>v${entry.version}</strong></td>
              <td>${escapeHtml(when)}</td>
              <td>${escapeHtml(summary)}</td>
              <td><button type="button" class="btn btn-sm" data-view-history-version="${entry.version}">Ver datos</button></td>
            </tr>`;
    }).join("");
    const { close, root } = openModal(`
    <div class="modal-header">
      <h2>Historial de revisiones</h2>
      <button type="button" class="btn btn-sm" data-modal-close>Cerrar</button>
    </div>
    <p class="form-hint"><strong>${escapeHtml(def?.name ?? "Maestro")}</strong> \xB7 vigente v${record.version ?? 1} \xB7 <code>${escapeHtml(record.id)}</code></p>
    <div class="table-wrap table-wrap--modern">
      <table class="table-modern">
        <thead><tr><th>Versi\xF3n</th><th>Archivada</th><th>Resumen</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div id="master-record-history-detail" class="master-record-history-detail" hidden></div>
  `);
    root.querySelectorAll("[data-view-history-version]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const ver = Number.parseInt(btn.getAttribute("data-view-history-version") ?? "", 10);
        const entry = history.find((h) => h.version === ver);
        const host = root.querySelector("#master-record-history-detail");
        if (!host || !entry) return;
        host.hidden = false;
        host.innerHTML = `<h3 class="entity-meta-title">Datos de la v${ver}</h3><pre class="master-record-history-pre">${escapeHtml(JSON.stringify(entry.values, null, 2))}</pre>`;
      });
    });
  }
  function renderMasterRecordRowsForDefinition(state, definitionId) {
    const records = listVigenteMasterRecordsForDefinition(state, definitionId);
    if (!records.length) {
      return `<tr><td colspan="6"><p class="gestion-empty">Sin registros vigentes en este maestro. Us\xE1 \xAB+ Nuevo registro\xBB.</p></td></tr>`;
    }
    return records.map((r) => {
      const usageBadge = `<span class="badge badge-listo">${escapeHtml(masterRecordUsageStatusLabel(r))}</span>`;
      const revCount = (r.history ?? []).length;
      const historyBtn = revCount > 0 ? `<button type="button" class="btn btn-sm" data-history-master-record="${escapeHtml(r.id)}">Historial (${revCount})</button>` : `<span class="catalog-muted">\u2014</span>`;
      return `<tr>
        <td><code class="form-hint">${escapeHtml(r.id)}</code></td>
        <td>${usageBadge}</td>
        <td><span class="catalog-tree-count">v${r.version ?? 1}</span></td>
        <td>${escapeHtml(summarizeMasterRecordForList(state, r))}</td>
        <td>${escapeHtml(new Date(r.updatedAt).toLocaleString("es-AR"))}</td>
        <td class="catalog-actions">
          <button type="button" class="btn btn-sm" data-edit-master-record="${escapeHtml(r.id)}">Editar</button>
          ${historyBtn}
          <button type="button" class="btn btn-sm btn-danger" data-rm-master-record="${escapeHtml(r.id)}">Eliminar</button>
        </td>
      </tr>`;
    }).join("");
  }
  function bindMasterRecordTableActions(mainEl, state, persist) {
    mainEl.querySelectorAll("[data-new-for-def]").forEach((btn) => {
      btn.addEventListener("click", () => {
        openMasterRecordEditorForDefinition(
          mainEl,
          state,
          persist,
          btn.getAttribute("data-new-for-def") ?? ""
        );
      });
    });
    mainEl.querySelectorAll("[data-edit-master-record]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-edit-master-record");
        if (!getMasterRecordById(state, id)) return;
        masterRecordEditorSession = { mode: "edit", recordId: id };
        renderMasterRecordEditorHero(mainEl, state, persist);
      });
    });
    mainEl.querySelectorAll("[data-history-master-record]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-history-master-record");
        const item = getMasterRecordById(state, id);
        if (!item || item.status === "historico") return;
        openMasterRecordHistoryModal(state, item);
      });
    });
    mainEl.querySelectorAll("[data-rm-master-record]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-rm-master-record");
        const item = getMasterRecordById(state, id);
        if (!item) return;
        const def = getMasterDefinitionById(state, item.definitionId);
        if (!window.confirm(`\xBFEliminar el registro de \xAB${def?.name ?? "maestro"}\xBB?`)) return;
        recordMasterAudit(state, {
          area: "masterRecord",
          action: "delete",
          refId: id,
          label: def?.name ?? id,
          detail: summarizeMasterRecordForList(state, item)
        });
        state.masterRecords = (state.masterRecords ?? []).filter((r) => r.id !== id);
        persist();
        toast("Registro eliminado.", 2200, "success");
        renderMasterRecordsListView(mainEl, state, persist);
      });
    });
  }
  function renderMasterRecordsHub(mainEl, state, persist) {
    masterRecordActiveDefinitionId = null;
    const defs = listMasterDefinitionsForAbm(state);
    const allDefs = state.masterDefinitions ?? [];
    const emptyPanel = defs.length === 0 ? `<section class="master-abm-definitions-panel panel">
          <h3 class="entity-meta-title">Maestros detectados</h3>
          <p class="gestion-empty">No hay definiciones con entidades. Cre\xE1 una en <strong>Definici\xF3n de maestros</strong>; ac\xE1 aparecer\xE1 un ABM independiente por cada una.</p>
          <button type="button" class="btn btn-sm btn-primary" id="btn-goto-master-definitions">Ir a Definici\xF3n de maestros</button>
        </section>` : "";
    const cards = defs.length === 0 ? "" : `<div class="master-abm-definitions-grid">
          ${defs.map((d) => {
      const entities = summarizeMasterDefinitionEntities(state, d);
      const count = countMasterRecordsForDefinition(state, d.id);
      return `<article class="master-abm-definition-card">
                <h4>${escapeHtml(d.name)}</h4>
                <p class="form-hint">${escapeHtml(d.description || "Sin descripci\xF3n")}</p>
                <p class="form-hint"><code>${escapeHtml(d.id)}</code></p>
                <p class="form-hint"><strong>Entidades:</strong> ${escapeHtml(entities)}</p>
                <p class="catalog-tree-count">${count} ${count === 1 ? "registro" : "registros"}</p>
                <div class="master-abm-definition-card__actions">
                  <button type="button" class="btn btn-primary btn-sm" data-open-master-abm="${escapeHtml(d.id)}">Abrir ABM</button>
                </div>
              </article>`;
    }).join("")}
        </div>`;
    const incompleteHint = allDefs.length > defs.length ? `<p class="form-hint master-abm-incomplete-hint">${allDefs.length - defs.length} definici\xF3n(es) sin entidades \u2014 no generan maestro hasta completarlas en Definici\xF3n de maestros.</p>` : "";
    mainEl.innerHTML = `
    <section class="panel panel--catalog maestros-panel master-records-hub">
      ${renderPageHeader(
      "Resumen ABM maestros",
      "Cada definici\xF3n con entidades tiene su propio ABM en el men\xFA (ABM maestros) o desde \xABAbrir ABM\xBB."
    )}
      ${emptyPanel}
      ${incompleteHint}
      ${cards}
    </section>`;
    mainEl.querySelector("#btn-goto-master-definitions")?.addEventListener("click", () => {
      window.dispatchEvent(
        new CustomEvent("gestor:nav-maestros", { detail: { master: "masterDefinitions" } })
      );
    });
    mainEl.querySelectorAll("[data-open-master-abm]").forEach((btn) => {
      btn.addEventListener("click", () => {
        navigateToMasterRecordAbm(btn.getAttribute("data-open-master-abm") ?? "");
      });
    });
  }
  function renderMasterRecordsForDefinition(mainEl, state, persist, definitionId) {
    const definition = getMasterDefinitionById(state, definitionId);
    if (!definition || !isMasterDefinitionAvailableForAbm(state, definitionId)) {
      toast("Ese maestro ya no est\xE1 disponible. Volv\xE9 al resumen.");
      masterRecordActiveDefinitionId = null;
      renderMasterRecordsHub(mainEl, state, persist);
      return;
    }
    masterRecordActiveDefinitionId = definitionId;
    const entities = summarizeMasterDefinitionEntities(state, definition);
    const count = countMasterRecordsForDefinition(state, definition.id);
    mainEl.innerHTML = `
    <section class="panel panel--catalog maestros-panel master-records-abm-view">
      ${renderPageHeader(
      `Maestro: ${escapeHtml(definition.name)}`,
      `${escapeHtml(definition.description || "Sin descripci\xF3n")} \xB7 Entidades: ${escapeHtml(entities)} \xB7 <code>${escapeHtml(definition.id)}</code>`,
      `<button type="button" class="btn btn-sm" data-open-import="${escapeHtml(definition.id)}">Importar CSV/Excel</button>
         <button type="button" class="btn btn-primary btn-sm" data-new-for-def="${escapeHtml(definition.id)}">+ Nuevo registro</button>`
    )}
      <p class="catalog-tree-count master-records-abm-count">${count} ${count === 1 ? "registro" : "registros"}</p>
      <div class="table-wrap table-wrap--modern">
        <table class="table-modern">
          <thead><tr><th>Id</th><th>Estado</th><th>Versi\xF3n</th><th>Datos</th><th>Actualizado</th><th>Acciones</th></tr></thead>
          <tbody>${renderMasterRecordRowsForDefinition(state, definition.id)}</tbody>
        </table>
      </div>
    </section>`;
    mainEl.querySelector(`[data-open-import="${definition.id}"]`)?.addEventListener("click", () => {
      exitMasterRecordEditor();
      masterRecordImportSession = {
        definitionId: definition.id,
        applyNormalizations: true,
        report: null,
        fileName: ""
      };
      renderMasterRecordImportHero(mainEl, state, persist);
    });
    bindMasterRecordTableActions(mainEl, state, persist);
  }
  function renderMasterRecordImportHero(mainEl, state, persist) {
    const session = masterRecordImportSession;
    if (!session) {
      renderMasterRecordsListView(mainEl, state, persist);
      return;
    }
    const definition = getMasterDefinitionById(state, session.definitionId);
    if (!definition || !isMasterDefinitionAvailableForAbm(state, session.definitionId)) {
      exitMasterRecordImportSession();
      renderMasterRecordsListView(mainEl, state, persist);
      return;
    }
    masterRecordActiveDefinitionId = session.definitionId;
    const specs = buildMasterRecordImportColumnSpecs(state, session.definitionId);
    const report = session.report;
    const columnRows = report?.summary.columnIssues.length ? report.summary.columnIssues.map((issue) => {
      const badge = issue.severity === "error" ? `<span class="badge badge-borrador">${escapeHtml(importIssueLabel(issue))}</span>` : issue.severity === "warn" ? `<span class="badge badge-borrador">Advertencia</span>` : `<span class="badge badge-listo">Info</span>`;
      return `<tr>
              <td>${badge}</td>
              <td><code>${escapeHtml(issue.column ?? "\u2014")}</code></td>
              <td>${escapeHtml(issue.message)}</td>
            </tr>`;
    }).join("") : `<tr><td colspan="3"><p class="gestion-empty">Sub\xED un archivo para ver el match de columnas.</p></td></tr>`;
    const rowFilter = report?.rowResults ?? [];
    const rowRows = rowFilter.length ? rowFilter.map((row) => {
      const statusBadge = row.status === "valid" ? `<span class="badge badge-listo">V\xE1lida</span>` : row.status === "normalize" ? `<span class="badge badge-borrador">Normalizar</span>` : `<span class="badge badge-borrador">Inv\xE1lida</span>`;
      const issuesHtml = row.issues.length ? `<ul class="master-import-issue-list">${row.issues.map(
        (i) => `<li><strong>${escapeHtml(importIssueLabel(i))}</strong>: ${escapeHtml(i.message)}${i.suggested ? ` <span class="form-hint">\u2192 sugerido: ${escapeHtml(i.suggested)}</span>` : ""}</li>`
      ).join("")}</ul>` : `<span class="catalog-muted">\u2014</span>`;
      return `<tr>
            <td>${row.lineNumber}</td>
            <td>${statusBadge}</td>
            <td>${issuesHtml}</td>
          </tr>`;
    }).join("") : `<tr><td colspan="3"><p class="gestion-empty">Sin filas de datos (solo encabezados).</p></td></tr>`;
    const summary = report?.summary;
    const summaryHtml = summary ? `<div class="master-import-summary">
        <div class="master-import-stat"><span class="master-import-stat__n">${summary.totalRows}</span><span>Filas</span></div>
        <div class="master-import-stat master-import-stat--ok"><span class="master-import-stat__n">${summary.validRows}</span><span>V\xE1lidas</span></div>
        <div class="master-import-stat master-import-stat--warn"><span class="master-import-stat__n">${summary.normalizeRows}</span><span>A normalizar</span></div>
        <div class="master-import-stat master-import-stat--err"><span class="master-import-stat__n">${summary.invalidRows}</span><span>Con error</span></div>
      </div>` : "";
    mainEl.innerHTML = `
    <section class="gestion-hero master-import-hero panel">
      <header class="gestion-hero-header">
        <button type="button" class="btn btn-sm gestion-hero-back" data-import-back>Volver al ABM</button>
        <div class="gestion-hero-heading">
          <h2>Importar registros \u2014 ${escapeHtml(definition.name)}</h2>
          <p class="gestion-hero-subtitle">CSV o Excel (.xlsx). Validamos columnas, tipos y referencias. Las filas inv\xE1lidas no se importan.</p>
        </div>
      </header>
      <div class="master-import-body">
        <section class="entity-meta-panel">
          <h3 class="entity-meta-title">1. Plantilla</h3>
          <p class="form-hint">Columnas esperadas: <code>Entidad.atributo</code> (punto entre nombre de entidad y clave). Separador <strong>;</strong> o <strong>,</strong>.</p>
          <button type="button" class="btn btn-sm" id="btn-download-import-template">Descargar plantilla CSV</button>
        </section>
        <section class="entity-meta-panel">
          <h3 class="entity-meta-title">2. Archivo</h3>
          <input type="file" id="field-import-file" accept=".csv,.txt,.xlsx,.xls" />
          ${session.fileName ? `<p class="form-hint">Archivo: <strong>${escapeHtml(session.fileName)}</strong></p>` : ""}
          <label class="entity-check-label master-import-normalize-opt">
            <input type="checkbox" id="field-import-apply-normalize" ${session.applyNormalizations ? "checked" : ""} />
            Aplicar normalizaciones sugeridas (espacios, fechas DD/MM/YYYY, decimales con coma)
          </label>
        </section>
        <section class="entity-meta-panel">
          <h3 class="entity-meta-title">3. Reporte de validaci\xF3n</h3>
          ${summaryHtml}
          <h4 class="master-import-subtitle">Match de columnas</h4>
          <div class="table-wrap table-wrap--modern">
            <table class="table-modern">
              <thead><tr><th>Estado</th><th>Columna</th><th>Detalle</th></tr></thead>
              <tbody>${columnRows}</tbody>
            </table>
          </div>
          <h4 class="master-import-subtitle">Filas</h4>
          <div class="table-wrap table-wrap--modern">
            <table class="table-modern">
              <thead><tr><th>#</th><th>Estado</th><th>Observaciones / normalizaci\xF3n</th></tr></thead>
              <tbody>${rowRows}</tbody>
            </table>
          </div>
        </section>
      </div>
      <footer class="component-attr-hero-footer">
        <button type="button" class="btn btn-sm" data-import-back>Cancelar</button>
        <button type="button" class="btn btn-primary" id="btn-commit-import" ${report ? "" : "disabled"}>Importar filas v\xE1lidas</button>
      </footer>
    </section>`;
    const goBack = () => {
      exitMasterRecordImportSession();
      renderMasterRecordsForDefinition(mainEl, state, persist, session.definitionId);
    };
    mainEl.querySelectorAll("[data-import-back]").forEach((b) => b.addEventListener("click", goBack));
    mainEl.querySelector("#btn-download-import-template")?.addEventListener("click", () => {
      const csv = buildMasterRecordImportCsvTemplate(specs);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `plantilla-${definition.name.replace(/\s+/g, "-").toLowerCase()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
    const rerunValidation = async (file) => {
      session.applyNormalizations = !!mainEl.querySelector("#field-import-apply-normalize")?.checked;
      const parsed = await parseMasterRecordImportFile(file);
      session.report = validateMasterRecordImport(
        state,
        session.definitionId,
        parsed.headers,
        parsed.rows,
        { applyNormalizations: session.applyNormalizations }
      );
      renderMasterRecordImportHero(mainEl, state, persist);
    };
    mainEl.querySelector("#field-import-apply-normalize")?.addEventListener("change", () => {
      session.applyNormalizations = !!mainEl.querySelector("#field-import-apply-normalize")?.checked;
      const input = mainEl.querySelector("#field-import-file");
      if (input instanceof HTMLInputElement && input.files?.[0]) {
        rerunValidation(input.files[0]).catch((err) => toast(err instanceof Error ? err.message : String(err)));
      }
    });
    mainEl.querySelector("#field-import-file")?.addEventListener("change", (e) => {
      const input = e.target;
      if (!(input instanceof HTMLInputElement) || !input.files?.[0]) return;
      const file = input.files[0];
      session.fileName = file.name;
      rerunValidation(file).catch((err) => toast(err instanceof Error ? err.message : String(err)));
    });
    mainEl.querySelector("#btn-commit-import")?.addEventListener("click", () => {
      if (!session.report) return;
      const { created, skipped } = buildMasterRecordsFromImportRowResults(
        state,
        session.definitionId,
        session.report.rowResults,
        { applyNormalizations: session.applyNormalizations, includeNormalizeStatus: true }
      );
      if (created === 0) {
        toast("No hay filas v\xE1lidas para importar. Revis\xE1 el reporte.");
        return;
      }
      const def = getMasterDefinitionById(state, session.definitionId);
      recordMasterAudit(state, {
        area: "masterRecord",
        action: "create",
        refId: session.definitionId,
        label: def?.name ?? session.definitionId,
        detail: `Importaci\xF3n: ${created} registro(s), ${skipped} omitido(s)`
      });
      persist();
      toast(`${created} registro(s) importado(s) (vigente v1). ${skipped ? `${skipped} fila(s) omitida(s).` : ""}`, 3200, "success");
      exitMasterRecordImportSession();
      renderMasterRecordsForDefinition(mainEl, state, persist, session.definitionId);
    });
  }
  function renderMasterRecordEditorHero(mainEl, state, persist) {
    const session = masterRecordEditorSession;
    if (!session) {
      renderMasterRecordsListView(mainEl, state, persist);
      return;
    }
    const existing = session.mode === "edit" ? getMasterRecordById(state, session.recordId) ?? null : null;
    if (session.mode === "edit" && !existing) {
      exitMasterRecordEditor();
      renderMasterRecordsListView(mainEl, state, persist);
      return;
    }
    const initialDefId = existing?.definitionId ?? session.definitionId ?? masterRecordActiveDefinitionId ?? "";
    const draft = {
      definitionId: initialDefId,
      values: existing ? syncMasterRecordValuesWithDefinition(state, initialDefId, existing.values) : buildEmptyValuesForDefinition(state, initialDefId),
      recordId: existing?.id ?? null
    };
    const defs = listMasterDefinitionsForAbm(state);
    if (session.mode === "create" && !isMasterDefinitionAvailableForAbm(state, draft.definitionId)) {
      draft.definitionId = defs[0]?.id ?? "";
      draft.values = buildEmptyValuesForDefinition(state, draft.definitionId);
    }
    if (session.mode === "edit" && !isMasterDefinitionAvailableForAbm(state, draft.definitionId)) {
      toast("La definici\xF3n de este registro ya no est\xE1 disponible.");
      exitMasterRecordEditor();
      renderMasterRecordsListView(mainEl, state, persist);
      return;
    }
    const scopedDefinitionId = masterRecordActiveDefinitionId ?? session.definitionId ?? existing?.definitionId ?? null;
    const lockDefinition = !!scopedDefinitionId && isMasterDefinitionAvailableForAbm(state, scopedDefinitionId);
    if (lockDefinition && session.mode === "create") {
      draft.definitionId = scopedDefinitionId;
      draft.values = buildEmptyValuesForDefinition(state, scopedDefinitionId);
    }
    const title = session.mode === "edit" ? "Editar registro de maestro" : "Nuevo registro de maestro";
    const paint = () => {
      const def = getMasterDefinitionById(state, draft.definitionId);
      const defSelect = session.mode === "create" && !lockDefinition ? `<div class="form-row form-row--entity-name">
            <label for="field-master-record-def">Definici\xF3n de maestros</label>
            <select id="field-master-record-def" required>
              ${defs.map(
        (d) => `<option value="${escapeHtml(d.id)}"${draft.definitionId === d.id ? " selected" : ""}>${escapeHtml(d.name)}</option>`
      ).join("")}
            </select>
            <p class="form-hint">${def ? escapeHtml(summarizeMasterDefinitionEntities(state, def)) : ""}</p>
          </div>` : `<div class="form-row form-row--entity-name">
            <label>Maestro</label>
            <p><strong>${escapeHtml(def?.name ?? "\u2014")}</strong></p>
            <p class="form-hint">${def ? escapeHtml(summarizeMasterDefinitionEntities(state, def)) : ""}</p>
          </div>`;
      let entitySections = "";
      if (def && (def.entityIds ?? []).length) {
        entitySections = (def.entityIds ?? []).map((entityId) => {
          const entity = getEntityById(state, entityId);
          if (!entity) return "";
          const fields = (entity.attributes ?? []).map((attr) => {
            const key = normalizeEntityAttribute(attr).key;
            return renderMasterRecordFieldInput(state, entityId, attr, draft.values?.[entityId]?.[key]);
          }).join("");
          return `<section class="entity-meta-panel master-record-entity-panel">
            <h3 class="entity-meta-title">${escapeHtml(entity.name)}</h3>
            <div class="form-grid master-record-fields">${fields || `<p class="form-hint">Sin atributos definidos.</p>`}</div>
          </section>`;
        }).join("");
      } else {
        entitySections = `<p class="gestion-empty">Eleg\xED una definici\xF3n con entidades para cargar el formulario.</p>`;
      }
      mainEl.innerHTML = `
      <section class="gestion-hero master-record-editor-hero panel">
        <header class="gestion-hero-header">
          <button type="button" class="btn btn-sm gestion-hero-back" data-master-record-editor-back>Volver al listado</button>
          <div class="gestion-hero-heading">
            <h2>${title}</h2>
            <p class="gestion-hero-subtitle">Al crear queda <strong>vigente</strong>. Al guardar cambios se archiva la revisi\xF3n anterior y pod\xE9s ver el historial desde el listado.</p>
          </div>
        </header>
        <div class="entity-editor-body master-record-editor-body">
          ${defSelect}
          ${session.mode === "edit" && existing ? `<p class="form-hint master-record-editor-version">Versi\xF3n actual: <strong>v${existing.version ?? 1}</strong>${(existing.history ?? []).length ? ` \xB7 ${existing.history.length} revisi\xF3n(es) en historial` : ""}</p>` : `<p class="form-hint master-record-editor-version">Al guardar se publicar\xE1 como <strong>vigente v1</strong>.</p>`}
          ${entitySections}
        </div>
        <footer class="component-attr-hero-footer">
          <button type="button" class="btn btn-sm" data-master-record-editor-back>Cancelar</button>
          <button type="button" class="btn btn-primary" id="btn-save-master-record">${session.mode === "edit" ? "Guardar" : "Crear registro"}</button>
        </footer>
      </section>`;
      const goBack = () => {
        exitMasterRecordEditor();
        renderMasterRecordsListView(mainEl, state, persist);
      };
      mainEl.querySelectorAll("[data-master-record-editor-back]").forEach((b) => b.addEventListener("click", goBack));
      mainEl.querySelector("#field-master-record-def")?.addEventListener("change", (e) => {
        draft.definitionId = e.target.value;
        if (!isMasterDefinitionAvailableForAbm(state, draft.definitionId)) {
          toast("Seleccion\xE1 una definici\xF3n con entidades.");
          return;
        }
        draft.values = buildEmptyValuesForDefinition(state, draft.definitionId);
        paint();
      });
      mainEl.querySelector("#btn-save-master-record")?.addEventListener("click", () => {
        if (session.mode === "create") {
          draft.definitionId = mainEl.querySelector("#field-master-record-def")?.value ?? draft.definitionId;
        }
        draft.values = collectMasterRecordValuesFromDom(mainEl);
        const validation = validateMasterRecordValues(state, draft.definitionId, draft.values);
        if (!validation.ok) {
          toast(validation.message);
          return;
        }
        applyAutoGeneratedAttributeValues(state, draft.definitionId, draft.values, {
          isCreate: session.mode === "create"
        });
        const now = (/* @__PURE__ */ new Date()).toISOString();
        const def2 = getMasterDefinitionById(state, draft.definitionId);
        if (session.mode === "edit" && existing) {
          const valuesChanged = !masterRecordValuesEqual(existing.values, draft.values);
          if (!valuesChanged) {
            toast("No hay cambios en los datos.");
            return;
          }
          pushMasterRecordHistoryBeforeUpdate(existing);
          existing.definitionId = draft.definitionId;
          existing.values = draft.values;
          existing.status = "vigente";
          existing.updatedAt = now;
          recordMasterAudit(state, {
            area: "masterRecord",
            action: "update",
            refId: existing.id,
            label: def2?.name ?? existing.id,
            detail: `v${existing.version} \xB7 ${summarizeMasterRecordForList(state, existing)}`
          });
          toast(`Revisi\xF3n guardada (vigente v${existing.version}).`, 2600, "success");
        } else {
          const newId = createId("masterRecord");
          const created = {
            id: newId,
            lineageId: newId,
            definitionId: draft.definitionId,
            values: draft.values,
            status: "vigente",
            version: 1,
            history: [],
            createdAt: now,
            updatedAt: now
          };
          if (!Array.isArray(state.masterRecords)) state.masterRecords = [];
          state.masterRecords.push(created);
          recordMasterAudit(state, {
            area: "masterRecord",
            action: "create",
            refId: newId,
            label: def2?.name ?? newId,
            detail: `v1 \xB7 ${summarizeMasterRecordForList(state, created)}`
          });
          toast("Registro creado (vigente v1).", 2600, "success");
        }
        persist();
        exitMasterRecordEditor();
        renderMasterRecordsListView(mainEl, state, persist);
      });
    };
    paint();
  }

  // js/maestros.js
  var entityEditorSession = null;
  var masterDefinitionEditorSession = null;
  function exitEntityEditor() {
    entityEditorSession = null;
  }
  function exitMasterDefinitionEditor() {
    masterDefinitionEditorSession = null;
  }
  function renderMaestros(mainEl, state, persist, masterKey = "flowTypes") {
    if (masterKey !== "entities") {
      exitEntityEditor();
    }
    if (masterKey !== "masterDefinitions") {
      exitMasterDefinitionEditor();
    }
    if (!isMasterRecordsNavScope(masterKey)) {
      exitMasterRecordEditor();
      exitMasterRecordImportSession();
    }
    if (masterKey === "flowTypes") {
      renderFlowTypesMaster(mainEl, state, persist);
      return;
    }
    if (masterKey === "entities") {
      if (entityEditorSession) {
        renderEntityEditorHero(mainEl, state, persist);
      } else {
        renderEntitiesMaster(mainEl, state, persist);
      }
      return;
    }
    if (masterKey === "masterDefinitions") {
      if (masterDefinitionEditorSession) {
        renderMasterDefinitionEditorHero(mainEl, state, persist);
      } else {
        renderMasterDefinitionsMaster(mainEl, state, persist);
      }
      return;
    }
    const masterRecordDefId = parseMasterRecordAbmDefinitionId(masterKey);
    if (masterKey === "masterRecords" || masterRecordDefId) {
      ensureMasterDefinitionsState(state);
      ensureMasterRecordsState(state);
      syncMasterRecordsAbmNav(state);
      if (hasMasterRecordImportSession()) {
        renderMasterRecordImportHero(mainEl, state, persist);
      } else if (hasMasterRecordEditorSession()) {
        renderMasterRecordEditorHero(mainEl, state, persist);
      } else if (masterRecordDefId) {
        renderMasterRecordsForDefinition(mainEl, state, persist, masterRecordDefId);
      } else {
        renderMasterRecordsHub(mainEl, state, persist);
      }
      return;
    }
    mainEl.innerHTML = `<section class="panel"><p class="empty-state">Maestro no disponible.</p></section>`;
  }
  function renderFlowTypesMaster(mainEl, state, persist) {
    const types = state.flowTypes ?? [];
    const rows = types.length === 0 ? `<tr><td colspan="3"><p class="gestion-empty">No hay tipos de flujo. Cre\xE1 uno con \xAB+ Nuevo tipo\xBB.</p></td></tr>` : types.map((t) => {
      const inUse = countFlowsUsingFlowType(state, t.id);
      const usage = inUse === 0 ? `<span class="catalog-muted">Sin flujos</span>` : `<span class="catalog-tree-count">${inUse} ${inUse === 1 ? "flujo" : "flujos"}</span>`;
      return `<tr>
              <td><strong>${escapeHtml(t.name)}</strong><div class="form-hint">${usage}</div></td>
              <td>${escapeHtml(t.description || "\u2014")}</td>
              <td class="catalog-actions">
                <button type="button" class="btn btn-sm" data-edit-flow-type="${escapeHtml(t.id)}">Editar</button>
                <button type="button" class="btn btn-sm btn-danger" data-rm-flow-type="${escapeHtml(t.id)}">Eliminar</button>
              </td>
            </tr>`;
    }).join("");
    mainEl.innerHTML = `
    <section class="panel panel--catalog maestros-panel">
      ${renderPageHeader(
      "Tipo de flujo",
      "Maestro de categor\xEDas para clasificar flujos en el cat\xE1logo. Nombre y descripci\xF3n.",
      `<button type="button" class="btn btn-primary btn-sm" id="btn-new-flow-type">+ Nuevo tipo</button>`
    )}
      <div class="table-wrap table-wrap--modern">
        <table class="table-modern">
          <thead><tr><th>Nombre</th><th>Descripci\xF3n</th><th>Acciones</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>`;
    mainEl.querySelector("#btn-new-flow-type")?.addEventListener("click", () => {
      openFlowTypeModal(state, persist, null, () => renderFlowTypesMaster(mainEl, state, persist));
    });
    mainEl.querySelectorAll("[data-edit-flow-type]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-edit-flow-type");
        const item = state.flowTypes?.find((t) => t.id === id);
        if (!item) return;
        openFlowTypeModal(state, persist, item, () => renderFlowTypesMaster(mainEl, state, persist));
      });
    });
    mainEl.querySelectorAll("[data-rm-flow-type]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-rm-flow-type");
        const item = state.flowTypes?.find((t) => t.id === id);
        if (!item) return;
        const inUse = countFlowsUsingFlowType(state, id);
        if (inUse > 0) {
          toast(
            `No pod\xE9s eliminar \xAB${item.name}\xBB: ${inUse} ${inUse === 1 ? "flujo lo usa" : "flujos lo usan"}.`
          );
          return;
        }
        if (!window.confirm(`\xBFEliminar el tipo de flujo \xAB${item.name}\xBB?`)) return;
        recordMasterAudit(state, {
          area: "flowType",
          action: "delete",
          refId: id,
          label: item.name
        });
        state.flowTypes = (state.flowTypes ?? []).filter((t) => t.id !== id);
        persist();
        toast("Tipo de flujo eliminado.", 2200, "success");
        renderFlowTypesMaster(mainEl, state, persist);
      });
    });
  }
  function openFlowTypeModal(state, persist, existing, onDone) {
    const isEdit = !!existing;
    const { close, root } = openModal(`
    <div class="modal-header">
      <h2>${isEdit ? "Editar tipo de flujo" : "Nuevo tipo de flujo"}</h2>
      <button type="button" class="btn btn-sm" data-modal-close>Cerrar</button>
    </div>
    <form id="form-flow-type" class="form-grid">
      <div class="form-row"><label>Nombre</label><input name="name" required maxlength="120" value="${escapeHtml(existing?.name ?? "")}" placeholder="Ej. Aprobaci\xF3n" /></div>
      <div class="form-row"><label>Descripci\xF3n</label><textarea name="description" rows="3" placeholder="Opcional">${escapeHtml(existing?.description ?? "")}</textarea></div>
      <button type="submit" class="btn btn-primary">${isEdit ? "Guardar" : "Crear"}</button>
    </form>
  `);
    root.querySelector("#form-flow-type")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const name = String(fd.get("name") ?? "").trim();
      const description = String(fd.get("description") ?? "").trim();
      if (!name) {
        toast("El nombre es obligatorio.");
        return;
      }
      if (isFlowTypeNameTaken(state, name, existing?.id)) {
        toast(`Ya existe un tipo de flujo con el nombre \xAB${name}\xBB.`);
        return;
      }
      if (isEdit && existing) {
        existing.name = name;
        existing.description = description;
        syncFlowTypeLabelOnFlows(state, existing.id, name);
        recordMasterAudit(state, {
          area: "flowType",
          action: "update",
          refId: existing.id,
          label: name,
          detail: description || void 0
        });
      } else {
        const newId = createId("flowType");
        state.flowTypes.push({
          id: newId,
          name,
          description
        });
        recordMasterAudit(state, {
          area: "flowType",
          action: "create",
          refId: newId,
          label: name,
          detail: description || void 0
        });
      }
      persist();
      close();
      toast(isEdit ? "Tipo de flujo actualizado." : "Tipo de flujo creado.", 2200, "success");
      onDone();
    });
  }
  function renderMasterDefinitionsMaster(mainEl, state, persist) {
    const defs = state.masterDefinitions ?? [];
    const rows = defs.length === 0 ? `<tr><td colspan="4"><p class="gestion-empty">No hay definiciones. Cre\xE1 una con \xAB+ Nueva definici\xF3n\xBB (requiere entidades en el maestro).</p></td></tr>` : defs.map((d) => {
      const entitySummary = summarizeMasterDefinitionEntities(state, d);
      const count = (d.entityIds ?? []).length;
      return `<tr>
              <td><strong>${escapeHtml(d.name)}</strong><div class="form-hint"><code>${escapeHtml(d.id)}</code></div></td>
              <td>${escapeHtml(d.description || "\u2014")}</td>
              <td><span class="catalog-tree-count">${count} ${count === 1 ? "entidad" : "entidades"}</span><div class="form-hint">${escapeHtml(entitySummary)}</div></td>
              <td class="catalog-actions">
                <button type="button" class="btn btn-sm" data-edit-master-def="${escapeHtml(d.id)}">Editar</button>
                <button type="button" class="btn btn-sm btn-danger" data-rm-master-def="${escapeHtml(d.id)}">Eliminar</button>
              </td>
            </tr>`;
    }).join("");
    mainEl.innerHTML = `
    <section class="panel panel--catalog maestros-panel">
      ${renderPageHeader(
      "Definici\xF3n de maestros",
      "Composiciones basadas en una o m\xE1s entidades (Definiciones de entidad \u2192 Entidades).",
      `<button type="button" class="btn btn-primary btn-sm" id="btn-new-master-def">+ Nueva definici\xF3n</button>`
    )}
      <div class="table-wrap table-wrap--modern">
        <table class="table-modern">
          <thead><tr><th>Nombre</th><th>Descripci\xF3n</th><th>Entidades base</th><th>Acciones</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>`;
    mainEl.querySelector("#btn-new-master-def")?.addEventListener("click", () => {
      masterDefinitionEditorSession = { mode: "create" };
      renderMasterDefinitionEditorHero(mainEl, state, persist);
    });
    mainEl.querySelectorAll("[data-edit-master-def]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-edit-master-def");
        if (!state.masterDefinitions?.some((d) => d.id === id)) return;
        masterDefinitionEditorSession = { mode: "edit", definitionId: id };
        renderMasterDefinitionEditorHero(mainEl, state, persist);
      });
    });
    mainEl.querySelectorAll("[data-rm-master-def]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-rm-master-def");
        const item = state.masterDefinitions?.find((d) => d.id === id);
        if (!item) return;
        const recordCount = countMasterRecordsForDefinition(state, id);
        if (recordCount > 0) {
          toast(
            `No pod\xE9s eliminar \xAB${item.name}\xBB: ${recordCount} ${recordCount === 1 ? "registro de maestro la usa" : "registros de maestro la usan"}.`
          );
          return;
        }
        if (!window.confirm(`\xBFEliminar la definici\xF3n \xAB${item.name}\xBB?`)) return;
        recordMasterAudit(state, {
          area: "masterDefinition",
          action: "delete",
          refId: id,
          label: item.name,
          detail: summarizeMasterDefinitionEntities(state, item)
        });
        state.masterDefinitions = (state.masterDefinitions ?? []).filter((d) => d.id !== id);
        persist();
        toast("Definici\xF3n eliminada.", 2200, "success");
        renderMasterDefinitionsMaster(mainEl, state, persist);
      });
    });
  }
  function renderMasterDefinitionEditorHero(mainEl, state, persist) {
    const session = masterDefinitionEditorSession;
    if (!session) {
      renderMasterDefinitionsMaster(mainEl, state, persist);
      return;
    }
    const existing = session.mode === "edit" ? state.masterDefinitions?.find((d) => d.id === session.definitionId) ?? null : null;
    if (session.mode === "edit" && !existing) {
      exitMasterDefinitionEditor();
      renderMasterDefinitionsMaster(mainEl, state, persist);
      return;
    }
    const draft = {
      name: existing?.name ?? "",
      description: existing?.description ?? "",
      definitionId: existing?.id ?? null,
      entityIds: [...existing?.entityIds ?? []]
    };
    const title = session.mode === "edit" ? "Editar definici\xF3n de maestros" : "Nueva definici\xF3n de maestros";
    const paint = () => {
      mainEl.innerHTML = `
      <section class="gestion-hero master-def-editor-hero panel">
        <header class="gestion-hero-header">
          <button type="button" class="btn btn-sm gestion-hero-back" data-master-def-editor-back>Volver al listado</button>
          <div class="gestion-hero-heading">
            <h2>${title}</h2>
            <p class="gestion-hero-subtitle">Eleg\xED una o m\xE1s entidades del maestro como base de esta definici\xF3n.</p>
          </div>
        </header>
        <div class="entity-editor-body master-def-editor-body">
          <form id="form-master-def" class="entity-editor-form form-grid">
            <div class="form-row form-row--entity-name">
              <label for="field-master-def-name">Nombre</label>
              <input id="field-master-def-name" name="name" required maxlength="120" value="${escapeHtml(draft.name)}" placeholder="Ej. Maestro de proveedores" autocomplete="off" />
            </div>
            <div class="form-row form-row--full">
              <label for="field-master-def-desc">Descripci\xF3n</label>
              <textarea id="field-master-def-desc" name="description" rows="3" placeholder="Opcional">${escapeHtml(draft.description)}</textarea>
            </div>
          </form>
          <section class="entity-meta-panel master-def-entities-panel" aria-labelledby="master-def-entities-heading">
            <h3 id="master-def-entities-heading" class="entity-meta-title">Entidades del maestro</h3>
            <p class="form-hint">Marc\xE1 todas las entidades que componen esta definici\xF3n (m\xEDnimo una).</p>
            <div id="master-def-entity-checklist-host">
              ${renderMasterDefinitionEntityChecklist(state, draft.entityIds)}
            </div>
          </section>
        </div>
        <footer class="component-attr-hero-footer">
          <button type="button" class="btn btn-sm" data-master-def-editor-back>Cancelar</button>
          <button type="button" class="btn btn-primary" id="btn-save-master-def">${session.mode === "edit" ? "Guardar definici\xF3n" : "Crear definici\xF3n"}</button>
        </footer>
      </section>`;
      const syncDraftFromDom = () => {
        draft.name = String(mainEl.querySelector("#field-master-def-name")?.value ?? "").trim();
        draft.description = String(mainEl.querySelector("#field-master-def-desc")?.value ?? "").trim();
        draft.entityIds = [...mainEl.querySelectorAll('#master-def-entity-checklist-host input[name="entityIds"]:checked')].map(
          (el) => String(el.value)
        );
      };
      const goBack = () => {
        exitMasterDefinitionEditor();
        renderMasterDefinitionsMaster(mainEl, state, persist);
      };
      mainEl.querySelectorAll("[data-master-def-editor-back]").forEach((btn) => {
        btn.addEventListener("click", goBack);
      });
      mainEl.querySelectorAll('#master-def-entity-checklist-host input[name="entityIds"]').forEach((input) => {
        input.addEventListener("change", () => {
          syncDraftFromDom();
        });
      });
      mainEl.querySelector("#btn-save-master-def")?.addEventListener("click", () => {
        syncDraftFromDom();
        const validation = validateMasterDefinition(
          state,
          draft.name,
          draft.entityIds,
          draft.definitionId ?? void 0
        );
        if (!validation.ok) {
          toast(validation.message);
          return;
        }
        const validIds = new Set((state.entities ?? []).map((en) => en.id));
        if (session.mode === "edit" && existing) {
          existing.name = draft.name;
          existing.description = draft.description;
          existing.entityIds = [...new Set(draft.entityIds)];
          normalizeMasterDefinition(existing, validIds);
          recordMasterAudit(state, {
            area: "masterDefinition",
            action: "update",
            refId: existing.id,
            label: draft.name,
            detail: summarizeMasterDefinitionEntities(state, existing)
          });
        } else {
          const newId = createId("masterDef");
          const created = normalizeMasterDefinition(
            {
              id: newId,
              name: draft.name,
              description: draft.description,
              entityIds: draft.entityIds
            },
            validIds
          );
          if (!Array.isArray(state.masterDefinitions)) state.masterDefinitions = [];
          state.masterDefinitions.push(created);
          recordMasterAudit(state, {
            area: "masterDefinition",
            action: "create",
            refId: newId,
            label: draft.name,
            detail: summarizeMasterDefinitionEntities(state, created)
          });
        }
        persist();
        toast(session.mode === "edit" ? "Definici\xF3n actualizada." : "Definici\xF3n creada.", 2200, "success");
        exitMasterDefinitionEditor();
        renderMasterDefinitionsMaster(mainEl, state, persist);
      });
      mainEl.querySelector("#field-master-def-name")?.focus();
    };
    paint();
  }
  function renderEntitiesMaster(mainEl, state, persist) {
    const entities = state.entities ?? [];
    const rows = entities.length === 0 ? `<tr><td colspan="4"><p class="gestion-empty">No hay entidades. Cre\xE1 una con \xAB+ Nueva entidad\xBB.</p></td></tr>` : entities.map((e) => {
      const count = (e.attributes ?? []).length;
      const attrHint = count === 0 ? `<span class="catalog-muted">Sin atributos</span>` : `<span class="catalog-tree-count">${count} ${count === 1 ? "atributo" : "atributos"}</span>`;
      return `<tr>
              <td><strong>${escapeHtml(e.name)}</strong><div class="form-hint">${attrHint}</div></td>
              <td>${formatEntityKindLabel(state, e)}</td>
              <td>${escapeHtml(summarizeEntityAttributesForList(state, e.attributes))}</td>
              <td class="catalog-actions">
                <button type="button" class="btn btn-sm" data-edit-entity="${escapeHtml(e.id)}">Editar</button>
                <button type="button" class="btn btn-sm btn-danger" data-rm-entity="${escapeHtml(e.id)}">Eliminar</button>
              </td>
            </tr>`;
    }).join("");
    mainEl.innerHTML = `
    <section class="panel panel--catalog maestros-panel">
      ${renderPageHeader(
      "Definiciones de entidad",
      "ABM de entidades: atributos, entidad base y extensi\xF3n sobre otras bases.",
      `<button type="button" class="btn btn-primary btn-sm" id="btn-new-entity">+ Nueva entidad</button>`
    )}
      <div class="table-wrap table-wrap--modern">
        <table class="table-modern">
          <thead><tr><th>Nombre</th><th>Clasificaci\xF3n</th><th>Atributos</th><th>Acciones</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>`;
    mainEl.querySelector("#btn-new-entity")?.addEventListener("click", () => {
      entityEditorSession = { mode: "create" };
      renderEntityEditorHero(mainEl, state, persist);
    });
    mainEl.querySelectorAll("[data-edit-entity]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-edit-entity");
        if (!state.entities?.some((e) => e.id === id)) return;
        entityEditorSession = { mode: "edit", entityId: id };
        renderEntityEditorHero(mainEl, state, persist);
      });
    });
    mainEl.querySelectorAll("[data-rm-entity]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-rm-entity");
        const item = state.entities?.find((e) => e.id === id);
        if (!item) return;
        const refCount = countEntitiesReferencingEntity(state, id);
        if (refCount > 0) {
          toast(
            `No pod\xE9s eliminar \xAB${item.name}\xBB: ${refCount} ${refCount === 1 ? "entidad la referencia" : "entidades la referencian"}.`
          );
          return;
        }
        const extCount = countEntitiesExtendingBase(state, id);
        if (extCount > 0) {
          toast(
            `No pod\xE9s eliminar \xAB${item.name}\xBB: ${extCount} ${extCount === 1 ? "entidad la extiende" : "entidades la extienden"}.`
          );
          return;
        }
        const defCount = countMasterDefinitionsUsingEntity(state, id);
        if (defCount > 0) {
          toast(
            `No pod\xE9s eliminar \xAB${item.name}\xBB: ${defCount} ${defCount === 1 ? "definici\xF3n de maestros la usa" : "definiciones de maestros la usan"}.`
          );
          return;
        }
        if (!window.confirm(`\xBFEliminar la entidad \xAB${item.name}\xBB?`)) return;
        recordMasterAudit(state, {
          area: "entity",
          action: "delete",
          refId: id,
          label: item.name
        });
        state.entities = (state.entities ?? []).filter((e) => e.id !== id);
        persist();
        toast("Entidad eliminada.", 2200, "success");
        renderEntitiesMaster(mainEl, state, persist);
      });
    });
  }
  function renderEntityAttributesEditorRows(state, excludeEntityId, draftAttributes, readOnly) {
    if (!draftAttributes.length) {
      return `<tr class="entity-attr-row entity-attr-row--empty"><td colspan="6"><p class="gestion-empty">Sin atributos. Agreg\xE1 al menos uno con \xAB+ Agregar atributo\xBB.</p></td></tr>`;
    }
    const refCandidates = (state.entities ?? []).filter((e) => e.id !== excludeEntityId);
    return draftAttributes.map((attr, index) => {
      const norm = normalizeEntityAttribute(attr);
      const dis = readOnly ? " disabled" : "";
      const isRef = norm.type === ENTITY_REF_TYPE;
      const isAuto = isEntityAttributeAutoGenerated(norm);
      let autoHint = "";
      if (isAuto) {
        if (norm.type === ENTITY_UUID_TYPE) {
          autoHint = `<span class="entity-uuid-auto-hint" title="Se asigna al crear instancias (RFC 4122)">Autogenerada</span>`;
        } else if (norm.type === ENTITY_DATE_EXECUTION_TYPE) {
          autoHint = `<span class="entity-uuid-auto-hint" title="Se asigna al crear instancias en UTC (GETUTCDATE, ISO 8601 con Z)">UTC</span>`;
        } else if (norm.type === ENTITY_USER_CONNECTED_TYPE) {
          autoHint = `<span class="entity-uuid-auto-hint" title="Usuario logueado; sin sesi\xF3n usa prueabaomigracion (sistema)">Sesi\xF3n</span>`;
        } else {
          autoHint = `<span class="entity-uuid-auto-hint">Autogenerada</span>`;
        }
      }
      const requiredCell = isAuto ? autoHint : `<label><input type="checkbox" data-field="required" ${norm.required ? "checked" : ""}${dis} /> Obligatorio</label>`;
      let refCell = `<span class="catalog-muted">\u2014</span>`;
      if (isRef) {
        if (!refCandidates.length) {
          refCell = `<span class="form-hint">Cre\xE1 otra entidad primero</span>`;
        } else {
          refCell = `<select class="entity-attr-input" data-field="refEntityId" ${dis}>${renderEntityRefSelectOptions(state, excludeEntityId, norm.refEntityId)}</select>`;
        }
      }
      return `<tr class="entity-attr-row" data-entity-attr-row="${index}">
        <td><input class="entity-attr-input" data-field="key" value="${escapeHtml(norm.key)}" placeholder="ej. monto" ${dis} /></td>
        <td><input class="entity-attr-input" data-field="label" value="${escapeHtml(norm.label)}" placeholder="Etiqueta visible" ${dis} /></td>
        <td><select class="entity-attr-input" data-field="type" ${dis}>${renderEntityDataTypeOptions(norm.type)}</select></td>
        <td class="entity-attr-ref">${refCell}</td>
        <td class="entity-attr-required">${requiredCell}</td>
        <td class="catalog-actions">${readOnly ? "" : `<button type="button" class="btn btn-sm btn-danger" data-rm-attr-row="${index}">Quitar</button>`}</td>
      </tr>`;
    }).join("");
  }
  function renderEntityEditorHero(mainEl, state, persist) {
    const session = entityEditorSession;
    if (!session) {
      renderEntitiesMaster(mainEl, state, persist);
      return;
    }
    const existing = session.mode === "edit" ? state.entities?.find((e) => e.id === session.entityId) ?? null : null;
    if (session.mode === "edit" && !existing) {
      exitEntityEditor();
      renderEntitiesMaster(mainEl, state, persist);
      return;
    }
    const draft = {
      name: existing?.name ?? "",
      attributes: cloneEntityAttributes(existing?.attributes ?? []),
      entityId: existing?.id ?? null,
      isBase: !!existing?.isBase,
      extendsBaseEntityId: existing?.extendsBaseEntityId ?? null
    };
    const title = session.mode === "edit" ? "Editar entidad" : "Nueva entidad";
    const paint = () => {
      mainEl.innerHTML = `
      <section class="gestion-hero entity-editor-hero panel">
        <header class="gestion-hero-header">
          <button type="button" class="btn btn-sm gestion-hero-back" data-entity-editor-back>Volver al listado</button>
          <div class="gestion-hero-heading">
            <h2>${title}</h2>
            <p class="gestion-hero-subtitle">Defin\xED nombre, si es entidad base o extiende otra base, y los atributos del modelo.</p>
          </div>
        </header>
        <div class="entity-editor-body">
          <form id="form-entity" class="entity-editor-form">
            <div class="form-row form-row--entity-name">
              <label for="field-entity-name">Nombre de la entidad</label>
              <input id="field-entity-name" name="entityName" required maxlength="120" value="${escapeHtml(draft.name)}" placeholder="Ej. Gasto, Cliente, Orden" autocomplete="off" />
            </div>
            <section class="entity-meta-panel" aria-labelledby="entity-meta-heading">
              <h3 id="entity-meta-heading" class="entity-meta-title">Clasificaci\xF3n</h3>
              <div class="form-grid entity-meta-grid">
                <div class="form-row entity-meta-base">
                  <label class="entity-check-label" for="field-entity-is-base">
                    <input type="checkbox" id="field-entity-is-base" name="entityIsBase" ${draft.isBase ? "checked" : ""} />
                    Entidad base
                  </label>
                  <p class="form-hint">Marc\xE1 esta opci\xF3n si otras entidades van a extender este modelo. Una base no extiende otra entidad.</p>
                </div>
                <div class="form-row entity-meta-extends"${draft.isBase ? " hidden" : ""}>
                  <label for="field-extends-base">Extiende de (entidad base)</label>
                  <select id="field-extends-base" name="extendsBaseEntityId">${renderEntityBaseSelectOptions(state, draft.entityId, draft.extendsBaseEntityId)}</select>
                  <p class="form-hint">Solo aparecen entidades marcadas como base. Dej\xE1 \xABNinguna\xBB si no hereda de otra.</p>
                </div>
              </div>
            </section>
          </form>
          <div class="entity-attr-toolbar">
            <h3 class="entity-attr-title">Atributos</h3>
            <button type="button" class="btn btn-sm btn-primary" id="btn-add-entity-attr">+ Agregar atributo</button>
          </div>
          <div class="table-wrap table-wrap--modern">
            <table class="table-modern entity-attr-table">
              <thead>
                <tr><th>Clave</th><th>Etiqueta</th><th>Tipo</th><th>Referencia</th><th>Obligatorio</th><th></th></tr>
              </thead>
              <tbody id="entity-attr-tbody">${renderEntityAttributesEditorRows(state, draft.entityId, draft.attributes, false)}</tbody>
            </table>
          </div>
        </div>
        <footer class="component-attr-hero-footer">
          <button type="button" class="btn btn-sm" data-entity-editor-back>Cancelar</button>
          <button type="button" class="btn btn-primary" id="btn-save-entity">Guardar entidad</button>
        </footer>
      </section>`;
      const goBack = () => {
        exitEntityEditor();
        renderEntitiesMaster(mainEl, state, persist);
      };
      mainEl.querySelectorAll("[data-entity-editor-back]").forEach((btn) => {
        btn.addEventListener("click", goBack);
      });
      const syncEntityMetaFromDom = () => {
        draft.isBase = !!mainEl.querySelector('[name="entityIsBase"]')?.checked;
        if (draft.isBase) {
          draft.extendsBaseEntityId = null;
        } else {
          const ext = String(mainEl.querySelector('[name="extendsBaseEntityId"]')?.value ?? "").trim();
          draft.extendsBaseEntityId = ext || null;
        }
        const extendsRow = mainEl.querySelector(".entity-meta-extends");
        if (extendsRow) extendsRow.hidden = draft.isBase;
      };
      mainEl.querySelector('[name="entityIsBase"]')?.addEventListener("change", () => {
        syncEntityMetaFromDom();
        if (draft.isBase) {
          mainEl.querySelector('[name="extendsBaseEntityId"]').value = "";
        }
      });
      const syncDraftFromDom = () => {
        draft.name = String(mainEl.querySelector('[name="entityName"]')?.value ?? "").trim();
        syncEntityMetaFromDom();
        const rows = mainEl.querySelectorAll("[data-entity-attr-row]");
        const next = [];
        rows.forEach((row, index) => {
          const prev = draft.attributes[index];
          const key = String(row.querySelector('[data-field="key"]')?.value ?? "").trim();
          const label = String(row.querySelector('[data-field="label"]')?.value ?? "").trim();
          const type = String(row.querySelector('[data-field="type"]')?.value ?? "texto");
          const refEntityId = String(row.querySelector('[data-field="refEntityId"]')?.value ?? "").trim();
          const required = !!row.querySelector('[data-field="required"]')?.checked;
          if (!key && !label && !prev) return;
          next.push(
            normalizeEntityAttribute({
              id: prev?.id,
              key,
              label,
              type,
              required,
              refEntityId: type === ENTITY_REF_TYPE ? refEntityId : null
            })
          );
        });
        draft.attributes = next;
      };
      const rebindAttrTable = () => {
        mainEl.querySelector("#entity-attr-tbody").innerHTML = renderEntityAttributesEditorRows(
          state,
          draft.entityId,
          draft.attributes,
          false
        );
        bindAttrRowHandlers();
      };
      const bindAttrRowHandlers = () => {
        mainEl.querySelectorAll("[data-rm-attr-row]").forEach((btn) => {
          btn.addEventListener("click", () => {
            syncDraftFromDom();
            const idx = Number.parseInt(btn.getAttribute("data-rm-attr-row") ?? "", 10);
            if (Number.isNaN(idx)) return;
            draft.attributes.splice(idx, 1);
            rebindAttrTable();
          });
        });
        mainEl.querySelectorAll('[data-field="type"]').forEach((sel) => {
          sel.addEventListener("change", () => {
            syncDraftFromDom();
            rebindAttrTable();
          });
        });
      };
      mainEl.querySelector("#btn-add-entity-attr")?.addEventListener("click", () => {
        syncDraftFromDom();
        draft.attributes.push(
          normalizeEntityAttribute({ key: "", label: "", type: "texto", required: false })
        );
        rebindAttrTable();
        mainEl.querySelector('[data-entity-attr-row]:last-child [data-field="key"]')?.focus();
      });
      bindAttrRowHandlers();
      mainEl.querySelector("#btn-save-entity")?.addEventListener("click", () => {
        syncDraftFromDom();
        draft.attributes = draft.attributes.filter((a) => String(a.key ?? "").trim() || String(a.label ?? "").trim());
        const validation = validateEntityDefinition(draft.name, draft.attributes);
        if (!validation.ok) {
          toast(validation.message);
          return;
        }
        const proposedId = draft.entityId ?? createId("entity");
        const refValidation = validateEntityRefRules(state, proposedId, draft.attributes);
        if (!refValidation.ok) {
          toast(refValidation.message);
          return;
        }
        const extValidation = validateEntityExtensionRules(state, proposedId, {
          isBase: draft.isBase,
          extendsBaseEntityId: draft.extendsBaseEntityId
        });
        if (!extValidation.ok) {
          toast(extValidation.message);
          return;
        }
        if (existing?.isBase && !draft.isBase) {
          const baseChange = validateEntityBaseFlagChange(state, proposedId, false);
          if (!baseChange.ok) {
            toast(baseChange.message);
            return;
          }
        }
        if (isEntityNameTaken(state, draft.name, draft.entityId ?? void 0)) {
          toast(`Ya existe una entidad con el nombre \xAB${draft.name}\xBB.`);
          return;
        }
        const payload = normalizeEntityRecord(
          {
            id: proposedId,
            name: draft.name,
            isBase: draft.isBase,
            extendsBaseEntityId: draft.isBase ? null : draft.extendsBaseEntityId,
            attributes: draft.attributes.map((a) => normalizeEntityAttribute(a))
          },
          state
        );
        if (session.mode === "edit" && existing) {
          existing.name = payload.name;
          existing.isBase = payload.isBase;
          existing.extendsBaseEntityId = payload.extendsBaseEntityId;
          existing.attributes = payload.attributes;
          recordMasterAudit(state, {
            area: "entity",
            action: "update",
            refId: payload.id,
            label: payload.name,
            detail: `${payload.attributes.length} atributo(s)`
          });
        } else {
          state.entities.push(payload);
          recordMasterAudit(state, {
            area: "entity",
            action: "create",
            refId: payload.id,
            label: payload.name,
            detail: `${payload.attributes.length} atributo(s)`
          });
        }
        persist();
        toast(session.mode === "edit" ? "Entidad actualizada." : "Entidad creada.", 2200, "success");
        exitEntityEditor();
        renderEntitiesMaster(mainEl, state, persist);
      });
      mainEl.querySelector('[name="entityName"]')?.focus();
    };
    paint();
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
    function isReportView(view) {
      return typeof view === "string" && view.startsWith("report-");
    }
    function setNavActive(view, catalog, master) {
      const designerGroup = document.querySelector('[data-nav-group="designer"]');
      const maestrosGroup = document.querySelector('[data-nav-group="maestros"]');
      const operacionesGroup = document.querySelector('[data-nav-group="operaciones"]');
      const reportesGroup = document.querySelector('[data-nav-group="reportes"]');
      document.querySelectorAll(".nav-btn[data-view]").forEach((b) => b.classList.remove("is-active"));
      if (view === "designer") {
        const cat = catalog === "activities" ? "activities" : "flows";
        designerGroup?.querySelector(".nav-group-toggle")?.classList.add("is-active");
        designerGroup?.querySelectorAll(".nav-sub-btn").forEach((b) => {
          b.classList.toggle("is-active", b.dataset.catalog === cat);
        });
      } else if (view === "maestros") {
        const abmDefId = parseMasterRecordAbmDefinitionId(master);
        maestrosGroup?.querySelector(".nav-group-toggle")?.classList.add("is-active");
        maestrosGroup?.querySelectorAll(".nav-sub-btn[data-master]").forEach((b) => {
          const btnDefId = b.dataset.masterDefId ?? "";
          let active = false;
          if (abmDefId) {
            active = b.dataset.master === "masterRecordAbm" && btnDefId === abmDefId;
          } else if (master === "masterRecords") {
            active = b.dataset.master === "masterRecords" && !btnDefId;
          } else {
            const m = master === "entities" ? "entities" : master === "masterDefinitions" ? "masterDefinitions" : master === "flowTypes" ? "flowTypes" : "flowTypes";
            active = b.dataset.master === m && !btnDefId;
          }
          b.classList.toggle("is-active", active);
        });
        maestrosGroup?.querySelectorAll(".nav-sub-group").forEach((group) => {
          const section = group.dataset.maestrosSection ?? "";
          if (section === "masterRecordsAbm") {
            group.classList.toggle(
              "is-active",
              master === "masterRecords" || abmDefId != null
            );
            return;
          }
          const btn = group.querySelector(".nav-sub-btn[data-master]:not([data-master-def-id])");
          const btnMaster = btn?.dataset.master ?? "";
          group.classList.toggle("is-active", !abmDefId && master === btnMaster);
        });
      } else if (view === "gestion" || view === "auth-users" || view === "auth-user-detail" || view === "user-profile" || view === "data-backup") {
        operacionesGroup?.querySelector(".nav-group-toggle")?.classList.add("is-active");
        operacionesGroup?.querySelectorAll(".nav-sub-btn").forEach((b) => {
          const navView = b.dataset.view;
          const active = navView === view || view === "auth-user-detail" && navView === "auth-users";
          b.classList.toggle("is-active", active);
        });
      } else if (isReportView(view) || view === "reporte") {
        const reportView = view === "reporte" ? "report-activities" : view;
        reportesGroup?.querySelector(".nav-group-toggle")?.classList.add("is-active");
        reportesGroup?.querySelectorAll(".nav-sub-btn").forEach((b) => {
          b.classList.toggle("is-active", b.dataset.view === reportView);
        });
      } else {
        document.querySelector(
          `.nav-btn[data-view="${view}"]:not([data-catalog]):not([data-master]):not(.nav-sub-btn)`
        )?.classList.add("is-active");
      }
    }
    drawer?.addEventListener("click", (e) => {
      const btn = e.target instanceof Element ? e.target.closest(".nav-btn[data-view]") : null;
      if (!btn || !drawer.contains(btn)) return;
      const view = btn.dataset.view;
      const catalog = btn.dataset.catalog ?? "flows";
      let master = btn.dataset.master ?? "flowTypes";
      const masterDefId = btn.dataset.masterDefId ?? "";
      if (masterDefId) {
        master = `${MASTER_RECORD_ABM_PREFIX}${masterDefId}`;
      }
      setNavActive(view, catalog, master);
      if (view === "designer") {
        onNavigate(view, catalog, null);
      } else if (view === "maestros") {
        onNavigate(view, null, master);
      } else {
        onNavigate(view, null, null);
      }
      if (!isDockedNav()) close();
    });
    return { close, open, setNavActive };
  }

  // js/auth-ui.js
  function bindAvatarImageFallback(root) {
    root.querySelectorAll(".user-avatar__img").forEach((img) => {
      if (!(img instanceof HTMLImageElement)) return;
      if (img.complete && img.naturalWidth === 0) {
        img.closest(".user-avatar")?.classList.add("user-avatar--offline");
      }
      img.addEventListener("error", () => {
        img.closest(".user-avatar")?.classList.add("user-avatar--offline");
      });
    });
  }
  function renderUserAvatarHtml(user, opts = {}) {
    const size = opts.size ?? 40;
    const cls = opts.className ?? "user-avatar";
    const seed = user?.avatarSeed ?? user?.username ?? "user";
    const hue = hashStringToInt(seed) % 360;
    const initials = getUserInitials(user ?? {});
    const src = getUserAvatarImageUrl(user ?? { avatarSeed: seed });
    const alt = escapeHtml(user?.displayName ?? user?.username ?? "Usuario");
    return `<span class="${cls}" style="--avatar-size:${size}px;--avatar-hue:${hue}" title="${alt}">
    <img class="user-avatar__img" src="${escapeHtml(src)}" alt="" width="${size}" height="${size}" loading="lazy" decoding="async" />
    <span class="user-avatar__fallback" aria-hidden="true">${escapeHtml(initials)}</span>
  </span>`;
  }
  function formatSessionDate(iso) {
    if (!iso) return "\u2014";
    try {
      return new Date(iso).toLocaleString("es-AR");
    } catch {
      return iso;
    }
  }
  function renderUserFieldsTableRows(user, opts = {}) {
    const statusBadge = user.active ? `<span class="badge badge-listo">Activo</span>` : `<span class="badge badge-borrador">Inactivo</span>`;
    const systemBadge = isSystemAuthUser(user) ? `<span class="badge badge-borrador">Usuario de sistema</span>` : `<span class="catalog-muted">Cuenta interactiva</span>`;
    const loginBadge = canUserLogin(user) ? `<span class="badge badge-listo">Puede iniciar sesi\xF3n</span>` : `<span class="badge badge-borrador">Sin login</span>`;
    const rows = [
      ["Nombre para mostrar", escapeHtml(user.displayName)],
      ["Usuario (login)", `@${escapeHtml(user.username)}`],
      ["Id interno", `<code>${escapeHtml(user.id)}</code>`],
      ["Avatar (seed)", `<code>${escapeHtml(user.avatarSeed)}</code>`],
      ["URL del avatar", `<code class="user-detail-url">${escapeHtml(getUserAvatarImageUrl(user))}</code>`],
      ["Clasificaci\xF3n", systemBadge],
      ["Inicio de sesi\xF3n", loginBadge],
      ["Estado", statusBadge],
      ["Proveedor de auth", escapeHtml(AUTH_PROVIDER_LOCAL)]
    ];
    if (opts.includePasswordHint && !isSystemAuthUser(user)) {
      rows.push([
        "Clave (mock)",
        `<span class="catalog-muted">Almacenada en localStorage del navegador.</span> Valor demo del cat\xE1logo: <code>1234</code>`
      ]);
    }
    if (isSystemAuthUser(user)) {
      rows.push([
        "Uso",
        `<span class="catalog-muted">Reservado para procesos autom\xE1ticos (p. ej. atributo <code>userconnected</code> sin sesi\xF3n).</span>`
      ]);
    }
    if (opts.session) {
      rows.push(["Sesi\xF3n actual \u2014 inicio", escapeHtml(formatSessionDate(opts.session.at))]);
      rows.push(["Sesi\xF3n actual \u2014 proveedor", escapeHtml(opts.session.provider ?? AUTH_PROVIDER_LOCAL)]);
    }
    return rows.map(([label, value]) => `<tr><th scope="row">${label}</th><td>${value}</td></tr>`).join("");
  }
  function renderUserDetailShell(mainEl, user, config) {
    mainEl.innerHTML = `
    <section class="gestion-hero user-profile-hero panel">
      <header class="gestion-hero-header">
        <button type="button" class="btn btn-sm gestion-hero-back" data-user-detail-back>Volver</button>
        <div class="gestion-hero-heading">
          <h2>${escapeHtml(config.title)}</h2>
          <p class="gestion-hero-subtitle">${escapeHtml(config.subtitle)}</p>
        </div>
      </header>
      <div class="user-profile-body">
        <div class="user-profile-card panel">
          ${renderUserAvatarHtml(user, { size: 96, className: "user-avatar user-avatar--profile" })}
          <h3 class="user-profile-name">${escapeHtml(user.displayName)}</h3>
          <p class="user-profile-username">@${escapeHtml(user.username)}</p>
        </div>
        <div class="table-wrap table-wrap--modern user-profile-table-wrap">
          <table class="table-modern">
            <tbody>${config.tableRowsHtml}</tbody>
          </table>
        </div>
      </div>
    </section>`;
    mainEl.querySelector("[data-user-detail-back]")?.addEventListener("click", config.onBack);
    bindAvatarImageFallback(mainEl);
  }
  function renderLoginScreen(mainEl, onSuccess) {
    const users = listLoginUsers();
    const cards = users.map(
      (u) => `
    <article class="auth-user-card panel" data-auth-user="${escapeHtml(u.username)}">
      ${renderUserAvatarHtml(u, { size: 56, className: "user-avatar user-avatar--card" })}
      <h3 class="auth-user-card__name">${escapeHtml(u.displayName)}</h3>
      <p class="auth-user-card__username">@${escapeHtml(u.username)}</p>
      <form class="auth-user-card__form" data-auth-form="${escapeHtml(u.username)}">
        <label class="auth-user-card__label">Clave</label>
        <input type="password" name="password" class="auth-user-card__input" autocomplete="current-password" placeholder="Clave" required />
        <button type="submit" class="btn btn-primary btn-sm auth-user-card__submit">Entrar</button>
      </form>
    </article>`
    ).join("");
    mainEl.innerHTML = `
    <section class="auth-gate panel">
      <div class="auth-gate__inner">
        <header class="auth-gate__header">
          <h2>Iniciar sesi\xF3n</h2>
          <p class="auth-gate__subtitle">Eleg\xED tu usuario e ingres\xE1 la clave. Mock local \u2014 integrable con Supabase u otro proveedor.</p>
        </header>
        <div class="auth-user-grid">${cards || `<p class="gestion-empty">No hay usuarios configurados.</p>`}</div>
        <p class="form-hint auth-gate__hint">Demo: los 5 usuarios del cat\xE1logo usan la clave <code>1234</code>.</p>
      </div>
    </section>`;
    mainEl.querySelectorAll("[data-auth-form]").forEach((form) => {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const card = form.closest("[data-auth-user]");
        const username = card?.getAttribute("data-auth-user") ?? "";
        const password = String(form.querySelector('[name="password"]')?.value ?? "");
        const result = authenticate({ username, password });
        if (!result.ok) {
          toast(result.message);
          return;
        }
        toast(`Bienvenido/a, ${result.session.displayName}.`, 2600, "success");
        onSuccess();
      });
    });
    bindAvatarImageFallback(mainEl);
  }
  function renderAuthUsersAdmin(mainEl, opts = {}) {
    const users = loadAuthUsers();
    const rows = users.map(
      (u) => `<tr class="auth-user-row" data-auth-user-row="${escapeHtml(u.id)}">
        <td class="auth-user-row__avatar">${renderUserAvatarHtml(u, { size: 40, className: "user-avatar user-avatar--table" })}</td>
        <td><strong>${escapeHtml(u.displayName)}</strong><div class="form-hint">@${escapeHtml(u.username)} \xB7 <code>${escapeHtml(u.id)}</code></div></td>
        <td>${u.active ? `<span class="badge badge-listo">Activo</span>` : `<span class="badge badge-borrador">Inactivo</span>`}${isSystemAuthUser(u) ? ` <span class="badge badge-borrador">Sistema</span>` : ""}</td>
        <td><span class="catalog-muted">${escapeHtml(AUTH_PROVIDER_LOCAL)} (mock)</span>${canUserLogin(u) ? "" : `<div class="form-hint">Sin login</div>`}</td>
        <td class="auth-user-row__actions">
          <button type="button" class="btn btn-sm" data-auth-user-detail="${escapeHtml(u.id)}">Ver detalle</button>
        </td>
      </tr>`
    ).join("");
    mainEl.innerHTML = `
    <section class="panel panel--catalog">
      ${renderPageHeader(
      "Usuarios del sistema",
      "Cat\xE1logo mock para login. Abr\xED el detalle para ver avatar y datos completos. Sustituir por directorio corporativo o Supabase Auth en producci\xF3n."
    )}
      <div class="table-wrap table-wrap--modern">
        <table class="table-modern auth-users-table">
          <thead><tr><th></th><th>Usuario</th><th>Estado</th><th>Autenticaci\xF3n</th><th></th></tr></thead>
          <tbody>${rows || `<tr><td colspan="5" class="gestion-empty">No hay usuarios.</td></tr>`}</tbody>
        </table>
      </div>
      <p class="form-hint" style="margin-top:1rem">Clave de demo para todos: <code>1234</code></p>
    </section>`;
    mainEl.querySelector(".auth-users-table tbody")?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-auth-user-detail]");
      if (!btn) return;
      const userId = btn.getAttribute("data-auth-user-detail");
      if (userId) opts.onOpenUserDetail?.(userId);
    });
    bindAvatarImageFallback(mainEl);
  }
  function renderAuthUserDetailPage(mainEl, userId, onBack) {
    const user = getUserById(userId);
    if (!user) {
      mainEl.innerHTML = `
      <section class="panel">
        <p class="empty-state">No se encontr\xF3 el usuario.</p>
        <button type="button" class="btn btn-sm" data-user-detail-back>Volver al listado</button>
      </section>`;
      mainEl.querySelector("[data-user-detail-back]")?.addEventListener("click", onBack);
      return;
    }
    const session = getSession();
    const isSelf = session?.userId === user.id;
    renderUserDetailShell(mainEl, user, {
      title: isSelf ? "Detalle \u2014 tu cuenta" : "Detalle de usuario",
      subtitle: isSelf ? "Mismos datos del cat\xE1logo; la fila de sesi\xF3n aplica solo porque est\xE1s logueado como este usuario." : "Datos completos del registro mock en localStorage.",
      tableRowsHtml: renderUserFieldsTableRows(user, {
        includePasswordHint: true,
        session: isSelf ? session : null
      }),
      onBack
    });
  }
  function renderAuthHeaderChip(host, opts = {}) {
    if (!host) return;
    const profile = getCurrentUserProfile();
    if (!profile) {
      host.innerHTML = "";
      host.hidden = true;
      return;
    }
    const { session, user } = profile;
    host.hidden = false;
    host.innerHTML = `
    <div class="auth-header-chip">
      ${renderUserAvatarHtml(user, { size: 36, className: "user-avatar user-avatar--header" })}
      <div class="auth-header-chip__text">
        <span class="auth-header-chip__name">${escapeHtml(session.displayName)}</span>
        <span class="auth-header-chip__user">@${escapeHtml(session.username)}</span>
      </div>
      <button type="button" class="btn btn-sm" id="btn-auth-profile">Ver perfil</button>
      <button type="button" class="btn btn-sm btn-ghost" id="btn-auth-logout">Salir</button>
    </div>`;
    host.querySelector("#btn-auth-profile")?.addEventListener("click", () => {
      opts.onOpenProfile?.();
    });
    host.querySelector("#btn-auth-logout")?.addEventListener("click", () => {
      logout();
      toast("Sesi\xF3n cerrada.", 2200, "success");
      window.dispatchEvent(new CustomEvent("gestor:auth-changed"));
    });
    bindAvatarImageFallback(host);
  }
  function renderUserProfilePage(mainEl, onBack) {
    const profile = getCurrentUserProfile();
    if (!profile) {
      mainEl.innerHTML = `<section class="panel"><p class="empty-state">No hay sesi\xF3n activa.</p></section>`;
      return;
    }
    const { session, user } = profile;
    renderUserDetailShell(mainEl, user, {
      title: "Mi perfil",
      subtitle: "Datos de la cuenta en el mock local (integrable con directorio corporativo).",
      tableRowsHtml: renderUserFieldsTableRows(user, { includePasswordHint: true, session }),
      onBack
    });
  }
  function setAppShellAuthLocked(loggedIn) {
    const shell = document.getElementById("app-shell");
    const drawer = document.getElementById("nav-drawer");
    const toggle = document.getElementById("menu-toggle");
    const aiBtn = document.getElementById("btn-ai-config");
    shell?.classList.toggle("is-auth-locked", !loggedIn);
    if (drawer) {
      drawer.setAttribute("aria-hidden", loggedIn ? "false" : "true");
    }
    if (toggle) toggle.disabled = !loggedIn;
    if (aiBtn) aiBtn.disabled = !loggedIn;
  }

  // js/app.js
  var MOCK_BUNDLE_VERSION = "data-portability-1";
  function safeSyncMasterRecordsAbmNav(state) {
    try {
      syncMasterRecordsAbmNav(state);
    } catch (err) {
      console.warn("[mock] No se pudo sincronizar el men\xFA ABM maestros:", err);
    }
  }
  function showBootError(message) {
    const mainEl = document.getElementById("app-main");
    if (!mainEl) return;
    mainEl.innerHTML = `
    <section class="panel">
      <h2 class="panel-title">No se pudo iniciar el mock</h2>
      <p style="color:var(--danger)">${escapeHtml(message)}</p>
      <p style="font-size:0.9rem;color:var(--muted)">Pruebe abrir con un servidor local, por ejemplo: <code>python -m http.server 8765</code> en la carpeta <code>prototipo</code>.</p>
    </section>`;
  }
  try {
    let persist = function() {
      saveState(state);
      safeSyncMasterRecordsAbmNav(state);
    }, renderAppView = function() {
      if (!isAuthenticated()) {
        renderLoginScreen(mainEl, () => syncAuthAndRender());
        return;
      }
      if (currentView === "designer") renderDesigner(mainEl, state, persist);
      else if (currentView === "gestion") renderGestion(mainEl, state, persist);
      else if (currentView === "reporte") {
        currentView = "report-activities";
        renderReportView(mainEl, state, "report-activities");
      } else if (currentView.startsWith("report-")) {
        renderReportView(mainEl, state, currentView);
      } else if (currentView === "maestros") renderMaestros(mainEl, state, persist, currentMaster);
      else if (currentView === "auth-users") {
        authUserDetailId = null;
        renderAuthUsersAdmin(mainEl, {
          onOpenUserDetail: (userId) => {
            authUserDetailId = userId;
            currentView = "auth-user-detail";
            navApi.setNavActive("auth-user-detail", null, null);
            renderAppView();
          }
        });
      } else if (currentView === "auth-user-detail") {
        renderAuthUserDetailPage(mainEl, authUserDetailId ?? "", () => {
          currentView = "auth-users";
          renderAppView();
        });
      } else if (currentView === "user-profile") {
        renderUserProfilePage(mainEl, () => {
          currentView = "designer";
          enterDesignerCatalog("flows");
          renderAppView();
        });
      }
    }, openUserProfile = function() {
      if (!isAuthenticated()) return;
      currentView = "user-profile";
      renderAppView();
    }, syncAuthAndRender = function() {
      const loggedIn = isAuthenticated();
      setAppShellAuthLocked(loggedIn);
      renderAuthHeaderChip(document.getElementById("auth-header-slot"), {
        onOpenProfile: openUserProfile
      });
      renderAppView();
      safeSyncMasterRecordsAbmNav(state);
    };
    const mainEl = document.getElementById("app-main");
    if (!mainEl) {
      throw new Error("Falta el contenedor principal #app-main.");
    }
    logout();
    loadAuthUsers();
    let state = ensureSeed(loadState());
    console.info(`[mock] Bundle ${MOCK_BUNDLE_VERSION}`);
    let currentView = "designer";
    let currentMaster = "flowTypes";
    let authUserDetailId = null;
    let resizeTimer = null;
    window.addEventListener("resize", () => {
      if (!isAuthenticated()) return;
      if (resizeTimer) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        if (currentView === "designer") renderAppView();
      }, 150);
    });
    window.addEventListener("gestor:auth-changed", () => syncAuthAndRender());
    const navApi = bindNavDrawer((view, catalog, master) => {
      if (!isAuthenticated()) return;
      if (view === "gestion" && currentView !== "gestion") {
        enterGestionHub();
      }
      if (currentView === "gestion" && view !== "gestion") {
        enterGestionHub();
      }
      currentView = view;
      if (master) currentMaster = master;
      if (view === "designer" && catalog) {
        enterDesignerCatalog(catalog);
      }
      renderAppView();
    });
    window.addEventListener("gestor:nav-maestros", (event) => {
      if (!isAuthenticated()) return;
      const detail = event.detail ?? {};
      currentView = "maestros";
      if (detail.masterRecordDefId) {
        currentMaster = masterRecordAbmMasterKey(String(detail.masterRecordDefId));
      } else if (detail.master) {
        currentMaster = detail.master;
      }
      navApi.setNavActive("maestros", null, currentMaster);
      renderAppView();
    });
    document.getElementById("btn-ai-config")?.addEventListener("click", () => {
      if (!isAuthenticated()) return;
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
            opt.textContent = `${config.model} (Actual)`;
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
    syncAuthAndRender();
  } catch (err) {
    console.error(err);
    showBootError(err instanceof Error ? err.message : "Error desconocido.");
  }
})();
