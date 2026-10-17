"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PenTool, CheckSquare, BarChart, Database, Layers, LogIn, Plug, Clapperboard } from "lucide-react";

const DESIGNER_SUB_ITEMS = [
  { name: "Catálogo de flujos", href: "/" },
  { name: "Catálogo de actividades", href: "/catalogo/actividades" },
] as const;

/**
 * Sidebar principal con grupo «Diseñador de flujo» y submenús de catálogo.
 */
export default function Sidebar({ isOpen }: { isOpen: boolean }) {
  const pathname = usePathname();

  const isDesignerRoute =
    pathname === "/" || pathname.startsWith("/catalogo");

  const otherNavItems = [
    { name: "Gestión de actividades", href: "/gestion", icon: CheckSquare },
    { name: "Maestros", href: "/maestros", icon: Layers },
    { name: "Reporte", href: "/reporte", icon: BarChart },
    { name: "Datos", href: "/datos", icon: Database },
    { name: "Integración", href: "/integracion", icon: Plug },
    { name: "Casos de uso", href: "/e2e", icon: Clapperboard },
    { name: "Login", href: "/login", icon: LogIn },
  ];

  return (
    <aside
      className={`nav-drawer ${isOpen ? "is-open" : ""}`}
      aria-label="Menú principal"
    >
      <p className="nav-drawer-title">Trabajo</p>

      <div className="nav-group" data-nav-group="designer">
        <Link
          href="/"
          className={`nav-btn nav-group-toggle ${isDesignerRoute ? "is-active" : ""}`}
          aria-expanded={isDesignerRoute}
        >
          <PenTool size={20} className="nav-icon" />
          Diseñador de flujo
        </Link>
        <div className="nav-sub" id="nav-designer-sub">
          {DESIGNER_SUB_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-btn nav-sub-btn ${isActive ? "is-active" : ""}`}
              >
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>

      {otherNavItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-btn ${isActive ? "is-active" : ""}`}
          >
            <Icon size={20} className="nav-icon" />
            {item.name}
          </Link>
        );
      })}

      <div className="nav-drawer-footer">
        <Link href="/docs">Documentación</Link>
        <Link href="/bitacora">Bitácora</Link>
      </div>
    </aside>
  );
}
