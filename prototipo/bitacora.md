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

## 2026-09-25 19:55 — Diseñador BPMN (Exclusive Gateway)

- Paleta y formas BPMN: Start Event, User Task, Service Task, Exclusive Gateway, End Event.
- User Task → Sequence Flow `siempre` → gateway; ramas `aceptar` / `rechazar` desde el gateway.
- Motor cruza el gateway tras User Task; traza `gateway`.
- Snapshot `versiones/2026-09-25_1955_pre-bpmn`; storage `gestor_flujos_prototipo_v2`.

## 2026-09-25 20:05 — Menú lateral fijo abierto

- Barra de navegación docked al costado del lienzo (`app-shell`), visible por defecto en escritorio.
- Hamburguesa colapsa/expande la barra; en móvil overlay y cierre al elegir vista.

## 2026-09-25 20:15 — Gobernanza Cursor rules (fase mock)

- Reglas `prototipo-canvas.mdc` y `gestor-flujos-mock.mdc` alineadas al mock en `prototipo/` + snapshots en `versiones/`.
- Documentación: versionado del mock, Auth productiva por definir, anexo checklist Supabase futuro.
- Índice `versiones.md` / `versiones.html`: fila `pre-bpmn` coherente con carpeta `1955_pre-bpmn`; snapshot `2026-09-25_2005_sidebar-docked`.

## 2026-09-25 21:55 — Vista inicial y pantalla completa

- Encuadre automático al abrir flujo; Ajustar centrado; fullscreen con layout flex y refit al cambiar.

## 2026-09-25 21:45 — Pool BPMN vertical, lanes y zoom del lienzo

- Nombre del flujo vertical; lanes con roles; snap de actividades por lane; zoom/pan, ajustar, 100%, pantalla completa.

## 2026-09-25 21:35 — Pool, lanes y Task colapsada

- Pool con nombre del flujo; lanes (rol/perfil) editables; Task genérica colapsada (▾ muestra User/Service con iconos).

## 2026-09-25 21:25 — Context pad: iconos 👤/⚙ en Task

- User Task y Service Task en el pad con persona y engranaje; menú de próximo enlace sin botón flecha.

## 2026-09-25 21:20 — Context pad: descriptores y sin flecha manual

- Etiquetas en cada acción del pad; se quitó ➜ (conexión automática al crear; paleta para unir existentes).

## 2026-09-25 21:10 — Context pad: Task con submenú

- Un botón Task + ▾ (User/Service); clic en Task = User Task; gap extra al append para flechas sin cruzar el pad.

## 2026-09-25 21:00 — Context pad: eliminar elemento

- Botón 🗑 en el context pad para eliminar el nodo seleccionado (misma regla que panel de propiedades: no Start Event).

## 2026-09-25 20:50 — Context pad BPMN (estilo modelador)

- Al seleccionar un nodo: marco punteado, context pad con append (crear+conectar) y enlace ➜ a nodos existentes; ramas A/R en gateway.

## 2026-09-25 20:40 — Eliminar flujos en borrador

- Catálogo y editor: botón **Eliminar** solo si el flujo está en borrador; confirmación y bloqueo si hay instancias en curso.

## 2026-09-25 20:35 — Diseñador: puertos, paleta BPMN y líneas clásicas

- Flujo nuevo con Start Event y End Event por defecto.
- Paleta con iconos, Task (User/Service), herramientas Sequence / Message / Association.
- Puertos de conexión en el nodo seleccionado; `lineType` en transiciones; motor y validación solo Sequence Flow.

## 2026-09-26 — Pulido UX/UI (Pages)

- Inter, tokens, navegación con iconos, page headers, catálogo/tabla moderna, estudio con tiles y preview enmarcado, gestión/reporte con KPIs.

## 2026-09-26 — Repo personal + GitHub Pages

