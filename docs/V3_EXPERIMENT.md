# Nixskill v3: adaptive method and context reuse

The `stable-v1` transfer pilot showed 2.5% more task tokens with Nixskill in aggregate. Its second candidate used one extra model generation (26,674 tokens, including 24,192 cached input) and six shell commands versus the second baseline's three. It separated the skill read, repository-instruction checks, and validation-file read into additional rounds. The first pair went the other way. These observations motivate a change, not a claim that one rule caused the difference.

## Change and hypothesis

Nixskill now selects Direct, Investigate, or Plan based on uncertainty; reuses context already read; avoids reopening unchanged documents without a specific reason; and keeps user questions to consequential choices that cannot be inferred. This is a small, adaptive workflow inspired by [BMad's work sizing](https://github.com/bmad-code-org/BMAD-METHOD/blob/main/docs/build/build-a-change.md), without installing BMad or adding its artifacts to routine tasks.

**Hypothesis:** the new rules reduce unnecessary model rounds and task tokens while preserving correctness. The shorter skill text alone cannot prove this. The existing transfer run used an earlier skill version and cannot be paired causally with a future run.

## Next measurement

Use the same two stable Desktop projects and `stable-v1` runner, with a committed skill revision synchronized into the candidate project before `prepare`. Freeze each case and complete two balanced pairs on transfer and revenue, then run the `message` negative control. Keep the model, medium effort, account, permissions, prompt, and runner revision constant within each case. Save the exact first-turn JSONL usage, model-generation count, command count, repeated reads of unchanged files, skill-read evidence, visible and hidden checks, and any question sent to the user. Exclude telemetry flush turns.

Compare tokens only for pairs where both solutions pass the same frozen checks, the candidate reads Nixskill, the baseline does not, and usage is complete. For the control, both variants should pass without reading Nixskill. Report each pair and each case, including failures and missing data. Treat lower aggregate tokens in **both** programming cases, no quality regression, and a passing control as promising pilot evidence. Opposing pair directions or another increase remain inconclusive or negative; neither supports a general savings claim. For a direct v2-versus-v3 claim, run a separate balanced version comparison on the same frozen cases rather than comparing these pilots across dates.
