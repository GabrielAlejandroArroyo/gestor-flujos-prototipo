/**
 * Reglas de viewport para el diseñador de flujos (móvil bloqueado, avisos por resolución).
 */

export const DESIGNER_MIN_WIDTH = 801;
export const DESIGNER_MIN_HEIGHT = 601;

export const DESIGNER_RECOMMENDED_WIDTH = 1024;
export const DESIGNER_RECOMMENDED_HEIGHT = 768;

/** @returns {boolean} */
export function isMobileDesignerContext() {
  if (typeof window === "undefined") return false;
  const narrowPhone = window.matchMedia("(max-width: 767px)").matches;
  const coarseTablet =
    window.matchMedia("(pointer: coarse)").matches &&
    window.matchMedia("(max-width: 1023px)").matches;
  return narrowPhone || coarseTablet;
}

/** @returns {boolean} */
export function isDesignerViewportTooSmall() {
  if (typeof window === "undefined") return false;
  return window.innerWidth <= 800 || window.innerHeight <= 600;
}

/** @returns {boolean} */
export function isDesignerEditorBlocked() {
  return isMobileDesignerContext() || isDesignerViewportTooSmall();
}

/** @returns {boolean} */
export function isTabletDesignerContext() {
  if (typeof window === "undefined") return false;
  if (isMobileDesignerContext()) return false;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const tabletWidth =
    window.innerWidth >= 768 &&
    window.innerWidth <= 1023 &&
    window.matchMedia("(min-width: 768px)").matches;
  return coarse || tabletWidth;
}

/**
 * @returns {'blocked' | 'critical' | 'tabletWarn' | 'ok'}
 */
export function getDesignerViewportTier() {
  if (isDesignerEditorBlocked()) return "blocked";
  const w = window.innerWidth;
  const h = window.innerHeight;
  const belowRecommended = w < DESIGNER_RECOMMENDED_WIDTH || h < DESIGNER_RECOMMENDED_HEIGHT;
  if (belowRecommended) return "critical";
  if (isTabletDesignerContext()) return "tabletWarn";
  return "ok";
}

/** @returns {{ title: string; body: string }} */
export function designerBlockedMessage() {
  if (isMobileDesignerContext()) {
    return {
      title: "Diseñador de flujo no disponible en este dispositivo",
      body:
        "Esto no se puede hacer en tu dispositivo. Para editar flujos necesitás una pantalla más grande: usá una tablet en horizontal (1024×768 o más) o una computadora.",
    };
  }
  return {
    title: "Pantalla demasiado pequeña para diseñar",
    body:
      "El diseñador requiere una ventana mayor a 800×600 píxeles. Ampliá la ventana del navegador o usá una tablet horizontal / computadora con al menos 1024×768 recomendados.",
  };
}

/** @returns {string} */
export function designerCriticalMessage() {
  return "Gran problema: tu resolución es inferior a 1024×768. Podés intentar diseñar, pero la experiencia será muy limitada. Recomendamos un monitor más grande o maximizar la ventana.";
}

/** @returns {string} */
export function designerTabletWarnMessage() {
  return "Estás en tablet (o pantalla táctil grande): podés diseñar, pero es probable que tengas problemas de diseño y visualización en el lienzo, los paneles y el zoom.";
}

/** @returns {string} */
export function designerCatalogCalloutHtml() {
  const tier = getDesignerViewportTier();
  if (tier === "blocked") {
    const { body } = designerBlockedMessage();
    return `<div class="catalog-viewport-warning catalog-viewport-warning--blocked" role="alert">${body}</div>`;
  }
  if (tier === "critical") {
    return `<div class="catalog-viewport-warning catalog-viewport-warning--critical" role="status">${designerCriticalMessage()}</div>`;
  }
  if (tier === "tabletWarn") {
    return `<div class="catalog-viewport-warning catalog-viewport-warning--tablet" role="status">${designerTabletWarnMessage()}</div>`;
  }
  return "";
}

/**
 * @returns {string}
 */
export function renderDesignerViewportBannerHtml() {
  const tier = getDesignerViewportTier();
  if (tier === "critical") {
    return `<div class="designer-viewport-banner designer-viewport-banner--critical" role="alert">${designerCriticalMessage()}</div>`;
  }
  if (tier === "tabletWarn") {
    return `<div class="designer-viewport-banner designer-viewport-banner--tablet" role="status">${designerTabletWarnMessage()}</div>`;
  }
  return "";
}
