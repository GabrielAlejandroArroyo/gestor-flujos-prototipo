import { loadState, saveState, loadAiConfig, saveAiConfig } from "./storage.js";
import { ensureSeed } from "./seed.js";
import { renderDesigner, enterDesignerCatalog } from "./designer.js";
import { enterGestionHub, renderGestion } from "./gestion.js";
import { renderReportView } from "./reports.js";
import { renderMaestros } from "./maestros.js";
import { syncMasterRecordsAbmNav } from "./master-records-ui.js";
import { masterRecordAbmMasterKey } from "./master-records-nav.js";
import { bindNavDrawer } from "./shell.js";
import { escapeHtml, openModal, toast } from "./ui.js";

/** Debe coincidir con el query de `index.html` (?v=...) para invalidar caché del bundle. */
export const MOCK_BUNDLE_VERSION = "master-import-1";

function safeSyncMasterRecordsAbmNav(state) {
  try {
    syncMasterRecordsAbmNav(state);
  } catch (err) {
    console.warn("[mock] No se pudo sincronizar el menú ABM maestros:", err);
  }
}
import { isAuthenticated, loadAuthUsers, logout } from "./auth.js";
import {
  renderAuthHeaderChip,
  renderAuthUserDetailPage,
  renderAuthUsersAdmin,
  renderLoginScreen,
  renderUserProfilePage,
  setAppShellAuthLocked,
} from "./auth-ui.js";

function showBootError(message) {
  const mainEl = document.getElementById("app-main");
  if (!mainEl) return;
  mainEl.innerHTML = `
    <section class="panel">
      <h2 class="panel-title">No se pudo iniciar el mock</h2>
      <p style="color:var(--danger)">${escapeHtml(message)}</p>
      <p style="font-size:0.9rem;color:var(--muted)">Pruebe abrir con un servidor local, por ejemplo: <code>python -m http.server 8765</code> en la carpeta <code>prototipo</code>.</p>
    </section>`;
}

try {
  const mainEl = document.getElementById("app-main");
  if (!mainEl) {
    throw new Error("Falta el contenedor principal #app-main.");
  }

  logout();
  loadAuthUsers();

  let state = ensureSeed(loadState());
  console.info(`[mock] Bundle ${MOCK_BUNDLE_VERSION}`);
  let currentView = "designer";
  let currentMaster = "flowTypes";
  /** @type {string | null} */
  let authUserDetailId = null;

  function persist() {
    saveState(state);
    safeSyncMasterRecordsAbmNav(state);
  }

  function renderAppView() {
    if (!isAuthenticated()) {
      renderLoginScreen(mainEl, () => syncAuthAndRender());
      return;
    }
    if (currentView === "designer") renderDesigner(mainEl, state, persist);
    else if (currentView === "gestion") renderGestion(mainEl, state, persist);
    else if (currentView === "reporte") {
      currentView = "report-activities";
      renderReportView(mainEl, state, "report-activities");
    } else if (currentView.startsWith("report-")) {
      renderReportView(mainEl, state, currentView);
    }
    else if (currentView === "maestros") renderMaestros(mainEl, state, persist, currentMaster);
    else if (currentView === "auth-users") {
      authUserDetailId = null;
      renderAuthUsersAdmin(mainEl, {
        onOpenUserDetail: (userId) => {
          authUserDetailId = userId;
          currentView = "auth-user-detail";
          navApi.setNavActive("auth-user-detail", null, null);
          renderAppView();
        },
      });
    } else if (currentView === "auth-user-detail") {
      renderAuthUserDetailPage(mainEl, authUserDetailId ?? "", () => {
        currentView = "auth-users";
        renderAppView();
      });
    } else if (currentView === "user-profile") {
      renderUserProfilePage(mainEl, () => {
        currentView = "designer";
        enterDesignerCatalog("flows");
        renderAppView();
      });
    }
  }

  function openUserProfile() {
    if (!isAuthenticated()) return;
    currentView = "user-profile";
    renderAppView();
  }

  function syncAuthAndRender() {
    const loggedIn = isAuthenticated();
    setAppShellAuthLocked(loggedIn);
    renderAuthHeaderChip(document.getElementById("auth-header-slot"), {
      onOpenProfile: openUserProfile,
    });
    renderAppView();
    safeSyncMasterRecordsAbmNav(state);
  }

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    if (!isAuthenticated()) return;
    if (resizeTimer) window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      if (currentView === "designer") renderAppView();
    }, 150);
  });

  window.addEventListener("gestor:auth-changed", () => syncAuthAndRender());

  const navApi = bindNavDrawer((view, catalog, master) => {
    if (!isAuthenticated()) return;
    if (view === "gestion" && currentView !== "gestion") {
      enterGestionHub();
    }
    if (currentView === "gestion" && view !== "gestion") {
      enterGestionHub();
    }
    currentView = view;
    if (master) currentMaster = master;
    if (view === "designer" && catalog) {
      enterDesignerCatalog(catalog);
    }
    renderAppView();
  });

  window.addEventListener("gestor:nav-maestros", (event) => {
    if (!isAuthenticated()) return;
    const detail = event.detail ?? {};
    currentView = "maestros";
    if (detail.masterRecordDefId) {
      currentMaster = masterRecordAbmMasterKey(String(detail.masterRecordDefId));
    } else if (detail.master) {
      currentMaster = detail.master;
    }
    navApi.setNavActive("maestros", null, currentMaster);
    renderAppView();
  });

  document.getElementById("btn-ai-config")?.addEventListener("click", () => {
    if (!isAuthenticated()) return;
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
      custom: [],
    };

    function updateModels() {
      const provider = providerSelect.value;
      const models = modelsByProvider[provider] || [];

      modelSelect.innerHTML = "";
      if (models.length > 0) {
        modelSelect.style.display = "block";
        customModelInput.style.display = "none";
        models.forEach((m) => {
          const opt = document.createElement("option");
          opt.value = m;
          opt.textContent = m;
          if (config.model === m) opt.selected = true;
          modelSelect.appendChild(opt);
        });
        if (config.model && !models.includes(config.model) && provider === config.provider) {
          const opt = document.createElement("option");
          opt.value = config.model;
          opt.textContent = `${config.model} (Actual)`;
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
    updateModels();

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

  syncAuthAndRender();
} catch (err) {
  console.error(err);
  showBootError(err instanceof Error ? err.message : "Error desconocido.");
}
