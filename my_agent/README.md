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
| `/approvals` | TEAM_LEAD duyệt/từ chối OFF của nhân viên cùng team hiện tại | API registration/approvals |
| `/history` | Lịch sử cá nhân, lọc kỳ/loại/trạng thái | API registration/history |
| `/published` | Lịch nghỉ đã chốt, bộ lọc và thống kê | API registration/published |
| `/require-hc` | Bảng capacity, bộ lọc và thống kê | API registration/require-hc |

Các trang trong MainLayout được bảo vệ bằng AuthGuard. Trang gốc chuyển tới `/schedule`. Component `home` tồn tại nhưng không phải route hiện hành.

RequireHC trên trang đăng ký lấy từ bootstrap; bảng `/require-hc` gọi API riêng và dùng cùng quy tắc đếm OFF từ database. Hạn mức theo task được dùng chung giữa các team.

## Luồng đăng ký

1. AuthGuard lấy phiên; AuthService giữ access token trong memory, refresh token do cookie HttpOnly quản lý.
2. Schedule gọi bootstrap để lấy employee, team/task, kỳ, loại nghỉ, lý do, số dư và RequireHC.
3. User chọn ngày và loại nghỉ; loại cần lý do phải chọn lý do tương ứng.
4. Client gửi validate, sau đó submit. Backend kiểm tra lại trong transaction trước khi lưu.
   Trong lúc validate, xác nhận modal và submit, các nút chọn/xóa ngày và loại/lý do
   nghỉ bị khóa. Submit dùng đúng bản dữ liệu đã validate, không dựng lại từ danh
   sách đang chỉnh sửa; hủy modal sẽ bỏ bản xác nhận đó.
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

Trang `/history` lọc trực tiếp dữ liệu đã tải theo cả kỳ, loại nghỉ và trạng thái
(kết hợp AND). **Làm mới** gọi lại API và giữ nguyên lựa chọn, kể cả khi kết quả mới
không còn dòng phù hợp; chọn **Tất cả** để bỏ điều kiện tương ứng. Lỗi refresh không
xóa dữ liệu/bộ lọc trước đó. Các ô thống kê phản ánh toàn bộ lịch sử từ API, không
thay đổi theo bộ lọc của bảng. Test backend thống kê: `node --test src/test-history-summary.js`.

- Client có `getMyEntries()` gọi `/api/registration/my-entries`, nhưng backend chưa mount endpoint tương ứng. Đừng nhầm với `/history` đã có API.
- `core/services/wfm-api.service.ts` và `app/wfm-api.service.ts` đều là service mẫu; kiểm tra import của component trước khi sửa.
- Published schedule và RequireHC dùng API thật. TEAM_LEAD có thao tác công bố OFF tại Published; các service mẫu không phải nguồn của thao tác này.
- Quy tắc giao diện và backend có thể khác nhau; validator backend quyết định dữ liệu có được lưu hay không. Đặc biệt rule OFF trước có service riêng nhưng chưa nằm trong validator backend chính.

## Lịch đã công bố

Trang /published dùng PublishedScheduleService gọi GET /api/registration/published
qua HttpClient và auth interceptor. API yêu cầu đăng nhập, trả lịch đã công bố của
tất cả các team, không chỉ lịch của bản thân. Chỉ lấy entry is_active=true và
current_status=PUBLISHED; không lấy PENDING_TL, APPROVED hoặc UNPUBLISHED.
Nếu chưa có lịch công bố thì danh sách rỗng; không quay lại dữ liệu mock.

Kỳ/team/loại nghỉ lọc tại frontend theo AND. Làm mới gọi API và giữ bộ lọc, kể cả
khi kết quả rỗng hoặc lỗi mạng. Ba thống kê đầu tính trên toàn bộ dữ liệu đã tải,
Đang hiển thị tính trên kết quả lọc. Thời điểm công bố lấy action PUBLISHED mới
nhất, hiển thị giờ +07; thiếu action thì hiện dấu gạch ngang, không lấy ngày gửi thay thế.

TEAM_LEAD có phần **Công bố lịch OFF** ngay trên tab Published. Chọn một kỳ,
xem các ngày OFF đã duyệt của nhân viên cùng team hiện tại (loại trừ bản thân),
bấm Công bố lịch OFF rồi xác nhận. Nếu còn PENDING_TL trong phạm vi kỳ/team thì
phải duyệt hoặc từ chối hết trước. Chỉ APPROVED chuyển sang PUBLISHED; REJECTED,
CANCELLED và các đơn đã PUBLISHED được giữ nguyên. ADMIN đơn thuần không có
quyền này. Nút Làm mới tải lại cả lịch đã công bố và danh sách chờ, giữ bộ lọc.
Danh sách thay đổi sau lúc mở xác nhận trả 409, yêu cầu tải và xác nhận lại;
không công bố thêm các đơn chưa có trong bản xem trước. Không cần migration mới.
Test: npm test -- --watch=false --include=src/app/features/published-schedule/published-schedule.spec.ts

