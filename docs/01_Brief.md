# Bài đánh giá Intern — AI-Assisted Full-Stack (Take-home)

**Phiên bản:** 2.0  
**Đối tượng:** Ứng viên intern  
**Hình thức:** Take-home 2–3 ngày + buổi review live 60 phút  
**Chính sách AI:** Được phép và **khuyến khích** dùng công cụ AI coding.

---

## 1. Mục tiêu

Bạn sẽ xây dựng một web app nhỏ nhưng **hoàn chỉnh và đã deploy public**, theo một topic (track) được giao. Chúng tôi không đo bạn sinh code nhanh tới mức nào. Chúng tôi đánh giá:

1. Bạn **hiểu yêu cầu** và lập kế hoạch ra sao.
2. Bạn **thiết lập môi trường AI** (rules/instructions cho project) như thế nào.
3. Bạn **viết prompt** có rõ ràng, đủ ngữ cảnh, có tiêu chí nghiệm thu không, và có dùng số prompt hợp lý không.
4. Bạn **kiểm chứng** code AI sinh ra như thế nào: test, review, sửa lỗi.
5. Bạn **hiểu và giải thích được** code của mình, đặc biệt là validation, concurrency và security.
6. Bạn **giao được sản phẩm**: chạy được, deploy được, có tài liệu và biết rõ giới hạn của nó.

> Nộp bài nhiều tính năng nhưng không giải thích được, không có test, log prompt toàn "fix it" thì sẽ bị đánh giá thấp hơn bài ít tính năng nhưng chắc chắn.

## 2. Timeline

| Mốc | Thời điểm | Yêu cầu |
|---|---|---|
| T0 | Nhận đề | Nhận track, link starter kit, giờ bắt đầu/deadline chính thức |
| T0 + 20' | Kickoff call (online) | Cài prompt logger **trước prompt đầu tiên**, chứng minh log hoạt động, hỏi đáp đề |
| **T0 + 4h** | **Mốc bắt buộc** | Commit + push `PLAN.md` (phân tích yêu cầu, giả định, kế hoạch) |
| T0 + 2–3 ngày | Deadline | Push code, tag `submission`, nộp form (GitHub URL + domain) |
| Sau deadline | Review live 60' | Demo, giải thích code, live prompt test, change request bằng AI |

Câu hỏi làm rõ đề gửi qua kênh chung. Câu trả lời sẽ được công bố trong FAQ cho **tất cả** ứng viên. Nếu không nhận được câu trả lời kịp, hãy tự đưa ra giả định hợp lý và ghi lại trong `PLAN.md`.

## 3. Phạm vi chức năng

Mỗi track có **8 nhóm feature P0 với mã cố định** `F01–F08`. Nội dung cụ thể theo domain nằm trong file track của bạn (`tracks/<track>.md`).

| Mã | Nhóm feature | Ý nghĩa chung |
|---|---|---|
| F01 | Catalog | Hiển thị danh sách tài nguyên (sân, sự kiện, sản phẩm, workshop…) |
| F02 | Availability | Hiển thị phần còn trống/còn hàng theo lựa chọn của người dùng |
| F03 | Create | Tạo đơn/đặt chỗ với thông tin khách hàng |
| F04 | View | Màn hình xác nhận và xem lại đơn bằng mã + token truy cập |
| F05 | Cancel / Restore | Huỷ đơn, tài nguyên được trả lại đúng trạng thái |
| F06 | Server validation | Validate đầy đủ ở server: required, format, thời gian, giá trị đáng tin |
| F07 | **Invariant khi chạy song song** | Không vi phạm quy tắc cốt lõi (trùng giờ, oversell…) kể cả khi nhiều request tới cùng lúc |
| F08 | UI states | Loading, success, empty, error có ý nghĩa với người dùng |

Chỉ làm **P1** (trong file track) sau khi P0 đã hoàn chỉnh và có test.

**Ngoài phạm vi:** thanh toán thật, gửi email/SMS thật, hệ thống đăng nhập phức tạp, hạ tầng production-grade.

## 4. Công nghệ

- Bạn **tự chọn stack** nhưng phải giải thích được lý do. Ví dụ: Next.js + Prisma + Postgres, NestJS, Laravel, Django/DRF, FastAPI, Spring Boot.
- Đã chọn stack nào thì **phải theo đúng convention của stack đó**, bắt buộc có **migration** và **seed data thực tế** (xem `02_Rules_and_Conventions.md`).
- Phải có **backend/API thật** và database. Một UI tĩnh là không đủ.
- **Phải tuân thủ API contract tối thiểu** của track (`tracks/<track>.openapi.yaml`). UI và các endpoint khác thì tuỳ bạn thiết kế. Hệ thống chấm sẽ gọi trực tiếp các endpoint trong contract trên domain bạn deploy.
- Được dùng thư viện open-source, nhưng các thành phần lớn lấy từ nơi khác phải được ghi rõ trong `README.md`.

