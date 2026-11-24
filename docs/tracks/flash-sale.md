# Track `flash-sale` — Đặt hàng flash sale

**Độ khó:** ★★★ (Nhóm B)  
**API contract:** `flash-sale.openapi.yaml` (bắt buộc)

## 1. Bối cảnh nghiệp vụ

Một shop đồ gia dụng chạy chương trình **flash sale** theo khung giờ (ví dụ 12:00–14:00). Sản phẩm sale có số lượng giới hạn. Khách thêm sản phẩm vào đơn, nhập thông tin giao hàng và đặt hàng (COD, không thanh toán online). Hệ thống phải đảm bảo **không bán vượt tồn kho**, kể cả khi hàng trăm người bấm "Đặt hàng" cùng lúc.

## 2. Quy tắc nghiệp vụ

| Quy tắc | Giá trị |
|---|---|
| Timezone | `Asia/Ho_Chi_Minh`; DB lưu UTC |
| Giá | Trong khung sale (`sale_starts_at ≤ now < sale_ends_at`) dùng `sale_price`, ngoài khung dùng `price`. **Server tính** đơn giá, tạm tính, giảm giá, phí ship và tổng; bỏ qua mọi giá client gửi lên |
| Tồn kho | `stock` không bao giờ âm. Đặt hàng là trừ kho **ngay**. Chỉ cần một dòng trong đơn không đủ hàng là cả đơn bị từ chối (409), **không** bán một phần |
| Giới hạn | Mỗi dòng có số lượng 1–5. Đơn có 1–10 dòng; mỗi sản phẩm chỉ xuất hiện một lần |
| Mã giảm giá | `percent` hoặc `fixed`, có `min_subtotal`, `max_discount`, `usage_limit` (tổng lượt dùng) và hạn dùng. Dùng một lượt là tăng `used_count`, và `used_count ≤ usage_limit` **kể cả khi có request đồng thời** |
| Phí ship | 30.000đ, miễn phí khi tạm tính ≥ 500.000đ |
| Trạng thái đơn | `placed` → `cancelled` (khách huỷ khi chưa giao) · `placed` → `shipped` (admin, P1) |
| Huỷ | Hoàn lại tồn kho **và** lượt dùng mã giảm giá trong cùng một transaction |
| Truy cập | `id` + `accessToken` |
| Chống trùng | Gửi lại cùng request (có `Idempotency-Key`) không được tạo 2 đơn |

## 3. Feature P0

| Mã | Feature | Độ phức tạp |
|---|---|:-:|
| F01 | Danh sách sản phẩm: giá gốc, giá sale, thời gian sale còn lại, tồn kho ("còn 3") | S |
| F02 | Chi tiết sản phẩm và giỏ hàng phía client, có tồn kho cập nhật | M |
| F03 | Checkout: tên, SĐT, địa chỉ, mã giảm giá (tuỳ chọn) → đặt hàng | L |
| F04 | Trang xác nhận đơn + tra cứu bằng mã và token | S |
| F05 | Huỷ đơn → hoàn kho + hoàn lượt dùng mã | M |
| F06 | Validate ở server: số lượng, sản phẩm tồn tại, mã giảm giá hợp lệ, thông tin giao hàng | M |
| F07 | **Không bán vượt tồn kho và không dùng mã giảm giá vượt giới hạn** khi có nhiều request đồng thời | L |
| F08 | UI states: hết hàng, "chỉ còn N", lỗi 409 khi đặt hàng, mã giảm giá không hợp lệ, loading khi checkout | S |

## 4. P1

- `P1-01` Trang admin: danh sách đơn, lọc theo trạng thái.
- `P1-02` Đổi số lượng trong đơn chưa giao, nguyên tử.
- `P1-03` Load test hoặc concurrency test tự động.
- `P1-04` Responsive và accessibility cho trang checkout.

## 5. ERD gợi ý

```text
categories (id, name, slug)
products (id, category_id FK, sku UNIQUE, name, description, image_url, price, sale_price?, sale_starts_at?, sale_ends_at?,
          stock int CHECK (stock >= 0), is_active)
coupons (id, code UNIQUE, type[percent|fixed], value, min_subtotal, max_discount?, usage_limit, used_count CHECK (used_count <= usage_limit),
         starts_at, ends_at)
orders (id uuid, status[placed|cancelled|shipped], customer_name, customer_phone, address, coupon_id FK?,
        subtotal, discount, shipping_fee, total, access_token_hash, idempotency_key UNIQUE?, created_at, cancelled_at)
order_items (id, order_id FK, product_id FK, quantity CHECK (quantity BETWEEN 1 AND 5), unit_price, line_total)
```

Gợi ý: trừ kho bằng `UPDATE products SET stock = stock - $q WHERE id = $id AND stock >= $q` rồi kiểm tra số dòng bị ảnh hưởng, trong cùng transaction với việc tạo đơn. Một cách khác là `SELECT … FOR UPDATE` theo thứ tự `product_id`. Hãy giải thích lựa chọn của bạn.

## 6. Seed spec

| Dữ liệu | Yêu cầu |
|---|---|
| Danh mục | 4–5 danh mục gia dụng (Nhà bếp, Phòng tắm, Điện gia dụng…) |
| Sản phẩm | ≥ 24 sản phẩm, tên và giá thực tế ("Nồi chiên không dầu 5L" 1.290.000đ → sale 890.000đ), có ảnh (URL placeholder hợp lệ hoặc ảnh trong `public/`) |
| Flash sale | ≥ 6 sản phẩm đang trong khung sale lúc seed (now − 1h tới now + 23h); ≥ 2 sản phẩm sắp sale; ≥ 2 sản phẩm sale đã kết thúc |
| Tồn kho | Có sản phẩm **hết hàng** (0), sản phẩm **còn 1**, sản phẩm **còn 5–20** đang sale, và sản phẩm tồn kho lớn |
| Mã giảm giá | ≥ 4 mã: còn hiệu lực, đã hết hạn, đã hết lượt (`used_count = usage_limit`), và có điều kiện `min_subtotal` |
| Đơn | ≥ 30 đơn (placed/cancelled/shipped), khách tên tiếng Việt, địa chỉ quận/huyện có thật, SĐT giả |
| Tính chất | Idempotent, ngày tương đối; tổng tiền của các đơn seed phải khớp với quy tắc tính giá |
