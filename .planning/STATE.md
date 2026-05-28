# State

Current focus: Phase 5 - Executor-readable Contract Upgrade closeout.

Source of truth:
- Canonical PRD: `docs/plans/stage-1-mvp.md`
- Roadmap: `.planning/ROADMAP.md`
- Active contract: `docs/contracts/stage-1-output-contract.md`
- Completed phase plan: `.planning/phases/05-executor-readable-contract-upgrade/PLAN.md`

Status:
- GSD ingest/plan handoff is degraded inline, not a full spawned-subagent run.
- Phase 1 M1 output now emits executor-readable diagram steps under the refined
  contract.
- Phase 2 M2 output now emits per-case executor-readable diagram sequences and
  claim status.
- Phase 3 M3 demo now renders the selected executor profile and action flow.
- Phase 4 M4 claim labels now require executor-readable evidence before using
  the refined Stage 1 label.

Next action:
- No repo-local Stage 1 implementation action remains unless launch copy needs
  final physical-executor evidence.
- Keep final embodiment validation optional until a launch claim requires
  physical-executor evidence.

Current Stage 1 gate:
- `npm run validate:stage1`

Phase 1 verification:
- `npm test`
- `npm run validate:fixtures`
- `npm run m1:deterministic`

Phase 2 verification:
- `npm test`
- `npm run validate:fixtures`
- `npm run m1:deterministic`
- `npm run m2:pipeline`

Phase 3 verification:
- `npm test`
- `npm run validate:fixtures`
- `npm run m1:deterministic`
- `npm run m2:pipeline`
- `npm run demo`
- Headless Chrome screenshot smoke test for `/demo/?case=simple-bird`

Phase 4 verification:
- `npm test`
- `npm run validate:stage1`
- `npm run validate:claims`

Known constraints:
- Do not depend on private repos or paid model APIs.
- Do not make physical-execution claims without final embodiment records.
- Commit only owned files after focused verification.
