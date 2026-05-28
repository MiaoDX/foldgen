# Stage 1 Output Contract

This contract sharpens `docs/PLAN.md` and `docs/plans/stage-1-mvp.md`.
It exists because the first Stage 1 pass proved the local FOLD/SVG/preview
pipeline, but did not yet prove that the generated steps are actually
followable by a named executor.

## Output Labels

- `structurally-valid`: FOLD parses and passes repo-local structural validation.
- `simulator-valid`: repo-local deterministic validation, preview, and artifact
  generation pass for the case.
- `executor-readable`: the case includes an explicit executor profile and a
  followable step sequence under the schema below.
- `embodiment-untested`: no real physical executor attempt has been recorded.
- `embodiment-validated`: a final physical executor record exists and
  `npm run validate:embodiment` passes.

Stage 1 default target label is:

```text
simulator-valid / executor-readable / embodiment-untested
```

It must not be shortened to a physical-execution claim.

## Executor Profiles

Every Stage 1 case must name at least one intended executor profile:

| Profile | Purpose | Stage 1 Requirement |
|---|---|---|
| `human-hand` | Baseline manual execution. | Required for every curated demo case. |
| `two-finger-gripper` | Robot-like pinch/grip executor. | Required for at least one demo case before public launch copy. |
| `cat-paw-profile` | Non-human soft paw/limb executor thought experiment. | Required as a documented optional profile, not a physical claim. |

Each profile must define:

- contact primitives: pinch, press, drag, hold, release, or paw-sweep
- unavailable actions: e.g. no precision pinch for `cat-paw-profile`
- minimum landmark language: how the executor can identify corners, edges,
  midpoint, center, and visible crease line
- risk notes: where tearing, sliding, occlusion, or dexterity failure is likely

## Executor-readable Step Schema

Each diagram step must contain these fields:

```json
{
  "step": 1,
  "operation_id": "boat-mast-centerline",
  "title": "Add a mast centerline valley",
  "fold": {
    "assignment": "V",
    "edge": [5, 6],
    "landmarks": {
      "start": "left midpoint",
      "end": "right midpoint",
      "line": "horizontal midpoint crease"
    }
  },
  "executor_profile": "human-hand",
  "pre_state": "Paper lies flat with the target face up.",
  "actions": [
    {
      "phase": "anchor",
      "text": "Hold the lower half of the paper flat below the fold line.",
      "contacts": ["left lower panel", "right lower panel"]
    },
    {
      "phase": "fold",
      "text": "Lift the top half toward you along the dashed valley line.",
      "direction": "top edge moves down toward bottom edge"
    },
    {
      "phase": "align",
      "text": "Align the top boundary with the lower reference edge.",
      "target": "top and bottom edges overlap within visual tolerance"
    },
    {
      "phase": "crease",
      "text": "Press along the full crease from left midpoint to right midpoint.",
      "contacts": ["left midpoint", "center", "right midpoint"]
    },
    {
      "phase": "release",
      "text": "Release the fold while keeping the new crease visible."
    }
  ],
  "checks": [
    "The new valley crease is visible across the paper.",
    "No boundary edge has moved outside the square."
  ],
  "failure_modes": [
    "If the paper slides, re-anchor the lower half and repeat the fold."
  ],
  "annotations": [
    {
      "type": "fold-line",
      "edge": [5, 6],
      "assignment": "V"
    },
    {
      "type": "motion-arrow",
      "from": "top panel",
      "to": "lower panel"
    }
  ]
}
```

A single natural-language sentence is not enough. The UI may render this as a
compact flow, but the underlying artifact must retain the structure.

## Milestone Output Contracts

### M0 Public Testbed

Outputs:
- five public base-form FOLD fixtures
- at least five public target fixtures for Stage 1
- fixture metadata with source/prompt, license/usage note, intended test role,
  and executor-readability notes
- malformed negative FOLD fixture

Gate:
- fixture validator proves valid fixtures pass and malformed fixture fails
- metadata check proves no private runtime dependency or missing source note

### M1 Deterministic Core

Outputs:
- parseable derived FOLD
- deterministic crease SVG
- validation JSON
- preview JSON as inspection data
- one executor-readable diagram step following the schema above
- at least one executor profile definition

Gate:
- deterministic case command writes every artifact
- tests fail if the diagram step lacks executor profile, actions, checks,
  failure modes, or annotations

### M2 Local Pipeline

Outputs:
- five curated case directories
- per-case selected base form, candidates, validation, proposal history, critic
  history, FOLD, SVG, preview, and executor-readable diagram sequence
- per-case `claim_status` including `executor_readable: true`
- failed/invalid proposals recorded as data

Gate:
- batch pipeline succeeds only when all five selected cases are simulator-valid
  and have executor-readable sequences

### M3 Web Demo

Outputs:
- target selector, curated text entry, upload capture, downloads, preview,
  crease pattern, proposal/critic history
- executor profile selector or explicit profile label
- rendered action sequence for each step: setup, anchor/grip, fold, align,
  crease, release, checks, and failure modes

Gate:
- demo tests prove the UI renders executor-readable fields, not just a step
  title
- screenshot smoke test verifies the flow is visible for a selected case

### M4 Technical Closeout And Claim Guard

Outputs:
- README, demo, pipeline, launch checklist, and blog draft use
  `simulator-valid / executor-readable / embodiment-untested`
- claim validator blocks missing executor-readable labels or accidental
  physical-execution claims
- final embodiment gate remains separate and optional until launch claims need it

Gate:
- `npm run validate:stage1` includes tests, fixture validation, deterministic
  case, five-case pipeline, and claim/executor-readable label validation
- `npm run validate:embodiment` is run only for final physical-executor claims
