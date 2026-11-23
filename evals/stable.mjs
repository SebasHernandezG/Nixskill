import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const evalDir = dirname(fileURLToPath(import.meta.url));
const repoDir = dirname(evalDir);
const dataDir = resolve(process.env.NIXSKILL_DATA_DIR || (process.platform === 'win32' && process.env.LOCALAPPDATA
  ? join(process.env.LOCALAPPDATA, 'Nixskill') : join(homedir(), '.local', 'share', 'nixskill')));
const labDir = join(dataDir, 'lab');
const runsDir = join(dataDir, 'runs');
const order = ['baseline-1', 'nixskill-1', 'nixskill-2', 'baseline-2'];
const cases = JSON.parse(readFileSync(join(evalDir, 'cases.json'), 'utf8'));
const pluginConfig = '[features]\nhooks = true\n\n[plugins."tracing@codex-observability-plugin"]\nenabled = true\n';

function assertWithin(path, parent) {
  const target = resolve(path);
  if (!target.startsWith(resolve(parent) + sep)) throw new Error(`Path is outside ${parent}: ${target}`);
  return target;
}

function command(program, args, cwd, timeout = 30000) {
  const result = spawnSync(program, args, { cwd, encoding: 'utf8', timeout, windowsHide: true });
  if (result.error || result.status !== 0) throw new Error(`${program} failed: ${result.error?.message || result.stderr || result.stdout}`);
  return result.stdout.trim();
}

function sha(bytes) { return createHash('sha256').update(bytes).digest('hex'); }
function fileHash(path) { return sha(readFileSync(path)); }
function json(path, value) { writeFileSync(path, JSON.stringify(value, null, 2) + '\n'); }

function files(root) {
  const result = [];
  function visit(dir, prefix = '') {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const name = `${prefix}${entry.name}`;
      if (entry.isDirectory()) visit(join(dir, entry.name), `${name}/`);
      else if (entry.isFile()) result.push(name);
      else throw new Error(`Unsupported fixture entry: ${join(root, name)}`);
    }
  }
  visit(root);
  return result;
}

function treeHash(root) {
  const hash = createHash('sha256');
  for (const name of files(root)) {
    hash.update(name); hash.update('\0'); hash.update(readFileSync(join(root, name))); hash.update('\0');
  }
  return hash.digest('hex');
}

function globalSkillCheck() {
  const codexHome = process.env.CODEX_HOME || join(homedir(), '.codex');
  const found = [join(codexHome, 'skills', 'nixskill', 'SKILL.md'),
    join(homedir(), '.agents', 'skills', 'nixskill', 'SKILL.md')].filter(existsSync);
  if (found.length) throw new Error(`Global Nixskill would contaminate baseline: ${found.join(', ')}`);
  if (String(process.env.TRACE_TO_LANGFUSE || '').toLowerCase() === 'true') {
    throw new Error('TRACE_TO_LANGFUSE=true could enable tracing outside the lab');
  }
}

function project(arm) { return join(labDir, arm); }
function active(arm) { return join(project(arm), 'work', 'active'); }

function init() {
  globalSkillCheck();
  for (const arm of ['baseline', 'nixskill']) {
    const root = project(arm);
    if (!existsSync(root)) {
      mkdirSync(join(root, 'work'), { recursive: true });
      mkdirSync(join(root, '.codex'), { recursive: true });
      writeFileSync(join(root, 'README.md'), `# Nixskill stable test project\nVariant: ${arm}. The runner prepares work/active before each measured chat.\n`);
      json(join(root, '.codex', 'langfuse.json'), { enabled: false });
      if (arm === 'nixskill') {
        const skillDest = join(root, '.agents', 'skills', 'nixskill');
        mkdirSync(dirname(skillDest), { recursive: true });
        cpSync(join(repoDir, 'skills', 'nixskill'), skillDest, { recursive: true });
      }
      command('git', ['init', '-q'], root);
      command('git', ['add', '.'], root);
      command('git', ['-c', 'user.name=Nixskill Benchmark', '-c', 'user.email=benchmark@example.invalid',
        'commit', '-qm', 'Initialize stable synthetic lab project'], root);
    }
    if (!existsSync(join(root, '.git')) || !existsSync(join(root, '.codex', 'langfuse.json'))) {
      throw new Error(`Incomplete stable project: ${root}`);
    }
    const exclude = join(root, '.git', 'info', 'exclude');
    const old = existsSync(exclude) ? readFileSync(exclude, 'utf8') : '';
    if (!old.split(/\r?\n/).includes('/work/active/')) writeFileSync(exclude, `${old.trimEnd()}\n/work/active/\n`);
  }
  validateSkill();
  console.log(`Open these two Codex projects once:\n${project('baseline')}\n${project('nixskill')}`);
}

