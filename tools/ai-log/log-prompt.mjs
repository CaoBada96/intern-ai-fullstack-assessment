#!/usr/bin/env node
// Append one prompt to ai-logs/prompts.jsonl.
//
// Hook mode (default): reads the tool's hook JSON payload on stdin.
//   Claude Code UserPromptSubmit: { session_id, prompt, cwd, ... }
//   Cursor beforeSubmitPrompt:    { conversation_id, prompt, workspace_roots, ... }
// Wrapper mode (--raw): stdin is the plain prompt text.
//
// Flags:
//   --tool <name>            claude-code | cursor | chatgpt | copilot | ...
//   --capture <method>       hook (default) | wrapper
//   --raw                    stdin is plain text, not JSON
//   --copy                   (wrapper) copy the prompt to the clipboard after logging
//   --respond cursor         print {"continue":true} so Cursor proceeds
//   --file <path>            override output file (default ai-logs/prompts.jsonl)
//
// The logger never blocks the AI tool: any failure is written to ai-logs/logger-errors.log and exit code is 0.
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { redact } from './redact.mjs';
import { appendEntry, deriveTask, findRepoRoot, gitInfo, logError, parseArgs, readStdin } from './lib.mjs';

const args = parseArgs(process.argv.slice(2));
let root = process.env.CLAUDE_PROJECT_DIR || process.cwd();

function pick(obj, keys) {
  for (const k of keys) if (obj && obj[k] != null && obj[k] !== '') return obj[k];
  return null;
}

function copyToClipboard(text) {
  const candidates = process.platform === 'darwin' ? [['pbcopy', []]] : process.platform === 'win32' ? [['clip', []]] : [['wl-copy', []], ['xclip', ['-selection', 'clipboard']]];
  for (const [cmd, a] of candidates) {
    try {
      execFileSync(cmd, a, { input: text });
      return true;
    } catch {
      /* try next */
    }
  }
  return false;
}

async function main() {
  const raw = await readStdin();
  let payload = {};
  let prompt;
  if (args.raw) {
    prompt = raw.replace(/\s+$/, '');
  } else {
    try {
      payload = raw.trim() ? JSON.parse(raw) : {};
    } catch {
      payload = { prompt: raw };
    }
    prompt = pick(payload, ['prompt', 'user_prompt', 'text', 'input', 'message']) ?? '';
    const ws = pick(payload, ['cwd']) || (Array.isArray(payload.workspace_roots) ? payload.workspace_roots[0] : null);
    if (ws) root = ws;
  }
  root = findRepoRoot(root);
  if (!String(prompt).trim()) return;

  const { branch, git_head } = gitInfo(root);
  const { task, kind } = deriveTask(prompt, branch);
  const isPrivate = /^\s*#private\b/i.test(prompt);
  const { text, redactions } = isPrivate ? { text: `[PRIVATE: ${prompt.length} chars]`, redactions: { private: 1 } } : redact(prompt);

  const file = args.file ? path.resolve(root, args.file) : path.join(root, 'ai-logs', 'prompts.jsonl');
  const entry = appendEntry(file, {
    tool: args.tool || 'unknown',
    tool_version: pick(payload, ['tool_version', 'cursor_version', 'version']),
    capture_method: args.capture || (args.raw ? 'wrapper' : 'hook'),
    session_id: pick(payload, ['session_id', 'conversation_id', 'sessionId', 'chat_id']),
    task,
    kind,
    branch,
    git_head,
    prompt: text,
    prompt_chars: String(prompt).length,
    redactions,
  });

  if (args.copy) {
    const ok = copyToClipboard(String(prompt));
    process.stderr.write(`ai-log: logged seq=${entry.seq} task=${entry.task}${ok ? ' (copied to clipboard)' : ''}\n`);
  }
}

main()
  .catch((e) => logError(root, e))
  .finally(() => {
    if (args.respond === 'cursor') process.stdout.write(JSON.stringify({ continue: true }));
    process.exitCode = 0;
  });
