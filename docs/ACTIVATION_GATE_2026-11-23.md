# Activation gate revision, 2026-11-23

The earlier [two-project transfer pilot](STABLE_TRANSFER_2026-11-23.md) used a candidate skill on both transfer attempts. One candidate made an extra model call, and the skill arm used 2.5% more task tokens in aggregate. Its original prompt and `shouldTrigger: true` remain recorded in the frozen run manifest. Those results are not reclassified or discarded.

## Single change to test

The skill's discovery description now asks Codex to load Nixskill **only** when it must discover affected files or trace a non-obvious invariant across files. A clear target with explicit behavior should use Codex's direct path even if it changes multiple files. The skill body and its Direct, Investigate, and Plan routes are unchanged.

The current `transfer` case now names `src/transfer.js` and `src/validation.js` and is marked `shouldTrigger: false`. Alongside the trivial `message` case, it tests whether the activation gate avoids loading Nixskill on a clear task. This is a new prompt and case classification; do not compare its tokens directly with the prior transfer pilot. `revenue` remains an investigative case with expected activation.

## Evidence required

Run frozen, balanced pairs on each case in the two stable Desktop projects. A transfer or message control passes only if both arms pass the same quality checks and neither shows an observed skill read. A revenue pair is eligible for token comparison only if both arms pass, the candidate reads Nixskill, the baseline does not, and first-turn usage is complete. Record every failure, missing usage value, and unexpected activation. The controls' token differences do not count as savings. One positive case is insufficient for a general savings claim; add a second independent investigative case before testing cross-task savings.

The earlier [v3 plan](V3_EXPERIMENT.md) is retained as the plan written before this gate revision. This document describes the new test rather than silently changing that plan.
