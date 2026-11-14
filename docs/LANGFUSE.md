# Optional Langfuse telemetry

Langfuse is useful for observing Codex sessions after Nixskill is installed. Its [official Codex integration](https://langfuse.com/integrations/developer-tools/codex) records model calls, tool activity, token use, and a `skill:nixskill` tag when the skill is invoked. It can show costs when model usage and a matching price definition are available. Those costs are estimates based on the configured model price, not a statement of what a Codex subscription billed. See [Langfuse token and cost tracking](https://langfuse.com/docs/observability/features/token-and-cost-tracking).

## Setup for real Codex sessions

Choose Langfuse Cloud or self-hosting and create a project. The official integration currently requires Node.js 22 or later and Codex CLI 0.143 or later. Install and enable the Langfuse Codex tracing plugin using the current commands in the [integration guide](https://langfuse.com/integrations/developer-tools/codex). Configure its `Stop` hook for the project or your user profile. Set `TRACE_TO_LANGFUSE=true`, `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, and the base URL in your local environment. Keep keys out of Git and do not paste them into benchmark cases.

The plugin sends complete Codex transcripts, including prompts, tool inputs and outputs, and model metadata. Use a dedicated Langfuse project for this work and enable it only for sessions whose contents you intend to upload. Verify a new session in Langfuse before relying on its dashboards.

## Relationship to the A/B benchmark

`evals/benchmark.mjs` saves local JSONL traces and quality-check results for both variants. It currently runs Codex with `--ephemeral --ignore-user-config`; therefore the Langfuse transcript hook is **not** a verified measurement path for these benchmark runs. Do not label Langfuse dashboard numbers as the Nixskill A/B result unless they can be joined to the exact case, variant, repeat, model, and skill activation. The local report requires all of those checks before showing a token difference.

Future integration can export validated benchmark results to a Langfuse dataset or experiment. Langfuse's current [experiment data model](https://langfuse.com/docs/evaluation/experiments/data-model) assumes one result per dataset item per experiment, so repeated runs need distinct experiment runs or item identities. Keep the local results as the audit trail when adding that export.
