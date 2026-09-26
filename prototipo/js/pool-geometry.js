/**
 * Geometría compartida del pool BPMN (lanes) para diseñador y validación.
 */

export const POOL_INSET = 12;
export const POOL_LABEL_W = 36;
/** Ancho columna título lane (vertical); debe coincidir con `.flow-lane-title` en CSS. */
export const LANE_TITLE_W = 44;
export const LANE_CONTENT_WIDTH_MIN = 520;
export const LANE_CONTENT_WIDTH_MAX = 960;
/** @deprecated Usar resolveLaneContentWidth; techo histórico del mock. */
export const LANE_CONTENT_MIN_W = LANE_CONTENT_WIDTH_MAX;
export const LANE_MIN_H = 180;
export const LANE_PAD = 16;

/** Margen estimado shell + toolbar fuera del área útil del canvas (px). */
export const DESIGNER_LAYOUT_SHELL_PAD = 72;

/**
 * Ancho del área de contenido de lanes según viewport (encuadre escritorio).
 *
 * @param {number} viewportWidth
 * @param {{ shellPad?: number }} [options]
 */
export function resolveLaneContentWidth(viewportWidth, options = {}) {
  const shellPad = options.shellPad ?? DESIGNER_LAYOUT_SHELL_PAD;
  const fixedPoolChrome = POOL_INSET * 2 + POOL_LABEL_W + LANE_TITLE_W;
  const usable = viewportWidth - shellPad - fixedPoolChrome;
  return Math.max(
    LANE_CONTENT_WIDTH_MIN,
    Math.min(LANE_CONTENT_WIDTH_MAX, Math.floor(usable)),
  );
}

/**
 * @param {string} kind - kind del nodo BPMN
 */
export function getNodeBox(kind) {
  return (
    {
      inicio: { w: 52, h: 52 },
      fin: { w: 52, h: 52 },
      gateway: { w: 56, h: 56 },
      manual: { w: 148, h: 64 },
      automatica: { w: 148, h: 64 },
    }[kind] ?? { w: 140, h: 56 }
  );
}

/**
 * @param {object} flow - Flujo con lanes
 * @param {{ viewportWidth?: number; shellPad?: number }} [options]
 */
export function computeLaneLayout(flow, options = {}) {
  const viewportWidth =
    options.viewportWidth ??
    (typeof window !== "undefined" ? window.innerWidth : 1280);
  const laneContentWidth = resolveLaneContentWidth(viewportWidth, options);
  if (!flow?.lanes?.length) {
    return {
      poolTop: POOL_INSET,
      poolLeft: POOL_INSET,
      poolWidth: 0,
      poolHeight: 0,
      canvasMinWidth: POOL_INSET * 2,
      canvasMinHeight: 600,
      lanes: [],
      laneById: {},
    };
  }

  let top = POOL_INSET;
  const contentLeft = POOL_INSET + POOL_LABEL_W + LANE_TITLE_W;
  const lanes = flow.lanes.map((lane) => {
    const height = lane.height ?? LANE_MIN_H;
    const band = {
      id: lane.id,
      name: lane.name,
      top,
      left: contentLeft,
      width: laneContentWidth,
      height,
    };
    top += height;
    return band;
  });
  const poolHeight = top - POOL_INSET;
  const poolWidth = POOL_LABEL_W + LANE_TITLE_W + laneContentWidth;
  return {
    poolTop: POOL_INSET,
    poolLeft: POOL_INSET,
    poolWidth,
    poolHeight,
    canvasMinWidth: POOL_INSET * 2 + poolWidth,
    canvasMinHeight: Math.max(600, top + POOL_INSET),
    lanes,
    laneById: Object.fromEntries(lanes.map((l) => [l.id, l])),
  };
}

/**
 * @param {object} layout - Resultado de computeLaneLayout
 * @param {string} laneId
 */
export function getLaneBand(layout, laneId) {
  return layout.laneById[laneId] ?? layout.lanes[0] ?? null;
}

/**
 * @param {object} node - Nodo con kind, laneId, x, y
 * @param {object} lane - Banda del lane
 */
export function getNodePlacementBounds(node, lane) {
  const box = getNodeBox(node.kind);
  if (!lane) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  }
  const minX = lane.left + LANE_PAD;
  const maxX = lane.left + lane.width - box.w - LANE_PAD;
  const minY = lane.top + LANE_PAD;
  const maxY = lane.top + lane.height - box.h - LANE_PAD;
  return {
    minX,
    maxX: Math.max(minX, maxX),
    minY,
    maxY: Math.max(minY, maxY),
  };
}

/**
 * Start/End Event debe estar contenido en la banda de contenido de su lane.
 *
 * @param {object} flow
 * @param {object} node
 */
export function isFlowEventInsidePool(flow, node) {
  if (node.kind !== "inicio" && node.kind !== "fin") return true;
  if (!flow?.lanes?.length || !node.laneId) return false;

  const viewportWidth =
    typeof window !== "undefined" ? window.innerWidth : 1280;
  const layout = computeLaneLayout(flow, { viewportWidth });
  const lane = getLaneBand(layout, node.laneId);
  if (!lane) return false;

  const box = getNodeBox(node.kind);
  return (
    node.x >= lane.left + LANE_PAD &&
    node.x + box.w <= lane.left + lane.width - LANE_PAD &&
    node.y >= lane.top + LANE_PAD &&
    node.y + box.h <= lane.top + lane.height - LANE_PAD
  );
}
