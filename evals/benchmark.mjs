import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync, createWriteStream } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { finished } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const evalDir = dirname(fileURLToPath(import.meta.url));
const repoDir = dirname(evalDir);
const skillDir = join(repoDir, 'skills', 'nixskill');
const cases = JSON.parse(readFileSync(join(evalDir, 'cases.json'), 'utf8'));

function usage() {
  console.error('Usage: node evals/benchmark.mjs run --model <id> [--effort medium] [--repeats 1] [--case id]');
  console.error('   or: node evals/benchmark.mjs report <run-directory>');
  process.exit(2);
}

function options(args) {
  const out = { effort: 'medium', repeats: 1 };
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];
    if (!key?.startsWith('--') || !value) usage();
    out[key.slice(2)] = value;
  }
  out.repeats = Number(out.repeats);
  if (!out.model || !/^[\w.-]+$/.test(out.model)) usage();
  if (!/^(minimal|low|medium|high|xhigh|max|ultra)$/.test(out.effort)) usage();
  if (!Number.isInteger(out.repeats) || out.repeats < 1 || out.repeats > 10) usage();
  if (out.case && !cases.some((item) => item.id === out.case)) usage();
  return out;
}

function ensureUncontaminatedBaseline() {
  const userHome = process.env.CODEX_HOME || join(homedir(), '.codex');
  const paths = [
    join(userHome, 'skills', 'nixskill', 'SKILL.md'),
    join(homedir(), '.agents', 'skills', 'nixskill', 'SKILL.md'),
  ];
  const found = paths.filter(existsSync);
  if (found.length) throw new Error(`Global nixskill installation could contaminate baseline: ${found.join(', ')}`);
}

function command(program, args, cwd) {
  const result = spawnSync(program, args, { cwd, encoding: 'utf8', timeout: 30000 });
  if (result.error || result.status !== 0) {
    throw new Error(`${program} ${args.join(' ')} failed: ${result.error?.message || result.stderr}`);
  }
  return result.stdout.trim();
}

function prepareWorkdir(runDir, testCase, variant, repeat) {
  const name = `${testCase.id}-${variant}-${repeat}`;
  const workdir = join(runDir, name, 'workspace');
  mkdirSync(workdir, { recursive: true });
  cpSync(join(evalDir, 'cases', testCase.id, 'fixture'), workdir, { recursive: true });
  if (variant === 'nixskill') {
    cpSync(skillDir, join(workdir, '.agents', 'skills', 'nixskill'), { recursive: true });
  }
  command('git', ['init', '-q'], workdir);
  command('git', ['add', '.'], workdir);
  command('git', ['-c', 'user.name=Nixskill Benchmark', '-c', 'user.email=benchmark@example.invalid', 'commit', '-qm', 'fixture'], workdir);
  return { name, workdir, artifactDir: dirname(workdir) };
}

