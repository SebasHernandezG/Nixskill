# Desktop test workspace layout

## Decision

Use **two stable Codex Desktop projects**, one baseline and one Nixskill, for future manual A/B runs. Do not add a new Desktop project for every repetition. Keep the experiment outputs outside the Git repository and outside both Desktop projects.

`evals/stable.mjs` implements this layout. The older `evals/manual.mjs` still creates five disposable workspaces and is retained only to interpret earlier pilot data. Use the stable runner for new Desktop tests.

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
      baseline-1/                    captured workspace snapshot
      baseline-1.json                chat ID, local usage, verification
      nixskill-1/                    next snapshot, and so on
      nixskill-1.json
      nixskill-2/
      nixskill-2.json
      baseline-2/
      baseline-2.json
      report.json
  archives/                           verified ZIPs of completed runs
```

The two projects must have the same model, effort, permissions, hook configuration, and fixture layout. The only intended treatment difference is the candidate's project-scoped skill. A fresh chat is required for each turn. Never run two chats against the same `work/` directory concurrently.

## Run lifecycle

1. **Prepare:** record the source revision, exact prompt, fixture and skill hashes, and a frozen hidden checker in a new run directory. Check that no Nixskill installation is global and no previous chat is still editing either stable project. Prepare only the first slot.
2. **Run one slot:** reset that arm's `work/` to the frozen fixture and verify its hash before starting a fresh Desktop chat. Use the same prompt in both arms. Record the chat and Langfuse trace IDs. Send the telemetry flush as a separate turn and exclude its tokens.
3. **Freeze the result:** run visible and hidden checks, capture changed files and a complete workspace snapshot, and write the task-turn usage. Confirm that the snapshot and usage exist before reusing that arm's `work/` directory.
4. Repeat in **baseline-1 → nixskill-1 → nixskill-2 → baseline-2** order. The second use of each arm starts from the same frozen fixture, not from the prior solution. After the fourth slot, calculate pair changes and generate the report.
5. **Close:** disable project-scoped telemetry, archive the run, and verify archive contents before any later cleanup. Retain the compact report and manifest. Archive the four chats in Codex; keep the two stable projects for later cases.

## Commands

Run once to check or create the two lab projects:

```powershell
node evals/stable.mjs init
```

After changing `skills/nixskill`, run `node evals/stable.mjs sync-skill` between runs. It updates only the candidate project's tracked skill files, refuses an active workspace or enabled tracing, and leaves baseline without Nixskill.

For a new case, run `node evals/stable.mjs prepare --case transfer`. It prints the run directory and the exact prompt for the first slot. Create a **new** Codex chat in the printed existing project. After the task and separate telemetry flush finish, use that chat's thread ID:

```powershell
node evals/stable.mjs capture "<run-directory>" --thread "<chat-uuid>"
node evals/stable.mjs stage "<run-directory>"
```

Repeat `capture` and `stage` in the printed order; do not call `stage` after the fourth capture. Then:

```powershell
node evals/stable.mjs report "<run-directory>"
node evals/stable.mjs disable "<run-directory>"
```

The runner rejects a missing or old session, a wrong project, incomplete first-turn token usage, a changed fixture or skill, a second active workspace, and an altered captured snapshot. It uses local Codex JSONL for first-turn tokens and excludes the flush turn. Langfuse's exact token breakdown still needs separate confirmation before a published claim. A turn that delegates to subagents is rejected until their usage can be accounted for. Cases marked `shouldTrigger: false` never report a savings percentage.

If fixture staging, archive, skill isolation, command, or usage checks fail, stop and label the run invalid. Do not substitute a previous run or silently omit its tokens. New runs use `stable-v2`; the runner still reads frozen `stable-v1` runs. The v2 prompt explains that the outer Git repository ignores `work/active`, so root `git diff` and `git status` cannot verify task edits, and asks the agent to finish after passing relevant tests unless a concrete issue remains. This prompt change makes v2 results separate from earlier pilots; do not compare them as matched repetitions.

## Why two projects

| Layout | Benefit | Cost |
| --- | --- | --- |
| Five fresh projects per run | Strong, simple workspace isolation | Repeated sidebar and disk clutter; manual setup for every case |
| **Two stable projects** | Fixed sidebar footprint; automatic skill selection remains testable | Requires a checked reset and snapshot before each reuse |
| One shared project | Smallest sidebar footprint | Baseline and candidate can see the same skill, weakening the A/B comparison |

## Existing pilot data

The older `manual-runs` directory still contains the v1 and v2 pilot workspaces. A verified backup is at `%LOCALAPPDATA%\Nixskill\archives\manual-runs-2026-11-22.zip`. The v1 and v2 result summaries are in [the v1 pilot](PILOT_2026-11-21.md) and [the v2 revenue pilot](V2_REVENUE_2026-11-21.md). Those old directories are not the proposed stable projects. Their deletion must be a separate, explicit cleanup after checking the archive; it is not part of preparing the next case.
