export function toast(message, durationMs = 3200) {
  const root = document.getElementById("toast-root");
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  root.appendChild(el);
  setTimeout(() => el.remove(), durationMs);
}

export function openModal(html, onClose) {
  const root = document.getElementById("modal-root");
  root.hidden = false;
  root.innerHTML = `<div class="modal" role="dialog">${html}</div>`;

  const close = () => {
    root.hidden = true;
    root.innerHTML = "";
    onClose?.();
  };

  root.querySelector("[data-modal-close]")?.addEventListener("click", close);
  root.addEventListener("click", (e) => {
    if (e.target === root) close();
  });

  return { close, root: root.querySelector(".modal") };
}

export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatDateTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-AR");
  } catch {
    return iso;
  }
}
