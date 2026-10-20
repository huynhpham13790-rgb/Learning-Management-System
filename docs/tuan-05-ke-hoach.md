# Báo cáo tuần 5 — Lên kế hoạch xây dựng hệ thống EduTrack AI

**Kết quả:** Phân tích yêu cầu, tác nhân, use case, thiết kế CSDL, thiết kế API và kế hoạch triển khai.

---

## 1. Mục tiêu hệ thống

Xây dựng hệ thống quản lý học tập trực tuyến giúp:

- Sinh viên học theo khóa học, làm bài tập/trắc nghiệm, theo dõi tiến độ và được AI hỗ trợ cá nhân hóa.
- Giảng viên quản lý nội dung, giảm tải chấm bài nhờ AI và phát hiện gian lận.
- Quản trị viên quản lý người dùng và theo dõi toàn hệ thống.

## 2. Tác nhân

| Tác nhân | Mô tả |
|---|---|
| Khách | Đăng ký, đăng nhập |
| Sinh viên | Học, nộp bài, làm trắc nghiệm, dùng các tính năng AI |
| Giảng viên | Tất cả quyền sinh viên + quản lý khóa học, bài học, bài tập, trắc nghiệm, chấm điểm, thống kê |
| Quản trị viên | Tất cả quyền giảng viên + quản lý người dùng |

## 3. Yêu cầu chức năng

### 3.1. Phía client (sinh viên)

| Mã | Chức năng |
|---|---|
| C01 | Đăng ký, đăng nhập, đăng xuất |
| C02 | Quản lý hồ sơ, mục tiêu học tập, đổi mật khẩu |
| C03 | Xem, tìm kiếm, lọc khóa học (chủ đề, cấp độ) |
| C04 | Ghi danh / hủy ghi danh khóa học |
| C05 | Học bài (văn bản + video), đánh dấu hoàn thành, chuyển bài trước/sau |
| C06 | Nộp bài tập tự luận, xem điểm AI, điểm chính thức và nhận xét |
| C07 | Làm bài trắc nghiệm, xem kết quả và giải thích |
| C08 | **AI gợi ý lộ trình học** |
| C09 | Bảng tổng quan: tiến độ, hoạt động 7 ngày, bài sắp đến hạn |

### 3.2. Phía admin (giảng viên / quản trị)

| Mã | Chức năng |
|---|---|
| A01 | Thống kê tổng quan (số liệu, phổ điểm, bài nộp gần đây) |
| A02 | CRUD khóa học (nháp/công khai) |
| A03 | CRUD bài học |
| A04 | CRUD bài tập + tiêu chí chấm (rubric) |
| A05 | Xem bài nộp, **AI chấm điểm**, xác nhận điểm chính thức |
| A06 | **Phát hiện đạo văn** |
| A07 | CRUD bài trắc nghiệm |
| A08 | Quản lý người dùng (chỉ quản trị viên): thêm/sửa/khóa/xóa, phân quyền |

### 3.3. Yêu cầu phi chức năng

- Bảo mật: mật khẩu băm bcrypt, xác thực JWT, phân quyền theo vai trò ở cả server và client, chống SQL Injection.
- Sẵn sàng: chức năng AI có cơ chế dự phòng khi dịch vụ AI lỗi.
- Giao diện responsive (máy tính, máy tính bảng, điện thoại), tiếng Việt.
- Mã nguồn tách lớp rõ ràng (routes / services / middleware), có unit test.

## 4. Use case tổng quát

```
             ┌──────────────────────── EduTrack AI ────────────────────────┐
 Sinh viên ──┤ Đăng nhập · Học bài · Nộp bài · Làm trắc nghiệm            │
             │ Gợi ý lộ trình (AI) · Trợ lý AI · Thảo luận · Xếp hạng      │
 Giảng viên ─┤ Quản lý khóa/bài học/bài tập/trắc nghiệm                    │
             │ Chấm điểm (AI) · Phát hiện đạo văn · Thống kê · Xuất CSV    │
 Quản trị ───┤ Quản lý người dùng                                          │
             └─────────────────────────────────────────────────────────────┘
```

