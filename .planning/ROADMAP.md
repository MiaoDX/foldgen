# Roadmap

## Phase 1: M0/M1 Public Testbed And Deterministic Core Spine

Goal: a contributor can install, validate fixtures, and run one deterministic
fold case locally, producing parseable FOLD, deterministic SVG, validation
result, and one minimal diagram step.

Requirements:
- FOLDGEN-M0-PUBLIC-TESTBED
- FOLDGEN-M1-DETERMINISTIC-CORE

Success criteria:
- Public base-form and target fixtures with metadata are committed.
- Fixture validation passes for valid fixtures and fails for the malformed
  fixture.
- The deterministic one-fold case writes stable output artifacts.
- No command depends on `MiaoDX/microsites`, paid APIs, or manual asset copying.

Status: Completed

Proof:
- Commit `5773f81` (`feat(fold-core): add deterministic m0 m1 spine`)
- `npm test`
- `npm run validate:fixtures`
- `npm run m1:deterministic`

## Phase 2: M2 Local Pipeline

Goal: five curated targets run through the local pipeline and record per-case
outputs, validation status, proposal history, and critic history.

Requirements:
- FOLDGEN-M2-PIPELINE

Success criteria:
- Five target runs record validation, proposal, and critic history.
- Invalid and partial results are visible and understandable.
- No live provider adapter or private runtime asset is required.

Status: Completed

Proof:
- Commit `0f68672` (`feat(foldgen-agent): add deterministic m2 pipeline`)
- `npm test`
- `npm run validate:fixtures`
- `npm run m1:deterministic`
- `npm run m2:pipeline`

Depends on: Phase 1

## Phase 3: M3 Web Demo

Goal: the web demo renders local pipeline outputs with clear states and
downloadable artifacts.

Requirements:
- FOLDGEN-M3-WEB-DEMO

Success criteria:
- The demo connects to local pipeline outputs.
- Upload and curated text target entry points are represented.
- Empty, loading, invalid, partial, success, preview, and download states are
  covered.

Status: Completed

Proof:
- Commit `9df7327` (`feat(demo): add local m3 pipeline viewer`)
- `npm test`
- `npm run validate:fixtures`
- `npm run m1:deterministic`
- `npm run m2:pipeline`
- `npm run demo`
- Headless Chrome screenshot smoke test for `/demo/?case=simple-bird`

Depends on: Phase 2

## Phase 4: M4 Technical Closeout And Claim Guard

Goal: public materials make only evidence-backed claims while Stage 1 remains
unblocked by external executor participation.

Requirements:
- FOLDGEN-M4-CLAIM-GUARD

Success criteria:
- `npm run validate:stage1` passes as the current technical gate.
- README/blog/demo labels distinguish simulator-valid from embodiment-validated.
- Final embodiment records are documented as optional launch-claim evidence.
- Related-work status is rechecked before public launch copy.

Status: Planned

Claim guard:
- Physical-execution claims require final embodiment records. Simulator-valid
  output, deterministic preview, and critic scores are not embodiment evidence.

Gate:
- `npm run validate:stage1` is the Stage 1 gate.
- `npm run validate:embodiment` is final-stage only and must not block current
  technical work.

Depends on: Phase 3
