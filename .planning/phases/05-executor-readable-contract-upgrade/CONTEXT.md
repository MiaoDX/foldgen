# Phase 5 Context: Executor-readable Contract Upgrade

## Source

- Refined contract: `docs/contracts/stage-1-output-contract.md`
- Canonical PRD: `docs/plans/stage-1-mvp.md`
- Roadmap: `.planning/ROADMAP.md`
- Trigger: demo review showed one-sentence steps are not followable by a real
  executor profile.

## Boundary

Upgrade the existing Stage 1 spine. Do not restart the fixture, pipeline, or
demo architecture.

In scope:
- executor profile definitions
- executor-readable diagram-step schema and validation
- M1 deterministic output upgrade
- M2 per-case diagram sequence and claim-status upgrade
- M3 demo rendering of executor profile and action flow
- M4 claim validator upgrade for executor-readable evidence

Out of scope:
- live provider adapters
- new origami physics simulator
- real physical execution records
- public launch copy
- hardware or robot integration

## Key Distinction

`executor-readable` means the artifact contains a structured action flow that a
named executor profile could follow in principle. It is still
`embodiment-untested` until a physical executor attempt is recorded and
`npm run validate:embodiment` passes.
