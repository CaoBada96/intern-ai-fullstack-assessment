# Prompt Logging Spec

Mục tiêu: **tự động** ghi lại các prompt bạn gửi cho AI coding tool trong quá trình làm bài. Log này là bằng chứng để review cách bạn làm việc với AI. Nó không thay thế được chất lượng code.

> Một rule viết bằng lời kiểu "AI hãy tự ghi lại prompt" **không phải** là logging tự động.

---

## 1. Các file log

| File | Nội dung | Ai ghi |
|---|---|---|
| `ai-logs/prompts.jsonl` | Mỗi dòng là một prompt được bắt **trực tiếp** (qua hook hoặc wrapper) | Logger |
| `ai-logs/imported/<tool>.jsonl` | Prompt **import** từ lịch sử session của tool không có hook | `import-history.mjs` |
| `ai-logs/events.jsonl` | (Tuỳ chọn) Sự kiện khác: kết thúc một lượt, lệnh test/lint mà AI đã chạy | Hook (nếu tool hỗ trợ) |
| `ai-logs/logger-errors.log` | Lỗi của chính logger (**không** commit) | Logger |

Định dạng: **JSON Lines** (UTF-8, mỗi dòng một object, chỉ được thêm dòng mới vào cuối file).

## 2. Schema một entry (`v: 1`)

```json
{
  "v": 1,
  "ts": "2026-12-01T09:15:02.123+07:00",
  "seq": 12,
  "tool": "claude-code",
  "tool_version": null,
  "capture_method": "hook",
  "session_id": "5f0c…",
  "task": "F03",
  "kind": "feat",
  "branch": "feat/F03-create-booking",
  "git_head": "a1b2c3d",
  "prompt": "[F03] Implement POST /api/bookings …",
  "prompt_chars": 642,
  "redactions": { "email": 1 },
  "prev_hash": "9c1e…",
  "hash": "4ab7…"
}
```

| Trường | Bắt buộc | Ý nghĩa |
|---|:-:|---|
| `v` | ✓ | Phiên bản schema |
| `ts` | ✓ | Thời điểm theo ISO 8601, có offset |
| `seq` | ✓ | Số thứ tự tăng dần, bắt đầu từ 1, liên tục trong mỗi file |
| `tool` | ✓ | `claude-code`, `cursor`, `codex-cli`, `copilot`, `chatgpt`, … |
| `capture_method` | ✓ | `hook` (tool gọi logger trước khi gửi), `wrapper` (bạn gửi prompt qua wrapper), `import` (import từ lịch sử session) |
| `session_id` |  | ID session hoặc conversation nếu tool cung cấp |
| `task` | ✓ | Mã feature `F01`–`F08`, `P1-xx`, hoặc `untagged`. Lấy từ `[Fxx]` ở đầu prompt; nếu không có thì lấy từ tên branch |
| `kind` | ✓ | `feat`, `fix`, `test`, `refactor`, `docs`, `chore`, `deploy`, `plan`, `other`. Lấy từ tiền tố của branch |
| `branch`, `git_head` | ✓ | Branch và commit lúc gửi prompt. Dùng để nối prompt với code |
| `prompt` | ✓ | Nội dung prompt **sau khi đã redact** |
| `prompt_chars` | ✓ | Độ dài prompt gốc (trước khi redact) |
| `redactions` | ✓ | Số lần đã redact theo từng loại |
| `prev_hash`, `hash` | ✓ | Chuỗi hash để phát hiện log bị chỉnh sửa (mục 4) |

## 3. Gắn prompt với feature

Logger chọn `task` theo thứ tự ưu tiên:

1. Tiền tố trong prompt: `[F03] …` hoặc `[P1-02] …`.
2. Mã trong tên branch: `feat/F03-create-booking` cho ra `F03`.
3. Nếu không có cả hai thì là `untagged`.

`kind` lấy từ tiền tố của branch (`feat/`, `fix/`, `test/`…), hoặc từ `[F03][fix]` ghi trong prompt.

👉 Làm mỗi feature trên một branch riêng thì bạn **không cần gõ tag thủ công**.

## 4. Chống chỉnh sửa (hash chain)

- `prev_hash` của entry đầu tiên là `"0"` lặp lại 64 lần.
- `hash = sha256_hex(prev_hash + "\n" + canonical_json(entry bỏ đi trường hash))`
- `canonical_json`: `JSON.stringify` với key được **sắp xếp theo alphabet** ở mọi cấp, không có khoảng trắng.
- Xoá, sửa hay chèn bất kỳ dòng nào cũng làm hỏng chuỗi hash. Ngoài ra, công cụ chấm còn so nội dung file qua từng commit để chắc chắn file **chỉ được thêm dòng vào cuối**.

Tự kiểm tra: `node tools/ai-log/verify-log.mjs`

## 5. Redaction

Logger tự thay các mẫu sau **trước khi ghi** (`redact.mjs`):

