# Web Register Off

Ứng dụng đăng ký lịch nghỉ và quản lý nhân viên, gồm hai frontend Angular dùng chung một API Express/PostgreSQL. Tài liệu này mô tả code hiện tại, gồm cả phần đã nối API và phần còn dùng dữ liệu mẫu.

## Cấu trúc

| Thư mục | Vai trò | Công nghệ chính |
| --- | --- | --- |
| `backend/` | Xác thực, nhân viên, role, kỳ đăng ký, kiểm tra và lưu lịch nghỉ | Node.js, Express 5, Sequelize 6, PostgreSQL, bcrypt, JWT |
| `my_agent/` | Giao diện nhân viên: đăng ký, lịch sử, lịch đã chốt, RequireHC | Angular 22, TypeScript 6, RxJS, Tailwind CSS 4 |
| `my_admin/` | Danh sách nhân viên, tạo tài khoản, cập nhật role | Angular 22, TypeScript 6, RxJS, Tailwind CSS 4 |

Ba thư mục có `package.json` và lockfile riêng. `package.json` ở root chỉ có dependency `tailwind`, không có script chạy toàn bộ hệ thống và không phải npm workspace.

Tài liệu chi tiết: [Backend](backend/README.md), [My Agent](my_agent/README.md), [My Admin](my_admin/README.md). Hướng dẫn cho coding agent nằm trong [AGENTS.md](AGENTS.md).

## Chức năng hiện có

| Chức năng | Trạng thái trong code |
| --- | --- |
| Đăng ký, đăng nhập, refresh phiên, đăng xuất | API thật; `my_agent` có trang đăng ký, `my_admin` có trang đăng nhập |
| Quên/đặt lại mật khẩu | Có API; gửi email hướng dẫn vẫn là TODO |
| Bootstrap, validate, submit lịch nghỉ | API thật; giao diện `/schedule` đang gọi API |
| Lịch sử đăng ký của bản thân | `/history` gọi API thật |
| Lịch đã chốt `/published` | API thật `GET /api/registration/published`, chỉ entry active có trạng thái PUBLISHED |
| RequireHC `/require-hc` | API thật `GET /api/registration/require-hc`; capacity và số OFF đã đăng ký theo kỳ/ngày/task |
| Danh sách nhân viên ở admin | API thật, lấy nhân viên đang active, team hiện tại và role theo thời hạn |
| Tạo nhân viên kèm tài khoản | API thật, yêu cầu ADMIN; chưa tự tạo task assignment hay số dư phép/OFF |
| Cập nhật nhiều role cho user | API thật, yêu cầu ADMIN; chọn ngay dưới từng dòng trong danh sách |
| Cập nhật team cho nhân viên | API thật, yêu cầu ADMIN; dropdown chọn một team, lưu lịch sử chuyển team |
| Cập nhật task cho nhân viên | API thật, yêu cầu ADMIN; dropdown chọn một task, lưu lịch sử chuyển task |
| Duyệt TL / công bố lịch | Chưa có route API được mount để thực hiện; không coi các hàm mock là chức năng production |

## Chạy local

### 1. Chuẩn bị

- Node.js tương thích Angular đang cài: `^22.22.3`, `^24.15.0` hoặc `>=26.0.0` (theo package Angular trong dự án).
- npm; frontend khai báo `packageManager: npm@11.17.0`.
- PostgreSQL đang chạy, một database đã tạo và user có quyền tạo bảng.

Các lệnh bên dưới dùng PowerShell, bắt đầu từ root repository. Cài dependency từng ứng dụng:

```powershell
Push-Location backend
npm ci
Pop-Location
Push-Location my_agent
npm ci
Pop-Location
Push-Location my_admin
npm ci
Pop-Location
```

### 2. Cấu hình backend

Tạo `backend/.env` bằng cấu hình local của bạn. Ví dụ bên dưới chỉ là giá trị mẫu; thay mật khẩu và secret trước khi chạy:

```dotenv
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=web_register_off
DB_USER=postgres
DB_PASSWORD=replace-with-local-password
AUTH_TOKEN_SECRET=replace-with-a-long-random-secret
FRONTEND_URL=http://localhost:4201
ACCESS_TOKEN_TTL_SECONDS=900
REFRESH_TOKEN_TTL_SECONDS=2592000
```

Phải khai báo `DB_PORT` rõ ràng: runtime Sequelize mặc định `5432`, trong khi cấu hình CLI và pool `pg` cũ mặc định `5433`. `AUTH_TOKEN_SECRET` thiếu sẽ khiến module auth báo lỗi ngay khi nạp.

API cho phép CORS từ `localhost:4200` và `127.0.0.1:4200`; cấu hình `FRONTEND_URL=http://localhost:4201` để chạy admin ở cổng thứ hai. Dùng cùng hostname `localhost` cho frontend và backend khi kiểm tra refresh cookie.

### 3. Khởi tạo database

Chỉ chạy trên database local đã chọn trong `.env`:

```powershell
Set-Location backend
npx sequelize-cli db:migrate
npx sequelize-cli db:seed --seed 202608020001-seed-master-data.js
# Tùy chọn: dữ liệu thử cho đăng ký lịch nghỉ
npx sequelize-cli db:seed --seed 202608020002-seed-registration-test-data.js
```

