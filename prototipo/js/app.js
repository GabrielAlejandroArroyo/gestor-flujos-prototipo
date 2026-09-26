import { loadState, saveState } from "./storage.js";
import { ensureSeed } from "./seed.js";
import { renderDesigner } from "./designer.js";
import { renderGestion } from "./gestion.js";
import { renderReporte } from "./reporte.js";
import { bindNavDrawer } from "./shell.js";

function showBootError(message) {
  const mainEl = document.getElementById("app-main");
  if (!mainEl) return;
  mainEl.innerHTML = `
    <section class="panel">
      <h2 class="panel-title">No se pudo iniciar el mock</h2>
      <p style="color:var(--danger)">${message}</p>
      <p style="font-size:0.9rem;color:var(--muted)">Pruebe abrir con un servidor local, por ejemplo: <code>python -m http.server 8765</code> en la carpeta <code>prototipo</code>.</p>
    </section>`;
}

try {
  const mainEl = document.getElementById("app-main");
  if (!mainEl) {
    throw new Error("Falta el contenedor principal #app-main.");
  }

  let state = ensureSeed(loadState());
  let currentView = "designer";

  function persist() {
    saveState(state);
  }

  function render() {
    if (currentView === "designer") renderDesigner(mainEl, state, persist);
    if (currentView === "gestion") renderGestion(mainEl, state, persist);
    if (currentView === "reporte") renderReporte(mainEl, state);
  }

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    if (resizeTimer) window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      if (currentView === "designer") render();
    }, 150);
  });

  bindNavDrawer((view) => {
    currentView = view;
    render();
  });

  render();
} catch (err) {
  console.error(err);
  showBootError(err instanceof Error ? err.message : "Error desconocido.");
}
