import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const workdir = process.argv[2];
const { slugify } = await import(pathToFileURL(resolve(workdir, 'src/slug.js')));
assert.equal(slugify(' --Alpha...Beta__42-- '), 'alpha-beta-42');
assert.equal(slugify('日本語 2026'), '日本語-2026');
assert.equal(slugify(' \t !!! '), '');
assert.equal(slugify('A\n\tB'), 'a-b');
