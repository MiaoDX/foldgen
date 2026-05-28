const DEFAULT_SIZE = 512;

export function createCreasePatternSvg(fold, options = {}) {
  const size = options.size ?? DEFAULT_SIZE;
  const padding = options.padding ?? 32;
  const vertices = fold.vertices_coords;
  const bounds = getBounds(vertices);
  const scale = Math.min(
    (size - padding * 2) / Math.max(bounds.maxX - bounds.minX, 1),
    (size - padding * 2) / Math.max(bounds.maxY - bounds.minY, 1)
  );

  const point = ([x, y]) => ({
    x: round(padding + (x - bounds.minX) * scale),
    y: round(size - padding - (y - bounds.minY) * scale)
  });

  const lines = fold.edges_vertices.map(([a, b], index) => {
    const start = point(vertices[a]);
    const end = point(vertices[b]);
    const assignment = fold.edges_assignment?.[index] ?? "U";
    const style = styleFor(assignment);
    return `  <line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" class="${style.className}" />`;
  });

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${escapeXml(fold.file_title ?? "crease pattern")}">`,
    "  <style>",
    "    .boundary { stroke: #111827; stroke-width: 3; stroke-linecap: round; fill: none; }",
    "    .mountain { stroke: #dc2626; stroke-width: 2; stroke-linecap: round; fill: none; }",
    "    .valley { stroke: #2563eb; stroke-width: 2; stroke-linecap: round; stroke-dasharray: 8 6; fill: none; }",
    "    .flat { stroke: #6b7280; stroke-width: 1.5; stroke-linecap: round; fill: none; }",
    "    .unknown { stroke: #9ca3af; stroke-width: 1.5; stroke-linecap: round; stroke-dasharray: 2 5; fill: none; }",
    "  </style>",
    ...lines,
    "</svg>",
    ""
  ].join("\n");
}

function getBounds(vertices) {
  return vertices.reduce(
    (bounds, [x, y]) => ({
      minX: Math.min(bounds.minX, x),
      maxX: Math.max(bounds.maxX, x),
      minY: Math.min(bounds.minY, y),
      maxY: Math.max(bounds.maxY, y)
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
  );
}

function styleFor(assignment) {
  switch (assignment) {
    case "B":
      return { className: "boundary" };
    case "M":
      return { className: "mountain" };
    case "V":
      return { className: "valley" };
    case "F":
      return { className: "flat" };
    default:
      return { className: "unknown" };
  }
}

function round(value) {
  return Number(value.toFixed(3));
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
