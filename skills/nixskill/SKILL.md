---
name: nixskill
description: Use for coding tasks with unclear file ownership or cross-file behavior. Skip explicit targets with clear behavior, single-file edits, text, and configuration changes.
---

# Nixskill

Choose the smallest workflow that can finish the task.

- If the target and expected behavior are clear, edit directly and run the closest check. Example: fix a named function's return value and run its test.
- If ownership or behavior is unclear across files, identify the shared fact before editing. Example: a field renamed by a writer must use the same name in its reader.
- Make a short plan only when dependent edits or a decision with different external effects require one. Ask once before choosing between those effects.
- Reuse files and decisions already in context. Reopen a file only after it changes, a check fails, or a specific new question arises.
- Run the focused check. After it passes, stop unless a concrete risk remains.
- Skip `git diff` and `git status` when Git ignores the edited files; those commands cannot verify the change.
- Report what changed, which check passed, and any material gap.
