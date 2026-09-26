"use client";

import { Settings, Moon, Sun } from "lucide-react";
import { useState, useEffect } from "react";

export default function Header({ toggleSidebar }: { toggleSidebar: () => void }) {
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const saved = localStorage.getItem("gestor_flujos_theme") || "dark";
    setTheme(saved);
    document.documentElement.dataset.theme = saved;
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    document.documentElement.dataset.theme = newTheme;
    localStorage.setItem("gestor_flujos_theme", newTheme);
  };

  return (
    <header className="app-header">
      <div className="header-start">
        <button 
          type="button" 
          className="menu-toggle" 
          onClick={toggleSidebar}
          aria-label="Alternar menú"
        >
          <span></span><span></span><span></span>
        </button>
        <div className="brand">
          <span className="brand-mark" aria-hidden="true"></span>
          <div>
            <h1>Gestor de flujos</h1>
            <p className="subtitle">Plataforma de orquestación</p>
          </div>
        </div>
      </div>
      <div className="header-actions">
        <button type="button" className="btn btn-ghost btn-sm" title="Configuración IA">
          <Settings size={18} className="text-[var(--accent)]" />
        </button>
        <button 
          type="button" 
          className="theme-toggle" 
          onClick={toggleTheme}
          aria-label="Alternar tema"
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
}
