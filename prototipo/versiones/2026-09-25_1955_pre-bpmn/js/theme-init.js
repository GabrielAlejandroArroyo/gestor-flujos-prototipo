(function initThemeEarly() {
  const key = "gestor_flujos_theme_v1";
  let theme = localStorage.getItem(key);
  if (theme !== "light" && theme !== "dark") {
    theme = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  document.documentElement.setAttribute("data-theme", theme);
})();
