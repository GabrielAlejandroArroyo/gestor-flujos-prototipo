/**
 * Entornos de despliegue estático (GitHub Pages).
 */

/** @typedef {{ id: string; label: string; bootstrapUrl: string; seedStorageKey: string }} DeployEnvironment */

/** @type {DeployEnvironment} */
export const TESTING_DEPLOY_ENV = {
  id: "testing",
  label: "Testing",
  bootstrapUrl: "data/environments/testing-bootstrap.json",
  seedStorageKey: "gestor_flujos_pages_seed_testing",
};

/**
 * @returns {boolean}
 */
export function isGitHubPagesHost() {
  const host = location.hostname.toLowerCase();
  return host.endsWith(".github.io") || host === "github.io";
}

/**
 * @returns {DeployEnvironment | null}
 */
export function getActiveDeployEnvironment() {
  if (!isGitHubPagesHost()) return null;
  const params = new URLSearchParams(location.search);
  const envId = params.get("env") || TESTING_DEPLOY_ENV.id;
  if (envId === TESTING_DEPLOY_ENV.id) return TESTING_DEPLOY_ENV;
  return null;
}

/**
 * @returns {boolean}
 */
export function shouldForceDeploySeed() {
  const params = new URLSearchParams(location.search);
  return params.get("bootstrap") === "1" || params.get("seed") === "pages";
}