| Loại | Ví dụ | Thay bằng |
|---|---|---|
| API key / token | `sk-ant-…`, `sk-…`, `ghp_…`, `AKIA…`, `xox[bp]-…`, `AIza…` | `[REDACTED:api_key]` |
| JWT | `eyJhbGciOi…` | `[REDACTED:jwt]` |
| Private key | `-----BEGIN … PRIVATE KEY-----` | `[REDACTED:private_key]` |
| Connection string có mật khẩu | `postgres://user:pass@host` | `postgres://user:[REDACTED]@host` |
| Gán secret | `PASSWORD=…`, `SECRET=…`, `TOKEN=…` | `PASSWORD=[REDACTED]` |
| Email | `a@b.com` | `[REDACTED:email]` |
| SĐT Việt Nam | `0912 345 678`, `+84…` | `[REDACTED:phone]` |

**Lưu ý:**
- Redact bằng regex không bắt được mọi thứ. **Đừng dán secret hay dữ liệu cá nhân thật vào prompt.** Hãy dùng dữ liệu giả.
- Nếu một prompt chứa thông tin riêng tư không thể log, bắt đầu prompt bằng `#private`. Logger vẫn ghi một entry để **giữ đúng số lượng và thứ tự**, nhưng phần `prompt` sẽ là `[PRIVATE: <n> chars]`. Chỉ nên dùng rất hạn chế: reviewer sẽ thấy số lượng prompt private và có thể hỏi lý do.
- Trước khi push, hãy xem lại `git diff ai-logs/`.

## 6. Cài đặt theo tool

Starter kit có sẵn adapter trong `tools/ai-log/adapters/`. Yêu cầu Node.js ≥ 18.

### 6.1 Claude Code (hook: `capture_method = hook`)
Copy `adapters/claude-code/settings.json` vào `.claude/settings.json`. Nếu file đã tồn tại thì gộp phần `hooks` vào.
- `UserPromptSubmit` → `log-prompt.mjs`: ghi mọi prompt bạn gửi trong session.
- `PostToolUse` (Bash) → `log-event.mjs`: ghi các lệnh test/lint/build mà AI đã chạy.
- `Stop` → `log-event.mjs`: ghi danh sách file thay đổi sau mỗi lượt trả lời.

Kiểm tra: mở Claude Code trong repo, gửi một prompt bất kỳ, rồi chạy `tail -1 ai-logs/prompts.jsonl`.

### 6.2 Cursor (hook: `capture_method = hook`)
Copy `adapters/cursor/hooks.json` vào `.cursor/hooks.json`. Hook dùng là `beforeSubmitPrompt`. Cần Cursor bản có hỗ trợ hooks; nếu bản của bạn chưa có, chuyển sang 6.4.

### 6.3 Codex CLI và các tool có file lịch sử session (`capture_method = import`)
Chạy định kỳ, ví dụ trước mỗi commit:
```bash
node tools/ai-log/import-history.mjs --tool codex-cli --format codex --file ~/.codex/history.jsonl --since 2026-12-01T09:00:00+07:00
```
Script chỉ import các entry mới (sau entry cuối đã có trong `ai-logs/imported/codex-cli.jsonl`) và **chỉ lấy session của project hiện tại** khi file nguồn có thông tin `cwd`. Nếu không có `cwd` thì phải giới hạn bằng `--since`. Ghi rõ điều này trong `AI_USAGE.md`.

### 6.4 Tool không có hook và không có file lịch sử, như ChatGPT web hay Copilot Chat (`capture_method = wrapper`)
Viết prompt vào terminal qua wrapper trước, rồi mới dán sang tool:
```bash
node tools/ai-log/log-prompt.mjs --tool chatgpt --capture wrapper --raw --copy
# gõ/dán prompt, kết thúc bằng Ctrl-D → prompt được ghi log và copy vào clipboard
```
Cách này phụ thuộc vào kỷ luật của bạn, nên **độ tin cậy thấp hơn hook**. Hãy ghi rõ giới hạn trong `AI_USAGE.md`.

### 6.5 Tự xây giải pháp khác
Được phép, miễn là output đúng schema ở mục 2, có hash chain, và **demo được trong buổi live**.

## 7. `AI_USAGE.md` phải có

1. Tool nào, phiên bản nào, dùng cho việc gì.
2. Cơ chế capture của từng tool (`hook`, `import` hay `wrapper`) và cách cài.
3. **Cách tái hiện một lần test log:** gửi prompt, rồi xem entry mới bằng lệnh nào.
4. **Những gì KHÔNG bắt được:** chat ở trình duyệt, autocomplete inline, tool phụ, prompt gửi trước khi cài logger…
5. Cách bạn redact và những gì bạn đã kiểm tra thủ công.
6. Ví dụ truy vết: prompt `seq` nào dẫn tới commit nào, của feature nào.
7. Cách bạn cập nhật rules của AI sau khi gặp lỗi (dẫn link tới commit).

## 8. Những điều không được làm

- Viết tay hoặc sửa entry trong log rồi khai là tự động.
- Xoá các prompt "xấu". Prompt xấu kèm cách bạn sửa sai lại là bằng chứng tốt.
- Log prompt của dự án hay ứng dụng khác không liên quan.
- Commit `.env`, token hoặc dữ liệu cá nhân thật.
