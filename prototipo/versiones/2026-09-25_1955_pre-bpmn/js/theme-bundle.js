(() => {
  // js/theme-icons.js
  var THEME_TOGGLE_ICONS = `
<svg class="theme-icon theme-icon-sun" viewBox="0 0 24 24" aria-hidden="true">
  <circle cx="12" cy="12" r="4"></circle>
  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path>
</svg>
<svg class="theme-icon theme-icon-moon" viewBox="0 0 24 24" aria-hidden="true">
  <path d="M21 14.5A8.5 8.5 0 0 1 9.5 3 7 7 0 1 0 21 14.5z"></path>
</svg>`;
  function ensureThemeToggleIcons() {
    const btn = document.getElementById("theme-toggle");
    if (!btn || btn.querySelector(".theme-icon-sun")) return;
    btn.innerHTML = THEME_TOGGLE_ICONS;
  }

  // js/theme.js
  var THEME_KEY = "gestor_flujos_theme_v1";
  function getTheme() {
    return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  }
  function setTheme(theme) {
    const next = theme === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem(THEME_KEY, next);
    updateThemeToggleA11y();
  }
  function toggleTheme() {
    setTheme(getTheme() === "dark" ? "light" : "dark");
  }
  function updateThemeToggleA11y() {
    const btn = document.getElementById("theme-toggle");
    if (!btn) return;
    const isDark = getTheme() === "dark";
    btn.setAttribute("aria-label", isDark ? "Activar modo claro" : "Activar modo oscuro");
    btn.setAttribute("aria-pressed", isDark ? "true" : "false");
  }
  function bindThemeToggle() {
    ensureThemeToggleIcons();
    document.getElementById("theme-toggle")?.addEventListener("click", toggleTheme);
    updateThemeToggleA11y();
  }
  bindThemeToggle();
})();
