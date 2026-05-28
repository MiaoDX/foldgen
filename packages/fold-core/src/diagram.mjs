const REQUIRED_ACTION_PHASES = ["setup", "anchor", "fold", "align", "crease", "release"];

export const executorProfiles = Object.freeze({
  "human-hand": freezeProfile({
    id: "human-hand",
    name: "Human hand",
    contact_primitives: ["pinch", "press", "drag", "hold", "release"],
    unavailable_actions: [],
    landmark_language: {
      corners: "Identify named paper corners by their visible square positions.",
      edges: "Use the visible paper boundary as the reference edge.",
      midpoint: "Find the halfway point between two adjacent corners by eye.",
      center: "Use the intersection of diagonals or midpoint creases.",
      crease_line: "Follow the visible dashed or pressed line across the paper."
    },
    risk_notes: [
      "Paper can slide if the stable panel is not held before the fold.",
      "A fingertip may occlude midpoint landmarks during alignment."
    ]
  }),
  "two-finger-gripper": freezeProfile({
    id: "two-finger-gripper",
    name: "Two-finger gripper",
    contact_primitives: ["pinch", "press", "hold", "release"],
    unavailable_actions: ["broad palm flattening", "multi-point drag"],
    landmark_language: {
      corners: "Use detected corner points as grasp or alignment targets.",
      edges: "Track boundary segments between corner points.",
      midpoint: "Compute midpoint contacts from detected boundary endpoints.",
      center: "Use the averaged square center or crossing crease estimate.",
      crease_line: "Track the commanded edge segment as the crease line."
    },
    risk_notes: [
      "Narrow gripper contact can rotate the sheet if the opposite panel is not constrained.",
      "Alignment may fail when the fold line is hidden by the gripper jaws."
    ]
  }),
  "cat-paw-profile": freezeProfile({
    id: "cat-paw-profile",
    name: "Cat paw profile",
    contact_primitives: ["press", "drag", "hold", "release", "paw-sweep"],
    unavailable_actions: ["precision pinch", "two-point alignment"],
    landmark_language: {
      corners: "Use large visible corner regions rather than exact points.",
      edges: "Use the nearest visible boundary as a coarse alignment cue.",
      midpoint: "Treat midpoint as a broad middle region, not a precise point.",
      center: "Use the central visible patch of the paper.",
      crease_line: "Use a marked line or raised crease that can be pressed along."
    },
    risk_notes: [
      "Soft contact makes sharp creases unlikely without a tool or fixture.",
      "Dragging can tear thin paper or shift the whole sheet."
    ]
  }),
  "dog-paw-profile": freezeProfile({
    id: "dog-paw-profile",
    name: "Dog paw profile",
    contact_primitives: ["press", "drag", "hold", "release", "paw-sweep"],
    unavailable_actions: ["precision pinch", "two-point alignment", "fine fingertip crease"],
    landmark_language: {
      corners: "Use large corner zones that can be covered or braced by a paw.",
      edges: "Use the nearest visible boundary as a broad alignment rail.",
      midpoint: "Treat midpoint as a marked middle zone rather than a point target.",
      center: "Use the central visible patch of the paper.",
      crease_line: "Use a bold marked line or pre-raised crease that can be pressed with a paw pad."
    },
    risk_notes: [
      "Large paw contact can hide the crease line and push the sheet off target.",
      "Claw or nail contact can snag paper unless pressure stays broad and slow."
    ]
  })
});

export function createDiagramStep(operation, index = 1, options = {}) {
  const executorProfile = normalizeProfileId(options.executorProfile ?? operation.executor_profile ?? operation.executorProfile);
  const supportedProfiles = normalizeSupportedProfiles(
    options.supportedExecutorProfiles ?? operation.supported_executor_profiles ?? operation.supportedExecutorProfiles,
    executorProfile
  );
  const profileDefinition = getExecutorProfile(executorProfile);
  const edge = normalizeEdge(operation.edge);
  const landmarks = normalizeLandmarks(operation.landmarks, edge);
  const preState = options.preState ?? operation.pre_state ?? "Paper lies flat with the target face up and the reference square visible.";
  const fields = buildActionFields(operation, landmarks, profileDefinition);

  return {
    type: "foldgen.diagram_step.v1",
    step: index,
    operation_id: operation.id,
    title: operation.name,
    fold: {
      assignment: operation.assignment,
      edge,
      landmarks
    },
    executor_profile: executorProfile,
    executor_profile_definition: profileDefinition,
    supported_executor_profiles: supportedProfiles,
    pre_state: preState,
    anchor_grip: fields.anchor,
    fold_direction: fields.fold,
    alignment_target: fields.align,
    crease_press: fields.crease,
    release: fields.release,
    actions: [
      {
        phase: "setup",
        text: preState,
        contacts: ["paper boundary", landmarks.line]
      },
      fields.anchor,
      fields.fold,
      fields.align,
      fields.crease,
      fields.release
    ],
    checks: buildChecks(operation, landmarks),
    failure_modes: buildFailureModes(profileDefinition, landmarks),
    annotations: buildAnnotations(operation, edge, landmarks),
    instruction: operation.instruction ?? buildInstruction(operation, landmarks)
  };
}

