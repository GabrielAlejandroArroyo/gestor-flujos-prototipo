# Bitácora — cambios pedidos sobre el mock

Historial de decisiones y pedidos. Cada entrada se conserva; no se borran las anteriores.

- Versión HTML: [bitacora.html](./bitacora.html)
- Documentación: [documentacion.md](./documentacion.md) · [documentacion.html](./documentacion.html)

---

## 2026-09-25 — Versión inicial del plan

Diseñador de flujos, motor de instancias y documentador integrados en el concepto.

## 2026-09-25 — Iteración de alcance

Mock y documentación en carpeta `prototipo`. Menú: Diseñador de flujo, Gestión de actividades, Reporte. Diseñador de pantallas para actividades manuales.

## 2026-09-25 — Implementación del prototipo

Entrega HTML/CSS/JS con catálogo, lienzo con arrastre, validación, pantallas, instanciación múltiple, motor con traza y reporte filtrable.

## 2026-09-25 — Arquitectura objetivo (stack productivo)

Definición de implementación futura (mock sigue vigente):

- **Presentación:** Next.js, React 19, App Router, Server Components, Tailwind, responsive, idiomas ES/EN/PT.
- **Negocio:** API Routes (API First), reglas centralizadas, validación Zod, Supabase Auth.
- **Datos:** Postgres Supabase; schemas por dominio; RLS; backup y monitoreo en cloud.

## 2026-09-25 — Supabase local y migraciones

Al implementar: entorno **Supabase local en Docker** (`supabase start`); esquema y RLS solo vía **migraciones del CLI** (`supabase/migrations`). Cloud después, mismo historial de migraciones.

## 2026-09-25 — Documentación y bitácora en MD y HTML

Documentación (`documentacion.md` / `documentacion.html`) y bitácora (`bitacora.md` / `bitacora.html`) con el mismo contenido en ambos formatos. El mock enlaza a las versiones HTML.