Master seed tạo role và danh mục loại nghỉ. Seed thử tạo nhân viên `E001`, team/task, assignment, số dư, RequireHC, lý do nghỉ và kỳ `2026-08`; không tạo sẵn tài khoản đăng nhập hay ADMIN. Kỳ mẫu có thời gian mở cố định trong năm 2026, không tự dịch theo ngày chạy. Xem [hướng dẫn tài khoản đầu tiên và dữ liệu đăng ký](backend/README.md#khởi-tạo-tài-khoản-và-dữ-liệu-đăng-ký).

Tạo ADMIN mới sau khi migrate và seed master, chạy trong `backend`:

```powershell
npm run create:admin -- --code ADMIN001 --name "Quản trị viên" --email admin@example.com
```

Nhập mật khẩu ẩn và xác nhận khi được hỏi. Script dùng `.env`, tạo user mới và không thay đổi account có sẵn.

### 4. Chạy ba tiến trình

Mỗi block chạy trong một terminal riêng, bắt đầu từ root:

```powershell
Set-Location backend
npm run dev
```

```powershell
Set-Location my_agent
npm start -- --port 4200
```

```powershell
Set-Location my_admin
npm start -- --port 4201
```

- Agent: [localhost:4200](http://localhost:4200).
- Admin: [localhost:4201](http://localhost:4201).
- Health: [localhost:3000/api/health](http://localhost:3000/api/health). Kiểm tra cả `databaseReady`; server vẫn lắng nghe nếu kết nối DB thất bại.

Hai frontend cấu hình `environment.apiUrl` là `http://localhost:3000/api`. Riêng `my_agent` còn hardcode URL trong `core/services/registration.service.ts`; đổi host API phải kiểm tra cả chỗ này.

## Quyền và phiên đăng nhập

Các role trong master seed là `EMPLOYEE`, `TEAM_LEAD`, `WFM`, `ADMIN`. Một tài khoản có thể có nhiều role.

- Tạo user, lấy tùy chọn team/role và cập nhật role yêu cầu ADMIN hiện tại từ database, tài khoản ACTIVE và nhân viên active.
- Danh sách nhân viên `/api/admin/getall` hiện chỉ yêu cầu đăng nhập, chưa có kiểm tra ADMIN. `AuthGuard` ở trang admin cũng chỉ kiểm tra phiên.
- API `/api/auth/register` vẫn công khai, tạo tài khoản với role EMPLOYEE. Quy tắc “chỉ ADMIN được tạo user” áp dụng cho luồng quản trị, không phải mọi cách tạo tài khoản.
- Access token giữ trong memory frontend; refresh token ở cookie HttpOnly. Login/refresh luân chuyển refresh token và database lưu hash.
- Role theo thời hạn được lọc khi login/refresh. Các API quản trị được bảo vệ bằng kiểm tra database; luồng đăng ký lịch nghỉ vẫn lấy role từ JWT.
- Cập nhật role của chính mình sẽ refresh phiên trong admin. User khác nhận role mới ở lần refresh hoặc đăng nhập tiếp theo.

## Build và kiểm tra

Chạy trong từng frontend:

```powershell
npm run build
npm test -- --watch=false
```

Hai frontend có cấu hình SSR; kết quả build nằm trong `dist/my_agent` và `dist/my_admin`. Các script `serve:ssr:*` chạy server build tương ứng. Chưa có cấu hình triển khai production hoàn chỉnh trong repository.

Test tự động backend cho user/role, chạy trong `backend`:

```powershell
node --test src/test-admin-user.js
```

Test này stub các thao tác model, không ghi database. `npm test` backend hiện là placeholder luôn báo lỗi. Các file `src/test-*.js` còn lại chủ yếu là script kiểm tra thủ công, nhiều file kết nối DB và dùng ID/ngày cố định; `test-registration-submit.js` có ghi dữ liệu. Không chạy toàn bộ chúng như một bộ unit test hoặc trên database thật của người dùng.

## Những điểm cần lưu ý khi tiếp tục phát triển

- Client gọi `/api/registration/my-entries`, nhưng backend chưa khai báo route này.
- `calendar.routes.js` và `leave-reason.routes.js` tồn tại nhưng chưa được mount trong `src/app.js`.
- `registration-phase-rule.service.js` có rule OFF trước, nhưng chưa được gọi trong chuỗi validate chính; không coi là quy tắc đã được backend đảm bảo.
- Ngày mở/đóng đăng ký thực tế lấy từ bảng kỳ đăng ký; không suy ra từ hằng số ngày 17–23 hoặc dữ liệu mock.
- Có code cũ song song: model `User` không phải model auth đang dùng; có hai `WfmApiService` dùng dữ liệu mẫu và hai nơi khởi tạo model cho CLI/runtime.
- Một số log debug hiện có in token/thông tin phiên. Cần xử lý trước khi triển khai production; không sao chép log đó vào tài liệu hoặc issue.
- Test `my_agent/src/app/app.spec.ts` vẫn kiểm tra tiêu đề Angular mẫu; cần đối chiếu template khi gặp lỗi test này.

Đây là các giới hạn đọc được từ source, không phải xác nhận đã kiểm thử tích hợp trên database thực tế.
