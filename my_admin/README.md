# MyAdmin

## Tạo user mới

Đăng nhập bằng tài khoản có role `ADMIN`, mở trang quản lý nhân viên và chọn
**+ Tạo user mới**. Nhập mã nhân viên, họ tên, email, mật khẩu và xác nhận mật khẩu;
chọn team (không bắt buộc) và ít nhất một role. Role `EMPLOYEE` được chọn sẵn nếu có.
Sau khi tạo thành công, user xuất hiện trong danh sách và có thể đăng nhập bằng
mã nhân viên hoặc email.

Backend cần chạy phiên bản có `GET /api/admin/users/options` và
`POST /api/admin/users`. Hai API yêu cầu quyền `ADMIN`. Chức năng dùng các bảng
hiện có, không cần migration mới. Mã nhân viên và email phải chưa tồn tại.

Kiểm tra frontend: chạy `npm test -- --watch=false` trong `my_admin`.
Kiểm tra backend: chạy `node --test src/test-admin-user.js` trong `backend`.

## Cập nhật role

Với tài khoản `ADMIN`, chọn **Cập nhật role** trên dòng nhân viên, đánh dấu các
role muốn gán rồi chọn **Lưu role**. Có thể chọn nhiều role; cần giữ ít nhất một
role đang hoạt động. **Hủy** đóng phần chỉnh sửa mà không lưu.
Nhân viên phải có tài khoản đăng nhập để được gán role.

API: `PATCH /api/admin/users/:employeeId/roles`, body `{ "roleIds": [1, 2] }`.
Role cũ được kết thúc hiệu lực; các lần gán từ ngày trước vẫn được giữ trong lịch sử.
Phiên của user nhận role mới khi refresh token hoặc đăng nhập lại. Khi cập nhật role
của chính mình, app tự refresh phiên. API quản trị luôn kiểm tra quyền hiện tại từ
database, nên quyền ADMIN bị thu hồi không tiếp tục truy cập bằng token cũ.

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.0.6.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
