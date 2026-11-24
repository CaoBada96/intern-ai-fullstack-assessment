# AI-Assisted Full-Stack Assessment — Starter repo

Đây là repo khởi đầu cho bài thi tuyển intern. Bạn sẽ dùng AI coding tool (Claude Code, Cursor, Codex, Copilot…) để xây dựng **một web app hoàn chỉnh theo track được giao, deploy public**, và nộp kèm prompt log có thể kiểm chứng.

## Bắt đầu

1. Bấm **Use this template → Create a new repository** để tạo repo của riêng bạn (đừng fork, đừng mở PR vào repo này).
2. Clone repo của bạn về máy, rồi **cài prompt logger trước prompt đầu tiên** theo [`docs/00_Starter_Kit_Setup.md`](docs/00_Starter_Kit_Setup.md).
3. Đọc đề theo thứ tự:

| File | Nội dung |
|---|---|
| [`docs/01_Brief.md`](docs/01_Brief.md) | Đề chung: timeline, F01–F08, deploy, deliverables, live review, cách đánh giá |
| [`docs/02_Rules_and_Conventions.md`](docs/02_Rules_and_Conventions.md) | Convention theo stack, API, migration, seed, git, test, security |
| [`docs/03_Prompt_Logging_Spec.md`](docs/03_Prompt_Logging_Spec.md) | Schema prompt log, cách cài logger cho từng tool, redaction |
| [`docs/04_Submission_Guide.md`](docs/04_Submission_Guide.md) | `assessment.json`, tag `submission`, cách nhắn nộp bài, checklist |
| [`docs/tracks/`](docs/tracks/) | Danh mục topic + track pack (nghiệp vụ, seed spec, OpenAPI contract) |

## Cấu trúc repo

```text
.
├── docs/                  # Đề bài (chỉ đọc, đừng sửa)
├── tools/ai-log/          # Prompt logger (Node ≥ 18, không cần dependency)
├── ai-logs/               # Log do logger ghi — commit, không sửa tay
├── templates/             # Khung PLAN / AI_USAGE / TEST_RESULTS / DECISIONS
├── assessment.example.json
├── .githooks/pre-commit   # Kiểm tra log trước mỗi commit
├── .env.example
└── .gitignore
```

Code của bạn đặt ở root theo đúng convention của framework bạn chọn.

> **Không có sẵn `AGENTS.md`/`CLAUDE.md`.** Tự viết file instructions riêng cho project là một phần của bài thi.

Có câu hỏi về đề? Hỏi qua kênh được cung cấp lúc kickoff. Câu trả lời sẽ được đưa vào FAQ chung cho mọi ứng viên.
