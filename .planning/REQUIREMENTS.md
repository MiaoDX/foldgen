# Requirements

## Stage 1 MVP

### FOLDGEN-M0-PUBLIC-TESTBED

The repo contains a public testbed that can run without private repos.

Acceptance:
- Five base-form FOLD fixtures exist under `benchmarks/base-forms/`.
- At least three target fixtures exist under `benchmarks/targets/`.
- Fixture metadata records source or generation prompt, usage/license note, and
  intended test role.
- Fixture metadata records executor-readability notes: visible landmarks,
  intended executor profile assumptions, and why the fixture is suitable for
  followable steps.
- A malformed FOLD fixture exists for negative validation.
- Validation tests prove runtime commands do not read `MiaoDX/microsites` or
  any private path.

### FOLDGEN-M1-DETERMINISTIC-CORE

`fold-core` provides the deterministic minimum viable output path.

Acceptance:
- FOLD parse/serialize round-trip is covered by tests.
- Valid fixture FOLD files pass validation and malformed FOLD fails validation.
- Crease pattern SVG output is deterministic and covered by a golden test.
- One deterministic/mock local fold operation produces parseable output FOLD,
  validation result, crease SVG, preview data, and one executor-readable diagram
  step.
- The diagram step includes executor profile, pre-state, fold landmarks,
  anchor/grip action, fold direction, alignment target, crease/press action,
  release action, success checks, failure modes, and visual annotations.
- The repo exposes install, validate-fixtures, and deterministic-case commands.

### FOLDGEN-M2-PIPELINE

The agent pipeline runs on five curated targets after M0/M1 pass.

Acceptance:
- Each run records selected base form, candidate operations, validation status,
  critic/proposal history, output artifact paths, claim status, and
  executor-readable diagram sequence.
- Every selected valid case records `executor_readable: true` or an equivalent
  claim-status field only when the diagram sequence passes the contract.
- Failures are recorded as case data rather than hidden.
- No live provider adapter is required for the batch gate.

### FOLDGEN-M3-WEB-DEMO

The web demo exposes local pipeline outputs.

Acceptance:
- Users can upload an image or choose a curated text target.
- The UI shows empty, loading, invalid input, validation failure, partial output,
  success, preview, and download states.
- FOLD and SVG outputs are downloadable.
- The UI shows the active executor profile and a followable action flow, not
  only a step title.
- Demo tests prove executor-readable fields are rendered for a selected case.
- The demo renders existing local outputs before adding live model calls.

### FOLDGEN-M4-CLAIM-GUARD

Launch docs and demo cases avoid physical-execution claims unless final
embodiment evidence exists.

Acceptance:
- `npm run validate:stage1` is the default current-stage gate.
- README, demo, pipeline summaries, and blog materials use
  `simulator-valid / executor-readable / embodiment-untested` only when both
  simulator and executor-readable gates pass.
- `npm run validate:embodiment` is documented as final-stage only.
- Related-work status is rechecked before public positioning.
