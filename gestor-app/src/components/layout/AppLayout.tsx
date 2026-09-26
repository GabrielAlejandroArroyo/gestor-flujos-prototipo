"use client";

import { useState } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="app">
      <Header toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
      <div className="app-shell" id="app-shell">
        <div 
          className="nav-overlay" 
          id="nav-overlay" 
          aria-hidden={!isSidebarOpen}
          onClick={() => setIsSidebarOpen(false)}
        ></div>
        <Sidebar isOpen={isSidebarOpen} />
        <main id="app-main" className="app-main">
          {children}
        </main>
      </div>
      <footer className="app-footer">
        <a href="/docs">Documentación</a>
        ·
        <a href="/bitacora">Bitácora</a>
        ·
        <a href="/versiones">Versiones</a>
      </footer>
    </div>
  );
}
