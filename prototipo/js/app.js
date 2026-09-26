import { loadState, saveState, loadAiConfig, saveAiConfig } from "./storage.js";
import { ensureSeed } from "./seed.js";
import { renderDesigner } from "./designer.js";
import { renderGestion } from "./gestion.js";
import { renderReporte } from "./reporte.js";
import { bindNavDrawer } from "./shell.js";
import { openModal, toast } from "./ui.js";

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

  document.getElementById("btn-ai-config")?.addEventListener("click", () => {
    const config = loadAiConfig();
    const { close, root } = openModal(`
      <div class="modal-header">
        <h2>Configuración IA (Mock)</h2>
        <button type="button" class="btn btn-sm" data-modal-close>Cerrar</button>
      </div>
      <form id="form-ai-config" class="form-grid">
        <p class="form-hint" style="margin-top:0;margin-bottom:0.5rem">
          En este prototipo estático no se hacen llamadas reales a las APIs. La configuración habilita la UI del Copilot y los Nodos Agente.
        </p>
        <div class="form-row">
          <label>Proveedor</label>
          <select name="provider">
            <option value="openai" ${config.provider === "openai" ? "selected" : ""}>OpenAI</option>
            <option value="anthropic" ${config.provider === "anthropic" ? "selected" : ""}>Anthropic</option>
            <option value="google" ${config.provider === "google" ? "selected" : ""}>Google (Gemini)</option>
            <option value="ollama" ${config.provider === "ollama" ? "selected" : ""}>Ollama (Local)</option>
            <option value="custom" ${config.provider === "custom" ? "selected" : ""}>Otro (Custom)</option>
          </select>
        </div>
        <div class="form-row">
          <label>Modelo por defecto</label>
          <input name="model" value="${config.model || ""}" placeholder="ej. gpt-4o, claude-3.5-sonnet" />
        </div>
        <div class="form-row">
          <label>API Key (Mock)</label>
          <input type="password" name="apiKey" value="${config.apiKey || ""}" placeholder="sk-..." />
          <p class="form-hint">Se guarda en localStorage. Cualquier valor no vacío activa la UI.</p>
        </div>
        <div style="margin-top:0.5rem">
          <button type="submit" class="btn btn-primary">Guardar configuración</button>
        </div>
      </form>
    `);

    root.querySelector("#form-ai-config").addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      saveAiConfig({
        provider: fd.get("provider"),
        model: fd.get("model"),
        apiKey: fd.get("apiKey"),
      });
      toast("Configuración IA guardada (Mock)", 2500, "success");
      close();
    });
  });

  render();
} catch (err) {
  console.error(err);
  showBootError(err instanceof Error ? err.message : "Error desconocido.");
}
