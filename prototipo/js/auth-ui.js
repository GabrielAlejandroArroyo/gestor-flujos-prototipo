/**
 * UI de login y administración básica de usuarios (Operaciones).
 */

import {
  authenticate,
  AUTH_PROVIDER_LOCAL,
  canUserLogin,
  getCurrentUserProfile,
  getUserById,
  getSession,
  getUserAvatarImageUrl,
  getUserInitials,
  hashStringToInt,
  isSystemAuthUser,
  listLoginUsers,
  loadAuthUsers,
  logout,
} from "./auth.js";
import { renderActionButton } from "./action-icons.js";
import { escapeHtml, renderPageHeader, toast } from "./ui.js";

/**
 * @param {object} user
 * @param {{ size?: number; className?: string }} [opts]
 */
/**
 * @param {ParentNode} root
 */
export function bindAvatarImageFallback(root) {
  root.querySelectorAll(".user-avatar__img").forEach((img) => {
    if (!(img instanceof HTMLImageElement)) return;
    if (img.complete && img.naturalWidth === 0) {
      img.closest(".user-avatar")?.classList.add("user-avatar--offline");
    }
    img.addEventListener("error", () => {
      img.closest(".user-avatar")?.classList.add("user-avatar--offline");
    });
  });
}

export function renderUserAvatarHtml(user, opts = {}) {
  const size = opts.size ?? 40;
  const cls = opts.className ?? "user-avatar";
  const seed = user?.avatarSeed ?? user?.username ?? "user";
  const hue = hashStringToInt(seed) % 360;
  const initials = getUserInitials(user ?? {});
  const src = getUserAvatarImageUrl(user ?? { avatarSeed: seed });
  const alt = escapeHtml(user?.displayName ?? user?.username ?? "Usuario");
  return `<span class="${cls}" style="--avatar-size:${size}px;--avatar-hue:${hue}" title="${alt}">
    <img class="user-avatar__img" src="${escapeHtml(src)}" alt="" width="${size}" height="${size}" loading="lazy" decoding="async" />
    <span class="user-avatar__fallback" aria-hidden="true">${escapeHtml(initials)}</span>
  </span>`;
}

/**
 * @param {string} iso
 */
function formatSessionDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-AR");
  } catch {
    return iso;
  }
}

/**
 * @param {import("./auth.js").AuthUserRecord} user
 * @param {{ includePasswordHint?: boolean; session?: import("./auth.js").AuthSession | null }} [opts]
 */
function renderUserFieldsTableRows(user, opts = {}) {
  const statusBadge = user.active
    ? `<span class="badge badge-listo">Activo</span>`
    : `<span class="badge badge-borrador">Inactivo</span>`;
  const systemBadge = isSystemAuthUser(user)
    ? `<span class="badge badge-borrador">Usuario de sistema</span>`
    : `<span class="catalog-muted">Cuenta interactiva</span>`;
  const loginBadge = canUserLogin(user)
    ? `<span class="badge badge-listo">Puede iniciar sesión</span>`
    : `<span class="badge badge-borrador">Sin login</span>`;
  const rows = [
    ["Nombre para mostrar", escapeHtml(user.displayName)],
    ["Usuario (login)", `@${escapeHtml(user.username)}`],
    ["Id interno", `<code>${escapeHtml(user.id)}</code>`],
    ["Avatar (seed)", `<code>${escapeHtml(user.avatarSeed)}</code>`],
    ["URL del avatar", `<code class="user-detail-url">${escapeHtml(getUserAvatarImageUrl(user))}</code>`],
    ["Clasificación", systemBadge],
    ["Inicio de sesión", loginBadge],
    ["Estado", statusBadge],
    ["Proveedor de auth", escapeHtml(AUTH_PROVIDER_LOCAL)],
  ];
  if (opts.includePasswordHint && !isSystemAuthUser(user)) {
    rows.push([
      "Clave (mock)",
      `<span class="catalog-muted">Almacenada en localStorage del navegador.</span> Valor demo del catálogo: <code>1234</code>`,
    ]);
  }
  if (isSystemAuthUser(user)) {
    rows.push([
      "Uso",
      `<span class="catalog-muted">Reservado para procesos automáticos (p. ej. atributo <code>userconnected</code> sin sesión).</span>`,
    ]);
  }
  if (opts.session) {
    rows.push(["Sesión actual — inicio", escapeHtml(formatSessionDate(opts.session.at))]);
    rows.push(["Sesión actual — proveedor", escapeHtml(opts.session.provider ?? AUTH_PROVIDER_LOCAL)]);
  }
  return rows
    .map(([label, value]) => `<tr><th scope="row">${label}</th><td>${value}</td></tr>`)
    .join("");
}

/**
 * @param {import("./auth.js").AuthUserRecord} user
 * @param {{
 *   title: string;
 *   subtitle: string;
 *   tableRowsHtml: string;
 *   onBack: () => void;
 * }} config
 * @param {HTMLElement} mainEl
 */
