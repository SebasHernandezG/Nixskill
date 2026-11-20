---
name: nixskill
description: Use for programming tasks that require investigating code before editing, especially debugging or changes across files. Guide Codex through a focused context, implementation, and verification workflow; skip for simple explanations or obvious one-line edits.
---

# Nixskill

Use a small, evidence-led working set. The goal is a correct change with less repeated reading and fewer unproductive tool calls, not a shorter answer at the expense of correctness.

## Choose the path

- **Direct path:** If the requested change and its location are already clear, inspect the relevant file and nearby test, edit, then run the smallest meaningful check.
- **Investigative path:** If the behavior, owner, or impact is unclear, establish the expected result and search in widening circles: likely filenames and symbols, their callers and tests, then broader project context only when a concrete question remains. Before editing, identify the affected boundary and how success will be checked. Keep this decision brief; create a plan file only when the task needs one.

## Control context while working

- Start with repository instructions and the working-tree state. Preserve unrelated changes.
- Prefer targeted file and symbol searches and bounded output. Read a whole large file only when its structure matters to the decision.
- Each additional read should answer a current question. If a search finds no match, change the hypothesis or scope instead of repeating it.
- After a failed check, inspect the failure and the smallest related code path before widening the search. Do not rerun an unchanged failing command without a reason.
- Keep any context summary to facts needed for the next decision: target behavior, relevant files, unresolved question, and verification result.

## Finish the task

Implement the requested behavior within its scope. Run a relevant check; expand verification when the changed boundary or failure warrants it. Report what changed, what passed, and any material gap in verification. Never claim token savings from a single run; measure them with a controlled baseline.
