import assert from 'node:assert/strict';
import test from 'node:test';
import { statusLabel } from '../src/message.js';

test('shows the correct status label', () => {
  assert.equal(statusLabel(), 'Pending');
});
