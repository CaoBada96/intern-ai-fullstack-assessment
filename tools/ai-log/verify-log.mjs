#!/usr/bin/env node
// Verify schema, seq continuity, chronological order and the hash chain of prompt logs.
// Usage: node tools/ai-log/verify-log.mjs [file ...]   (default: ai-logs/prompts.jsonl + ai-logs/imported/*.jsonl)
import fs from 'node:fs';
import path from 'node:path';
import { GENESIS_HASH, computeHash, findRepoRoot } from './lib.mjs';

const REQUIRED = ['v', 'ts', 'seq', 'tool', 'capture_method', 'task', 'kind', 'prompt', 'prompt_chars', 'redactions', 'prev_hash', 'hash'];
const CAPTURE = ['hook', 'wrapper', 'import'];

export function verifyFile(file) {
  const problems = [];
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  let prev = null;
  const entries = [];
  lines.forEach((line, i) => {
    const n = i + 1;
    let e;
    try {
      e = JSON.parse(line);
    } catch {
      problems.push(`line ${n}: invalid JSON`);
      return;
    }
    for (const k of REQUIRED) if (!(k in e)) problems.push(`line ${n}: missing field "${k}"`);
    if (e.capture_method && !CAPTURE.includes(e.capture_method)) problems.push(`line ${n}: unknown capture_method "${e.capture_method}"`);
    if (Number.isNaN(Date.parse(e.ts))) problems.push(`line ${n}: ts is not ISO 8601`);
    const expectedSeq = prev ? prev.seq + 1 : 1;
    if (e.seq !== expectedSeq) problems.push(`line ${n}: seq ${e.seq}, expected ${expectedSeq}`);
    const expectedPrev = prev ? prev.hash : GENESIS_HASH;
    if (e.prev_hash !== expectedPrev) problems.push(`line ${n}: prev_hash does not match previous entry (chain broken)`);
    const { hash, ...rest } = e;
    if (computeHash(e.prev_hash, rest) !== hash) problems.push(`line ${n}: hash mismatch (entry modified)`);
    if (prev && Date.parse(e.ts) < Date.parse(prev.ts)) problems.push(`line ${n}: timestamp earlier than previous entry`);
    prev = e;
    entries.push(e);
  });
  return { file, entries, problems };
}

function defaultFiles(root) {
  const files = [path.join(root, 'ai-logs', 'prompts.jsonl')];
  const imp = path.join(root, 'ai-logs', 'imported');
  if (fs.existsSync(imp)) for (const f of fs.readdirSync(imp)) if (f.endsWith('.jsonl')) files.push(path.join(imp, f));
  return files.filter((f) => fs.existsSync(f));
}

function summarize(entries) {
  const byTask = {};
  for (const e of entries) byTask[e.task] = (byTask[e.task] || 0) + 1;
  return Object.entries(byTask)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([t, c]) => `${t}=${c}`)
    .join('  ');
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('verify-log.mjs')) {
  const root = findRepoRoot(process.cwd());
  const files = process.argv.slice(2).length ? process.argv.slice(2) : defaultFiles(root);
  if (!files.length) {
    console.error('No log files found (expected ai-logs/prompts.jsonl).');
    process.exit(1);
  }
  let failed = false;
  for (const f of files) {
    const { entries, problems } = verifyFile(f);
    const rel = path.relative(root, f) || f;
    if (problems.length) {
      failed = true;
      console.log(`✗ ${rel}: ${entries.length} entries, ${problems.length} problem(s)`);
      for (const p of problems.slice(0, 20)) console.log(`   - ${p}`);
    } else {
      console.log(`✓ ${rel}: ${entries.length} entries, chain OK`);
    }
    if (entries.length) console.log(`   by task: ${summarize(entries)}`);
  }
  process.exit(failed ? 1 : 0);
}
