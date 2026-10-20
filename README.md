# 🎓 EduTrack AI — Hệ thống quản lý học tập tích hợp AI

Đề tài thực tập tốt nghiệp tại **Công ty Cổ phần Công nghệ TFL**.
Sinh viên: **Đặng Thị Thương** (DTC235200735 – CNTT K22K) · Cán bộ hướng dẫn: Lê Anh Duy.

EduTrack AI là hệ thống LMS (Learning Management System) gồm trang **client** cho sinh viên và trang **admin** cho giảng viên/quản trị, tích hợp AI (**Groq** — mặc định, hoặc Gemini / GPT‑4o) để:

- 🧭 **Gợi ý lộ trình học** cá nhân hóa theo mục tiêu và tiến độ.
- 🤖 **Tự động chấm điểm** bài tự luận theo tiêu chí (rubric), kèm nhận xét điểm mạnh / cần cải thiện.
- 🔍 **Phát hiện đạo văn** giữa các bài nộp (n‑gram + cosine, chạy cục bộ).

Chức năng mở rộng: trợ lý học tập AI (chat), AI sinh câu hỏi trắc nghiệm, bài kiểm tra trắc nghiệm chấm tự động, thảo luận theo bài học, thông báo, bảng xếp hạng, chuỗi ngày học, xuất bảng điểm CSV.

## Công nghệ

| Tầng | Công nghệ |
|---|---|
| Frontend | React 18, React Router 6, Vite 5, CSS thuần (responsive) |
| Backend | Node.js ≥ 18, Express 4, JWT, bcryptjs |
| CSDL | MySQL 8 (mysql2/promise) |
| AI | Groq (`openai/gpt-oss-120b`, mặc định), Google Gemini, OpenAI GPT‑4o (REST), chế độ `mock` chạy offline |

## Cấu trúc thư mục

```
├── client/            # React (Vite) – giao diện sinh viên + admin
│   └── src/{api,components,context,pages,pages/admin}
├── server/            # Express REST API
│   ├── src/{config,middleware,routes,services,scripts}
│   └── tests/         # Unit test (node:test)
├── database/
│   ├── schema.sql     # cấu trúc bảng
│   └── edutrack.sql   # CSDL đầy đủ + dữ liệu mẫu, import thẳng vào MySQL/XAMPP
└── docs/              # Tài liệu & báo cáo theo tuần
```

## Cài đặt & chạy

> 👉 **Người mới / máy chưa cài gì:** làm theo [HUONG-DAN-CAI-DAT.md](HUONG-DAN-CAI-DAT.md) — chỉ cần cài Node.js, MySQL rồi nhấp đúp `setup.bat` và `start.bat`.

Cài thủ công:

Yêu cầu: Node.js ≥ 18, MySQL 8 hoặc XAMPP (MariaDB ≥ 10.4).

Có thể nhập sẵn dữ liệu bằng `database/edutrack.sql` (phpMyAdmin → Import) thay cho `db:init` + `db:seed`.

```bash
# 1. Backend
cd server
cp .env.example .env          # sửa DB_USER/DB_PASSWORD, cấu hình AI nếu có
npm install
npm run db:init               # tạo CSDL + bảng từ database/schema.sql
npm run db:seed               # dữ liệu mẫu
npm run dev                   # http://localhost:4000

# 2. Frontend (terminal khác)
cd client
npm install
npm run dev                   # http://localhost:5173 (proxy /api -> :4000)
```

Tài khoản mẫu (mật khẩu `123456`):

| Vai trò | Email |
|---|---|
| Quản trị | admin@edutrack.vn |
| Giảng viên | teacher@edutrack.vn |
| Sinh viên | student@edutrack.vn, an@edutrack.vn, binh@edutrack.vn |

### Cấu hình AI

Trong `server/.env`:

```env
AI_PROVIDER=groq          # groq | gemini | openai | mock
GROQ_API_KEY=gsk_...      # https://console.groq.com/keys
GROQ_MODEL=openai/gpt-oss-120b
```

Không có API key → hệ thống tự dùng chế độ **mock** (thuật toán heuristic) nên vẫn chạy đầy đủ chức năng. Nếu nhà cung cấp AI lỗi, hệ thống cũng tự động rơi về mock.

### Kiểm thử

```bash
cd server
npm test          # unit test (không cần mạng)
npm run test:ai   # kiểm thử AI thật: chấm điểm, lộ trình, chat, sinh câu hỏi
```

## Tài liệu

| Tuần | Nội dung | Tài liệu |
|---|---|---|
| 2 | Tìm hiểu công nghệ (Node.js, Express, React, MySQL) | [docs/tuan-02-cong-nghe.md](docs/tuan-02-cong-nghe.md) |
| 3 | Tích hợp AI gợi ý học tập (Gemini / GPT‑4o) | [docs/tuan-03-tich-hop-ai.md](docs/tuan-03-tich-hop-ai.md) |
| 5 | Kế hoạch xây dựng hệ thống | [docs/tuan-05-ke-hoach.md](docs/tuan-05-ke-hoach.md) |
| 6 | Xây dựng giao diện client & admin | [docs/tuan-06-giao-dien.md](docs/tuan-06-giao-dien.md) |
| 7 | Xây dựng chức năng client & admin | [docs/tuan-07-chuc-nang.md](docs/tuan-07-chuc-nang.md) |
| + | Chức năng mở rộng | [docs/chuc-nang-mo-rong.md](docs/chuc-nang-mo-rong.md) |
| + | Tài liệu API | [docs/api.md](docs/api.md) |

> Theo yêu cầu, các tuần 1 (tìm hiểu công ty), 4 (nghiệm thu dự án 113) và 8 (tổng kết) không nằm trong phạm vi repo này.
