# Stable-v2 revenue pilot, 2026-11-23

This run used the two existing Codex Desktop projects and four fresh chats in baseline → Nixskill → Nixskill → baseline order. Each slot began with the same frozen revenue fixture and prompt. The model was `gpt-6.1-sol` at medium effort. The candidate alone had the project-scoped Nixskill revision from commit `950a14d`. The new shared prompt explains that the outer Git repository ignores `work/active` and asks the agent to finish after relevant tests pass unless a concrete issue remains. This is a new protocol, not a matched repetition of earlier pilots.

All four solutions passed visible and frozen hidden checks. Both candidate task logs show a successful `SKILL.md` read; neither baseline does. Counts below come from local Codex JSONL and exclude the separate telemetry flush turns. Cached input is included in input; reasoning output is included in output. Exact Langfuse remote usage has not been independently confirmed.

| Slot | Input | Cached input (included) | Output | Task total | Quality | Skill read |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| baseline-1 | 123,308 | 100,992 | 1,934 | 125,242 | Pass | No |
| nixskill-1 | 125,839 | 112,768 | 1,752 | 127,591 | Pass | Yes |
| nixskill-2 | 124,883 | 99,328 | 1,848 | 126,731 | Pass | Yes |
| baseline-2 | 124,634 | 100,864 | 1,825 | 126,459 | Pass | No |

| Pair | Baseline | Nixskill | Change |
| --- | ---: | ---: | ---: |
| 1 | 125,242 | 127,591 | +1.88% |
| 2 | 126,459 | 126,731 | +0.22% |
| Combined | 251,701 | 254,322 | +1.04% |

The stop change appears to have removed the extra post-test root Git diff round seen in the previous pilot: none of these task logs contains that command, and each task has five recorded token-count generations. However, Nixskill still used **2,621 more task tokens** in aggregate. The candidate read the skill and did not reduce the number of model generations. This is descriptive evidence for this fixture, not a general efficiency result or evidence of subscription billing savings. The shared prompt and skill changed together, so their separate effects cannot be isolated from this run.

The frozen manifest, checker, usage records, and captured workspaces are in `%LOCALAPPDATA%\Nixskill\runs\run-zl0L8b`; a checked ZIP is at `%LOCALAPPDATA%\Nixskill\archives\run-zl0L8b.zip`. Tracing is disabled in both lab projects and the four test chats are archived. The clear-task controls have not been rerun under `stable-v2`.
