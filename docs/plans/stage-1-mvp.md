# Stage 1 MVP Execution Plan

## Goal

Implement the Stage 1 foldgen MVP from `docs/PLAN.md`: a public, deterministic
origami generation testbed that can take a reference target, run a constrained
base-form/local-deformation pipeline, and produce a parseable FOLD artifact,
crease pattern SVG, preview data, and executor-readable folding steps.

Stage 1 proves that foldgen can generate verifiable, teachable origami outputs
from a small public testbed. It must not become a general origami generator,
benchmark reproduction project, or private-asset integration.

## Idea Shaping Mode

Not applicable. The user supplied `docs/PLAN.md` and asked to implement its
milestones one by one via `intuitive-flow`.

## Source Evidence

- `docs/PLAN.md` - strategic project plan, Stage 1 contract, v1 scope, M0-M4
  implementation milestones, success criteria, and non-goals.
- `docs/CONTEXT.md` - durable vocabulary for foldgen, fold-core, public
  testbed, valid output, imagegen target images, and embodiment validation.
- `docs/AGENTS.md` - repo operating rules, fold-core boundary, cost discipline,
  validation requirements, and public-fixture constraint.
- `README.md` - current repo status and product positioning.
- `packages/fold-core/README.md` - intended deterministic fold-core boundary and
  API shape.

## Decisions Already Made

- Stage 1 is the active implementation stage; it is gated by repo-local
  technical proof, not external executor participation.
- Runtime fixtures must live in this public repo and must not depend on
  `MiaoDX/microsites`.
- Reference images are the primary input; text input initially maps to curated
  targets.
- Codex `$imagegen` may be used for target/demo raster assets, but generated
  assets must be committed with prompt and usage metadata.
- M0 and M1 do not require paid LLM providers or external model APIs.
- `fold-core` stays deterministic and contains no AI calls or agent policy.
- Live model provider adapters come after deterministic fixtures, validation,
  crease SVG, and diagram contracts work.
- 3D preview is useful inspection output, but it is not a flat-foldability proof.
- Any public physical-execution claim requires a final embodiment-validation
  record with executor morphology, pass/fail, and notes.

## Idea Shaping Decisions

| # | Question | Classification | Decision | Rationale | Revisit if |
|---|----------|----------------|----------|-----------|------------|
| 1 | What does Stage 1 optimize for? | User-owned | Executor-teachable verified outputs, not benchmark scores. | The current plan defines repo-local technical proof as Stage 1's gate and moves physical-executor evidence to the final claim stage. | A future plan explicitly repositions foldgen. |
| 2 | Can Stage 1 wait for Learn2Fold / OrigamiBench code? | User-owned | No. Treat them as related work and possible future adapters. | The Stage 1 contract says they are not blockers. | Their released code makes foldgen's current path obsolete and the user approves a repositioning. |
| 3 | Can private origami-site assets be runtime dependencies? | User-owned | No. Assets may inspire hand migration only when licensing is suitable. | The public testbed must run from this repo. | The public repo receives licensed copies with metadata. |
| 4 | Should M1 use live paid LLM calls? | Mechanical | No. Use deterministic or mock proposals first. | M1's acceptance criteria are parseability, crease SVG, and validation, not model quality. | Deterministic gates pass and a provider adapter is explicitly planned. |

## Non-Goals

- Training or fine-tuning LLMs.
- Reinforcement learning.
- Hardware or laser-cutter workflows.
- Blank-paper arbitrary origami generation or TreeMaker-style design.
- Reproducing Learn2Fold, OrigamiBench, OrigamiSpace, or GamiBench as a
  benchmark project.
- Public claims that a demo is physically executable before final
  embodiment-validation evidence is recorded.
- Making Stage 1 depend on external people, hardware, or executor records.

## Smallest Demo

One public base-form fixture plus one public target fixture. The pipeline applies
one deterministic local fold operation, writes a valid derived FOLD file, writes
a deterministic crease pattern SVG, runs fold validation, and emits a minimal
fold sequence with one executor-readable step.

## Fuller Demo

