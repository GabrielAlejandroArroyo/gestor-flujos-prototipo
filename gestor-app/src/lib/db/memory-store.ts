import type { FlowDefinition, FlowInstance } from "@/lib/engine/flow-types";
import { getMemoryState } from "./memory-full-state";
import { instanceToRow, rowToInstance } from "./instance-mapper";

export function memoryListReadyFlows(): FlowDefinition[] {
  return getMemoryState()
    .flows.filter((f) => f.status === "listo")
    .map((f) => ({ ...f }));
}

export function memoryGetFlowById(flowId: string): FlowDefinition | null {
  const flow = getMemoryState().flows.find((f) => f.id === flowId);
  return flow ? { ...flow } : null;
}

export function memorySaveInstance(instance: FlowInstance): FlowInstance {
  const state = getMemoryState();
  const clone = structuredClone(instance);
  const idx = state.instances.findIndex((i) => i.id === instance.id);
  if (idx >= 0) state.instances[idx] = clone;
  else state.instances.push(clone);
  return clone;
}

export function memoryGetInstance(instanceId: string): FlowInstance | null {
  const inst = getMemoryState().instances.find((i) => i.id === instanceId);
  return inst ? structuredClone(inst) : null;
}

export function memoryListInstances(status?: string): FlowInstance[] {
  let all = getMemoryState().instances.map((i) => structuredClone(i));
  if (status) all = all.filter((i) => i.status === status);
  return all.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export function memoryResetStore(): void {
  const g = globalThis as typeof globalThis & { __gestorMockState?: unknown };
  delete g.__gestorMockState;
}

export { instanceToRow, rowToInstance };
