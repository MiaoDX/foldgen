export const deterministicDemoOperation = {
  id: "m1-add-centerline-valley",
  name: "Add centerline valley fold",
  assignment: "V",
  edge: [5, 6],
  instruction: "Fold the left midpoint to the right midpoint along the centerline valley crease."
};

export const deterministicDemoOperations = Object.freeze([
  deterministicDemoOperation,
  Object.freeze({
    id: "m6-reinforce-main-diagonal",
    name: "Reinforce main diagonal mountain fold",
    assignment: "M",
    edge: [0, 2],
    instruction: "Fold the top-left corner to the bottom-right corner to reinforce the main diagonal."
  })
]);

export function applyLocalFoldOperation(fold, operation = deterministicDemoOperation) {
  const next = clone(fold);
  const operationEdge = [...operation.edge];
  next.file_title = `${fold.file_title ?? "fold"} - ${operation.name}`;
  next.foldgen_history = [
    ...(Array.isArray(fold.foldgen_history) ? fold.foldgen_history : []),
    {
      id: operation.id,
      name: operation.name,
      assignment: operation.assignment,
      edge: operationEdge
    }
  ];

  next.edges_vertices = Array.isArray(next.edges_vertices) ? next.edges_vertices.map((edge) => [...edge]) : [];
  next.edges_assignment = normalizedAssignments(next.edges_assignment, next.edges_vertices.length);

  const edgeIndex = findEdgeIndex(next.edges_vertices, operationEdge);
  if (edgeIndex === -1) {
    next.edges_vertices.push(operationEdge);
    next.edges_assignment.push(operation.assignment);
  } else {
    next.edges_assignment[edgeIndex] = operation.assignment;
  }

  return next;
}

export function applyLocalFoldOperations(fold, operations = deterministicDemoOperations) {
  if (!Array.isArray(operations) || operations.length === 0) {
    throw new Error("applyLocalFoldOperations requires at least one operation");
  }
  return operations.reduce((current, operation) => applyLocalFoldOperation(current, operation), fold);
}

function findEdgeIndex(edges, [a, b]) {
  return edges.findIndex(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

function normalizedAssignments(assignments, edgeCount) {
  const normalized = Array.isArray(assignments) ? [...assignments] : [];
  while (normalized.length < edgeCount) {
    normalized.push("U");
  }
  return normalized;
}

function clone(value) {
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}
