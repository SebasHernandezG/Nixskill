# Nixskill

**A focused coding workflow for Codex.**

**Status: experimental.** The Desktop pilots below have not demonstrated consistent token savings. In the synthetic payments task, Nixskill used 43.4% more task tokens before the skill was shortened and 43.8% more afterward; all eight solutions passed their frozen checks.

Nixskill is a Codex skill for programming tasks with unclear file ownership or behavior across files. It asks Codex to reuse context and stop after a passing check. Explicit targets with clear behavior, single-file edits, text, and configuration changes should proceed without automatic skill selection.

The skill is intentionally short. Its decision and stop rules take inspiration from [BMad's right-sized process](https://github.com/bmad-code-org/BMAD-METHOD/blob/main/docs/build/build-a-change.md); Nixskill does not install or depend on BMad. The workflow has not demonstrated token savings.

## At a glance

- Direct edits for clear tasks and a concrete shared fact for unclear cross-file behavior.
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

The report shows pass rate and token use for successful tasks separately. `revenue` measures a paired token change only when both variants pass, token use is reported, and the candidate trace shows a successful command returning content from `nixskill/SKILL.md`. `transfer` now names its target files and joins the one-line `message` fix as a negative control: neither should need the skill, and their tokens do not enter a savings claim. The report requires controls to pass without an observed skill read. This read signal is a conservative proxy for activation; absence of a read does not prove the skill was never considered. Missing usage stays missing rather than zero. Runs blocked by the Codex execution environment are invalid. A lower token count matters only when task success is maintained. These fixtures remain a pilot, not evidence that Nixskill generalizes to every codebase.

The test harness refuses to run if a global `nixskill` installation could contaminate the baseline. The comparison is the absence versus presence of Nixskill; other globally available skills may exist in both variants. Each batch records the CLI, Node, Git, platform, repository revision, dirty state, source hashes, and variant order for review. A single-case run remains descriptive because it omits the negative control. Generated runs are stored under `evals/results/`, which Git ignores.
If an environment blocks command execution inside Codex, the runner stops and labels the run as an infrastructure error; those token counts cannot be used as evidence. Run the harness only where both variants can edit and test their isolated workspaces.
Pull requests run the benchmark's offline tests in GitHub Actions. CI does not launch Codex or claim token savings.

If the Codex CLI is blocked from executing commands by the host policy, use the [manual Codex Desktop pilot](docs/MANUAL_AB.md) only after confirming that Desktop can execute commands and Langfuse captures its task turns. Keep its results separate from CLI runs.

The [2026-11-21 Desktop pilot](docs/PILOT_2026-11-21.md) did not demonstrate token savings: Nixskill used more task tokens in both revenue pairs, and a later quality check found incomplete solutions. The report includes the exact counts, check timing, and next experiment.

The shorter v2 skill has one [measured revenue pilot](docs/V2_REVENUE_2026-11-21.md): all four solutions passed the frozen checks and combined candidate tokens were 6.2% lower, but the two pair effects disagreed. Its [preregistered Desktop plan](docs/V2_EXPERIMENT.md) still requires a transfer holdout and a negative control before treating a token reduction as promising. New Desktop tests can use the [two-project stable runner](docs/TEST_WORKSPACES.md), which keeps the sidebar footprint fixed; its changed workspace layout makes those tests a separate pilot.

The first [two-project transfer pilot](docs/STABLE_TRANSFER_2026-11-23.md) kept both arms to two stable Desktop projects. All four solutions passed, but Nixskill used 2.5% more task tokens in aggregate. This is a separate protocol from the v2 revenue pilot and is not evidence of savings.

The [activation gate revision](docs/ACTIVATION_GATE_2026-11-23.md) narrows automatic skill selection. Transfer now explicitly names its target files and is a negative control alongside `message`; its earlier pilot remains a separate, frozen result. The new synthetic `payments` case adds a second investigative task, but it needs its own matched run before it can inform a cross-task claim.

The first [revenue pilot after that gate](docs/GATED_REVENUE_2026-11-23.md) passed all quality and activation checks but used 1.9% more task tokens with Nixskill in aggregate. Its two pair effects disagreed. The clear-task controls have not been rerun, so the gate's exclusion behavior is still unverified.

The [stable-v2 revenue pilot](docs/STABLE_V2_REVENUE_2026-11-23.md) tested the stop rule and the shared ignored-Git prompt. Both pairs passed quality and activation checks; Nixskill used 1.0% more task tokens overall. Neither arm made the unnecessary post-test root Git diff call seen in the previous pilot. This is still no measured token saving.

The optional `scout.mjs` experiment was removed from the distributed skill because the measured agents did not use it. Its source remains in `evals/tools/` for offline research; installing Nixskill requires no Node.js runtime.

The [optional-scout revenue pilot](docs/OPTIONAL_SCOUT_REVENUE_2026-11-23.md) completed that matched run. Both pairs passed quality and activation checks; the aggregate candidate total was 9.4% lower. Neither candidate invoked `scout.mjs`, and the second baseline made one extra generation after a failing pre-edit test. Thus the run does not test the scout hypothesis or establish a reliable saving.

The synthetic `payments` fixture models a hexagonal retry flow with a response lost after gateway processing. Its visible test covers a first attempt, while a frozen checker verifies recovery, an already stored transaction, distinct payments, and an added or adjusted regression test. It is a controlled benchmark task, not a copy of a real payment repository.

The [matched payments pilot](docs/PAYMENTS_PILOT_2026-11-23.md) passed quality and activation checks in both pairs. Baseline used four model generations in each attempt; Nixskill used five and six. No candidate invoked `scout.mjs`. Its aggregate token use was 43.4% higher, so the current skill should not be promoted as a token-saving tool on this evidence.

The [reduced-skill payments rerun](docs/SLIM_PAYMENTS_PILOT_2026-11-23.md) tested the 15-line skill from `ae7b1b3` in the same synthetic case under a separate frozen run. All four solutions passed, but Nixskill used 43.8% more task tokens and made one or two extra model generations in its pairs. It does not demonstrate savings. The three-case protocol below remains a plan, not a completed validation.

The [next evaluation protocol](docs/NEXT_EVALUATION_PROTOCOL.md) specifies three new cases and a fail-able success gate before any further paid runs. The fixtures and runner extension are pending; this document is a plan, not a new result.

## Optional Langfuse telemetry

Langfuse can trace day-to-day Codex sessions, including token categories, tool calls, and skill tags. See [the setup and privacy notes](docs/LANGFUSE.md). The local A/B report remains the source of benchmark comparisons: this runner uses ephemeral sessions and ignores user configuration, so it does not assume the Langfuse hook captured those runs.
