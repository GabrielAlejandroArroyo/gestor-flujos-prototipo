import type { FlowInstance } from "@/lib/engine/flow-types";
import type { InstanceRow } from "@/lib/supabase/types";

export function instanceToRow(instance: FlowInstance, flowId: string): Omit<InstanceRow, "created_at" | "updated_at"> {
  return {
    id: instance.id,
    flow_id: flowId,
    status: instance.status,
    current_node_id: instance.currentNodeId,
    input_values: instance.inputValues,
    context: instance.context,
    flow_snapshot: instance.flowSnapshot as unknown as Record<string, unknown>,
    trace: instance.trace,
    steps: instance.steps,
    ai_hitl_status: instance.aiHitlStatus ?? null,
    ai_hitl_sent_at: instance.aiHitlSentAt ?? null,
    ai_hitl_reminders: instance.aiHitlReminders ?? 0,
    started_at: instance.startedAt,
    finished_at: instance.finishedAt,
  };
}

export function rowToInstance(row: InstanceRow): FlowInstance {
  const snapshot = row.flow_snapshot as unknown as FlowInstance["flowSnapshot"];
  return {
    id: row.id,
    flowId: row.flow_id,
    flowName: snapshot.name,
    flowSnapshot: snapshot,
    status: row.status,
    inputValues: row.input_values as Record<string, unknown>,
    context: row.context as Record<string, unknown>,
    currentNodeId: row.current_node_id,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    trace: row.trace as FlowInstance["trace"],
    steps: row.steps as FlowInstance["steps"],
    aiHitlStatus: row.ai_hitl_status ?? undefined,
    aiHitlSentAt: row.ai_hitl_sent_at ?? undefined,
    aiHitlReminders: row.ai_hitl_reminders,
  };
}