export function createDiagramSequence(steps, options = {}) {
  const normalizedSteps = steps.map((step, index) => ({
    ...step,
    step: step.step ?? index + 1
  }));
  const executorProfile = normalizeProfileId(options.executorProfile ?? normalizedSteps[0]?.executor_profile);
  return {
    type: "foldgen.diagram_sequence.v1",
    executor_profile: executorProfile,
    executor_profiles: unique([
      executorProfile,
      ...normalizedSteps.flatMap((step) => step.supported_executor_profiles ?? [step.executor_profile])
    ]),
    step_count: normalizedSteps.length,
    steps: normalizedSteps
  };
}

export function getExecutorProfile(profileId = "human-hand") {
  const normalized = normalizeProfileId(profileId);
  const profile = executorProfiles[normalized];
  if (!profile) {
    throw new Error(`${profileId}: unknown executor profile`);
  }
  return clone(profile);
}

export function validateExecutorReadableStep(step) {
  const errors = [];
  if (!isObject(step)) {
    return { ok: false, status: "failed", errors: ["step must be an object"] };
  }

  requireString(step, "operation_id", errors);
  requireString(step, "title", errors);
  requireString(step, "executor_profile", errors);
  requireString(step, "pre_state", errors);

  if (!executorProfiles[step.executor_profile]) {
    errors.push(`executor_profile must be one of ${Object.keys(executorProfiles).join(", ")}`);
  }
  if (!isObject(step.executor_profile_definition)) {
    errors.push("executor_profile_definition is required");
  } else {
    validateProfileDefinition(step.executor_profile_definition, "executor_profile_definition", errors);
    if (step.executor_profile_definition.id !== step.executor_profile) {
      errors.push("executor_profile_definition.id must match executor_profile");
    }
  }
  if (!Array.isArray(step.supported_executor_profiles) || !step.supported_executor_profiles.includes(step.executor_profile)) {
    errors.push("supported_executor_profiles must include executor_profile");
  }

  validateFoldBlock(step.fold, errors);
  validateObjectField(step.anchor_grip, "anchor_grip", errors);
  validateObjectField(step.fold_direction, "fold_direction", errors);
  validateObjectField(step.alignment_target, "alignment_target", errors);
  validateObjectField(step.crease_press, "crease_press", errors);
  validateObjectField(step.release, "release", errors);
  validateActions(step.actions, errors);
  validateStringArray(step.checks, "checks", 2, errors);
  validateStringArray(step.failure_modes, "failure_modes", 1, errors);
  validateAnnotations(step.annotations, errors);

  return {
    ok: errors.length === 0,
    status: errors.length === 0 ? "complete" : "failed",
    errors
  };
}

function buildActionFields(operation, landmarks, profileDefinition) {
  const foldKind = assignmentName(operation.assignment);
  const foldDirection = operation.direction ?? defaultDirection(operation.assignment);
  const profileId = profileDefinition.id;
  const anchorText = actionText(profileId, "anchor", landmarks, foldKind);
  const foldText = actionText(profileId, "fold", landmarks, foldKind);
  const alignText = actionText(profileId, "align", landmarks, foldKind);
  const creaseText = actionText(profileId, "crease", landmarks, foldKind);
  const releaseText = actionText(profileId, "release", landmarks, foldKind);
  return {
    anchor: {
      phase: "anchor",
      text: anchorText,
      contacts: [`stable panel near ${landmarks.start}`, `stable panel near ${landmarks.end}`],
      primitives: choosePrimitives(profileDefinition, ["hold", "press"])
    },
    fold: {
      phase: "fold",
      text: foldText,
      direction: foldDirection,
      primitives: choosePrimitives(profileDefinition, ["pinch", "drag", "paw-sweep"])
    },
    align: {
      phase: "align",
      text: alignText,
      target: operation.alignment_target ?? `${landmarks.start} and ${landmarks.end} overlap within visual tolerance`
    },
    crease: {
      phase: "crease",
      text: creaseText,
      contacts: [landmarks.start, "center", landmarks.end],
      primitives: choosePrimitives(profileDefinition, ["press"])
    },
    release: {
      phase: "release",
      text: releaseText,
      primitives: choosePrimitives(profileDefinition, ["release"])
    }
  };
}

