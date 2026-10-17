import { isSupabaseConfigured } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Health check para Docker, balanceadores e integraciones.
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: "ok",
    service: "gestor-app",
    version: process.env.npm_package_version ?? "0.1.0",
    supabaseConfigured: isSupabaseConfigured(),
    publicUrl: process.env.APP_PUBLIC_URL ?? null,
    timestamp: new Date().toISOString(),
  });
}
