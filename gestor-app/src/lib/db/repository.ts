import type { FlowDefinition, FlowInstance } from "@/lib/engine/flow-types";
import { createSampleFlowDefinition } from "@/lib/engine/sample-flow";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { FlowRow, InstanceRow } from "@/lib/supabase/types";
import { instanceToRow, rowToInstance } from "./instance-mapper";
import {
  memoryGetFlowById,
  memoryGetInstance,
  memoryListInstances,
  memoryListReadyFlows,
  memorySaveInstance,
} from "./memory-store";

async function ensureSupabaseSeed(client: NonNullable<ReturnType<typeof createSupabaseServerClient>>): Promise<void> {
  const { count, error } = await client.from("flows").select("*", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  if ((count ?? 0) > 0) return;

  const def = createSampleFlowDefinition();
  const now = new Date().toISOString();
  const row: FlowRow = {
    id: def.id,
    name: def.name,
    type: def.type,
    description: def.description ?? null,
    status: def.status,
    definition: def as unknown as Record<string, unknown>,
    created_at: now,
    updated_at: now,
  };
  const { error: insertError } = await client.from("flows").insert(row);
  if (insertError) throw new Error(insertError.message);
}

export async function listReadyFlows(): Promise<FlowDefinition[]> {
  if (!isSupabaseConfigured()) return memoryListReadyFlows();

  const client = createSupabaseServerClient();
  if (!client) return memoryListReadyFlows();

  await ensureSupabaseSeed(client);
  const { data, error } = await client.from("flows").select("*").eq("status", "listo");
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as FlowRow[];
  return rows.map((row) => row.definition as unknown as FlowDefinition);
}

export async function getFlowById(flowId: string): Promise<FlowDefinition | null> {
  if (!isSupabaseConfigured()) return memoryGetFlowById(flowId);

  const client = createSupabaseServerClient();
  if (!client) return memoryGetFlowById(flowId);

  await ensureSupabaseSeed(client);
  const { data, error } = await client.from("flows").select("*").eq("id", flowId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return (data as FlowRow).definition as unknown as FlowDefinition;
}

export async function getInstance(instanceId: string): Promise<FlowInstance | null> {
  if (!isSupabaseConfigured()) return memoryGetInstance(instanceId);

  const client = createSupabaseServerClient();
  if (!client) return memoryGetInstance(instanceId);

  const { data, error } = await client.from("instances").select("*").eq("id", instanceId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return rowToInstance(data as InstanceRow);
}

export async function listInstances(status?: string): Promise<FlowInstance[]> {
  if (!isSupabaseConfigured()) return memoryListInstances(status);

  const client = createSupabaseServerClient();
  if (!client) return memoryListInstances(status);

  let query = client.from("instances").select("*").order("started_at", { ascending: false });
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return ((data ?? []) as InstanceRow[]).map(rowToInstance);
}

export async function saveInstance(instance: FlowInstance): Promise<FlowInstance> {
  if (!isSupabaseConfigured()) return memorySaveInstance(instance);

  const client = createSupabaseServerClient();
  if (!client) return memorySaveInstance(instance);

  const row = instanceToRow(instance, instance.flowId);
  const now = new Date().toISOString();
  const payload = { ...row, updated_at: now };

  const { data: existing } = await client.from("instances").select("id").eq("id", instance.id).maybeSingle();

  if (existing) {
    const { error } = await client.from("instances").update(payload).eq("id", instance.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await client.from("instances").insert({ ...payload, created_at: now });
    if (error) throw new Error(error.message);
  }

  return instance;
}
