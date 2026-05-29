# Roadmap

## Contract Refinement: 2026-05-28

The first implementation pass completed the coarse M0-M4 technical spine, and
the screenshot review exposed that "executor-readable diagram" was
underspecified: the demo could show one-sentence steps, not a followable
executor action flow.

Canonical refined contract: `docs/contracts/stage-1-output-contract.md`.

Implication:
- Existing commits remain useful technical proof for fixtures, FOLD/SVG,
  validation, pipeline, preview, demo wiring, and claim labels.
- Phase 5 upgraded the already-built spine rather than restarting the
  milestones from scratch.
- M1-M4 now rely on the refined executor-readable gate for current Stage 1
  labels.

## Phase 1: M0/M1 Public Testbed And Deterministic Core Spine

Goal: a contributor can install, validate fixtures, and run one deterministic
fold case locally, producing parseable FOLD, deterministic SVG, validation
result, preview data, and one executor-readable diagram step.

Requirements:
- FOLDGEN-M0-PUBLIC-TESTBED
- FOLDGEN-M1-DETERMINISTIC-CORE

Success criteria:
- Public base-form and target fixtures with metadata are committed.
- Fixture validation passes for valid fixtures and fails for the malformed
  fixture.
- The deterministic one-fold case writes stable output artifacts.
- The deterministic one-fold case writes an executor-readable diagram step under
  `docs/contracts/stage-1-output-contract.md`.
- No command depends on `MiaoDX/microsites`, paid APIs, or manual asset copying.

Status: Completed under the refined executor-readable contract after Phase 5.

Proof:
- Commit `5773f81` (`feat(fold-core): add deterministic m0 m1 spine`)
- `npm test`
- `npm run validate:fixtures`
- `npm run m1:deterministic`
- Phase 5 follow-up: deterministic output validates executor profile,
  structured actions, checks, failure modes, and annotations.

## Phase 2: M2 Local Pipeline

Goal: five curated targets run through the local pipeline and record per-case
outputs, validation status, proposal history, critic history, claim status, and
executor-readable diagram sequence.

Requirements:
- FOLDGEN-M2-PIPELINE

Success criteria:
- Five target runs record validation, proposal, and critic history.
- Five target runs record executor-readable diagram sequences and claim status.
- Invalid and partial results are visible and understandable.
- No live provider adapter or private runtime asset is required.

Status: Completed under the refined executor-readable contract after Phase 5.

Proof:
- Commit `0f68672` (`feat(foldgen-agent): add deterministic m2 pipeline`)
- `npm test`
- `npm run validate:fixtures`
- `npm run m1:deterministic`
- `npm run m2:pipeline`
- Phase 5 follow-up: five case summaries include `executor_readable: true`,
  `diagram-sequence.json`, profile-specific sequences for human hand, robot
  gripper, cat paw, and dog paw, and the refined claim label.

Depends on: Phase 1

## Phase 3: M3 Web Demo

Goal: the web demo renders local pipeline outputs with clear states,
downloadable artifacts, executor profile, and followable action flow.

Requirements:
- FOLDGEN-M3-WEB-DEMO

Success criteria:
- The demo connects to local pipeline outputs.
- Upload and curated text target entry points are represented.
- Empty, loading, invalid, partial, success, preview, and download states are
  covered.
- Executor-readable action flow is visible for a selected case.

Status: Completed under the refined executor-readable contract after Phase 5.

Proof:
- Commit `9df7327` (`feat(demo): add local m3 pipeline viewer`)
- `npm test`
- `npm run validate:fixtures`
- `npm run m1:deterministic`
- `npm run m2:pipeline`
- `npm run demo`
- Headless Chrome screenshot smoke test for `/demo/?case=simple-bird`
- Phase 5 follow-up: demo renders an executor profile selector plus setup,
  anchor, fold, align, crease, release, checks, and failure modes for the
  selected profile.

Depends on: Phase 2

## Phase 4: M4 Technical Closeout And Claim Guard

