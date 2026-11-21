import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const evalDir = dirname(fileURLToPath(import.meta.url));
const repoDir = dirname(evalDir);
const manualRoot = process.platform === 'win32' && process.env.LOCALAPPDATA
  ? join(process.env.LOCALAPPDATA, 'Nixskill', 'manual-runs')
  : join(homedir(), '.local', 'share', 'nixskill', 'manual-runs');
const cases = JSON.parse(readFileSync(join(evalDir, 'cases.json'), 'utf8'));
const pluginConfig = '[features]\nhooks = true\n\n[plugins."tracing@codex-observability-plugin"]\nenabled = true\n';

function command(program, args, cwd) {
  const result = spawnSync(program, args, { cwd, encoding: 'utf8', timeout: 30000, windowsHide: true });
  if (result.error || result.status !== 0) throw new Error(`${program} failed: ${result.error?.message || result.stderr}`);
  return result.stdout.trim();
}

function hashTree(path, newline = null) {
  const hash = createHash('sha256');
  function walk(dir, prefix = '') {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const relative = `${prefix}${entry.name}`;
      if (entry.isDirectory()) walk(join(dir, entry.name), `${relative}/`);
      else if (entry.isFile()) {
        hash.update(relative);
        hash.update('\0');
        const bytes = readFileSync(join(dir, entry.name));
        hash.update(newline === null ? bytes : Buffer.from(bytes.toString('utf8').replace(/\r\n|\n/g, newline)));
        hash.update('\0');
      } else throw new Error(`Unsupported fixture entry: ${relative}`);
    }
  }
  walk(path);
  return hash.digest('hex');
}

function checkGlobalSkill() {
  const codexHome = process.env.CODEX_HOME || join(homedir(), '.codex');
  const paths = [
    join(codexHome, 'skills', 'nixskill', 'SKILL.md'),
    join(homedir(), '.agents', 'skills', 'nixskill', 'SKILL.md'),
  ];
  const found = paths.filter(existsSync);
  if (found.length) throw new Error(`Global Nixskill installation contaminates baseline: ${found.join(', ')}`);
}

function addTracing(workspace) {
  const configDir = join(workspace, '.codex');
  mkdirSync(configDir, { recursive: true });
  writeFileSync(join(configDir, 'config.toml'), pluginConfig);
  writeFileSync(join(configDir, 'langfuse.json'), JSON.stringify({ enabled: true }, null, 2) + '\n');
}

function initGit(workspace) {
  command('git', ['init', '-q'], workspace);
  command('git', ['add', '.'], workspace);
  command('git', ['-c', 'user.name=Nixskill Benchmark', '-c', 'user.email=benchmark@example.invalid', 'commit', '-qm', 'Initial synthetic fixture'], workspace);
  return command('git', ['rev-parse', 'HEAD'], workspace);
}

