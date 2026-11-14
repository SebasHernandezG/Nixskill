import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { traceStats } from './benchmark.mjs';

const evalDir = dirname(fileURLToPath(import.meta.url));
const resultsDir = join(evalDir, 'results');

function render(results) {
  mkdirSync(resultsDir, { recursive: true });
  const workdir = mkdtempSync(join(resultsDir, 'report-test-'));
  try {
    writeFileSync(join(workdir, 'results.json'), JSON.stringify({
      model: 'test-model', effort: 'medium', codexVersion: 'test-cli',
      cases: [{ id: 'case' }], repeats: 1, results,
    }));
    const result = spawnSync('node', [join(evalDir, 'benchmark.mjs'), 'report', workdir], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    return readFileSync(join(workdir, 'report.html'), 'utf8');
  } finally {
    const target = resolve(workdir);
    if (!target.startsWith(resolve(resultsDir) + sep)) throw new Error('Unsafe cleanup path');
    rmSync(target, { recursive: true, force: true });
  }
}

function row(variant, status, tokens, skillRead = false) {
  return {
    name: `case-${variant}-1`, caseId: 'case', repeat: 1, variant, status,
    pass: status === 'pass', codex: { seconds: 1 },
    trace: { total: tokens, input: tokens, output: 0, cached: 0, commands: 1, skillRead },
  };
}

test('infrastructure failures never produce a token savings claim', () => {
  const html = render([row('baseline', 'infrastructure_error', 50000)]);
  assert.match(html, /Inconclusive: 0\/1 matched pairs/);
  assert.match(html, /INVALID/);
  assert.doesNotMatch(html, /Median paired token change/);
});

test('only a successful pair with skill evidence produces a comparison', () => {
  const noSkillRead = render([row('baseline', 'pass', 100), row('nixskill', 'pass', 80)]);
  assert.match(noSkillRead, /Inconclusive/);
  const failedCandidate = render([row('baseline', 'pass', 100), row('nixskill', 'fail', 80, true)]);
  assert.match(failedCandidate, /Inconclusive/);
  const valid = render([row('baseline', 'pass', 100), row('nixskill', 'pass', 80, true)]);
  assert.match(valid, /Median paired token change: <strong>-20\.0%<\/strong>/);
});

test('a completed turn without usage remains valid but has unknown tokens', () => {
  mkdirSync(resultsDir, { recursive: true });
  const workdir = mkdtempSync(join(resultsDir, 'trace-test-'));
  try {
    const tracePath = join(workdir, 'trace.jsonl');
    writeFileSync(tracePath, '{"type":"turn.completed","usage":null}\n');
    const stats = traceStats(tracePath);
    assert.equal(stats.turns, 1);
    assert.equal(stats.total, null);
  } finally {
    const target = resolve(workdir);
    if (!target.startsWith(resolve(resultsDir) + sep)) throw new Error('Unsafe cleanup path');
    rmSync(target, { recursive: true, force: true });
  }
});
