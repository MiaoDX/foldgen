# foldgen

AI origami design as the **second case study of the roboharness paradigm** — give an AI agent a FOLD-based folding simulator as a "self-verify in a physical domain" testbed. But unlike the recent wave of origami benchmarks, foldgen's output target is **executor-teachable diagrams**, not benchmark scores.

> **Input:** natural language ("like a crouching cat") or a single reference image
> **Output:** a printable crease pattern + an executor-readable step-by-step diagram + a 3D folding preview

## Status

**Stage 1 / M4 technical gate** — public testbed fixtures, deterministic
`fold-core`, a five-target local pipeline, a local web demo, and claim-label
guardrails are implemented. The current demo cases are
**simulator-valid / embodiment-untested**: no live provider adapter and no final
embodiment claim yet.

The executor-readable contract has since been sharpened in
`docs/contracts/stage-1-output-contract.md`. The current UI still shows
one-sentence steps; the next implementation pass upgrades those outputs to
`simulator-valid / executor-readable / embodiment-untested`.

## Local Stage 1 workflow

```bash
npm test
npm run validate:fixtures
npm run m1:deterministic
npm run m2:pipeline
npm run validate:claims
npm run demo
npm run validate:stage1
```

`npm run m1:deterministic` writes local artifacts to `out/m1-deterministic/`:

- `derived.fold`
- `crease.svg`
- `validation.json`
- `diagram-step.json`

`npm run m2:pipeline` writes five curated case runs to `out/m2-pipeline/`. Each
case includes selected output artifacts plus proposal and critic history. Each
valid case is currently labeled `simulator-valid / embodiment-untested`. That is
the coarse gate. The refined gate will require structured executor-readable
steps before using `simulator-valid / executor-readable / embodiment-untested`.

`npm run demo` serves the local UI at `http://localhost:4173/demo/`. Run
`npm run m2:pipeline` first when `out/m2-pipeline/` is missing or stale.

`npm run validate:stage1` is the current technical gate and includes
`npm run validate:claims`. Final physical-executor evidence is checked
separately with `npm run validate:embodiment` only when a launch claim needs it.

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