## RequireHC

RequireHcService gọi GET /api/registration/require-hc qua HttpClient và auth
interceptor. API chỉ đọc, yêu cầu đăng nhập và trả capacity của tất cả các kỳ/task.
Mỗi dòng là một kỳ/ngày/task từ require_hc. Bảng DB không có team_id, nên UI không
có cột/filter Team và không nhân capacity cho từng team.

Đã đăng ký đếm các entry OFF active theo cùng kỳ/ngày/task, trạng thái PENDING_TL,
APPROVED, PUBLISHED, UNPUBLISHED. Còn lại=max(maxOff-registeredOff,0); full khi
registeredOff>=maxOff, kể cả maxOff=0. Không có cấu hình capacity thì không tạo
ra dòng giả. Các kỳ cũ vẫn được hiển thị và có thể lọc theo kỳ.

Bộ lọc Kỳ/Task/Trạng thái slot kết hợp AND, thực hiện tại frontend. Làm mới gọi lại
API và giữ lựa chọn, kể cả khi kết quả mới rỗng hoặc lỗi mạng. Thống kê tính trên
toàn bộ dữ liệu đã tải; một ngày có nhiều task tương ứng nhiều dòng. Không cần
migration hoặc seed dữ liệu để sử dụng API.

Test frontend: npm test -- --watch=false --include=src/app/features/require-hc/require-hc.spec.ts
Test backend trong backend: node --test src/test-require-hc.js

## Duyệt OFF dành cho Team Lead

Tab Duyệt OFF nằm ngay sau Đăng ký nghỉ, chỉ hiện với role TEAM_LEAD. Route
/approvals có guard; backend kiểm tra lại quyền trực tiếp từ DB cho cả đọc/ghi,
ADMIN đơn thuần không được duyệt. Sau khi được cấp role, đăng xuất/đăng nhập lại
để cập nhật tab. Lead cần đúng một team hiện tại đang active.

Mỗi dòng là một ngày OFF. Chỉ hiển thị các nhân viên active hiện đang cùng team
với lead, loại trừ đơn của lead; team trên đơn vẫn là snapshot lúc đăng ký.
Mặc định lọc Chờ duyệt. Lọc kỳ, trạng thái và tìm mã/tên nhân viên được kết hợp
AND. Làm mới giữ bộ lọc, chặn tải trùng và giữ dữ liệu khi lỗi mạng.

Duyệt/Từ chối mở modal xác nhận, ghi chú tối đa 1000 ký tự; từ chối bắt buộc lý do.
PENDING_TL active được duyệt -> APPROVED hoặc từ chối -> REJECTED. APPROVED vẫn
có nút Từ chối (bắt buộc lý do) trước khi publish; PUBLISHED không thể duyệt/từ
chối nữa. Ghi chú, ngày xử lý, thống kê và danh sách cập nhật khi thành công;
xung đột 409 tải lại danh sách. Không tự động công bố khi duyệt.

## Nhân viên xem kết quả sau công bố

Lịch sử cá nhân vẫn hiển thị OFF đã gửi. Trước khi publish, backend trả OFF
APPROVED dưới trạng thái PENDING_TL (nhãn **Chờ xử lý**), approvedAt=null và tính
vào summary.pending; không đổi trạng thái thật trong DB. Quyết định từ chối vẫn
hiển thị. Khi PUBLISHED, lịch sử hiển thị kết quả công bố và thời điểm đã duyệt.

Schedule có phần **Lịch OFF của tôi đã công bố** độc lập với bootstrap/cửa sổ
đăng ký, vẫn xem được khi cổng đóng hoặc bootstrap chưa tải xong. Gọi
GET /api/registration/published?mine=true; backend xác định chủ đơn từ JWT.
Chỉ hiển thị OFF PUBLISHED, có lọc kỳ và nút Làm mới lịch OFF, giữ lựa chọn khi
rỗng/lỗi. Published tiếp tục là lịch chung PUBLISHED của mọi team.
Không tự đẩy realtime: mở lại trang hoặc bấm Làm mới để nhận kết quả mới.

Từ chối giải phóng số dư OFF và slot ở lần tải tiếp theo do trạng thái REJECTED
không nằm trong ACTIVE_BALANCE_STATUSES. Không sửa snapshot team/task.
Không cần migration/seed. Kiểm tra frontend: npm test -- --watch=false
--include=src/app/features/off-approvals/off-approvals.spec.ts (một dòng lệnh).
