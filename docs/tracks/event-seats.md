# Track `event-seats` — Đặt vé sự kiện có chọn ghế

**Độ khó:** ★★★ (Nhóm B)  
**API contract:** `event-seats.openapi.yaml` (bắt buộc)

## 1. Bối cảnh nghiệp vụ

Một nhà hát nhỏ ở Hà Nội bán vé online cho các buổi diễn: kịch, hoà nhạc, stand-up. Khách xem sơ đồ ghế, chọn một hoặc nhiều ghế, và hệ thống **giữ ghế tạm trong 5 phút**. Trong thời gian đó khách nhập thông tin và xác nhận để có vé. Thanh toán thật nằm ngoài phạm vi: bước xác nhận được coi là đã thanh toán.

## 2. Quy tắc nghiệp vụ

| Quy tắc | Giá trị |
|---|---|
| Timezone | `Asia/Ho_Chi_Minh`; DB lưu UTC |
| Trạng thái ghế (tính theo từng suất diễn) | `available` → `held` (đang giữ, còn hạn) → `sold` (đã xác nhận). Hold hết hạn hoặc đơn bị huỷ thì ghế về `available` |
| Hold | Giữ **1–6 ghế** trong một lần, **tất cả hoặc không ghế nào**: chỉ cần một ghế không còn trống là cả request bị từ chối (409), không giữ một phần |
| TTL | 5 phút kể từ lúc tạo hold. Hold hết hạn thì không xác nhận được nữa (409/422) và ghế trống lại **mà không cần ai dọn**. Trạng thái ghế phải đúng ngay cả khi không có cron job (tính "còn hạn" khi đọc) |
| Thời điểm | Không giữ hay mua vé cho suất diễn đã bắt đầu hoặc đã đóng bán (30 phút trước giờ diễn) |
| Giá | Theo hạng ghế (`standard`, `vip`) của từng suất. **Server tính tổng**, bỏ qua giá client gửi lên |
| Huỷ | Đơn đã xác nhận được huỷ khi còn ≥ 24h trước giờ diễn. Ghế trở về `available` |
| Truy cập | Hold hoặc đơn được truy cập bằng `id` + `accessToken` |
| Chống trùng | Mỗi ghế của một suất tại một thời điểm chỉ thuộc **tối đa một** hold còn hạn **hoặc** một đơn đã xác nhận |

## 3. Feature P0

| Mã | Feature | Độ phức tạp |
|---|---|:-:|
| F01 | Danh sách suất diễn (tên, địa điểm, giờ, khoảng giá, số ghế còn trống) | S |
| F02 | Sơ đồ ghế của suất: trạng thái available/held/sold, giá theo hạng | M |
| F03 | Chọn ghế → tạo hold → nhập tên + SĐT → xác nhận thành đơn | L |
| F04 | Trang vé: mã đơn, ghế, tổng tiền + tra cứu bằng mã và token | S |
| F05 | Huỷ đơn hoặc huỷ hold; hold hết hạn thì ghế tự mở lại | M |
| F06 | Validate ở server: số ghế 1–6, ghế thuộc đúng suất, suất còn mở bán, thông tin khách | M |
| F07 | **Một ghế không bao giờ bị giữ hoặc bán cho 2 người**, kể cả khi nhiều request chạy song song và khi các tập ghế chồng lên nhau | L |
| F08 | UI states: đồng hồ đếm ngược hold, hold hết hạn, "ghế vừa bị người khác chọn", sơ đồ đang tải, suất đã bán hết | M |

## 4. P1

- `P1-01` Lọc suất theo ngày hoặc thể loại; trang admin xem doanh thu một suất.
- `P1-02` Đổi ghế trong đơn đã xác nhận, nguyên tử.
- `P1-03` Test concurrency tự động trong CI (tập ghế chồng nhau).
- `P1-04` Sơ đồ ghế dùng được bằng bàn phím và trên mobile.

## 5. ERD gợi ý

```text
venues (id, name, address)
  └─< seats (id, venue_id FK, row_label, seat_number, tier[standard|vip])   UNIQUE(venue_id,row_label,seat_number)
shows (id, venue_id FK, title, category, starts_at, sales_close_at)
  └─< show_prices (show_id FK, tier, price)                                 PK(show_id,tier)
holds (id uuid, show_id FK, status[active|confirmed|cancelled|expired], expires_at, access_token_hash,
       customer_name?, customer_phone?, total_price, created_at)
  └─< hold_seats (hold_id FK, show_id, seat_id FK)
orders (id uuid, hold_id FK UNIQUE, status[confirmed|cancelled], total_price, confirmed_at, cancelled_at)
```

Gợi ý cách chống bán trùng ghế, chọn một và giải thích trong `DECISIONS.md`:
- Bảng `seat_reservations(show_id, seat_id, hold_id, expires_at, status)` có **unique** `(show_id, seat_id)` cho các bản ghi còn hiệu lực. Hold hết hạn thì phải được giải phóng trong **cùng transaction** với lần giữ mới.
- Hoặc `SELECT … FOR UPDATE` trên các dòng ghế của suất, luôn lock theo **thứ tự cố định** để tránh deadlock.

## 6. Seed spec

| Dữ liệu | Yêu cầu |
|---|---|
| Địa điểm | 1 nhà hát ở Hà Nội, địa chỉ có thật; 8 hàng (A–H) × 12 ghế; hàng A–B là `vip` |
| Suất diễn | 5 suất trong khoảng **hôm nay − 2** tới **hôm nay + 14**: có 1 suất đã diễn, 1 suất **gần hết vé** (≤ 3 ghế trống), 1 suất **hết vé**, 1 suất đã đóng bán, các suất còn lại bán bình thường. Tên chương trình nghe như thật (ví dụ "Hài kịch: Chuyện Phố Phường") |
| Giá | standard 250.000–450.000đ, vip 600.000–1.200.000đ, khác nhau theo suất |
| Đơn | ≥ 40 đơn đã xác nhận + ≥ 5 đơn đã huỷ, khách có tên tiếng Việt, SĐT giả `09…` |
| Hold | ≥ 2 hold **còn hạn** lúc seed (để demo ghế `held`) và ≥ 2 hold **đã hết hạn** (ghế phải hiển thị là trống) |
| Tính chất | Idempotent; mọi ngày tương đối so với lúc chạy seed |

## 7. Ghi chú API

- `POST /api/holds` trả `201` kèm `accessToken` và `expiresAt`. Chỉ cần một ghế không trống là trả `409` với `error.details.unavailableSeatIds`.
- `POST /api/holds/{holdId}/confirm` nhận thông tin khách và trả về đơn (`orderId`). Dùng chung `accessToken` của hold.
- `POST /api/holds/{holdId}/cancel` huỷ hold còn hạn; ghế trở về `available` ngay.
- Mã lỗi gợi ý: `SEATS_UNAVAILABLE`, `HOLD_EXPIRED`, `SALES_CLOSED`, `TOO_MANY_SEATS`, `TOO_LATE_TO_CANCEL`.
