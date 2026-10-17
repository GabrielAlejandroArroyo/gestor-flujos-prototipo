import type { FlowDefinition, FlowInstance } from "@/lib/engine/flow-types";
import { createSampleFlowDefinition } from "@/lib/engine/sample-flow";
import { createVersionDraft, publishFlow } from "@/lib/flow-lifecycle";
import { validateFlow } from "@/lib/flow-validation";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type {
  AppUserRow,
  EntityRow,
  FlowRow,
  FlowTypeRow,
  InstanceRow,
  MasterAuditRow,
  MasterDefinitionRow,
  MasterRecordRow,
} from "@/lib/supabase/types";
import { flowToRow, rowToFlowDefinition, type MockFlowDefinition } from "./flow-mapper";
import { getMemoryState } from "./memory-full-state";
import { instanceToRow, rowToInstance } from "./instance-mapper";
import {
  memoryGetFlowById,
  memoryGetInstance,
  memoryListInstances,
  memoryListReadyFlows,
  memorySaveInstance,
} from "./memory-store";

export interface FlowListFilter {
  status?: string;
  q?: string;
  flowTypeId?: string;
  readyOnly?: boolean;
}

async function ensureSupabaseSeed(
  client: NonNullable<ReturnType<typeof createSupabaseServerClient>>,
): Promise<void> {
  const { count, error } = await client.from("flows").select("*", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  if ((count ?? 0) > 0) return;

  const def = createSampleFlowDefinition() as MockFlowDefinition;
  const now = new Date().toISOString();
  const row = flowToRow(def, now);
  const { error: insertError } = await client.from("flows").insert({
    ...row,
    created_at: now,
    updated_at: now,
  });
  if (insertError) throw new Error(insertError.message);
}

function filterFlowsInMemory(filter?: FlowListFilter): MockFlowDefinition[] {
  let list = getMemoryState().flows.map((f) => ({ ...f }));
  if (filter?.readyOnly) list = list.filter((f) => f.status === "listo");
  else if (filter?.status) list = list.filter((f) => f.status === filter.status);
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
  return list;
}

export async function listFlows(filter?: FlowListFilter): Promise<MockFlowDefinition[]> {
  if (!isSupabaseConfigured()) return filterFlowsInMemory(filter);

  const client = createSupabaseServerClient();
  if (!client) return filterFlowsInMemory(filter);

  await ensureSupabaseSeed(client);
  let query = client.from("flows").select("*");
  if (filter?.readyOnly || filter?.status === "listo") query = query.eq("status", "listo");
  else if (filter?.status) query = query.eq("status", filter.status);
  if (filter?.flowTypeId) query = query.eq("flow_type_id", filter.flowTypeId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  let rows = ((data ?? []) as FlowRow[]).map(rowToFlowDefinition);
  if (filter?.q?.trim()) {
    const q = filter.q.trim().toLocaleLowerCase("es");
    rows = rows.filter((f) => {
      const blob = `${f.name} ${f.type} ${f.description ?? ""}`.toLocaleLowerCase("es");
      return q.split(/\s+/).every((t) => blob.includes(t));
    });
  }
  return rows;
}

export async function listReadyFlows(): Promise<FlowDefinition[]> {
  return listFlows({ readyOnly: true });
}

export async function getFlowById(flowId: string): Promise<FlowDefinition | null> {
  if (!isSupabaseConfigured()) return memoryGetFlowById(flowId);

  const client = createSupabaseServerClient();
  if (!client) return memoryGetFlowById(flowId);

  await ensureSupabaseSeed(client);
  const { data, error } = await client.from("flows").select("*").eq("id", flowId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return rowToFlowDefinition(data as FlowRow);
}

export async function saveFlow(flow: MockFlowDefinition): Promise<MockFlowDefinition> {
  const now = new Date().toISOString();
  const row = flowToRow(flow, now);

  if (!isSupabaseConfigured()) {
    const state = getMemoryState();
    const idx = state.flows.findIndex((f) => f.id === flow.id);
    if (idx >= 0) state.flows[idx] = flow;
    else state.flows.push(flow);
    return flow;
  }

  const client = createSupabaseServerClient();
  if (!client) {
    getMemoryState().flows.push(flow);
    return flow;
  }

  const payload = { ...row, updated_at: now };
  const { data: existing } = await client.from("flows").select("id").eq("id", flow.id).maybeSingle();
  if (existing) {
    const { error } = await client.from("flows").update(payload).eq("id", flow.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await client.from("flows").insert({ ...payload, created_at: now });
    if (error) throw new Error(error.message);
  }

  const state = getMemoryState();
  const idx = state.flows.findIndex((f) => f.id === flow.id);
  if (idx >= 0) state.flows[idx] = flow;
  else state.flows.push(flow);
  return flow;
}

export async function deleteFlow(flowId: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    getMemoryState().flows = getMemoryState().flows.filter((f) => f.id !== flowId);
    return;
  }
  const client = createSupabaseServerClient();
  if (!client) {
    getMemoryState().flows = getMemoryState().flows.filter((f) => f.id !== flowId);
    return;
  }
  const { error } = await client.from("flows").delete().eq("id", flowId);
  if (error) throw new Error(error.message);
  getMemoryState().flows = getMemoryState().flows.filter((f) => f.id !== flowId);
}

export async function activateFlow(flowId: string): Promise<{ ok: boolean; error?: string }> {
  const flows = await listFlows();
  const flow = flows.find((f) => f.id === flowId);
  if (!flow) return { ok: false, error: "Flujo no encontrado." };
  const validation = validateFlow(flow);
  if (!validation.isValid) {
    return { ok: false, error: validation.errors[0] ?? "Flujo inválido." };
  }
  const result = publishFlow(flows, flowId);
  if (!result.ok) return result;
  for (const f of flows) {
    if (f.lineageId === flow.lineageId || f.id === flow.id) await saveFlow(f);
  }
  return { ok: true };
}

export async function versionFlow(sourceFlowId: string): Promise<{ flow?: MockFlowDefinition; error?: string }> {
  const flows = await listFlows();
  const { flow, error } = createVersionDraft(flows, sourceFlowId);
  if (error || !flow) return { error: error ?? "No se pudo versionar." };
  await saveFlow(flow);
  return { flow };
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

  memorySaveInstance(instance);
  return instance;
}

async function listGenericTable<T>(
  table: string,
  memoryPick: () => T[],
): Promise<T[]> {
  if (!isSupabaseConfigured()) return memoryPick();
  const client = createSupabaseServerClient();
  if (!client) return memoryPick();
  const { data, error } = await client.from(table).select("*");
  if (error) throw new Error(error.message);
  return (data ?? []) as T[];
}

export async function listFlowTypes(): Promise<FlowTypeRow[]> {
  return listGenericTable("flow_types", () => getMemoryState().flowTypes);
}

export async function saveFlowType(row: FlowTypeRow): Promise<FlowTypeRow> {
  const now = new Date().toISOString();
  const payload = { ...row, updated_at: now };
  if (isSupabaseConfigured()) {
    const client = createSupabaseServerClient();
    if (client) {
      const { error } = await client.from("flow_types").upsert({ ...payload, created_at: row.created_at ?? now });
      if (error) throw new Error(error.message);
    }
  }
  const state = getMemoryState();
  const idx = state.flowTypes.findIndex((f) => f.id === row.id);
  if (idx >= 0) state.flowTypes[idx] = payload;
  else state.flowTypes.push({ ...payload, created_at: row.created_at ?? now });
  return payload as FlowTypeRow;
}

export async function deleteFlowType(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const client = createSupabaseServerClient();
    if (client) {
      const { error } = await client.from("flow_types").delete().eq("id", id);
      if (error) throw new Error(error.message);
    }
  }
  getMemoryState().flowTypes = getMemoryState().flowTypes.filter((f) => f.id !== id);
}

export async function listEntities(): Promise<EntityRow[]> {
  return listGenericTable("entities", () => getMemoryState().entities);
}

export async function saveEntity(row: EntityRow): Promise<EntityRow> {
  const now = new Date().toISOString();
  const payload = { ...row, updated_at: now };
  if (isSupabaseConfigured()) {
    const client = createSupabaseServerClient();
    if (client) {
      const { error } = await client.from("entities").upsert({ ...payload, created_at: row.created_at ?? now });
      if (error) throw new Error(error.message);
    }
  }
  const state = getMemoryState();
  const idx = state.entities.findIndex((e) => e.id === row.id);
  if (idx >= 0) state.entities[idx] = payload;
  else state.entities.push({ ...payload, created_at: row.created_at ?? now });
  return payload;
}

export async function deleteEntity(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const client = createSupabaseServerClient();
    if (client) {
      const { error } = await client.from("entities").delete().eq("id", id);
      if (error) throw new Error(error.message);
    }
  }
  getMemoryState().entities = getMemoryState().entities.filter((e) => e.id !== id);
}

export async function listMasterDefinitions(): Promise<MasterDefinitionRow[]> {
  return listGenericTable("master_definitions", () => getMemoryState().masterDefinitions);
}

export async function saveMasterDefinition(row: MasterDefinitionRow): Promise<MasterDefinitionRow> {
  const now = new Date().toISOString();
  const payload = { ...row, updated_at: now };
  if (isSupabaseConfigured()) {
    const client = createSupabaseServerClient();
    if (client) {
      const { error } = await client
        .from("master_definitions")
        .upsert({ ...payload, created_at: row.created_at ?? now });
      if (error) throw new Error(error.message);
    }
  }
  const state = getMemoryState();
  const idx = state.masterDefinitions.findIndex((d) => d.id === row.id);
  if (idx >= 0) state.masterDefinitions[idx] = payload;
  else state.masterDefinitions.push({ ...payload, created_at: row.created_at ?? now });
  return payload;
}

export async function deleteMasterDefinition(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const client = createSupabaseServerClient();
    if (client) {
      const { error } = await client.from("master_definitions").delete().eq("id", id);
      if (error) throw new Error(error.message);
    }
  }
  getMemoryState().masterDefinitions = getMemoryState().masterDefinitions.filter((d) => d.id !== id);
}

