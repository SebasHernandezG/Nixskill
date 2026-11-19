import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const workdir = process.argv[2];
const { statusLabel } = await import(pathToFileURL(resolve(workdir, 'src/message.js')));
assert.equal(statusLabel(), 'Pending');