Five base-form fixtures and at least five test targets run through an end-to-end
pipeline. A web demo accepts a target image upload or curated text target and
returns a FOLD file, crease pattern SVG, 3D preview/animation, and step-by-step
diagram. Final embodiment-validation records are explicitly out of the default
Stage 1 loop.

## Acceptance Criteria

- M0: The repo contains five public base-form FOLD fixtures and at least three
  public target fixtures with metadata. Runtime tests do not read private repos.
- M1: `fold-core` parses, serializes, validates, and writes crease-pattern SVG
  for the fixture FOLD files. A deterministic/mock proposal applies one local
  fold operation and produces parseable FOLD, deterministic SVG, validation
  result, and a minimal diagram step.
- M2: The agent pipeline runs on five curated test targets and records per-case
  outputs, validation status, and critic/proposal history.
- M3: The web demo supports image upload and curated text target entry, then
  displays fold sequence, crease pattern, and 3D preview output from the local
  pipeline.
- M4: Stage 1 closeout labels README, demo, and pipeline outputs as
  simulator-valid / embodiment-untested unless final records exist. Blog and
  launch materials remain draft-only until the final claim gate is run.

## Verification

- Repository commands must run without access to `MiaoDX/microsites`.
- Fixture validation must fail on malformed FOLD and pass on committed base-form
  fixtures.
- Snapshot or golden-file tests must cover deterministic crease SVG output.
- Pipeline tests must cover the deterministic one-fold M1 case.
- Demo tests must cover upload/curated-target output wiring once M3 exists.
- Final embodiment-validation records must be committed for every demo case
  publicly claimed as physically executable.

## Vertical Slices

1. M0 Public Testbed: fixtures, target assets, metadata, and validation tests.
2. M1 Deterministic Core: fold-core package, one-fold mock proposal, output
   contracts, crease SVG generation, and minimal diagram step.
3. M2 Pipeline: base-form selection, deterministic/Codex-assisted proposal
   loop, candidate validation, critic record, and batch run on five targets.
4. M3 Web Demo: upload/curated text entry, result rendering, downloadable FOLD
   and SVG, preview/animation surface, and local pipeline integration.
5. M4 Technical Closeout And Claim Guard: README/demo labels, blog draft,
   demo case summaries, launch checklist, and final embodiment gate docs.

## Risks And Assumptions

- The simplest FOLD fixture set may need to be handcrafted rather than migrated
  from private assets.
- Flat-foldability validation through existing libraries may require a pragmatic
  subset in early milestones.
- 3D preview can lag behind validation as long as M1 validity is proven through
  parseable FOLD, deterministic SVG, and validation checks.
- Final embodiment validation is offline/external and must stay outside the
  default Stage 1 stop gate. Automated tests only confirm record shape when that
  final gate is explicitly invoked.
- External research code status may change; check it before public posting or
  external positioning updates.

## Autoplan Status

PARTIAL. Full `$autoplan` could not run on this host because the exact gstack
workflow requires host-specific `AskUserQuestion` and Claude subagent tools that
are not available here. Per the Stage 1 operating contract, this file contains a
degraded, non-interactive pre-implementation review using the available repo
docs and a read-only Codex CLI outside-voice pass. No code was implemented, no
`.planning` artifacts were created, and no commit was made.

This degraded review is sufficient for the supervising session to decide
whether GSD handoff is safe, but it is not a full gstack approval log. Treat the
handoff verdict below as `SAFE_WITH_CONSTRAINTS`, not `SUCCESS`.

## Degraded Autoplan Review Decisions

### Review Inputs

- Canonical plan: `docs/plans/stage-1-mvp.md`.
- Repo strategy and constraints: `docs/PLAN.md`, `docs/WHY.md`,
  `docs/CONTEXT.md`, `docs/AGENTS.md`, `README.md`.
- Deterministic core boundary: `packages/fold-core/README.md`.
- Current implementation state: skeleton only. `benchmarks/base-forms`,
  `benchmarks/targets`, `packages/fold-core`, `packages/foldgen-agent`, and
  `demo` currently contain placeholders, not executable implementation.
- Outside voice: `codex exec --ephemeral -C /home/mi/ws/gogo/foldgen -s
  read-only` reviewed this plan and repo docs without editing files.

### Scope Decisions Accepted

