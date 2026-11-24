# Track `sports-court` — Đặt sân thể thao

**Độ khó:** ★★ (Nhóm A)  
**API contract:** `sports-court.openapi.yaml` (bắt buộc)

## 1. Bối cảnh nghiệp vụ

Một chuỗi sân pickleball và bóng đá mini ở TP.HCM muốn khách tự đặt sân online. Khách chọn sân, ngày, giờ bắt đầu, thời lượng, rồi nhập tên và số điện thoại. Hệ thống tính tiền, giữ chỗ, và trả về mã đặt sân. Khách có thể xem lại hoặc huỷ đơn.

## 2. Quy tắc nghiệp vụ

| Quy tắc | Giá trị |
|---|---|
| Timezone nghiệp vụ | `Asia/Ho_Chi_Minh`. API nhận và trả ISO 8601 có offset; DB lưu UTC |
| Giờ hoạt động | Mỗi cơ sở có `open_time`/`close_time` riêng (ví dụ 05:30–22:30). Booking phải **bắt đầu và kết thúc trong giờ hoạt động** |
| Bước giờ bắt đầu | Phút `:00` hoặc `:30` |
| Thời lượng | 60, 90 hoặc 120 phút |
| Capacity | **1 booking còn hiệu lực trên một sân tại một thời điểm** |
| Khoảng thời gian | Nửa mở `[start, end)`: booking 18:00–19:00 và 19:00–20:00 **không** trùng |
| Đặt trước | Phải bắt đầu sau thời điểm hiện tại ít nhất 30 phút, và trong vòng 30 ngày tới |
| Giá | Theo **block 30 phút** và bảng giá của sân: giờ thường / giờ cao điểm (ví dụ thứ 2–6 17:00–21:00, cả ngày thứ 7 và CN). Tổng tiền = tổng giá các block. **Server tính giá; bỏ qua mọi giá client gửi lên** |
| Trạng thái | `active` → `cancelled` (khách huỷ) · `active` → `completed` (sau giờ kết thúc, có thể tính khi đọc) |
| Huỷ | Chỉ huỷ được khi còn ≥ 2 giờ trước giờ bắt đầu. Sau khi huỷ, khung giờ trống trở lại ngay |
| Truy cập đơn | Cần `id` + `accessToken` (trả về một lần khi tạo đơn). Thiếu hoặc sai token thì **không** được lộ thông tin khách |
| Chống đặt trùng | Gửi lại cùng một request (bấm nút 2 lần) **không** được tạo ra 2 booking |

## 3. Feature P0

| Mã | Feature | Độ phức tạp |
|---|---|:-:|
| F01 | Danh sách cơ sở và sân (loại sân, giờ mở cửa, khoảng giá) | S |
| F02 | Chọn sân + ngày + thời lượng → các khung giờ bắt đầu còn trống, kèm giá từng khung | M |
| F03 | Form đặt sân: tên, SĐT Việt Nam, ghi chú → tạo booking | M |
| F04 | Trang xác nhận (mã đặt, giờ, tổng tiền) + tra cứu bằng mã và token | S |
| F05 | Huỷ booking theo quy tắc huỷ; khung giờ trống trở lại | S |
| F06 | Validate ở server: required, SĐT, thời lượng, bước 30', trong giờ hoạt động, không ở quá khứ, ≤ 30 ngày, sân tồn tại | M |
| F07 | **Không có 2 booking active trùng thời gian trên cùng sân**, kể cả khi nhiều request tới cùng lúc | L |
| F08 | UI states: loading, empty (ngày kín hoặc sân đóng cửa), lỗi mạng, lỗi 409 "vừa có người đặt", thành công | S |

## 4. P1 (chỉ làm sau khi xong P0)

- `P1-01` Lọc booking theo ngày và trạng thái (trang admin đơn giản, có bảo vệ tối thiểu).
- `P1-02` Đổi giờ (reschedule) **một cách nguyên tử**.
- `P1-03` Test concurrency tự động trong CI.
- `P1-04` Accessibility và responsive cho mobile.

## 5. ERD gợi ý (bạn có thể thay đổi nếu giải thích được)

```text
venues (id, name, address, district, open_time, close_time)
  └─< courts (id, venue_id FK, name, sport[pickleball|football_5|football_7], is_active)
        ├─< court_prices (id, court_id FK, day_type[weekday|weekend], start_time, end_time, price_per_30min)
        └─< bookings (id uuid, court_id FK, start_at timestamptz, end_at timestamptz,
                      status[active|cancelled|completed], customer_name, customer_phone,
                      note, total_price int, access_token_hash, idempotency_key?, created_at, cancelled_at)
```

Gợi ý constraint (Postgres):
```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (court_id WITH =, tstzrange(start_at, end_at, '[)') WITH &&)
  WHERE (status = 'active');
ALTER TABLE bookings ADD CONSTRAINT bookings_time_order CHECK (end_at > start_at);
```

## 6. Seed spec

| Dữ liệu | Yêu cầu |
|---|---|
| Cơ sở | 2 cơ sở ở TP.HCM, địa chỉ quận/phường có thật (ví dụ "Sân Pickleball Thảo Điền, 12 Quốc Hương, P. Thảo Điền, TP. Thủ Đức"), giờ mở cửa khác nhau |
| Sân | 6–8 sân: ≥ 4 sân pickleball, ≥ 2 sân bóng đá mini 5 người; có 1 sân `is_active = false` |
| Bảng giá | Mỗi sân có giờ thường + giờ cao điểm + giá cuối tuần, theo giá thị trường (pickleball ~ 60.000–120.000đ/30'; bóng đá 5 người ~ 150.000–300.000đ/30') |
| Booking | ≥ 60 booking trải từ **hôm nay − 7 ngày** tới **hôm nay + 7 ngày**: có `completed` (quá khứ), `active` (tương lai), `cancelled` |
| Khách hàng | Tên người Việt có dấu (đa dạng họ), SĐT giả dạng `09xxxxxxxx` |
| Edge case | (a) Một sân **kín lịch** vào ngày mai từ 17:00–21:00; (b) hai booking **sát nhau** (18:00–19:00 và 19:00–20:00); (c) một booking kết thúc **đúng giờ đóng cửa**; (d) ngày **hôm nay + 10** hoàn toàn trống (để demo); (e) một booking `cancelled` chiếm đúng khung giờ hiện đang trống |
| Tính chất | Idempotent; ngày tương đối so với lúc chạy seed; không có dữ liệu rác |

## 7. Ghi chú API

- Mọi response thành công bọc trong `{ "data": … }`; lỗi theo format chung `{ "error": { code, message, details } }`.
- `GET /api/courts/{courtId}/availability?date=YYYY-MM-DD&duration=60` trả về **mọi khung giờ bắt đầu hợp lệ** trong ngày, mỗi khung có `available: true|false`. Khung giờ trong quá khứ hoặc kéo dài quá giờ đóng cửa sẽ không xuất hiện.
- Mã lỗi gợi ý: `VALIDATION_ERROR`, `OUTSIDE_OPENING_HOURS`, `SLOT_TAKEN`, `TOO_LATE_TO_CANCEL`, `NOT_FOUND`, `UNAUTHORIZED`.
- `POST /api/bookings` có thể nhận header `Idempotency-Key`. Bạn tự quyết định cách chống tạo trùng và giải thích trong `DECISIONS.md`.
