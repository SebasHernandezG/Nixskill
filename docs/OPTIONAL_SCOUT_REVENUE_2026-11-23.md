# Optional-scout revenue pilot, 2026-11-23

This `stable-v2` Codex Desktop run used two existing projects and four fresh chats in baseline → Nixskill → Nixskill → baseline order. The same frozen revenue fixture, prompt, checker, model (`gpt-6.1-sol`), and medium effort applied to both arms. The candidate alone had the project-scoped Nixskill revision from commit `223611d`, where `scout.mjs` is optional and Node is not required for the core workflow. This skill revision differs from the prior `stable-v2` pilot, so the runs are separate descriptive pilots.

All four workspaces passed visible and frozen hidden checks. Both candidate task logs show a successful `SKILL.md` read; neither baseline does. Local Codex JSONL supplied these first-turn counts; separate telemetry flush turns are excluded. Cached input is included in input, and reasoning output is included in output. Remote Langfuse usage has not been independently confirmed.

| Slot | Input | Cached input (included) | Output | Task total | Quality | Skill read | Model generations | Scout used |
| --- | ---: | ---: | ---: | ---: | --- | --- | ---: | --- |
| baseline-1 | 124,354 | 101,120 | 2,058 | 126,412 | Pass | No | 5 | No |
| nixskill-1 | 124,690 | 112,256 | 1,799 | 126,489 | Pass | Yes | 5 | No |
| nixskill-2 | 125,735 | 102,400 | 1,609 | 127,344 | Pass | Yes | 5 | No |
| baseline-2 | 151,668 | 138,368 | 2,013 | 153,681 | Pass | No | 6 | No |

| Pair | Baseline | Nixskill | Change |
| --- | ---: | ---: | ---: |
| 1 | 126,412 | 126,489 | +0.06% |
| 2 | 153,681 | 127,344 | −17.14% |
| Combined | 280,093 | 253,833 | −9.38% |

The aggregate difference is driven by pair 2. In `baseline-2`, an `npm test` run before the edit failed and was followed by another code-reading and model generation. The two Nixskill attempts each used five generations, as did `baseline-1`; neither invoked `scout.mjs`. The helper's intended round-saving mechanism was therefore **not exercised**. This run does not justify a claim that the helper reduces tokens, or that the skill reliably saves tokens on this task. It measures task tokens, not subscription billing.

The frozen manifest, checker, usage records, and captured workspaces are in `%LOCALAPPDATA%\Nixskill\runs\run-agbM4V`; a checked ZIP is at `%LOCALAPPDATA%\Nixskill\archives\run-agbM4V.zip`. Tracing was disabled in both projects and the four chats were archived. The clear-task negative controls remain untested under this revision.
