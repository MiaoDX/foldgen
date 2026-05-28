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
- Commit `9df7327` (`feat(demo): add local m3 pipeline viewer`)
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
- `npm test`
- `npm run validate:fixtures`
- `npm run m1:deterministic`
- `npm run m2:pipeline`
- `npm run demo`
- Headless Chrome screenshot smoke test for `/demo/?case=simple-bird`

Depends on: Phase 2

## Phase 4: M4 Human Gate And Launch Materials

Goal: public materials make only evidence-backed claims and at least five demo
cases have human reproducibility records.

Requirements:
- FOLDGEN-M4-HUMAN-GATE

Success criteria:
- Five human attempt records exist with pass/fail and notes.
- README/blog/demo labels distinguish simulator-valid from human-reproduced.
- Related-work status is rechecked before public launch copy.

Status: Blocked

Blocker:
- Requires five real human folding attempt records with pass/fail and notes.
  Simulator-valid output, deterministic preview, and critic scores are not
  human reproducibility evidence.

Depends on: Phase 3
