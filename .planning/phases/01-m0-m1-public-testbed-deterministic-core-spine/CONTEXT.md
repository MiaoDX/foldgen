# Phase 1 Context: M0/M1 Public Testbed And Deterministic Core Spine

## Boundary

Deliver the first executable foldgen spine:

- public fixtures and metadata
- deterministic `fold-core` parse/serialize/validate/SVG behavior
- one deterministic local fold operation
- one executor-readable diagram step
- repo-local install/test/run commands

## In Scope

- `benchmarks/base-forms/`
- `benchmarks/targets/`
- `packages/fold-core/`
- minimal deterministic case runner if needed
- tests and commands needed to prove M0/M1
- README updates for the local M0/M1 workflow

## Out Of Scope

- M2 agent search loop
- M3 web demo
- M4 human records and launch copy
- live provider adapters
- private origami-site runtime assets
- new origami physics simulator

## Acceptance Source

Primary PRD: `docs/plans/stage-1-mvp.md`

Covered requirements:
- FOLDGEN-M0-PUBLIC-TESTBED
- FOLDGEN-M1-DETERMINISTIC-CORE

## Verification Gates

- Valid fixtures pass validation.
- Malformed fixture fails validation.
- Crease SVG output is deterministic.
- One-fold deterministic case writes output FOLD, SVG, preview data, validation
  result, and a diagram step satisfying
  `docs/contracts/stage-1-output-contract.md`.
- Commands do not require `MiaoDX/microsites`, paid APIs, Docker, GPU, or manual
  asset copying.
