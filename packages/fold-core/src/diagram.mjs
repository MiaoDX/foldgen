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
  const operationIntent = describeOperationIntent(operation);
  const preState = options.preState ?? operation.pre_state ?? buildPreState(operation, operationIntent);
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
    instruction: buildInstruction(operation, landmarks)
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
  const profileId = profileDefinition.id;
  const intent = describeOperationIntent(operation);
  const foldDirection = operation.direction ?? `${intent.commandLower}; ${defaultDirection(operation.assignment)}`;
  const anchorText = actionText(profileId, "anchor", landmarks, foldKind, intent);
  const foldText = actionText(profileId, "fold", landmarks, foldKind, intent);
  const alignText = actionText(profileId, "align", landmarks, foldKind, intent);
  const creaseText = actionText(profileId, "crease", landmarks, foldKind, intent);
  const releaseText = actionText(profileId, "release", landmarks, foldKind, intent);
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
      target: operation.alignment_target ?? intent.target
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

function actionText(profileId, phase, landmarks, foldKind, intent) {
  const generic = {
    anchor: `Anchor the panels that must stay still before you ${intent.commandLower} on the ${landmarks.line}.`,
    fold: `${intent.command} along the ${landmarks.line} as a ${foldKind} fold.`,
    align: `Align the ${intent.target} while keeping ${landmarks.start} and ${landmarks.end} within visual tolerance.`,
    crease: `Press the ${intent.crease} from ${landmarks.start} to ${landmarks.end}.`,
    release: `Release after the ${intent.result}.`
  };
  const variants = {
    "two-finger-gripper": {
      anchor: `Hold the stable panel with one gripper contact on each side before you ${intent.commandLower}.`,
      fold: `Pinch the free panel and rotate it to ${intent.commandLower} along the ${landmarks.line}.`,
      align: `Use detected endpoints to preserve the ${intent.target} while the gripper keeps the base panel fixed.`,
      crease: `Press the gripper pad in short segments to set the ${intent.crease}.`,
      release: `Open the gripper slowly after the ${intent.result} is visible.`
    },
    "cat-paw-profile": {
      anchor: `Press a broad paw pad on the stable panel before you ${intent.commandLower}.`,
      fold: `Sweep the free panel slowly to ${intent.commandLower}; use the ${landmarks.line} as a broad guide.`,
      align: `Use broad visual zones to keep the ${intent.target}; do not require point-perfect alignment.`,
      crease: `Use repeated gentle paw-pad presses to set the ${intent.crease}.`,
      release: `Lift the paw vertically after the ${intent.target} reads clearly, without dragging it out of place.`
    },
    "dog-paw-profile": {
      anchor: `Brace the stable panel with a broad paw contact before you ${intent.commandLower}.`,
      fold: `Nudge the free panel with a controlled paw sweep to ${intent.commandLower}.`,
      align: `Keep the paw from covering both landmarks while preserving the ${intent.target}.`,
      crease: `Apply slow paw-pad pressure to set the ${intent.crease}.`,
      release: `Ease pressure off the paw without dragging across the ${intent.result}.`
    }
  };
  return variants[profileId]?.[phase] ?? generic[phase];
}

function buildPreState(operation, intent) {
  return `Before this step, keep the current model stable and prepare to ${intent.short}.`;
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
  if (typeof operation.instruction === "string" && operation.instruction.length > 0) {
    return operation.rationale
      ? `${operation.instruction} ${operation.rationale}`
      : operation.instruction;
  }
  return `${operation.name}: fold along the ${landmarks.line} from ${landmarks.start} to ${landmarks.end}.`;
}

function describeOperationIntent(operation) {
  const name = String(operation.name ?? "complete the fold");
  const rationale = typeof operation.rationale === "string" && operation.rationale.length > 0
    ? operation.rationale
    : operation.instruction ?? name;
  const short = name.charAt(0).toLowerCase() + name.slice(1);
  const command = intentCommand(name);
  return {
    short,
    command,
    commandLower: command.charAt(0).toLowerCase() + command.slice(1),
    target: intentTarget(name, rationale),
    crease: intentCrease(name, rationale),
    result: intentResult(name, rationale)
  };
}

function intentCommand(name) {
  const lower = name.toLowerCase();
  if (lower.includes("center lock")) {
    return "Press the center lock inward";
  }
  if (lower.includes("soften") || lower.includes("rim")) {
    return "Soften the petal rim with a shallow bend";
  }
  if (lower.includes("diagonal")) {
    return "Swing the diagonal panel into its guide line";
  }
  if (lower.includes("centerline")) {
    return "Bring the centerline panel into the marked crease";
  }
  if (lower.includes("tail")) {
    return "Separate the tail panel from the body";
  }
  if (lower.includes("fin")) {
    return "Lift the small fin panel";
  }
  if (lower.includes("keel")) {
    return "Press the keel guide into the lower panel";
  }
  return name;
}

function intentTarget(name, rationale) {
  const text = `${name} ${rationale}`.toLowerCase();
  if (text.includes("center")) {
    return "center patch";
  }
  if (text.includes("rim")) {
    return "outer petal rim";
  }
  if (text.includes("petal")) {
    return "petal guide";
  }
  if (text.includes("tail")) {
    return "tail separation";
  }
  if (text.includes("fin")) {
    return "fin crease";
  }
  if (text.includes("keel")) {
    return "keel guide";
  }
  if (text.includes("diagonal")) {
    return "diagonal guide";
  }
  return "new fold guide";
}

function intentCrease(name, rationale) {
  return `${intentTarget(name, rationale)} crease`;
}

function intentResult(name, rationale) {
  return `${intentTarget(name, rationale)} reads clearly`;
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
    case "F":
      return "flat";
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
