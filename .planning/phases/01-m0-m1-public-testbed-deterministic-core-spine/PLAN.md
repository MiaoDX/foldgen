# Phase 1 Plan: M0/M1 Public Testbed And Deterministic Core Spine

## Goal

Create the first runnable foldgen proof path: public fixtures plus a
deterministic core that validates FOLD, writes a stable crease SVG, and runs one
local fold case with a minimal human-readable step.

## Tasks

1. Scaffold the Node/TypeScript workspace with repo-local commands.
2. Add five public base-form fixtures under `benchmarks/base-forms/`.
3. Add at least three public target fixtures under `benchmarks/targets/`.
4. Add metadata for every fixture and target, including source/prompt,
   usage/license note, and test role.
5. Add a malformed FOLD fixture for negative validation.
6. Implement deterministic `fold-core` parse, serialize, validate, crease SVG,
   and local fold-operation helpers.
7. Add one deterministic case runner that produces output FOLD, SVG, validation
   JSON, and one diagram-step JSON file.
8. Add tests for fixture metadata, valid/malformed validation,
   parse/serialize round-trip, deterministic SVG, and deterministic case output.
9. Update README with install, validate, test, and deterministic-case commands.

## Constraints

- No private repo runtime paths.
- No paid or live LLM provider calls.
- No agent search loop, web demo, or launch materials.
- Keep `fold-core` deterministic and small.

## Expected Outputs

- `package.json` and workspace/package config.
- `packages/fold-core` implementation and tests.
- public fixture and target files with metadata.
- deterministic M1 output command and generated artifact location.
- README local workflow.

## Verification

Run the repo-local test suite and deterministic case command. The phase is ready
for execution only when these checks can be invoked from the repo root without
private assets or external services.

Latest passing checks:

- `npm test`
- `npm run validate:fixtures`
- `npm run m1:deterministic`

## Provenance

This plan was created through degraded inline GSD handoff after a
subagent-backed `$gsd-ingest-docs`/`$gsd-plan-phase` worker stalled. The phase
boundary and gates come from `docs/plans/stage-1-mvp.md`.