function prepare() {
  checkGlobalSkill();
  if (String(process.env.TRACE_TO_LANGFUSE || '').toLowerCase() === 'true') {
    throw new Error('TRACE_TO_LANGFUSE=true enables tracing outside this pilot; use project-scoped configuration only.');
  }
  mkdirSync(manualRoot, { recursive: true });
  const runDir = mkdtempSync(join(manualRoot, 'manual-'));
  const smoke = join(runDir, 'smoke');
  mkdirSync(join(smoke, 'test'), { recursive: true });
  writeFileSync(join(smoke, 'README.md'), '# Synthetic smoke test\nNIXSKILL_SMOKE_SOURCE_OK\n');
  writeFileSync(join(smoke, 'package.json'), '{"private":true,"type":"module","scripts":{"test":"node --test"}}\n');
  writeFileSync(join(smoke, 'test', 'smoke.test.js'), "import assert from 'node:assert/strict';\nimport test from 'node:test';\ntest('smoke', () => assert.equal(1 + 1, 2));\n");
  addTracing(smoke);
  initGit(smoke);

  const testCase = cases.find((item) => item.id === 'revenue');
  const order = ['baseline-1', 'nixskill-1', 'nixskill-2', 'baseline-2'];
  const workspaces = {};
  const initialCommits = {};
  for (const label of order) {
    const workspace = join(runDir, label);
    cpSync(join(evalDir, 'cases', testCase.id, 'fixture'), workspace, { recursive: true });
    addTracing(workspace);
    if (label.startsWith('nixskill')) {
      cpSync(join(repoDir, 'skills', 'nixskill'), join(workspace, '.agents', 'skills', 'nixskill'), { recursive: true });
    }
    initialCommits[label] = initGit(workspace);
    workspaces[label] = workspace;
  }
  const manifest = {
    createdAt: new Date().toISOString(), runDir,
    repoRevision: command('git', ['rev-parse', 'HEAD'], repoDir),
    repoDirty: Boolean(command('git', ['status', '--porcelain'], repoDir)),
    runnerSha256: createHash('sha256').update(readFileSync(join(evalDir, 'manual.mjs'))).digest('hex'),
    caseId: testCase.id, prompt: testCase.prompt, model: 'gpt-6.1-sol', effort: 'medium',
    caseSourceSha256: hashTree(join(evalDir, 'cases', testCase.id)),
    skillSha256: createHash('sha256').update(readFileSync(join(repoDir, 'skills', 'nixskill', 'SKILL.md'))).digest('hex'),
    skillTreeSha256: hashTree(join(repoDir, 'skills', 'nixskill')),
    smoke,
    smokePrompt: 'Use a shell command to read README.md, run node --test, and reply NIXSKILL_SMOKE_OK if the test passes.',
    flushPrompt: 'Reply exactly NIXSKILL_TELEMETRY_FLUSH.',
    order, workspaces, initialCommits,
    note: 'Use a fresh Codex Desktop chat per workspace. Record the same model, effort, and permissions for all four task chats. Only synthetic workspaces enable Langfuse; the global config stays off.',
  };
  writeFileSync(join(runDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(runDir);
}

function readManifest(runDir) {
  const root = resolve(manualRoot);
  if (!resolve(runDir).startsWith(root + sep)) {
    throw new Error('Manual run must be inside the Nixskill manual-runs directory');
  }
  return JSON.parse(readFileSync(join(runDir, 'manifest.json'), 'utf8'));
}

function verify(runDir) {
  const manifest = readManifest(runDir);
  const casePath = join(evalDir, 'cases', manifest.caseId);
  const sourceHashes = [hashTree(casePath), hashTree(casePath, '\n'), hashTree(casePath, '\r\n')];
  if (!sourceHashes.includes(manifest.caseSourceSha256)) {
    throw new Error('Case source changed since preparation; use the original check before interpreting results');
  }
  const results = {};
  for (const label of manifest.order) {
    const workspace = manifest.workspaces[label];
    if (!resolve(workspace).startsWith(resolve(runDir) + sep)) throw new Error(`Workspace outside manual run: ${label}`);
    const visible = spawnSync('node', ['--test'], { cwd: workspace, encoding: 'utf8', timeout: 30000, windowsHide: true });
    const hidden = spawnSync('node', [join(evalDir, 'cases', manifest.caseId, 'check.mjs'), workspace], {
      cwd: workspace, encoding: 'utf8', timeout: 30000, windowsHide: true,
    });
    const skillPath = join(workspace, '.agents', 'skills', 'nixskill');
    const skillSetupValid = label.startsWith('nixskill')
      ? existsSync(skillPath) && hashTree(skillPath) === manifest.skillTreeSha256
      : !existsSync(skillPath);
    const infrastructureError = visible.error?.message || visible.signal || hidden.error?.message || hidden.signal || null;
    const initialCommit = manifest.initialCommits[label];
    const trackedChanges = command('git', ['diff', '--name-only', initialCommit], workspace).split(/\r?\n/).filter(Boolean);
    const untrackedChanges = command('git', ['ls-files', '--others', '--exclude-standard'], workspace).split(/\r?\n/).filter(Boolean);
    results[label] = {
      visiblePass: visible.status === 0, hiddenPass: hidden.status === 0,
      infrastructureError, skillSetupValid,
      pass: !infrastructureError && visible.status === 0 && hidden.status === 0 && skillSetupValid,
      changedFiles: [...new Set([...trackedChanges, ...untrackedChanges])],
      commitsAfterFixture: command('git', ['log', '--format=%h %s', `${initialCommit}..HEAD`], workspace).split(/\r?\n/).filter(Boolean),
      workingTreeStatus: command('git', ['status', '--short'], workspace).split(/\r?\n/).filter(Boolean),
      visibleError: visible.status === 0 ? null : (visible.error?.message || visible.stderr || visible.stdout).slice(0, 800),
      hiddenError: hidden.status === 0 ? null : (hidden.error?.message || hidden.stderr || hidden.stdout).slice(0, 800),
    };
  }
  writeFileSync(join(runDir, 'verification.json'), JSON.stringify(results, null, 2) + '\n');
  for (const [label, result] of Object.entries(results)) {
    console.log(`${label}: ${result.infrastructureError ? 'INVALID INFRASTRUCTURE' : result.pass ? 'PASS' : 'FAIL'} visible=${result.visiblePass ? 'PASS' : 'FAIL'} hidden=${result.hiddenPass ? 'PASS' : 'FAIL'} skill=${result.skillSetupValid ? 'OK' : 'INVALID'} files=${result.changedFiles.join(', ') || 'none'}`);
  }
  if (Object.values(results).some((result) => !result.pass)) process.exitCode = 1;
}

function disable(runDir) {
  const manifest = readManifest(runDir);
  for (const workspace of [manifest.smoke, ...manifest.order.map((label) => manifest.workspaces[label])]) {
    if (!resolve(workspace).startsWith(resolve(runDir) + sep)) throw new Error(`Workspace outside manual run: ${workspace}`);
    writeFileSync(join(workspace, '.codex', 'langfuse.json'), JSON.stringify({ enabled: false }, null, 2) + '\n');
  }
  console.log('Project Langfuse config files set to disabled. Environment variables can override them; verify TRACE_TO_LANGFUSE is not true.');
}

const [action, path] = process.argv.slice(2);
if (action === 'prepare' && !path) prepare();
else if (action === 'verify' && path) verify(resolve(path));
else if (action === 'disable' && path) disable(resolve(path));
else {
  console.error('Usage: node evals/manual.mjs prepare | verify <manual-run-directory> | disable <manual-run-directory>');
  process.exitCode = 2;
}
