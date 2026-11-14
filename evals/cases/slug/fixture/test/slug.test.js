import assert from 'node:assert/strict';
import test from 'node:test';
import { slugify } from '../src/slug.js';

test('collapses whitespace and punctuation', () => {
  assert.equal(slugify('  Hello,   World!!  '), 'hello-world');
});

test('keeps Unicode letters', () => {
  assert.equal(slugify('Café y té'), 'café-y-té');
});