export async function listMasterRecords(definitionId?: string): Promise<MasterRecordRow[]> {
  const all = await listGenericTable("master_records", () => getMemoryState().masterRecords);
  if (!definitionId) return all;
  return all.filter((r) => r.definition_id === definitionId);
}

export async function saveMasterRecord(row: MasterRecordRow): Promise<MasterRecordRow> {
  const now = new Date().toISOString();
  const payload = { ...row, updated_at: now };
  if (isSupabaseConfigured()) {
    const client = createSupabaseServerClient();
    if (client) {
      const { error } = await client
        .from("master_records")
        .upsert({ ...payload, created_at: row.created_at ?? now });
      if (error) throw new Error(error.message);
    }
  }
  const state = getMemoryState();
  const idx = state.masterRecords.findIndex((r) => r.id === row.id);
  if (idx >= 0) state.masterRecords[idx] = payload;
  else state.masterRecords.push({ ...payload, created_at: row.created_at ?? now });
  return payload;
}

export async function deleteMasterRecord(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const client = createSupabaseServerClient();
    if (client) {
      const { error } = await client.from("master_records").delete().eq("id", id);
      if (error) throw new Error(error.message);
    }
  }
  getMemoryState().masterRecords = getMemoryState().masterRecords.filter((r) => r.id !== id);
}