function actionText(profileId, phase, landmarks, foldKind) {
  const generic = {
    anchor: `Anchor the stable panel on both sides of the ${landmarks.line}.`,
    fold: `Move the free panel along the ${landmarks.line} as a ${foldKind} fold.`,
    align: `Align ${landmarks.start} with ${landmarks.end} without letting the anchored panel slide.`,
    crease: `Press along the full ${landmarks.line} from ${landmarks.start} to ${landmarks.end}.`,
    release: `Release the moving panel while keeping the new ${foldKind} crease visible.`
  };
  const variants = {
    "two-finger-gripper": {
      anchor: `Hold the stable panel with one gripper contact on each side of the ${landmarks.line}.`,
      fold: `Pinch the free panel and rotate it along the ${landmarks.line} as a ${foldKind} fold.`,
      align: `Use detected endpoints to align ${landmarks.start} with ${landmarks.end} while the gripper keeps the base panel fixed.`,
      crease: `Press the gripper pad along the ${landmarks.line} in short segments from ${landmarks.start} to ${landmarks.end}.`,
      release: `Open the gripper slowly and keep the new ${foldKind} crease in view.`
    },
    "cat-paw-profile": {
      anchor: `Press a broad paw pad on the stable panel below the ${landmarks.line}.`,
      fold: `Sweep the free panel over the ${landmarks.line} with a slow paw drag to form a ${foldKind} fold.`,
      align: `Use broad visual zones near ${landmarks.start} and ${landmarks.end}; do not require point-perfect alignment.`,
      crease: `Press along the ${landmarks.line} with repeated gentle paw-pad presses from ${landmarks.start} to ${landmarks.end}.`,
      release: `Lift the paw vertically so the new ${foldKind} crease is not dragged out of place.`
    },
    "dog-paw-profile": {
      anchor: `Brace the stable panel with a broad paw contact beside the ${landmarks.line}.`,
      fold: `Nudge the free panel over the ${landmarks.line} with a controlled paw sweep to form a ${foldKind} fold.`,
      align: `Align the broad regions around ${landmarks.start} and ${landmarks.end}; keep the paw from covering both landmarks at once.`,
      crease: `Press the ${landmarks.line} with slow paw-pad pressure, moving from ${landmarks.start} through the center to ${landmarks.end}.`,
      release: `Ease pressure off the paw without dragging claws across the new ${foldKind} crease.`
    }
  };
  return variants[profileId]?.[phase] ?? generic[phase];
}

function buildChecks(operation, landmarks) {
  return [
    `The new ${assignmentName(operation.assignment)} crease is visible on the ${landmarks.line}.`,
    "No boundary edge has moved outside the source square."
  ];
}

function buildFailureModes(profileDefinition, landmarks) {
  return [
    `If the paper slides, re-anchor near ${landmarks.start} and repeat the fold slowly.`,
    `${profileDefinition.name}: ${profileDefinition.risk_notes[0]}`
  ];
}

function buildAnnotations(operation, edge, landmarks) {
  return [
    {
      type: "fold-line",
      edge,
      assignment: operation.assignment,
      label: landmarks.line
    },
    {
      type: "motion-arrow",
      from: "free panel",
      to: "alignment target",
      direction: defaultDirection(operation.assignment)
    },
    {
      type: "landmark",
      labels: [landmarks.start, landmarks.end]
    }
  ];
}

function buildInstruction(operation, landmarks) {
  return `${operation.name}: fold along the ${landmarks.line} from ${landmarks.start} to ${landmarks.end}.`;
}

function normalizeLandmarks(landmarks, edge) {
  if (isObject(landmarks) && landmarks.start && landmarks.end && landmarks.line) {
    return {
      start: String(landmarks.start),
      end: String(landmarks.end),
      line: String(landmarks.line)
    };
  }

  const key = edge.join("-");
  const known = {
    "5-6": {
      start: "left midpoint",
      end: "right midpoint",
      line: "horizontal midpoint crease"
    },
    "0-2": {
      start: "top-left corner",
      end: "bottom-right corner",
      line: "main diagonal crease"
    },
    "1-3": {
      start: "top-right corner",
      end: "bottom-left corner",
      line: "cross diagonal crease"
    }
  };
  return known[key] ?? {
    start: `vertex ${edge[0]}`,
    end: `vertex ${edge[1]}`,
    line: `crease from vertex ${edge[0]} to vertex ${edge[1]}`
  };
}

