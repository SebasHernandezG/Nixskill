# Synthetic payments retry pilot, 2026-11-23

The `payments` case is a synthetic JavaScript repository with a hexagonal layout: retry use case in `src/application/payments`, repository and gateway ports in `src/domain/ports`, and controller, repository, and gateway adapters in `src/infrastructure`. The starting defect gives every HTTP retry a new idempotency key and inserts a new transaction even when one is already stored. The intended invariant is one gateway charge and one transaction per logical payment across retries. The case is not a copy of an existing user repository.

The frozen checker exercises a gateway response lost after processing, a retry of a stored transaction, and two distinct payments. It checks that a regression test was added or changed and that the public repository port and gateway simulation remain unchanged. A reference correction passed the checker before the A/B run.

This `stable-v2` Desktop run used the two existing projects and four fresh chats in baseline → Nixskill → Nixskill → baseline order. Both arms received the same frozen fixture, prompt, checker, model (`gpt-6.1-sol`), and medium effort. The candidate alone had project-scoped Nixskill from commit `223611d`. All four solutions passed visible and frozen hidden checks and changed the same three paths: the retry use case, controller, and regression test. Both candidate logs show a successful skill read; neither baseline does.

| Slot | Input | Cached input (included) | Output | Task total | Model generations | Scout used |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| baseline-1 | 99,810 | 87,424 | 1,560 | 101,370 | 4 | No |
| nixskill-1 | 126,532 | 99,840 | 1,641 | 128,173 | 5 | No |
| nixskill-2 | 161,574 | 146,048 | 1,766 | 163,340 | 6 | No |
| baseline-2 | 100,115 | 87,808 | 1,737 | 101,852 | 4 | No |

| Pair | Baseline | Nixskill | Change |
| --- | ---: | ---: | ---: |
| 1 | 101,370 | 128,173 | +26.44% |
| 2 | 101,852 | 163,340 | +60.37% |
| Combined | 203,222 | 291,513 | +43.45% |

The skill added one or two model generations in this case. Candidate logs include additional file and `AGENTS.md` discovery; one candidate also ran a focused test from the wrong directory before the successful project test. Neither invoked the optional scout. The paired result is negative for token savings despite maintained task quality. Four successful solutions on one synthetic task do not establish behavior on real payment systems. Concurrent retries, real gateway key retention, and persistent database uniqueness were not exercised.

Counts come from local Codex JSONL for the first task turn; cached input is included in input and the separate telemetry flush turns are excluded. Remote Langfuse usage has not been independently confirmed. The frozen manifest, checker, usage, and workspace snapshots are in `%LOCALAPPDATA%\Nixskill\runs\run-RxTh4J`, with a checked backup at `%LOCALAPPDATA%\Nixskill\archives\run-RxTh4J.zip`. Tracing was disabled and the four chats were archived.
