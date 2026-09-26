# Documentación del prototipo — Gestor de flujos

Modelo conceptual, diagrama entidad-relación y **arquitectura objetivo** para la implementación futura. El mock HTML sigue vigente; no sustituye a la app Next.js.

- Versión HTML: [documentacion.html](./documentacion.html)
- Bitácora de cambios: [bitacora.md](./bitacora.md) · [bitacora.html](./bitacora.html)

---

## Propósito

Este prototipo HTML valida el diseño de un gestor de flujos de trabajo antes de implementarlo con Supabase. Separa la **definición** del flujo (diseñador) de la **ejecución** (instancias, traza y reporte).

## Menú del mock

- **Diseñador de flujo (BPMN):** catálogo (crear, abrir, **eliminar solo en borrador**), lienzo con subconjunto BPMN 2.0, parámetros en Start Event, Sequence Flow y pantallas en User Task.
- **Gestión de actividades:** instanciar flujos listos, resolver tareas manuales (Aceptar/Rechazar) y ejecutar automáticas.
- **Reporte:** avance, filtros y traza de cada instancia.

## Entidades (modelo conceptual)

| Entidad | Descripción |
|---------|-------------|
| **TipoFlujo** | Categoría (texto libre en el mock, ej. Aprobación). |
| **Flujo** | Tipo, nombre, descripción, estado (borrador \| listo), versión. |
| **ParametroEntrada** | Clave, etiqueta, tipo (texto, numero, fecha, si_no), obligatorio. |
| **Nodo** | BPMN: Start Event (`inicio`), User Task (`manual`), Service Task (`automatica`), Exclusive Gateway (`gateway`), End Event (`fin`). |
| **Sequence Flow** | Origen, destino, `lineType: sequence`, condición (siempre \| aceptar \| rechazar). **Ejecutable** por el motor. |
| **Message Flow** | Origen, destino, `lineType: message`. Solo diagrama (no ejecuta en Gestión). |
| **Association** | Origen, destino, `lineType: association`. Enlace documental visual. |
| **Pantalla** | Una por User Task. |
| **BloquePantalla** | titulo, texto, dato (solo lectura), comentario; orden definido. |
| **Instancia** | Copia del flujo al iniciar, valores de entrada, estado, paso actual. |
| **PasoInstancia** | Actividad resuelta con decisión y comentario. |
| **Traza** | Eventos inmutables para auditoría y reporte. |

## Diagrama entidad-relación (referencia Supabase)

```
TipoFlujo 1 —— * Flujo
Flujo 1 —— * ParametroEntrada
Flujo 1 —— * Nodo
Flujo 1 —— * Transicion
Nodo * —— * ParametroEntrada  (UsoDato)
Nodo 1 —— 0..1 Pantalla  (solo actividad manual)
Pantalla 1 —— * BloquePantalla
ParametroEntrada 1 —— * BloquePantalla  (bloques tipo dato)
Flujo 1 —— * Instancia
Instancia 1 —— * PasoInstancia
Nodo 1 —— * PasoInstancia
Instancia 1 —— * Traza
```

## Tablas sugeridas (implementación futura)

Schemas por dominio en Postgres (`flujo`, `ejecucion`; Auth en schema de Supabase):

```
flujo.flujos (id, tipo, nombre, descripcion, estado, version, created_at)
flujo.parametros_entrada (id, flujo_id, clave, etiqueta, tipo, obligatorio)
flujo.nodos (id, flujo_id, kind, nombre, descripcion, pos_x, pos_y)
flujo.nodo_parametros (nodo_id, parametro_id)
flujo.transiciones (id, flujo_id, from_nodo_id, to_nodo_id, condicion)
flujo.pantallas (id, nodo_id)
flujo.bloques_pantalla (id, pantalla_id, orden, tipo, texto, parametro_id)
ejecucion.instancias (id, flujo_id, flujo_snapshot jsonb, estado, input_values jsonb, current_nodo_id, started_at, finished_at, created_by)
ejecucion.pasos_instancia (id, instancia_id, nodo_id, estado, comentario, at)
ejecucion.trazas (id, instancia_id, tipo, mensaje, decision, comentario, data_shown jsonb, at)
```

## Persistencia del mock

| Clave | Uso |
|-------|-----|
| `gestor_flujos_prototipo_v2` | Flujos, instancias y traza |
| `gestor_flujos_theme_v1` | Tema claro / oscuro |

Flujo de ejemplo «Aprobación de gasto» con User Task → XOR Gateway.

## Procedimiento de versionado del mock

