# Wrapper cho tool không có hook và không có file lịch sử (ChatGPT web, Copilot Chat, Gemini web…)

```bash
# Gợi ý alias:  alias ailog='node tools/ai-log/log-prompt.mjs --capture wrapper --raw --copy --tool'
node tools/ai-log/log-prompt.mjs --tool chatgpt --capture wrapper --raw --copy
# Gõ/dán prompt → Ctrl-D. Prompt được ghi log và copy vào clipboard; dán sang tool.
```

- `capture_method = "wrapper"`: độ tin cậy **thấp hơn** hook vì nó phụ thuộc vào việc bạn luôn đi qua wrapper.
- Nếu tool có chức năng export hội thoại (JSON), hãy export ở cuối mỗi ngày rồi import bằng `import-history.mjs --format jsonl --map ...` để đối chiếu.
- Ghi rõ trong `AI_USAGE.md`: bạn đã dùng tool nào qua wrapper, và những gì có thể bị bỏ sót.
