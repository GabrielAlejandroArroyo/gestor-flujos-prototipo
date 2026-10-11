import { normalizeFlowTransitions } from "./validation.js";
import { migrateLegacyFlowInputToStart, normalizeFlowContracts } from "./contracts.js";
import { ensureFlowTypesState } from "./flow-types.js";
import { ensureEntitiesState } from "./entities.js";
import { ensureMasterAuditLog } from "./master-audit.js";
import { ensureMasterDefinitionsState } from "./master-definitions.js";
import { ensureMasterRecordsState } from "./master-records.js";
import { normalizeFlowMeta } from "./flow-lifecycle.js";

const STORAGE_KEY = "gestor_flujos_prototipo_v3";
const LEGACY_STORAGE_KEY = "gestor_flujos_prototipo_v2";

const emptyState = () => ({
  flows: [],
  instances: [],
  flowTypes: [],
  entities: [],
  masterAuditLog: [],
  masterDefinitions: [],
  masterRecords: [],
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
    masterRecords: Array.isArray(parsed.masterRecords) ? parsed.masterRecords : [],
  };
  const withMasters = ensureMasterDefinitionsState(ensureEntitiesState(ensureFlowTypesState(base)));
  return ensureMasterAuditLog(ensureMasterRecordsState(withMasters));
}

export function loadState() {
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

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const AI_CONFIG_KEY = "gestor_flujos_ai_config";

export function loadAiConfig() {
  try {
    const raw = localStorage.getItem(AI_CONFIG_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("Error cargando config IA", e);
  }
  return { provider: "openai", apiKey: "", model: "gpt-4o" };
}

export function saveAiConfig(config) {
  localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(config));
}

export function getFlowById(state, flowId) {
  return state.flows.find((f) => f.id === flowId) ?? null;
}

export function getInstanceById(state, instanceId) {
  return state.instances.find((i) => i.id === instanceId) ?? null;
}
