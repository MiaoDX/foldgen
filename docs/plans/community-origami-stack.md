# Community Origami Stack Plan

Last checked: 2026-05-29

## Why This Plan Exists

The current foldgen demo proves that the repository can generate deterministic
artifacts, but too much of the behavior is still a local scaffold. We use FOLD
JSON as the file format, but proposal generation, validation, preview data,
critic output, and executor instructions are all hand-rolled in this repo.

That is acceptable as a short-lived prototype. It is not the right long-term
technical base. foldgen should stand on the existing origami ecosystem wherever
possible, and only keep custom code for the part that is actually distinctive:
turning a target into teachable, executor-aware folding instructions.

## Current Implementation, Plainly

Today we have:

- FOLD JSON fixtures and generated `.fold` files.
- A local FOLD parser/serializer/validator in `packages/fold-core`.
- Curated JS proposal objects in `packages/foldgen-agent/src/pipeline.mjs`.
- Local candidate selection, local critic records, local search records, and
  local preview JSON.
- Executor profiles for `human-hand`, `two-finger-gripper`,
  `cat-paw-profile`, and `dog-paw-profile`.
- A diagram schema that renders step text for those executor profiles.
- A static demo at `miaodx.com/foldgen`.

Today we do not have:

- A real community origami solver in the runtime path.
- A real physical or high-fidelity simulation adapter.
- A standalone DSL parser.
- A learning-based backend.
- Per-executor visualizations of hands, grippers, paws, contact zones, or tool
  geometry.
- Case-specific visual walkthroughs from the initial paper state to the final
  target.
- Evidence that the generated executor steps are physically executable.

The current internal "language" is not a DSL in the usual sense. It is a small
JSON/JS intermediate representation made from operation objects, candidate
objects, operation history, and diagram-step schemas. This should be treated as
temporary IR, not as a proprietary origami language.

## External Stack We Should Prefer

| Tool / project | What it gives us | Current use decision |
|---|---|---|
| FOLD format / `edemaine/fold` | Community artifact model, converters, viewer, flat-fold tooling | Make FOLD the canonical artifact and test against the community library |
| Flat-Folder | External flat-foldability / folded-state oracle | First validator adapter to try |
| Origami Simulator | Community-backed visual folding preview | Use as preview route after FOLD compatibility is cleaned up |
| ORIPA | Mature crease-pattern editor and CLI tooling | Optional offline oracle; keep out of core runtime unless license is resolved |
| Rabbit Ear | Rich JS origami graph/math/rendering library | Useful reference or optional adapter, but GPLv3 makes it risky as a core dependency |
| GamiBench | Dataset for origami spatial reasoning failures | External eval/testbed only, not a product metric |
| ORIGAMISPACE | Benchmark framing for origami reasoning and CP code generation | Track and cite; do not depend on it yet |
| OrigamiBench | Interactive fold proposal/evaluation setup | Track; likely useful if code is released |
| Learn2Fold | LLM folding programs plus learned world model | Best future backend candidate, but not usable until runnable code/model exists |

Sources checked:

- https://github.com/edemaine/fold
- https://edemaine.github.io/fold/doc/spec.html
- https://github.com/origamimagiro/flat-folder
- https://github.com/amandaghassaei/OrigamiSimulator
- https://github.com/oripa/oripa
- https://github.com/rabbit-ear/rabbit-ear
- https://huggingface.co/datasets/stvngo/GamiBench
- https://arxiv.org/abs/2512.22207
- https://arxiv.org/abs/2511.18450
- https://arxiv.org/abs/2603.29585
- https://arxiv.org/abs/2603.13856

## Product Boundary

foldgen should not become another benchmark, another crease-pattern editor, or
another origami simulator.

The product boundary should be:

1. Take a target image or curated text target.
2. Produce a FOLD-compatible fold program/artifact.
3. Validate it with community-backed tools where possible.
4. Render crease pattern and preview.
5. Render executor-aware teaching steps.
6. Clearly label whether the result is only simulator-valid, executor-readable,
   or actually embodiment-validated.

