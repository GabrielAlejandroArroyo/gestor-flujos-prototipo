/**
 * Autenticación del mock — proveedor local (usuario/clave).
 * Preparado para reemplazar `authenticate` / `getSession` por Supabase, OIDC, etc.
 */

import { createId } from "./ids.js";

const AUTH_USERS_KEY = "gestor_flujos_auth_users_v1";
const AUTH_SESSION_KEY = "gestor_flujos_session_v1";

/** @typedef {{ id: string; username: string; displayName: string; password: string; active: boolean; avatarSeed: string; isSystem?: boolean; loginAllowed?: boolean }} AuthUserRecord */
/** @typedef {{ userId: string; username: string; displayName: string; provider: string; at: string }} AuthSession */

export const AUTH_PROVIDER_LOCAL = "local";

/** @type {AuthSession | null} */
let cachedSession = null;

const DEMO_USERS = [
  { username: "luna", displayName: "Luna Rivera", avatarSeed: "luna-aurora" },
  { username: "mateo", displayName: "Mateo Díaz", avatarSeed: "mateo-bosque" },
  { username: "sofia", displayName: "Sofía Luna", avatarSeed: "sofia-brillo" },
  { username: "bruno", displayName: "Bruno Paz", avatarSeed: "bruno-roca" },
  { username: "clara", displayName: "Clara Mora", avatarSeed: "clara-marea" },
];

const DEMO_PASSWORD = "1234";

/** Usuario genérico cuando no hay sesión (p. ej. atributo userconnected en entidades). */
export const SYSTEM_MIGRATION_USER_ID = "user_sys_prueabaomigracion";
export const SYSTEM_MIGRATION_USERNAME = "prueabaomigracion";

/**
 * @returns {AuthUserRecord}
 */
export function createSystemMigrationUserRecord() {
  return {
    id: SYSTEM_MIGRATION_USER_ID,
    username: SYSTEM_MIGRATION_USERNAME,
    displayName: "Usuario genérico de migración",
    password: "",
    active: true,
    avatarSeed: "system-prueabaomigracion",
    isSystem: true,
    loginAllowed: false,
  };
}

/**
 * @param {AuthUserRecord[]} users
 * @returns {AuthUserRecord[]}
 */
function ensureSystemMigrationUser(users) {
  const list = [...users];
  const idx = list.findIndex((u) => u.username === SYSTEM_MIGRATION_USERNAME);
  const canonical = createSystemMigrationUserRecord();
  if (idx === -1) {
    list.push(canonical);
    return list;
  }
  list[idx] = {
    ...list[idx],
    ...canonical,
    id: list[idx].id || canonical.id,
    displayName: list[idx].displayName || canonical.displayName,
    isSystem: true,
    loginAllowed: false,
    active: list[idx].active !== false,
  };
  return list;
}

/**
 * @param {AuthUserRecord | null | undefined} user
 */
export function isSystemAuthUser(user) {
  return !!user?.isSystem;
}

/**
 * @param {AuthUserRecord | null | undefined} user
 */
export function canUserLogin(user) {
  if (!user?.active) return false;
  if (user.isSystem) return false;
  if (user.loginAllowed === false) return false;
  return true;
}

/**
 * @returns {AuthUserRecord | null}
 */
export function getSystemMigrationUser() {
  return (
    loadAuthUsers().find((u) => u.username === SYSTEM_MIGRATION_USERNAME) ??
    createSystemMigrationUserRecord()
  );
}

/**
 * Id del usuario conectado o, sin sesión, el usuario de sistema prueabaomigracion.
 */
export function resolveConnectedAuthUserId() {
  const session = getSession();
  if (session?.userId) return session.userId;
  return getSystemMigrationUser().id;
}

/** @type {Set<(session: AuthSession | null) => void>} */
const listeners = new Set();

/**
 * @param {AuthSession | null} session
 */
function notifyAuthChange(session) {
  for (const fn of listeners) {
    try {
      fn(session);
    } catch (e) {
      console.error(e);
    }
  }
}

/**
 * @param {(session: AuthSession | null) => void} fn
 * @returns {() => void}
 */
export function subscribeAuth(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Catálogo de usuarios (mock). En producción: API / IdP.
 */
export function loadAuthUsers() {
  let users;
  try {
    const raw = localStorage.getItem(AUTH_USERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.users)) users = normalizeAuthUsers(parsed.users);
    }
  } catch {
    /* ignore */
  }
  if (!users) users = seedAuthUsersIfEmpty();
  const merged = ensureSystemMigrationUser(users);
  if (merged.length !== users.length || merged.some((u, i) => u.isSystem !== users[i]?.isSystem)) {
    saveAuthUsers(merged);
  }
  return merged;
}

/**
 * @param {AuthUserRecord[]} users
 */
