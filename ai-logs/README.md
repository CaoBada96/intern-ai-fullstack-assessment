# ai-logs

Thư mục này do logger **tự động** ghi. **Không sửa tay**: mọi chỉnh sửa đều bị phát hiện qua hash chain và lịch sử git.

- `prompts.jsonl`: prompt bắt qua hook hoặc wrapper.
- `imported/<tool>.jsonl`: prompt import từ lịch sử session.
- `events.jsonl`: (tuỳ chọn) lệnh verify mà AI đã chạy, file thay đổi sau mỗi lượt.

Kiểm tra: `node tools/ai-log/verify-log.mjs`
