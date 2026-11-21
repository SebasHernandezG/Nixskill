# Manual Codex Desktop A/B pilot

Use this protocol when the automated Codex CLI benchmark cannot execute commands. It uses synthetic JavaScript fixtures, one fresh Codex Desktop chat per workspace, and Langfuse to observe token usage. It is a separate pilot; do not combine its results with the CLI benchmark.

## Prepare isolated workspaces

From the repository root:

```powershell
node evals/manual.mjs prepare --case transfer
```

Choose `revenue`, `transfer`, or `message` after `--case`; omitting the option selects `revenue`. Use `message` as the negative control: its one-line task should not load Nixskill. The command prints a directory outside the source repository, under `%LOCALAPPDATA%\Nixskill\manual-runs` on Windows. Its `manifest.json` contains the exact prompt, workspace paths, source hashes, and order. Five separate Git repositories are created: `smoke`, `baseline-1`, `nixskill-1`, `nixskill-2`, and `baseline-2`. All task workspaces start from the selected case's fixture. Only the `nixskill-*` workspaces contain `.agents/skills/nixskill`. The runner refuses a globally installed Nixskill because it would contaminate the baseline. Keep each Codex chat rooted in its own workspace; inspect traces for any reads outside that workspace and invalidate affected pairs.

The preparer copies the case's hidden `check.mjs` to `check-frozen.mjs` in the run directory and records its SHA-256 hash. `verify` checks that hash and executes the frozen copy, so later repository edits cannot silently change the success criterion for this run. Do not edit or replace the frozen check. The manifest's case source hash records the source at preparation time; later verification relies on the frozen check and each workspace's initial Git commit, since the repository may have evolved. Older runs without this copy still require the original source checkout.

The workspaces contain only synthetic code. Each has project-scoped `.codex/config.toml` and `.codex/langfuse.json` with tracing enabled, but no credentials. The existing global Langfuse config supplies credentials and remains disabled elsewhere. **The Langfuse plugin uploads complete Codex transcripts**, including prompts, system/developer instructions, local paths, tool inputs and outputs, and model metadata. Synthetic fixtures do not guarantee a transcript free of personal metadata. Keep the global pseudonymous `user_id`, keep these chats limited to this test, and do not share raw trace exports or keys. An environment variable such as `TRACE_TO_LANGFUSE=true` can override project config; the preparer refuses that flag in its own environment, and you should check that Desktop is not launched with it either.

## Check Desktop commands and telemetry first

1. Open a **new** Codex Desktop chat rooted at the exact `smoke` workspace in `manifest.json`. Review and trust the Langfuse Stop hook if Codex asks.
2. Send the `smokePrompt` from the manifest. It asks Codex to read `README.md` with a shell command and run `node --test`. Continue only if both commands succeed.
3. Send the `flushPrompt` as a second, separate message. The plugin may finalize the first trace only when the next turn ends.
4. In the Langfuse Nixskill project, find the `Codex Turn` for the smoke prompt. Confirm that it has the expected tool calls, model, reasoning effort, and numeric input/output token usage. If Desktop does not produce that trace, stop: Langfuse has not been validated as a measurement source for this mode.

## Run matched task chats

Open one fresh Codex Desktop chat for **each** workspace in this order:

1. `baseline-1`
2. `nixskill-1`
3. `nixskill-2`
4. `baseline-2`

Set the same model (`gpt-6.1-sol`), reasoning effort (`medium`), permission mode, account, app version, and hook configuration for all four. Use the exact `prompt` from `manifest.json` as the first message, with no variant label or extra instructions. Do not invoke `$nixskill` explicitly in only one arm; its automatic selection is part of the treatment. Allow the task turn to finish without steering it. Send the identical `flushPrompt` as a second turn, and exclude that flush turn from task token totals. A difference in those settings or missing trace usage invalidates the affected pair.

For each task turn, record the workspace label, Codex chat ID, Langfuse trace URL/ID, model, effort, start time, input tokens, output tokens, cached input tokens, reasoning output tokens, and whether Langfuse shows `skill:nixskill` or a successful read of `SKILL.md`. Record missing usage as missing. Cached input is part of input; reasoning output is part of output. Sum only the task turn's model generations and any nested subagent generations once; do not add the trace total again. A lack of skill tag is evidence of no observed activation, not proof that the skill was unavailable.

## Verify code and interpret results

After all task chats finish, run:

```powershell
node evals/manual.mjs verify "<manual-run-directory>"
```

This runs the visible and frozen hidden checks outside Codex, checks that the candidate skill stayed intact and the baseline did not acquire it, and writes `verification.json`. It compares files to the initial fixture commit even if Codex committed its changes, and records later commits and working tree status. Review those changes and public exports as well. The hidden check is outside the task workspaces.

Compare each matched pair (`baseline-1` with `nixskill-1`, then `baseline-2` with `nixskill-2`) only when both pass, both have complete usage, the candidate has observed `skill:nixskill` activation or a successful read of its `SKILL.md`, and the baseline has no such signal. If activation is absent or uncertain, report the pair as inconclusive for attributing a change to Nixskill. Also report all failed, missing, and non-activated runs rather than silently dropping them. The per-pair change is `(Nixskill total - baseline total) / baseline total × 100`, where total is input plus output. Two pairs on one synthetic case remain a pilot, not a general claim about programming tasks or subscription billing. Langfuse cost numbers are estimates based on model prices.

For `message`, reverse the activation expectation: both variants should pass without reading Nixskill, and exclude its token difference from a savings claim. A skill read there means the negative control failed.

If command execution is blocked in Desktop too, stop the protocol and run `disable` for its workspaces. Do not change sandbox or approval settings just to obtain a favorable measurement.

After the final trace has appeared and verification is complete, set project tracing to disabled for these workspaces:

```powershell
node evals/manual.mjs disable "<manual-run-directory>"
```

Check that `TRACE_TO_LANGFUSE` is not `true` in the environment used to launch Desktop; environment variables take precedence over the project files.
