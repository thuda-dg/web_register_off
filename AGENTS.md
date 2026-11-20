# Hướng dẫn làm việc trong repository

Áp dụng cho toàn repository. Giao tiếp và tài liệu người dùng ưu tiên tiếng Việt. Đọc README gốc và README của ứng dụng liên quan trước khi sửa; đối chiếu source khi tài liệu và code khác nhau.

## Bản đồ code

- `backend`: Express 5, CommonJS, Sequelize 6/PostgreSQL. Luồng chính: routes → controllers → services → `src/models`.
- `my_agent`: Angular 22 standalone, TypeScript 6, RxJS, Tailwind 4. Đăng ký, lịch sử, published và RequireHC đều nối API thật; các mock service cũ không phải nguồn dữ liệu của các route này.
- `my_admin`: Angular 22 standalone. Danh sách nhân viên, tạo user, cập nhật role ngay trong danh sách.
- Mỗi ứng dụng có dependency/lockfile riêng. Chạy npm từ đúng thư mục; không coi root là npm workspace.
- `backend/src/models/index.js` là model registry runtime. `backend/models/index.js` là scaffold CLI. Không sửa nhầm hoặc đăng ký thêm model `User` cũ cho luồng auth hiện tại.
- Không sửa file sinh ra trong `node_modules`, `dist`, `.angular`.

## Trước và trong khi sửa

1. Kiểm tra `git status`, giữ nguyên thay đổi đang có của người dùng.
2. Tìm luồng đang được sử dụng từ `src/app.js` và `app.routes.ts`; sự tồn tại của file không chứng minh code được gọi.
3. Với API, đọc cả route/middleware, controller, service, model/migration và client DTO tương ứng.
4. Giữ phạm vi sát yêu cầu. Tách bạch phần sửa với lỗi có sẵn; không tự mở rộng thành refactor toàn bộ code cũ.
5. Không đọc/in nội dung `.env`, mật khẩu, token hoặc log nhạy cảm để đưa vào phản hồi. Tài liệu chỉ dùng placeholder.

## Backend và dữ liệu

- Nghiệp vụ nằm trong services; controller xử lý HTTP. Giữ kiểu response hiện có (`ok`, `message`, `code` và DTO), không buộc mọi endpoint dùng chung một envelope mới.
- Nhận diện nhân viên từ JWT ở API cá nhân; không tin `empId` client gửi khi API không cho phép thao tác thay người khác.
- Tạo user/cập nhật role yêu cầu `authMiddleware` + `requireAdmin`. Kiểm tra quyền backend là bắt buộc dù giao diện đã ẩn nút.
- Role theo thời hạn phải lọc role active, `start_date <= today`, `end_date` null hoặc còn hiệu lực. Dùng `getActiveRoles` trong auth; không trả lại grant lịch sử như quyền hiện tại.
- Tạo/gán user chỉ nhận đúng một role (roleIds dài 1); DTO/auth vẫn giữ mảng roles để tương thích và giữ lịch sử grant. Không tự đổi grant cũ trong DB; giữ Admin của vienvietvo. Không nhầm `emp_id` với `user_account_id`.
- Team update yêu cầu ADMIN và đúng một team active. Khóa employee trong transaction, kết thúc assignment cũ trước ngày bắt đầu mới; xử lý lần gán cùng ngày và không tạo overlap. Không tự ghi đè lịch chuyển team tương lai hoặc snapshot đăng ký đã lưu.
- Role update giữ lịch sử grant trước ngày hiện tại, xử lý grant cùng ngày và khóa account trong transaction. Tạo employee/account/role/team và submit submission/entry/action đều cần transaction thống nhất.
- Password dùng util bcrypt; không lưu/trả plaintext. Access token ở memory client, refresh token ở HttpOnly cookie, DB giữ hash. Không thêm token vào localStorage hoặc log.
- Khi đổi schema, thêm migration mới và cập nhật model/association. Không sửa migration đã triển khai hoặc dùng Sequelize sync alter/force để thay quy trình migration.
- Database có thể chứa dữ liệu thật. Không chạy seed, migration, undo, reset hoặc script ghi DB để kiểm tra một thay đổi không cần đến chúng. Nếu công việc cần thay dữ liệu, xác định đúng database và phạm vi trước.

## Angular

