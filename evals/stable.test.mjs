import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { firstTurnUsage } from './stable.mjs';

const evalDir = dirname(fileURLToPath(import.meta.url));
const stable = join(evalDir, 'stable.mjs');

function cli(env, ...args) {
  const result = spawnSync(process.execPath, [stable, ...args], { env, encoding: 'utf8', timeout: 30000 });
  assert.equal(result.status, 0, `${args.join(' ')}: ${result.stderr}\n${result.stdout}`);
  return result.stdout;
}

function fakeSession(codexHome, threadId, cwd, prompt, tokens, delegatedPrompt = false) {
  const entries = [
    { type: 'session_meta', payload: { cwd, timestamp: new Date().toISOString() } },
    { type: 'event_msg', payload: { type: 'task_started', turn_id: threadId } },
    delegatedPrompt
      ? { type: 'response_item', payload: { type: 'function_call_output', name: 'create_thread', output: `<input>${prompt}</input>` } }
      : { type: 'response_item', payload: { type: 'message', role: 'user', content: [{ text: prompt }] } },
    { type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: {
      input_tokens: tokens - 1, cached_input_tokens: 0, output_tokens: 1,
      reasoning_output_tokens: 0, total_tokens: tokens } } } },
    { type: 'event_msg', payload: { type: 'task_complete', turn_id: threadId } },
    { type: 'event_msg', payload: { type: 'task_started', turn_id: 'ffffffff-ffff-ffff-ffff-ffffffffffff' } },
    { type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: {
      input_tokens: tokens + 99, cached_input_tokens: 0, output_tokens: 2,
      total_tokens: tokens + 101 } } } },
  ];
  const path = join(codexHome, 'sessions', `rollout-${threadId}.jsonl`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, entries.map((entry) => JSON.stringify(entry)).join('\n') + '\n');
  return path;
}

test('the stable lab reuses two projects and snapshots all four slots before reuse', () => {
  const temp = mkdtempSync(join(tmpdir(), 'nixskill-stable-test-'));
  const dataDir = join(temp, 'data');
  const codexHome = join(temp, 'codex-home');
  const env = { ...process.env, NIXSKILL_DATA_DIR: dataDir, CODEX_HOME: codexHome,
    TRACE_TO_LANGFUSE: 'false' };
  try {
    const output = cli(env, 'prepare', '--case', 'message');
    const runDir = output.match(/Run directory: (.+)/)?.[1]?.trim();
    assert.ok(runDir, output);
    const manifest = JSON.parse(readFileSync(join(runDir, 'manifest.json'), 'utf8'));
    assert.equal(manifest.protocol, 'stable-v2');
    assert.match(manifest.prompt, /Root Git diff\/status cannot verify those edits/);
    assert.equal(existsSync(join(dataDir, 'lab', 'baseline', '.agents', 'skills', 'nixskill')), false);
    assert.equal(existsSync(join(dataDir, 'lab', 'nixskill', '.agents', 'skills', 'nixskill', 'SKILL.md')), true);

    for (let i = 0; i < 4; i++) {
      const label = manifest.order[i];
      const arm = label.startsWith('nixskill') ? 'nixskill' : 'baseline';
      const project = join(dataDir, 'lab', arm);
      const active = join(project, 'work', 'active');
      assert.equal(existsSync(active), true);
      const source = join(active, 'src', 'message.js');
      writeFileSync(source, readFileSync(source, 'utf8').replace('Pendng', 'Pending'));
      const threadId = `00000000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`;
      const session = fakeSession(codexHome, threadId, project, manifest.prompt, 100 + i, i === 1);
      assert.equal(firstTurnUsage(session, manifest.prompt).total, 100 + i);
      cli(env, 'capture', runDir, '--thread', threadId);
      assert.equal(existsSync(active), false);
      assert.equal(existsSync(join(runDir, label, 'src', 'message.js')), true);
      const captured = JSON.parse(readFileSync(join(runDir, `${label}.json`), 'utf8'));
      assert.equal(captured.pass, true);
      assert.deepEqual(captured.changedFiles, ['src/message.js']);
      if (i < 3) cli(env, 'stage', runDir);
    }
    cli(env, 'report', runDir);
    const report = JSON.parse(readFileSync(join(runDir, 'report.json'), 'utf8'));
    assert.equal(report.validQuality, true);
    assert.equal(report.validActivation, true);
    assert.equal(report.combinedChangePercent, null);
    cli(env, 'disable', runDir);
    for (const arm of ['baseline', 'nixskill']) {
      assert.deepEqual(JSON.parse(readFileSync(join(dataDir, 'lab', arm, '.codex', 'langfuse.json'))), { enabled: false });
    }
    const candidateRoot = join(dataDir, 'lab', 'nixskill');
    const candidateSkill = join(candidateRoot, '.agents', 'skills', 'nixskill', 'SKILL.md');
    const candidateScout = join(candidateRoot, '.agents', 'skills', 'nixskill', 'scripts', 'scout.mjs');
    const obsolete = join(candidateRoot, '.agents', 'skills', 'nixskill', 'obsolete.txt');
    writeFileSync(candidateSkill, 'outdated skill\n');
    rmSync(candidateScout);
    writeFileSync(obsolete, 'legacy file\n');
    assert.equal(spawnSync('git', ['-C', candidateRoot, 'add', '.agents/skills/nixskill'], { encoding: 'utf8' }).status, 0);
    assert.equal(spawnSync('git', ['-C', candidateRoot, '-c', 'user.name=Nixskill Benchmark',
      '-c', 'user.email=benchmark@example.invalid', 'commit', '-qm', 'Simulate previous skill version'],
    { encoding: 'utf8' }).status, 0);
    manifest.protocol = 'stable-v1';
    writeFileSync(join(runDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
    cli(env, 'report', runDir);
    assert.equal(JSON.parse(readFileSync(join(runDir, 'report.json'), 'utf8')).protocol, 'stable-v1');
    assert.match(cli(env, 'sync-skill'), /updated/);
    assert.equal(readFileSync(candidateSkill, 'utf8'),
      readFileSync(join(evalDir, '..', 'skills', 'nixskill', 'SKILL.md'), 'utf8'));
    assert.equal(readFileSync(candidateScout, 'utf8'),
      readFileSync(join(evalDir, '..', 'skills', 'nixskill', 'scripts', 'scout.mjs'), 'utf8'));
    assert.equal(existsSync(obsolete), false);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
