import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const scout = join(dirname(fileURLToPath(import.meta.url)), '..', 'skills', 'nixskill', 'scripts', 'scout.mjs');

test('scout reads a small area once and bounds a larger search', () => {
  const root = mkdtempSync(join(tmpdir(), 'nixskill-scout-'));
  try {
    mkdirSync(join(root, 'src'));
    writeFileSync(join(root, 'package.json'), '{"name":"sample"}\n');
    writeFileSync(join(root, 'src', 'revenue.js'), 'export const revenue = 42;\n');
    let run = spawnSync(process.execPath, [scout, root, 'revenue'], { encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
    assert.match(run.stdout, /mode=full/);
    assert.match(run.stdout, /export const revenue = 42/);

    for (let i = 0; i < 12; i++) writeFileSync(join(root, 'src', `other${i}.js`), `export const other${i} = ${i};\n`);
    run = spawnSync(process.execPath, [scout, root, 'revenue'], { encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
    assert.match(run.stdout, /mode=search/);
    assert.match(run.stdout, /src\/revenue\.js/);
    assert.doesNotMatch(run.stdout, /export const other0/);
    assert.ok(run.stdout.length < 17_000);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
