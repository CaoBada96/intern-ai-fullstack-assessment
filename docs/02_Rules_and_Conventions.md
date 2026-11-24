# Rules & Conventions (bắt buộc)

Các quy tắc dưới đây áp dụng cho **mọi track** và được kiểm tra một phần bằng công cụ tự động. Hãy chép những phần liên quan vào file instructions cho AI (`AGENTS.md`/`CLAUDE.md`…), để AI cũng làm theo.

---

## 1. Convention theo stack

Bạn tự chọn stack, nhưng **đã chọn thì làm theo convention chính thức** của framework đó. Không được trộn nhiều phong cách lẫn nhau, cũng không được tự nghĩ ra một cấu trúc khác khi framework đã có chuẩn.

| Stack | Cấu trúc chuẩn | Lint / format / type | Migration | Seed |
|---|---|---|---|---|
| Next.js (App Router) + TS | `app/` (routes, `app/api/**/route.ts`), `lib/` hoặc `src/lib/` cho domain logic, `components/` | ESLint (`next lint`/flat config) + Prettier, `tsc --noEmit` | Prisma `prisma/migrations/` hoặc Drizzle `drizzle/` | `prisma/seed.ts` + `prisma db seed`, hoặc script `db:seed` |
| Express / Fastify + TS | `src/routes`, `src/services`, `src/repositories`, `src/schemas` | ESLint + Prettier, `tsc --noEmit` | Prisma / Drizzle / Knex migrations | script `db:seed` |
| NestJS | `src/<module>/{*.module,*.controller,*.service}.ts`, `dto/` dùng class-validator | ESLint + Prettier | Prisma hoặc TypeORM migrations (**không** dùng `synchronize`) | seed script/command |
| Laravel | Chuẩn Laravel: Controller mỏng, `FormRequest` để validate, `Resource` cho response, Eloquent model, `Service`/`Action` cho nghiệp vụ | Laravel Pint, Larastan (khuyến khích) | `database/migrations` | `database/seeders` + `database/factories` |
| Django / DRF | Mỗi domain là một app, `models.py`, `serializers.py`, `views.py`/viewsets, `urls.py` | ruff + black (hoặc ruff format) | `<app>/migrations/` (`makemigrations` phải được commit) | management command `seed_demo` hoặc fixtures |
| FastAPI | `app/routers`, `app/schemas` (Pydantic), `app/models`, `app/services`, `app/db` | ruff + black, mypy (khuyến khích) | Alembic `alembic/versions` (**không** dùng `create_all` khi deploy) | `app/seed.py` hoặc CLI command |
| Spring Boot | `controller` / `service` / `repository` / `dto` / `entity` theo package | Spotless hoặc Checkstyle | Flyway `db/migration/V*__*.sql` hoặc Liquibase | Flyway `R__seed_demo.sql` hoặc `CommandLineRunner` với profile `demo` |

Nếu bạn dùng stack khác, hãy ghi trong `README.md` bạn đang theo convention nào, kèm link tài liệu chính thức.

**Lint, format và type check phải chạy pass** bằng một lệnh khai báo trong `assessment.json`.

## 2. Quy tắc chung cho mọi stack

### API
- REST, danh từ số nhiều: `/api/bookings`, `/api/bookings/{id}`.
- Dùng đúng HTTP status: `201` khi tạo, `400` khi request sai format, `422` khi vi phạm quy tắc nghiệp vụ hoặc validate (`400` cũng chấp nhận), `401/403/404` cho truy cập, `409` khi xung đột tài nguyên (đã có người đặt hoặc hết hàng), `5xx` chỉ dùng cho lỗi thật của server.
- **Mọi lỗi dùng chung một format:**
  ```json
  { "error": { "code": "SLOT_TAKEN", "message": "Khung giờ đã có người đặt", "details": {} } }
  ```
- **Server mới là nguồn tin cậy.** Giá, thời lượng, giờ kết thúc, trạng thái và tồn kho đều do server tính. Nếu client gửi lên `price`, `endTime` hay `status` thì phải bỏ qua hoặc từ chối.
- Không trả stack trace hay thông báo lỗi nội bộ của DB ra client.

### Dữ liệu
- Tên bảng/cột trong DB dùng `snake_case`, tên bảng số nhiều (`bookings`, `court_prices`).
- **Tiền lưu dạng số nguyên VND** (`integer`/`bigint`), không dùng `float`.
- **Thời gian lưu UTC** (`timestamptz` hoặc tương đương), hiển thị theo `Asia/Ho_Chi_Minh`. Ghi rõ chính sách timezone trong README.
- ID của đơn phải khó đoán (UUID/ULID). Thêm **access token** cho đơn theo contract của track.
- Dữ liệu cá nhân (SĐT, email) không được xuất hiện trong log ứng dụng hay trong các API công khai.

### Code
- Tách lớp rõ ràng: **validate input → nghiệp vụ → truy cập DB**. Không để query SQL trong component UI.
- Xử lý lỗi tập trung (error handler/middleware/exception filter), không `try/catch` rồi bỏ qua lỗi.
- Không để code chết, `console.log` debug hay TODO chưa giải thích trong bản nộp.
- Cấu hình qua biến môi trường. Commit `.env.example` và **không bao giờ** commit `.env`.

## 3. Migration (bắt buộc)