The custom part is step 5: executor-aware teaching. Geometry and simulation
should be delegated wherever possible.

The intended teaching surface is not just a text list. Each case should become
a visual walkthrough: step-by-step paper state, fold line, motion arrow,
executor contact zones, and explicit unsupported/needs-fixture states when a
profile cannot perform the step.

## DSL Decision

Do not build a textual DSL now.

The right next step is a small JSON `FoldProgramIR` that sits between target
selection and external adapters. It should be boring and explicit:

- selected base form
- ordered fold operations
- links to FOLD vertices, edges, faces, and assignments
- optional fold angle / direction hints
- executor-profile annotations
- validation results from external tools
- generated artifacts and failure notes

It should not define a new geometry model, a new simulator state, a new scoring
language, or provider-specific prompt syntax.

A textual DSL can come later only if human authoring becomes common and the JSON
IR has already worked across at least two external adapters.

## Target Architecture

```text
target image / curated text
        |
        v
proposal/search layer
        |
        v
FoldProgramIR
        |
        +--> FOLD artifact
        +--> community FOLD compatibility check
        +--> Flat-Folder validation
        +--> optional ORIPA validation
        +--> Origami Simulator preview route
        +--> executor-aware visual walkthrough renderer
        +--> optional GamiBench eval
        +--> future Learn2Fold / OrigamiBench backend
```

## Work Plan

### 1. Document The Adapter Boundary

Write a small adapter contract for external tools. Every adapter should report:

- tool name and version
- input artifact path
- output artifact paths
- pass/fail/unsupported status
- errors and warnings
- what, if anything, it changes about the public claim label

Also document license policy:

- MIT dependencies can be considered for normal runtime use.
- GPL tools stay optional, CLI-based, or dev-only until we make an explicit
  license decision.
- Papers without runnable code stay as watchlist items.

### 2. Make FOLD Compatibility Real

Use the community FOLD library to parse generated artifacts. The local validator
can stay as a fast smoke test, but it should not be our only claim that a file
is valid.

Concrete work:

- Add a FOLD compatibility script.
- Parse all committed fixtures.
- Parse all generated `out/m2-pipeline/**/*.fold`.
- Record failures with file paths and parser messages.
- Adjust generated FOLD metadata if our custom fields are incompatible with
  community tooling.

### 3. Add Flat-Folder Validation

Flat-Folder should be the first external foldability oracle because it is
focused, JavaScript-friendly, and MIT licensed.

Concrete work:

- Spike Flat-Folder on the current five generated cases.
- Save a `flat-folder-validation.json` per case.
- Add a script such as `npm run validate:flat-folder`.
- Display the result in the demo separately from the current local validation.

This should not upgrade the public claim to physical executability. It only
makes the simulator/solver validity story less self-referential.

### 4. Add A Community Preview Route

The current canvas preview is our own simplified projection. Keep it, but label
it honestly.

Concrete work:

- Check what fields Origami Simulator needs from our FOLD files.
- Add missing FOLD fields if needed.
- Add a demo link or export path that opens/downloads the case for Origami
  Simulator.
- If embedding is clean, add an embedded preview later; do not force this in the
  first pass.

### 5. Keep ORIPA Optional

ORIPA is valuable, but it is Java-based and GPL. Treat it as an optional oracle,
not a core package.

Concrete work:

- Add an optional script that accepts a local ORIPA jar path.
- Write output records but keep them out of default validation.
- Do not put ORIPA-generated artifacts into public claim labels unless the
  license/distribution decision is explicit.

### 6. Use GamiBench As External Eval Only

GamiBench can help test whether our critic/preview stack recognizes obvious
origami spatial failures. It should not become our main metric.

Concrete work:

- Add a loader for a local GamiBench dataset path.
- Run a tiny subset as an optional eval.
- Report results as external diagnostics, not product success.

