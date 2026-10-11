/**
 * Botones de acción solo icono (estándar en tablas, headers y toolbars).
 */
import { escapeHtml } from "./ui.js";

/** @type {Record<string, string>} */
const ACTION_ICON_SVG = {
  edit: `<path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round"/>`,
  delete: `<path d="M4 7h16M9 7V5h6v2M10 11v6M14 11v6M6 7l1 12h10l1-12" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>`,
  save: `<path d="M5 5h11l3 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" stroke-width="1.75"/><path d="M8 5v5h8V5M8 19v-5h8v5" fill="none" stroke="currentColor" stroke-width="1.75"/>`,
  add: `<path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>`,
  import: `<path d="M12 3v12M8 11l4 4 4-4M5 21h14" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>`,
  history: `<path d="M3 12a9 9 0 1 0 3-6.7" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/><path d="M3 4v5h5" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>`,
  open: `<path d="M14 3h7v7M10 14 21 3M5 7H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-1" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>`,
  close: `<path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>`,
  cancel: `<path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>`,
  back: `<path d="M19 12H5M12 19l-7-7 7-7" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>`,
  activate: `<path d="M9 12l2 2 4-4M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>`,
  version: `<path d="M8 8H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-3M16 3h5v5M10 14 21 3" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>`,
  download: `<path d="M12 3v12M8 11l4 4 4-4M5 21h14" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>`,
  view: `<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" fill="none" stroke="currentColor" stroke-width="1.75"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.75"/>`,
  refresh: `<path d="M21 12a9 9 0 0 0-15-6.7M3 12a9 9 0 0 0 15 6.7M3 4v5h5M21 20v-5h-5" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>`,
  play: `<path d="M8 5v14l11-7L8 5z" fill="currentColor"/>`,
  send: `<path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round"/>`,
  manage: `<path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" fill="none" stroke="currentColor" stroke-width="1.75"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 3.6 15a1.65 1.65 0 0 0-1.51-1H2a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 3.6 8a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 8 3.6a1.65 1.65 0 0 0 1-1.51V2a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 8c.36 0 .7.07 1 .2H21a2 2 0 1 1 0 4h-.09c-.7 0-1.34.37-1.51 1z" fill="none" stroke="currentColor" stroke-width="1.25"/>`,
  meta: `<path d="M12 8v4M12 16h.01M4 6h16v12H4V6z" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>`,
  link: `<path d="M10 13a5 5 0 0 0 7.54.54l2-2a5 5 0 0 0-7.07-7.07l-1.3 1.3M14 11a5 5 0 0 0-7.54-.54l-2 2a5 5 0 0 0 7.07 7.07l1.3-1.3" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>`,
  chevronUp: `<path d="M6 15l6-6 6 6" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>`,
  chevronDown: `<path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>`,
  logout: `<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>`,
  user: `<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>`,
  sparkles: `<path d="M12 3l1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3zM5 16l.8 2.5L8 19l-2.2.7L5 22l-.8-2.3L2 19l2.2-.7L5 16z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>`,
  zoomIn: `<path d="M11 11l4 4M10 7v6M7 10h6M21 21l-4.35-4.35" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>`,
  zoomOut: `<path d="M11 11l4 4M7 10h6M21 21l-4.35-4.35" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>`,
  fit: `<path d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>`,
  fullscreen: `<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>`,
  start: `<path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>`,
  arrowRight: `<path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>`,
  accept: `<path d="M9 12l2 2 4-4M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>`,
  reject: `<path d="M15 9l-6 6M9 9l6 6M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>`,
};

/**
 * @param {string} name
 */
export function actionIconSvg(name) {
  const inner = ACTION_ICON_SVG[name];
  if (!inner) return "";
  return `<svg class="action-icon-svg" viewBox="0 0 24 24" aria-hidden="true">${inner}</svg>`;
}

/**
 * @param {Record<string, string | number | boolean | null | undefined>} attrs
 */
function serializeDataAttributes(attrs) {
  return Object.entries(attrs)
    .filter(([, v]) => v != null && v !== false)
    .map(([key, val]) => {
      const attr = key.startsWith("data-") ? key : `data-${key}`;
      return `${attr}="${escapeHtml(String(val))}"`;
    })
    .join(" ");
}

/**
 * @param {{
 *   icon: string;
 *   label: string;
 *   variant?: "" | "primary" | "danger" | "success" | "ghost";
 *   size?: "sm" | "md";
 *   disabled?: boolean;
 *   type?: "button" | "submit";
 *   id?: string;
 *   className?: string;
 *   badge?: string | number;
 *   data?: Record<string, string | number | boolean | null | undefined>;
 *   extraAttrs?: string;
 * }} opts
 */
export function renderActionButton(opts) {
  const {
    icon,
    label,
    variant = "",
    size = "sm",
    disabled = false,
    type = "button",
    id = "",
    className = "",
    badge,
    data = {},
    extraAttrs = "",
  } = opts;

  const variantClass = variant ? ` action-icon-btn--${variant}` : "";
  const sizeClass = size === "md" ? " action-icon-btn--md" : "";
  const badgeClass = badge != null && badge !== "" ? " action-icon-btn--badged" : "";
  const dataStr = serializeDataAttributes(data);
  const badgeHtml =
    badge != null && badge !== ""
      ? `<span class="action-icon-btn__badge">${escapeHtml(String(badge))}</span>`
      : "";

  const classes = `action-icon-btn${variantClass}${sizeClass}${badgeClass}${className ? ` ${className}` : ""}`.trim();

  return `<button type="${type}" class="${classes}" ${
    id ? `id="${escapeHtml(id)}"` : ""
  } title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}" ${disabled ? "disabled" : ""} ${dataStr} ${extraAttrs}>${actionIconSvg(icon)}${badgeHtml}</button>`;
}

/** Botón cerrar modal (data-modal-close). */
export function renderModalCloseButton(label = "Cerrar") {
  return renderActionButton({
    icon: "close",
    label,
    extraAttrs: "data-modal-close",
  });
}
