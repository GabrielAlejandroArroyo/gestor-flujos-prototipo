/**
 * Import único: testing-bootstrap.json → Supabase (service role).
 *
 * Uso (desde gestor-app/):
 *   set NEXT_PUBLIC_SUPABASE_URL=...
 *   set SUPABASE_SERVICE_ROLE_KEY=...
 *   node scripts/import-mock-to-supabase.mjs
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const client = createClient(url, key, { auth: { persistSession: false } });

function flowToRow(flow, now) {
  return {
    id: flow.id,
    name: flow.name,
    type: flow.type,
    description: flow.description ?? null,
    status: flow.status,
    definition: flow,
    lineage_id: flow.lineageId ?? flow.id,
    version: flow.version ?? null,
    supersedes_flow_id: flow.supersedesFlowId ?? null,
    flow_type_id: flow.flowTypeId ?? null,
    created_at: now,
    updated_at: now,
  };
}

function instanceToRow(instance, now) {
  return {
    id: instance.id,
    flow_id: instance.flowId,
    status: instance.status,
    current_node_id: instance.currentNodeId,
    input_values: instance.inputValues ?? {},
    context: instance.context ?? {},
    flow_snapshot: instance.flowSnapshot,
    trace: instance.trace ?? [],
    steps: instance.steps ?? [],
    ai_hitl_status: instance.aiHitlStatus ?? null,
    ai_hitl_sent_at: instance.aiHitlSentAt ?? null,
    ai_hitl_reminders: instance.aiHitlReminders ?? 0,
    started_at: instance.startedAt,
    finished_at: instance.finishedAt,
    created_at: now,
    updated_at: now,
  };
}

async function upsert(table, rows) {
  if (!rows.length) return;
  const { error } = await client.from(table).upsert(rows, { onConflict: "id" });
  if (error) throw new Error(`${table}: ${error.message}`);
}

async function main() {
  const bootstrapPath = path.join(
    __dirname,
    "..",
    "..",
    "prototipo",
    "data",
    "environments",
    "testing-bootstrap.json",
  );
  const raw = await readFile(bootstrapPath, "utf8");
  const bootstrap = JSON.parse(raw);
  const main = JSON.parse(bootstrap.entries.gestor_flujos_prototipo_v3);
  const auth = JSON.parse(bootstrap.entries.gestor_flujos_auth_users_v1);
  const now = new Date().toISOString();

  await upsert(
    "flow_types",
    (main.flowTypes ?? []).map((ft) => ({
      id: ft.id,
      name: ft.name,
      description: ft.description ?? null,
      created_at: now,
      updated_at: now,
    })),
  );
  await upsert(
    "entities",
    (main.entities ?? []).map((e) => ({
      id: e.id,
      payload: e,
      created_at: now,
      updated_at: now,
    })),
  );
  await upsert(
    "master_definitions",
    (main.masterDefinitions ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description ?? null,
      entity_ids: d.entityIds ?? [],
      created_at: now,
      updated_at: now,
    })),
  );
  await upsert(
    "master_records",
    (main.masterRecords ?? []).map((r) => ({
      id: r.id,
      definition_id: r.definitionId,
      lineage_id: r.lineageId ?? r.id,
      status: r.status ?? "vigente",
      version: r.version ?? null,
      values: r.values ?? {},
      history: r.history ?? [],
      created_at: r.createdAt ?? now,
      updated_at: r.updatedAt ?? now,
    })),
  );
  await upsert(
    "master_audit",
    (main.masterAuditLog ?? []).map((a) => ({
      id: a.id,
      at: a.at,
      user_id: a.userId ?? null,
      user_label: a.userLabel ?? null,
      area: a.area,
      action: a.action,
      ref_id: a.refId ?? null,
      label: a.label ?? null,
      detail: a.detail ?? null,
      created_at: now,
    })),
  );
  await upsert(
    "app_users",
    (auth.users ?? []).map((u) => ({
      id: u.id,
      username: u.username,
      display_name: u.displayName,
      password: u.password,
      active: u.active,
      avatar_seed: u.avatarSeed ?? null,
      is_system: u.isSystem,
      login_allowed: u.loginAllowed,
      created_at: now,
      updated_at: now,
    })),
  );
  await upsert(
    "flows",
    (main.flows ?? []).map((f) => flowToRow(f, now)),
  );
  await upsert(
    "instances",
    (main.instances ?? []).map((i) => instanceToRow(i, now)),
  );

  console.log("Import completo:", {
    flows: main.flows?.length ?? 0,
    instances: main.instances?.length ?? 0,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
