/**
 * Tipos de base de datos (Supabase) — alineados con el mock.
 */

export type FlowStatus = "borrador" | "listo" | "deprecado";
export type InstanceStatus = "en_curso" | "completada" | "cerrada_rechazo";

export interface FlowRow {
  id: string;
  name: string;
  type: string;
  description: string | null;
  status: FlowStatus;
  definition: Record<string, unknown>;
  lineage_id: string | null;
  version: number | null;
  supersedes_flow_id: string | null;
  flow_type_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface InstanceRow {
  id: string;
  flow_id: string;
  status: InstanceStatus;
  current_node_id: string | null;
  input_values: Record<string, unknown>;
  context: Record<string, unknown>;
  flow_snapshot: Record<string, unknown>;
  trace: unknown[];
  steps: unknown[];
  ai_hitl_status: string | null;
  ai_hitl_sent_at: string | null;
  ai_hitl_reminders: number;
  started_at: string;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FlowTypeRow {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface EntityRow {
  id: string;
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface MasterDefinitionRow {
  id: string;
  name: string;
  description: string | null;
  entity_ids: unknown;
  created_at: string;
  updated_at: string;
}

export interface MasterRecordRow {
  id: string;
  definition_id: string;
  lineage_id: string | null;
  status: string;
  version: number | null;
  values: Record<string, unknown>;
  history: unknown[];
  created_at: string;
  updated_at: string;
}

export interface MasterAuditRow {
  id: string;
  at: string;
  user_id: string | null;
  user_label: string | null;
  area: string;
  action: string;
  ref_id: string | null;
  label: string | null;
  detail: string | null;
  created_at: string;
}

export interface AppUserRow {
  id: string;
  username: string;
  display_name: string;
  password: string;
  active: boolean;
  avatar_seed: string | null;
  is_system: boolean;
  login_allowed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      flows: { Row: FlowRow; Insert: Partial<FlowRow> & Pick<FlowRow, "id" | "name" | "type" | "status" | "definition">; Update: Partial<FlowRow> };
      instances: { Row: InstanceRow; Insert: Partial<InstanceRow> & Pick<InstanceRow, "id" | "flow_id" | "status" | "flow_snapshot">; Update: Partial<InstanceRow> };
      flow_types: { Row: FlowTypeRow; Insert: Partial<FlowTypeRow> & Pick<FlowTypeRow, "id" | "name">; Update: Partial<FlowTypeRow> };
      entities: { Row: EntityRow; Insert: Partial<EntityRow> & Pick<EntityRow, "id" | "payload">; Update: Partial<EntityRow> };
      master_definitions: { Row: MasterDefinitionRow; Insert: Partial<MasterDefinitionRow> & Pick<MasterDefinitionRow, "id" | "name">; Update: Partial<MasterDefinitionRow> };
      master_records: { Row: MasterRecordRow; Insert: Partial<MasterRecordRow> & Pick<MasterRecordRow, "id" | "definition_id" | "values">; Update: Partial<MasterRecordRow> };
      master_audit: { Row: MasterAuditRow; Insert: Partial<MasterAuditRow> & Pick<MasterAuditRow, "id" | "at" | "area" | "action">; Update: Partial<MasterAuditRow> };
      app_users: { Row: AppUserRow; Insert: Partial<AppUserRow> & Pick<AppUserRow, "id" | "username" | "display_name">; Update: Partial<AppUserRow> };
    };
  };
}
