import { loginWithPassword, setSessionCookie } from "@/lib/auth/session";
import { NextResponse } from "next/server";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as { username?: string; password?: string };
    const result = await loginWithPassword(body.username ?? "", body.password ?? "");
    if (result.error || !result.user) {
      return NextResponse.json({ error: result.error ?? "Login fallido" }, { status: 401 });
    }
    await setSessionCookie(result.user);
    return NextResponse.json({ user: result.user });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
