# State

Current focus: Phase 1 - M0/M1 Public Testbed And Deterministic Core Spine.

Source of truth:
- Canonical PRD: `docs/plans/stage-1-mvp.md`
- Roadmap: `.planning/ROADMAP.md`
- Active phase plan: `.planning/phases/01-m0-m1-public-testbed-deterministic-core-spine/PLAN.md`

Status:
- GSD ingest/plan handoff is degraded inline, not a full spawned-subagent run.
- Phase 1 implementation is complete and locally verified.

Next action:
- Commit the verified Phase 1 slice, then continue to M2 only from a clean
  committed boundary.

Latest verification:
- `npm test`
- `npm run validate:fixtures`
- `npm run m1:deterministic`

Known constraints:
- Do not depend on private repos or paid model APIs.
- Do not implement agent loop, web demo, live providers, or launch materials in
  Phase 1.
- Commit only owned files after focused verification.