export async function listMasterAudit(limit = 200): Promise<MasterAuditRow[]> {
  if (!isSupabaseConfigured()) {
    return getMemoryState().masterAudit.slice(0, limit);
  }
  const client = createSupabaseServerClient();
  if (!client) return getMemoryState().masterAudit.slice(0, limit);
  const { data, error } = await client
    .from("master_audit")
    .select("*")
    .order("at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as MasterAuditRow[];
}

export async function appendMasterAudit(entry: MasterAuditRow): Promise<void> {
  if (isSupabaseConfigured()) {
    const client = createSupabaseServerClient();
    if (client) {
      const { error } = await client.from("master_audit").insert(entry);
      if (error) throw new Error(error.message);
    }
  }
  getMemoryState().masterAudit.unshift(entry);
}

export async function listAppUsers(): Promise<AppUserRow[]> {
  return listGenericTable("app_users", () => getMemoryState().appUsers);
}

export async function findAppUserByUsername(username: string): Promise<AppUserRow | null> {
  const users = await listAppUsers();
  const key = username.trim().toLocaleLowerCase("es");
  return users.find((u) => u.username.toLocaleLowerCase("es") === key) ?? null;
}

export async function saveAppUser(row: AppUserRow): Promise<AppUserRow> {
  const now = new Date().toISOString();
  const payload = { ...row, updated_at: now };
  if (isSupabaseConfigured()) {
    const client = createSupabaseServerClient();
    if (client) {
      const { error } = await client.from("app_users").upsert({ ...payload, created_at: row.created_at ?? now });
      if (error) throw new Error(error.message);
    }
  }
  const state = getMemoryState();
  const idx = state.appUsers.findIndex((u) => u.id === row.id);
  if (idx >= 0) state.appUsers[idx] = payload;
  else state.appUsers.push({ ...payload, created_at: row.created_at ?? now });
  return payload;
}

export function getAppStateSnapshot() {
  return getMemoryState();
}
