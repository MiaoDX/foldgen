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

## fold-core boundary

`packages/fold-core` is **owned by the origami site** (MiaoDX/microsites). Here it is a consumed dependency (git submodule / workspace link). **Do not modify fold-core from this repo.** If foldgen needs a new fold-core capability, open an issue/PR against microsites, don't fork.

## Cost discipline

Total v1 experiment budget < $100 (see PLAN). Don't kick off large sweeps without checking projected API spend. CLIP runs self-hosted (free); reserve paid MLLM calls for fine evaluation, not coarse filtering.

## Validation before PR

- Any agent-produced FOLD that's published as a "result" MUST be confirmed flat-foldable via fold-core before being shown as a success.
- Demo cases claimed as "a human can fold this" MUST have been reproduced at least once (by a person or documented as untested).
- Keep related-work citations (the 4 papers) accurate and current — re-check arXiv status before any public post.

## Branch namespace

When run as a routine, stay within the assigned `claude-issue-*` prefix.
