# Claude Code adapter

1. Copy `settings.json` → `<repo>/.claude/settings.json`. Nếu file đã có thì gộp khối `hooks` vào.
2. Khởi động lại Claude Code trong repo. Gõ `/hooks` để xem các hook đã được nạp chưa.
3. Gửi một prompt, rồi kiểm tra: `tail -1 ai-logs/prompts.jsonl`.

| Hook | Script | Ghi lại |
|---|---|---|
| `UserPromptSubmit` | `log-prompt.mjs` | Mọi prompt bạn gửi, trước khi model xử lý |
| `PostToolUse` (Bash) | `log-event.mjs --event post-tool` | Lệnh test/lint/build/migrate mà AI chạy → `events.jsonl` |
| `Stop` | `log-event.mjs --event stop` | Danh sách file thay đổi sau mỗi lượt → `events.jsonl` |

Ghi chú:
- Hook `UserPromptSubmit` của Claude Code đưa stdout vào context của model, nên logger **không in gì** ra stdout.
- Slash command (`/clear`, `/model`…) có thể không đi qua hook. Prompt gửi từ subagent (Task tool) không phải prompt của bạn nên không được ghi.
- Nếu bạn chạy Claude Code ở thư mục khác hoặc trên máy khác thì cần cài lại hook ở đó.
