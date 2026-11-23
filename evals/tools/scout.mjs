#!/usr/bin/env node
// One bounded read for a small code area; search hints for larger areas.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

const root = resolve(process.argv[2] || '.');
const terms = process.argv.slice(3).map((term) => term.toLowerCase()).filter(Boolean);
const ignoredDirs = new Set(['.git', '.next', 'build', 'coverage', 'dist', 'node_modules']);
const sourceExtensions = new Set(['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.json']);
const maxFiles = 2_000;
const maxSmallFiles = 12;
const maxSmallBytes = 24_000;
const maxLargeOutput = 16_000;
const paths = [];

function wanted(name) {
  if (name === 'AGENTS.md' || name === 'package.json') return true;
  if (/^(package-lock|yarn\.lock|pnpm-lock|bun\.lock)/.test(name)) return false;
  return sourceExtensions.has(extname(name)) && !name.endsWith('.min.js');
}

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) walk(full);
    } else if (entry.isFile() && wanted(entry.name)) {
      paths.push(full);
      if (paths.length > maxFiles) throw new Error('Too many files; use a narrower root');
    }
  }
}

try {
  if (!statSync(root).isDirectory()) throw new Error('Root must be a directory');
  walk(root);
  paths.sort((a, b) => a.localeCompare(b));
  const small = paths.length <= maxSmallFiles &&
    paths.reduce((sum, file) => sum + statSync(file).size, 0) <= maxSmallBytes;
  console.log(`SCOUT ${relative(process.cwd(), root) || '.'}: ${paths.length} files; mode=${small ? 'full' : 'search'}`);

  if (small) {
    for (const file of paths) {
      console.log(`\n### ${relative(root, file).replaceAll('\\', '/')}`);
      console.log(readFileSync(file, 'utf8'));
    }
  } else {
    if (terms.length === 0) throw new Error('Large area: pass search terms or use a narrower root');
    const hits = [];
    for (const file of paths) {
      if (statSync(file).size > 128_000) continue;
      const name = relative(root, file).replaceAll('\\', '/');
      const lines = readFileSync(file, 'utf8').split(/\r?\n/);
      const matching = [];
      for (let i = 0; i < lines.length && matching.length < 8; i++) {
        if (terms.some((term) => lines[i].toLowerCase().includes(term))) {
          matching.push(`${i + 1}: ${lines[i].slice(0, 240)}`);
        }
      }
      const nameMatches = terms.filter((term) => name.toLowerCase().includes(term)).length;
      if (nameMatches || matching.length || name.endsWith('AGENTS.md')) {
        hits.push({ name, score: nameMatches * 5 + matching.length, matching });
      }
    }
    hits.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
    let used = 0;
    for (const hit of hits) {
      const block = `\n### ${hit.name}\n${hit.matching.join('\n')}\n`;
      if (used + block.length > maxLargeOutput) break;
      process.stdout.write(block);
      used += block.length;
    }
    console.log(`\nShown ${used} characters of matches; read only needed full files next.`);
  }
} catch (error) {
  console.error(`scout: ${error.message}`);
  process.exitCode = 1;
}
