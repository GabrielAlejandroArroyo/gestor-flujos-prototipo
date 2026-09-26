import { ensureThemeToggleIcons } from "./theme-icons.js";

const THEME_KEY = "gestor_flujos_theme_v1";

export function getTheme() {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

export function setTheme(theme) {
  const next = theme === "light" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem(THEME_KEY, next);
  updateThemeToggleA11y();
}

export function toggleTheme() {
  setTheme(getTheme() === "dark" ? "light" : "dark");
}

function updateThemeToggleA11y() {
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;
  const isDark = getTheme() === "dark";
  btn.setAttribute("aria-label", isDark ? "Activar modo claro" : "Activar modo oscuro");
  btn.setAttribute("aria-pressed", isDark ? "true" : "false");
}

export function bindThemeToggle() {
  ensureThemeToggleIcons();
  document.getElementById("theme-toggle")?.addEventListener("click", toggleTheme);
  updateThemeToggleA11y();
}

bindThemeToggle();