function renderUserDetailShell(mainEl, user, config) {
  mainEl.innerHTML = `
    <section class="gestion-hero user-profile-hero panel">
      <header class="gestion-hero-header">
        ${renderActionButton({ icon: "back", label: "Volver", className: "gestion-hero-back", extraAttrs: "data-user-detail-back" })}
        <div class="gestion-hero-heading">
          <h2>${escapeHtml(config.title)}</h2>
          <p class="gestion-hero-subtitle">${escapeHtml(config.subtitle)}</p>
        </div>
      </header>
      <div class="user-profile-body">
        <div class="user-profile-card panel">
          ${renderUserAvatarHtml(user, { size: 96, className: "user-avatar user-avatar--profile" })}
          <h3 class="user-profile-name">${escapeHtml(user.displayName)}</h3>
          <p class="user-profile-username">@${escapeHtml(user.username)}</p>
        </div>
        <div class="table-wrap table-wrap--modern user-profile-table-wrap">
          <table class="table-modern">
            <tbody>${config.tableRowsHtml}</tbody>
          </table>
        </div>
      </div>
    </section>`;
  mainEl.querySelector("[data-user-detail-back]")?.addEventListener("click", config.onBack);
  bindAvatarImageFallback(mainEl);
}

/**
 * Pantalla de acceso inicial (app deslogueada).
 *
 * @param {HTMLElement} mainEl
 * @param {() => void} onSuccess
 */
export function renderLoginScreen(mainEl, onSuccess) {
  const users = listLoginUsers();
  const cards = users
    .map(
      (u) => `
    <article class="auth-user-card panel" data-auth-user="${escapeHtml(u.username)}">
      ${renderUserAvatarHtml(u, { size: 56, className: "user-avatar user-avatar--card" })}
      <h3 class="auth-user-card__name">${escapeHtml(u.displayName)}</h3>
      <p class="auth-user-card__username">@${escapeHtml(u.username)}</p>
      <form class="auth-user-card__form" data-auth-form="${escapeHtml(u.username)}">
        <label class="auth-user-card__label">Clave</label>
        <input type="password" name="password" class="auth-user-card__input" autocomplete="current-password" placeholder="Clave" required />
        ${renderActionButton({ icon: "arrowRight", label: "Entrar", variant: "primary", type: "submit", className: "auth-user-card__submit" })}
      </form>
    </article>`,
    )
    .join("");

  mainEl.innerHTML = `
    <section class="auth-gate panel">
      <div class="auth-gate__inner">
        <header class="auth-gate__header">
          <h2>Iniciar sesión</h2>
          <p class="auth-gate__subtitle">Elegí tu usuario e ingresá la clave. Mock local — integrable con Supabase u otro proveedor.</p>
        </header>
        <div class="auth-user-grid">${cards || `<p class="gestion-empty">No hay usuarios configurados.</p>`}</div>
        <p class="form-hint auth-gate__hint">Demo: los 5 usuarios del catálogo usan la clave <code>1234</code>.</p>
      </div>
    </section>`;

  mainEl.querySelectorAll("[data-auth-form]").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const card = form.closest("[data-auth-user]");
      const username = card?.getAttribute("data-auth-user") ?? "";
      const password = String(form.querySelector('[name="password"]')?.value ?? "");
      const result = authenticate({ username, password });
      if (!result.ok) {
        toast(result.message);
        return;
      }
      toast(`Bienvenido/a, ${result.session.displayName}.`, 2600, "success");
      onSuccess();
    });
  });
  bindAvatarImageFallback(mainEl);
}

/**
 * @param {HTMLElement} mainEl
 * @param {{ onOpenUserDetail?: (userId: string) => void }} [opts]
 */
export function renderAuthUsersAdmin(mainEl, opts = {}) {
  const users = loadAuthUsers();
  const rows = users
    .map(
      (u) => `<tr class="auth-user-row" data-auth-user-row="${escapeHtml(u.id)}">
        <td class="auth-user-row__avatar">${renderUserAvatarHtml(u, { size: 40, className: "user-avatar user-avatar--table" })}</td>
        <td><strong>${escapeHtml(u.displayName)}</strong><div class="form-hint">@${escapeHtml(u.username)} · <code>${escapeHtml(u.id)}</code></div></td>
        <td>${u.active ? `<span class="badge badge-listo">Activo</span>` : `<span class="badge badge-borrador">Inactivo</span>`}${isSystemAuthUser(u) ? ` <span class="badge badge-borrador">Sistema</span>` : ""}</td>
        <td><span class="catalog-muted">${escapeHtml(AUTH_PROVIDER_LOCAL)} (mock)</span>${canUserLogin(u) ? "" : `<div class="form-hint">Sin login</div>`}</td>
        <td class="auth-user-row__actions">
          ${renderActionButton({ icon: "view", label: "Ver detalle de usuario", data: { "auth-user-detail": u.id } })}
        </td>
      </tr>`,
    )
    .join("");

  mainEl.innerHTML = `
    <section class="panel panel--catalog">
      ${renderPageHeader(
        "Usuarios del sistema",
        "Catálogo mock para login. Abrí el detalle para ver avatar y datos completos. Sustituir por directorio corporativo o Supabase Auth en producción.",
      )}
      <div class="table-wrap table-wrap--modern">
        <table class="table-modern auth-users-table">
          <thead><tr><th></th><th>Usuario</th><th>Estado</th><th>Autenticación</th><th></th></tr></thead>
          <tbody>${rows || `<tr><td colspan="5" class="gestion-empty">No hay usuarios.</td></tr>`}</tbody>
        </table>
      </div>
      <p class="form-hint" style="margin-top:1rem">Clave de demo para todos: <code>1234</code></p>
    </section>`;

  mainEl.querySelector(".auth-users-table tbody")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-auth-user-detail]");
    if (!btn) return;
    const userId = btn.getAttribute("data-auth-user-detail");
    if (userId) opts.onOpenUserDetail?.(userId);
  });
  bindAvatarImageFallback(mainEl);
}

