# Track `workshop-waitlist` — Đăng ký workshop có danh sách chờ

**Độ khó:** ★★★ (Nhóm B)  
**API contract:** `workshop-waitlist.openapi.yaml` (bắt buộc)

## 1. Bối cảnh nghiệp vụ

Một cộng đồng công nghệ ở Đà Nẵng tổ chức các workshop (offline hoặc online) với số chỗ giới hạn. Người đăng ký **không bao giờ bị từ chối chỉ vì hết chỗ**: khi đầy, họ được đưa vào **danh sách chờ**. Khi có người huỷ, người **đứng đầu danh sách chờ** được tự động xác nhận.

## 2. Quy tắc nghiệp vụ

| Quy tắc | Giá trị |
|---|---|
| Timezone | `Asia/Ho_Chi_Minh`; DB lưu UTC |
| Capacity | Số đăng ký `confirmed` ≤ `capacity` của workshop **ở mọi thời điểm** |
| Đăng ký | Còn chỗ thì `confirmed`; hết chỗ thì `waitlisted` và có `waitlistPosition` (bắt đầu từ 1) |
| Thứ tự chờ | Theo thời điểm đăng ký (FIFO), xử lý đúng ngay cả khi các request đến gần như cùng lúc |
| Một người một suất | Một SĐT chỉ có tối đa **1** đăng ký còn hiệu lực (confirmed hoặc waitlisted) cho mỗi workshop. Đăng ký lặp lại trả 409 |
| Huỷ | Người `confirmed` huỷ thì trong **cùng một transaction**, người `waitlisted` đầu tiên được chuyển thành `confirmed`, và vị trí của những người chờ còn lại được cập nhật. Người `waitlisted` huỷ thì chỉ rời khỏi hàng chờ |
| Thời điểm | Đóng đăng ký khi workshop bắt đầu. Huỷ phải trước giờ bắt đầu; sau khi workshop bắt đầu thì không tự xác nhận người chờ nữa |
| Giá | Có workshop miễn phí và workshop có phí. `price` do server quyết định |
| Truy cập | `id` + `accessToken` |
| Lịch sử | Lưu lịch sử chuyển trạng thái: ai được xác nhận lúc nào, vì người nào huỷ |

## 3. Feature P0

| Mã | Feature | Độ phức tạp |
|---|---|:-:|
| F01 | Danh sách workshop: chủ đề, diễn giả, thời gian, hình thức, số chỗ còn lại, số người chờ | S |
| F02 | Chi tiết workshop: còn chỗ hay sẽ vào danh sách chờ (vị trí dự kiến) | S |
| F03 | Form đăng ký (tên, SĐT, email tuỳ chọn) → `confirmed` hoặc `waitlisted` | M |
| F04 | Trang đăng ký: trạng thái, vị trí chờ, tra cứu bằng mã và token | S |
| F05 | Huỷ → **tự động xác nhận người chờ đầu tiên** + cập nhật vị trí | L |
| F06 | Validate ở server: thông tin, workshop còn mở đăng ký, chống đăng ký lặp | M |
| F07 | **Không vượt capacity và giữ đúng thứ tự chờ** khi có request đăng ký và huỷ đồng thời | L |
| F08 | UI states: còn chỗ, sắp đầy, đã đầy (vào danh sách chờ), đóng đăng ký, lỗi, loading | S |

## 4. P1

- `P1-01` Trang admin: danh sách người đăng ký và người chờ, xuất CSV.
- `P1-02` Thông báo mô phỏng (ghi vào bảng `notifications`) khi người chờ được xác nhận.
- `P1-03` Concurrency test tự động cho cả trường hợp "huỷ trong lúc người khác đang đăng ký".
- `P1-04` Responsive và accessibility.

## 5. ERD gợi ý

```text
speakers (id, name, title, company)
workshops (id, speaker_id FK, title, description, format[offline|online], location?, starts_at, ends_at,
           capacity CHECK (capacity > 0), price, is_published)
registrations (id uuid, workshop_id FK, status[confirmed|waitlisted|cancelled], customer_name, customer_phone, email?,
               access_token_hash, created_at, confirmed_at?, cancelled_at?)
  -- UNIQUE (workshop_id, customer_phone) WHERE status IN ('confirmed','waitlisted')
registration_events (id, registration_id FK, from_status, to_status, reason, caused_by_registration_id?, created_at)
```

Gợi ý: lock dòng `workshops` (`SELECT … FOR UPDATE`) trong mọi transaction đăng ký hoặc huỷ, để việc đếm chỗ và xác nhận người chờ được thực hiện tuần tự trên từng workshop. Bạn có thể chọn cách khác nhưng phải giải thích được.

## 6. Seed spec

| Dữ liệu | Yêu cầu |
|---|---|
| Diễn giả | 5–6 diễn giả tên tiếng Việt có dấu, chức danh và công ty nghe như thật |
| Workshop | 6 workshop từ **hôm nay − 3** tới **hôm nay + 21**: 1 workshop đã diễn ra; 1 workshop **còn nhiều chỗ**; 1 workshop **còn đúng 1 chỗ**; 1 workshop **đầy và có ≥ 5 người chờ**; 1 workshop online miễn phí; 1 workshop chưa publish |
| Địa điểm | Địa chỉ ở Đà Nẵng có thật (ví dụ Hải Châu, Sơn Trà); online thì có link meet giả |
| Đăng ký | ≥ 80 đăng ký với đủ trạng thái confirmed, waitlisted, cancelled; có lịch sử `registration_events` khớp với trạng thái hiện tại |
| Tính chất | Idempotent; ngày tương đối; số confirmed của mỗi workshop không vượt capacity |
