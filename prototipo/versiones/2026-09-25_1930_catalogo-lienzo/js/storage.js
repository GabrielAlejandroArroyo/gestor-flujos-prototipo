const STORAGE_KEY = "gestor_flujos_prototipo_v1";

const emptyState = () => ({
  flows: [],
  instances: [],
});

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    return {
      flows: Array.isArray(parsed.flows) ? parsed.flows : [],
      instances: Array.isArray(parsed.instances) ? parsed.instances : [],
    };
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
