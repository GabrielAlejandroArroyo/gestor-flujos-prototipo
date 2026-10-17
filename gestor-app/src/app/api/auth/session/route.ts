import { getSessionUser } from "@/lib/auth/session";
import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse> {
  const user = await getSessionUser();
  return NextResponse.json({ user });
}
