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

  return {
    type: "foldgen.preview.v1",
    title: fold.file_title ?? "fold preview",
    projection: "isometric-inspection",
    vertices: vertices.map(([x, y], index) => ({
      index,
      x: round(x),
      y: round(y),
      z: round(zCounts[index] === 0 ? 0 : zTotals[index] / zCounts[index])
    })),
    edges
  };
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
