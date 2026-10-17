import { listMasterAudit } from "@/lib/db/repository";
import { NextResponse } from "next/server";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const limit = Number(new URL(request.url).searchParams.get("limit") ?? "200");
    const audit = await listMasterAudit(Number.isFinite(limit) ? limit : 200);
    return NextResponse.json({ audit });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
