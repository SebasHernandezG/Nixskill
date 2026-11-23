# Revenue pilot after the activation gate, 2026-11-23

This `stable-v1` Desktop run used the two existing projects and four fresh chats in baseline → Nixskill → Nixskill → baseline order. The skill's selection description was narrowed before preparation; its workflow body was unchanged. The same frozen revenue fixture, prompt, checker, model (`gpt-6.1-sol`), medium effort, permission profile, and approval policy applied within each arm. The task turns, not their separate telemetry flush turns, are counted below. Cached input is included in input; reasoning output is included in output.

All four workspaces passed the visible and frozen hidden checks. Both candidate task logs show a successful read of `SKILL.md`; neither baseline does. The local Codex JSONL supplies token counts. Langfuse sidecar files exist for all four chats, but exact remote usage has not been independently confirmed in the Langfuse UI.

| Slot | Input | Cached input (included) | Output | Task total | Quality | Skill read |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| baseline-1 | 149,766 | 124,416 | 2,026 | 151,792 | Pass | No |
| nixskill-1 | 126,087 | 99,072 | 1,873 | 127,960 | Pass | Yes |
| nixskill-2 | 151,598 | 139,008 | 2,098 | 153,696 | Pass | Yes |
| baseline-2 | 122,664 | 99,840 | 1,863 | 124,527 | Pass | No |

| Pair | Baseline | Nixskill | Change |
| --- | ---: | ---: | ---: |
| 1 | 151,792 | 127,960 | −15.7% |
| 2 | 124,527 | 153,696 | +23.4% |
| Combined | 276,319 | 281,656 | +1.9% |

The pair effects disagree and Nixskill used **5,337 more task tokens** in aggregate. This run does not show a savings on revenue. The task is a positive activation case, so it also does not test whether the new description *avoids* loading Nixskill for clear tasks. The clear transfer and message controls were not run after this negative savings result; the gate's exclusion behavior remains unverified.

The frozen manifest, checker, per-slot usage, verification, and captured workspaces are in `%LOCALAPPDATA%\Nixskill\runs\run-SDfjTF`. Tracing was disabled in both stable projects after the run. This result is separate from earlier pilots with different prompts or skill revisions and cannot be combined with them as one experiment. It measures task tokens, not subscription billing.
