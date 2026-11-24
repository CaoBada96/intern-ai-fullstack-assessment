#!/usr/bin/env node
// Import prompts from a tool's own session history into ai-logs/imported/<tool>.jsonl (capture_method = "import").
// Use for tools without a pre-submit prompt hook. Only entries newer than the last imported one are appended.
//
// Usage:
//   node tools/ai-log/import-history.mjs --tool codex-cli --format codex --file ~/.codex/history.jsonl --since 2026-12-01T09:00:00+07:00
//   node tools/ai-log/import-history.mjs --tool aider --format jsonl --file history.jsonl --map ts=time,prompt=content,session=chat
//
// Formats:
//   codex : JSONL lines { session_id, ts (unix seconds), text }
//   jsonl : generic JSONL; map fields with --map ts=<field>,prompt=<field>[,session=<field>][,cwd=<field>]
//
// Limitation: history files may contain prompts from other projects. If the source has a cwd field it is filtered
// to this repo; otherwise you MUST bound the import with --since (and --until) and say so in AI_USAGE.md.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { redact } from './redact.mjs';
import { appendEntry, deriveTask, findRepoRoot, gitInfo, isoNow, parseArgs, readLastEntry } from './lib.mjs';

const args = parseArgs(process.argv.slice(2));
if (!args.tool || !args.file) {
  console.error('Required: --tool <name> --file <history file> [--format codex|jsonl] [--since ISO] [--until ISO]');
  process.exit(2);
}
const root = findRepoRoot(process.cwd());
const src = String(args.file).replace(/^~(?=\/|$)/, os.homedir());
const format = args.format || 'jsonl';
const map = Object.fromEntries(
  String(args.map || 'ts=ts,prompt=text,session=session_id,cwd=cwd')
    .split(',')
    .map((kv) => kv.split('=')),
);

function toDate(v) {
  if (v == null) return null;
  if (typeof v === 'number') return new Date(v < 1e12 ? v * 1000 : v);
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

const rows = fs
  .readFileSync(src, 'utf8')
  .split('\n')
  .filter((l) => l.trim())
  .map((l) => {
    try {
      return JSON.parse(l);
    } catch {
      return null;
    }
  })
  .filter(Boolean)
  .map((r) =>
    format === 'codex'
      ? { date: toDate(r.ts), prompt: r.text, session: r.session_id, cwd: r.cwd ?? null }
      : { date: toDate(r[map.ts]), prompt: r[map.prompt], session: r[map.session] ?? null, cwd: map.cwd ? r[map.cwd] ?? null : null },
  )
  .filter((r) => r.date && typeof r.prompt === 'string' && r.prompt.trim())
  .sort((a, b) => a.date - b.date);

const out = path.join(root, 'ai-logs', 'imported', `${args.tool}.jsonl`);
const last = readLastEntry(out);
const since = toDate(args.since);
const until = toDate(args.until);
const after = last ? new Date(last.source_ts || last.ts) : null;
const repoReal = fs.realpathSync(root);

let added = 0;
let skippedOtherProject = 0;
const { branch, git_head } = gitInfo(root);
for (const r of rows) {
  if (after && r.date <= after) continue;
  if (since && r.date < since) continue;
  if (until && r.date > until) continue;
  if (r.cwd) {
    let real = r.cwd;
    try {
      real = fs.realpathSync(r.cwd);
    } catch {
      /* keep as-is */
    }
    if (!real.startsWith(repoReal)) {
      skippedOtherProject++;
      continue;
    }
  }
  const { task, kind } = deriveTask(r.prompt, null);
  const { text, redactions } = redact(r.prompt);
  appendEntry(out, {
    ts: isoNow(r.date),
    source_ts: r.date.toISOString(),
    imported_at: isoNow(),
    tool: args.tool,
    tool_version: null,
    capture_method: 'import',
    session_id: r.session ?? null,
    task,
    kind,
    branch: null, // unknown at the time of the original prompt
    git_head_at_import: git_head,
    git_branch_at_import: branch,
    prompt: text,
    prompt_chars: r.prompt.length,
    redactions,
  });
  added++;
}
console.log(`Imported ${added} prompt(s) into ${path.relative(root, out)}${skippedOtherProject ? `, skipped ${skippedOtherProject} from other projects` : ''}.`);
if (!rows.some((r) => r.cwd) && !since) console.warn('WARNING: source has no cwd field and no --since was given; prompts from other projects may be included.');
