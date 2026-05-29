import { createPreviewModel } from "../../fold-core/src/index.mjs";
import { getExecutorVisualMetadata } from "./community-adapters.mjs";

export function createFoldProgramIr({ caseId, target, baseForm, baseFold, selected, artifactPaths, externalValidation }) {
  const operations = selected.operations.map((operation, index) => operationToIr(operation, index + 1, selected.derived));
  return {
    type: "foldgen.fold_program_ir.v1",
    schema_version: 1,
    case_id: caseId,
    target: {
      name: target.name,
      file: target.file
    },
    selected_base_form: baseForm,
    base_fold_refs: summarizeFoldRefs(baseFold),
    operations,
    artifact_paths: {
      derived_fold: artifactPaths.derived_fold,
      crease_svg: artifactPaths.crease_svg,
      preview: artifactPaths.preview,
      preview_animation: artifactPaths.preview_animation,
      diagram_sequence: artifactPaths.diagram_sequence,
      visual_walkthrough: artifactPaths.visual_walkthrough
    },
    external_validation: externalValidation,
    failure_notes: externalFailureNotes(externalValidation),
    dsl_policy: {
      textual_dsl_status: "deferred",
      rationale: "This IR is a thin JSON handoff over FOLD artifacts, not a proprietary geometry language."
    }
  };
}

export function createVisualWalkthrough({ caseId, target, fold, operations, executorProfile, sequence, animation, status = "walkthrough-generated" }) {
  const visualMetadata = getExecutorVisualMetadata(executorProfile);
  const frames = [
    {
      index: 0,
      label: "Initial paper state",
      operation_id: null,
      paper_state: animation.frames[0]?.preview ?? createPreviewModel(fold),
      fold_marker: null,
      motion_cue: null,
      executor: executorFrame(visualMetadata, "setup"),
      contact_zones: phaseContactZones(sequence.steps[0], "setup"),
      unsupported_state: unsupportedState(visualMetadata, "setup")
    },
    ...operations.map((operation, index) => {
      const step = sequence.steps[index];
      return {
        index: index + 1,
        label: step?.title ?? operation.name,
        operation_id: operation.id,
        paper_state: animation.frames[index + 1]?.preview ?? createPreviewModel(fold),
        fold_marker: {
          edge: operation.edge,
          assignment: operation.assignment,
          line: step?.fold?.landmarks?.line ?? "fold line"
        },
        motion_cue: motionCue(step),
        executor: executorFrame(visualMetadata, step?.actions?.[0]?.phase ?? "fold"),
        contact_zones: contactZonesByPhase(step),
        unsupported_state: unsupportedState(visualMetadata, step?.actions?.[0]?.phase ?? "fold")
      };
    })
  ];

  return {
    type: "foldgen.visual_walkthrough.v1",
    status,
    case_id: caseId,
    target: {
      name: target.name,
      file: target.file
    },
    source_sequence: "foldgen_history",
    executor_profile: executorProfile,
    frame_count: frames.length,
    operation_count: operations.length,
    frames,
    completion_evidence: {
      case_specific_fold_sequence: true,
      frame_for_every_step: frames.length === operations.length + 1,
      current_paper_state_per_frame: frames.every((frame) => Boolean(frame.paper_state)),
      fold_line_and_assignment_marker: frames.slice(1).every((frame) => Boolean(frame.fold_marker?.assignment)),
      motion_arrow_or_panel_cue: frames.slice(1).every((frame) => Boolean(frame.motion_cue)),
      executor_visual_asset_or_silhouette: frames.every((frame) => Boolean(frame.executor?.silhouette)),
      contact_zones_for_action_phases: frames.slice(1).every((frame) => (
        ["anchor", "fold", "align", "crease", "release"].every((phase) => Array.isArray(frame.contact_zones[phase]))
      )),
      profile_specific_unsupported_state: frames.every((frame) => frame.unsupported_state !== undefined)
    },
    claim_policy: "Visual instruction aid only; not physical embodiment evidence."
  };
}