## 5. Deploy public (bắt buộc)

- Deploy lên nền tảng bất kỳ có free tier (Vercel, Render, Railway, Fly.io, Koyeb, Neon/Supabase cho DB…).
- Phải có HTTPS.
- `GET /api/health` trả về `{"status":"ok","commit":"<git sha đang chạy>"}`. Commit này phải **trùng với commit bạn nộp**. Hầu hết nền tảng có biến môi trường chứa commit SHA, ví dụ `VERCEL_GIT_COMMIT_SHA` hay `RENDER_GIT_COMMIT`.
- Database production phải được tạo bằng migration và có seed demo.
- Không đưa secret vào repo. Chỉ commit `.env.example`.
- Giữ app chạy ít nhất **7 ngày sau deadline**. Nếu nền tảng free tier "ngủ" khi không có truy cập (cold start), hãy ghi chú điều đó trong README.
- **API phải truy cập công khai, không có lớp chặn.** Không bật đăng nhập/Basic Auth, "Deployment Protection" (ví dụ Vercel), captcha hay rate limit quá chặt cho các endpoint trong contract. Hệ thống chấm sẽ gọi trực tiếp các endpoint này.
- **Hệ thống chấm sẽ tạo dữ liệu thử trên bản deploy của bạn**: khách tên "Grader Bot", có cả các request gửi song song. Sau khi chấm, hệ thống huỷ hết dữ liệu đó qua chính API huỷ của bạn. Đây là hành vi bình thường, đừng xoá hay chặn.
- **Seed spec trong file track là bắt buộc**, không chỉ để demo. Ví dụ: sản phẩm còn ít hàng, workshop còn đúng 1 chỗ, suất diễn còn nhiều ghế. Hệ thống chấm cần những dữ liệu này để chạy kiểm tra. Thiếu thì phần kiểm tra tương ứng không chạy được và bạn mất bằng chứng.

## 6. Môi trường AI (bắt buộc)

1. **Project instructions:** tự viết **ít nhất một** file instructions cho tool của bạn (`AGENTS.md`, `CLAUDE.md`, `.cursor/rules/`, `.github/copilot-instructions.md`…). Nội dung phải riêng cho project này:
   - Kiến trúc, cấu trúc thư mục.
   - Convention của stack, cách xử lý lỗi, format lỗi API.
   - Yêu cầu về validation và security.
   - Lệnh chạy app, migrate, seed, lint, test.
   - Yêu cầu AI phải verify thay đổi (chạy test/lint) thay vì mặc định là code đúng.

   Đừng viết cho có. File này nên được **cập nhật khi bạn gặp lỗi thực tế** với AI. Chúng tôi sẽ xem lịch sử git của file này.

   **Skill, subagent, MCP, custom command là tuỳ chọn.** Chỉ thêm khi bạn thật sự dùng và giải thích được vì sao cần. Có nhiều file cấu hình **không** được cộng điểm. Một file instructions ngắn, đúng trọng tâm và được sửa dần theo lỗi thực tế sẽ được đánh giá cao hơn.
2. **Prompt logging tự động:** dùng bộ logger trong starter kit, hoặc tự làm một giải pháp tương đương, theo `03_Prompt_Logging_Spec.md`. **Cài logger trước khi gửi prompt đầu tiên**, kể cả các prompt phân tích đề hay lập kế hoạch. Prompt gửi trước khi cài logger sẽ không có bằng chứng. Một rule kiểu "AI hãy tự ghi log" **không được tính** là logging tự động.
3. **Không làm giả log.** Nếu tool của bạn không có hook để bắt prompt, hãy dùng chế độ import hoặc wrapper và ghi rõ giới hạn trong `AI_USAGE.md`. Giới hạn thật của tool sẽ không bị trừ điểm. Log bị sửa hay viết tay rồi khai là tự động sẽ bị **loại**.

## 7. Cách làm việc với AI (gợi ý, chúng tôi sẽ quan sát)

- **Mỗi feature làm trên một branch** riêng: `feat/F03-create-booking`. Logger tự lấy mã `F03` từ tên branch để gom prompt theo feature.
- Một prompt tốt thường có: **mục tiêu**, **ngữ cảnh** (file liên quan, quyết định đã có), **ràng buộc** (convention, security), **tiêu chí nghiệm thu** (thế nào là xong), và **cách verify** (test nào phải pass).
- Tránh hai thái cực: một prompt "build cả app cho tôi", và hàng chục prompt cụt kiểu "fix", "vẫn lỗi", "tiếp đi".
- Khi AI sai, hãy **tìm nguyên nhân** rồi đưa thêm ngữ cảnh, thay vì lặp lại cùng một prompt. Nếu lỗi đó có thể lặp lại, cập nhật rules của project.
- Đọc và hiểu code AI sinh ra trước khi commit. Reviewer có thể chọn **bất kỳ đoạn code nào** và yêu cầu bạn giải thích.

