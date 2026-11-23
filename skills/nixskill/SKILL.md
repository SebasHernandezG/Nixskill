---
name: nixskill
description: Use only when coding requires discovering affected files or tracing a non-obvious cross-file invariant. Skip clear targets with explicit behavior, even across multiple files.
---

# Nixskill

Choose the least process that resolves the task.

## Route

- **Direct:** Clear target and behavior. Read the target and closest test once; edit; check.
- **Investigate:** Unclear owner or cross-file invariant. Search likely paths or symbols; batch reads of implementation, callers, and tests. Define the invariant and verification boundary.
- **Plan:** Dependent changes or consequential product decisions. Define acceptance checks and order; add artifacts or agents only for a concrete need.

## Context

- Reuse earlier instructions, files, and decisions. Read repository instructions and Git state once as needed; preserve unrelated edits.
- Do not reread unchanged files without a new question, edit, failure, or stale context. Reopen only needed lines.
- Batch independent reads, bound output, and widen search only when evidence changes the next step.

## Execute

- Ask only when a required choice cannot be inferred; bundle related questions. Keep updates brief and tied to progress.
- Use pre-edit tests only for reproduction or a baseline. When tools permit, edit and run the focused check in one model round. After it passes, stop unless a specific risk remains. Skip Git diff/status for ignored work; inspect the nearest cause on failure. Report changes and material gaps.
