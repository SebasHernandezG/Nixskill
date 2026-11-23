import assert from 'node:assert/strict';
import test from 'node:test';
import { transfer } from '../src/transfer.js';

test('transfers cents without mutating input', () => {
  const balances = { alice: 500, bob: 100 };
  assert.deepEqual(transfer(balances, 'alice', 'bob', 200), { alice: 300, bob: 300 });
  assert.deepEqual(balances, { alice: 500, bob: 100 });
});

test('rejects insufficient funds', () => {
  assert.throws(() => transfer({ alice: 100, bob: 0 }, 'alice', 'bob', 101));
});
