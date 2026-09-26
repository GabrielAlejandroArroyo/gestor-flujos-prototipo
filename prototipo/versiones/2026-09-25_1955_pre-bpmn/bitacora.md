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

## 2026-09-25 19:45 — Versiones del mock, menú hamburguesa y tema

- Snapshot inmutable: `versiones/2026-09-25_1930_catalogo-lienzo` (menú horizontal, tema oscuro fijo).
- Índice de versiones: `versiones.md` / `versiones.html` (fecha, hora, enlace a cada mock).
- Mock vigente: menú hamburguesa (panel lateral), cierre con Escape o clic fuera; tema claro/oscuro con persistencia (`gestor_flujos_theme_v1`).
- Seguimiento registrado en esta bitácora (MD + HTML).

## 2026-09-25 19:50 — Corrección menú hamburguesa e icono de tema

- Menú lateral movido fuera de `.app`, overlay sin atributo `hidden`, mayor `z-index` y visibilidad explícita al abrir.
- Botón de tema con iconos sol/luna (SVG) en lugar de texto; misma preferencia en `localStorage`.

## 2026-09-25 19:55 — Mock interactivo (bundle y diseñador)

- Scripts empaquetados en `js/bundle.js` (sin módulos ES) para funcionar al abrir `index.html` directamente o con servidor.
- Corrección al arrastrar nodos: ya no se re-renderiza el lienzo en cada clic; panel de propiedades se actualiza al seleccionar.
- IDs con respaldo si `crypto.randomUUID` no está disponible.
- Script opcional `abrir-mock.ps1` para levantar servidor local.
