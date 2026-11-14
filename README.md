# Nixskill

Nixskill is a Codex skill for programming tasks that need investigation before editing. It chooses a direct path for localized changes and an investigative path when the affected code is unclear. Its instructions focus on finding relevant context, making the requested change, and verifying it.

The skill lives in [`skills/nixskill`](skills/nixskill/SKILL.md). To install it for one project, copy that folder to `<project>/.agents/skills/nixskill`. To make it available across projects, copy it to `${CODEX_HOME}/skills/nixskill` or `~/.codex/skills/nixskill` when `CODEX_HOME` is unset. Invoke it explicitly with `$nixskill`, or let Codex select it for matching tasks.

## Evidence

`evals/` contains a local A/B benchmark. Each case starts from the same fixture in two fresh Git repositories. Only the candidate receives the project-scoped skill. The runner uses the same prompt, model, reasoning effort, sandbox, and checks for both variants. It saves Codex JSONL events and an HTML report; no benchmark data is sent to a third-party dashboard by this repository.

Requirements: Codex CLI signed in, Node.js 20 or later, and Git. Runs use your Codex account and may consume usage. Start with the small pilot:

```powershell
node evals/benchmark.mjs run --model gpt-6.1-sol --effort medium --repeats 1
```

The command prints the run directory. Open its `report.html` in a browser. Repeat a larger suite with `--repeats 3` after reviewing the pilot. To rebuild a report from saved results:

```powershell
node evals/benchmark.mjs report <run-directory>
```

The report shows pass rate and token use for successful tasks separately. Its percentage comparison uses only matched case/repeat pairs where both variants pass, token use is reported, and the candidate trace shows a read of `nixskill/SKILL.md`. Token counts can be unavailable in a trace; the report marks them as missing rather than treating them as zero. Runs blocked by the Codex execution environment are marked invalid and stop the batch. A lower token count is an improvement only when task success is maintained. The three fixture cases are a pilot, not evidence that Nixskill generalizes to every codebase.

The test harness refuses to run if a global `nixskill` installation could contaminate the baseline. Generated runs are stored under `evals/results/`, which Git ignores.
If an environment blocks command execution inside Codex, the runner stops and labels the run as an infrastructure error; those token counts cannot be used as evidence. Run the harness only where both variants can edit and test their isolated workspaces.

## Optional Langfuse telemetry

Langfuse can trace day-to-day Codex sessions, including token categories, tool calls, and skill tags. See [the setup and privacy notes](docs/LANGFUSE.md). The local A/B report remains the source of benchmark comparisons: this runner uses ephemeral sessions and ignores user configuration, so it does not assume the Langfuse hook captured those runs.
