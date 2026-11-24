# Hướng dẫn nộp bài

## 1. `assessment.json` (đặt ở root repo, bắt buộc)

Công cụ chấm đọc file này để biết stack của bạn và các lệnh cần chạy. Mọi lệnh phải chạy được trên máy sạch, chỉ cần `.env` copy từ `.env.example` và một Postgres/MySQL do grader cung cấp qua biến `DATABASE_URL`.

```json
{
  "candidate": "Nguyễn Văn A",
  "track": "sports-court",
  "stack": "nextjs-prisma",
  "runtime": "node:20",
  "database": "postgres",
  "deploy_url": "https://court-booking-abc.vercel.app",
  "commands": {
    "install": "npm ci",
    "lint": "npm run lint && npm run typecheck",
    "test": "npm test",
    "migrate": "npx prisma migrate deploy",
    "migrate_rollback": null,
    "seed": "npx prisma db seed",
    "reset": "npm run db:reset",
    "start": "npm run build && npm start"
  },
  "ai_tools": ["claude-code"],
  "started_at": "2026-12-01T09:00:00+07:00"
}
```

| Trường | Giá trị hợp lệ |
|---|---|
| `track` | `sports-court`, `event-seats`, `flash-sale`, `workshop-waitlist`, … (theo đề được giao) |
| `stack` | `nextjs-prisma`, `nextjs-drizzle`, `node-express`, `nestjs`, `laravel`, `django`, `fastapi`, `spring-boot`, `other` |
| `runtime` | Docker image để chạy lệnh: `node:20`, `php:8.3`, `python:3.12`, `eclipse-temurin:21` |
| `database` | `postgres` (khuyến nghị), `mysql`, `sqlite` |
| `migrate_rollback` | Lệnh rollback, hoặc `null` nếu framework không hỗ trợ |

## 2. Freeze bài nộp

```bash
git checkout main && git pull
git tag submission
git push origin main --tags
```

- Công cụ chấm dùng **tag `submission`**. Nếu không có tag thì dùng **commit cuối cùng trước deadline**. Commit sau deadline sẽ bị bỏ qua.
- Bản deploy phải chạy **đúng commit này**: `/api/health` trả về `commit` khớp với commit của tag (so 7 ký tự đầu).

## 3. Nộp bài

Không cần điền form. Sau khi push tag `submission`, **nhắn một tin cho reviewer** trên kênh chat được cung cấp lúc kickoff, theo mẫu:

```text
[Nộp bài] Nguyễn Văn A — sports-court
Repo: https://github.com/<user>/<repo>
Domain: https://court-booking-abc.vercel.app
Tool AI: Claude Code, Cursor
Ghi chú: (tuỳ chọn) những gì chưa xong và lý do
```

- Nếu repo private, mời tài khoản GitHub của reviewer **trước khi** nhắn.
- Thời điểm chấm là thời điểm của tag/commit trên GitHub, **không phải** giờ gửi tin nhắn. Nhắn trễ vài phút không sao, nhưng commit sau deadline sẽ bị bỏ qua.
- Reviewer sẽ trả lời xác nhận đã nhận. Nếu sau 2 giờ chưa có phản hồi, hãy nhắn lại.

## 4. Checklist tự kiểm trước khi nộp

```text
[ ] PLAN.md được commit trong 4h đầu (không viết lại lịch sử)
[ ] File instructions cho AI (AGENTS.md / CLAUDE.md / .cursor/rules/…) riêng cho project này
[ ] Logger được cài trước prompt đầu tiên; ai-logs/prompts.jsonl có entry thật; `node tools/ai-log/verify-log.mjs` → OK
[ ] AI_USAGE.md mô tả cách capture, cách tái hiện, những gì không bắt được, ví dụ truy vết
[ ] Lint/format/typecheck pass
[ ] Migrate từ DB rỗng chạy OK; seed chạy 2 lần không lỗi và không nhân đôi
[ ] Seed data thực tế (tên/địa chỉ/giá Việt Nam, đủ trạng thái, ngày tương đối)
[ ] Test tự động pass, có ít nhất 1 test concurrency trên DB thật
[ ] TEST_RESULTS.md đủ các kịch bản trong Brief mục 9
[ ] DECISIONS.md: 2 quyết định + ≥1 gợi ý AI đã từ chối/sửa
[ ] README.md: setup, lệnh, kiến trúc, timezone, giả định, giới hạn, thư viện lấy từ nơi khác
[ ] Deploy HTTPS, /api/health trả đúng commit, API theo contract của track
[ ] API công khai: không bật đăng nhập / Deployment Protection / captcha cho các endpoint trong contract
[ ] Dữ liệu seed trên bản deploy có đủ các case trong seed spec của track
[ ] Không có secret trong repo và trong log (`git log -p | grep -iE "secret|password|sk-"`)
[ ] Tag `submission` đã push
```

Nếu repo của bạn có starter kit, có thể tự chạy thử bản rút gọn của bộ kiểm tra:

```bash
node tools/ai-log/verify-log.mjs
```