function syncSkill() {
  globalSkillCheck();
  if (['baseline', 'nixskill'].some((arm) => existsSync(active(arm)))) {
    throw new Error('Capture the active workspace before updating the skill');
  }
  for (const arm of ['baseline', 'nixskill']) {
    const config = JSON.parse(readFileSync(join(project(arm), '.codex', 'langfuse.json'), 'utf8'));
    if (config.enabled) throw new Error('Disable lab tracing before updating the skill');
  }
  const source = join(repoDir, 'skills', 'nixskill');
  const target = join(project('nixskill'), '.agents', 'skills', 'nixskill');
  if (command('git', ['status', '--porcelain', '--', '.agents/skills/nixskill'], project('nixskill'))) {
    throw new Error('Candidate skill has uncommitted edits; inspect before syncing');
  }
  const sourceFiles = files(source);
  if (JSON.stringify(sourceFiles) !== JSON.stringify(files(target))) {
    throw new Error('Skill file set changed; migrate the candidate project explicitly');
  }
  if (treeHash(source) === treeHash(target)) { console.log('Candidate skill is already current'); return; }
  for (const name of sourceFiles) writeFileSync(join(target, name), readFileSync(join(source, name)));
  command('git', ['add', '--', '.agents/skills/nixskill'], project('nixskill'));
  command('git', ['-c', 'user.name=Nixskill Benchmark', '-c', 'user.email=benchmark@example.invalid',
    'commit', '-qm', 'Update project-scoped Nixskill'], project('nixskill'));
  validateSkill();
  console.log('Candidate skill updated; baseline remains without Nixskill');
}

function validateSkill(expected = treeHash(join(repoDir, 'skills', 'nixskill'))) {
  globalSkillCheck();
  if (existsSync(join(project('baseline'), '.agents', 'skills', 'nixskill')) ||
      existsSync(join(active('baseline'), '.agents', 'skills', 'nixskill'))) {
    throw new Error('Baseline contains Nixskill');
  }
  const candidate = join(project('nixskill'), '.agents', 'skills', 'nixskill');
  if (!existsSync(candidate) || treeHash(candidate) !== expected) throw new Error('Candidate skill differs from frozen skill');
}

function readRun(path) {
  const runDir = assertWithin(path, runsDir);
  const manifest = JSON.parse(readFileSync(join(runDir, 'manifest.json'), 'utf8'));
  if (manifest.protocol !== 'stable-v1' || resolve(manifest.runDir) !== runDir ||
      resolve(manifest.labDir) !== resolve(labDir)) throw new Error('Wrong run or protocol');
  const state = JSON.parse(readFileSync(join(runDir, 'state.json'), 'utf8'));
  if (fileHash(join(runDir, 'check-frozen.mjs')) !== manifest.checkSha256 ||
      treeHash(join(runDir, 'fixture')) !== manifest.fixtureSha256) throw new Error('Frozen case changed');
  validateSkill(manifest.skillTreeSha256);
  return { runDir, manifest, state };
}

