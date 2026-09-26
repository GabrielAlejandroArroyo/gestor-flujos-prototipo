export function bindNavDrawer(onNavigate) {
  const drawer = document.getElementById("nav-drawer");
  const overlay = document.getElementById("nav-overlay");
  const toggle = document.getElementById("menu-toggle");

  const setOpen = (open) => {
    drawer?.classList.toggle("is-open", open);
    overlay?.classList.toggle("is-open", open);
    drawer?.setAttribute("aria-hidden", open ? "false" : "true");
    toggle?.setAttribute("aria-expanded", open ? "true" : "false");
    toggle?.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    document.body.classList.toggle("nav-open", open);
  };

  const close = () => setOpen(false);
  const open = () => setOpen(true);

  setOpen(false);

  toggle?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (drawer?.classList.contains("is-open")) close();
    else open();
  });

  overlay?.addEventListener("click", close);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });

  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      onNavigate(btn.dataset.view);
      close();
    });
  });

  return { close };
}