1. Schema **chỉ** được tạo và sửa qua **migration có version**, và migration phải được commit vào repo.
   - **Không** dùng các cách tự đồng bộ schema khi chạy thật: `synchronize: true` (TypeORM), `prisma db push`, `Base.metadata.create_all()`, `ddl-auto=update` (Hibernate).
2. **Một lệnh** dựng được schema từ DB rỗng tới bản mới nhất, ví dụ `npm run db:migrate`, `php artisan migrate`, `python manage.py migrate`, `alembic upgrade head`.
3. Có rollback (`down`) nếu framework hỗ trợ.
4. **Không sửa migration đã commit.** Muốn đổi schema thì tạo migration mới. Lịch sử git sẽ được kiểm tra.
5. **Đưa invariant xuống DB khi có thể**, như một lớp bảo vệ cuối cùng:
   - Unique constraint, ví dụ mỗi ghế chỉ có 1 vé còn hiệu lực bằng partial unique index `WHERE status = 'active'`.
   - Exclusion constraint của Postgres để chống trùng khoảng thời gian: `EXCLUDE USING gist (court_id WITH =, tstzrange(start_at, end_at) WITH &&) WHERE (status = 'active')`.
   - Check constraint, ví dụ `stock >= 0` hay `end_at > start_at`.
   - Foreign key có `ON DELETE` hợp lý.

   Nếu DB bạn chọn không hỗ trợ (ví dụ SQLite không có exclusion constraint), hãy giải thích cách thay thế, ví dụ transaction + lock, trong `DECISIONS.md`.
6. Có lệnh `db:reset`: xoá sạch DB, migrate lại từ đầu, rồi seed.

## 4. Seed data (bắt buộc)

Seed data phải **trông như thật** và **dùng được để demo**. Mỗi track có một **seed spec** riêng: số lượng, các trạng thái, edge case.

- **Nội dung thực tế kiểu Việt Nam:** tên người Việt có dấu, SĐT dạng `09xx xxx xxx` (số giả), địa chỉ quận/huyện có thật, giá VND hợp lý, giờ mở cửa hợp lý.
- **Cấm** dữ liệu rác: `lorem ipsum`, `test1`, `asdf`, `foo`, `abc@abc.com`, `Product 1`…
- **Đủ trạng thái** theo state machine (active, cancelled, completed/expired…) và có dữ liệu **cả quá khứ lẫn tương lai**.
- **Ngày tương đối:** sinh dữ liệu theo "hôm nay ± N ngày" để demo không bị hết hạn sau vài ngày.
- **Có sẵn edge case** để demo: tài nguyên kín lịch hoặc hết hàng, ngày trống (để demo empty state), hai booking sát nhau, tồn kho còn đúng 1…
- **Idempotent:** chạy seed lần hai không lỗi và không nhân đôi dữ liệu (dùng upsert hoặc xoá có kiểm soát).
- **Tách riêng** seed demo với fixture/factory của test. Test không được phụ thuộc vào seed demo.
- Có thể dùng Faker (locale `vi`) nhưng phải **cố định seed** để dữ liệu tái lập được.

## 5. Git

- **Conventional Commits:** `feat(F03): create booking endpoint`, `fix(F07): lock court row before insert`, `test(F05): cancel then rebook`, `docs: update README`, `chore: ...`, `refactor: ...`.
  - Ghi mã feature vào phần scope khi commit thuộc về một feature cụ thể.
- **Một branch cho mỗi feature:** `feat/F03-create-booking`, `fix/F07-race-condition`. Merge vào `main` (qua PR là tốt nhất), **không** squash toàn bộ lịch sử thành một commit.
- Commit nhỏ, mỗi commit một ý, code build được. Một commit "add everything" chứa 3.000 dòng là dấu hiệu xấu.
- Commit `ai-logs/` thường xuyên, cùng với code của feature tương ứng.
- `.gitignore` phải loại `.env`, `node_modules`, build output, file DB local.

## 6. Test (bắt buộc)

| Loại | Yêu cầu tối thiểu |
|---|---|
| Unit | Logic nghiệp vụ cốt lõi: tính khung giờ/giá/tồn kho, kiểm tra trùng khoảng thời gian (gồm cả trường hợp **biên sát nhau**), state transition |
| Integration / API | Mỗi endpoint trong contract: happy path + ít nhất 2 case lỗi (validation, not found/forbidden, conflict) |
| Concurrency | **Ít nhất 1 test** gửi N request song song vào cùng tài nguyên, rồi assert chỉ một (hoặc đúng số capacity) request thành công. Test chạy trên DB thật (container/test DB), không mock DB |
| UI (khuyến khích) | 1 luồng E2E (Playwright/Cypress) hoặc component test cho các trạng thái loading/empty/error |

- Test chạy bằng **một lệnh** (khai báo trong `assessment.json`) và không cần secret thật.
- Mỗi bug fix nên đi kèm một test tái hiện bug đó (regression test).
- `TEST_RESULTS.md` ghi kết quả theo dạng **kịch bản → kỳ vọng → thực tế → pass/fail**, có cả các test thủ công.

## 7. Bảo mật

- Không commit secret, token hay mật khẩu, kể cả trong lịch sử git hoặc prompt log.
- Validate mọi input ở server. Validate ở client chỉ để trải nghiệm người dùng tốt hơn.
- Không trả dữ liệu cá nhân khi truy cập đơn bằng ID nếu không có token hợp lệ.
- Dùng query có tham số (ORM hoặc prepared statement), không ghép chuỗi SQL.
- Bật CORS có kiểm soát. Không để `*` kèm credentials.