- **Mock editable:** carpeta [`prototipo/`](./) (`index.html`, `css/`, `js/`).
- **Snapshots congelados:** [`prototipo/versiones/YYYY-MM-DD_HHmm_etiqueta/`](./versiones/) — no editar después de publicados.
- **Índice:** [versiones.md](./versiones.md) · [versiones.html](./versiones.html).
- Antes de un cambio grande: copiá el mock vigente a una nueva carpeta bajo `versiones/`, actualizá el índice y registrá el hito en [bitacora.md](./bitacora.md).
- Tras cambiar fuentes en `js/`, ejecutá [`build-mock.ps1`](./build-mock.ps1).

## Estructura del repositorio (fase mock)

En la raíz del repo: [`prototipo/`](./) (app), [`README.md`](../README.md), workflow de GitHub Pages y [`PLATINO.md`](../PLATINO.md).

La versión SemVer de la app productiva (`lib/version.ts`) aplica solo cuando exista Next.js; en fase mock usá etiquetas de snapshot.

## Subconjunto BPMN 2.0 (mock)

| BPMN | kind | Reglas |
|------|------|--------|
| Start Event | `inicio` | Parámetros de entrada; una salida `siempre`. |
| User Task | `manual` | Pantalla; una salida `siempre` hacia un gateway. |
| Exclusive Gateway | `gateway` | Entradas ≥1; salidas `aceptar` y `rechazar`. |
| Service Task | `automatica` | Una salida `siempre`. |
| End Event | `fin` | Sin salidas. |

Al completar un User Task, el motor sigue el Sequence Flow `siempre` y cruza el gateway con la decisión Aceptar/Rechazar (traza `gateway`).

### Líneas BPMN en el diseñador

| Tipo | Ejecuta en Gestión | Cómo crear |
|------|-------------------|------------|
| Sequence Flow | Sí | Puertos del nodo seleccionado, herramienta Sequence Flow o panel Propiedades |
| Message Flow | No | Herramienta Message Flow + clic origen→destino o puerto |
| Association | No | Herramienta Association + clic origen→destino o puerto |

Un flujo nuevo incluye **Start Event** y **End Event** en el lienzo.

### Estudio de diseño (Camino · Pantalla · Automatización)

Dentro del **Diseñador de flujo**, con un nodo seleccionado:

- **Camino:** lienzo BPMN (pool, lanes, conexiones) — vista por defecto.
- **Pantalla:** User Task — diseñador de formularios (componentes, vista previa, salidas a `context` de instancia).
- **Automatización:** Service Task — adaptadores **REST/JSON** (mock o live con advertencias CORS), **SOAP/XML**, **GraphQL** y **conectores** (simulados en v1), mappings de request/response y **Probar contrato**.

Contratos de datos: `inputParams` / `dataDefinitions`, mappings por nodo e **`instance.context`** acumulado en Gestión y Reporte. No se guardan secretos en el navegador (`credentialRef` solo como referencia).

### Context pad (estilo modelador)

**Requisitos de pantalla para diseñar flujos:** en **móvil / teléfono no está permitido** abrir el editor (catálogo sí). Verás el mensaje *«Esto no se puede hacer en tu dispositivo…»* y debés usar tablet horizontal (1024×768+) o computadora. Mínimo técnico **>800×600**; recomendado **≥1024×768**. Por debajo de 1024×768 en PC verás aviso de **gran problema**; en **tablet ≥1024×768** podés diseñar con advertencia de limitaciones de visualización.

El diseñador es **canvas-first** en todo ancho permitido: al abrir un flujo ves solo el **lienzo** (zoom, pool/lanes). En la barra del canvas, **Elementos** y **Propiedades** abren los paneles laterales bajo demanda (mutuamente excluyentes). Al **seleccionar un nodo**, se abre **Propiedades** automáticamente.

En **escritorio (≥960px)** los paneles son **flyouts** sobre el lienzo (no columnas fijas). En **≤959px** aparecen debajo del canvas (altura máx. ~42vh). Cerrá con **×** o volvé a pulsar el toggle.

La **paleta BPMN** y el panel **Propiedades** usan **secciones colapsables** (cerradas por defecto): expandí «Eventos y actividades», «Líneas», «General», conexiones, etc. Scroll interno en cada panel.

**Compuertas (Gateway):** paleta, context pad y propiedades listan las siete compuertas BPMN (paralela, exclusiva, inclusiva, basadas en eventos, compleja). Solo **Compuerta Exclusiva** está habilitada (`gatewayType: exclusive`); el resto muestra badge **Futuro**. Motor y validación siguen modelando XOR con salidas `aceptar` / `rechazar`.

**Start Event** y **End Event** deben permanecer **dentro del pool** (área de lanes del flujo); pueden estar en **lanes distintos** (roles/grupos), pero el diseñador no permite sacarlos del recuadro del diagrama.

