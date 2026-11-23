# Nixskill

**A focused coding workflow for Codex.**

Nixskill is a Codex skill for programming tasks that need investigation before editing. It chooses a direct path for localized changes and an investigative path when the affected code is unclear. Its instructions focus on finding relevant context, making the requested change, and verifying it.

## At a glance

- Focused searches and bounded context for investigative code changes.
- Verification that matches the scope of each change.
- A local A/B benchmark that reports task success and token use separately.
- Optional Langfuse tracing for observing Codex sessions.

The skill lives in [`skills/nixskill`](skills/nixskill/SKILL.md). To install it for one project, copy that folder to `<project>/.agents/skills/nixskill`. To make it available across projects, copy it to `${CODEX_HOME}/skills/nixskill` or `~/.codex/skills/nixskill` when `CODEX_HOME` is unset. Invoke it explicitly with `$nixskill`, or let Codex select it for matching tasks.

## Evidence

`evals/` contains a local A/B benchmark. Each case starts from the same fixture in two fresh Git repositories. Only the candidate receives the project-scoped skill. The runner uses the same prompt, model, reasoning effort, sandbox, and checks for both variants. It saves Codex JSONL events and an HTML report; no benchmark data is sent to a third-party dashboard by this repository.

Requirements: Codex CLI signed in, Node.js 20 or later, and Git. Runs use your Codex account and may consume usage. Start with one measured case to confirm that Codex can edit files, run tests, and report usage in your environment:

```powershell
node evals/benchmark.mjs run --model gpt-6.1-sol --effort medium --repeats 1 --case revenue
```

On Windows, the runner looks for `codex.exe` in `PATH`, the Codex desktop app, or the standard npm `codex.cmd` package. If it cannot find one, pass its path with `--codex "C:\path\to\codex.exe"` or set `NIXSKILL_CODEX_BIN`. The same resolved executable is used for the version check and both benchmark variants.

The command prints the run directory. Open its `report.html` in a browser. One repetition is a descriptive pilot and cannot support a token savings claim. After it succeeds, run the full suite with an even number of repeats so each variant runs first equally often:

```powershell
node evals/benchmark.mjs run --model gpt-6.1-sol --effort medium --repeats 2
```

Increase to `--repeats 4` for a fuller pilot if the time and account usage are acceptable. To rebuild a report from saved results:

```powershell
node evals/benchmark.mjs report <run-directory>
```

The report shows pass rate and token use for successful tasks separately. `transfer` and `revenue` measure the paired token change only when both variants pass, token use is reported, and the candidate trace shows a successful command returning content from `nixskill/SKILL.md`. The one-line `message` fix is a negative control: it should not need the skill, and its tokens do not enter the savings calculation. The report requires the control to pass with no observed skill read for an observed comparison. This read signal is a conservative proxy for activation; absence of a read in the trace does not prove the skill was never considered. Token counts can be unavailable in a trace; the report marks them as missing rather than treating them as zero. Runs blocked by the Codex execution environment are marked invalid and stop the batch. A lower token count is an improvement only when task success is maintained. These fixtures are a pilot, not evidence that Nixskill generalizes to every codebase.

The test harness refuses to run if a global `nixskill` installation could contaminate the baseline. The comparison is the absence versus presence of Nixskill; other globally available skills may exist in both variants. Each batch records the CLI, Node, Git, platform, repository revision, dirty state, source hashes, and variant order for review. A single-case run remains descriptive because it omits the negative control. Generated runs are stored under `evals/results/`, which Git ignores.
If an environment blocks command execution inside Codex, the runner stops and labels the run as an infrastructure error; those token counts cannot be used as evidence. Run the harness only where both variants can edit and test their isolated workspaces.
Pull requests run the benchmark's offline tests in GitHub Actions. CI does not launch Codex or claim token savings.

If the Codex CLI is blocked from executing commands by the host policy, use the [manual Codex Desktop pilot](docs/MANUAL_AB.md) only after confirming that Desktop can execute commands and Langfuse captures its task turns. Keep its results separate from CLI runs.

The [2026-11-21 Desktop pilot](docs/PILOT_2026-11-21.md) did not demonstrate token savings: Nixskill used more task tokens in both revenue pairs, and a later quality check found incomplete solutions. The report includes the exact counts, check timing, and next experiment.

The shorter v2 skill has one [measured revenue pilot](docs/V2_REVENUE_2026-11-21.md): all four solutions passed the frozen checks and combined candidate tokens were 6.2% lower, but the two pair effects disagreed. Its [preregistered Desktop plan](docs/V2_EXPERIMENT.md) still requires a transfer holdout and a negative control before treating a token reduction as promising. Future Desktop runs will use the [two-project workspace plan](docs/TEST_WORKSPACES.md) after its runner is implemented.

## Optional Langfuse telemetry

Langfuse can trace day-to-day Codex sessions, including token categories, tool calls, and skill tags. See [the setup and privacy notes](docs/LANGFUSE.md). The local A/B report remains the source of benchmark comparisons: this runner uses ephemeral sessions and ignores user configuration, so it does not assume the Langfuse hook captured those runs.
