# CONTEXT — foldgen

This file defines durable project language. Keep it focused on domain terms and boundaries, not progress notes or implementation details.

## Glossary

### foldgen

An AI origami design tool that turns a reference image or constrained text target into a FOLD artifact, crease pattern, folding sequence, and executor-readable diagram. Its current success metric is repo-local technical validity; final-stage claims require embodiment validation, not benchmark score.

### fold-core

The deterministic public infrastructure package owned by this repo. It parses, serializes, validates, simulates, and renders FOLD artifacts by delegating to established origami tools. It must not contain AI calls, private assets, or agent policy logic.

### public testbed

The small set of FOLD fixtures, target images, and expected outputs that can live in this public repo and run without access to `MiaoDX/microsites`. Private origami-site assets may inform this testbed only when they are copied or recreated under a license suitable for this repo.

### imagegen target image

A raster reference or target image generated through Codex's built-in `$imagegen` skill. For this project, `$imagegen` can be treated as a free, high-quality source for target images and demo/blog visuals. These images are inputs or presentation assets; they do not prove FOLD validity or embodiment validation.

### executor visual asset

A visual representation of an executor morphology, such as a human hand, robot gripper, cat paw, or dog paw, used in the teaching surface. These assets may be generated with Codex `$imagegen` for demo purposes, but they are presentation and instruction aids only. They do not prove physical executability unless paired with final embodiment-validation records.

### valid output

For M1, an output is valid when it is a parseable FOLD artifact, produces a deterministic crease pattern SVG, and passes the fold validation checks available through `fold-core`. A rendered 3D preview is useful for inspection but is not proof of validity by itself.

### embodiment validated

A demo case is embodiment validated only after a documented physical executor attempts the generated steps and records pass/fail notes. The executor can be a human hand, robot gripper, tool rig, animal paw, or another explicit morphology. Simulator success, CLIP score, or MLLM approval cannot replace this final-stage claim gate.

### teaching diagram

A sequence of executor-facing folding instructions where each step has a clear pre-fold state, fold line or operation marker, direction cue, and concise instruction. It is the product surface that differentiates foldgen from benchmark-oriented origami generation work.

### case-specific visual walkthrough

The intended demo standard: a case-specific, step-by-step replay from the initial paper state to the final target, where every step shows the current paper state, fold line, motion arrow, executor contact zones, and profile-specific limitations. A walkthrough must be derived from a real case fold sequence or tutorial source. Template text copied across cases is not enough.

### pre-existing object geometry

The origami object's geometry or fold sequence is expected to come from pre-existing artifacts such as FOLD files, tutorial data, or simulator-compatible assets. foldgen may adapt and explain this geometry, but the demo should not pretend that the current local 2.5D canvas preview is a full 3D origami model or physical simulation.

### related work backend

External systems such as Learn2Fold, OrigamiBench, OrigamiSpace, or GamiBench may become adapters or baselines later. They are not Stage 1 runtime dependencies unless explicitly adopted in a future plan.

### provider adapter

The boundary around paid or external model calls. M0 and M1 should not require live LLM access; they should prove the deterministic artifact and validation path first. Live providers can be added after that boundary exists.

### Codex-assisted strong model

The GPT model available inside the active Codex session. It can be used as a free development-time strong model for Stage 1 reasoning, proposal generation, critique, prompt design, and documentation. It is not automatically a public runtime dependency; deployed model access still requires an explicit provider adapter.
