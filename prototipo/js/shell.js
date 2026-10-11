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

  function isReportView(view) {
    return typeof view === "string" && view.startsWith("report-");
  }

  function setNavActive(view, catalog, master) {
    const designerGroup = document.querySelector('[data-nav-group="designer"]');
    const maestrosGroup = document.querySelector('[data-nav-group="maestros"]');
    const operacionesGroup = document.querySelector('[data-nav-group="operaciones"]');
    const reportesGroup = document.querySelector('[data-nav-group="reportes"]');
    document.querySelectorAll(".nav-btn[data-view]").forEach((b) => b.classList.remove("is-active"));

    if (view === "designer") {
      const cat = catalog === "activities" ? "activities" : "flows";
      designerGroup?.querySelector(".nav-group-toggle")?.classList.add("is-active");
      designerGroup?.querySelectorAll(".nav-sub-btn").forEach((b) => {
        b.classList.toggle("is-active", b.dataset.catalog === cat);
      });
    } else if (view === "maestros") {
      const m = master === "entities" ? "entities" : "flowTypes";
      maestrosGroup?.querySelector(".nav-group-toggle")?.classList.add("is-active");
      maestrosGroup?.querySelectorAll(".nav-sub-btn").forEach((b) => {
        b.classList.toggle("is-active", b.dataset.master === m);
      });
    } else if (
      view === "gestion" ||
      view === "auth-users" ||
      view === "auth-user-detail" ||
      view === "user-profile"
    ) {
      operacionesGroup?.querySelector(".nav-group-toggle")?.classList.add("is-active");
      operacionesGroup?.querySelectorAll(".nav-sub-btn").forEach((b) => {
        const navView = b.dataset.view;
        const active =
          navView === view ||
          (view === "auth-user-detail" && navView === "auth-users");
        b.classList.toggle("is-active", active);
      });
    } else if (isReportView(view) || view === "reporte") {
      const reportView = view === "reporte" ? "report-activities" : view;
      reportesGroup?.querySelector(".nav-group-toggle")?.classList.add("is-active");
      reportesGroup?.querySelectorAll(".nav-sub-btn").forEach((b) => {
        b.classList.toggle("is-active", b.dataset.view === reportView);
      });
    } else {
      document
        .querySelector(
          `.nav-btn[data-view="${view}"]:not([data-catalog]):not([data-master]):not(.nav-sub-btn)`,
        )
        ?.classList.add("is-active");
    }
  }

  document.querySelectorAll(".nav-btn[data-view]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const view = btn.dataset.view;
      const catalog = btn.dataset.catalog ?? "flows";
      const master = btn.dataset.master ?? "flowTypes";
      setNavActive(view, catalog, master);
      if (view === "designer") {
        onNavigate(view, catalog, null);
      } else if (view === "maestros") {
        onNavigate(view, null, master);
      } else {
        onNavigate(view, null, null);
      }
      if (!isDockedNav()) close();
    });
  });

  return { close, open, setNavActive };
}
