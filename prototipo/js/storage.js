import { normalizeFlowTransitions } from "./validation.js";
import { normalizeFlowContracts } from "./contracts.js";

const STORAGE_KEY = "gestor_flujos_prototipo_v3";
const LEGACY_STORAGE_KEY = "gestor_flujos_prototipo_v2";

const emptyState = () => ({
  flows: [],
  instances: [],
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

export function getFlowById(state, flowId) {
  return state.flows.find((f) => f.id === flowId) ?? null;
}

export function getInstanceById(state, instanceId) {
  return state.instances.find((i) => i.id === instanceId) ?? null;
}