Goal: public materials make only evidence-backed claims while Stage 1 remains
unblocked by external executor participation.

Requirements:
- FOLDGEN-M4-CLAIM-GUARD

Success criteria:
- `npm run validate:stage1` passes as the current technical gate.
- README/blog/demo labels distinguish simulator-valid, executor-readable, and
  embodiment-validated.
- Final embodiment records are documented as optional launch-claim evidence.
- Related-work status is rechecked before public launch copy.

Status: Completed under the refined executor-readable contract after Phase 5.

Proof:
- `npm test`
- `npm run validate:stage1`
- `npm run validate:claims`
- Public surfaces and pipeline summaries label current cases as
  `simulator-valid / executor-readable / embodiment-untested`.
- Related-work recheck recorded in
  `docs/launch/related-work-check-2026-05-28.md`.

Claim guard:
- Physical-execution claims require final embodiment records. Simulator-valid
  output, deterministic preview, and critic scores are not embodiment evidence.

Gate:
- `npm run validate:stage1` is the Stage 1 gate.
- `npm run validate:embodiment` is final-stage only and must not block current
  technical work.

Depends on: Phase 3

## Phase 5: Executor-readable Contract Upgrade

Goal: upgrade the existing Stage 1 spine so all M1-M4 outputs satisfy
`docs/contracts/stage-1-output-contract.md`.

Requirements:
- FOLDGEN-M1-DETERMINISTIC-CORE
- FOLDGEN-M2-PIPELINE
- FOLDGEN-M3-WEB-DEMO
- FOLDGEN-M4-CLAIM-GUARD

Success criteria:
- M1 deterministic output includes executor profile, structured actions,
  checks, failure modes, and annotations.
- M2 emits executor-readable sequences and claim status for all five curated
  cases across human hand, robot gripper, cat paw, and dog paw profiles.
- M3 renders an executor profile selector and followable action flow.
- M4 labels current cases as
  `simulator-valid / executor-readable / embodiment-untested` only after the
  executor-readable gate passes.

Status: Completed

Proof:
- `npm test`
- `npm run validate:fixtures`
- `npm run m1:deterministic`
- `npm run m2:pipeline`
- `npm run validate:claims`
- `npm run validate:stage1`
- Local demo smoke test for `/demo/?case=simple-bird` showing executor profile
  and action flow.

Depends on: Phase 4 coarse technical spine

## Continuation Roadmap: 2026-05-28

The next six items are ordered by dependency, not by equal priority. Preview and
animation work intentionally stays last so it can visualize the real local
generation path rather than a separate display-only path.

Canonical order:
1. Phase 6: multi-step fold operation foundation.
2. Phase 7: local search loop.
3. Phase 8: critic v0.
4. Phase 9: image-to-fold path.
5. Phase 10: expanded public testbed.
6. Phase 11: preview and animation improvement.

Out of scope for this continuation:
- Live paid provider adapters.
- Physical execution or embodiment-validated claims.
- Repositioning around external research code.

## Phase 6: Multi-step Fold Operation Foundation

Goal: local generation can represent, apply, validate, and render a sequence of
2-5 fold operations instead of a single local fold.

Requirements:
- Multi-step operation application in `fold-core`.
- Operation history records every step in order.
- Deterministic and curated pipeline artifacts emit multi-step diagram
  sequences.
- Human hand, robot gripper, cat paw, and dog paw profiles all receive the same
  multi-step coverage.

Success criteria:
- A focused multi-step command writes valid FOLD, SVG, preview, validation, and
  profile-specific multi-step diagram sequences.
- The five curated pipeline cases each select a multi-step sequence.
- Tests prove the derived FOLD history and diagram sequence contain more than
  one step.

Status: Completed

Gate:
- `npm run m6:multistep`
- `npm test`
- `npm run validate:stage1`

Proof:
- `npm run m6:multistep`
- `npm test`
- `npm run validate:stage1`
- M2 pipeline summary records `selected_operation_count: 2` for all five
  curated cases.

