# Community Adapter Contract

External origami tools must report through one small result shape so foldgen can
separate local validation, community compatibility, external solver output, and
public claim labels.

## Result Shape

Every adapter result is JSON with these fields:

- `adapter_id`: stable adapter id, such as `community-fold` or `flat-folder`.
- `tool_name`: upstream tool or project name.
- `tool_version`: installed version, commit, or `unknown`.
- `input_artifact_path`: repo-relative input path.
- `output_artifact_paths`: repo-relative output paths written by the adapter.
- `status`: `passed`, `failed`, or `unsupported`.
- `errors`: blocking errors from the adapter.
- `warnings`: non-blocking warnings and degraded-mode notes.
- `claim_effect`: what the result changes about the public claim label.

Adapters may include tool-specific fields, but the common fields above are the
only fields the demo and validators may rely on.

## Claim Policy

- A passing community FOLD compatibility result may support a
  `community-compatible` detail, but it does not prove flat-foldability.
- A passing Flat-Folder result may support an `external-solver-valid` detail,
  but it does not prove physical executability.
- Failed or unsupported external adapters must be visible as external validation
  status, not folded into the Stage 1 `simulator-valid` claim.
- Physical or embodiment claims still require final embodiment records and
  `npm run validate:embodiment`.

## License Policy

- MIT dependencies can be considered for normal runtime use.
- GPL tools stay optional, CLI-based, or dev-only until an explicit license
  decision is made.
- Papers or projects without runnable code stay on the watchlist and must not be
  represented as validation backends.

## FoldProgramIR

`fold-program-ir.json` is the handoff artifact between proposal/search and
community adapters. It is intentionally thin:

- `type`: `foldgen.fold_program_ir.v1`
- `selected_base_form`
- ordered operations with links to FOLD edge and assignment indices
- artifact paths for FOLD, SVG, preview, diagram, and walkthrough outputs
- adapter validation summaries and failure notes
- `dsl_policy.textual_dsl_status: "deferred"`

It must not contain a separate geometry model, simulator state, scoring
language, or provider prompt language. FOLD remains the geometry artifact.

## Visual Walkthrough

`visual-walkthrough.json` is a visual-instruction evidence artifact. A
walkthrough-complete case must include:

- an initial frame and one frame per fold operation
- paper state data for every frame
- fold line and assignment marker for every operation frame
- motion cue for every operation frame
- executor silhouette or visual placeholder for every frame
- contact zones for anchor, fold, align, crease, and release phases
- explicit unsupported/needs-fixture state for the selected executor profile

It is a teaching aid and does not prove embodiment.
