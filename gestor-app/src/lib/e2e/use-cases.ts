/**
 * Catálogo de casos de uso E2E.
 * Fuente única: Playwright (título UC-*) y la página /e2e.
 */

export type UserPersona =
  | "visitante"
  | "analista"
  | "operador"
  | "administrador"
  | "integrador";

export interface UseCaseDefinition {
  id: string;
  title: string;
  persona: UserPersona;
  personaLabel: string;
  route: string;
  perspective: string;
  steps: string[];
  expected: string;
  spec: string;
}

export const PERSONA_LABELS: Record<UserPersona, string> = {
  visitante: "Visitante",
  analista: "Analista de procesos",
  operador: "Operador de actividades",
  administrador: "Administrador de datos",
  integrador: "Integrador / DevOps",
};

export const USE_CASES: UseCaseDefinition[] = [
  {
    id: "UC-NAV-MENU",
    title: "Recorrer el menú de trabajo",
    persona: "visitante",
    personaLabel: PERSONA_LABELS.visitante,
    route: "/",
    perspective:
      "Entré a la app y quiero entender qué módulos hay. Recorro el menú lateral como lo haría el primer día.",
    steps: [
      "Abrir el catálogo de flujos",
      "Ir a Catálogo de actividades",
      "Ir a Gestión, Maestros, Reporte, Datos, Integración y Login",
    ],
    expected: "Cada pantalla muestra su título y el menú queda activo en la ruta.",
    spec: "e2e/nav.spec.ts",
  },
  {
    id: "UC-NAV-THEME",
    title: "Alternar tema claro y oscuro",
    persona: "visitante",
    personaLabel: PERSONA_LABELS.visitante,
    route: "/",
    perspective:
      "La pantalla me cansa de noche. Cambio el tema y espero que la app recuerde mi preferencia.",
    steps: ["Pulsar el botón de tema en el header", "Verificar data-theme en el documento"],
    expected: "El tema cambia entre dark y light.",
    spec: "e2e/nav.spec.ts",
  },
  {
    id: "UC-NAV-ACTIVIDADES",
    title: "Abrir el catálogo de actividades",
    persona: "analista",
    personaLabel: PERSONA_LABELS.analista,
    route: "/catalogo/actividades",
    perspective:
      "Busco actividades reutilizables para armar un flujo. Hoy veo el placeholder hasta que se porte el mock.",
    steps: ["Entrar a Catálogo de actividades desde el diseñador"],
    expected: "Se ve el título «Catálogo de actividades».",
    spec: "e2e/nav.spec.ts",
  },
  {
    id: "UC-LOGIN-OK",
    title: "Iniciar sesión con usuario mock",
    persona: "operador",
    personaLabel: PERSONA_LABELS.operador,
    route: "/login",
    perspective:
      "Soy Luna. Pongo usuario y clave como en el prototipo y quiero entrar a gestionar actividades.",
    steps: ["Ir a Login", "Completar luna / 1234", "Pulsar Entrar"],
    expected: "Redirige a Gestión de actividades.",
    spec: "e2e/login.spec.ts",
  },
  {
    id: "UC-LOGIN-FAIL",
    title: "Rechazar credenciales inválidas",
    persona: "visitante",
    personaLabel: PERSONA_LABELS.visitante,
    route: "/login",
    perspective:
      "Me equivoco de clave. El sistema no me deja entrar y me lo dice en español.",
    steps: ["Ir a Login", "Completar usuario inexistente", "Pulsar Entrar"],
    expected: "Mensaje de usuario o contraseña incorrectos; no sale de /login.",
    spec: "e2e/login.spec.ts",
  },
  {
    id: "UC-DATOS-IMPORT",
    title: "Importar dataset de testing",
    persona: "administrador",
    personaLabel: PERSONA_LABELS.administrador,
    route: "/datos",
    perspective:
      "Levanto un entorno limpio y cargo el bootstrap de testing para trabajar con flujos, maestros y usuarios reales.",
    steps: ["Ir a Datos", "Pulsar Importar testing-bootstrap", "Esperar confirmación"],
    expected: "Mensaje Import OK con conteos de flujos, instancias y maestros.",
    spec: "e2e/datos.spec.ts",
  },
  {
    id: "UC-DATOS-EXPORT",
    title: "Exportar estado en formato mock",
    persona: "administrador",
    personaLabel: PERSONA_LABELS.administrador,
    route: "/datos",
    perspective:
      "Quiero llevarme una copia del estado para no perder datos locales o para pasársela a otro entorno.",
    steps: ["Ir a Datos", "Pulsar Exportar JSON"],
    expected: "Se descarga un JSON y aparece confirmación de export.",
    spec: "e2e/datos.spec.ts",
  },
  {
    id: "UC-CATALOGO-LISTA",
    title: "Ver el catálogo de flujos",
    persona: "analista",
    personaLabel: PERSONA_LABELS.analista,
    route: "/",
    perspective:
      "Abro el diseñador para ver qué flujos hay, en qué estado están y su versión.",
    steps: ["Abrir el inicio", "Esperar la tabla del catálogo"],
    expected: "Tabla con columnas Nombre, Tipo, Estado, Versión y Acciones.",
    spec: "e2e/catalogo.spec.ts",
  },
  {
    id: "UC-CATALOGO-FILTROS",
    title: "Filtrar flujos por texto, estado y tipo",
    persona: "analista",
    personaLabel: PERSONA_LABELS.analista,
    route: "/",
    perspective:
      "Hay muchos flujos. Filtro por nombre y por estado Listo para encontrar el que quiero versionar.",
    steps: ["Escribir en Buscar", "Elegir estado Listo", "Elegir un tipo si hay opciones"],
    expected: "La tabla se actualiza; los resultados respetan el filtro.",
    spec: "e2e/catalogo.spec.ts",
  },
  {
    id: "UC-CATALOGO-NUEVO",
    title: "Crear un borrador nuevo",
    persona: "analista",
    personaLabel: PERSONA_LABELS.analista,
    route: "/",
    perspective:
      "Empiezo un flujo desde cero. Creo un borrador y caigo en el canvas para dibujarlo.",
    steps: ["Pulsar Nuevo borrador", "Esperar la ruta /diseno/{id}"],
    expected: "Diseñador con el flujo en estado Borrador.",
    spec: "e2e/catalogo.spec.ts",
  },
  {
    id: "UC-DISENO-CANVAS",
    title: "Abrir el canvas React Flow",
    persona: "analista",
    personaLabel: PERSONA_LABELS.analista,
    route: "/diseno/[flowId]",
    perspective:
      "Abro un flujo existente para ver el diagrama. Si está listo, solo lo consulto.",
    steps: ["Desde el catálogo, Abrir un flujo", "Esperar el canvas"],
    expected: "Se ve el canvas y el nombre del flujo.",
    spec: "e2e/diseno.spec.ts",
  },
  {
    id: "UC-DISENO-VERSIONAR",
    title: "Versionar un flujo listo",
    persona: "analista",
    personaLabel: PERSONA_LABELS.analista,
    route: "/",
    perspective:
      "El flujo está en producción (Listo). Quiero cambiarlo: versiono y obtengo un borrador editable.",
    steps: ["En un flujo Listo, pulsar Versionar", "Aterrizar en el diseñador del borrador"],
    expected: "Nuevo flujo en Borrador, o mensaje si ya hay borrador en el linaje.",
    spec: "e2e/diseno.spec.ts",
  },
  {
    id: "UC-DISENO-CONFIRMAR",
    title: "Validar al confirmar un borrador incompleto",
    persona: "analista",
    personaLabel: PERSONA_LABELS.analista,
    route: "/",
    perspective:
      "Intenté publicar un borrador vacío. El sistema me frena con la validación BPMN.",
    steps: ["Crear borrador", "Volver al catálogo", "Pulsar Confirmar"],
    expected: "Error de validación (falta Start Event) y el flujo sigue en borrador.",
    spec: "e2e/diseno.spec.ts",
  },
  {
    id: "UC-GESTION-INICIAR",
    title: "Instanciar un flujo listo",
    persona: "operador",
    personaLabel: PERSONA_LABELS.operador,
    route: "/gestion",
    perspective:
      "Llega un gasto para aprobar. Elijo el flujo, cargo título y monto, e inicio la instancia.",
    steps: ["Ir a Gestión", "Completar parámetros de entrada", "Pulsar Iniciar instancia"],
    expected: "Aparece una tarjeta en En curso con el nombre del flujo.",
    spec: "e2e/gestion.spec.ts",
  },
  {
    id: "UC-GESTION-ACEPTAR",
    title: "Resolver una user task aceptando",
    persona: "operador",
    personaLabel: PERSONA_LABELS.operador,
    route: "/gestion",
    perspective:
      "Soy el supervisor. Abro la instancia pendiente y acepto la actividad para que el flujo siga.",
    steps: ["Seleccionar instancia en curso", "Pulsar Aceptar", "Continuar si hay Service Task"],
    expected: "La instancia avanza o sale de En curso.",
    spec: "e2e/gestion.spec.ts",
  },
  {
    id: "UC-GESTION-TABS",
    title: "Filtrar instancias por estado",
    persona: "operador",
    personaLabel: PERSONA_LABELS.operador,
    route: "/gestion",
    perspective:
      "Quiero ver lo cerrado, no solo lo pendiente. Paso por Completadas y Cerradas por rechazo.",
    steps: ["Abrir pestaña Completadas", "Abrir Cerradas por rechazo", "Volver a En curso"],
    expected: "Cada pestaña muestra su lista o el vacío correspondiente.",
    spec: "e2e/gestion.spec.ts",
  },
  {
    id: "UC-MAESTROS-LISTA",
    title: "Consultar tipos, entidades y maestros",
    persona: "administrador",
    personaLabel: PERSONA_LABELS.administrador,
    route: "/maestros",
    perspective:
      "Reviso el diccionario del negocio: tipos de flujo, entidades y definiciones ABM.",
    steps: ["Ir a Maestros", "Ver las tres secciones"],
    expected: "Paneles de tipos, entidades y definiciones visibles.",
    spec: "e2e/maestros.spec.ts",
  },
  {
    id: "UC-MAESTROS-TIPO",
    title: "Agregar un tipo de flujo",
    persona: "administrador",
    personaLabel: PERSONA_LABELS.administrador,
    route: "/maestros",
    perspective:
      "Necesito un tipo nuevo para clasificar circuitos. Lo cargo y aparece en la lista.",
    steps: ["Escribir el nombre", "Pulsar Agregar"],
    expected: "El tipo queda listado en Tipos de flujo.",
    spec: "e2e/maestros.spec.ts",
  },
  {
    id: "UC-REPORTE-AUDIT",
    title: "Leer la auditoría de maestros",
    persona: "administrador",
    personaLabel: PERSONA_LABELS.administrador,
    route: "/reporte",
    perspective:
      "Alguien tocó un maestro. Voy al reporte para ver quién, cuándo y qué cambió.",
    steps: ["Ir a Reporte", "Leer la tabla de auditoría"],
    expected: "Tabla con Fecha, Usuario, Área, Acción y Detalle.",
    spec: "e2e/reporte.spec.ts",
  },
  {
    id: "UC-INTEGRA-HEALTH",
    title: "Ver el estado del servicio",
    persona: "integrador",
    personaLabel: PERSONA_LABELS.integrador,
    route: "/integracion",
    perspective:
      "Antes de enganchar otro sistema, abro Integración y confirmo que el health responde.",
    steps: ["Ir a Integración", "Leer el panel de estado"],
    expected: "Health ok y flag de Supabase configurado o memoria volátil.",
    spec: "e2e/integracion.spec.ts",
  },
  {
    id: "UC-INTEGRA-API",
    title: "Consultar el contrato REST",
    persona: "integrador",
    personaLabel: PERSONA_LABELS.integrador,
    route: "/integracion",
    perspective:
      "Necesito las rutas para el motor, flujos y login. Las copio de la tabla y del ejemplo curl.",
    steps: ["Bajar hasta API REST", "Ver grupos Motor, Flujos, Maestros y Sesión"],
    expected: "Tablas de endpoints y bloque curl visibles.",
    spec: "e2e/integracion.spec.ts",
  },
  {
    id: "UC-API-HEALTH",
    title: "Probe HTTP de health",
    persona: "integrador",
    personaLabel: PERSONA_LABELS.integrador,
    route: "/api/health",
    perspective:
      "El balanceador o Docker me pega a /api/health. Tiene que devolver 200 y status ok.",
    steps: ["GET /api/health"],
    expected: "JSON status=ok, service=gestor-app.",
    spec: "e2e/api.spec.ts",
  },
  {
    id: "UC-API-FLOWS",
    title: "Listar flujos por API",
    persona: "integrador",
    personaLabel: PERSONA_LABELS.integrador,
    route: "/api/flows",
    perspective:
      "Otro sistema pide el catálogo. Llamo GET /api/flows y recibo el array.",
    steps: ["GET /api/flows"],
    expected: "200 con { flows: [...] }.",
    spec: "e2e/api.spec.ts",
  },
  {
    id: "UC-E2E-GALERIA",
    title: "Abrir la galería de casos de uso",
    persona: "visitante",
    personaLabel: PERSONA_LABELS.visitante,
    route: "/e2e",
    perspective:
      "Quiero ver todos los casos de uso y, si ya corrieron los tests, los videos de cada recorrido.",
    steps: ["Ir a Casos de uso", "Ver las tarjetas por persona"],
    expected: "Listado de todos los UC con perspectiva de usuario.",
    spec: "e2e/galeria.spec.ts",
  },
];

export function getUseCase(id: string): UseCaseDefinition | undefined {
  return USE_CASES.find((uc) => uc.id === id);
}

export function groupUseCasesByPersona(): Array<{
  persona: UserPersona;
  label: string;
  items: UseCaseDefinition[];
}> {
  const order: UserPersona[] = [
    "visitante",
    "analista",
    "operador",
    "administrador",
    "integrador",
  ];
  return order.map((persona) => ({
    persona,
    label: PERSONA_LABELS[persona],
    items: USE_CASES.filter((uc) => uc.persona === persona),
  }));
}
