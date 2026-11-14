# My Admin — Quản lý nhân viên và role

Frontend Angular 22 standalone dùng chung API với `my_agent`. Xem [README gốc](../README.md) để cấu hình database và backend; xem [Backend README](../backend/README.md) để khởi tạo ADMIN đầu tiên.

## Chạy ứng dụng

Chạy trong `my_admin`:

```powershell
npm ci
npm start -- --port 4201
```

Mở [localhost:4201](http://localhost:4201). `src/environments/environment.ts` cấu hình backend là `http://localhost:3000/api`.

Nếu chạy đồng thời agent ở 4200 và admin ở 4201, đặt `FRONTEND_URL=http://localhost:4201` trong `backend/.env`, rồi khởi động lại backend để CORS nhận origin này. Không dùng chung cổng cho hai frontend.

## Route và quyền

- `/login`: đăng nhập bằng mã nhân viên hoặc email.
- `/admin`: danh sách nhân viên active; có AuthGuard kiểm tra phiên.
- Trang gốc chuyển tới `/admin`.
- Chưa có route detail/edit employee hoạt động; route đăng ký trong app admin đang comment.

Nút tạo user và cập nhật role chỉ hiện khi hồ sơ có ADMIN. Backend kiểm tra ADMIN hiện tại từ database cho các API này, không chỉ tin giao diện hoặc token cũ.

Riêng API danh sách `/api/admin/getall` hiện chỉ yêu cầu đăng nhập; AuthGuard cũng chưa phải guard riêng cho ADMIN. API `/api/auth/register` công khai ở backend vẫn là một cách tự đăng ký EMPLOYEE, dù admin app không có trang register.

## Danh sách nhân viên

Hiển thị tên, team hiện tại và các role hiện tại. Backend chỉ lấy employee active; nhân viên chưa có team/role vẫn được trả về. Mỗi dòng có nút **Cập nhật role** nếu người đang đăng nhập có ADMIN.

## Tạo nhân viên kèm user

1. Chọn **+ Tạo user mới**.
2. Nhập mã nhân viên, họ tên, email, mật khẩu và xác nhận mật khẩu.
3. Chọn team nếu cần và ít nhất một role active. EMPLOYEE được chọn sẵn khi có trong danh mục.
4. Chọn **Tạo user**. Dòng mới xuất hiện ngay sau khi API lưu thành công.

Mã nhân viên tối đa 50 ký tự, họ tên 150, email 255; mã/email không được trùng. Mật khẩu từ 8 ký tự và tối đa 72 byte UTF-8. Tài khoản được tạo ACTIVE, mật khẩu băm bcrypt; có thể đăng nhập ngay bằng mã hoặc email.

Employee, account, role và team tùy chọn được lưu cùng một transaction. Luồng này không tự thiết lập task assignment, số dư phép/OFF hay kỳ đăng ký. Vì vậy user mới chưa chắc đã sử dụng được màn hình đăng ký nghỉ.

## Cập nhật role trên từng dòng

1. Chọn **Cập nhật role** tại đúng nhân viên.
2. Phần chỉnh sửa mở ngay dưới dòng, chọn sẵn role hiện có và cho chọn nhiều role bằng checkbox.
3. Chọn **Lưu role** hoặc **Hủy**. Cần ít nhất một role active.

Nhân viên phải có account đăng nhập. Lưu xong cột Role cập nhật ngay; khi lỗi vẫn giữ lựa chọn để thử lại. Không có trang detail riêng cho thao tác này.

Backend khóa account khi cập nhật và giữ lịch sử các grant từ ngày trước. Khi cập nhật chính mình, app refresh phiên. User khác nhận role mới khi refresh hoặc đăng nhập lại; API quản trị luôn kiểm tra quyền ADMIN trực tiếp từ DB để chặn quyền đã thu hồi.

## Cập nhật team

ADMIN chọn **Cập nhật team** trên dòng nhân viên, chọn một team active trong dropdown
và bấm **Lưu team**. **Hủy** đóng phần chỉnh sửa mà không lưu. Cột Team được cập nhật
ngay khi API thành công; khi lỗi vẫn giữ lựa chọn để thử lại. Có thể gán team cho
nhân viên chưa có team hoặc chưa có account đăng nhập.

Mỗi nhân viên chỉ có một team hiện tại qua luồng cập nhật này. Thay đổi có hiệu lực
từ hôm nay: lịch sử cũ kết thúc hôm trước, lần gán cùng ngày được thay thế khi chuyển
team. Các lịch sử trước đó và snapshot của đăng ký đã lưu được giữ nguyên. API khóa
employee trong transaction để các lần cập nhật đồng thời không tạo nhiều team hiện tại.
Nếu có lịch chuyển team trong tương lai, API báo lỗi để xử lý lịch đó trước.

Không cần migration mới. Chức năng này không thiết lập task hoặc số dư phép.

## API được dùng

| Method | Đường dẫn | Quyền |
| --- | --- | --- |
| GET | `/api/admin/getall` | Đăng nhập |
| GET | `/api/admin/users/options` | ADMIN hiện tại |
| POST | `/api/admin/users` | ADMIN hiện tại |
| PATCH | `/api/admin/users/:employeeId/roles` | ADMIN hiện tại |
| PATCH | `/api/admin/users/:employeeId/team` | ADMIN hiện tại |

Body PATCH: `{ "roleIds": [1, 2] }`. `employeeId` là ID nhân viên, không phải ID tài khoản. Team/role ID lấy từ options API, không hardcode.

Body PATCH team: `{ "teamId": 2 }`; bắt buộc một ID nguyên dương, không nhận mảng hoặc null.

## Vị trí code

```text
src/app/features/admin/admin.component.ts              Danh sách và điều phối form
src/app/features/admin/create-user.component.ts         Form tạo user
src/app/features/admin/update-user-roles.component.ts   Form cập nhật role
src/app/features/admin/update-user-team.component.ts    Form chọn một team
src/app/features/auth/login/login.component.ts         Đăng nhập
src/app/core/services/admin.services.ts                HTTP admin API
src/app/core/services/auth.services.ts                 Phiên đăng nhập
src/app/core/models/admin.model.ts                     DTO admin
src/app/core/guards/ và core/interceptors/              Guard và xử lý access/refresh token
```

## Build và kiểm tra

Chạy trong `my_admin`:

```powershell
npm run build
npm test -- --watch=false
```

Test form tạo user và cập nhật role dùng service mock, kiểm tra validation, submit, ngăn gửi trùng và xử lý lỗi. Kiểm tra backend trong thư mục `backend`:

```powershell
node --test src/test-admin-user.js
node --test src/test-admin-team.js
```

Backend test stub model, không xác nhận ghi dữ liệu trên PostgreSQL thật. Hai frontend có cấu hình SSR; output admin là `dist/my_admin`, chạy bằng `npm run serve:ssr:my_admin` sau khi build. Không cần migration mới chỉ để dùng chức năng admin trên schema đã chạy đủ các migration hiện có.
