import { listReadyFlows } from "@/lib/db/repository";
import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse> {
  try {
    const flows = await listReadyFlows();
    return NextResponse.json({ flows });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al listar flujos";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
