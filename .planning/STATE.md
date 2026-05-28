# State

Current focus: Phase 2 - M2 Local Pipeline.

Source of truth:
- Canonical PRD: `docs/plans/stage-1-mvp.md`
- Roadmap: `.planning/ROADMAP.md`
- Active phase plan: `.planning/phases/02-m2-local-pipeline-five-targets/PLAN.md`

Status:
- GSD ingest/plan handoff is degraded inline, not a full spawned-subagent run.
- Phase 1 implementation is complete, locally verified, and committed.
- Phase 2 implementation is complete and locally verified.

Next action:
- Commit the verified Phase 2 slice, then continue to M3 web demo from a clean
  committed boundary.

Phase 1 verification:
- `npm test`
- `npm run validate:fixtures`
- `npm run m1:deterministic`

Phase 2 verification:
- `npm test`
- `npm run validate:fixtures`
- `npm run m1:deterministic`
- `npm run m2:pipeline`

Known constraints:
- Do not depend on private repos or paid model APIs.
- Do not implement agent loop, web demo, live providers, or launch materials in
  Phase 1.
- Commit only owned files after focused verification.