function runProcess(program, args, { cwd, input, stdoutPath, stderrPath, timeoutMs = 300000 }) {
  return new Promise((resolveResult) => {
    const stdout = createWriteStream(stdoutPath);
    const stderr = createWriteStream(stderrPath);
    const start = Date.now();
    let timedOut = false;
    let spawnError = null;
    const child = spawn(program, args, { cwd, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    child.stdout.pipe(stdout);
    child.stderr.pipe(stderr);
    child.on('error', (error) => { spawnError = error.message; });
    const timer = setTimeout(() => { timedOut = true; child.kill(); }, timeoutMs);
    if (input === undefined) child.stdin.end();
    else child.stdin.end(input);
    child.on('close', async (code) => {
      clearTimeout(timer);
      try { await Promise.all([finished(stdout), finished(stderr)]); }
      catch (error) { spawnError ||= error.message; }
      resolveResult({ exitCode: code, seconds: Math.round((Date.now() - start) / 1000), timedOut, spawnError });
    });
  });
}

export function traceStats(path) {
  const stats = { input: null, output: null, cached: null, reasoning: null, total: null, commands: 0, skillRead: false, turns: 0 };
  let seenUsage = false;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    if (!line.trim()) continue;
    let event;
    try { event = JSON.parse(line); } catch { continue; }
    if (event.type === 'item.completed' && event.item?.type === 'command_execution') stats.commands++;
    if (event.item?.type === 'command_execution' && /nixskill[\\/]SKILL\.md/i.test(event.item.command || '')) stats.skillRead = true;
    if (event.type !== 'turn.completed') continue;
    stats.turns++;
    if (!event.usage) continue;
    seenUsage = true;
    for (const [key, source] of [
      ['input', event.usage.input_tokens],
      ['output', event.usage.output_tokens],
      ['cached', event.usage.cached_input_tokens ?? event.usage.input_tokens_details?.cached_tokens],
      ['reasoning', event.usage.reasoning_output_tokens ?? event.usage.output_tokens_details?.reasoning_tokens],
      ['total', event.usage.total_tokens],
    ]) {
      if (Number.isFinite(source)) stats[key] = (stats[key] ?? 0) + source;
    }
  }
  if (seenUsage && stats.total === null && stats.input !== null && stats.output !== null) {
    stats.total = stats.input + stats.output;
  }
  return stats;
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function report(runDir) {
  const file = join(runDir, 'results.json');
  const data = JSON.parse(readFileSync(file, 'utf8'));
  const summary = ['baseline', 'nixskill'].map((variant) => {
    const rows = data.results.filter((row) => row.variant === variant);
    const valid = rows.filter((row) => row.status !== 'infrastructure_error');
    const passed = valid.filter((row) => row.status === 'pass');
    return {
      variant, runs: rows.length, valid: valid.length, passed: passed.length,
      tokens: median(passed.map((row) => row.trace.total).filter(Number.isFinite)),
      input: median(passed.map((row) => row.trace.input).filter(Number.isFinite)),
      output: median(passed.map((row) => row.trace.output).filter(Number.isFinite)),
      seconds: median(passed.map((row) => row.codex.seconds)),
    };
  });
  const pairs = new Map();
  for (const row of data.results) {
    const key = `${row.caseId}/${row.repeat}`;
    if (!pairs.has(key)) pairs.set(key, {});
    pairs.get(key)[row.variant] = row;
  }
  const pairedChanges = [];
  for (const pair of pairs.values()) {
    if (pair.baseline?.status !== 'pass' || pair.nixskill?.status !== 'pass') continue;
    if (!pair.nixskill.trace.skillRead) continue;
    const baseTokens = pair.baseline.trace.total;
    const skillTokens = pair.nixskill.trace.total;
    if (!Number.isFinite(baseTokens) || baseTokens <= 0 || !Number.isFinite(skillTokens)) continue;
    pairedChanges.push((skillTokens - baseTokens) / baseTokens * 100);
  }
  const expectedPairs = data.cases.length * (data.repeats ?? Math.max(0, ...data.results.map((row) => row.repeat)));
  const conclusive = pairedChanges.length === expectedPairs && expectedPairs > 0;
  const delta = conclusive ? median(pairedChanges).toFixed(1) : null;
  const fmt = (value) => value == null || !Number.isFinite(value) ? 'missing' : Number(value).toLocaleString('en-US');
  const summaryRows = summary.map((row) => `<tr><td>${row.variant}</td><td>${row.passed}/${row.valid}</td><td>${row.runs - row.valid}</td><td>${fmt(row.tokens)}</td><td>${fmt(row.input)}</td><td>${fmt(row.output)}</td><td>${fmt(row.seconds)}</td></tr>`).join('');
  const detailRows = data.results.map((row) => {
    const status = row.status === 'infrastructure_error' ? 'INVALID' : row.status?.toUpperCase() || 'UNKNOWN';
    const css = status === 'PASS' ? 'pass' : 'fail';
    return `<tr><td>${escapeHtml(row.caseId)}</td><td>${row.variant}</td><td>${row.repeat}</td><td class="${css}">${status}</td><td>${fmt(row.trace.total)}</td><td>${fmt(row.trace.cached)}</td><td>${row.trace.commands}</td><td>${row.variant === 'nixskill' ? (row.trace.skillRead ? 'yes' : 'unverified') : '—'}</td><td>${row.codex.seconds}</td><td><a href="${encodeURIComponent(row.name)}/trace.jsonl">JSONL</a> · <a href="${encodeURIComponent(row.name)}/codex-stderr.txt">stderr</a></td></tr>`;
  }).join('');
  const conclusion = delta === null
    ? `Inconclusive: ${pairedChanges.length}/${expectedPairs} matched pairs passed both checks, reported token use, and showed a Nixskill read.`
    : `Median paired token change: <strong>${delta}%</strong> across ${expectedPairs} matched pairs.`;
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Nixskill A/B benchmark</title><style>body{font:16px/1.5 system-ui,sans-serif;max-width:1100px;margin:40px auto;padding:0 20px;color:#17202a;background:#f8fafc}h1{font-size:2rem}h2{margin-top:2rem}table{border-collapse:collapse;width:100%;background:white}th,td{text-align:left;padding:9px 12px;border-bottom:1px solid #dce3e8}th{background:#e9eff4}code{background:#e9eff4;padding:2px 5px}.pass{color:#08733e;font-weight:700}.fail{color:#aa3030;font-weight:700}.note{background:#fff4ce;padding:12px 16px;border-left:4px solid #b88100}a{color:#145c9a}</style><main><h1>Nixskill A/B benchmark</h1><p>Model: <code>${escapeHtml(data.model)}</code> · Effort: <code>${escapeHtml(data.effort)}</code> · CLI: <code>${escapeHtml(data.codexVersion)}</code></p><p class="note">${conclusion} Invalid infrastructure runs are excluded. Missing usage is not zero. This pilot does not establish general performance.</p><h2>Summary</h2><table><thead><tr><th>Variant</th><th>Passed / valid</th><th>Invalid</th><th>Median tokens*</th><th>Median input*</th><th>Median output*</th><th>Median seconds*</th></tr></thead><tbody>${summaryRows}</tbody></table><p>*Descriptive medians for successful runs; the comparison above uses matched pairs only.</p><h2>Individual runs</h2><table><thead><tr><th>Case</th><th>Variant</th><th>Repeat</th><th>Status</th><th>Total tokens</th><th>Cached input</th><th>Commands</th><th>Skill read</th><th>Seconds</th><th>Evidence</th></tr></thead><tbody>${detailRows}</tbody></table><p>Each run also contains <code>visible-test.txt</code>, <code>hidden-check.txt</code>, and a workspace. The hidden check runs after Codex completes.</p></main></html>`;
  const output = join(runDir, 'report.html');
  writeFileSync(output, html);
  console.log(output);
}

async function run(args) {
  const opts = options(args);
  ensureUncontaminatedBaseline();
  const selected = opts.case ? cases.filter((item) => item.id === opts.case) : cases;
  const resultsDir = join(evalDir, 'results');
  mkdirSync(resultsDir, { recursive: true });
  const runDir = mkdtempSync(join(resultsDir, 'run-'));
  const data = {
    createdAt: new Date().toISOString(), model: opts.model, effort: opts.effort,
    codexVersion: command('codex', ['--version'], repoDir),
    skillSha256: createHash('sha256').update(readFileSync(join(skillDir, 'SKILL.md'))).digest('hex'),
    cases: selected, repeats: opts.repeats, results: [],
  };
  const resultsPath = join(runDir, 'results.json');
  console.log(`Run directory: ${runDir}`);
  for (let repeat = 1; repeat <= opts.repeats; repeat++) {
    for (const testCase of selected) {
      for (const variant of repeat % 2 ? ['baseline', 'nixskill'] : ['nixskill', 'baseline']) {
        const prepared = prepareWorkdir(runDir, testCase, variant, repeat);
        console.log(`Running ${prepared.name}...`);
        const tracePath = join(prepared.artifactDir, 'trace.jsonl');
        const codex = await runProcess('codex', [
          '--ask-for-approval', 'never', 'exec', '--json', '--ephemeral', '--ignore-user-config',
          '--sandbox', 'workspace-write',
          '--model', opts.model, '--config', `model_reasoning_effort=${opts.effort}`,
          testCase.prompt,
        ], {
          cwd: prepared.workdir, stdoutPath: tracePath,
          stderrPath: join(prepared.artifactDir, 'codex-stderr.txt'),
          timeoutMs: 300000,
        });
        const trace = traceStats(tracePath);
        const stderrText = readFileSync(join(prepared.artifactDir, 'codex-stderr.txt'), 'utf8');
        const infrastructureReason = codex.spawnError || (codex.timedOut ? 'Codex timed out' : null)
          || (codex.exitCode !== 0 ? `Codex exited with ${codex.exitCode}` : null)
          || (/blocked by policy|exec_command failed: CreateProcess/i.test(stderrText) ? 'Command execution blocked by policy' : null)
          || (trace.turns === 0 ? 'No completed Codex turn in trace' : null);
        if (infrastructureReason) {
          data.results.push({
            name: prepared.name, caseId: testCase.id, variant, repeat,
            status: 'infrastructure_error', pass: false, infrastructureReason,
            codex, visible: null, hidden: null, trace,
          });
          writeFileSync(resultsPath, JSON.stringify(data, null, 2));
          report(runDir);
          throw new Error(`${prepared.name}: ${infrastructureReason}. Benchmark stopped; this run is not evidence of skill quality.`);
        }
        const visible = await runProcess('node', ['--test'], {
          cwd: prepared.workdir, stdoutPath: join(prepared.artifactDir, 'visible-test.txt'),
          stderrPath: join(prepared.artifactDir, 'visible-test-stderr.txt'), timeoutMs: 30000,
        });
        const hidden = await runProcess('node', [join(evalDir, 'cases', testCase.id, 'check.mjs'), prepared.workdir], {
          cwd: prepared.workdir, stdoutPath: join(prepared.artifactDir, 'hidden-check.txt'),
          stderrPath: join(prepared.artifactDir, 'hidden-check-stderr.txt'), timeoutMs: 30000,
        });
        const result = {
          name: prepared.name, caseId: testCase.id, variant, repeat,
          status: visible.exitCode === 0 && hidden.exitCode === 0 ? 'pass' : 'fail',
          pass: visible.exitCode === 0 && hidden.exitCode === 0,
          codex, visible, hidden, trace,
        };
        data.results.push(result);
        writeFileSync(resultsPath, JSON.stringify(data, null, 2));
        console.log(`${prepared.name}: ${result.pass ? 'PASS' : 'FAIL'}, ${result.trace.total ?? 'missing'} tokens`);
        report(runDir);
      }
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [action, ...args] = process.argv.slice(2);
  if (action === 'run') await run(args);
  else if (action === 'report' && args.length === 1) report(resolve(args[0]));
  else usage();
}
