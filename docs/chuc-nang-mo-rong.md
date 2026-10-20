# Chức năng mở rộng

Ngoài các yêu cầu trong đề cương (gợi ý lộ trình, chấm điểm tự động, phát hiện đạo văn, giao diện client/admin), hệ thống bổ sung các chức năng sau.

## 1. 🤖 Trợ lý học tập AI (chat)
- Trang `/tutor`: sinh viên hỏi đáp với AI về nội dung bài học.
- Gửi kèm 10 tin nhắn gần nhất làm ngữ cảnh hội thoại; lịch sử lưu ở bảng `ai_chat_messages`, có thể xóa.
- Prompt định hướng AI trả lời ngắn gọn, có ví dụ và **khuyến khích sinh viên tự tư duy** thay vì đưa đáp án ngay.
- API: `GET/POST/DELETE /api/ai/chat`.

## 2. ✨ AI sinh câu hỏi trắc nghiệm
- Trong trình soạn trắc nghiệm (admin), chọn bài học + số câu → AI đọc nội dung bài và sinh câu hỏi 4 lựa chọn kèm đáp án, giải thích.
- Câu hỏi **chưa lưu ngay** mà đưa vào trình soạn để giảng viên duyệt/sửa trước khi lưu.
- API: `POST /api/quizzes/generate`.

## 3. ❓ Bài kiểm tra trắc nghiệm chấm tự động
- Giảng viên tạo đề nhiều câu hỏi; sinh viên làm bài, nhận điểm thang 10 ngay, xem đáp án đúng/sai và giải thích; lưu lịch sử nhiều lần làm.
- Admin xem số lượt làm và điểm trung bình mỗi đề.

## 4. 💬 Thảo luận theo bài học
- Mỗi bài học có khu bình luận; giảng viên được gắn nhãn vai trò.
- Người viết hoặc giảng viên/quản trị được xóa bình luận.

## 5. 🔔 Thông báo
Tự động tạo thông báo khi:

| Sự kiện | Người nhận |
|---|---|
| Ghi danh thành công | Sinh viên |
| Thêm bài học / bài tập mới | Học viên đã ghi danh khóa |
| Nộp bài (AI đã chấm sơ bộ) | Sinh viên |
| Giảng viên chấm điểm chính thức | Sinh viên |
| Bài nộp trùng lặp ≥ ngưỡng | Giảng viên, quản trị |

Chuông thông báo trên topbar hiển thị số chưa đọc, làm mới 30 giây/lần, bấm để mở trang liên quan.

## 6. 🏆 Bảng xếp hạng (gamification)
- Điểm = 10 × số bài học hoàn thành + tổng điểm cao nhất của mỗi đề trắc nghiệm + tổng điểm bài tập.
- Top 20 sinh viên, huy chương top 3, tô sáng vị trí của bản thân.

## 7. 🔥 Chuỗi ngày học & biểu đồ hoạt động
- Đếm số ngày liên tiếp có hoàn thành bài học (tính đến hôm nay hoặc hôm qua).
- Biểu đồ số bài học hoàn thành 7 ngày gần nhất trên trang tổng quan.

## 8. 📄 Xuất bảng điểm CSV
- Admin xuất bảng điểm từng khóa: họ tên, email, số bài học hoàn thành, điểm TB bài tập, điểm TB trắc nghiệm.
- File có BOM UTF‑8 để mở bằng Excel không lỗi font tiếng Việt.
- API: `GET /api/stats/admin/export/:courseId`.

## 9. Khác
- Khóa học **nháp** (chưa công khai) chỉ giảng viên thấy.
- Khóa/mở khóa tài khoản người dùng.
- Nhúng video YouTube vào bài học.
- Tìm kiếm, lọc khóa học theo chủ đề và cấp độ.
