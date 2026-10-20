# Báo cáo tuần 6 — Xây dựng giao diện client và admin

**Kết quả:** Ứng dụng React SPA gồm 14 trang phía client và 6 trang phía admin, giao diện responsive, tiếng Việt.

---

## 1. Tổ chức mã nguồn frontend

```
client/src/
├── api/client.js           # fetch wrapper: gắn JWT, xử lý lỗi, tải file
├── context/AuthContext.jsx # trạng thái đăng nhập toàn cục
├── components/
│   ├── Layout.jsx          # sidebar + topbar + chuông thông báo
│   └── ui.jsx              # useFetch, Loader, Modal, ProgressBar, Stat, Badge, AiFeedback...
├── pages/                  # trang phía client (sinh viên)
└── pages/admin/            # trang phía admin
```

## 2. Hệ thống thiết kế

- **Màu chủ đạo** indigo `#4f46e5` (khu vực AI, nút chính), xanh lá (hoàn thành/đạt), cam (cảnh báo), đỏ (lỗi/đạo văn cao). Khai báo bằng biến CSS trong `:root`.
- **Thành phần dùng chung**: `card`, `btn` (primary/ghost/danger/small), `badge` (ok/warn/danger/light), `progress`, `table`, `modal`, `alert`.
- **Bố cục**: sidebar tối cố định bên trái + topbar (menu, thông báo, người dùng, đăng xuất).
- **Responsive**: dưới 860px sidebar thành menu trượt (nút ☰), lưới 2 cột chuyển 1 cột, toolbar tự xuống dòng.

## 3. Điều hướng & phân quyền giao diện

`App.jsx` dùng React Router với component `RequireAuth`:

- Chưa đăng nhập → chuyển `/login`.
- Route `/admin/*` chỉ cho `admin`, `teacher`; `/admin/users` chỉ cho `admin`.
- Sidebar chỉ hiện mục “Quản trị” khi người dùng là giảng viên/quản trị.

## 4. Các màn hình phía client

| Đường dẫn | Màn hình | Thành phần chính |
|---|---|---|
| `/login`, `/register` | Đăng nhập / Đăng ký | Form, hiển thị tài khoản mẫu |
| `/` | Tổng quan | 4 thẻ số liệu, tiến độ từng khóa, biểu đồ hoạt động 7 ngày, bài sắp đến hạn, CTA lộ trình AI |
| `/courses` | Danh sách khóa học | Tìm kiếm, lọc chủ đề/cấp độ, lưới thẻ khóa học + thanh tiến độ |
| `/courses/:id` | Chi tiết khóa học | Hero + nút ghi danh, danh sách bài học (✔ đã học), bài tập, trắc nghiệm |
| `/lessons/:id` | Học bài | Video YouTube nhúng, nội dung, nút hoàn thành, bài trước/sau, khu thảo luận |
| `/assignments` | Bài tập của tôi | Bảng: hạn nộp, trạng thái (chưa nộp/quá hạn/AI chấm/đã chấm), điểm |
| `/assignments/:id` | Làm bài tập | Đề + rubric, ô nhập bài + đếm từ, kết quả AI, độ trùng lặp, điểm chính thức |
| `/quizzes/:id` | Làm trắc nghiệm | Câu hỏi radio, kết quả tô màu đúng/sai + giải thích, lịch sử |
| `/learning-path` | Lộ trình AI | Nhập mục tiêu, timeline các bước, lời khuyên |
| `/tutor` | Trợ lý AI | Giao diện chat, gợi ý câu hỏi, xóa lịch sử |
| `/leaderboard` | Xếp hạng | Bảng điểm, huy chương top 3, tô sáng bản thân |
| `/profile` | Hồ sơ | Sửa thông tin, mục tiêu, đổi mật khẩu |

## 5. Các màn hình phía admin

| Đường dẫn | Màn hình | Thành phần chính |
|---|---|---|
| `/admin` | Thống kê | 5 thẻ số liệu, top khóa học, phổ điểm, bài nộp gần đây + badge đạo văn |
| `/admin/courses` | Khóa học & bài giảng | Bảng khóa học, modal sửa, modal quản lý bài học, nút xuất CSV |
| `/admin/assignments` | Bài tập | Bảng bài tập (số bài nộp, chờ duyệt), modal tạo/sửa + rubric + hạn nộp |
| `/admin/assignments/:id` | Chấm bài | Bảng bài nộp (điểm AI, điểm chính thức, % trùng ↔ bài nguồn), nút quét đạo văn, modal xem bài + chấm lại AI + xác nhận điểm |
| `/admin/quizzes` | Trắc nghiệm | Bảng (số câu, lượt làm, điểm TB), trình soạn câu hỏi + **sinh câu hỏi bằng AI** |
| `/admin/users` | Người dùng | Tìm kiếm, lọc vai trò, modal thêm/sửa, khóa tài khoản |

## 6. Kỹ thuật giao diện đáng chú ý

- **`useFetch(fn, deps)`**: hook tự viết quản lý `loading / error / data`, có `reload()` và `setData()` để cập nhật lạc quan (optimistic) không cần tải lại.
- **`<Loader state>{data => ...}</Loader>`**: render‑prop thống nhất hiển thị “Đang tải…” / lỗi.
- **Biểu đồ cột thuần CSS** (hoạt động 7 ngày, phổ điểm) — không cần thư viện chart.
- **Chuông thông báo** tự làm mới 30 giây/lần, bấm vào thông báo → đánh dấu đã đọc và điều hướng tới `link`.
- **Badge đạo văn** đổi màu theo mức: < 20% xanh, 20–40% cam, ≥ 40% đỏ.
