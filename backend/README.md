# Backend — Web Register Off

API Express 5 dùng PostgreSQL qua Sequelize. Chạy lệnh tại thư mục `backend`; xem [README gốc](../README.md) để cấu hình `.env`, dependency và cổng chạy cả hai frontend.

## Cấu trúc và luồng xử lý

```text
src/server.js              Kết nối DB rồi khởi động HTTP server
src/app.js                 CORS, cookie, JSON parser, mount router, error handler
src/routes/                Khai báo endpoint và middleware
src/controllers/           Đọc request, trả response
src/services/              Nghiệp vụ, validation, transaction
src/models/index.js        Khởi tạo model và association dùng lúc runtime
src/config/sequelize.js    Kết nối Sequelize runtime
src/utils/                 Password/JWT, role theo hiệu lực, ngày và tuần
migrations/                Schema qua sequelize-cli
seeders/                   Danh mục và dữ liệu thử
config/config.js           Cấu hình sequelize-cli
.sequelizerc               Đường dẫn cho CLI
models/index.js            Bộ nạp model của CLI; không thay thế src/models/index.js
```

`src/config/database.js` là pool `pg` riêng dùng trong code cũ. Hướng phát triển hiện tại của API auth/admin/registration dùng `src/models` và Sequelize.

## Lệnh

```powershell
npm ci
npx sequelize-cli db:migrate
npx sequelize-cli db:seed --seed 202608020001-seed-master-data.js
npm run dev
```

`npm start` chạy `node src/server.js`; `npm run dev` dùng nodemon. Không có build/transpile cho backend CommonJS. CLI đọc `.env` theo working directory, vì vậy chạy từ `backend`.

