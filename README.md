# foldgen

AI origami design as the **second case study of the roboharness paradigm** — give an AI agent a FOLD-based folding simulator as a "self-verify in a physical domain" testbed. But unlike the recent wave of origami benchmarks, foldgen's output target is **executor-teachable diagrams**, not benchmark scores.

> **Input:** natural language ("like a crouching cat") or a single reference image
> **Output:** a printable crease pattern + an executor-readable step-by-step diagram + a 3D folding preview

## Status

**Stage 1 technical gate plus generated-usable graduation gate** — public
testbed fixtures, deterministic `fold-core`, a ten-target local pipeline, a
local web demo, executor-readable action-flow artifacts, community FOLD
compatibility checks, Flat-Folder-backed folded-state artifacts, Three.js/WebGL
preview gates, and claim-label guardrails are implemented. Completed cases are
still labeled `simulator-valid / executor-readable / embodiment-untested`:
simulator and executor-readable evidence can promote a software demo, but there
is no final physical execution claim yet.

The current pipeline separates three product states:

- `completed-usable`: known-good/tutorial-backed cases with backend folded
  state, target match, full step states, executor overlays, and passing display
  decision.
- `completed-usable-generated`: generated candidates that pass the same hard
  artifact chain plus generated provenance.
- `blocked-*` or partial modes: targets such as `simple-boat` that do not have
  enough solver/target/step evidence to be shown as completed.

The executor-readable contract is defined in
`docs/contracts/stage-1-output-contract.md`; generated diagram artifacts retain
the structured executor profile, action phases, checks, failure modes, and
annotations instead of only a one-sentence instruction. Every curated case now
emits action flows for `human-hand`, `two-finger-gripper`, `cat-paw-profile`,
and `dog-paw-profile`.

## Local Stage 1 workflow

```bash
npm test
npm run validate:fixtures
npm run m1:deterministic
npm run m2:pipeline
npm run validate:community-fold
npm run validate:flat-folder
npm run validate:claims
npm run demo
npm run validate:stage1
```

`npm run m1:deterministic` writes local artifacts to `out/m1-deterministic/`:

- `derived.fold`
- `crease.svg`
- `validation.json`
- `diagram-step.json`
- `preview.json`

`npm run m2:pipeline` writes ten local case runs to `out/m2-pipeline/`. Each
case includes selected output artifacts, `diagram-sequence.json`, one
profile-specific diagram sequence for each Stage 1 executor profile, proposal
and critic history, `step-visuals.json` with per-step SVG diagrams and preview
frames, thin `fold-program-ir.json`, `visual-walkthrough.json`,
community/solver validation records, display-decision evidence, and claim
status. Completed cases render from backend folded-state artifacts; blocked
cases remain inspection-only or partial.

`npm run validate:community-fold` writes
`out/community-validation/fold-compatibility.json` after checking committed
fixtures and generated pipeline `.fold` files with the community `fold` package.
`npm run validate:flat-folder` writes `flat-folder-validation.json` per generated
case. Passing Flat-Folder evidence can support backend folded-state rendering;
failed evidence blocks completed display for that target.

`fold-program-ir.json` is a thin handoff artifact, not a textual DSL. It links
selected operations back to FOLD edges/assignments and to generated artifacts.
`visual-walkthrough.json` records the current paper state, fold marker, motion
cue, executor visual asset path, contact zones, and unsupported-state notes for
the generated sequence. The demo executor images are generated with `$imagegen`
and stored under `demo/assets/executors/`; they are presentation aids, not
embodiment validation evidence.

`npm run demo` serves the local UI at `http://localhost:4173/demo/`. Run
`npm run m2:pipeline` first when `out/m2-pipeline/` is missing or stale.

`npm run validate:stage1` is the current technical gate and includes
`npm run validate:claims`. Final physical-executor evidence is checked
separately with `npm run validate:embodiment` only when a launch claim needs it.

The generated-usable graduation gates are:

```bash
npm run m30:generated-candidate-harness
npm run m31:backend-state-router
npm run m32:generated-target-scorer
npm run m33:generated-step-replay
npm run m34:generated-executor-feasibility
npm run m35:generated-preview-review
npm run m36:original-gap-closure-audit
```

`npm run m36:original-gap-closure-audit` is the current user-visible acceptance
gate for the recent demo feedback. It proves backend WebGL rendering,
solver-backed selected-step animation, clicked step preservation,
pixel-detected step differences, profile-specific executor overlays, removal of
decorative dashed step helper lines, blocked boat behavior, generated-vs-known
separation, and no physical-execution claim.

## Why this exists (and why it's repositioned)

Between 2025-11 and 2026-03, four works (OrigamiSpace, GamiBench, Learn2Fold, OrigamiBench) crowded the "evaluate MLLM origami reasoning" and "LLM-propose / sim-verify" space. foldgen deliberately does **not** compete on benchmarks or geometry similarity. Its edge is **embodiment-aware teachability** — can a specified executor morphology eventually follow what it outputs.

See `docs/WHY.md` for the full positioning and `docs/PLAN.md` for the build plan.

## Key files

| File | Purpose |
|---|---|
| `docs/WHY.md` | Positioning, repositioning rationale, relation to roboharness, audience. |
| `docs/PLAN.md` | v1 scope, research questions, tech stack, milestones, success criteria, cost. |
| `docs/plans/stage-1-mvp.md` | Canonical Stage 1 execution plan and reviewed implementation gates. |
| `docs/AGENTS.md` | Operating rules: what foldgen is NOT, the differentiator to protect, fold-core boundary. |

## Relation to other projects

- **roboharness** — sibling. Same paradigm ("give the AI eyes to verify itself in a physical domain"), different physical domain (robotics vs origami).
- **MiaoDX/microsites → sites/origami** — the stylized origami tutorial site. Consumes `packages/fold-core` (owned **here** — it's public infra; a private repo shouldn't own a public project's dependency). Origami-site models are a natural source for foldgen's public testbed, but Stage 1 must run from fixtures committed here rather than depending on the private repo at runtime. foldgen's valid new designs can flow back as an "AI-designed" category on the site.
