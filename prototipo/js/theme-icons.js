export const THEME_TOGGLE_ICONS = `
<svg class="theme-icon theme-icon-sun" viewBox="0 0 24 24" aria-hidden="true">
  <circle cx="12" cy="12" r="4"></circle>
  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path>
</svg>
<svg class="theme-icon theme-icon-moon" viewBox="0 0 24 24" aria-hidden="true">
  <path d="M21 14.5A8.5 8.5 0 0 1 9.5 3 7 7 0 1 0 21 14.5z"></path>
</svg>`;

export function ensureThemeToggleIcons() {
  const btn = document.getElementById("theme-toggle");
  if (!btn || btn.querySelector(".theme-icon-sun")) return;
  btn.innerHTML = THEME_TOGGLE_ICONS;
}