function stage(runDir) {
  const { manifest, state } = readRun(runDir);
  if (state.active) throw new Error(`Capture ${state.active} before staging another slot`);
  if (state.completed.length >= order.length) throw new Error('Run already has four captured slots');
  if (['baseline', 'nixskill'].some((arm) => existsSync(active(arm)))) {
    throw new Error('An active workspace already exists; inspect it before preparing another');
  }
  const label = order[state.completed.length];
  const arm = label.startsWith('nixskill') ? 'nixskill' : 'baseline';
  const target = active(arm);
  mkdirSync(dirname(target), { recursive: true });
  cpSync(join(runDir, 'fixture'), target, { recursive: true, errorOnExist: true, force: false });
  if (treeHash(target) !== manifest.fixtureSha256) throw new Error('Staged fixture hash differs');
  state.active = label;
  state.stagedAt = new Date().toISOString();
  json(join(runDir, 'state.json'), state);
  console.log(`${label} ready in ${project(arm)}\nPrompt:\n${manifest.prompt}\nAfter the task, send separately: ${manifest.flushPrompt}`);
}

function prepare(caseId) {
  init();
  const testCase = cases.find((item) => item.id === caseId);
  if (!testCase) throw new Error(`Unknown case: ${caseId}`);
  if (['baseline', 'nixskill'].some((arm) => existsSync(active(arm)))) {
    throw new Error('An active workspace exists; capture the previous slot before preparing a new run');
  }
  mkdirSync(runsDir, { recursive: true });
  const runDir = mkdtempSync(join(runsDir, 'run-'));
  cpSync(join(evalDir, 'cases', caseId, 'fixture'), join(runDir, 'fixture'), { recursive: true });
  cpSync(join(evalDir, 'cases', caseId, 'check.mjs'), join(runDir, 'check-frozen.mjs'));
  const manifest = {
    protocol: 'stable-v1', createdAt: new Date().toISOString(), runDir, labDir,
    caseId, shouldTrigger: testCase.shouldTrigger, order,
    repoRevision: command('git', ['rev-parse', 'HEAD'], repoDir),
    repoDirty: Boolean(command('git', ['status', '--porcelain'], repoDir)),
    runnerSha256: fileHash(fileURLToPath(import.meta.url)),
    fixtureSha256: treeHash(join(runDir, 'fixture')),
    checkSha256: fileHash(join(runDir, 'check-frozen.mjs')),
    skillTreeSha256: treeHash(join(repoDir, 'skills', 'nixskill')),
    prompt: `The JavaScript project is in work/active. Only edit files there. ${testCase.prompt}`,
    flushPrompt: 'Reply exactly NIXSKILL_TELEMETRY_FLUSH.',
    model: 'gpt-6.1-sol', effort: 'medium',
    note: 'One fresh Desktop chat per slot. Capture and move its work before staging the next. This protocol is distinct from the five-project pilot.',
  };
  json(join(runDir, 'manifest.json'), manifest);
  json(join(runDir, 'state.json'), { active: null, stagedAt: null, completed: [] });
  for (const arm of ['baseline', 'nixskill']) {
    writeFileSync(join(project(arm), '.codex', 'config.toml'), pluginConfig);
    json(join(project(arm), '.codex', 'langfuse.json'), { enabled: true });
  }
  console.log(`Run directory: ${runDir}`);
  stage(runDir);
}

function findSession(threadId) {
  if (!/^[0-9a-f-]{36}$/.test(threadId)) throw new Error('Expected a Codex thread UUID');
  const codexHome = process.env.CODEX_HOME || join(homedir(), '.codex');
  const roots = [join(codexHome, 'sessions'), join(codexHome, 'archived_sessions')];
  const matches = [];
  function visit(dir) {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile() && entry.name.endsWith(`${threadId}.jsonl`)) matches.push(path);
    }
  }
  for (const root of roots) visit(root);
  if (matches.length !== 1) throw new Error(`Expected one Codex JSONL for ${threadId}; found ${matches.length}`);
  return matches[0];
}

