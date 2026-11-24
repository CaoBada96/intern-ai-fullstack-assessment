// Shared helpers for the AI prompt logger. No dependencies (Node >= 18).
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export const SCHEMA_VERSION = 1;
export const GENESIS_HASH = '0'.repeat(64);
export const TASK_RE = /\b(F0[1-8]|P1-\d{2})\b/i;
export const KINDS = ['feat', 'fix', 'test', 'refactor', 'docs', 'chore', 'deploy', 'plan', 'other'];

/** JSON.stringify with recursively sorted keys and no whitespace. */
export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

export function computeHash(prevHash, entryWithoutHash) {
  return createHash('sha256').update(`${prevHash}\n${canonicalJson(entryWithoutHash)}`).digest('hex');
}

export function git(args, cwd) {
  try {
    return execFileSync('git', args, { cwd, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return null;
  }
}

export function findRepoRoot(start) {
  return process.env.AI_LOG_ROOT || git(['rev-parse', '--show-toplevel'], start) || start;
}

export function gitInfo(root) {
  return {
    branch: git(['rev-parse', '--abbrev-ref', 'HEAD'], root),
    git_head: git(['rev-parse', '--short', 'HEAD'], root),
  };
}

/** Local ISO 8601 timestamp with offset, e.g. 2026-12-01T09:15:02.123+07:00 */
export function isoNow(date = new Date()) {
  const pad = (n, w = 2) => String(Math.abs(n)).padStart(w, '0');
  const off = -date.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}` +
    `${sign}${pad(Math.floor(Math.abs(off) / 60))}:${pad(Math.abs(off) % 60)}`
  );
}

/** Derive {task, kind} from a prompt prefix like "[F03][fix] ..." or from the branch name. */
export function deriveTask(prompt, branch) {
  const head = (prompt || '').slice(0, 40);
  const prefix = head.match(/^\s*\[(F0[1-8]|P1-\d{2})\](?:\s*\[([a-z]+)\])?/i);
  let task = prefix ? prefix[1].toUpperCase() : null;
  let kind = prefix && prefix[2] && KINDS.includes(prefix[2].toLowerCase()) ? prefix[2].toLowerCase() : null;
  if (!task && branch) {
    const m = branch.match(TASK_RE);
    if (m) task = m[1].toUpperCase();
  }
  if (!kind && branch) {
    const k = branch.split('/')[0].toLowerCase();
    if (KINDS.includes(k)) kind = k;
    else if (k === 'feature') kind = 'feat';
    else if (k === 'bugfix' || k === 'hotfix') kind = 'fix';
  }
  return { task: task || 'untagged', kind: kind || 'other' };
}

/** Return the last parsed entry of a JSONL file, or null. */
export function readLastEntry(file) {
  if (!fs.existsSync(file)) return null;
  const lines = fs.readFileSync(file, 'utf8').split('\n').filter((l) => l.trim());
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      return JSON.parse(lines[i]);
    } catch {
      /* skip broken line; verify-log will report it */
    }
  }
  return null;
}

/** Crude cross-process lock using mkdir (atomic on POSIX). */
export function withLock(file, fn) {
  const lockDir = `${file}.lock`;
  const deadline = Date.now() + 3000;
  for (;;) {
    try {
      fs.mkdirSync(lockDir);
      break;
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      try {
        if (Date.now() - fs.statSync(lockDir).mtimeMs > 10000) fs.rmSync(lockDir, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
      if (Date.now() > deadline) throw new Error(`lock timeout: ${lockDir}`);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 25);
    }
  }
  try {
    return fn();
  } finally {
    fs.rmSync(lockDir, { recursive: true, force: true });
  }
}

/** Append one entry with ts (unless given), seq and hash chain. Returns the written entry. */
export function appendEntry(file, fields) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  return withLock(file, () => {
    const last = readLastEntry(file);
    // Timestamp is taken inside the lock so concurrent writers stay chronological.
    const entry = {
      v: SCHEMA_VERSION,
      ts: isoNow(),
      ...fields,
      seq: last ? (last.seq || 0) + 1 : 1,
      prev_hash: last ? last.hash : GENESIS_HASH,
    };
    entry.hash = computeHash(entry.prev_hash, entry);
    fs.appendFileSync(file, `${JSON.stringify(entry)}\n`);
    return entry;
  });
}

export function logError(root, err) {
  try {
    const f = path.join(root, 'ai-logs', 'logger-errors.log');
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.appendFileSync(f, `${isoNow()} ${err && err.stack ? err.stack : String(err)}\n`);
  } catch {
    /* never throw from the logger */
  }
}

export async function readStdin() {
  if (process.stdin.isTTY) return '';
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString('utf8');
}

export function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) out[key] = true;
    else {
      out[key] = next;
      i++;
    }
  }
  return out;
}