Depends on: Phase 5

## Phase 7: Local Search Loop

Goal: replace purely curated selection with a deterministic local
propose-render-validate-score-pick loop that can build a sequence step by step.

Success criteria:
- Search records iterations, proposals, validation results, score history, and
  selected sequence.
- Search runs locally without paid APIs or private assets.
- Search preserves all four executor profiles in emitted diagram sequences.

Status: Completed

Gate:
- `npm run m7:search`
- `npm test`

Proof:
- `npm run m7:search`
- `npm test`
- `npm run validate:stage1`
- `out/m7-search/summary.json` records five complete search cases with two
  iterations each and executor-readable multi-step sequences for all four
  executor profiles.

Depends on: Phase 6

## Phase 8: Critic v0

Goal: add a cheap deterministic critic that scores local candidates using target
features, operation coverage, structural validity, and preview geometry.

Success criteria:
- Critic decisions are recorded separately from proposal generation.
- Invalid candidates score to rejection while valid candidates are ranked
  deterministically.
- Tests cover score ordering and reason output.

Status: Completed

Gate:
- `npm run m8:critic`
- `npm test`

Proof:
- `npm run m8:critic`
- `npm test`
- `npm run validate:stage1`
- `out/m8-critic/summary.json` records five ranked critic cases, selected valid
  candidates, invalid rejections, score components, and reasons.

Depends on: Phase 7

## Phase 9: Image-to-fold Path

Goal: a reference image file enters base-form selection and local search instead
of only being matched to an already curated case.

Success criteria:
- A local reference SVG/image path can be analyzed into image features.
- Base form selection is recorded with reasons.
- The selected base form runs through local search and writes fold, preview,
  diagram, and claim artifacts.

Status: Completed

Gate:
- `npm run m9:image-to-fold -- benchmarks/targets/simple-bird.svg`
- `npm test`

Proof:
- `npm run m9:image-to-fold -- benchmarks/targets/simple-bird.svg`
- `npm test`
- `npm run validate:stage1`
- `out/m9-image-to-fold/summary.json` records reference SVG analysis, profile
  selection, base-form selection, local search output, and executor-readable
  diagram artifacts.

Depends on: Phase 8

## Phase 10: Expanded Public Testbed

Goal: expand beyond the original five curated targets so local gates exercise a
broader shape vocabulary.

Success criteria:
- Public target fixtures reach 10-15 cases.
- At least 5 creative/reference cases are documented in metadata.
- A local testbed command validates metadata and runs the image-to-fold path
  across the expanded fixture set.

Status: Completed

Gate:
- `npm run m10:testbed`
- `npm run validate:fixtures`
- `npm test`

Proof:
- `npm run m10:testbed`
- `npm run validate:fixtures`
- `npm test`
- `npm run validate:stage1`
- `out/m10-testbed/summary.json` records ten image-to-fold cases, including
  five creative/reference cases.

Depends on: Phase 9

## Phase 11: Preview And Animation Improvement

Goal: preview output shows operation progress over the generated multi-step
sequence, and the demo can render that animation artifact.

Success criteria:
- Pipeline/image-to-fold artifacts include animation frames derived from
  operation history.
- Demo fetches and renders the animation artifact without dropping the static
  preview fallback.
- Tests cover animation frame shape and demo artifact serving.

Status: Completed

Gate:
- `npm run m11:preview`
- `npm test`
- `npm run validate:stage1`

Proof:
- `npm run m11:preview`
- `npm test`
- `npm run validate:stage1`
- Pipeline/search/image-to-fold artifacts expose `preview_animation` paths and
  `preview-animation.json` contains multi-frame operation-history animation
  data.

Depends on: Phase 10

## Phase 12: Solver-backed Real Folding Pipeline

Goal: replace schematic target-completion claims with solver-backed folded-state
evidence for at least one target, using `simple-boat` as the forcing function.

