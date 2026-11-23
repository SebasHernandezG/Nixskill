# Desktop test workspace layout

## Decision

Use **two stable Codex Desktop projects**, one baseline and one Nixskill, for future manual A/B runs. Do not add a new Desktop project for every repetition. Keep the experiment outputs outside the Git repository and outside both Desktop projects.

This is the target layout; the current `evals/manual.mjs` still creates five disposable workspaces per run. Do not use its `prepare` command to start another Desktop pilot until the stable-project runner and its checks are implemented and verified.

```text
Nixskill/                           Git source: skill, cases, runner, reports
%LOCALAPPDATA%/Nixskill/
  lab/
    baseline/                       Codex project 1; no Nixskill installation
      work/                          current synthetic fixture
    nixskill/                       Codex project 2; project-scoped Nixskill
      .agents/skills/nixskill/
      work/                          current synthetic fixture
  runs/
    <run-id>/                        not opened as a Codex project
      manifest.json                  case, order, revisions, hashes, settings
      check-frozen.mjs               quality gate frozen before the first chat
      baseline-1/                    snapshot, chat/trace IDs, usage, verification
      nixskill-1/
      nixskill-2/
      baseline-2/
      report.json
  archives/                           verified ZIPs of completed runs
```

The two projects must have the same model, effort, permissions, hook configuration, and fixture layout. The only intended treatment difference is the candidate's project-scoped skill. A fresh chat is required for each turn. Never run two chats against the same `work/` directory concurrently.

## Run lifecycle

1. **Prepare:** record the source revision, exact prompt, fixture and skill hashes, and a frozen hidden checker in a new run directory. Check that no Nixskill installation is global and no previous chat is still editing either stable project. Prepare only the first slot.
2. **Run one slot:** reset that arm's `work/` to the frozen fixture and verify its hash before starting a fresh Desktop chat. Use the same prompt in both arms. Record the chat and Langfuse trace IDs. Send the telemetry flush as a separate turn and exclude its tokens.
3. **Freeze the result:** run visible and hidden checks, capture changed files and a complete workspace snapshot, and write the task-turn usage. Confirm that the snapshot and usage exist before reusing that arm's `work/` directory.
4. Repeat in **baseline-1 → nixskill-1 → nixskill-2 → baseline-2** order. The second use of each arm starts from the same frozen fixture, not from the prior solution. After the fourth slot, calculate pair changes and generate the report.
5. **Close:** disable project-scoped telemetry, archive the run, verify archive contents, and only then remove disposable working files. Retain the compact report and manifest. Archive the four chats in Codex; keep the two stable projects for later cases.

If a fixture reset, archive, skill isolation, command, or usage check fails, stop and label the run invalid. Do not substitute a previous run or silently omit its tokens. The new protocol will have its own version marker; results from the earlier five-project protocol remain separate.

## Why two projects

| Layout | Benefit | Cost |
| --- | --- | --- |
| Five fresh projects per run | Strong, simple workspace isolation | Repeated sidebar and disk clutter; manual setup for every case |
| **Two stable projects** | Fixed sidebar footprint; automatic skill selection remains testable | Requires a checked reset and snapshot before each reuse |
| One shared project | Smallest sidebar footprint | Baseline and candidate can see the same skill, weakening the A/B comparison |

## Existing pilot data

The older `manual-runs` directory still contains the v1 and v2 pilot workspaces. A verified backup is at `%LOCALAPPDATA%\Nixskill\archives\manual-runs-2026-11-22.zip`. The v1 and v2 result summaries are in [the v1 pilot](PILOT_2026-11-21.md) and [the v2 revenue pilot](V2_REVENUE_2026-11-21.md). Those old directories are not the proposed stable projects. Their deletion must be a separate, explicit cleanup after checking the archive; it is not part of preparing the next case.
