# foldgen Agent Rules

Operating rules for Codex CLI / local Claude Code / sub-agents working in this repo.

## Operating mode

Human PM authors `docs/WHY.md` / `docs/PLAN.md` and makes the strategic calls (input modality, LLM choice, workshop targets). You implement the agent loop, critic, diagram generator, and demo. Plan first on non-trivial tasks, then implement.

## What foldgen is NOT (read before designing anything)

- **NOT a benchmark project.** Four teams (OrigamiSpace, GamiBench, Learn2Fold, OrigamiBench) already occupy the "evaluate MLLM origami reasoning" and "LLM-propose / sim-verify" niches. Do not build a 5th benchmark. cite them as baselines/related work.
- **NOT a new simulator.** Use Origami Simulator / Rabbit Ear / Tachi tools via `fold-core`. Do not reimplement folding physics.
- **NOT a TreeMaker competitor.** Don't try to design arbitrary complex models from blank paper. Start from base forms + local deformation.
- **NOT a paper-first project.** The primary output is a working demo + blog post. An arXiv preprint is a bonus, not the goal.

## The differentiator (protect it)

foldgen's edge over Learn2Fold/OrigamiBench is **human-teachable output**: a normal person can fold along with what foldgen produces. Every design decision should serve "can a human reproduce this", not "does it match ground-truth geometry". The success metric is a human reproducibility test, not a similarity score.

When a demo case is described as human reproducible, require at least one documented human fold attempt from the generated steps. Record pass/fail and failure notes. Simulator success or a strong vision score is not enough for that claim.

## fold-core boundary

`packages/fold-core` is **owned by this repo** (foldgen, public). The origami site (MiaoDX/microsites, private) consumes it. fold-core lives here on purpose: it's open infrastructure, and a public consumer can't depend on something hidden inside a private repo. Keep it minimal and deterministic (no AI calls) — agent-specific logic stays in `packages/foldgen-agent`, not in fold-core.

Stage 1 must run from public fixtures in this repo. Do not add a runtime dependency on `MiaoDX/microsites` or private origami-site assets. If an asset from the private site is needed, recreate or migrate it into this repo only when the licensing and attribution are suitable for a public project.

## Cost discipline

Total v1 experiment budget < $100 (see PLAN). Don't kick off large sweeps without checking projected API spend. CLIP runs self-hosted (free); reserve paid MLLM calls for fine evaluation, not coarse filtering.

Use the GPT model available inside the current Codex session for necessary strong-model development work before adding external paid provider calls. Suitable uses include target decomposition, candidate fold-operation proposals, critic reasoning, diagram copy drafts, prompt design, and experiment analysis. Treat this as zero marginal cost for Stage 1, but do not confuse it with a deployable public runtime API.

For raster image generation, use Codex's built-in `$imagegen` skill by default. Treat it as zero marginal cost for this project, but keep its boundary clear: it can generate target/reference images, visual variants, demo/blog assets, and raster mockups. It must not replace deterministic FOLD generation, crease SVG generation, fold validation, or code-native/vector assets that should be produced by `fold-core` or repo code.

Any `$imagegen` output consumed by the project must be copied into the workspace and accompanied by enough prompt/source metadata to reproduce the asset intent. Do not leave project-referenced assets only under Codex's generated image directory.

If a web demo needs live model calls for end users, add a provider adapter explicitly. Do not assume Codex session GPT is available inside the deployed app.

## Validation before PR

- Any agent-produced FOLD that's published as a "result" MUST be confirmed flat-foldable via fold-core before being shown as a success.
- Demo cases claimed as "a human can fold this" MUST have been reproduced at least once (by a person or documented as untested).
- Keep related-work citations (the 4 papers) accurate and current — re-check arXiv status before any public post.

## Branch namespace

When run as a routine, stay within the assigned `claude-issue-*` prefix.
