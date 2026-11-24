# Codex CLI (và các tool có file lịch sử session)

Codex CLI lưu lịch sử prompt ở `~/.codex/history.jsonl` (mỗi dòng có dạng `{session_id, ts, text}`). Hãy kiểm tra lại đường dẫn và định dạng này trên phiên bản bạn đang dùng.

```bash
node tools/ai-log/import-history.mjs --tool codex-cli --format codex \
  --file ~/.codex/history.jsonl --since "<giờ bắt đầu bài thi, ISO 8601>"
```

- Chạy lệnh này **trước mỗi commit** để log luôn cập nhật. Bạn có thể đặt nó vào git hook `pre-commit`.
- Output nằm ở `ai-logs/imported/codex-cli.jsonl`, `capture_method = "import"`.
- **Giới hạn:** file lịch sử không ghi project, nên prompt từ project khác trong cùng khoảng thời gian cũng có thể bị import. Hãy chỉ dùng Codex cho bài thi trong thời gian làm bài, hoặc lọc lại thủ công **trước** khi import, và ghi rõ điều này trong `AI_USAGE.md`.
- Nếu phiên bản Codex của bạn có hook/notify chạy trước khi gửi prompt, bạn có thể gọi `log-prompt.mjs --tool codex-cli --capture hook` (payload phải có trường `prompt`).
