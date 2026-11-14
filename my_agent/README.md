# My Agent — Giao diện nhân viên

Frontend Angular 22 standalone cho đăng ký lịch nghỉ. Xem [README gốc](../README.md) để cài đặt database, backend và cấu hình cả hệ thống.

## Chạy ứng dụng

Chạy lệnh từ `my_agent`:

```powershell
npm ci
npm start -- --port 4200
```

Mở [localhost:4200](http://localhost:4200). Backend mặc định tại `http://localhost:3000/api`.

- `src/environments/environment.ts` cấu hình URL cho auth.
- `src/app/core/services/registration.service.ts` còn hardcode URL API registration; phải cập nhật cùng khi đổi host.
- Dùng hostname thống nhất và bật CORS phía backend cho origin frontend để refresh cookie hoạt động.

## Màn hình và nguồn dữ liệu

| Route | Chức năng | Nguồn dữ liệu |
| --- | --- | --- |
| `/login` | Đăng nhập bằng mã nhân viên hoặc email | API auth |
| `/register` | Tự đăng ký tài khoản EMPLOYEE | API auth công khai |
| `/schedule` | Xem kỳ, chọn ngày/loại nghỉ/lý do, xác nhận và gửi | API registration |
| `/history` | Lịch sử cá nhân, lọc kỳ/loại/trạng thái | API registration/history |
| `/published` | Lịch nghỉ đã chốt, bộ lọc và thống kê | PublishedScheduleMockService |
| `/require-hc` | Bảng capacity, bộ lọc và thống kê | RequireHcMockService |

Các trang trong MainLayout được bảo vệ bằng AuthGuard. Trang gốc chuyển tới `/schedule`. Component `home` tồn tại nhưng không phải route hiện hành.

RequireHC trong màn hình đăng ký lấy từ bootstrap API thật, khác với trang bảng `/require-hc` đang dùng mock. Không dùng dữ liệu mock để kết luận số dư hoặc slot còn lại trong database.

## Luồng đăng ký

1. AuthGuard lấy phiên; AuthService giữ access token trong memory, refresh token do cookie HttpOnly quản lý.
2. Schedule gọi bootstrap để lấy employee, team/task, kỳ, loại nghỉ, lý do, số dư và RequireHC.
3. User chọn ngày và loại nghỉ; loại cần lý do phải chọn lý do tương ứng.
4. Client gửi validate, sau đó submit. Backend kiểm tra lại trong transaction trước khi lưu.
5. Lịch đã lưu được xem qua trang history.

User mới cần thêm dữ liệu nghiệp vụ: team/task assignment theo hiệu lực, kỳ đăng ký, số dư OFF/AL và RequireHC. Chỉ có tài khoản đăng nhập chưa đủ để sử dụng trọn luồng.

## Cấu trúc code

```text
src/app/core/models/        DTO auth, registration và các màn hình
src/app/core/services/      AuthService, RegistrationService và mock services
src/app/core/guards/        Kiểm tra phiên
src/app/core/interceptors/  Gắn access token, xử lý 401 và refresh
src/app/layout/             MainLayout và menu
src/app/features/           auth, schedule, history, published-schedule, require-hc
src/app/app.routes.ts       Route thực tế
src/app/app.config.ts       Router, HTTP client và interceptor
```

Các component con của schedule gồm lịch chọn ngày, danh sách đã chọn, modal xác nhận và banner trạng thái.

## Build và test

```powershell
npm run build
npm test -- --watch=false
```

Output build: `dist/my_agent`. Có cấu hình SSR, chạy server đã build bằng:

```powershell
npm run serve:ssr:my_agent
```

Đây không phải cấu hình triển khai production hoàn chỉnh. Không có bộ e2e được cấu hình sẵn. Test `app.spec.ts` còn kỳ vọng tiêu đề Angular mẫu, trong khi app dùng router outlet; cần đối chiếu khi xử lý lỗi test có sẵn.

## Phần chưa hoàn chỉnh

- Client có `getMyEntries()` gọi `/api/registration/my-entries`, nhưng backend chưa mount endpoint tương ứng. Đừng nhầm với `/history` đã có API.
- `core/services/wfm-api.service.ts` và `app/wfm-api.service.ts` đều là service mẫu; kiểm tra import của component trước khi sửa.
- Published schedule và bảng RequireHC chưa nối API thật; các hàm duyệt/công bố trong service mẫu không chứng minh backend có chức năng đó.
- Quy tắc giao diện và backend có thể khác nhau; validator backend quyết định dữ liệu có được lưu hay không. Đặc biệt rule OFF trước có service riêng nhưng chưa nằm trong validator backend chính.