- Theo cấu trúc standalone và template control flow hiện có (`@if`, `@for`). Dùng signal cho state mới khi phù hợp với component đang sửa; giữ Reactive Forms cho form user.
- API nằm ở service, DTO nằm ở `core/models`. Cập nhật client/backend cùng nhau khi thay contract.
- Có trạng thái loading/saving/error/success, ngăn gửi trùng, giữ dữ liệu form khi lỗi, cho hủy/thử lại phù hợp.
- Có SSR và cấu hình zoneless: không đọc `window`, storage hoặc DOM ở server mà không có guard phù hợp. Dùng signal hoặc cơ chế change detection sẵn có khi cập nhật async.
- Giữ interceptor tránh vòng lặp refresh đối với auth endpoint. Login/refresh/logout cần credentials để dùng cookie.
- Đổi API host phải kiểm tra `environment.ts` ở cả hai app và URL hardcode trong `my_agent/core/services/registration.service.ts`.
- Không biến mock thành thông tin nghiệp vụ thật trong UI/tài liệu. Khi nối API, kiểm tra import thực tế; có hai `WfmApiService` mẫu khác đường dẫn.

## Nghiệp vụ cần giữ

- Validator backend là nơi quyết định chấp nhận đăng ký; frontend kiểm tra trước chỉ hỗ trợ trải nghiệm.
- OFF kiểm tra kỳ, số dư, tối đa 4 ngày/kỳ, 2 ngày/tuần thứ Hai–Chủ nhật, không 4 Chủ nhật liên tiếp, khoảng cách các ngày OFF liền kề trong cùng kỳ tối đa 10 ngày và RequireHC theo task/ngày. Gộp ngày đã lưu và request; tuần/chuỗi Chủ nhật xét cả kỳ liền kề. Submit khóa employee rồi capacity để tránh hai yêu cầu cùng vượt hạn mức.
- AL `A`/`A/2` kiểm tra ngày, lý do và số dư; định lượng từ danh mục.
- Đối chiếu `ACTIVE_BALANCE_STATUSES` khi đổi trạng thái đăng ký để tránh sai số dư/capacity.
- Cửa sổ đăng ký lấy từ database. Không dùng hằng số hoặc ngày seed làm lịch hiện hành.
- Rule OFF trước hiện chưa nằm trong chuỗi validate chính. Nếu yêu cầu thay đổi điều này, nối rõ vào luồng và kiểm tra cả backend/frontend, không giả định đã áp dụng.
- Với ngày DATEONLY, giữ `YYYY-MM-DD`. Code hiện trộn cách tính local/UTC: kiểm tra biên ngày, tuần, năm và múi giờ khi sửa, tránh đổi ngày ngoài ý muốn.

## Kiểm tra theo phạm vi thay đổi

Trong frontend có thay đổi:

```powershell
npm run build
npm test -- --watch=false
```

Trong backend, cho user/role:

```powershell
node --test src/test-admin-user.js
node --test src/test-admin-team.js
```

- `backend/npm test` là placeholder, không phải bộ kiểm tra hợp lệ.
- Không chạy glob toàn bộ `backend/src/test-*.js`: đa số là script thủ công dùng DB/ID/ngày cố định; submit test ghi dữ liệu.
- Test admin backend stub model, không thay thế integration test trên DB thử. Không tuyên bố đã kiểm tra DB nếu chỉ chạy test này.
- `my_agent/app.spec.ts` còn kỳ vọng tiêu đề mẫu; nếu thất bại cần phân biệt lỗi test cũ với regression do thay đổi.
- Với sửa tài liệu thuần túy, kiểm tra liên kết, đường dẫn, lệnh và `git diff --check`; không cần chạy lại build/test không liên quan.
- Không thêm test chỉ lặp lại chi tiết triển khai cho thay đổi nhỏ; tập trung hành vi, validation, phân quyền và transaction khi cần.

## Tài liệu và bàn giao

- Cập nhật README khi đổi cách chạy, env, API, quyền hoặc mức hoàn thiện chức năng.
- Nêu chính xác route đã mount và tính năng mock/chưa nối; `/registration/my-entries` đang thiếu route, calendar/leave-reasons chưa mount. Duyệt/từ chối OFF dùng `/registration/approvals`, công bố dùng `POST /registration/published`; chỉ TEAM_LEAD từ DB, nhân viên cùng team hiện tại và loại trừ bản thân. APPROVED được từ chối trước publish; PUBLISHED không đổi quyết định. Lịch sử cá nhân che kết quả duyệt OFF đến khi công bố; Schedule dùng GET published?mine=true lấy chủ đơn từ JWT.
- API đăng ký tài khoản vẫn công khai; `/admin/getall` yêu cầu ADMIN hiện tại từ DB. Không mô tả toàn bộ hệ thống là ADMIN-only.
- Báo rõ đã sửa gì, đã kiểm tra gì và giới hạn còn lại. Không nói build/test thành công nếu chưa chạy hoặc chưa thấy kết quả.
