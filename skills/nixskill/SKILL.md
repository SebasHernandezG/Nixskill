---
name: nixskill
description: Use only when coding requires discovering affected files or tracing a non-obvious cross-file invariant. Skip clear targets with explicit behavior, even across multiple files.
---

# Nixskill

Choose the least process that resolves the task.

## Route

- **Direct:** Clear target and behavior. Read the target and closest test once; edit; check.
- **Investigate:** Unclear owner or cross-file invariant. After reading this skill, run `node <this-skill-directory>/scripts/scout.mjs <target-directory> <search-terms>` once. In a small area it reads code and tests together; in a larger area it prints bounded search hits. Choose the narrowest plausible target directory. Read applicable `AGENTS.md` if only its path was listed. Define the invariant and verification boundary from the result; read another file only for a specific unresolved question.
- **Plan:** Dependent changes or consequential product decisions. Define acceptance checks and order; add artifacts or agents only for a concrete need.

## Context

- Reuse earlier instructions, files, and decisions. Read repository instructions and Git state once as needed; preserve unrelated edits.
- Do not reread unchanged files without a new question, edit, failure, or stale context. Reopen only needed lines.
- Batch independent reads, bound output, and widen search only when evidence changes the next step.

## Execute

- Ask only when a required choice cannot be inferred; bundle related questions. Keep updates brief and tied to progress.
- Use pre-edit tests only for reproduction or a baseline. When tools permit, edit and run the focused check in one model round. After it passes, stop unless a specific risk remains. Skip Git diff/status for ignored work; inspect the nearest cause on failure. Report changes and material gaps.
