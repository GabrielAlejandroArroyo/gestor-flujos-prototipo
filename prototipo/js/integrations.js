/**
 * Catálogo de adaptadores para Service Task (REST funcional en mock; resto simulado).
 */

import { createId } from "./ids.js";
import { redactSecrets } from "./contracts.js";

export const ADAPTER_KINDS = {
  SIMULATION: "simulation",
  REST_JSON: "rest_json",
  SOAP_XML: "soap_xml",
  GRAPHQL: "graphql",
  CONNECTOR: "connector",
};

/** @type {{ id: string; label: string; execution: 'mock' | 'mock_or_live' }[]} */
export const ADAPTER_CATALOG = [
  { id: ADAPTER_KINDS.SIMULATION, label: "Simulación (sin API)", execution: "mock" },
  { id: ADAPTER_KINDS.REST_JSON, label: "REST / JSON", execution: "mock_or_live" },
  { id: ADAPTER_KINDS.SOAP_XML, label: "SOAP / XML", execution: "mock" },
  { id: ADAPTER_KINDS.GRAPHQL, label: "GraphQL", execution: "mock" },
  { id: ADAPTER_KINDS.CONNECTOR, label: "Conector de sistema", execution: "mock" },
];

/**
 * @param {string} [kind]
 */
export function defaultIntegration(kind = ADAPTER_KINDS.SIMULATION) {
  const base = {
    adapter: kind,
    executionMode: "mock",
    onError: "fail_instance",
    retries: 0,
    timeoutMs: 15000,
    credentialRef: "",
    requestMappings: [],
    responseMappings: [],
  };
  if (kind === ADAPTER_KINDS.REST_JSON) {
    return {
      ...base,
      method: "POST",
      urlTemplate: "https://api.ejemplo.local/registrar",
      headers: { "Content-Type": "application/json" },
      bodyTemplate: "{}",
    };
  }
  if (kind === ADAPTER_KINDS.SOAP_XML) {
    return {
      ...base,
      endpoint: "https://legacy.ejemplo.local/soap",
      soapAction: "Registrar",
      bodyTemplate: "<Envelope></Envelope>",
      responsePath: "//id",
    };
  }
  if (kind === ADAPTER_KINDS.GRAPHQL) {
    return {
      ...base,
      endpoint: "https://api.ejemplo.local/graphql",
      query: "mutation Registrar($input: Input!) { registrar(input: $input) { id estado } }",
      variablesTemplate: "{}",
      responsePath: "data.registrar",
    };
  }
  if (kind === ADAPTER_KINDS.CONNECTOR) {
    return {
      ...base,
      connectorId: "erp_generico",
      operation: "registrarGasto",
      fields: {},
    };
  }
  return base;
}

/**
 * @param {object} integration
 * @param {Record<string, unknown>} inputs
 */
export function buildRestBody(integration, inputs) {
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

/**
 * @param {object} node
 * @param {Record<string, unknown>} inputs
 * @param {{ executionMode?: string }} [options]
 */
export async function executeIntegration(node, inputs, options = {}) {
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
      mapped: { integrationStatus: "simulated" },
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
          headers: { ...(integration.headers ?? {}), "Content-Type": "application/json" },
          body: method === "GET" ? undefined : JSON.stringify(body),
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
          httpStatus: res.status,
        };
      } catch (err) {
        return {
          ok: false,
          durationMs: Date.now() - started,
          request: redactSecrets(request),
          response: { error: String(err?.message ?? err) },
          mapped: {},
        };
      }
    }

    const mockResponse = integration.mockResponse ?? {
      registroId: createId("reg"),
      estado: "OK",
      echo: body,
    };
    return {
      ok: true,
      durationMs: Date.now() - started,
      request: redactSecrets(request),
      response: redactSecrets(mockResponse),
      mapped: mapResponse(integration, mockResponse),
      simulated: true,
    };
  }

  const mockResponse = getSimulatedResponse(adapter, integration, inputs);
  return {
    ok: true,
    durationMs: Date.now() - started,
    request: redactSecrets({ adapter, inputs }),
    response: redactSecrets(mockResponse),
    mapped: mapResponse(integration, mockResponse),
    simulated: true,
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
    } else if (m.sourceKey && response?.[m.sourceKey] !== undefined) {
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
    if (cur == null) return undefined;
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
      status: "OK",
    };
  }
  return { status: "OK" };
}

function isFileProtocol() {
  return typeof window !== "undefined" && window.location?.protocol === "file:";
}

/**
 * @param {object} node
 * @returns {string[]}
 */
export function validateNodeIntegration(node) {
  const errors = [];
  if (node.kind !== "automatica") return errors;
  const i = node.integration;
  if (!i || i.adapter === ADAPTER_KINDS.SIMULATION) return errors;
  if (i.adapter === ADAPTER_KINDS.REST_JSON && !i.urlTemplate?.trim()) {
    errors.push(`Service Task «${node.name}»: URL REST requerida.`);
  }
  return errors;
}
