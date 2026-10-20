# Tài liệu API

- Base URL: `http://localhost:4000/api`
- Định dạng: JSON. Lỗi trả về `{ "message": "..." }` với mã HTTP tương ứng (400, 401, 403, 404, 409, 500).
- Xác thực: header `Authorization: Bearer <token>` (trừ đăng ký/đăng nhập).
- Quyền: 🟢 mọi người dùng đã đăng nhập · 🟡 giảng viên + quản trị · 🔴 chỉ quản trị.

## Xác thực — `/auth`
| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| POST | `/auth/register` | công khai | `{name, email, password}` → `{token, user}` |
| POST | `/auth/login` | công khai | `{email, password}` → `{token, user}` |
| GET | `/auth/me` | 🟢 | Thông tin người dùng hiện tại |
| PUT | `/auth/me` | 🟢 | `{name, bio, goals}` |
| PUT | `/auth/me/password` | 🟢 | `{currentPassword, newPassword}` |

## Khóa học — `/courses`
| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/courses?q=&category=&level=` | 🟢 | Danh sách + `enrolled`, `progress`, `lesson_count`, `student_count` |
| GET | `/courses/categories` | 🟢 | Danh sách chủ đề |
| GET | `/courses/:id` | 🟢 | Chi tiết + `lessons`, `assignments`, `quizzes` |
| POST | `/courses/:id/enroll` | 🟢 | Ghi danh |
| DELETE | `/courses/:id/enroll` | 🟢 | Hủy ghi danh |
| POST | `/courses` | 🟡 | `{title, description, category, level, published}` |
| PUT | `/courses/:id` | 🟡 | Sửa khóa học |
| DELETE | `/courses/:id` | 🟡 | Xóa (cascade) |
| POST | `/courses/:id/lessons` | 🟡 | `{title, content, video_url, duration_min, position?}` |

## Bài học — `/lessons`
| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/lessons/:id` | 🟢 (đã ghi danh) | Nội dung + `prev`, `next`, `completed` |
| POST / DELETE | `/lessons/:id/complete` | 🟢 | Đánh dấu / bỏ hoàn thành |
| GET / POST | `/lessons/:id/comments` | 🟢 | Thảo luận `{content}` |
| DELETE | `/lessons/comments/:commentId` | 🟢 (chủ / giảng viên) | Xóa bình luận |
| PUT / DELETE | `/lessons/:id` | 🟡 | Sửa / xóa bài học |

## Bài tập — `/assignments`
| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/assignments/my` | 🟢 | Bài tập trong các khóa đã ghi danh + trạng thái nộp |
| GET | `/assignments/:id` | 🟢 | Chi tiết + `submission` của tôi |
| POST | `/assignments/:id/submit` | 🟢 | `{content}` → kiểm tra đạo văn + AI chấm sơ bộ |
| GET | `/assignments?course_id=` | 🟡 | Danh sách + `submission_count`, `pending_count` |
| POST / PUT / DELETE | `/assignments[/:id]` | 🟡 | `{course_id, title, description, rubric, max_score, due_date}` |
| GET | `/assignments/:id/submissions` | 🟡 | Bài nộp của sinh viên |
| POST | `/assignments/:id/plagiarism-scan` | 🟡 | Quét lại đạo văn → `[{id, score, sourceId}]` |
| POST | `/assignments/submissions/:sid/ai-grade` | 🟡 | AI chấm lại |
| PUT | `/assignments/submissions/:sid/grade` | 🟡 | `{score, teacher_feedback}` → điểm chính thức |

`ai_feedback` có dạng `{ feedback, strengths[], improvements[], provider }`.

## Trắc nghiệm — `/quizzes`
| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/quizzes/:id` | 🟢 | Đề (sinh viên không nhận `correct_index`) + lịch sử làm |
| POST | `/quizzes/:id/attempt` | 🟢 | `{answers: {questionId: optionIndex}}` → `{score, correct, total, detail}` |
| GET | `/quizzes` | 🟡 | Danh sách + số câu, lượt làm, điểm TB |
| POST / PUT | `/quizzes[/:id]` | 🟡 | `{course_id, title, questions: [{question, options[], correct_index, explanation}]}` |
| DELETE | `/quizzes/:id` | 🟡 | Xóa |
| POST | `/quizzes/generate` | 🟡 | `{lesson_id, count}` → `{questions}` do AI sinh |

## AI — `/ai`
| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/ai/status` | 🟢 | `{provider}` đang dùng |
| POST | `/ai/learning-path` | 🟢 | `{goal?}` → `{id, goal, plan: {summary, steps[], tips[]}}` |
| GET | `/ai/learning-path/latest` | 🟢 | Lộ trình gần nhất |
| GET / POST / DELETE | `/ai/chat` | 🟢 | Lịch sử / gửi `{message}` → `{reply}` / xóa lịch sử |

## Thông báo — `/notifications`
| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/notifications` | 🟢 | `{unread, items[]}` (50 mới nhất) |
| PUT | `/notifications/:id/read` | 🟢 | Đánh dấu đã đọc |
| PUT | `/notifications/read-all` | 🟢 | Đánh dấu tất cả đã đọc |

## Thống kê — `/stats`
| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/stats/me` | 🟢 | Tổng quan cá nhân: khóa học, điểm, sắp đến hạn, hoạt động, streak |
| GET | `/stats/leaderboard` | 🟢 | Top 20 sinh viên |
| GET | `/stats/admin` | 🟡 | Số liệu tổng, top khóa học, phổ điểm, bài nộp gần đây |
| GET | `/stats/admin/export/:courseId` | 🟡 | Tải CSV bảng điểm |

## Người dùng — `/users`
| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/users?q=&role=` | 🔴 | Danh sách |
| POST | `/users` | 🔴 | `{name, email, password, role}` |
| PUT | `/users/:id` | 🔴 | `{name, email, role, is_active, password?}` |
| DELETE | `/users/:id` | 🔴 | Xóa (không thể tự xóa) |
