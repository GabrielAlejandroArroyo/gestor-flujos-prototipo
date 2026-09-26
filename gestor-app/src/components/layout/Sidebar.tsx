"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PenTool, CheckSquare, BarChart } from "lucide-react";

export default function Sidebar({ isOpen }: { isOpen: boolean }) {
  const pathname = usePathname();

  const navItems = [
    { name: "Diseñador de flujo", href: "/", icon: PenTool },
    { name: "Gestión de actividades", href: "/gestion", icon: CheckSquare },
    { name: "Reporte", href: "/reporte", icon: BarChart },
  ];

  return (
    <aside 
      className={`nav-drawer ${isOpen ? "is-open" : ""}`} 
      aria-label="Menú principal"
    >
      <p className="nav-drawer-title">Trabajo</p>
      
      {navItems.map((item) => {
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
