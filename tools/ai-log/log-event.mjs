#!/usr/bin/env node
// Optional: record non-prompt evidence to ai-logs/events.jsonl (Claude Code hooks).
//   --event post-tool : PostToolUse payload; records verification commands (test/lint/build/migrate) the AI ran
//   --event stop      : Stop payload; records files changed in the working tree after an AI turn
import path from 'node:path';
import { redact } from './redact.mjs';
import { appendEntry, findRepoRoot, git, gitInfo, logError, parseArgs, readStdin } from './lib.mjs';

const args = parseArgs(process.argv.slice(2));
let root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const VERIFY_RE = /\b(test|tests|vitest|jest|pytest|phpunit|pest|artisan\s+test|mvn\s+test|gradle\w*\s+test|lint|eslint|ruff|pint|tsc|typecheck|playwright|cypress|migrate|seed|build)\b/i;

async function main() {
  const raw = await readStdin();
  const payload = raw.trim() ? JSON.parse(raw) : {};
  root = findRepoRoot(payload.cwd || root);
  const base = { tool: args.tool || 'claude-code', session_id: payload.session_id ?? null, ...gitInfo(root) };
  const file = path.join(root, 'ai-logs', 'events.jsonl');

  if (args.event === 'post-tool') {
    const cmd = payload.tool_input && payload.tool_input.command;
    if (!cmd || !VERIFY_RE.test(cmd)) return;
    const resp = payload.tool_response || {};
    const exitCode = resp.exit_code ?? resp.exitCode ?? (resp.interrupted ? null : undefined);
    appendEntry(file, { ...base, event: 'verify_command', command: redact(cmd).text.slice(0, 500), exit_code: exitCode ?? null });
  } else if (args.event === 'stop') {
    const status = git(['status', '--porcelain'], root) || '';
    const files = status
      .split('\n')
      .filter(Boolean)
      .map((l) => l.slice(3))
      .filter((f) => !f.startsWith('ai-logs/'));
    appendEntry(file, { ...base, event: 'turn_end', changed_files: files.slice(0, 100), changed_count: files.length });
  }
}

main()
  .catch((e) => logError(root, e))
  .finally(() => {
    process.exitCode = 0;
  });
