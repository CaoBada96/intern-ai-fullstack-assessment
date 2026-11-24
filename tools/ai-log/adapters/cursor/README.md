# Cursor adapter

1. Copy `hooks.json` → `<repo>/.cursor/hooks.json`.
2. Mở lại Cursor, gửi một prompt trong Agent/Chat, rồi kiểm tra: `tail -1 ai-logs/prompts.jsonl`.
3. Hook `beforeSubmitPrompt` gửi payload JSON qua stdin (có `prompt`, `conversation_id`, `workspace_roots`). Logger in ra `{"continue":true}` để Cursor gửi prompt bình thường.

**Kiểm chứng trước khi dùng:** tính năng hooks của Cursor còn mới và có thể thay đổi giữa các phiên bản. Nếu bản Cursor của bạn không hỗ trợ hooks, hoặc payload khác đi (log không có entry mới), hãy:
- Xem `ai-logs/logger-errors.log`.
- Chuyển sang wrapper (`../generic-wrapper/README.md`) và ghi rõ trong `AI_USAGE.md`.

**Không bắt được:** Tab autocomplete, inline edit (Cmd-K) nếu bản Cursor không gọi hook cho các tính năng này.