## 5. Thiết kế cơ sở dữ liệu

Chi tiết: [`database/schema.sql`](../database/schema.sql).

```
users ─┬─< enrollments >── courses ─┬─< lessons ─┬─< lesson_progress >── users
       │                            │            └─< comments
       │                            ├─< assignments ─< submissions >── users
       │                            └─< quizzes ─┬─< quiz_questions
       │                                         └─< quiz_attempts >── users
       ├─< notifications
       ├─< ai_chat_messages
       └─< learning_paths
```

| Bảng | Vai trò | Ghi chú |
|---|---|---|
| `users` | Người dùng | `role` ENUM(admin, teacher, student), `goals` cho AI |
| `courses` | Khóa học | `level`, `published`, `teacher_id` |
| `lessons` | Bài học | `position` sắp thứ tự, `video_url` |
| `enrollments` | Ghi danh | UNIQUE(user, course) |
| `lesson_progress` | Tiến độ | PK(user, lesson), `completed_at` dùng tính streak |
| `assignments` | Bài tập | `rubric` cho AI chấm, `due_date` |
| `submissions` | Bài nộp | `ai_score`, `ai_feedback` (JSON), `score` chính thức, `plagiarism_score`, `status` |
| `quizzes`, `quiz_questions`, `quiz_attempts` | Trắc nghiệm | `options` kiểu JSON |
| `comments` | Thảo luận theo bài học | |
| `notifications` | Thông báo | `link` điều hướng |
| `ai_chat_messages` | Lịch sử chat AI | |
| `learning_paths` | Lộ trình AI đã tạo | `plan` kiểu JSON |

Vòng đời bài nộp: `submitted` → (AI chấm) `ai_graded` → (giảng viên xác nhận) `graded`. Bài đã `graded` không thể nộp lại.

## 6. Thiết kế API

REST, tiền tố `/api`, dữ liệu JSON, xác thực bằng header `Authorization: Bearer <JWT>`. Danh sách đầy đủ: [api.md](api.md).

| Nhóm | Đường dẫn |
|---|---|
| Xác thực | `/api/auth` |
| Khóa học | `/api/courses` |
| Bài học & thảo luận | `/api/lessons` |
| Bài tập & chấm điểm | `/api/assignments` |
| Trắc nghiệm | `/api/quizzes` |
| AI | `/api/ai` |
| Thông báo | `/api/notifications` |
| Thống kê | `/api/stats` |
| Người dùng | `/api/users` |

## 7. Kế hoạch triển khai

| Giai đoạn | Công việc | Sản phẩm |
|---|---|---|
| Tuần 5 | Phân tích yêu cầu, thiết kế CSDL & API, dựng khung dự án | Tài liệu này, `schema.sql` |
| Tuần 6 | Xây dựng giao diện client & admin | Layout, các trang React |
| Tuần 7 | Xây dựng chức năng, tích hợp AI, kiểm thử | API hoàn chỉnh, unit test, smoke test |
| Mở rộng | Trợ lý AI, sinh câu hỏi, thông báo, xếp hạng… | [chuc-nang-mo-rong.md](chuc-nang-mo-rong.md) |

## 8. Rủi ro & hướng xử lý

| Rủi ro | Giải pháp |
|---|---|
| Dịch vụ AI lỗi / hết hạn mức | Fallback mock tự động |
| AI chấm sai | AI chỉ chấm sơ bộ; giảng viên xác nhận điểm cuối |
| AI trả dữ liệu sai định dạng | Ép JSON + bóc tách an toàn + kẹp giá trị điểm |
| Lộ dữ liệu bài làm | Phát hiện đạo văn chạy cục bộ; API key chỉ ở server |