## 8. Deliverables

| # | Deliverable | Ghi chú |
|---|---|---|
| 1 | GitHub repo (public hoặc mời reviewer) | Lịch sử commit đầy đủ, không squash toàn bộ |
| 2 | Domain public | HTTPS, `/api/health` trả commit SHA |
| 3 | `README.md` | Setup, lệnh chạy/migrate/seed/test, kiến trúc, giả định, giới hạn, thư viện lấy từ nơi khác |
| 4 | `PLAN.md` | Commit trong 4h đầu; có thể cập nhật sau nhưng phần ban đầu phải giữ nguyên |
| 5 | File instructions cho AI | `AGENTS.md` / `CLAUDE.md` / `.cursor/rules/` … |
| 6 | `ai-logs/prompts.jsonl` + `AI_USAGE.md` | Log tự động, đã redact; mô tả cách tái hiện và giới hạn |
| 7 | `TEST_RESULTS.md` + test tự động | Kịch bản → kỳ vọng → thực tế → pass/fail |
| 8 | `DECISIONS.md` | 2 quyết định kỹ thuật quan trọng + **ít nhất 1 gợi ý AI bạn đã từ chối hoặc sửa** |
| 9 | `assessment.json` | Khai báo stack, track, các lệnh (xem `04_Submission_Guide.md`) |

## 9. Tự kiểm tra trước khi nộp

Ghi kết quả vào `TEST_RESULTS.md` theo dạng **kịch bản → kỳ vọng → thực tế → pass/fail**:

- Tạo đơn hợp lệ.
- Thiếu hoặc sai thông tin khách hàng.
- Thời gian trong quá khứ, thời gian không hợp lệ, vượt giờ hoạt động.
- Đặt vào tài nguyên đã có người đặt hoặc đã hết.
- **Hai request tranh cùng một tài nguyên** (có test tự động, hoặc giải thích rõ cách bạn test).
- Huỷ rồi đặt lại.
- Mã đơn bị đoán (truy cập đơn của người khác).
- Client tự sửa giá hoặc thời lượng trong request.
- Backend lỗi hoặc không truy cập được: UI hiển thị gì?
- Migrate từ DB rỗng + seed chạy 2 lần.
- Một đoạn code AI sinh ra phải sửa: lỗi gì, sửa thế nào, test nào chứng minh.

## 10. Buổi review live (60 phút)

Buổi review live là **bắt buộc** và có trọng số lớn nhất. Bài làm tốt nhưng **không giải thích được code của chính mình** thì **không đạt**, dù website chạy tốt tới đâu. Hãy chuẩn bị để:

- Demo một luồng end-to-end trên **bản đã deploy**.
- Gửi một prompt có mã do reviewer đưa ra và cho thấy log được ghi tự động.
- Giải thích cách bạn ngăn vi phạm invariant khi có request song song.
- Giải thích một đoạn code do reviewer chọn.
- **Dùng AI** để làm một yêu cầu thay đổi nhỏ ngay tại buổi review, rồi nói rõ cần test lại những gì.

## 11. Đánh giá

Đánh giá theo 7 nhóm (trọng số lớn nhất: hiểu code và testing): phân tích yêu cầu; môi trường AI; chất lượng và khả năng truy vết prompt; giải quyết vấn đề với AI; hiểu code và nền tảng kỹ thuật; testing và kiểm chứng; deploy và ownership. **Số lượng tính năng không quyết định kết quả.** Hidden test và ngưỡng chấm chi tiết được giữ kín.

**Bị loại ngay nếu:** làm giả hoặc chỉnh sửa prompt log, commit secret hay dữ liệu cá nhân thật, hoặc nhờ người khác làm bài.

## 12. Dữ liệu cá nhân và log

- Prompt log có thể chứa thông tin nhạy cảm. Logger đã tự redact các mẫu phổ biến, nhưng bạn vẫn phải tự kiểm tra trước khi push.
- Không dán secret, mật khẩu hay dữ liệu cá nhân thật vào prompt.
- Log chỉ được người chấm truy cập và sẽ bị xoá **90 ngày** sau khi có quyết định tuyển dụng.
- Chúng tôi **không** yêu cầu bạn cung cấp lịch sử chat cá nhân hay tài khoản AI.
