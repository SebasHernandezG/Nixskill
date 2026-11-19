import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { traceStats } from './benchmark.mjs';

const evalDir = dirname(fileURLToPath(import.meta.url));
const resultsDir = join(evalDir, 'results');

function render(results, cases = [{ id: 'case', shouldTrigger: true }], repeats = 1) {
  mkdirSync(resultsDir, { recursive: true });
  const workdir = mkdtempSync(join(resultsDir, 'report-test-'));
  try {
    writeFileSync(join(workdir, 'results.json'), JSON.stringify({
      model: 'test-model', effort: 'medium', codexVersion: 'test-cli',
      cases, repeats, results,
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

function row(variant, status, tokens, skillRead = false, caseId = 'case', repeat = 1) {
  return {
    name: `${caseId}-${variant}-${repeat}`, caseId, repeat, variant, status,
    pass: status === 'pass', codex: { seconds: 1 },
    trace: { total: tokens, input: tokens, output: 0, cached: 0, commands: 1, skillRead },
  };
}

test('infrastructure failures never produce a token savings claim', () => {
  const html = render([row('baseline', 'infrastructure_error', 50000)]);
  assert.match(html, /Inconclusive: 0\/1 measured pairs/);
  assert.match(html, /INVALID/);
  assert.doesNotMatch(html, /Median paired token change/);
});

test('only a successful pair with skill evidence produces a descriptive pilot', () => {
  const noSkillRead = render([row('baseline', 'pass', 100), row('nixskill', 'pass', 80)]);
  assert.match(noSkillRead, /Inconclusive/);
  const failedCandidate = render([row('baseline', 'pass', 100), row('nixskill', 'fail', 80, true)]);
  assert.match(failedCandidate, /Inconclusive/);
  const valid = render([row('baseline', 'pass', 100), row('nixskill', 'pass', 80, true)]);
  assert.match(valid, /Descriptive pilot: median paired token change <strong>-20\.0%<\/strong>/);
  assert.doesNotMatch(valid, /Observed median paired token change/);
});

test('balanced measured pairs require passing negative controls', () => {
  const measured = [1, 2].flatMap((repeat) => [
    row('baseline', 'pass', 100, false, 'case', repeat),
    row('nixskill', 'pass', 80, true, 'case', repeat),
  ]);
  const control = [1, 2].flatMap((repeat) => [
    row('baseline', 'pass', 100, false, 'control', repeat),
    row('nixskill', 'pass', 100, false, 'control', repeat),
  ]);
  const selected = [{ id: 'case', shouldTrigger: true }, { id: 'control', shouldTrigger: false }];
  const valid = render([...measured, ...control], selected, 2);
  assert.match(valid, /Observed median paired token change: <strong>-20\.0%<\/strong>/);
  assert.match(valid, /2\/2 negative controls/);
  const activatedControl = [...control];
  activatedControl[1] = row('nixskill', 'pass', 100, true, 'control', 1);
  const invalid = render([...measured, ...activatedControl], selected, 2);
  assert.match(invalid, /Inconclusive/);
  assert.match(invalid, /1\/2 negative controls/);
  assert.doesNotMatch(invalid, /Observed median paired token change/);
});

test('an even-repeat single-case run stays descriptive without a negative control', () => {
  const measured = [1, 2].flatMap((repeat) => [
    row('baseline', 'pass', 100, false, 'case', repeat),
    row('nixskill', 'pass', 80, true, 'case', repeat),
  ]);
  const html = render(measured, [{ id: 'case', shouldTrigger: true }], 2);
  assert.match(html, /Descriptive pilot/);
  assert.doesNotMatch(html, /Observed median paired token change/);
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

test('mixed turn usage is incomplete rather than a partial token total', () => {
  mkdirSync(resultsDir, { recursive: true });
  const workdir = mkdtempSync(join(resultsDir, 'trace-test-'));
  try {
    const tracePath = join(workdir, 'trace.jsonl');
    writeFileSync(tracePath, [
      JSON.stringify({ type: 'turn.completed', usage: { input_tokens: 100, output_tokens: 20, total_tokens: 120 } }),
      JSON.stringify({ type: 'turn.completed', usage: null }),
    ].join('\n'));
    const stats = traceStats(tracePath);
    assert.equal(stats.turns, 2);
    assert.equal(stats.total, null);
    assert.equal(stats.input, null);
  } finally {
    const target = resolve(workdir);
    if (!target.startsWith(resolve(resultsDir) + sep)) throw new Error('Unsafe cleanup path');
    rmSync(target, { recursive: true, force: true });
  }
});

test('skill read requires a successful command returning skill content', () => {
  mkdirSync(resultsDir, { recursive: true });
  const workdir = mkdtempSync(join(resultsDir, 'trace-test-'));
  try {
    const tracePath = join(workdir, 'trace.jsonl');
    const command = 'Get-Content .agents/skills/nixskill/SKILL.md';
    const event = (exit_code, aggregated_output) => JSON.stringify({
      type: 'item.completed', item: { type: 'command_execution', command, exit_code, aggregated_output },
    });
    writeFileSync(tracePath, `${event(1, 'Use a small, evidence-led working set.')}\n`);
    assert.equal(traceStats(tracePath).skillRead, false);
    writeFileSync(tracePath, `${event(0, '.agents/skills/nixskill/SKILL.md')}\n`);
    assert.equal(traceStats(tracePath).skillRead, false);
    writeFileSync(tracePath, `${event(0, 'Use a small, evidence-led working set.')}\n`);
    assert.equal(traceStats(tracePath).skillRead, true);
  } finally {
    const target = resolve(workdir);
    if (!target.startsWith(resolve(resultsDir) + sep)) throw new Error('Unsafe cleanup path');
    rmSync(target, { recursive: true, force: true });
  }
});