Biến cấu hình đọc bởi code: `NODE_ENV`, `PORT` (3000), `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `AUTH_TOKEN_SECRET` (bắt buộc), `FRONTEND_URL`, `ACCESS_TOKEN_TTL_SECONDS` (900), `REFRESH_TOKEN_TTL_SECONDS` (2592000). CLI còn hỗ trợ `DB_TEST_NAME`, `DB_SSL` ở production. Runtime Sequelize chưa áp dụng cấu hình SSL giống CLI; phải đối chiếu trước khi dùng DB yêu cầu SSL.

## API đang được mount

Prefix chung: `/api`. Endpoint cần phiên dùng `Authorization: Bearer <accessToken>`. Endpoint auth refresh/logout đọc cookie `refresh_token`, không đọc refresh token từ body.

| Method | Đường dẫn | Điều kiện / chức năng |
| --- | --- | --- |
| GET | `/health` | Công khai; `databaseReady` phản ánh kết nối lúc khởi động |
| POST | `/auth/register` | Công khai; đăng ký EMPLOYEE |
| POST | `/auth/login` | Công khai; mã nhân viên hoặc email + mật khẩu |
| POST | `/auth/refresh-token` | Cookie refresh; đổi token và trả access token mới |
| POST | `/auth/logout` | Thu hồi refresh token trong cookie và xóa cookie |
| POST | `/auth/forgot-password` | Tạo token đặt lại; gửi email chưa được triển khai |
| POST | `/auth/reset-password` | Token đặt lại + mật khẩu mới |
| GET | `/auth/me` | Đăng nhập; hồ sơ hiện tại |
| GET | `/registration/bootstrap` | Đăng nhập; nhân viên, team/task, kỳ, loại nghỉ, lý do, số dư, capacity |
| POST | `/registration/validate` | Đăng nhập; kiểm tra `cycleId`, `entries` |
| POST | `/registration/submit` | Đăng nhập; validate lại rồi lưu trong transaction |
| GET | `/registration/history` | Đăng nhập; lịch sử của `empId` trong JWT |
| GET | `/registration/approvals` | TEAM_LEAD hiện tại từ DB; OFF của nhân viên cùng team, loại trừ bản thân |
| PATCH | `/registration/approvals/:entryId` | TEAM_LEAD; duyệt/từ chối entry OFF đang PENDING_TL |
| GET | `/registration/published` | Đăng nhập; lịch PUBLISHED đang active của tất cả các team |
| GET | `/registration/require-hc` | Đăng nhập; capacity và số OFF đang chiếm slot theo kỳ/ngày/task |
| GET | `/admin/getall` | Đăng nhập; hiện chưa yêu cầu ADMIN |
| GET | `/admin/users/options` | ADMIN từ DB; team/role active |
| POST | `/admin/users` | ADMIN từ DB; tạo employee, account, role và team tùy chọn |
| PATCH | `/admin/users/:employeeId/roles` | ADMIN từ DB; thay danh sách role hiện tại |
| PATCH | `/admin/users/:employeeId/team` | ADMIN từ DB; gán một team active cho nhân viên |
| PATCH | `/admin/users/:employeeId/task` | ADMIN từ DB; gán một task active cho nhân viên |

Không thêm vào tài liệu API hoạt động chỉ vì thấy một file router hoặc method client: `/registration/my-entries`, calendar/leave-reasons và thao tác công bố chưa có trong tập route được mount. Duyệt/từ chối OFF đã có API approvals.

Ví dụ body (các ID phải tồn tại trong DB của bạn):

```json
{
  "cycleId": 1,
  "entries": [
    { "leaveDate": "2026-08-03", "leaveTypeCode": "A", "reasonId": 1 }
  ]
}
```

```json
{
  "employeeCode": "NV001",
  "fullName": "Nguyễn An",
  "email": "an@example.com",
  "password": "replace-with-user-password",
  "teamId": null,
  "roleIds": [1]
}
```

PATCH role nhận `{ "roleIds": [1, 2] }`; tham số URL là **emp_id**, không phải user_account_id. Role phải active, ít nhất một role; thao tác khóa hàng account và lưu trong transaction. Grant bị bỏ được kết thúc vào hôm trước; grant tạo trong cùng ngày được xóa nếu bỏ để tránh period không hợp lệ. Không tự cấp role còn thiếu trong danh mục.

## Khởi tạo tài khoản và dữ liệu đăng ký

Seed master tạo `EMPLOYEE`, `TEAM_LEAD`, `WFM`, `ADMIN` cùng danh mục loại nghỉ. Seed thử `202608020002-seed-registration-test-data.js` tạo dữ liệu cho E001 và kỳ `2026-08`, không cấp mật khẩu hay quyền ADMIN.

Trên database local mới:

1. Dùng trang `/register` của `my_agent` hoặc POST `/api/auth/register`, body gồm `empCode`, `empName`, `empEmail`, `password` (ít nhất 8 ký tự). Nếu nối account cho employee đã seed, mã và email phải khớp cả hai.
2. Để tạo ADMIN mới, chạy script dưới đây. Nếu account đã tồn tại, người quản lý database có thể cấp role bằng SQL ở bước 3.

```powershell
npm run create:admin -- --code ADMIN001 --name "Quản trị viên" --email admin@example.com
```

Script hỏi mật khẩu ẩn và xác nhận, dùng `createUser` để tạo employee/account/role trong một transaction. Cần schema đã migrate và role ADMIN active từ master seed. Mã/email phải chưa tồn tại; script không đổi mật khẩu hay nâng quyền tài khoản có sẵn. Không cần đăng nhập bằng một ADMIN khác để chạy CLI này. Chạy từ `backend` để đọc đúng `.env`; script không tạo team/task assignment hoặc số dư phép.

Xem hướng dẫn bằng `npm run create:admin -- --help`.

3. Ví dụ SQL dưới đây dành cho database local, thay `YOUR_EMP_CODE` bằng mã của chính tài khoản cần quản trị; câu lệnh không tự chạy khi đọc README:

```sql
INSERT INTO user_roles (user_account_id, role_id, start_date, assigned_at)
SELECT ua.user_account_id, r.role_id, CURRENT_DATE, NOW()
FROM user_accounts ua
JOIN employees e ON e.emp_id = ua.emp_id
JOIN roles r ON r.role_code = 'ADMIN' AND r.is_active = TRUE
WHERE e.emp_code = 'YOUR_EMP_CODE'
  AND NOT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_account_id = ua.user_account_id
      AND ur.role_id = r.role_id
      AND ur.start_date <= CURRENT_DATE
      AND (ur.end_date IS NULL OR ur.end_date >= CURRENT_DATE)
  )
