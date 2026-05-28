# CONTEXT — foldgen

This file defines durable project language. Keep it focused on domain terms and boundaries, not progress notes or implementation details.

## Glossary

### foldgen

An AI origami design tool that turns a reference image or constrained text target into a FOLD artifact, crease pattern, folding sequence, and human-readable diagram. Its success metric is human reproducibility, not benchmark score.

### fold-core

The deterministic public infrastructure package owned by this repo. It parses, serializes, validates, simulates, and renders FOLD artifacts by delegating to established origami tools. It must not contain AI calls, private assets, or agent policy logic.

### public testbed

The small set of FOLD fixtures, target images, and expected outputs that can live in this public repo and run without access to `MiaoDX/microsites`. Private origami-site assets may inform this testbed only when they are copied or recreated under a license suitable for this repo.

### imagegen target image

A raster reference or target image generated through Codex's built-in `$imagegen` skill. For this project, `$imagegen` can be treated as a free, high-quality source for target images and demo/blog visuals. These images are inputs or presentation assets; they do not prove FOLD validity or human reproducibility.

### valid output

For M1, an output is valid when it is a parseable FOLD artifact, produces a deterministic crease pattern SVG, and passes the fold validation checks available through `fold-core`. A rendered 3D preview is useful for inspection but is not proof of validity by itself.

### human reproducible

A demo case is human reproducible only after at least one person attempts to fold from the generated steps and records pass/fail notes. Simulator success, CLIP score, or MLLM approval cannot replace this gate.

### teaching diagram

A sequence of human-facing folding instructions where each step has a clear pre-fold state, fold line or operation marker, direction cue, and concise natural-language instruction. It is the product surface that differentiates foldgen from benchmark-oriented origami generation work.

### related work backend

External systems such as Learn2Fold, OrigamiBench, OrigamiSpace, or GamiBench may become adapters or baselines later. They are not Stage 1 runtime dependencies unless explicitly adopted in a future plan.

### provider adapter

The boundary around paid or external model calls. M0 and M1 should not require live LLM access; they should prove the deterministic artifact and validation path first. Live providers can be added after that boundary exists.

### Codex-assisted strong model

The GPT model available inside the active Codex session. It can be used as a free development-time strong model for Stage 1 reasoning, proposal generation, critique, prompt design, and documentation. It is not automatically a public runtime dependency; deployed model access still requires an explicit provider adapter.