export function firstTurnUsage(jsonl, expectedPrompt) {
  const lines = readFileSync(jsonl, 'utf8').split(/\r?\n/).filter(Boolean);
  let started = null, completed = false, usage = null, promptSeen = false, skillRead = false;
  let sessionCwd = null, sessionStartedAt = null, delegationObserved = false;
  for (const line of lines) {
    const event = JSON.parse(line);
    const payload = event.payload || {};
    if (event.type === 'session_meta') {
      sessionCwd = payload.cwd;
      sessionStartedAt = payload.timestamp;
    }
    if (event.type === 'response_item' && payload.type === 'message' && payload.role === 'user' &&
        payload.content?.some((part) => typeof part.text === 'string' && part.text.includes(expectedPrompt))) {
      promptSeen = true;
    }
    if (event.type === 'response_item' && payload.type === 'function_call_output' &&
        payload.name === 'create_thread' && String(payload.output || '').includes(expectedPrompt)) {
      promptSeen = true;
    }
    if (event.type !== 'event_msg') continue;
    if (payload.type === 'task_started') {
      if (started) break;
      started = payload.turn_id;
    }
    if (!started) continue;
    if (event.type === 'response_item' && payload.type === 'custom_tool_call' &&
        /spawn_agent|create_thread/.test(`${payload.name} ${payload.input || ''}`)) delegationObserved = true;
    if (payload.type === 'token_count' && payload.info?.total_token_usage) usage = payload.info.total_token_usage;
    if (payload.type === 'item_completed' && payload.turn_id === started &&
        payload.item?.exit_code === 0 &&
        String(payload.item.command || '').replaceAll('\\', '/').includes('nixskill/SKILL.md') &&
        String(payload.item.aggregated_output || '').includes('name: nixskill')) skillRead = true;
    if (payload.type === 'task_complete' && payload.turn_id === started) { completed = true; break; }
  }
  if (!promptSeen || !started || !completed || !usage || !Number.isInteger(usage.total_tokens)) {
    throw new Error('First task turn has no matching prompt, completion, or complete token usage');
  }
  if (usage.input_tokens + usage.output_tokens !== usage.total_tokens) throw new Error('Inconsistent token total');
  return { turnId: started, sessionCwd, sessionStartedAt, skillRead, delegationObserved,
    input: usage.input_tokens, cachedInput: usage.cached_input_tokens,
    output: usage.output_tokens, reasoningOutput: usage.reasoning_output_tokens,
    total: usage.total_tokens };
}

function compareTrees(before, after) {
  const beforePaths = new Set(files(before));
  const afterPaths = new Set(files(after));
  return [...new Set([...beforePaths, ...afterPaths])].sort().filter((name) =>
    !beforePaths.has(name) || !afterPaths.has(name) || fileHash(join(before, name)) !== fileHash(join(after, name)));
}

function check(program, args, cwd) {
  const result = spawnSync(program, args, { cwd, encoding: 'utf8', timeout: 30000, windowsHide: true });
  return { pass: !result.error && result.status === 0,
    error: result.error?.message || result.signal || (result.status === 0 ? null : (result.stderr || result.stdout).slice(0, 800)) };
}

function capture(path, threadId) {
  const { runDir, manifest, state } = readRun(path);
  if (!state.active) throw new Error('No staged slot to capture');
  const label = state.active;
  const arm = label.startsWith('nixskill') ? 'nixskill' : 'baseline';
  const source = active(arm);
  if (!existsSync(source)) throw new Error(`Missing active workspace: ${source}`);
  const sessionPath = findSession(threadId);
  const usage = firstTurnUsage(sessionPath, manifest.prompt);
  if (!usage.sessionStartedAt || Date.parse(usage.sessionStartedAt) < Date.parse(state.stagedAt)) {
    throw new Error('Session predates this staged slot');
  }
  if (resolve(usage.sessionCwd || '') !== resolve(project(arm))) {
    throw new Error(`Session project differs from ${arm}: ${usage.sessionCwd}`);
  }
  if (state.completed.some((previous) =>
    JSON.parse(readFileSync(join(runDir, `${previous}.json`), 'utf8')).threadId === threadId)) {
    throw new Error('This chat was already used for another slot');
  }
  if (usage.delegationObserved) throw new Error('Subagent usage needs separate accounting before capture');
  const visible = check('node', ['--test'], source);
  const hidden = check('node', [join(runDir, 'check-frozen.mjs'), source], source);
  const changedFiles = compareTrees(join(runDir, 'fixture'), source);
  const snapshotSha256 = treeHash(source);
  const skillSetupValid = !existsSync(join(source, '.agents', 'skills', 'nixskill'));
  const result = { label, arm, threadId, turnId: usage.turnId, sessionPath,
    capturedAt: new Date().toISOString(), usage, visible, hidden, skillSetupValid, changedFiles, snapshotSha256,
    pass: visible.pass && hidden.pass && skillSetupValid };
  const destination = assertWithin(join(runDir, label), runDir);
  if (existsSync(destination)) throw new Error(`Snapshot already exists: ${destination}`);
  renameSync(source, destination);
  json(join(runDir, `${label}.json`), result);
  state.completed.push(label);
  state.active = null;
  state.stagedAt = null;
  json(join(runDir, 'state.json'), state);
  console.log(`${label}: ${result.pass ? 'PASS' : 'FAIL'}; ${usage.total} task tokens; snapshot ${destination}`);
  if (!result.pass) process.exitCode = 1;
}