ON CONFLICT (user_account_id, role_id, start_date)
DO UPDATE SET end_date = NULL;
```

Đăng nhập lại sau khi cấp role. Đăng nhập được chưa đồng nghĩa đăng ký nghỉ được: user cần team/task assignment theo thời hạn, kỳ phù hợp, số dư OFF/AL và capacity theo nghiệp vụ. Chức năng tạo user ở admin chỉ tạo thông tin nhân viên, account, role, team tùy chọn; chưa có UI thiết lập các dữ liệu còn lại.

## Cập nhật team nhân viên

Task được cập nhật tương tự team qua `PATCH /api/admin/users/:employeeId/task`,
body `{ "taskId": 1 }`. Service `updateUserTask` khóa employee, yêu cầu task active,
giữ lịch sử `emp_task_histories`, thay assignment cùng ngày và từ chối lịch chuyển
task tương lai bằng `FUTURE_TASK_ASSIGNMENT` (409). Mỗi lần cập nhật chỉ giữ một
task hiện tại; không sửa snapshot đăng ký cũ. Options trả thêm danh sách `tasks`,
danh sách nhân viên trả `taskId`/`taskName`. Test: `node --test src/test-admin-task.js`.

`PATCH /api/admin/users/:employeeId/team` nhận `{ "teamId": 2 }`. API yêu cầu ADMIN,
employee active và team active. Khóa hàng employee trong transaction, kết thúc các
assignment cũ vào hôm trước và gán đúng một team từ hôm nay. Assignment cùng ngày
được xóa khi thay thế; nếu chọn lại team hiện có thì không tạo thêm bản ghi trùng.
Không yêu cầu nhân viên có account. Nếu có assignment trong tương lai, trả 409
`FUTURE_TEAM_ASSIGNMENT` để tránh sửa mất lịch chuyển team đã lên kế hoạch.

Không sửa snapshot team của đăng ký đã lưu. Không có migration/constraint chống
overlap mới; code ghi lịch sử team khác cũng phải khóa employee và tuân thủ quy tắc
một team tại một thời điểm. Test: `node --test src/test-admin-team.js` (stub model).

## Nghiệp vụ đăng ký

Chính sách OFF được thực thi trong `off-rule.service.js` qua validator dùng chung
cho `/validate` và `/submit`. Khi submit, API validate lại trong transaction; ADMIN
không được bỏ qua các giới hạn OFF. Các ngày đã lưu ở trạng thái `PENDING_TL`,
`APPROVED`, `PUBLISHED`, `UNPUBLISHED` và active được gộp với request; ngày bị hủy,
từ chối hoặc inactive không được tính.

- Tối đa 4 OFF/kỳ, đồng thời không vượt số dư được cấp. Được cấp hơn 4 vẫn bị giới hạn 4.
- Tối đa 2 OFF/tuần thứ Hai–Chủ nhật, gồm cả ngày thuộc kỳ liền kề.
- Không OFF 4 Chủ nhật liên tiếp, kể cả qua kỳ.
- Khoảng cách giữa các OFF liền kề trong cùng kỳ không quá 10 ngày lịch. Không xét
  khoảng trống đầu/cuối kỳ, không bắt buộc gửi đủ 4 ngày trong lần đầu.
- RequireHC theo kỳ/ngày/task; thiếu task hoặc capacity cũng bị từ chối.

Submit khóa employee trước khi kiểm tra lịch/số dư, rồi khóa capacity theo thứ tự
ngày trước khi đếm slot. Các luồng sửa trạng thái đăng ký sau này cần dùng khóa
tương ứng để giữ tính nhất quán. Rule sai trả `REGISTRATION_VALIDATION_FAILED`
(HTTP 400 khi submit) kèm `errors`, không ghi đơn. Mã lỗi mới:
`OFF_CYCLE_LIMIT_EXCEEDED`, `OFF_WEEK_LIMIT_EXCEEDED`, `FOUR_CONSECUTIVE_SUNDAYS`,
`OFF_GAP_EXCEEDED`. Giữ các lỗi số dư và RequireHC hiện có.

Test tự động dùng model stub, không ghi DB: `node --test src/test-off-policy.js`.

- Controller lấy `empId` từ JWT, không cho client chỉ định nhân viên thay thế trong body.
- Chuỗi kiểm tra chính nằm trong `registration-validation.service.js`: cấu trúc, ngày trùng trong request/DB, kỳ mở, loại nghỉ active, OFF, AL.
- OFF: ngày trong kỳ, không vượt số dư được cấp và tối đa 4 ngày/kỳ; tối đa 2 ngày/tuần thứ Hai–Chủ nhật, không 4 Chủ nhật liên tiếp, các ngày OFF liền kề trong cùng kỳ cách nhau tối đa 10 ngày, capacity RequireHC theo task/ngày.
- AL: `A` và `A/2` kiểm tra danh mục, ngày trong kỳ, lý do hợp lệ và số dư. Định lượng trừ phép lấy từ model/danh mục; không hardcode một ngày cho mọi loại nghỉ.
- Các trạng thái đang tính vào số đã dùng: `PENDING_TL`, `APPROVED`, `PUBLISHED`, `UNPUBLISHED` trong `leave-balance.service.js`.
- ADMIN bypass kiểm tra cửa sổ/kỳ mở trong validator hiện tại; các rule khác vẫn được gọi. Role của luồng này lấy từ JWT, khác kiểm tra ADMIN trực tiếp DB ở API quản trị.
- Submit validate lại, chuẩn bị snapshot team/task, tạo submission, entry và action trong một transaction. Entry mới mang trạng thái `PENDING_TL`.
- Rule “OFF trước, loại khác sau” có service riêng nhưng chưa được gọi bởi validator chính.

## Auth và giới hạn hiện tại

Password được băm bcrypt. Login/refresh trả access token; refresh token raw chỉ ghi cookie HttpOnly và database giữ hash. Production cookie dùng `secure: true`, `sameSite: none`; local dùng `lax`, cookie path `/api/auth`. Reset password thu hồi refresh token của tài khoản.

`getActiveRoles` lọc role active, start_date và end_date. `requireAdmin` kiểm tra account ACTIVE, employee active và role hiện tại từ DB cho options/create/update-role. Không suy rộng bảo vệ này sang endpoint danh sách hoặc toàn bộ ứng dụng.

Forgot password trả reset token ở môi trường không phải production để phát triển; production chưa gửi mail. Log debug auth hiện còn chứa dữ liệu phiên. Có khác biệt cấu hình/model giữa code cũ và runtime; mọi thay đổi schema cần đối chiếu migrations và association, không dùng `sync({ alter: true })` để thay migration.

## Kiểm tra

```powershell
node --test src/test-admin-user.js
```

Đây là test tự động với model được stub cho tạo user, validation, role history, rollback và phân quyền. Không xác nhận được schema thật hay SQL transaction trên PostgreSQL.

`npm test` hiện chưa cấu hình. Các `src/test-*.js` khác là script kiểm tra từng rule/model, thường dùng employee/cycle/ngày cố định. Đọc từng file trước khi chạy trên database thử riêng; đặc biệt `test-registration-submit.js` ghi dữ liệu. Không có bộ integration/e2e tự động đầy đủ trong repo.

## API đọc lịch công bố

GET /api/registration/published nằm sau authMiddleware. Trả {ok:true, rows:[...]}
theo DTO PublishedScheduleResponse. Đọc entries PUBLISHED active, join submission,
employee, cycle, team theo entry snapshot, leave type và lý do. Không trả email,
token hay thông tin tài khoản. Thời điểm công bố lấy action PUBLISHED mới nhất;
nếu thiếu action thì publishedAt=null. API không duyệt/công bố hay thay đổi DB.
Tất cả user đăng nhập có thể xem lịch đã công bố của các team, phù hợp trang lịch chung.
Test stub model: node --test src/test-published-schedule.js.

## API đọc RequireHC

GET /api/registration/require-hc nằm sau authMiddleware. Trả {ok:true,rows:[...]}
theo DTO RequireHcResponse cho user đã đăng nhập. Lấy require_hc join cycle/task,
sau đó tổng hợp COUNT(entry_id) theo submission.cycle_id, entry.task_id và
entry.leave_date. Chỉ đếm OFF active ở ACTIVE_BALANCE_STATUSES; cùng quy tắc slot
với bootstrap. Không lọc nhân viên/team, không nhân bản capacity theo team.
Không thay đổi DB, không cần migration. Test: node --test src/test-require-hc.js.

## TEAM_LEAD duyệt OFF

GET /api/registration/approvals trả {ok:true,data:{teamId,teamName,rows}}.
PATCH /api/registration/approvals/:entryId nhận {decision:"approve"|"reject",note}.
Lý do từ chối bắt buộc, tối đa 1000 ký tự. Trả {ok,message,data:{entryId,status,
decisionNote,decidedAt}}. Cả hai endpoint có authMiddleware và kiểm tra role
TEAM_LEAD còn hiệu lực từ DB, account ACTIVE, employee active. Không suy quyền
từ ADMIN, không chỉ tin JWT. Hiệu lực role/team ở luồng này tính theo ngày +07.

Phạm vi là nhân viên hiện tại cùng team với lead, căn cứ emp_team_histories
start_date/end_date, không dựa vào team client gửi lên. Lead phải có đúng một
team active; không có hoặc dữ liệu chồng lấn trả 409 INVALID_LEAD_TEAM. Không
cho tự duyệt/từ chối, không xử lý loại nghỉ ngoài OFF hoặc entry inactive.
Team snapshot trên đơn không bị thay khi nhân viên chuyển team.

Chỉ PENDING_TL được duyệt/từ chối. Cập nhật APPROVED/REJECTED và thêm action
TL_APPROVED/TL_REJECTED, old_status=PENDING_TL, new_status tương ứng,
performed_by_user_id là user_account_id của lead, note và created_at trong cùng
transaction. Khóa theo thứ tự employee chủ đơn -> entry -> RequireHC, tương thích
submit. Hai lead xử lý cùng một đơn: lượt sau nhận 409 ENTRY_ALREADY_DECIDED.
Quyền/phạm vi sai trả 403; dữ liệu đầu vào sai trả 400; đơn không tồn tại trả 404.
Không tự publish; không chạy lại validation hạn mức khi duyệt vì PENDING_TL đã
chiếm số dư/slot. REJECTED không còn chiếm số dư/slot.

Test stub model không ghi DB: node --test src/test-off-approval.js.
