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

Status: Planned

Gate:
- `npm run m11:preview`
- `npm test`
- `npm run validate:stage1`

Depends on: Phase 10
