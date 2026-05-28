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

Status: Planned

## Phase 2: M2/M3 Pipeline And Demo Surface

Goal: five curated targets run through the local pipeline and the web demo
renders those outputs with clear states and downloads.

Requirements:
- FOLDGEN-M2-PIPELINE
- FOLDGEN-M3-WEB-DEMO

Success criteria:
- Five target runs record validation, proposal, and critic history.
- The demo connects to local pipeline outputs.
- Invalid and partial results are visible and understandable.

Status: Pending

Depends on: Phase 1

## Phase 3: M4 Human Gate And Launch Materials

Goal: public materials make only evidence-backed claims and at least five demo
cases have human reproducibility records.

Requirements:
- FOLDGEN-M4-HUMAN-GATE

Success criteria:
- Five human attempt records exist with pass/fail and notes.
- README/blog/demo labels distinguish simulator-valid from human-reproduced.
- Related-work status is rechecked before public launch copy.

Status: Pending

Depends on: Phase 2
