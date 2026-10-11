/**
 * Claves de navegación para ABM de registros por definición de maestro.
 */

export const MASTER_RECORD_ABM_PREFIX = "masterRecordAbm:";

/**
 * @param {string} definitionId
 */
export function masterRecordAbmMasterKey(definitionId) {
  return `${MASTER_RECORD_ABM_PREFIX}${definitionId}`;
}

/**
 * @param {string | null | undefined} masterKey
 * @returns {string | null}
 */
export function parseMasterRecordAbmDefinitionId(masterKey) {
  if (typeof masterKey !== "string" || !masterKey.startsWith(MASTER_RECORD_ABM_PREFIX)) {
    return null;
  }
  const id = masterKey.slice(MASTER_RECORD_ABM_PREFIX.length);
  return id || null;
}

/**
 * @param {string | null | undefined} masterKey
 */
export function isMasterRecordsNavScope(masterKey) {
  return masterKey === "masterRecords" || parseMasterRecordAbmDefinitionId(masterKey) != null;
}