function validateFoldBlock(fold, errors) {
  if (!isObject(fold)) {
    errors.push("fold is required");
    return;
  }
  requireString(fold, "assignment", errors);
  if (!Array.isArray(fold.edge) || fold.edge.length !== 2 || !fold.edge.every(Number.isInteger)) {
    errors.push("fold.edge must contain two vertex indexes");
  }
  if (!isObject(fold.landmarks)) {
    errors.push("fold.landmarks is required");
    return;
  }
  requireString(fold.landmarks, "start", errors, "fold.landmarks");
  requireString(fold.landmarks, "end", errors, "fold.landmarks");
  requireString(fold.landmarks, "line", errors, "fold.landmarks");
}

function validateActions(actions, errors) {
  if (!Array.isArray(actions)) {
    errors.push("actions must be an array");
    return;
  }
  for (const phase of REQUIRED_ACTION_PHASES) {
    const action = actions.find((entry) => entry?.phase === phase);
    if (!action) {
      errors.push(`actions must include ${phase}`);
      continue;
    }
    requireString(action, "text", errors, `actions.${phase}`);
    if ((phase === "anchor" || phase === "crease") && (!Array.isArray(action.contacts) || action.contacts.length === 0)) {
      errors.push(`actions.${phase}.contacts must be a non-empty array`);
    }
    if (phase === "fold") {
      requireString(action, "direction", errors, "actions.fold");
    }
    if (phase === "align") {
      requireString(action, "target", errors, "actions.align");
    }
  }
}

function validateAnnotations(annotations, errors) {
  if (!Array.isArray(annotations)) {
    errors.push("annotations must be an array");
    return;
  }
  if (!annotations.some((annotation) => annotation?.type === "fold-line")) {
    errors.push("annotations must include a fold-line");
  }
  if (!annotations.some((annotation) => annotation?.type === "motion-arrow")) {
    errors.push("annotations must include a motion-arrow");
  }
}

function validateProfileDefinition(profile, label, errors) {
  requireString(profile, "id", errors, label);
  requireString(profile, "name", errors, label);
  validateStringArray(profile.contact_primitives, `${label}.contact_primitives`, 1, errors);
  if (!Array.isArray(profile.unavailable_actions)) {
    errors.push(`${label}.unavailable_actions must be an array`);
  }
  if (!isObject(profile.landmark_language)) {
    errors.push(`${label}.landmark_language is required`);
  }
  validateStringArray(profile.risk_notes, `${label}.risk_notes`, 1, errors);
}

function validateObjectField(value, label, errors) {
  if (!isObject(value)) {
    errors.push(`${label} is required`);
    return;
  }
  requireString(value, "text", errors, label);
}

function validateStringArray(value, label, minimum, errors) {
  if (!Array.isArray(value) || value.length < minimum || !value.every((entry) => typeof entry === "string" && entry.length > 0)) {
    errors.push(`${label} must contain at least ${minimum} non-empty string${minimum === 1 ? "" : "s"}`);
  }
}

function requireString(source, key, errors, label = "") {
  if (typeof source[key] !== "string" || source[key].length === 0) {
    errors.push(`${label ? `${label}.` : ""}${key} must be a non-empty string`);
  }
}

function normalizeEdge(edge) {
  if (!Array.isArray(edge) || edge.length !== 2 || !edge.every(Number.isInteger)) {
    throw new Error("diagram operation edge must contain two vertex indexes");
  }
  return [...edge];
}

function normalizeProfileId(profileId) {
  return profileId ?? "human-hand";
}

function normalizeSupportedProfiles(profileIds, executorProfile) {
  return unique(["human-hand", executorProfile, ...(Array.isArray(profileIds) ? profileIds : [])]);
}

function choosePrimitives(profileDefinition, preferred) {
  return preferred.filter((primitive) => profileDefinition.contact_primitives.includes(primitive));
}

function assignmentName(assignment) {
  switch (assignment) {
    case "M":
      return "mountain";
    case "V":
      return "valley";
    default:
      return String(assignment ?? "unassigned").toLowerCase();
  }
}

function defaultDirection(assignment) {
  return assignment === "M"
    ? "free panel moves away from the executor over the marked crease"
    : "free panel moves toward the executor over the marked crease";
}

function freezeProfile(profile) {
  return deepFreeze(clone(profile));
}

function deepFreeze(value) {
  Object.freeze(value);
  for (const entry of Object.values(value)) {
    if (entry && typeof entry === "object" && !Object.isFrozen(entry)) {
      deepFreeze(entry);
    }
  }
  return value;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}