| # | Decision | Classification | Rationale |
|---|----------|----------------|-----------|
| S1 | Preserve the M0 -> M1 -> M2 -> M3 -> M4 sequence. | Mechanical | The repo is skeleton-only, so the public fixture/testbed spine must exist before agent loop, demo, or launch work can be evaluated. |
| S2 | Implement M0/M1 as the engineering spine before any live provider, benchmark, or publication work. | Mechanical | Parseable FOLD, deterministic SVG, validation, and one deterministic local fold are the first proof points. |
| S3 | Keep `fold-core` deterministic and free of AI calls, provider policy, private assets, and agent logic. | Mechanical | `docs/AGENTS.md`, `docs/CONTEXT.md`, and `packages/fold-core/README.md` all define this boundary. |
| S4 | Keep public fixtures and runtime assets inside this repo. | Mechanical | Runtime dependency on `MiaoDX/microsites` would break the public testbed contract. |
| S5 | Defer physical-execution claims until final embodiment records exist, but continue technical work after deterministic gates pass. | Mechanical | Stage 1 proves teachable verified output without waiting on external people or hardware. |

### Risk Decisions Accepted

| Risk | Accepted Decision | Gate |
|---|---|---|
| Scope creep from smallest demo into a full web/agent/launch product. | Ship the smallest proof first: one public base-form fixture, one public target fixture, one deterministic local fold, valid FOLD, deterministic SVG, validation result, and one minimal step. | M1 cannot expand until this path runs locally. |
| Invalid credibility claims. | No demo case may be called physically executable until a final embodiment attempt is recorded with pass/fail and notes. | M4 launch docs must distinguish simulator-valid from embodiment-validated. |
| Private asset leakage. | Tests must prove runtime commands do not read `MiaoDX/microsites` or any private path. | M0 fixture tests include private-path guard coverage. |
| Unbounded simulator work. | Use existing FOLD/Rabbit Ear/Origami Simulator/Tachi-style tools through `fold-core`; do not implement new folding physics. | M1 implementation must stay glue-sized and deterministic. |
| Research landscape drift. | Re-check Learn2Fold and OrigamiBench code/demo status before public positioning, not before M0/M1 implementation. | Required before M4 blog/release copy. |

### Engineering Decisions Accepted

```text
CURRENT
  docs + placeholder directories
    |
    v
M0 public testbed
  benchmarks/base-forms/*.fold + metadata
  benchmarks/targets/* + metadata
  malformed fixture for negative validation
    |
    v
M1 deterministic core
  packages/fold-core parse/serialize/validate/svg
  one deterministic local fold proposal
  one output FOLD + one crease SVG + one diagram step
    |
    v
M2/M3/M4
  agent batch loop -> web demo -> technical closeout and claim guard
```

- Define the repo-local executable path before feature work: install command,
  fixture validation command, M1 deterministic-case command, and output
  location.
- Define fixture, generated output, and metadata layout during M0 so later
  milestones do not invent incompatible conventions.
- Keep M3 web demo integration behind the local pipeline contract. The demo must
  render existing local outputs before it introduces uploaded-target complexity.
- Treat 3D preview as inspection output. It cannot replace validation or final
  embodiment evidence.

### Test Decisions Accepted

| Milestone | Required Proof |
|---|---|
| M0 | Five public base-form fixtures and at least three target fixtures have metadata; valid fixtures pass validation; one malformed FOLD fixture fails validation; runtime checks prove no private repo path is read. |
| M1 | Parse/serialize round-trip, validation result, deterministic crease SVG golden test, deterministic one-fold output, and minimal diagram-step output are covered by repo-local tests. |
| M2 | Five curated targets produce per-case outputs, validation status, proposal history, and critic history. Failures are recorded as data, not hidden. |
| M3 | Demo tests cover upload/curated-target wiring to local pipeline outputs, empty/error/loading states, downloadable FOLD/SVG, and preview rendering. |
| M4 | Stage 1 labels and docs avoid physical-execution claims by default. Final embodiment records are optional until launch claims need them, and automated tests verify record shape only when that gate is invoked. |

### DX And UI Decisions Accepted

- Developer time-to-first-proof target: a new contributor should be able to run
  the M1 deterministic case locally after install without private repos, paid
  APIs, or manual asset copying.
