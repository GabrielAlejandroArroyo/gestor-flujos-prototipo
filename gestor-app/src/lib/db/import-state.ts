import type { MockAppState } from "./memory-full-state";
import { replaceMemoryState } from "./memory-full-state";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { MockFlowDefinition } from "./flow-mapper";
import { flowToRow } from "./flow-mapper";
import { instanceToRow } from "./instance-mapper";

async function upsertTable(
  client: NonNullable<ReturnType<typeof createSupabaseServerClient>>,
  table: string,
  rows: Record<string, unknown>[],
): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await client.from(table).upsert(rows, { onConflict: "id" });
  if (error) throw new Error(`${table}: ${error.message}`);
}

/**
 * Importa el estado completo del mock a memoria o Supabase.
 */
export async function importAppState(state: MockAppState): Promise<void> {
  if (!isSupabaseConfigured()) {
    replaceMemoryState(state);
    return;
  }

  const client = createSupabaseServerClient();
  if (!client) {
    replaceMemoryState(state);
    return;
  }

  const now = new Date().toISOString();

  await upsertTable(
    client,
    "flow_types",
    state.flowTypes.map((r) => ({ ...r, updated_at: now })),
  );
  await upsertTable(
    client,
    "entities",
    state.entities.map((r) => ({ ...r, updated_at: now })),
  );
  await upsertTable(
    client,
    "master_definitions",
    state.masterDefinitions.map((r) => ({ ...r, updated_at: now })),
  );
  await upsertTable(
    client,
    "master_records",
    state.masterRecords.map((r) => ({ ...r, updated_at: now })),
  );
  await upsertTable(
    client,
    "master_audit",
    state.masterAudit.map((r) => ({ ...r, created_at: r.created_at ?? now })),
  );
  await upsertTable(
    client,
    "app_users",
    state.appUsers.map((r) => ({ ...r, updated_at: now })),
  );

  const flowRows = state.flows.map((f) => {
    const row = flowToRow(f as MockFlowDefinition, now);
    return { ...row, created_at: row.created_at ?? now, updated_at: now };
  });
  await upsertTable(client, "flows", flowRows);

  const instanceRows = state.instances.map((inst) => {
    const row = instanceToRow(inst, inst.flowId);
    return { ...row, created_at: now, updated_at: now };
  });
  await upsertTable(client, "instances", instanceRows);

  replaceMemoryState(state);
}
