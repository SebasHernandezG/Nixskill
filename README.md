# Nixskill

**A focused coding workflow for Codex.**

Nixskill is a Codex skill for programming tasks that require investigation before editing. It helps Codex find the relevant code, make a scoped change, and verify the result. Clear, localized edits take a direct path; uncertain behavior gets a focused investigation.

## What the project covers

- A practical workflow for choosing between direct edits and deeper investigation.
- Targeted searches and bounded context to avoid repeated, unproductive reads.
- Verification that matches the scope of each change.
- A local A/B evaluation harness that checks task success and token use separately.
- Optional Langfuse tracing for observing Codex sessions.

## Project status

The initial skill, evaluation harness, and documentation are in [draft PR #1](https://github.com/SebasHernandezG/Nixskill/pull/1). The default branch currently holds this overview. Review the [skill instructions](https://github.com/SebasHernandezG/Nixskill/blob/codex/initial-nixskill/skills/nixskill/SKILL.md), [benchmark guide](https://github.com/SebasHernandezG/Nixskill/blob/codex/initial-nixskill/README.md#evidence), and [telemetry notes](https://github.com/SebasHernandezG/Nixskill/blob/codex/initial-nixskill/docs/LANGFUSE.md) on the development branch.

The benchmark is a controlled pilot with synthetic cases. Nixskill does not claim general token savings without successful, comparable runs.
