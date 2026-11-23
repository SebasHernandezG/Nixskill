# Reduced-skill payments pilot, 2026-11-23

This is a descriptive rerun of the synthetic `payments` case after reducing Nixskill to a 15-line `SKILL.md` at commit `ae7b1b3`. It is separate from the earlier payments pilot and from the planned three-case protocol. The frozen fixture, checker, prompt, model (`gpt-6.1-sol`), medium effort, and two Desktop projects were shared across arms. Four fresh chats ran in baseline → Nixskill → Nixskill → baseline order. The candidate alone had the project-scoped skill. Task tokens come from local Codex JSONL; separate telemetry flush turns are excluded. Cached input is already included in input.

| Slot | Input | Cached input | Output | Task total | Generations | Skill read | Checks |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| baseline-1 | 99,902 | 87,552 | 1,554 | 101,456 | 4 | No | Pass |
| nixskill-1 | 154,071 | 129,536 | 1,657 | 155,728 | 6 | Yes | Pass |
| nixskill-2 | 134,103 | 103,168 | 1,535 | 135,638 | 5 | Yes | Pass |
| baseline-2 | 99,775 | 87,424 | 1,403 | 101,178 | 4 | No | Pass |

| Pair | Baseline | Nixskill | Change |
| --- | ---: | ---: | ---: |
| 1 | 101,456 | 155,728 | +53.49% |
| 2 | 101,178 | 135,638 | +34.06% |
| Combined | 202,634 | 291,366 | +43.79% |

All four solutions passed the visible tests and frozen checker, including the lost gateway response and already stored transaction cases. Each changed the controller, retry use case, and regression test, with no delegation observed. The candidate logs contain successful reads of `nixskill/SKILL.md`; the baseline logs do not.

Both candidate runs added regression tests, observed the expected failures in the defective starting code, then applied the fix and reran the tests successfully. The baseline runs edited the implementation and tests before one successful test command. The candidates therefore made one or two more model generations. This test-first sequence and repeated context are plausible contributors to the input-token increase, but this small pilot cannot isolate a causal effect of any one instruction. The skill read itself is short and does not explain tens of thousands of extra tokens. The reduced skill still did not save tokens on this case.

The trial covers one synthetic task and two pairs. It does not establish performance on other repositories, concurrent retries, production gateway key retention, or database uniqueness. Remote Langfuse usage was not independently confirmed. The manifest, per-turn usage, checker results, and workspace snapshots are in `%LOCALAPPDATA%\Nixskill\runs\run-CxZBke`, with a verified backup at `%LOCALAPPDATA%\Nixskill\archives\run-CxZBke.zip`. Tracing was disabled after capture and the four test chats were archived.
