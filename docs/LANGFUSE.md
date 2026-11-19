# Optional Langfuse telemetry

Langfuse is useful for observing Codex sessions after Nixskill is installed. Its [official Codex integration](https://langfuse.com/integrations/developer-tools/codex) records model calls, tool activity, token use, and a `skill:nixskill` tag when the skill is invoked. It can show costs when model usage and a matching price definition are available. Those costs are estimates based on the configured model price, not a statement of what a Codex subscription billed. See [Langfuse token and cost tracking](https://langfuse.com/docs/observability/features/token-and-cost-tracking).

## Set up on Windows for this project

1. Create a [Langfuse Cloud account](https://cloud.langfuse.com) and a project named `Nixskill`. The Hobby plan is [free without a credit card](https://langfuse.com/pricing). In the project settings, create an API key pair. Note the project's region and base URL. Do not send the secret key in chat or commit it.
2. In PowerShell, install the [official Codex tracing plugin](https://langfuse.com/integrations/developer-tools/codex):

   ```powershell
   codex plugin marketplace add langfuse/codex-observability-plugin
   codex plugin add tracing@codex-observability-plugin
   ```

3. In this repository, create `.codex/config.toml` with these entries. If the file already has a `[features]` table, add `hooks = true` there rather than creating a duplicate table.

   ```toml
   [features]
   hooks = true

   [plugins."tracing@codex-observability-plugin"]
   enabled = true
   ```

4. Store credentials in `~/.codex/langfuse.json`, outside this repository and any synced folder. Keep tracing disabled globally. Use the base URL of your actual Langfuse region; the HIPAA URL below is an example.

   ```json
   {
     "enabled": false,
     "public_key": "pk-lf-REPLACE_LOCALLY",
     "secret_key": "sk-lf-REPLACE_LOCALLY",
     "base_url": "https://hipaa.cloud.langfuse.com"
   }
   ```

5. After reviewing the upload scope below, create `.codex/langfuse.json` in this repository with only `{ "enabled": true }`. Langfuse [resolves configuration](https://langfuse.com/integrations/developer-tools/codex) from global settings, then project settings, then environment variables. The project file enables tracing here while the global file keeps it off elsewhere. Neither project file contains a key. Check `git status --short`: both project `.codex` files are ignored by Git. Git ignore does not prevent OneDrive or other folder sync, which is why credentials must stay outside this repository.
6. Restart Codex, start a new session in this project, and review and trust the plugin's `Stop` hook if prompted. Send two harmless test messages. In Langfuse, open the project and look for `Codex Turn` under Tracing. The first turn may appear only after the next one completes.

The integration requires Node.js 22 or later and Codex CLI 0.143 or later. Its plugin sends complete Codex transcripts, including prompts, system and developer instructions, tool inputs and outputs, images, and model metadata. It is not a token-counter-only upload. Keep the project-specific configuration limited to sessions whose contents you intend to upload; use synthetic test prompts first. A basic connection test does not prove that `nixskill` was invoked; to check its `skill:nixskill` tag later, install the skill in a separate test project and invoke `$nixskill` there. Avoid installing Nixskill globally before running the local A/B benchmark, which requires an uncontaminated baseline.

## Relationship to the A/B benchmark

`evals/benchmark.mjs` saves local JSONL traces and quality-check results for both variants. It runs Codex with `--ephemeral --ignore-user-config --disable hooks`, so Langfuse is not the measurement path for these benchmark runs. Do not label Langfuse dashboard numbers as the Nixskill A/B result unless they can be joined to the exact case, variant, repeat, model, and skill activation. The local report requires all of those checks before showing a token difference.

Future integration can export validated benchmark results to a Langfuse dataset or experiment. Langfuse's current [experiment data model](https://langfuse.com/docs/evaluation/experiments/data-model) assumes one result per dataset item per experiment, so repeated runs need distinct experiment runs or item identities. Keep the local results as the audit trail when adding that export.
