# Báo cáo tuần 2 — Tìm hiểu các công nghệ sử dụng trong dự án

**Nội dung:** Tìm hiểu Node.js, Express, React, MySQL.
**Kết quả:** Tài liệu mô tả công nghệ; lý do lựa chọn; cách áp dụng vào EduTrack AI.

---

## 1. Node.js

- Môi trường chạy JavaScript phía máy chủ, xây dựng trên engine V8 của Chrome.
- Mô hình **I/O không chặn (non‑blocking)** và **event loop** đơn luồng: phù hợp ứng dụng web nhiều request I/O (truy vấn CSDL, gọi API AI) hơn là tính toán nặng.
- Hệ sinh thái **npm** lớn nhất thế giới.
- Dùng chung một ngôn ngữ (JavaScript) cho cả frontend và backend → giảm chi phí học và chuyển đổi ngữ cảnh.

Các tính năng Node.js dùng trong dự án:

| Tính năng | Áp dụng |
|---|---|
| ES Modules (`"type": "module"`) | `import/export` toàn bộ server |
| `fetch` tích hợp sẵn (Node ≥ 18) | Gọi API Gemini/OpenAI không cần thư viện |
| `node --test` | Chạy unit test không cần Jest/Mocha |
| `node --watch` | Tự khởi động lại server khi dev |

## 2. Express

Framework web tối giản cho Node.js. Khái niệm chính:

- **Routing**: ánh xạ `METHOD + path` tới handler, tách module bằng `express.Router()`.
- **Middleware**: hàm `(req, res, next)` chạy theo chuỗi — dùng cho CORS, parse JSON, xác thực, phân quyền, xử lý lỗi.
- **Error handler**: middleware 4 tham số `(err, req, res, next)`.

Ví dụ áp dụng trong dự án (`server/src/middleware/auth.js`):

```js
export const authorize = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new HttpError(403, 'Bạn không có quyền thực hiện thao tác này'));
  }
  next();
};
router.post('/', isStaff, asyncHandler(async (req, res) => { ... }));
```

Thư viện đi kèm: `cors`, `dotenv` (biến môi trường), `jsonwebtoken` (JWT), `bcryptjs` (băm mật khẩu), `mysql2` (driver MySQL hỗ trợ Promise).

### Xác thực JWT

1. Người dùng đăng nhập → server kiểm tra mật khẩu (bcrypt) → ký token chứa `{id, role, name}`.
2. Client lưu token (localStorage) và gửi kèm header `Authorization: Bearer <token>`.
3. Middleware `authenticate` xác minh chữ ký và gắn `req.user`.

Ưu điểm: stateless, không cần lưu session trên server, dễ mở rộng.

## 3. React

Thư viện xây dựng giao diện theo **component**.

| Khái niệm | Ý nghĩa | Ví dụ trong dự án |
|---|---|---|
| JSX | Cú pháp giống HTML trong JS | Mọi trang trong `client/src/pages` |
| Props | Dữ liệu truyền từ cha → con | `<ProgressBar value={c.progress} />` |
| State (`useState`) | Dữ liệu thay đổi → render lại | Form đăng nhập, câu trả lời trắc nghiệm |
| Effect (`useEffect`) | Hiệu ứng phụ: gọi API, timer | Tải thông báo mỗi 30 giây |
| Context | Chia sẻ dữ liệu toàn cục | `AuthContext` lưu người dùng đăng nhập |
| Custom hook | Tái sử dụng logic | `useFetch()` tải dữ liệu + trạng thái loading/error |
| React Router | Điều hướng SPA | `App.jsx` định nghĩa route, `RequireAuth` bảo vệ route |

Công cụ build: **Vite** — khởi động dev server nhanh (ESM gốc), HMR, cấu hình proxy `/api` sang backend để tránh lỗi CORS khi phát triển.

## 4. MySQL

Hệ quản trị CSDL quan hệ mã nguồn mở.

- Lưu dữ liệu dạng bảng, liên kết qua **khóa chính / khóa ngoại** (`FOREIGN KEY ... ON DELETE CASCADE`).
- Ràng buộc `UNIQUE` chống trùng (ví dụ một sinh viên chỉ ghi danh một khóa một lần: `UNIQUE (user_id, course_id)`).
- Kiểu `JSON` (MySQL ≥ 5.7) lưu dữ liệu bán cấu trúc: lựa chọn trắc nghiệm, lộ trình học do AI sinh.
- **Transaction** đảm bảo toàn vẹn khi tạo bài trắc nghiệm kèm nhiều câu hỏi.
- Bộ ký tự `utf8mb4` để lưu đầy đủ tiếng Việt và emoji.

Kỹ thuật truy vấn sử dụng: `JOIN`, `LEFT JOIN`, subquery, `GROUP BY` + hàm tổng hợp (`COUNT`, `AVG`, `MAX`), `INSERT ... ON DUPLICATE KEY UPDATE` (nộp lại bài), `INSERT IGNORE`.

**Bảo mật:** mọi truy vấn dùng tham số `?` (prepared statement) của `mysql2` để chống SQL Injection.

## 5. Kiến trúc tổng thể

```
┌────────────────────┐   HTTP/JSON   ┌──────────────────────┐   SQL   ┌─────────┐
│  React SPA (Vite)  │ ────────────▶ │  Express REST API    │ ──────▶ │ MySQL 8 │
│  client + admin    │ ◀──────────── │  JWT, phân quyền     │         └─────────┘
└────────────────────┘               │  services/ai.js ─────┼──▶ Gemini / GPT‑4o
                                     │  services/plagiarism │
                                     └──────────────────────┘
```

## 6. Lý do lựa chọn

- Toàn bộ stack dùng JavaScript → một ngôn ngữ, dễ bảo trì.
- Express + React là bộ đôi phổ biến, tài liệu và cộng đồng lớn.
- MySQL ổn định, quen thuộc, phù hợp dữ liệu quan hệ rõ ràng (người dùng – khóa học – bài học – bài nộp).
