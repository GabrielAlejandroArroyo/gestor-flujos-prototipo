/**
 * Tipos de base de datos para flows e instances (Supabase).
 */

export type FlowStatus = "borrador" | "listo";
export type InstanceStatus = "en_curso" | "completada" | "cerrada_rechazo";

export interface FlowRow {
  id: string;
  name: string;
  type: string;
  description: string | null;
  status: FlowStatus;
  definition: Record<string, unknown>;
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

export interface Database {
  public: {
    Tables: {
      flows: {
        Row: FlowRow;
        Insert: Omit<FlowRow, "created_at" | "updated_at"> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<FlowRow>;
      };
      instances: {
        Row: InstanceRow;
        Insert: Omit<InstanceRow, "created_at" | "updated_at"> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<InstanceRow>;
      };
    };
  };
}
