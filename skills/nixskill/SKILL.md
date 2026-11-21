---
name: nixskill
description: Use for ambiguous or multi-file programming changes that benefit from focused code investigation, scoped edits, and verification. Skip simple explanations and obvious one-line edits.
---

# Nixskill

Choose the shortest path that resolves uncertainty and verifies the requested change.

## Route

- **Clear location and behavior:** Inspect the relevant file and nearby test, edit, then run a focused check.
- **Unclear behavior or owner:** Search likely files and symbols, then their callers and tests. Widen only while a concrete question remains. Before editing, identify the expected invariant, its scope across the affected boundary, and a check at that scope.

## Control context

- Start with repository instructions and working-tree state. Preserve unrelated changes.
- Once the relevant boundary is known, batch independent reads of its implementation, callers, and tests in one tool round. Split them only if an earlier result changes what needs reading.
- Keep searches and output bounded. Run a pre-edit test when reproduction clarifies the cause or establishes a needed baseline; otherwise edit from the known invariant and test afterward.
- On a failed check, inspect the failure and nearest code before widening. Do not rerun an unchanged failing command.

## Finish

Run the relevant check at the boundary where the invariant must hold. Batch independent post-edit checks when practical; expand verification when risk or a failure warrants it. Report the change, checks, and any material gap.