- Error messages for validation and pipeline failures must include problem,
  likely cause, and fix. Silent invalid FOLD output is not acceptable.
- Public docs should expose one copy-paste local workflow once M0/M1 exist:
  install, validate fixtures, run deterministic case, inspect FOLD/SVG output.
- M3 UI must include empty, loading, invalid input, validation failure, partial
  output, success, and download states. These are accepted design requirements,
  not optional polish.
- Curated text targets remain a controlled entry point until image-first flow and
  local validation are stable.

### Not In Scope For Stage 1 Handoff

- Training, fine-tuning, RL, new simulator physics, hardware workflows, or
  TreeMaker-style blank-paper arbitrary design.
- Runtime dependency on private origami-site assets or private repos.
- Live paid provider adapter work before deterministic fixture, validation,
  SVG, and diagram contracts pass.
- Public claims of physical executability before final embodiment records exist.
- Reproducing Learn2Fold, OrigamiBench, OrigamiSpace, or GamiBench as a
  benchmark project.

### Failure Modes Registry

| Failure Mode | Impact | Accepted Mitigation |
|---|---|---|
| The repo gains docs but no runnable local path. | GSD handoff can appear complete while implementation is unverifiable. | First implementation phase must create local install/test/run commands for M0/M1. |
| Fixture files are copied without license/source metadata. | Public repo cannot safely ship the testbed. | M0 fixture metadata must include source or generation prompt, license/usage note, and intended test role. |
| Validation accepts malformed FOLD. | Downstream SVG/demo output can look valid while geometry is broken. | Include a committed malformed fixture and failing validation test. |
| Agent loop starts before deterministic core contracts exist. | Debugging mixes model behavior with missing infrastructure. | M2 cannot begin until M1 deterministic output and tests pass. |
| Demo presents simulator/critic success as physical-execution success. | Public positioning overclaims the differentiator. | M4 docs must label each case as simulator-valid, untested, failed, or embodiment-validated. |

### Decision Audit Trail

| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|-------|----------|----------------|-----------|-----------|----------|
| 1 | CEO | Keep Stage 1 focused on executor-teachable verified output. | Mechanical | Completeness | Matches the corrected repo strategy and protects the differentiator without blocking on external participation. | Benchmark reproduction and general generator scope. |
| 2 | CEO | Defer publication/external-adapter work until Stage 1 proof gates pass. | Mechanical | Pragmatic | Prevents launch work from preceding evidence. | Stage 2 planning during MVP implementation. |
| 3 | Eng | Build M0/M1 deterministic spine first. | Mechanical | Explicit over clever | Skeleton repo needs executable proof before higher-level agent/demo work. | Starting with M2 agent loop or M3 web demo. |
| 4 | Eng | Keep `fold-core` deterministic and minimal. | Mechanical | DRY | Existing tools should handle simulation/validation; repo glue owns contracts. | Reimplementing folding physics or putting AI policy in `fold-core`. |
| 5 | Test | Require milestone-specific gates, not only final verification. | Mechanical | Completeness | Each slice needs local proof before the next one can be trusted. | Deferring validation to the final demo. |
| 6 | DX | Require a repo-local install/validate/run workflow before feature expansion. | Mechanical | Bias toward action | Future agents need a runnable spine to avoid doc-only progress. | Manual/private setup assumptions. |
| 7 | UI | Specify M3 states now, implement after the local pipeline works. | Mechanical | Completeness | Demo UX needs error and partial-output behavior, but should not block M0/M1. | UI-first implementation. |

### GSD Handoff Safety Verdict

`SAFE_WITH_CONSTRAINTS`: GSD handoff is reasonable if the downstream phase treats
M0/M1 as the first delivery unit and uses the accepted gates above as blocking
criteria. It is not safe to hand off directly to M2/M3/M4 implementation until
the public fixture and deterministic core contracts exist.

## GSD Handoff Trigger

```text
missing planning or phase: manifest + gsd-ingest-docs --mode new, inspect created phase, then gsd-plan-phase <phase> --prd docs/plans/stage-1-mvp.md
existing matching phase: gsd-plan-phase <phase> --prd docs/plans/stage-1-mvp.md
```
