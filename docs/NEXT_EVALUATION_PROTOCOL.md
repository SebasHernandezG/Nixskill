# Next Nixskill evaluation: preregistration draft

**Status:** design only. No runs under this protocol have started. Freeze the fixture, checker, prompt, skill revision, model, effort, permissions, and order before the first measured chat. Do not pool earlier pilots with this protocol.

## Cases to build

All three will be new, independent Python repositories so the skill can be exercised without Node in the agent's project. Each needs a visible test that passes or narrowly exposes the defect, a frozen hidden checker that fails on the original fixture and passes on a reference fix, and an audit of unrelated files. The final prompts must be identical across arms for each case.

| Case | Prompt shape | Expected activation | Hidden behavior to check |
| --- | --- | --- | --- |
| `clear-config` | Name one configuration file and the exact setting to change. | No skill read | Correct value, unchanged neighboring settings, focused test. |
| `discover-owner` | Describe a wrong notification count without naming the owning module. | Skill may activate | Correct owner identified, count fixed for duplicate and missing events, unrelated output unchanged. |
| `shared-invariant` | Describe a retry across an API handler, use case, and repository without naming a repair site. | Skill may activate | One stable reservation identity across retries, one stored result, no change to the public port. |

Avoid copying the existing revenue and payments fixtures. The owner-discovery and invariant cases should have plausible but irrelevant neighboring modules. Do not add instructions that tell the candidate which files to read or that make baseline artificially harder.

## Arms and order

- `B`: Codex without Nixskill.
- `N`: Codex with the project-scoped reduced Nixskill.
- `N0`: the same skill with Node unavailable to the agent. Prove this isolation inside that arm without changing the host's Node installation. Its task tests must use Python; the runner may use Node outside the agent environment.

Run four independent task turns **per arm per case**. Pair `B` and `N` in alternating order: `B,N | N,B | B,N | N,B`. Interleave four `N0` turns across the same four blocks using a fixed order recorded in the frozen manifest. That is 36 measured task turns total, plus excluded telemetry flush turns. The current stable runner supports only two arms and two pairs, so it must be extended and tested before this protocol can run. Reuse fixed project folders and freeze a snapshot after every turn; do not add a project per attempt.

## Recorded measures and gates

For every turn record the full task token total, input, cached input, output, model generations, skill-read evidence, changed files, visible and hidden checker results, and session/project IDs. Local Codex JSONL is the source of token counts; confirm Langfuse's remote usage separately before any public cost claim. Count delegated agent usage or reject that turn as invalid.

The result supports a **descriptive efficiency claim for these fixtures only** if all of the following hold:

1. All 36 turns pass the same visible and hidden checker for their case, with no public contract or unrelated-file violation.
2. `clear-config` has no skill read in either skill arm and its median full token total does not exceed baseline.
3. At least two of the three cases have candidate median full tokens at or below baseline, including at least one investigative case.
4. Each investigative case has candidate model generations no greater than its matched baseline in all four pairs.
5. `N0` passes the same checks and shows that Node was unavailable inside that arm.

If any required gate fails, remove any token-saving promise from the skill description and README; report the failure and all measured turns. A failed quality gate cannot be offset by fewer tokens. Missing usage, changed fixtures, or failed environment isolation invalidate the affected comparison; do not impute zero or reuse an old run. Stop paid runs on an infrastructure failure, preserve the partial run, and label it invalid.

## Cost and execution gate

Past Desktop task turns ranged roughly from 100,000 to 163,000 reported tokens. Thirty-six turns could therefore consume several million reported tokens before telemetry flushes. This is usage, not a billing estimate. Build and validate the three fixtures, the runner extension, and Node isolation offline first. Review the frozen manifest and usage scope before launching the measured sequence.
