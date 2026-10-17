import type { FlowInstance } from "@/lib/engine/flow-types";
import type { MockAppState } from "@/lib/db/memory-full-state";
import type { MockFlowDefinition } from "@/lib/db/flow-mapper";
import type {
  AppUserRow,
  EntityRow,
  FlowTypeRow,
  MasterAuditRow,
  MasterDefinitionRow,
  MasterRecordRow,
} from "@/lib/supabase/types";

export interface BootstrapFile {
  version?: number;
  environment?: string;
  exportedAt?: string;
  entries: Record<string, string>;
}

interface MockStorageV3 {
  flows: MockFlowDefinition[];
  instances: FlowInstance[];
  flowTypes: Array<{ id: string; name: string; description?: string }>;
  entities: Array<Record<string, unknown> & { id: string }>;
  masterDefinitions: Array<{
    id: string;
    name: string;
    description?: string;
    entityIds: string[];
  }>;
  masterRecords: Array<Record<string, unknown> & { id: string; definitionId: string }>;
  masterAuditLog: Array<Record<string, unknown> & { id: string }>;
}

interface AuthStorage {
  users: Array<{
    id: string;
    username: string;
    displayName: string;
    password: string;
    active: boolean;
    avatarSeed?: string;
    isSystem: boolean;
    loginAllowed: boolean;
  }>;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function parseBootstrapToAppState(bootstrap: BootstrapFile): MockAppState {
  const mainRaw = bootstrap.entries["gestor_flujos_prototipo_v3"];
  const authRaw = bootstrap.entries["gestor_flujos_auth_users_v1"];
  if (!mainRaw) throw new Error("Bootstrap sin clave gestor_flujos_prototipo_v3");

  const main = JSON.parse(mainRaw) as MockStorageV3;
  const auth = authRaw ? (JSON.parse(authRaw) as AuthStorage) : { users: [] };
  const ts = nowIso();

  const flowTypes: FlowTypeRow[] = (main.flowTypes ?? []).map((ft) => ({
    id: ft.id,
    name: ft.name,
    description: ft.description ?? null,
    created_at: ts,
    updated_at: ts,
  }));

  const entities: EntityRow[] = (main.entities ?? []).map((e) => ({
    id: e.id,
    payload: e as Record<string, unknown>,
    created_at: ts,
    updated_at: ts,
  }));

  const masterDefinitions: MasterDefinitionRow[] = (main.masterDefinitions ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    description: d.description ?? null,
    entity_ids: d.entityIds ?? [],
    created_at: ts,
    updated_at: ts,
  }));

  const masterRecords: MasterRecordRow[] = (main.masterRecords ?? []).map((r) => ({
    id: r.id,
    definition_id: String(r.definitionId),
    lineage_id: (r.lineageId as string | undefined) ?? r.id,
    status: String(r.status ?? "vigente"),
    version: typeof r.version === "number" ? r.version : null,
    values: (r.values as Record<string, unknown>) ?? {},
    history: (r.history as unknown[]) ?? [],
    created_at: String(r.createdAt ?? ts),
    updated_at: String(r.updatedAt ?? ts),
  }));

  const masterAudit: MasterAuditRow[] = (main.masterAuditLog ?? []).map((a) => ({
    id: a.id,
    at: String(a.at ?? ts),
    user_id: (a.userId as string | undefined) ?? null,
    user_label: (a.userLabel as string | undefined) ?? null,
    area: String(a.area ?? ""),
    action: String(a.action ?? ""),
    ref_id: (a.refId as string | undefined) ?? null,
    label: (a.label as string | undefined) ?? null,
    detail: (a.detail as string | undefined) ?? null,
    created_at: ts,
  }));

  const appUsers: AppUserRow[] = auth.users.map((u) => ({
    id: u.id,
    username: u.username,
    display_name: u.displayName,
    password: u.password,
    active: u.active,
    avatar_seed: u.avatarSeed ?? null,
    is_system: u.isSystem,
    login_allowed: u.loginAllowed,
    created_at: ts,
    updated_at: ts,
  }));

  return {
    flows: main.flows ?? [],
    instances: main.instances ?? [],
    flowTypes,
    entities,
    masterDefinitions,
    masterRecords,
    masterAudit,
    appUsers,
  };
}

/** Formato export compatible con el mock (localStorage). */
export function appStateToMockExport(state: MockAppState): BootstrapFile {
  const ts = new Date().toISOString();
  const payload: MockStorageV3 = {
    flows: state.flows,
    instances: state.instances,
    flowTypes: state.flowTypes.map((ft) => ({
      id: ft.id,
      name: ft.name,
      description: ft.description ?? undefined,
    })),
    entities: state.entities.map((e) => e.payload as MockStorageV3["entities"][0]),
    masterDefinitions: state.masterDefinitions.map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description ?? undefined,
      entityIds: (d.entity_ids as string[]) ?? [],
    })),
    masterRecords: state.masterRecords.map((r) => ({
      id: r.id,
      definitionId: r.definition_id,
      lineageId: r.lineage_id ?? r.id,
      status: r.status,
      version: r.version ?? undefined,
      values: r.values,
      history: r.history,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })),
    masterAuditLog: state.masterAudit.map((a) => ({
      id: a.id,
      at: a.at,
      userId: a.user_id ?? undefined,
      userLabel: a.user_label ?? undefined,
      area: a.area,
      action: a.action,
      refId: a.ref_id ?? undefined,
      label: a.label ?? undefined,
      detail: a.detail ?? undefined,
    })),
  };

  return {
    version: 1,
    environment: "exported",
    exportedAt: ts,
    entries: {
      gestor_flujos_prototipo_v3: JSON.stringify(payload),
      gestor_flujos_auth_users_v1: JSON.stringify({
        users: state.appUsers.map((u) => ({
          id: u.id,
          username: u.username,
          displayName: u.display_name,
          password: u.password,
          active: u.active,
          avatarSeed: u.avatar_seed ?? undefined,
          isSystem: u.is_system,
          loginAllowed: u.login_allowed,
        })),
      }),
    },
  };
}