export function validateVisualWalkthrough(walkthrough) {
  const errors = [];
  if (walkthrough?.type !== "foldgen.visual_walkthrough.v1") {
    errors.push("type must be foldgen.visual_walkthrough.v1");
  }
  if (walkthrough?.status !== "walkthrough-complete") {
    errors.push("status must be walkthrough-complete");
  }
  if (!Array.isArray(walkthrough?.frames) || walkthrough.frames.length < 2) {
    errors.push("walkthrough must include initial frame and at least one step frame");
  }
  for (const [index, frame] of (walkthrough?.frames ?? []).entries()) {
    if (!frame.paper_state) {
      errors.push(`frame ${index}: missing paper_state`);
    }
    if (!frame.executor?.silhouette) {
      errors.push(`frame ${index}: missing executor silhouette`);
    }
    if (frame.index > 0) {
      if (!frame.fold_marker?.assignment) {
        errors.push(`frame ${index}: missing fold marker assignment`);
      }
      if (!frame.motion_cue) {
        errors.push(`frame ${index}: missing motion cue`);
      }
      for (const phase of ["anchor", "fold", "align", "crease", "release"]) {
        if (!Array.isArray(frame.contact_zones?.[phase])) {
          errors.push(`frame ${index}: missing ${phase} contact zones`);
        }
      }
    }
  }
  const evidence = walkthrough?.completion_evidence ?? {};
  for (const [key, value] of Object.entries(evidence)) {
    if (value !== true) {
      errors.push(`completion_evidence.${key} must be true`);
    }
  }
  return {
    ok: errors.length === 0,
    status: errors.length === 0 ? "complete" : "failed",
    errors
  };
}

function operationToIr(operation, order, fold) {
  const edgeIndex = findEdgeIndex(fold.edges_vertices ?? [], operation.edge);
  return {
    order,
    id: operation.id,
    name: operation.name,
    assignment: operation.assignment,
    fold_angle_hint: operation.assignment === "M" ? -180 : operation.assignment === "V" ? 180 : 0,
    fold_refs: {
      edge_vertices: operation.edge,
      edge_index: edgeIndex,
      assignment_index: edgeIndex
    },
    executor_annotations: {
      instruction: operation.instruction,
      rationale: operation.rationale
    }
  };
}

function summarizeFoldRefs(fold) {
  return {
    vertex_count: fold.vertices_coords?.length ?? 0,
    edge_count: fold.edges_vertices?.length ?? 0,
    face_count: fold.faces_vertices?.length ?? 0
  };
}

function externalFailureNotes(externalValidation) {
  return Object.values(externalValidation ?? {})
    .filter((result) => result.status !== "passed")
    .flatMap((result) => result.errors?.map((error) => `${result.adapter_id}: ${error}`) ?? []);
}

function findEdgeIndex(edges, [a, b]) {
  return edges.findIndex(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

function executorFrame(visualMetadata, phase) {
  return {
    profile_id: visualMetadata.profile_id,
    silhouette: `${visualMetadata.profile_id}-silhouette-placeholder`,
    visual_asset_status: visualMetadata.visual_asset_status,
    active_phase: phase
  };
}

function contactZonesByPhase(step) {
  return Object.fromEntries(
    ["anchor", "fold", "align", "crease", "release"].map((phase) => [phase, phaseContactZones(step, phase)])
  );
}

function phaseContactZones(step, phase) {
  const action = step?.actions?.find((candidate) => candidate.phase === phase);
  if (Array.isArray(action?.contacts) && action.contacts.length > 0) {
    return action.contacts;
  }
  if (action?.target) {
    return [action.target];
  }
  if (action?.direction) {
    return [action.direction];
  }
  return [`${phase} phase has no active contact zone`];
}

function motionCue(step) {
  const arrow = step?.annotations?.find((annotation) => annotation.type === "motion-arrow");
  if (!arrow) {
    return null;
  }
  return {
    type: "motion-arrow",
    from: arrow.from,
    to: arrow.to,
    direction: arrow.direction
  };
}

function unsupportedState(visualMetadata, phase) {
  return {
    phase,
    unsupported_actions: visualMetadata.unsupported_actions,
    needs_fixture: visualMetadata.unsupported_actions.length > 0,
    message: visualMetadata.unsupported_actions.length > 0
      ? `${visualMetadata.profile_id} requires a fixture or profile-specific plan for ${visualMetadata.unsupported_actions.join(", ")}.`
      : null
  };
}
