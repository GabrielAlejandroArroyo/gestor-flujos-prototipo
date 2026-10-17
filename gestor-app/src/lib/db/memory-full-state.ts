/**
 * Estado en memoria del mock completo (fallback sin Supabase).
 */
import type { FlowDefinition, FlowInstance } from "@/lib/engine/flow-types";
import type { AppUserRow, EntityRow, FlowTypeRow, MasterAuditRow, MasterDefinitionRow, MasterRecordRow } from "@/lib/supabase/types";
import type { MockFlowDefinition } from "./flow-mapper";
import { flowToRow, rowToFlowDefinition } from "./flow-mapper";
import type { FlowRow } from "@/lib/supabase/types";
import { createSampleFlowDefinition } from "@/lib/engine/sample-flow";

export interface MockAppState {
  flows: MockFlowDefinition[];
  instances: FlowInstance[];
  flowTypes: FlowTypeRow[];
  entities: EntityRow[];
  masterDefinitions: MasterDefinitionRow[];
  masterRecords: MasterRecordRow[];
  masterAudit: MasterAuditRow[];
  appUsers: AppUserRow[];
}

const g = globalThis as typeof globalThis & { __gestorMockState?: MockAppState };

function now(): string {
  return new Date().toISOString();
}

function seed(): MockAppState {
  const def = createSampleFlowDefinition() as MockFlowDefinition;
  const ts = now();
  return {
    flows: [def],
    instances: [],
    flowTypes: [],
    entities: [],
    masterDefinitions: [],
    masterRecords: [],
    masterAudit: [],
    appUsers: [
      {
        id: "user_demo",
        username: "luna",
        display_name: "Luna Rivera",
        password: "1234",
        active: true,
        avatar_seed: "luna",
        is_system: false,
        login_allowed: true,
        created_at: ts,
        updated_at: ts,
      },
    ],
  };
}

export function getMemoryState(): MockAppState {
  if (!g.__gestorMockState) g.__gestorMockState = seed();
  return g.__gestorMockState;
}

export function replaceMemoryState(state: MockAppState): void {
  g.__gestorMockState = state;
}

export function memoryFlowRows(): FlowRow[] {
  const ts = now();
  return getMemoryState().flows.map((f) => {
    const row = flowToRow(f, ts);
    return { ...row, created_at: row.created_at ?? ts, updated_at: row.updated_at ?? ts };
  });
}

export function memoryUpsertFlow(flow: MockFlowDefinition): MockFlowDefinition {
  const state = getMemoryState();
  const idx = state.flows.findIndex((f) => f.id === flow.id);
  if (idx >= 0) state.flows[idx] = flow;
  else state.flows.push(flow);
  return flow;
}

export function memoryDeleteFlow(flowId: string): void {
  getMemoryState().flows = getMemoryState().flows.filter((f) => f.id !== flowId);
}

export function memoryListFlowDefinitions(filter?: {
  status?: string;
  q?: string;
  flowTypeId?: string;
}): MockFlowDefinition[] {
  let list = getMemoryState().flows;
  if (filter?.status) list = list.filter((f) => f.status === filter.status);
  if (filter?.flowTypeId) {
    list = list.filter(
      (f) => f.flowTypeId === filter.flowTypeId || f.type === filter.flowTypeId,
    );
  }
  const q = filter?.q?.trim().toLocaleLowerCase("es");
  if (q) {
    list = list.filter((f) => {
      const blob = `${f.name} ${f.type} ${f.description ?? ""}`.toLocaleLowerCase("es");
      return q.split(/\s+/).every((t) => blob.includes(t));
    });
  }
  return list.map((f) => ({ ...f }));
}

export function memoryGetFlowDefinition(flowId: string): MockFlowDefinition | null {
  return getMemoryState().flows.find((f) => f.id === flowId) ?? null;
}
