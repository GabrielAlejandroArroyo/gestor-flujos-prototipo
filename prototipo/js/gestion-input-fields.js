/**
 * Campos de entrada de instancia (parámetros del Start Event).
 */

import { escapeHtml } from "./ui.js";
import { INPUT_CARDINALITY } from "./component-input-attributes.js";

const HTML_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Fecha local en formato `YYYY-MM-DD` (valor de `<input type="date">`).
 */
export function localTodayHtmlDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Normaliza valores guardados al formato HTML date.
 *
 * @param {unknown} raw
 * @returns {string} `YYYY-MM-DD` o cadena vacía si no es parseable
 */
export function htmlDateFromUnknown(raw) {
  if (raw === null || raw === undefined || raw === "") return "";
  const s = String(raw).trim();
  if (HTML_DATE_RE.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, 10);

  const dmy = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (dmy) {
    const day = dmy[1].padStart(2, "0");
    const month = dmy[2].padStart(2, "0");
    const year = dmy[3];
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  return "";
}

const DATE_PICKER_ICON = `<svg class="date-input-picker-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;

/**
 * @param {string} name
 * @param {string} label
 * @param {boolean} required
 * @param {unknown} prefill
 */
function renderHtmlDateField(name, label, required, prefill) {
  const req = required ? "required" : "";
  const normalized = htmlDateFromUnknown(prefill);
  const value = normalized || localTodayHtmlDate();
  return `
    <div class="form-row form-row--date">
      <label>${escapeHtml(label)}${required ? " *" : ""}</label>
      <div class="date-input-wrap">
        <input type="date" class="input-date-native" name="${name}" ${req} value="${escapeHtml(value)}" />
        <button type="button" class="date-input-picker-btn" data-date-picker-trigger tabindex="-1" aria-label="Abrir calendario">
          ${DATE_PICKER_ICON}
        </button>
      </div>
    </div>`;
}

/**
 * Enlaza el botón de calendario a `showPicker()` en inputs nativos de fecha.
 *
 * @param {ParentNode} root
 */
export function bindNativeDateFields(root) {
  root.querySelectorAll(".date-input-wrap").forEach((wrap) => {
    const input = wrap.querySelector('input[type="date"]');
    const trigger = wrap.querySelector("[data-date-picker-trigger]");
    if (!input || !trigger || trigger.dataset.dateBound === "1") return;
    trigger.dataset.dateBound = "1";

    const openPicker = () => {
      if (typeof input.showPicker === "function") {
        try {
          input.showPicker();
          return;
        } catch {
          /* fallback */
        }
      }
      input.focus();
    };

    trigger.addEventListener("click", (e) => {
      e.preventDefault();
      openPicker();
    });
    input.addEventListener("click", () => {
      if (typeof input.showPicker === "function") {
        try {
          input.showPicker();
        } catch {
          /* ignore */
        }
      }
    });
  });
}

/**
 * @param {object} p
 */
export function renderInstanceParamField(p) {
  const key = escapeHtml(p.key);
  const req = p.required ? "required" : "";
  const cardinality = p.cardinality ?? INPUT_CARDINALITY.UNICO;
  const options = Array.isArray(p.listOptions) ? p.listOptions : [];
  const prefill = p._prefill;

  if (cardinality === INPUT_CARDINALITY.LISTA && options.length > 0) {
    const selected = Array.isArray(prefill) ? prefill.map(String) : [];
    const boxes = options
      .map((o, i) => {
        const id = `${key}_opt_${i}`;
        const val = escapeHtml(o.label);
        const checked = selected.includes(o.label) ? "checked" : "";
        return `<label class="instance-list-option" for="${id}"><input type="checkbox" id="${id}" name="${key}__list" value="${val}" data-opt-required="${o.required ? "1" : "0"}" ${checked} /> ${val}${o.required ? " *" : ""}</label>`;
      })
      .join("");
    return `<div class="form-row form-row--list"><label>${escapeHtml(p.label)}${p.required ? " *" : ""}</label><div class="instance-list-options">${boxes}</div></div>`;
  }

  if (cardinality === INPUT_CARDINALITY.UNICO && options.length > 0) {
    const prefillStr = prefill === null || prefill === undefined ? "" : String(prefill);
    const optsHtml = options
      .map((o) => {
        const val = escapeHtml(o.label);
        const sel = prefillStr === o.label ? "selected" : "";
        return `<option value="${val}" ${sel}>${val}${o.required ? " *" : ""}</option>`;
      })
      .join("");
    const selectReq = p.required ? "required" : "";
    return `<div class="form-row"><label>${escapeHtml(p.label)}</label><select name="${key}" ${selectReq}><option value="">—</option>${optsHtml}</select></div>`;
  }

  const valueAttr =
    prefill !== null && prefill !== undefined && prefill !== ""
      ? ` value="${escapeHtml(String(prefill))}"`
      : "";
  if (p.type === "fecha") {
    return renderHtmlDateField(key, p.label, !!p.required, prefill);
  }

  let input = `<input name="${key}" ${req}${valueAttr} />`;
  if (p.type === "numero") input = `<input type="number" name="${key}" ${req}${valueAttr} />`;
  if (p.type === "si_no") {
    const pre = prefill === null || prefill === undefined ? "" : String(prefill);
    input = `<select name="${key}" ${req}><option value="">—</option><option value="si"${pre === "si" ? " selected" : ""}>Sí</option><option value="no"${pre === "no" ? " selected" : ""}>No</option></select>`;
  }
  return `<div class="form-row"><label>${escapeHtml(p.label)}</label>${input}</div>`;
}

/**
 * @param {object} flow
 */
export function renderInputFieldsHtml(flow) {
  return (flow.inputParams ?? []).map((p) => renderInstanceParamField(p)).join("");
}

/**
 * @param {FormData} fd
 * @param {object} p
 * @returns {{ value: unknown; errors: string[] }}
 */
export function readInstanceParamValue(fd, p) {
  const errors = [];
  const raw = fd.get(p.key);
  const cardinality = p.cardinality ?? INPUT_CARDINALITY.UNICO;
  const options = Array.isArray(p.listOptions) ? p.listOptions : [];

  if (cardinality === INPUT_CARDINALITY.LISTA && options.length > 0) {
    const selected = fd.getAll(`${p.key}__list`).map((v) => String(v));
    if (p.required && selected.length === 0) {
      errors.push(`Campo obligatorio: ${p.label ?? p.key}.`);
    }
    for (const o of options) {
      if (o.required && !selected.includes(o.label)) {
        errors.push(`Opción obligatoria «${o.label}» en ${p.label ?? p.key}.`);
      }
    }
    return { value: selected, errors };
  }

  if (cardinality === INPUT_CARDINALITY.UNICO && options.length > 0) {
    const val = raw === null || raw === undefined ? "" : String(raw);
    if (p.required && !val.trim()) {
      errors.push(`Campo obligatorio: ${p.label ?? p.key}.`);
    }
    return { value: val, errors };
  }

  let val = raw;
  if (p.type === "numero" && val !== "" && val !== null) val = Number(val);
  if (val === null || val === undefined) val = "";
  if (p.required && !String(val).trim()) {
    errors.push(`Campo obligatorio: ${p.label ?? p.key}.`);
  }
  return { value: val, errors };
}
