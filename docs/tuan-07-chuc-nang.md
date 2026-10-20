# Báo cáo tuần 7 — Xây dựng chức năng cho giao diện client và trang admin

**Kết quả:** REST API hoàn chỉnh (≈ 50 endpoint), kết nối toàn bộ giao diện; tích hợp 3 chức năng AI cốt lõi; unit test và kiểm thử tích hợp.

---

## 1. Tổ chức mã nguồn backend

```
server/src/
├── config/        env.js (biến môi trường), db.js (pool MySQL, query/queryOne)
├── middleware/    auth.js (JWT, authorize, isStaff), error.js (404, xử lý lỗi tập trung)
├── routes/        auth, courses, lessons, assignments, quizzes, ai, notifications, stats, users
├── services/      ai.js, plagiarism.js, notify.js
├── scripts/       initDb.js, seed.js
├── utils/http.js  HttpError, asyncHandler, requireFields, parseJson
├── app.js         tạo Express app (tách khỏi index.js để dễ test)
└── index.js       khởi động server
```

Mẫu xử lý thống nhất: route → `asyncHandler` bắt lỗi → ném `HttpError(status, message)` → `errorHandler` trả JSON `{ message }`. Lỗi trùng khóa MySQL (`ER_DUP_ENTRY`) tự chuyển thành 409.

## 2. Chức năng phía client (sinh viên)

### 2.1. Xác thực & hồ sơ
- Đăng ký (kiểm tra trùng email, mật khẩu ≥ 6 ký tự, băm bcrypt), đăng nhập (chặn tài khoản bị khóa), lấy/sửa hồ sơ, đổi mật khẩu (xác minh mật khẩu cũ).
- Client lưu JWT trong localStorage; token hết hạn → tự đăng xuất và về `/login`.

### 2.2. Khóa học & bài học
- Danh sách khóa học kèm số bài học, số học viên, trạng thái ghi danh, % tiến độ — tính trong **một truy vấn** bằng subquery.
- Sinh viên chỉ thấy khóa `published`; chỉ xem nội dung bài học khi đã ghi danh (server trả 403).
- Đánh dấu hoàn thành / bỏ hoàn thành bài học; điều hướng bài trước/sau.

### 2.3. Bài tập
Luồng nộp bài (`POST /api/assignments/:id/submit`):

1. Kiểm tra đã ghi danh, chưa quá hạn, chưa được giảng viên chấm chính thức.
2. Lưu bài (`INSERT ... ON DUPLICATE KEY UPDATE` → hỗ trợ nộp lại).
3. **Kiểm tra đạo văn** với mọi bài nộp khác cùng bài tập.
4. **AI chấm sơ bộ** → lưu `ai_score`, `ai_feedback`, trạng thái `ai_graded`.
5. Gửi thông báo cho sinh viên; nếu trùng lặp ≥ ngưỡng → cảnh báo giảng viên.

### 2.4. Trắc nghiệm
- API trả đề **ẩn đáp án** với sinh viên.
- Chấm trên server (thang 10), trả chi tiết từng câu + giải thích; lưu lịch sử lần làm.

### 2.5. Gợi ý lộ trình AI
- Tổng hợp mục tiêu, tiến độ từng khóa, điểm trắc nghiệm TB → gọi AI → lưu `learning_paths`.

### 2.6. Tổng quan cá nhân
- Tiến độ từng khóa, điểm TB, bài sắp đến hạn chưa nộp, số bài học hoàn thành 7 ngày, **chuỗi ngày học liên tiếp**.

## 3. Chức năng phía admin

| Chức năng | Endpoint chính | Ghi chú |
|---|---|---|
| Thống kê | `GET /api/stats/admin` | Đếm tổng hợp, top khóa học, phổ điểm, bài nộp gần đây |
| Khóa học | `POST/PUT/DELETE /api/courses` | Thêm bài học → thông báo cho học viên đã ghi danh |
| Bài học | `POST /api/courses/:id/lessons`, `PUT/DELETE /api/lessons/:id` | Tự tính `position` |
| Bài tập | `POST/PUT/DELETE /api/assignments` | Tạo mới → thông báo học viên |
| Chấm bài | `GET /:id/submissions`, `POST /submissions/:sid/ai-grade`, `PUT /submissions/:sid/grade` | Kiểm tra điểm trong thang; thông báo kết quả |
| Đạo văn | `POST /api/assignments/:id/plagiarism-scan` | Quét lại toàn bộ bài nộp |
| Trắc nghiệm | `POST/PUT/DELETE /api/quizzes` | Dùng **transaction** khi lưu đề + câu hỏi |
| Người dùng | `/api/users` (chỉ admin) | Không cho tự xóa/tự hạ quyền/tự khóa |

## 4. Bảo mật đã áp dụng

- Băm mật khẩu bcrypt (10 vòng), không bao giờ trả `password_hash` ra API.
- JWT có hạn (mặc định 7 ngày).
- Phân quyền ở **server** (middleware `authorize`) — giao diện chỉ ẩn/hiện, không phải lớp bảo vệ chính.
- Truy vấn tham số hóa chống SQL Injection; giới hạn body JSON 1MB; CORS chỉ cho phép origin của client.
- Ẩn chi tiết lỗi 5xx khỏi người dùng (chỉ ghi log server).

## 5. Kiểm thử

### 5.1. Unit test (`npm test`, 8 test – đều đạt)
- Chuẩn hóa văn bản tiếng Việt; similarity giống hệt = 100, khác chủ đề < 10.
- `findMostSimilar` tìm đúng bài nguồn bị sao chép (> 60%).
- Chấm điểm mock: bài đủ ý > bài sơ sài; điểm luôn trong thang.
- Lộ trình mock ưu tiên khóa khớp mục tiêu, bỏ khóa đã hoàn thành.
- Sinh câu hỏi mock đúng số lượng; tính streak chính xác.

### 5.2. Kiểm thử tích hợp API (MySQL 8 thật + dữ liệu mẫu)
Đã chạy kịch bản ~70 request qua tất cả endpoint, kết quả **đạt toàn bộ**, gồm các trường hợp:

| Kịch bản | Kết quả mong đợi | Đạt |
|---|---|---|
| Đăng nhập sai mật khẩu / tài khoản bị khóa | 401 / 403 | ✔ |
| Đăng ký email trùng | 409 | ✔ |
| Xem bài học khi chưa ghi danh | 403 | ✔ |
| Sinh viên gọi API quản trị | 403 | ✔ |
| Bài chép của bạn + 1 câu | Trùng lặp 95,6%, chỉ đúng bài nguồn | ✔ |
| Chấm điểm vượt thang | 400 | ✔ |
| Nộp lại bài đã chấm chính thức | 400 | ✔ |
| Đề trắc nghiệm phía sinh viên | Không chứa đáp án | ✔ |
| Khóa nháp với sinh viên | 404 | ✔ |
| Xuất CSV | Có BOM UTF‑8, đúng tiếng Việt | ✔ |