export function saveAuthUsers(users) {
  localStorage.setItem(AUTH_USERS_KEY, JSON.stringify({ users: normalizeAuthUsers(users) }));
}

function seedAuthUsersIfEmpty() {
  const users = DEMO_USERS.map((u) => ({
    id: createId("user"),
    username: u.username,
    displayName: u.displayName,
    password: DEMO_PASSWORD,
    active: true,
    avatarSeed: u.avatarSeed ?? u.username,
    isSystem: false,
    loginAllowed: true,
  }));
  const withSystem = ensureSystemMigrationUser(users);
  saveAuthUsers(withSystem);
  return withSystem;
}

/**
 * @param {object[]} users
 * @returns {AuthUserRecord[]}
 */
export function normalizeAuthUsers(users) {
  return (users ?? []).map((u) => {
    const isSystem = !!u.isSystem || u.username === SYSTEM_MIGRATION_USERNAME;
    const loginAllowed = isSystem ? false : u.loginAllowed !== false;
    return {
      id: String(u.id ?? createId("user")),
      username: String(u.username ?? "").trim().toLowerCase(),
      displayName: String(u.displayName ?? u.username ?? "").trim(),
      password: String(u.password ?? ""),
      active: u.active !== false,
      avatarSeed: String(u.avatarSeed ?? u.username ?? u.id ?? "user"),
      isSystem,
      loginAllowed,
    };
  });
}

/**
 * @param {string} value
 */
export function hashStringToInt(value) {
  let h = 0;
  const s = String(value ?? "");
  for (let i = 0; i < s.length; i += 1) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/**
 * @param {AuthUserRecord | { displayName?: string; username?: string }} user
 */
export function getUserInitials(user) {
  const name = String(user.displayName ?? user.username ?? "?").trim();
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * URL estable de avatar ilustrado (seed por usuario).
 *
 * @param {AuthUserRecord | { avatarSeed?: string; username?: string; id?: string }} user
 */
export function getUserAvatarImageUrl(user) {
  const seed = encodeURIComponent(String(user.avatarSeed ?? user.username ?? user.id ?? "user"));
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
}

/**
 * @param {string} userId
 */
export function getUserById(userId) {
  if (!userId) return null;
  return loadAuthUsers().find((u) => u.id === userId) ?? null;
}

/**
 * @returns {{ session: AuthSession; user: AuthUserRecord } | null}
 */
export function getCurrentUserProfile() {
  const session = getSession();
  if (!session) return null;
  const user = getUserById(session.userId);
  if (!user) return null;
  return { session, user };
}

/**
 * @param {AuthSession | null} session
 */
function persistSession(session) {
  cachedSession = session;
  if (!session) {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    return;
  }
  sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}

/**
 * Restaura sesión del tab (vacío al abrir navegador nuevo si sessionStorage limpio).
 */
export function restoreAuthSession() {
  if (cachedSession) return cachedSession;
  try {
    const raw = sessionStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.userId || !parsed?.username) return null;
    cachedSession = {
      userId: String(parsed.userId),
      username: String(parsed.username),
      displayName: String(parsed.displayName ?? parsed.username),
      provider: String(parsed.provider ?? AUTH_PROVIDER_LOCAL),
      at: String(parsed.at ?? new Date().toISOString()),
    };
    return cachedSession;
  } catch {
    return null;
  }
}

export function getSession() {
  return cachedSession ?? restoreAuthSession();
}

export function isAuthenticated() {
  return !!getSession();
}

/**
 * @param {{ username: string; password: string }} credentials
 * @returns {{ ok: true; session: AuthSession } | { ok: false; message: string }}
 */
export function authenticate(credentials) {
  const username = String(credentials.username ?? "").trim().toLowerCase();
  const password = String(credentials.password ?? "");
  if (!username || !password) {
    return { ok: false, message: "Ingresá usuario y clave." };
  }

  const users = loadAuthUsers();
  const user = users.find((u) => u.username === username && u.active);
  if (!user || !canUserLogin(user)) {
    return { ok: false, message: "Usuario o clave incorrectos." };
  }
  if (user.password !== password) {
    return { ok: false, message: "Usuario o clave incorrectos." };
  }

  /** @type {AuthSession} */
  const session = {
    userId: user.id,
    username: user.username,
    displayName: user.displayName,
    provider: AUTH_PROVIDER_LOCAL,
    at: new Date().toISOString(),
  };
  persistSession(session);
  notifyAuthChange(session);
  return { ok: true, session };
}

export function logout() {
  persistSession(null);
  notifyAuthChange(null);
}

/**
 * Usuarios visibles en pantalla de login (activos).
 */
export function listLoginUsers() {
  return loadAuthUsers().filter((u) => canUserLogin(u));
}
