import { readFile, writeFile } from "node:fs/promises";
import { dirname, relative } from "node:path";
import { mkdir } from "node:fs/promises";

import { parseFold, stableStringify } from "../../fold-core/src/index.mjs";

const DEFAULT_GRID_SIZE = 64;
const DEFAULT_THRESHOLD = 0.48;

export async function evaluateTargetMatch({ targetSvgPath, foldedStatePath, outputPath, threshold = DEFAULT_THRESHOLD, gridSize = DEFAULT_GRID_SIZE }) {
  const targetSvg = await readFile(targetSvgPath, "utf8");
  const foldedState = parseFold(await readFile(foldedStatePath, "utf8"), foldedStatePath);
  const targetPolygons = extractSvgSilhouettePolygons(targetSvg);
  const foldedPolygons = foldFacesToPolygons(foldedState);
  const score = silhouetteIoU(targetPolygons, foldedPolygons, gridSize);
  const result = {
    type: "foldgen.target_match.v1",
    status: score >= threshold ? "passed" : "failed",
    metric: "silhouette-iou-v0",
    score,
    threshold,
    grid_size: gridSize,
    output_artifact_path: outputPath ? toRepoPath(outputPath) : null,
    target_artifact_path: toRepoPath(targetSvgPath),
    folded_state_artifact_path: toRepoPath(foldedStatePath),
    target_polygon_count: targetPolygons.length,
    folded_polygon_count: foldedPolygons.length,
    limitations: [
      "Deterministic silhouette gate only; it does not replace human or vision-model inspection.",
      "Curved SVG paths are approximated from command points for this first target gate."
    ]
  };
  if (outputPath) {
    await writeJson(outputPath, result);
  }
  return result;
}

export function extractSvgSilhouettePolygons(svgText) {
  const pathPolygons = [...svgText.matchAll(/<path\b[^>]*\bd="([^"]+)"[^>]*>/gi)]
    .map((match) => pathDataToPolygon(match[1]))
    .filter((polygon) => polygon.length >= 3);
  const circles = [...svgText.matchAll(/<circle\b[^>]*>/gi)]
    .map((match) => circleToPolygon(match[0]))
    .filter((polygon) => polygon.length >= 3);
  const polygons = [...svgText.matchAll(/<polygon\b[^>]*\bpoints="([^"]+)"[^>]*>/gi)]
    .map((match) => pointsAttributeToPolygon(match[1]))
    .filter((polygon) => polygon.length >= 3);
  return normalizePolygons([...pathPolygons, ...circles, ...polygons]);
}

export function foldFacesToPolygons(fold) {
  const vertices = fold.vertices_coords ?? [];
  const faces = fold.faces_vertices ?? [];
  return normalizePolygons(faces
    .map((face) => face.map((vertexIndex) => vertices[vertexIndex]).filter(Array.isArray))
    .filter((polygon) => polygon.length >= 3 && Math.abs(polygonArea(polygon)) > 1e-9));
}

export function silhouetteIoU(targetPolygons, foldedPolygons, gridSize = DEFAULT_GRID_SIZE) {
  if (targetPolygons.length === 0 || foldedPolygons.length === 0) {
    return 0;
  }
  let intersection = 0;
  let union = 0;
  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      const point = [(x + 0.5) / gridSize, (y + 0.5) / gridSize];
      const inTarget = polygonsContainPoint(targetPolygons, point);
      const inFolded = polygonsContainPoint(foldedPolygons, point);
      if (inTarget || inFolded) {
        union += 1;
      }
      if (inTarget && inFolded) {
        intersection += 1;
      }
    }
  }
  return union === 0 ? 0 : round(intersection / union);
}