Success criteria:
- A Flat-Folder solver-state adapter writes folded-state artifacts for a
  passing case.
- Completed-target status requires external solver pass and a folded-state
  artifact.
- `simple-boat` either passes the solver-backed gate or is demoted from
  completed output with visible conflict evidence.
- The existing 2.5D preview is explicitly inspection-only and cannot be used as
  final folded-result evidence.

Status: Implemented

Gate:
- `npm run m12:solver-state`
- `npm test`
- `npm run validate:stage1`

Proof:
- `npm run m12:solver-state` reports one completed case
  (`simple-fish`) and four blocked cases with explicit solver or target-match
  reasons.
- `simple-boat` is blocked by Flat-Folder taco-taco conflict evidence and is no
  longer reported as a completed target.
- `simple-flower` passes solver-state extraction but is blocked by the
  silhouette target-match gate.
- `npm run m13:three-preview` verifies the solver-backed Three.js preview path
  for `simple-fish`, the blocked fallback path for `simple-boat`, and writes
  screenshots under `tmp/qa/`.
- `npm test`
- `npm run validate:stage1`

Depends on: Phase 11

## Phase 13: Usable Origami Generation Pipeline

Goal: finish the shift from schematic explanation to usable, artifact-backed
origami generation.

Success criteria:
- Completed cases render from solver-backed `folded-state.fold` through
  Three.js/WebGL.
- Blocked or inspection-only cases cannot look like completed results.
- At least three default targets pass solver-state and target-match gates before
  the UI uses completed-results language.
- Step walkthrough visuals are backed by step-state artifacts or explicitly
  marked inspection-only.
- Human hand, two-finger gripper, cat paw, and dog paw visuals are
  geometry-linked contact overlays, not decorative side images.
- Candidate search ranks by solver-backed target-match score rather than
  curated operation names.

Status: Implemented for Slices A-F. Slice A hard display decision is
implemented and
verified. Slice B Origami Simulator spike is implemented as a blocker/route
decision: compatible input frames are generated, but automated solved-state
export is not available yet. Slice C known-good tutorial provenance is
implemented for the first two solver-derived fixtures. Slice D full step-state
validator is implemented. Slice E executor overlay artifacts are implemented.
Slice F solver-backed search records are implemented.
Slice F solver-backed search records are implemented.

Slice A status: Implemented. Case summaries carry `display_mode`; the demo
drives completed/blocked panels from that field; step detail preserves the
selected step number; ambiguous dashed helper lines are removed from step SVGs;
and step visual artifacts include profile-specific executor overlays plus
annotation legends.

Slice B status: Implemented for a first solver-derived known-good set. Default
pipeline now completes `known-good-triangle`, `known-good-corner`, and
`simple-fish`; `simple-boat` remains blocked by solver evidence.

Slice C status: Implemented as per-step post-state extraction. Known-good
single-step targets have complete solver-backed walkthrough steps with changed
frame evidence; multi-step cases record partial or inspection-only prefix
states instead of implying unavailable intermediate solver support.

Gate:
- Slice A: `npm run m13:display-modes`, `npm run m13:three-preview`,
  `npm test`, `npm run validate:stage1`
- Slice B: `npm run m14:known-good-targets`, `npm test`,
  `npm run validate:stage1`
- Slice C: `npm run m15:step-state-walkthrough`, `npm test`,
  `npm run validate:stage1`
- Slice D: `npm run m16:executor-overlays`, `npm test`,
  `npm run validate:stage1`
- Slice E: `npm run m17:solver-search`, `npm test`,
  `npm run validate:stage1`

Depends on: Phase 12

## Phase 14: Real Usable Origami Generation Pipeline

Goal: completed origami cases become genuinely usable instead of clearer
schematics. A completed case must be backend-folded, target-like, full
step-state walkthrough-backed, executor-overlay-backed, and selected by a hard
display decision artifact.

Canonical plan:
- `docs/plans/real-usable-origami-generation-pipeline.md`
- `.planning/phases/14-real-usable-origami-generation-pipeline/PLAN.md`