### 7. Track Learning Backends

Learn2Fold and OrigamiBench are relevant because they are closer to "models
propose fold programs, then an environment/world model evaluates them." They
should become adapters if and only if runnable code and usable licenses appear.

Concrete adoption rule:

- Verify license.
- Run one official sample locally.
- Inspect the program representation.
- Check whether it can emit or consume FOLD.
- Decide whether it is a proposal backend, validator backend, benchmark-only
  baseline, or citation-only related work.

Do not block the current repo on unreleased code.

### 8. Revisit Textual DSL Later

Only build a textual DSL after the JSON IR is stable across real adapters.

The DSL must compile losslessly to `FoldProgramIR`. It must not contain geometry
semantics that bypass FOLD or the external validators.

## Near-Term Priority

The order should be:

1. Adapter contract and related-work status update.
2. Community FOLD compatibility check.
3. Flat-Folder validator.
4. Demo label updates that separate local preview, external validation, and
   executor-readability.
5. Origami Simulator preview route.
6. Optional ORIPA oracle.
7. Optional GamiBench eval.
8. Watch Learn2Fold / OrigamiBench for runnable code.
9. Textual DSL only if it earns its keep.

## What Should Change In The Current Demo

The demo should stop implying that four executor profiles are materially
different if the visual output is identical.

Near-term honest upgrade:

- Show the selected executor profile's contact primitives and unavailable
  actions.
- Show contact zones or icons for human hand / robot gripper / cat paw / dog
  paw.
- Render per-executor constraints visibly.
- Label the generated action flow as "template executor instructions" until
  profile-specific action planning exists.
- Keep the claim label as `simulator-valid / executor-readable /
  embodiment-untested`.

Target demo upgrade:

- Use pre-existing object geometry or tutorial/fold-sequence data for each case.
- Generate executor visual assets with Codex `$imagegen` for human hand, robot
  gripper, cat paw, and dog paw.
- Generate different action primitives per profile.
- Visualize anchor/fold/align/crease/release contacts on the paper for every
  step.
- Show motion arrows and fold lines on top of the current paper state.
- Add fixture/tool requirements for paw profiles.
- Reject executor profiles when the current fold requires an unavailable
  primitive, instead of always producing a complete-looking sequence.

## Visual Walkthrough Standard

Each case is only "walkthrough-complete" when it has:

- A case-specific fold sequence from real tutorial data, FOLD history, or a
  simulator-compatible artifact.
- A frame for every step from start to finish.
- The current paper/object state for that frame.
- Fold line and assignment marker.
- Motion arrow or panel movement cue.
- Executor visual asset or silhouette for the selected profile.
- Contact zones for anchor, fold, align, crease, and release phases.
- A profile-specific unsupported state when the executor lacks a required
  primitive.

The current Stage 1 output does not meet this standard. It is
schema-complete/template-complete only.

## Asset Policy For Executor Hands

Codex `$imagegen` is acceptable for the executor visual assets:

- human hand
- robot gripper
- cat paw
- dog paw

These assets should be saved with prompt and usage metadata. They are visual
instruction aids, not physical evidence. They must not be used to claim that an
executor can actually perform the case.

The origami object's geometry should come from pre-existing FOLD, tutorial, or
simulator-compatible assets. Do not use generated hand images as a substitute
for real object geometry or fold sequence data.

## Definition Of Done For This Plan

This plan is done when foldgen no longer relies only on its own local validator
and preview for credibility:

- Generated FOLD files pass a community compatibility check.
- At least one external foldability/solver adapter is integrated.
- The demo visibly distinguishes local preview, external validation, and
  executor instructions.
- Executor profiles have visible contact-zone differences, executor visual
  assets, or explicit unsupported states.
- At least one case reaches the visual walkthrough standard from initial paper
  state to final target.
- The internal fold-program structure is documented as thin IR, not as a final
  proprietary DSL.
