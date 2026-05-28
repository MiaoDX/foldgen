export function createDiagramStep(operation, index = 1) {
  return {
    step: index,
    operation_id: operation.id,
    title: operation.name,
    fold: {
      assignment: operation.assignment,
      edge: operation.edge
    },
    instruction: operation.instruction,
    annotations: [
      {
        type: "fold-line",
        edge: operation.edge,
        assignment: operation.assignment
      }
    ]
  };
}
