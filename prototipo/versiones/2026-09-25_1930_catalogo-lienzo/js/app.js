import { loadState, saveState } from "./storage.js";
import { ensureSeed } from "./seed.js";
import { renderDesigner } from "./designer.js";
import { renderGestion } from "./gestion.js";
import { renderReporte } from "./reporte.js";

let state = ensureSeed(loadState());
let currentView = "designer";

const mainEl = document.getElementById("app-main");

function persist() {
  saveState(state);
}

function render() {
  if (currentView === "designer") renderDesigner(mainEl, state, persist);
  if (currentView === "gestion") renderGestion(mainEl, state, persist);
  if (currentView === "reporte") renderReporte(mainEl, state);
}

document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    currentView = btn.dataset.view;
    render();
  });
});

render();
