const DOCKED_MQ = window.matchMedia("(min-width: 768px)");

function isDockedNav() {
  return DOCKED_MQ.matches;
}

function isNavOpen(drawer, shell) {
  if (isDockedNav()) {
    return !shell?.classList.contains("is-nav-collapsed");
  }
  return drawer?.classList.contains("is-open") ?? false;
}

function syncToggleA11y(toggle, open) {
  toggle?.setAttribute("aria-expanded", open ? "true" : "false");
  toggle?.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
}

export function bindNavDrawer(onNavigate) {
  const shell = document.getElementById("app-shell");
  const drawer = document.getElementById("nav-drawer");
  const overlay = document.getElementById("nav-overlay");
  const toggle = document.getElementById("menu-toggle");

  const setOpen = (open) => {
    drawer?.classList.toggle("is-open", open);
    drawer?.setAttribute("aria-hidden", open ? "false" : "true");

    if (isDockedNav()) {
      shell?.classList.toggle("is-nav-collapsed", !open);
      overlay?.classList.remove("is-open");
      document.body.classList.remove("nav-open");
    } else {
      overlay?.classList.toggle("is-open", open);
      document.body.classList.toggle("nav-open", open);
    }

    syncToggleA11y(toggle, open);
  };

  const close = () => setOpen(false);
  const open = () => setOpen(true);

  setOpen(true);

  toggle?.addEventListener("click", (e) => {
    e.stopPropagation();
    setOpen(!isNavOpen(drawer, shell));
  });

  overlay?.addEventListener("click", () => {
    if (!isDockedNav()) close();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !isDockedNav()) close();
  });

  DOCKED_MQ.addEventListener("change", () => {
    const openNow = isNavOpen(drawer, shell);
    setOpen(openNow);
  });

  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      onNavigate(btn.dataset.view);
      if (!isDockedNav()) close();
    });
  });

  return { close, open };
}
