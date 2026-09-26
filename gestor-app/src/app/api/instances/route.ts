import { listInstances } from "@/lib/db/repository";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const status = request.nextUrl.searchParams.get("status") ?? undefined;
    const instances = await listInstances(status);
    return NextResponse.json({ instances });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al listar instancias";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
