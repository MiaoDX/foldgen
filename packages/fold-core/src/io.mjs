import { readFile, writeFile } from "node:fs/promises";

const EDGE_ASSIGNMENTS = new Set(["B", "M", "V", "F", "U"]);

export async function loadFoldFile(path) {
  return parseFold(await readFile(path, "utf8"), path);
}

export async function writeFoldFile(path, fold) {
  await writeFile(path, serializeFold(fold), "utf8");
}

export function parseFold(content, source = "<memory>") {
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new Error(`Unable to parse FOLD JSON from ${source}: ${error.message}`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`FOLD document from ${source} must be a JSON object`);
  }
  return parsed;
}

export function serializeFold(fold) {
  return `${stableStringify(fold, 2)}\n`;
}

export function validateFold(fold) {
  const errors = [];
  const warnings = [];

  if (!fold || typeof fold !== "object" || Array.isArray(fold)) {
    return { ok: false, errors: ["FOLD document must be an object"], warnings };
  }

  if (typeof fold.file_spec !== "number" && typeof fold.file_spec !== "string") {
    warnings.push("file_spec is missing");
  }

  const vertices = fold.vertices_coords;
  if (!Array.isArray(vertices) || vertices.length < 3) {
    errors.push("vertices_coords must contain at least three vertices");
  } else {
    vertices.forEach((vertex, index) => {
      if (!Array.isArray(vertex) || vertex.length < 2 || !isFiniteNumber(vertex[0]) || !isFiniteNumber(vertex[1])) {
        errors.push(`vertices_coords[${index}] must be [x, y] numbers`);
      }
    });
  }

  const vertexCount = Array.isArray(vertices) ? vertices.length : 0;
  const edges = fold.edges_vertices;
  if (!Array.isArray(edges) || edges.length === 0) {
    errors.push("edges_vertices must contain at least one edge");
  } else {
    edges.forEach((edge, index) => {
      if (!Array.isArray(edge) || edge.length !== 2) {
        errors.push(`edges_vertices[${index}] must contain exactly two vertex indices`);
        return;
      }
      const [a, b] = edge;
      if (!isValidIndex(a, vertexCount) || !isValidIndex(b, vertexCount)) {
        errors.push(`edges_vertices[${index}] references an out-of-range vertex`);
      }
      if (a === b) {
        errors.push(`edges_vertices[${index}] has identical endpoints`);
      }
    });
  }

  const assignments = fold.edges_assignment;
  if (assignments !== undefined) {
    if (!Array.isArray(assignments)) {
      errors.push("edges_assignment must be an array when present");
    } else {
      if (Array.isArray(edges) && assignments.length !== edges.length) {
        errors.push("edges_assignment length must match edges_vertices length");
      }
      assignments.forEach((assignment, index) => {
        if (!EDGE_ASSIGNMENTS.has(assignment)) {
          errors.push(`edges_assignment[${index}] has unsupported value ${JSON.stringify(assignment)}`);
        }
      });
    }
  }

  const faces = fold.faces_vertices;
  if (faces !== undefined) {
    if (!Array.isArray(faces)) {
      errors.push("faces_vertices must be an array when present");
    } else {
      faces.forEach((face, index) => {
        if (!Array.isArray(face) || face.length < 3) {
          errors.push(`faces_vertices[${index}] must contain at least three vertex indices`);
          return;
        }
        face.forEach((vertexIndex) => {
          if (!isValidIndex(vertexIndex, vertexCount)) {
            errors.push(`faces_vertices[${index}] references an out-of-range vertex`);
          }
        });
      });
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function stableStringify(value, spaces = 0) {
  return JSON.stringify(sortKeys(value), null, spaces);
}

function sortKeys(value) {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortKeys(value[key])])
    );
  }
  return value;
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function isValidIndex(value, length) {
  return Number.isInteger(value) && value >= 0 && value < length;
}
