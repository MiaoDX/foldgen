# Stage 1 MVP Blog Draft

Draft-only. This file is a launch-material placeholder, not public copy.

## Working Claim

foldgen now has a repo-local Stage 1 path: public fixtures, deterministic
`fold-core`, a five-target pipeline, local demo rendering, and claim-label
validation.

Current demo cases are
`simulator-valid / executor-readable / embodiment-untested` under the repo-local
technical gate. The label means the artifacts contain structured executor
actions; it does not mean a physical executor attempt has passed.

## Evidence To Cite Before Publishing

- `npm run validate:stage1`
- `out/m2-pipeline/summary.json`
- `docs/contracts/stage-1-output-contract.md`
- `docs/launch/stage-1-launch-checklist.md`
- Optional final records only after `npm run validate:embodiment` passes

## Related-work Status

Last checked: 2026-05-28.

See `docs/launch/related-work-check-2026-05-28.md`.

Before publishing, repeat this check and adjust positioning if either project
has released complete code or strong demos.