Requirements:
- Add `display-decision.json` as the only trusted source for completed display.
- Introduce `completed-usable` and stricter blocked/partial modes.
- Spike Origami Simulator as a progressive-state backend or reject it with a
  concrete blocker.
- Build a known-good tutorial case set with provenance and full artifact graph.
- Require full pre/post state walkthrough artifacts for completed-usable cases.
- Promote executor overlays into geometry-linked artifacts.
- Route candidate search through backend pass, target-match, walkthrough
  completeness, and overlay completeness.

Success criteria:
- At least two local demo cases are `completed-usable`.
- At least one recognizable object either passes all gates or is blocked with
  exact evidence.
- Boat cannot show as successful unless it passes every hard gate.
- Heuristic previews are inspection-only and cannot drive completed display.

Status: Implemented. Slice A hard display decision is implemented and
verified. Slice B Origami Simulator spike is implemented as a blocker/route
decision: compatible input frames are generated, but automated solved-state
export is not available yet. Slice C known-good tutorial provenance is
implemented for solver-derived fixtures. Slice D full step-state validator is
implemented. Slice E executor overlay artifacts are implemented. Slice F
solver-backed search records are implemented.

Gate:
- `npm run m18:display-decision` (implemented)
- `npm run m19:origami-simulator-spike` (implemented, blocked as automated backend)
- `npm run m20:known-good-tutorials` (implemented)
- `npm run m21:full-step-states` (implemented)
- `npm run m22:executor-overlay-artifacts` (implemented)
- `npm run m23:solver-backed-search` (implemented)
- `npm test`
- `npm run validate:stage1`

Depends on: Phase 12 and Phase 13 solver/display foundations

## Phase 15: Production Usable Origami Generation

Goal: move from honest blocked/partial evidence to at least one genuinely
recognizable, completed, usable origami demo. Known-good tutorials and generated
candidates must pass the same hard promotion gate before the demo can display
them as completed.

Canonical plan:
- `docs/plans/production-usable-origami-generation.md`
- `.planning/phases/15-production-usable-origami-generation/PLAN.md`

Requirements:
- Lock the full artifact graph so `completed-usable` cannot be inferred from
  labels or heuristic previews.
- Add one recognizable known-good tutorial that passes every gate, or keep boat
  blocked and promote a different simple recognizable object.
- Add a validated route for progressive state artifacts, including manual
  simulator-state import if automation is still blocked.
- Render selected step pre/post states through Three.js.
- Graduate generated candidates only through backend state, target-match,
  complete step-state, and overlay gates.
- Add local screenshot and pixel review gates for the demo.

Success criteria:
- At least one recognizable object is `completed-usable`.
- At least two simple fixtures remain `completed-usable`.
- Boat is either truly completed or explicitly blocked with exact evidence.
- Completed step views come from backend pre/post state artifacts.
- Hand, gripper, cat paw, and dog paw overlays are profile-specific and linked
  to geometry.
- The demo never uses heuristic preview as a completed result.

Status: Implemented and verified. The default pipeline now has four
`completed-usable` known-good cases: `known-good-triangle`,
`known-good-corner`, `known-good-paper-hat`, and
`known-good-square-packet`. `known-good-paper-hat` and
`known-good-square-packet` are the recognizable completed fixtures added in
this phase. `known-good-square-packet` is the multi-step backend-state proof
case. `simple-boat` remains `blocked-solver` and is not a completed product
demo. Selected-step walkthroughs now animate from backend pre-state FOLD to
backend post-state FOLD in Three.js/WebGL, with profile-specific 3D executor
contact overlays in the same scene.

Gate:
- `npm run m24:artifact-graph` (implemented)
- `npm run m25:recognizable-known-good` (implemented)
- `npm run m26:progressive-state-backend` (implemented)
- `npm run m27:three-step-walkthrough` (implemented)
- `npm run m28:candidate-graduation` (implemented)
- `npm run m29:local-preview-review` (implemented)
- `npm test`
- `npm run validate:stage1`