function report(path) {
  const { runDir, manifest, state } = readRun(path);
  if (state.active || state.completed.length !== order.length || state.completed.some((x, i) => x !== order[i])) {
    throw new Error('Four slots must be captured in the planned order');
  }
  const results = Object.fromEntries(order.map((label) => [label, JSON.parse(readFileSync(join(runDir, `${label}.json`), 'utf8'))]));
  for (const label of order) {
    if (treeHash(join(runDir, label)) !== results[label].snapshotSha256) {
      throw new Error(`Captured workspace changed after verification: ${label}`);
    }
  }
  const pairs = [[results['baseline-1'], results['nixskill-1']], [results['baseline-2'], results['nixskill-2']]];
  const comparisons = pairs.map(([baseline, candidate], i) => ({ pair: i + 1,
    validQuality: baseline.pass && candidate.pass,
    validActivation: manifest.shouldTrigger
      ? candidate.usage.skillRead && !baseline.usage.skillRead
      : !candidate.usage.skillRead && !baseline.usage.skillRead,
    baselineTokens: baseline.usage.total, nixskillTokens: candidate.usage.total,
    changePercent: (candidate.usage.total / baseline.usage.total - 1) * 100 }));
  const baselineTotal = results['baseline-1'].usage.total + results['baseline-2'].usage.total;
  const nixskillTotal = results['nixskill-1'].usage.total + results['nixskill-2'].usage.total;
  const validQuality = comparisons.every((pair) => pair.validQuality);
  const validActivation = comparisons.every((pair) => pair.validActivation);
  const summary = { protocol: manifest.protocol, caseId: manifest.caseId,
    validQuality, validActivation, comparisons,
    baselineTotal, nixskillTotal,
    combinedChangePercent: manifest.shouldTrigger && validQuality && validActivation
      ? (nixskillTotal / baselineTotal - 1) * 100 : null,
    caveat: 'Descriptive pilot only. Confirm skill activation and Langfuse usage before attributing any token change.' };
  json(join(runDir, 'report.json'), summary);
  console.log(JSON.stringify(summary, null, 2));
}

function disable(path) {
  const { runDir } = readRun(path);
  for (const arm of ['baseline', 'nixskill']) json(join(project(arm), '.codex', 'langfuse.json'), { enabled: false });
  console.log(`Tracing disabled in both lab projects. Run data: ${runDir}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [action, ...args] = process.argv.slice(2);
  try {
    if (action === 'init' && args.length === 0) init();
    else if (action === 'sync-skill' && args.length === 0) syncSkill();
    else if (action === 'prepare' && args.length === 2 && args[0] === '--case') prepare(args[1]);
    else if (action === 'stage' && args.length === 1) stage(args[0]);
    else if (action === 'capture' && args.length === 3 && args[1] === '--thread') capture(args[0], args[2]);
    else if (action === 'report' && args.length === 1) report(args[0]);
    else if (action === 'disable' && args.length === 1) disable(args[0]);
    else throw new Error('Usage: stable.mjs init | sync-skill | prepare --case revenue|transfer|message | stage <run-dir> | capture <run-dir> --thread <id> | report <run-dir> | disable <run-dir>');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
