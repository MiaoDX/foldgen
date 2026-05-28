# State

Current focus: Phase 5 - Executor-readable Contract Upgrade.

Source of truth:
- Canonical PRD: `docs/plans/stage-1-mvp.md`
- Roadmap: `.planning/ROADMAP.md`
- Active contract: `docs/contracts/stage-1-output-contract.md`
- Active phase plan: `.planning/phases/05-executor-readable-contract-upgrade/PLAN.md`

Status:
- GSD ingest/plan handoff is degraded inline, not a full spawned-subagent run.
- Phase 1 implementation is complete for the original coarse gate; M1
  executor-readable output needs follow-up.
- Phase 2 implementation is complete for the original coarse gate; per-case
  executor-readable sequences need follow-up.
- Phase 3 implementation is complete for the original coarse gate; rendered
  executor-readable action flow needs follow-up.
- Phase 4 implementation is complete for the original coarse gate; claim labels
  need executor-readable evidence before using the refined Stage 1 label.

Next action:
- Implement the Phase 5 executor-readable contract upgrade.
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
