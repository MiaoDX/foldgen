# foldgen

AI origami design as the **second case study of the roboharness paradigm** — give an AI agent a FOLD-based folding simulator as a "self-verify in a physical domain" testbed. But unlike the recent wave of origami benchmarks, foldgen's output target is **human-teachable diagrams**, not benchmark scores.

> **Input:** natural language ("like a crouching cat") or a single reference image
> **Output:** a printable crease pattern + a human-readable step-by-step diagram + a 3D folding preview

## Status

**v0 bootstrap** — planning docs + skeleton only. No agent loop implemented yet.

## Why this exists (and why it's repositioned)

Between 2025-11 and 2026-03, four works (OrigamiSpace, GamiBench, Learn2Fold, OrigamiBench) crowded the "evaluate MLLM origami reasoning" and "LLM-propose / sim-verify" space. foldgen deliberately does **not** compete on benchmarks or geometry similarity. Its edge is **human reproducibility** — can a normal person fold along with what it outputs.

See `docs/WHY.md` for the full positioning and `docs/PLAN.md` for the build plan.

## Key files

| File | Purpose |
|---|---|
| `docs/WHY.md` | Positioning, repositioning rationale, relation to roboharness, audience. |
| `docs/PLAN.md` | v1 scope, research questions, tech stack, milestones, success criteria, cost. |
| `docs/AGENTS.md` | Operating rules: what foldgen is NOT, the differentiator to protect, fold-core boundary. |

## Relation to other projects

- **roboharness** — sibling. Same paradigm ("give the AI eyes to verify itself in a physical domain"), different physical domain (robotics vs origami).
- **MiaoDX/microsites → sites/origami** — the stylized origami tutorial site. Shares `packages/fold-core` (owned there). origami's 20 traditional FOLD files are foldgen's natural testbed; foldgen's valid new designs can flow back as an "AI-designed" category on the site.