function pathDataToPolygon(pathData) {
  const tokens = [...pathData.matchAll(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi)].map((match) => match[0]);
  const polygon = [];
  let command = null;
  let cursor = [0, 0];
  let start = null;
  let index = 0;
  while (index < tokens.length) {
    if (/^[a-zA-Z]$/.test(tokens[index])) {
      command = tokens[index++];
    }
    if (!command) {
      break;
    }
    const relative = command === command.toLowerCase();
    switch (command.toUpperCase()) {
      case "M":
      case "L": {
        const point = readPoint(tokens, index, cursor, relative);
        if (!point) {
          index = tokens.length;
          break;
        }
        cursor = point.point;
        polygon.push(cursor);
        start ??= cursor;
        index = point.nextIndex;
        if (command.toUpperCase() === "M") {
          command = relative ? "l" : "L";
        }
        break;
      }
      case "H": {
        const x = Number(tokens[index++]);
        cursor = [relative ? cursor[0] + x : x, cursor[1]];
        polygon.push(cursor);
        break;
      }
      case "V": {
        const y = Number(tokens[index++]);
        cursor = [cursor[0], relative ? cursor[1] + y : y];
        polygon.push(cursor);
        break;
      }
      case "C": {
        const points = [];
        for (let i = 0; i < 3; i += 1) {
          const point = readPoint(tokens, index, cursor, relative);
          if (!point) {
            index = tokens.length;
            break;
          }
          points.push(point.point);
          index = point.nextIndex;
        }
        polygon.push(...points);
        cursor = points.at(-1) ?? cursor;
        break;
      }
      case "Q": {
        const points = [];
        for (let i = 0; i < 2; i += 1) {
          const point = readPoint(tokens, index, cursor, relative);
          if (!point) {
            index = tokens.length;
            break;
          }
          points.push(point.point);
          index = point.nextIndex;
        }
        polygon.push(...points);
        cursor = points.at(-1) ?? cursor;
        break;
      }
      case "Z":
        if (start) {
          polygon.push(start);
        }
        index += tokens[index]?.toUpperCase?.() === "Z" ? 1 : 0;
        break;
      default:
        index += 1;
    }
  }
  return polygon;
}

function readPoint(tokens, index, cursor, relative) {
  if (index + 1 >= tokens.length) {
    return null;
  }
  const x = Number(tokens[index]);
  const y = Number(tokens[index + 1]);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }
  return {
    point: relative ? [cursor[0] + x, cursor[1] + y] : [x, y],
    nextIndex: index + 2
  };
}

function circleToPolygon(elementText) {
  const cx = Number(attributeValue(elementText, "cx") ?? 0);
  const cy = Number(attributeValue(elementText, "cy") ?? 0);
  const r = Number(attributeValue(elementText, "r") ?? 0);
  if (!Number.isFinite(cx) || !Number.isFinite(cy) || !Number.isFinite(r) || r <= 0) {
    return [];
  }
  return Array.from({ length: 16 }, (_value, index) => {
    const angle = (index / 16) * Math.PI * 2;
    return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
  });
}

function pointsAttributeToPolygon(points) {
  const numbers = points.trim().split(/[\s,]+/).map(Number).filter(Number.isFinite);
  const polygon = [];
  for (let index = 0; index + 1 < numbers.length; index += 2) {
    polygon.push([numbers[index], numbers[index + 1]]);
  }
  return polygon;
}

function normalizePolygons(polygons) {
  const bounds = polygons.flat().reduce((result, [x, y]) => ({
    minX: Math.min(result.minX, x),
    maxX: Math.max(result.maxX, x),
    minY: Math.min(result.minY, y),
    maxY: Math.max(result.maxY, y)
  }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
  if (!Number.isFinite(bounds.minX) || !Number.isFinite(bounds.minY)) {
    return [];
  }
  const width = Math.max(bounds.maxX - bounds.minX, 1e-9);
  const height = Math.max(bounds.maxY - bounds.minY, 1e-9);
  return polygons.map((polygon) => polygon.map(([x, y]) => [
    (x - bounds.minX) / width,
    (y - bounds.minY) / height
  ]));
}

function polygonsContainPoint(polygons, point) {
  return polygons.some((polygon) => polygonContainsPoint(polygon, point));
}

function polygonContainsPoint(polygon, [x, y]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersects = ((yi > y) !== (yj > y))
      && x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-12) + xi;
    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}

function polygonArea(polygon) {
  let area = 0;
  for (let index = 0; index < polygon.length; index += 1) {
    const [x1, y1] = polygon[index];
    const [x2, y2] = polygon[(index + 1) % polygon.length];
    area += x1 * y2 - x2 * y1;
  }
  return area / 2;
}

function attributeValue(text, name) {
  return text.match(new RegExp(`\\b${name}="([^"]+)"`, "i"))?.[1] ?? null;
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${stableStringify(value, 2)}\n`, "utf8");
}

function toRepoPath(path) {
  return relative(process.cwd(), path).split("\\").join("/");
}

function round(value) {
  return Number(value.toFixed(4));
}