Al seleccionar un nodo aparece un **context pad** (próximo elemento). Los menús del pad permanecen **horizontales o verticales** (regla de oro UX): en gateways el rombo rota solo la forma visual; el pad no hereda inclinación. El lienzo usa **pool BPMN**: nombre del flujo **en vertical** a la izquierda; cada **lane** muestra rol, grupo o perfil con **título vertical** (misma convención que el pool). El ancho útil del pool se **ajusta al viewport de escritorio** (520–960px de contenido por lane) para que el diagrama **encuadre** al abrir y al redimensionar la ventana. Actividades clasificadas por lane (arrastre o propiedades). Al **abrir un flujo**, el diagrama se **encuadra automáticamente** (centrado en el panel). Barra de vista: Zoom +/−, 100%, Ajustar, Pantalla completa (reajusta al entrar/salir); **arrastrá el fondo vacío** para mover el diagrama. Ctrl + rueda: zoom.

---

## Arquitectura objetivo (implementación futura)

El mock no se reemplaza hasta validar UX; la app productiva sigue este stack en **tres capas**:

```
Presentación (Next.js / React 19)
        │  API First (fetch)
        ▼
Negocio (API Routes + Zod + reglas centralizadas)
        │  Supabase client / service role según caso
        ▼
Datos (Postgres Supabase — local primero, cloud después)
```

### Capa de presentación

- **Next.js** con **React 19**, **App Router** y **Server Components**.
- **Tailwind CSS**, diseño **responsive** (escritorio y móvil).
- **Multi idioma ES / EN / PT** (rutas o preferencia; textos fuera de componentes hardcodeados).
- Pantallas equivalentes al mock: diseñador de flujo (incl. diseñador de pantallas manuales), gestión de actividades, reporte.

### Capa de negocio (API First)

- **Route Handlers** de Next.js como única puerta de reglas de negocio.
- Reglas alineadas al prototipo:
  - [js/validation.js](./js/validation.js) — grafo válido, pantallas en manuales, datos de entrada.
  - [js/motor.js](./js/motor.js) — instancias, aceptar/rechazar, automáticas, traza.
- Validación de contratos con **Zod** (entrada/salida de API).

### Autenticación productiva (por definir)

Al iniciar la app Next.js hay que **elegir un solo modelo** y alinear documentación y reglas:

| Opción | Implicación |
|--------|-------------|
| Supabase Auth | RLS con `auth.uid()`; sesión nativa de Supabase. |
| OIDC / NextAuth (Azure AD u otro IdP) | API Routes con service role; política de sesión en la app Next. |

Hasta esa decisión, el mock no implementa login. La documentación anterior mencionaba Supabase Auth como referencia; no es un compromiso cerrado.

### Capa de datos

- **Primera implementación: Supabase local** vía **Supabase CLI** y **Docker** (`supabase start`: Postgres, Auth, REST, Studio).
- **Migraciones Supabase** como única fuente de verdad del esquema (`supabase/migrations`, `supabase migration new`, `supabase db reset` / `supabase migration up`). RLS incluida en migraciones.
- Schemas: `flujo`, `ejecucion`; sin duplicar usuarios fuera de Auth.
- **Supabase Cloud** después, con el mismo historial de migraciones.
- Local: respaldo por volúmenes Docker y dumps del CLI. Cloud: backups y monitoreo de la plataforma.

### Flujo de evolución

```
Mock HTML (actual) → Implementación pedida → Supabase local + migraciones → Supabase Cloud
```

## Anexo — Checklist Supabase (fase futura)

Cuando exista `supabase/migrations/` en un repo de implementación futura, **todo cambio DDL** debe versionarse en Git:

1. Nunca DDL suelto (SQL Editor) sin archivo en `supabase/migrations/`.
2. `npx supabase migration new <nombre_snake_case>`.
3. Validar con scripts del proyecto antes de push.
4. Aplicar en entorno de desarrollo: `npx supabase db push`.
5. Regenerar tipos TypeScript del esquema.
6. Verificación de lint/types en CI.
7. Commitear juntos: migración + tipos + código dependiente.
8. No aplicar DDL en producción desde el IDE; solo merge Git + deploy controlado.

Guía de setup prevista: `docs/setup/supabase-setup.md` (a crear al inicializar Supabase).

## Fuera de alcance (fase mock actual)

- Proyecto Next.js, Tailwind, i18n, Zod y cliente Supabase.
- Docker / `supabase init` / migraciones (hasta pedir implementar).
- Asignación por usuario/rol, acciones automáticas reales (email, webhooks).
- Diseñador avanzado (zoom, minimapa, undo ilimitado).
