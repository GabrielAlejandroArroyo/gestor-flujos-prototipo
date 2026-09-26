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
          <select name="provider" id="ai-provider-select">
            <option value="openai" ${config.provider === "openai" ? "selected" : ""}>OpenAI</option>
            <option value="anthropic" ${config.provider === "anthropic" ? "selected" : ""}>Anthropic</option>
            <option value="google" ${config.provider === "google" ? "selected" : ""}>Google (Gemini)</option>
            <option value="groq" ${config.provider === "groq" ? "selected" : ""}>Groq</option>
            <option value="ollama" ${config.provider === "ollama" ? "selected" : ""}>Ollama (Local)</option>
            <option value="custom" ${config.provider === "custom" ? "selected" : ""}>Otro (Custom)</option>
          </select>
        </div>
        <div class="form-row">
          <label>Modelo por defecto</label>
          <select name="model" id="ai-model-select">
            <!-- Se llena dinámicamente -->
          </select>
          <input type="text" name="customModel" id="ai-custom-model" style="display:none; margin-top:0.5rem;" placeholder="Escribe el nombre del modelo..." />
        </div>
        <div class="form-row">
          <label>API Key (Token)</label>
          <input type="password" name="apiKey" value="${config.apiKey || ""}" placeholder="Ingresa tu token..." required />
          <p class="form-hint">Se guarda en localStorage. Necesario para habilitar la IA.</p>
        </div>
        <div style="margin-top:0.5rem">
          <button type="submit" class="btn btn-primary">Guardar configuración</button>
        </div>
      </form>
    `);

    const providerSelect = root.querySelector("#ai-provider-select");
    const modelSelect = root.querySelector("#ai-model-select");
    const customModelInput = root.querySelector("#ai-custom-model");

    const modelsByProvider = {
      openai: ["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"],
      anthropic: ["claude-3-5-sonnet", "claude-3-opus", "claude-3-haiku"],
      google: ["gemini-1.5-pro", "gemini-1.5-flash"],
      groq: ["llama3-70b-8192", "llama3-8b-8192", "mixtral-8x7b-32768", "gemma-7b-it", "qwen-2.5-32b"],
      ollama: ["llama3", "mistral", "phi3"],
      custom: []
    };

    function updateModels() {
      const provider = providerSelect.value;
      const models = modelsByProvider[provider] || [];
      
      modelSelect.innerHTML = "";
      if (models.length > 0) {
        modelSelect.style.display = "block";
        customModelInput.style.display = "none";
        models.forEach(m => {
          const opt = document.createElement("option");
          opt.value = m;
          opt.textContent = m;
          if (config.model === m) opt.selected = true;
          modelSelect.appendChild(opt);
        });
        // Si el modelo actual no está en la lista pero hay modelos, agregarlo como opción custom
        if (config.model && !models.includes(config.model) && provider === config.provider) {
          const opt = document.createElement("option");
          opt.value = config.model;
          opt.textContent = config.model + " (Actual)";
          opt.selected = true;
          modelSelect.appendChild(opt);
        }
      } else {
        modelSelect.style.display = "none";
        customModelInput.style.display = "block";
        customModelInput.value = config.model || "";
      }
    }

    providerSelect.addEventListener("change", updateModels);
    updateModels(); // Inicializar

    root.querySelector("#form-ai-config").addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const provider = fd.get("provider");
      const model = provider === "custom" ? fd.get("customModel") : fd.get("model");
      
      saveAiConfig({
        provider,
        model,
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
