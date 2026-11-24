# Starter kit — AI-Assisted Full-Stack Assessment

Bộ khởi đầu, không phụ thuộc stack. Nếu bạn tạo repo bằng **Use this template** thì các file này đã có sẵn ở root. Nếu không, hãy copy toàn bộ vào root repo của bạn **trước khi** bắt đầu dùng AI.

```text
.
├── tools/ai-log/          # Prompt logger (Node ≥ 18, không cần dependency)
│   ├── log-prompt.mjs     # Ghi prompt (hook / wrapper)
│   ├── log-event.mjs      # (Tuỳ chọn) ghi lệnh verify + file thay đổi
│   ├── import-history.mjs # Import từ lịch sử session của tool không có hook
│   ├── verify-log.mjs     # Kiểm tra schema + hash chain
│   └── adapters/          # Cấu hình cho Claude Code, Cursor, Codex CLI, wrapper
├── ai-logs/               # Log (commit) — đừng sửa tay
├── templates/             # Khung PLAN / AI_USAGE / TEST_RESULTS / DECISIONS → copy ra root và viết nội dung
├── assessment.example.json
├── .githooks/pre-commit   # Chạy verify-log trước mỗi commit
├── .env.example
└── .gitignore
```

## Cài đặt trong 5 phút

```bash
# 1. Bật logger cho tool của bạn (chọn một hoặc nhiều)
mkdir -p .claude && cp tools/ai-log/adapters/claude-code/settings.json .claude/settings.json   # Claude Code
mkdir -p .cursor && cp tools/ai-log/adapters/cursor/hooks.json .cursor/hooks.json              # Cursor

# 2. Bật pre-commit hook kiểm tra log
git config core.hooksPath .githooks

# 3. Tạo branch làm việc rồi gửi prompt đầu tiên
git checkout -b plan/F00-analysis
#   … gửi một prompt trong tool AI …
tail -1 ai-logs/prompts.jsonl
node tools/ai-log/verify-log.mjs

# 4. Copy template ra root
cp templates/*.md .
cp assessment.example.json assessment.json
```

Xem chi tiết trong `03_Prompt_Logging_Spec.md` của đề bài.

> **Không có sẵn `AGENTS.md`/`CLAUDE.md`.** Tự viết file instructions riêng cho project của bạn là một phần của bài thi.
