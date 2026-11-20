import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const workdir = process.argv[2];
const { transfer } = await import(pathToFileURL(resolve(workdir, 'src/transfer.js')));
const original = Object.freeze({ alice: 500, bob: 100 });
assert.deepEqual(transfer(original, 'alice', 'bob', 200), { alice: 300, bob: 300 });
assert.deepEqual(original, { alice: 500, bob: 100 });
for (const [from, to, amount] of [
  ['alice', 'bob', 0], ['alice', 'bob', 1.5], ['alice', 'bob', -1],
  ['alice', 'bob', 501], ['missing', 'bob', 1], ['alice', 'missing', 1],
  ['alice', 'alice', 1],
]) {
  assert.throws(() => transfer(original, from, to, amount));
  assert.deepEqual(original, { alice: 500, bob: 100 });
}
