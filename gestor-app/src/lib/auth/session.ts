import { cookies } from "next/headers";
import type { AppUserRow } from "@/lib/supabase/types";
import { findAppUserByUsername, listAppUsers } from "@/lib/db/repository";

const COOKIE_NAME = "gestor_mock_session";

export interface SessionUser {
  id: string;
  username: string;
  displayName: string;
}

export async function loginWithPassword(
  username: string,
  password: string,
): Promise<{ user?: SessionUser; error?: string }> {
  const user = await findAppUserByUsername(username);
  if (!user || !user.active || !user.login_allowed) {
    return { error: "Usuario o contraseña incorrectos." };
  }
  if (user.password !== password) {
    return { error: "Usuario o contraseña incorrectos." };
  }
  return {
    user: {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
    },
  };
}

export async function setSessionCookie(user: SessionUser): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, JSON.stringify(user), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SessionUser;
    const users = await listAppUsers();
    const row = users.find((u) => u.id === parsed.id);
    if (!row?.active || !row.login_allowed) return null;
    return {
      id: row.id,
      username: row.username,
      displayName: row.display_name,
    };
  } catch {
    return null;
  }
}

export async function getSessionAppUser(): Promise<AppUserRow | null> {
  const session = await getSessionUser();
  if (!session) return null;
  const users = await listAppUsers();
  return users.find((u) => u.id === session.id) ?? null;
}