/**
 * Detalle de un usuario del catálogo (Operaciones → Usuarios).
 *
 * @param {HTMLElement} mainEl
 * @param {string} userId
 * @param {() => void} onBack
 */
export function renderAuthUserDetailPage(mainEl, userId, onBack) {
  const user = getUserById(userId);
  if (!user) {
    mainEl.innerHTML = `
      <section class="panel">
        <p class="empty-state">No se encontró el usuario.</p>
        ${renderActionButton({ icon: "back", label: "Volver al listado", extraAttrs: "data-user-detail-back" })}
      </section>`;
    mainEl.querySelector("[data-user-detail-back]")?.addEventListener("click", onBack);
    return;
  }
  const session = getSession();
  const isSelf = session?.userId === user.id;
  renderUserDetailShell(mainEl, user, {
    title: isSelf ? "Detalle — tu cuenta" : "Detalle de usuario",
    subtitle: isSelf
      ? "Mismos datos del catálogo; la fila de sesión aplica solo porque estás logueado como este usuario."
      : "Datos completos del registro mock en localStorage.",
    tableRowsHtml: renderUserFieldsTableRows(user, {
      includePasswordHint: true,
      session: isSelf ? session : null,
    }),
    onBack,
  });
}

/**
 * @param {HTMLElement | null} host
 * @param {{ onOpenProfile?: () => void }} [opts]
 */
export function renderAuthHeaderChip(host, opts = {}) {
  if (!host) return;
  const profile = getCurrentUserProfile();
  if (!profile) {
    host.innerHTML = "";
    host.hidden = true;
    return;
  }
  const { session, user } = profile;
  host.hidden = false;
  host.innerHTML = `
    <div class="auth-header-chip">
      ${renderUserAvatarHtml(user, { size: 36, className: "user-avatar user-avatar--header" })}
      <div class="auth-header-chip__text">
        <span class="auth-header-chip__name">${escapeHtml(session.displayName)}</span>
        <span class="auth-header-chip__user">@${escapeHtml(session.username)}</span>
      </div>
      ${renderActionButton({ icon: "user", label: "Ver perfil", id: "btn-auth-profile" })}
      ${renderActionButton({ icon: "logout", label: "Salir", className: "action-icon-btn--ghost", id: "btn-auth-logout" })}
    </div>`;
  host.querySelector("#btn-auth-profile")?.addEventListener("click", () => {
    opts.onOpenProfile?.();
  });
  host.querySelector("#btn-auth-logout")?.addEventListener("click", () => {
    logout();
    toast("Sesión cerrada.", 2200, "success");
    window.dispatchEvent(new CustomEvent("gestor:auth-changed"));
  });
  bindAvatarImageFallback(host);
}

/**
 * @param {HTMLElement} mainEl
 * @param {() => void} onBack
 */
export function renderUserProfilePage(mainEl, onBack) {
  const profile = getCurrentUserProfile();
  if (!profile) {
    mainEl.innerHTML = `<section class="panel"><p class="empty-state">No hay sesión activa.</p></section>`;
    return;
  }
  const { session, user } = profile;
  renderUserDetailShell(mainEl, user, {
    title: "Mi perfil",
    subtitle: "Datos de la cuenta en el mock local (integrable con directorio corporativo).",
    tableRowsHtml: renderUserFieldsTableRows(user, { includePasswordHint: true, session }),
    onBack,
  });
}

/**
 * Bloquea o libera la shell según sesión.
 *
 * @param {boolean} loggedIn
 */
export function setAppShellAuthLocked(loggedIn) {
  const shell = document.getElementById("app-shell");
  const drawer = document.getElementById("nav-drawer");
  const toggle = document.getElementById("menu-toggle");
  const aiBtn = document.getElementById("btn-ai-config");
  shell?.classList.toggle("is-auth-locked", !loggedIn);
  if (drawer) {
    drawer.setAttribute("aria-hidden", loggedIn ? "false" : "true");
  }
  if (toggle) toggle.disabled = !loggedIn;
  if (aiBtn) aiBtn.disabled = !loggedIn;
}
