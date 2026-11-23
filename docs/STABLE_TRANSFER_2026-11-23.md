# Two-project transfer pilot, 2026-11-23

This is the first `stable-v1` Desktop A/B run. It used only the existing `baseline` and `nixskill` Codex projects, with one fresh chat per slot in baseline → Nixskill → Nixskill → baseline order. The runner staged the same frozen `transfer` fixture before each chat, captured the changed workspace after its task and telemetry flush, and verified the visible and frozen hidden checks. All four passed. Only the candidate chats show a successful read of Nixskill's `SKILL.md`.

All task turns used `gpt-6.1-sol`, medium effort, disabled approval policy, and the same local permission profile. The prompt was identical across the four chats and named `work/active`. Token counts come from each first task turn's local Codex JSONL; the separate telemetry flush turns are excluded. Cached input is part of input, and reasoning output is part of output. The four Langfuse sidecars exist, but exact remote usage has not been independently checked in the Langfuse UI.

| Slot | Input | Cached input (included) | Output | Task total | Quality | Skill read |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| baseline-1 | 120,920 | 99,328 | 1,403 | 122,323 | Pass | No |
| nixskill-1 | 98,091 | 75,776 | 1,300 | 99,391 | Pass | Yes |
| nixskill-2 | 124,834 | 99,584 | 1,409 | 126,243 | Pass | Yes |
| baseline-2 | 96,427 | 75,136 | 1,285 | 97,712 | Pass | No |

| Pair | Baseline | Nixskill | Change |
| --- | ---: | ---: | ---: |
| 1 | 122,323 | 99,391 | −18.7% |
| 2 | 97,712 | 126,243 | +29.2% |
| Combined | 220,035 | 225,634 | +2.5% |

The pair effects disagree, and the candidate used **more** tokens in aggregate. This run does not show token savings on transfer. The local run directory `%LOCALAPPDATA%\Nixskill\runs\run-f7FXlU` contains the frozen manifest, checker, all four captured workspaces, per-slot usage and verification, and `report.json`. Tracing was disabled in both stable projects after the run.

The `stable-v1` prompt and project layout differ from the earlier five-project v2 revenue pilot. This transfer run therefore cannot be combined with that revenue run as if both used one preregistered protocol. A negative control was not run here; it is unnecessary for a positive savings claim because this case already failed the savings criterion. These counts measure task tokens, not subscription billing.
