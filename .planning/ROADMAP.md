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
