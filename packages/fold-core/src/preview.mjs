export function createPreviewModel(fold) {
  const vertices = fold.vertices_coords ?? [];
  const zTotals = vertices.map(() => 0);
  const zCounts = vertices.map(() => 0);
  const edges = (fold.edges_vertices ?? []).map(([a, b], index) => {
    const assignment = fold.edges_assignment?.[index] ?? "U";
    const lift = liftForAssignment(assignment);
    if (zTotals[a] !== undefined) {
      zTotals[a] += lift;
      zCounts[a] += 1;
    }
    if (zTotals[b] !== undefined) {
      zTotals[b] += lift;
      zCounts[b] += 1;
    }
    return {
      index,
      vertices: [a, b],
      assignment,
      lift
    };
  });
  const previewVertices = vertices.map(([x, y], index) => ({
    index,
    x: round(x),
    y: round(y),
    z: round(zCounts[index] === 0 ? 0 : zTotals[index] / zCounts[index])
  }));
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
