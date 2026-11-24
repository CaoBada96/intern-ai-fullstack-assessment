# Danh mục topic

Mọi topic có chung khung feature `F01–F08` (xem Brief mục 3). Cái khác nhau là **invariant cốt lõi**: quy tắc nghiệp vụ không được phép bị phá, kể cả khi có nhiều request tới cùng lúc.

**Cách giao đề:** coach chỉ định **nhóm độ khó**, ứng viên chọn một topic trong nhóm đó. Chỉ những topic có track pack đầy đủ (✅) mới được dùng để giao đề.

## Nhóm A (★ – ★★)

| Track ID | Topic | Invariant cốt lõi | Điểm khó | Pack |
|---|---|---|---|:-:|
| `sports-court` | Đặt sân thể thao (pickleball / bóng đá mini) | Không trùng khung giờ trên cùng một sân | Giá giờ cao điểm do server tính; hai khung giờ sát nhau vẫn hợp lệ; không vượt giờ đóng cửa | ✅ |
| `salon-booking` | Đặt lịch spa / salon / barber | Không trùng giờ của cùng một nhân viên | Dịch vụ có thời lượng khác nhau; lịch kéo dài quá giờ đóng cửa | ⏳ |
| `meeting-room` | Đặt phòng họp nội bộ | Không trùng giờ trên cùng phòng; số người ≤ sức chứa | Chỉ trong giờ làm việc; booking lặp lại (P1) | ⏳ |
| `restaurant-table` | Đặt bàn nhà hàng | Tổng số khách theo khung giờ ≤ sức chứa | Chọn bàn phù hợp số khách; no-show | ⏳ |
| `vehicle-rental` | Thuê xe / homestay | Không trùng khoảng ngày trên cùng xe/phòng | Ngày trả trùng ngày nhận của đơn sau vẫn hợp lệ; giá theo ngày/đêm | ⏳ |
| `canteen-preorder` | Đặt cơm canteen trước | Số suất mỗi món ≤ giới hạn | Hết giờ cut-off (theo timezone) thì không được đặt hay huỷ | ⏳ |
| `equipment-loan` | Mượn thiết bị / sách | Một món chỉ có một lượt mượn đang hoạt động | Quá hạn, gia hạn | ⏳ |

## Nhóm B (★★★)

| Track ID | Topic | Invariant cốt lõi | Điểm khó | Pack |
|---|---|---|---|:-:|
| `event-seats` | Đặt vé sự kiện / rạp phim có chọn ghế | Một ghế chỉ được bán một lần | **Giữ ghế tạm có TTL**; chọn nhiều ghế thì được tất cả hoặc không được ghế nào; hết hạn giữ thì ghế tự mở lại | ✅ |
| `flash-sale` | E-commerce flash sale | Tồn kho không âm, không bán vượt tồn kho | Giá và giảm giá do server tính; mã giảm giá có giới hạn lượt; huỷ đơn thì hoàn kho | ✅ |
| `workshop-waitlist` | Đăng ký workshop / khoá học có danh sách chờ | Số người đã xác nhận ≤ capacity | Khi có người huỷ, người đầu danh sách chờ tự được lên, đúng thứ tự | ✅ |
| `clinic-queue` | Phòng khám: lấy số thứ tự | Mỗi ca tối đa N bệnh nhân; số thứ tự không trùng | Đổi lịch phải nguyên tử; dữ liệu bệnh nhân nhạy cảm | ⏳ |
| `loyalty-points` | Đổi điểm thưởng | Số dư không âm khi đổi đồng thời | **Idempotency key**; sổ cái (ledger) | ⏳ |

✅ = có đầy đủ track pack và OpenAPI, dùng được để giao đề. ⏳ = mới có mô tả, chưa dùng để giao đề.
