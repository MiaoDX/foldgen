# Related-work Check: 2026-05-28

Purpose: M4 launch discipline for `docs/PLAN.md`. This is not publication copy;
repeat the check before publishing external launch material.

## Sources Checked

- Learn2Fold arXiv landing page: https://arxiv.org/abs/2603.29585
- OrigamiBench arXiv landing page: https://arxiv.org/abs/2603.13856
- GitHub repository search for `Learn2Fold origami`
- GitHub repository search for `OrigamiBench`

## Result

- Learn2Fold is present on arXiv as "Learn2Fold: Structured Origami Generation
  with World Model Planning". The arXiv landing page exposed paper, HTML, PDF,
  and source links, but no public reusable code repository link was found during
  this check.
- OrigamiBench is present on arXiv as "OrigamiBench: An Interactive Environment
  to Synthesize Flat-Foldable Origamis". The arXiv landing page exposed paper,
  HTML, PDF, and source links, but no public reusable code repository link was
  found during this check.
- GitHub repository search returned zero repositories for both checked queries.

## Launch Implication

Stage 1 can keep its current positioning for local technical closeout:
foldgen is an executor-readable output layer with cases labeled
`simulator-valid / embodiment-untested`, not a benchmark reproduction or a
claim of final physical execution.
