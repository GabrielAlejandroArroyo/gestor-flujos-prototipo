import { createSampleFlowDefinition } from "@/lib/engine/sample-flow";
import type { FlowDefinition, FlowInstance } from "@/lib/engine/flow-types";
import type { FlowRow } from "@/lib/supabase/types";
import { instanceToRow, rowToInstance } from "./instance-mapper";

const flows = new Map<string, FlowRow>();
const instances = new Map<string, FlowInstance>();

function seedIfEmpty(): void {
  if (flows.size > 0) return;
  const def = createSampleFlowDefinition();
  const now = new Date().toISOString();
  flows.set(def.id, {
    id: def.id,
    name: def.name,
    type: def.type,
    description: def.description ?? null,
    status: def.status,
    definition: def as unknown as Record<string, unknown>,
    created_at: now,
    updated_at: now,
  });
}

export function memoryListReadyFlows(): FlowDefinition[] {
  seedIfEmpty();
  return [...flows.values()]
    .filter((f) => f.status === "listo")
    .map((f) => f.definition as unknown as FlowDefinition);
}

export function memoryGetFlowById(flowId: string): FlowDefinition | null {
  seedIfEmpty();
  const row = flows.get(flowId);
  if (!row) return null;
  return row.definition as unknown as FlowDefinition;
}

export function memorySaveInstance(instance: FlowInstance): FlowInstance {
  instances.set(instance.id, structuredClone(instance));
  return instance;
}

export function memoryGetInstance(instanceId: string): FlowInstance | null {
  const inst = instances.get(instanceId);
  return inst ? structuredClone(inst) : null;
}

export function memoryListInstances(status?: string): FlowInstance[] {
  const all = [...instances.values()].map((i) => structuredClone(i));
  if (!status) return all;
  return all.filter((i) => i.status === status);
}

export function memoryInstanceToPersist(instance: FlowInstance): void {
  memorySaveInstance(instance);
}

/** Export para tests / depuración */
export function memoryResetStore(): void {
  flows.clear();
  instances.clear();
}

export { instanceToRow, rowToInstance };
