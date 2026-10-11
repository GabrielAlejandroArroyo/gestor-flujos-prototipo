/**
 * Aplica datasets embebidos en GitHub Pages (entorno testing, etc.).
 */
import {
  applyPortableStorageBundle,
  parsePortableImportFile,
} from "./state-portability.js";
import {
  getActiveDeployEnvironment,
  isGitHubPagesHost,
  shouldForceDeploySeed,
  TESTING_DEPLOY_ENV,
} from "./deploy-environments.js";

/**
 * @returns {boolean}
 */
function localStateLooksEmpty() {
  const raw = localStorage.getItem("gestor_flujos_prototipo_v3");
  if (!raw) return true;
  try {
    const state = JSON.parse(raw);
    const flowCount = Array.isArray(state.flows) ? state.flows.length : 0;
    const instanceCount = Array.isArray(state.instances) ? state.instances.length : 0;
    return flowCount < 2 && instanceCount === 0;
  } catch {
    return true;
  }
}

/**
 * @param {import("./deploy-environments.js").DeployEnvironment} env
 * @param {string} seedId
 */
function rememberSeedApplied(env, seedId) {
  localStorage.setItem(env.seedStorageKey, seedId);
  localStorage.setItem("gestor_flujos_deploy_env", env.id);
}

/**
 * @param {import("./deploy-environments.js").DeployEnvironment} env
 * @returns {Promise<boolean>}
 */
async function applyDeployEnvironmentSeed(env) {
  const force = shouldForceDeploySeed();
  let res;
  try {
    res = await fetch(env.bootstrapUrl, { cache: "no-store" });
  } catch {
    console.warn("[mock] No se pudo descargar bootstrap:", env.bootstrapUrl);
    return false;
  }
  if (!res.ok) {
    console.warn("[mock] Bootstrap HTTP", res.status, env.bootstrapUrl);
    return false;
  }

  let parsedJson;
  try {
    parsedJson = await res.json();
  } catch {
    return false;
  }

  const seedId = String(
    parsedJson.seedVersion ?? parsedJson.exportedAt ?? parsedJson.version ?? "0",
  );
  const already = localStorage.getItem(env.seedStorageKey);
  if (!force && already === seedId && !localStateLooksEmpty()) {
    return false;
  }

  const check = parsePortableImportFile(parsedJson);
  if (!check.ok) {
    console.warn("[mock] Bootstrap inválido:", check.message);
    return false;
  }

  applyPortableStorageBundle(check.bundle);
  rememberSeedApplied(env, seedId);
  console.info(
    `[mock] Entorno «${env.label}»: datos aplicados (${env.bootstrapUrl}, seed ${seedId})`,
  );
  return true;
}

/**
 * @returns {Promise<boolean>}
 */
export async function maybeApplyGitHubPagesBootstrap() {
  if (!isGitHubPagesHost()) return false;
  const env = getActiveDeployEnvironment() ?? TESTING_DEPLOY_ENV;
  return applyDeployEnvironmentSeed(env);
}

/**
 * @returns {Promise<boolean>}
 */
export async function reloadTestingDatasetFromRepo() {
  if (!isGitHubPagesHost()) return false;
  return applyDeployEnvironmentSeed(TESTING_DEPLOY_ENV);
}

/**
 * Muestra badge en header cuando hay entorno de despliegue activo.
 */
export function renderDeployEnvironmentBadge() {
  const env = getActiveDeployEnvironment();
  if (!env) return;
  const header = document.querySelector(".app-header .header-actions");
  if (!header || document.getElementById("deploy-env-badge")) return;

  const badge = document.createElement("span");
  badge.id = "deploy-env-badge";
  badge.className = "deploy-env-badge";
  badge.title = "Datos cargados desde el repositorio (localStorage). Usá ?bootstrap=1 para forzar recarga.";
  badge.textContent = env.label;

  const reset = document.createElement("button");
  reset.type = "button";
  reset.className = "btn btn-ghost btn-sm deploy-env-reset";
  reset.textContent = "Recargar datos testing";
  reset.addEventListener("click", async () => {
    const url = new URL(location.href);
    url.searchParams.set("env", "testing");
    url.searchParams.set("bootstrap", "1");
    location.href = url.toString();
  });

  const wrap = document.createElement("div");
  wrap.className = "deploy-env-wrap";
  wrap.append(badge, reset);
  header.prepend(wrap);
}
