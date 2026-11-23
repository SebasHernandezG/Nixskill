---
name: nixskill
description: Use for programming changes with uncertain ownership or cross-file behavior that need focused investigation and verification. Skip explanations and obvious localized edits.
---

# Nixskill

Choose the least process that resolves the task.

## Route

- **Direct:** Clear target and behavior. Read the target and closest test once; edit; check.
- **Investigate:** Unclear owner or cross-file invariant. Search likely paths or symbols; batch reads of implementation, callers, and tests. Define the invariant and verification boundary.
- **Plan:** Dependent changes or a consequential product decision. Define acceptance checks and order. Create artifacts or delegate only for a concrete coordination or review need.

## Context

- Reuse instructions, files, and decisions already seen. Read initial repository instructions and Git state once as needed; preserve unrelated edits.
- Never reread an unchanged document just because another step began. Reopen only needed lines after a change, failure, stale context, or new question.
- Batch independent reads, bound output, and widen search only when evidence changes the next step.

## Execute

- Ask only when a required choice cannot be inferred; bundle related questions. Keep updates brief and tied to progress.
- Use pre-edit tests only for reproduction or a baseline. Edit, verify at the invariant boundary, and inspect the nearest cause on failure. Stop after the relevant check passes; report the change, checks, and material gaps.
