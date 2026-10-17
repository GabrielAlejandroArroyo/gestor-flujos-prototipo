import {
  getAppStateSnapshot,
  listEntities,
  listFlowTypes,
  listFlows,
  listInstances,
  listMasterAudit,
  listMasterDefinitions,
  listMasterRecords,
  listAppUsers,
} from "@/lib/db/repository";
import { appStateToMockExport } from "@/lib/mock/bootstrap";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse> {
  try {
    if (isSupabaseConfigured()) {
      const state = {
        flows: await listFlows(),
        instances: await listInstances(),
        flowTypes: await listFlowTypes(),
        entities: await listEntities(),
        masterDefinitions: await listMasterDefinitions(),
        masterRecords: await listMasterRecords(),
        masterAudit: await listMasterAudit(5000),
        appUsers: await listAppUsers(),
      };
      return NextResponse.json(appStateToMockExport(state));
    }
    const payload = appStateToMockExport(getAppStateSnapshot());
    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al exportar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