Proof:
- `npm run m24:artifact-graph`
- `npm run m25:recognizable-known-good`
- `npm run m26:progressive-state-backend`
- `npm run m27:three-step-walkthrough`
- `npm run m28:candidate-graduation`
- `npm run m29:local-preview-review`
- `npm test`
- `npm run validate:stage1`
- Local screenshots are written under `tmp/qa/`, including
  `foldgen-square-packet-completed-usable.png`.
- `npm run m29:local-preview-review` verifies selected-step pre/post WebGL
  animation frame differences and same-step human-hand vs cat-paw WebGL pixel
  differences.

Known remaining blocker:
- Origami Simulator automation is still `blocked-automated-state-export`; the
  accepted production path is validated known-good or manual/imported state
  artifacts with provenance and checksums.

Depends on: Phase 14

## Phase 16: Generated Usable Origami Graduation

Goal: move from known-good fixture success to evidence-backed generated success.
Generated candidates must pass the same hard artifact chain as known-good
fixtures before the demo can display them as completed.

Canonical plan:
- `docs/plans/generated-usable-origami-graduation.md`
- `.planning/phases/16-generated-usable-origami-graduation/PLAN.md`

Requirements:
- Add a reproducible candidate recipe and run contract.
- Route generated candidates through backend folded-state evidence or validated
  imported simulator-state artifacts.
- Score generated backend renders against deterministic target fixtures.
- Require full pre/post step replay for generated candidates.
- Add executor profile feasibility gates for hand, gripper, cat paw, and dog
  paw profiles.
- Add browser QA proving generated success is real and rejected generation does
  not look completed.

Success criteria:
- At least one generated candidate is evaluated end to end.
- A generated candidate cannot be promoted by label, target name, or operation
  name.
- Any generated success is visibly labeled as generated and backed by backend
  state, target-match, step replay, executor feasibility, and QA artifacts.
- Any generated failure records the exact failed gate and cannot render as
  completed.
- Boat remains blocked/rejected unless it truly passes every hard gate.

Status: Implemented and verified. The default pipeline now has one generated
graduate, `generated-triangle`, with display mode
`completed-usable-generated`. It carries `candidate-recipe.json`,
`candidate-run.json`, backend folded-state evidence, target-match, full
step-replay artifacts, executor feasibility overlays, and passing browser QA.
Known-good tutorial success remains separate from generated success.
`simple-boat` remains `blocked-solver` and is not a completed demo.

Gate:
- `npm run m30:generated-candidate-harness`
- `npm run m31:backend-state-router`
- `npm run m32:generated-target-scorer`
- `npm run m33:generated-step-replay`
- `npm run m34:generated-executor-feasibility`
- `npm run m35:generated-preview-review`
- `npm run m36:original-gap-closure-audit`
- `npm test`
- `npm run validate:stage1`
- `npm run validate:claims`

Proof:
- `npm run m30:generated-candidate-harness`
- `npm run m31:backend-state-router`
- `npm run m32:generated-target-scorer`
- `npm run m33:generated-step-replay`
- `npm run m34:generated-executor-feasibility`
- `npm run m35:generated-preview-review`
- `npm run m36:original-gap-closure-audit`
- `npm test`
- `npm run validate:stage1`
- `npm run validate:claims`

User-feedback closure:
- `npm run m36:original-gap-closure-audit` proves the original UI/product gaps:
  completed generated output renders with WebGL/Three.js from backend state;
  selected-step panels animate backend pre/post states; clicked step numbers and
  content are preserved; step frame changes are pixel-detected; executor
  overlays are geometry-linked and visually distinct; decorative dashed helper
  lines are absent from step SVGs; boat remains blocked while solver evidence
  fails; generated success stays separate from known-good tutorial success; and
  no arbitrary generation or physical embodiment claim is made.

Depends on: Phase 15