- Cuenta **GabrielAlejandroArroyo**; deploy Actions desde `prototipo/` (sin Accusys/Supabase org).
- Guía personal: [DESPLIEGUE.md](../DESPLIEGUE.md) en la raíz del repo.

## 2026-09-26 00:05 — Estudio Pantalla + Automatización (contratos e integraciones)

- Tabs Camino / Pantalla / Automatización; módulos `contracts.js`, `integrations.js`, `designer-studio.js`.
- Formularios ampliados en User Task; Service Task REST mock + catálogo SOAP/GraphQL/conector simulado.
- `instance.context`, trazas `integration_*`, storage v3 con migración desde v2.

## 2026-09-25 23:45 — Context pad axis-aligned (gateway)

- Rombo BPMN en `.gateway-node-shape`; context pad y selección en contenedor sin rotate.
- Regla UX: overlays axis-aligned (menús sin heredar rotación BPMN).

## 2026-09-25 23:35 — Lanes verticales, pool responsive y copy móvil

- Títulos de lane en vertical (44px); `LANE_TITLE_W` alineado con CSS.
- `resolveLaneContentWidth`: contenido de lane 520–960px según viewport; re-encuadre y reclamp al resize.
- Mensaje bloqueo móvil: «Esto no se puede hacer en tu dispositivo…».

## 2026-09-25 23:20 — Paneles laterales colapsados (canvas-first)

- Elementos BPMN y Propiedades ocultos por defecto; lienzo a ancho completo.
- Toggles Elementos/Propiedades visibles en la barra del canvas (escritorio y tablet).
- Escritorio: flyouts absolutos; móvil/tablet estrecha: paneles bajo el canvas.
- Selección de nodo abre Propiedades en cualquier ancho; cierre con delegación tras refresh parcial del panel.

## 2026-09-25 23:05 — Bloqueo móvil y avisos por resolución (diseñador)

- Móvil / viewport ≤800×600: editor bloqueado; catálogo sin Abrir/Nuevo.
- PC &lt;1024×768: banner «gran problema»; tablet ≥1024×768: advertencia de visualización.
- Módulo `designer-viewport.js`; re-render al redimensionar ventana.

## 2026-09-25 22:55 — Diseñador responsive y secciones colapsadas

- Paleta BPMN en acordeón (Eventos y actividades, Líneas); propiedades con todas las secciones cerradas por defecto.
- Móvil: lienzo prioritario; toggles Elementos/Propiedades; paneles con scroll y cierre.

## 2026-09-25 22:40 — Start/End Event dentro del pool

- Start y End Event acotados al contenido del pool (lanes); lanes distintos permitidos.
- Validación al marcar listo; módulo compartido `pool-geometry.js`.

## 2026-09-25 22:25 — Catálogo de compuertas BPMN (solo exclusiva activa)

- Paleta y context pad: submenú Gateway con siete tipos (etiquetas en español); solo **Compuerta Exclusiva** creable; resto deshabilitado con badge Futuro.
- Nodos `gateway` con `gatewayType`; propiedades muestran selector de tipo (solo exclusiva seleccionable).

## 2026-09-25 22:10 — Panel Propiedades: acordeón y scroll interno

- Secciones colapsables (`<details>`): **General** abierta por defecto al seleccionar nodo; conexiones, datos de entrada, parámetros Start y pool/lanes cerrados.
- Contenedor `.props-panel-scroll` en la columna Propiedades; altura acotada del diseñador en desktop con scroll interno (sin desbordar la shell).

## 2026-09-25 20:20 — Limpieza repo y regeneración del mock

- Reglas de app Next/Supabase productiva archivadas localmente (fuera de este repo Git).
- `README.md` en raíz con instrucciones de Pages y regla platino (`PLATINO.md`).
- Script `build-mock.ps1`; bundles regenerados (`bundle.js`, `theme-bundle.js`).
- Footer del mock: solo enlaces HTML a documentación, bitácora y versiones.
