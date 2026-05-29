export function createPreviewModel(fold) {
  const vertices = fold.vertices_coords ?? [];
  const edges = (fold.edges_vertices ?? []).map(([a, b], index) => {
    const assignment = fold.edges_assignment?.[index] ?? "U";
    const lift = liftForAssignment(assignment);
    return {
      index,
      vertices: [a, b],
      assignment,
      lift
    };
  });
  const previewVertices = createPreviewVertices(fold, edges);
  const faces = (fold.faces_vertices ?? []).map((faceVertices, index) => {
    const zValues = faceVertices
      .map((vertexIndex) => previewVertices[vertexIndex]?.z)
      .filter((z) => typeof z === "number");
    const averageZ = zValues.length === 0
      ? 0
      : zValues.reduce((total, z) => total + z, 0) / zValues.length;
    return {
      index,
      vertices: [...faceVertices],
      average_z: round(averageZ)
    };
  });

  return {
    type: "foldgen.preview.v1",
    title: fold.file_title ?? "fold preview",
    projection: "isometric-inspection",
    vertices: previewVertices,
    edges,
    faces
  };
}

function createPreviewVertices(fold, edges) {
  const vertices = (fold.vertices_coords ?? []).map(([x, y], index) => ({
    index,
    x,
    y,
    z: 0
  }));
  const history = Array.isArray(fold.foldgen_history) ? fold.foldgen_history : [];
  if (history.length === 0) {
    return vertices.map(roundVertex);
  }
  const edgeAssignments = new Map(edges.map((edge) => [edgeKey(edge.vertices), edge.assignment]));
  for (const operation of history) {
    applyPreviewFold(vertices, {
      ...operation,
      assignment: operation.assignment ?? edgeAssignments.get(edgeKey(operation.edge))
    });
  }
  return vertices.map(roundVertex);
}

function applyPreviewFold(vertices, operation) {
  const edge = operation.edge;
  if (!Array.isArray(edge) || edge.length !== 2) {
    return;
  }
  const start = vertices[edge[0]];
  const end = vertices[edge[1]];
  if (!start || !end) {
    return;
  }
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) {
    return;
  }
  const normal = { x: -dy / length, y: dx / length };
  const distances = vertices.map((vertex) => ({
    vertex,
    distance: signedDistance(vertex, start, normal)
  }));
  const movableSign = chooseMovableSign(distances);
  const angle = foldAngleForAssignment(operation.assignment);
  const zDirection = zDirectionForAssignment(operation.assignment);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  for (const { vertex, distance } of distances) {
    if (Math.abs(distance) < 0.0001 || Math.sign(distance) !== movableSign) {
      continue;
    }
    const projectedDistance = distance * cos;
    const delta = projectedDistance - distance;
    vertex.x += normal.x * delta;
    vertex.y += normal.y * delta;
    vertex.z += Math.abs(distance) * sin * zDirection;
  }
}

function signedDistance(vertex, start, normal) {
  return (vertex.x - start.x) * normal.x + (vertex.y - start.y) * normal.y;
}

function chooseMovableSign(distances) {
  const totals = distances.reduce((result, { distance }) => {
    if (Math.abs(distance) < 0.0001) {
      return result;
    }
    if (distance > 0) {
      result.positive += Math.abs(distance);
    } else {
      result.negative += Math.abs(distance);
    }
    return result;
  }, { positive: 0, negative: 0 });
  return totals.positive >= totals.negative ? 1 : -1;
}

function foldAngleForAssignment(assignment) {
  switch (assignment) {
    case "F":
      return Math.PI / 10;
    case "M":
    case "V":
      return Math.PI / 5;
    default:
      return Math.PI / 12;
  }
}

function zDirectionForAssignment(assignment) {
  switch (assignment) {
    case "V":
      return -1;
    case "F":
      return 0.35;
    default:
      return 1;
  }
}

function roundVertex(vertex) {
  return {
    index: vertex.index,
    x: round(vertex.x),
    y: round(vertex.y),
    z: round(vertex.z)
  };
}

export function createPreviewAnimation(fold, options = {}) {
  const history = Array.isArray(fold.foldgen_history) ? fold.foldgen_history : [];
  const frames = [
    {
      index: 0,
      progress: 0,
      label: "Base form",
      active_operation_id: null,
      preview: createPreviewModel(frameFold(fold, history, 0))
    },
    ...history.map((operation, index) => ({
      index: index + 1,
      progress: round((index + 1) / Math.max(history.length, 1)),
      label: operation.name,
      active_operation_id: operation.id,
      operation,
      preview: createPreviewModel(frameFold(fold, history, index + 1))
    }))
  ];
  return {
    type: "foldgen.preview_animation.v1",
    title: options.title ?? `${fold.file_title ?? "fold preview"} animation`,
    frame_count: frames.length,
    operation_count: history.length,
    frames
  };
}

function frameFold(fold, history, completedCount) {
  const completed = new Map(history.slice(0, completedCount).map((operation) => [edgeKey(operation.edge), operation.assignment]));
  const historyEdges = new Set(history.map((operation) => edgeKey(operation.edge)));
  const edgesAssignment = (fold.edges_vertices ?? []).map((edge, index) => {
    const key = edgeKey(edge);
    if (completed.has(key)) {
      return completed.get(key);
    }
    return historyEdges.has(key) ? "U" : fold.edges_assignment?.[index] ?? "U";
  });
  return {
    ...fold,
    foldgen_history: history.slice(0, completedCount),
    edges_assignment: edgesAssignment
  };
}

function edgeKey(edge) {
  return [...edge].sort((a, b) => a - b).join("-");
}

function liftForAssignment(assignment) {
  switch (assignment) {
    case "M":
      return 0.08;
    case "V":
      return -0.08;
    case "F":
      return 0.02;
    default:
      return 0;
  }
}

function round(value) {
  return Number(value.toFixed(4));
}
