# Nixskill v2: preregistered Desktop pilot

This plan was written before running v2 task chats. It follows the [v1 pilot](PILOT_2026-11-21.md), which showed more tokens with Nixskill and exposed an incomplete revenue checker. The v2 skill is shorter and directs Codex to group independent reads, reserve pre-edit tests for questions they answer, and verify invariants at the requested boundary. These changes are hypotheses, not measured improvements.

## Freeze before running

- Commit the skill, prompts, fixtures, hidden checks, and manual runner before `prepare`. Use that revision and the hashes in each run's `manifest.json`. Do not edit the skill or cases between the revenue and transfer runs.
- The revenue prompt now defines refund identity across eligible orders: shared IDs identify one record; without IDs, only the same object reference identifies one record. The hidden checker covers both and distinct ID-less objects.
- Run `revenue` and `transfer` as separate cases. Revenue is a regression case shaped by the v1 failure; transfer is the holdout not used to design v2. Run `message` as a negative control before any positive conclusion about v2.

## Run and measure

For each case, use `node evals/manual.mjs prepare --case <case>` and the [manual protocol](MANUAL_AB.md). Its four fresh task workspaces run in baseline → Nixskill → Nixskill → baseline order. Keep the exact manifest prompt, `gpt-6.1-sol`, medium reasoning effort, account, permission mode, and telemetry configuration in every task chat. Send the same flush turn after each task and exclude flush tokens.

The primary outcome is total task tokens (input plus output), confirmed against Langfuse. Cached input is part of input. Record per turn input, cached input, output, total, model generations, tool calls, visible and frozen hidden check results, and whether `skill:nixskill` or a successful skill read was observed.

Evaluate a matched pair only if both solutions pass the same frozen checks and preserve the public API, both have complete token usage, the candidate loads Nixskill, and the baseline does not. Report every failed or incomplete run. For each case, compute both pair changes and the combined candidate-versus-baseline total. Treat v2 as promising only if **both cases** have two valid pairs and lower combined candidate tokens, with no material quality regression, **and** the `message` control passes without skill activation in either arm. Even that would be a small pilot rather than proof across programming tasks.

Stop a case if command execution or telemetry fails; record the failure, disable tracing in its workspaces, and do not change permissions or quietly exclude its tokens. If revenue fails the quality gate, report it before deciding whether spending more account usage on the holdout is useful. The negative control succeeds when both variants pass without loading Nixskill; its token difference does not enter the savings calculation.
