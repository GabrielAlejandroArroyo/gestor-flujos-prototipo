import type { FlowDefinition } from "@/lib/engine/flow-types";
import type { FlowRow } from "@/lib/supabase/types";

/** Definición BPMN extendida (compatible con mock). */
export type MockFlowDefinition = FlowDefinition;

export function rowToFlowDefinition(row: FlowRow): MockFlowDefinition {
  const def = row.definition as unknown as MockFlowDefinition;
  return {
    ...def,
    id: row.id,
    name: row.name,
    type: row.type,
    description: row.description ?? def.description,
    status: row.status,
    lineageId: row.lineage_id ?? def.lineageId,
    version: row.version ?? def.version ?? null,
    supersedesFlowId: row.supersedes_flow_id ?? def.supersedesFlowId ?? null,
    flowTypeId: row.flow_type_id ?? def.flowTypeId ?? null,
  };
}

export function flowToRow(flow: MockFlowDefinition, now?: string): Omit<FlowRow, "created_at" | "updated_at"> & { created_at?: string; updated_at?: string } {
  const ts = now ?? new Date().toISOString();
  const lineageId = flow.lineageId ?? flow.id;
  return {
    id: flow.id,
    name: flow.name,
    type: flow.type,
    description: flow.description ?? null,
    status: flow.status,
    definition: flow as unknown as Record<string, unknown>,
    lineage_id: lineageId,
    version: flow.version ?? null,
    supersedes_flow_id: flow.supersedesFlowId ?? null,
    flow_type_id: flow.flowTypeId ?? null,
    created_at: ts,
    updated_at: ts,
  };
}
