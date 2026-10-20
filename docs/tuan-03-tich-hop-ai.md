# Báo cáo tuần 3 — Tìm hiểu tích hợp AI gợi ý học tập (Gemini / GPT‑4o / Groq)

**Kết quả:** Thiết kế lớp tích hợp AI dùng chung cho nhiều nhà cung cấp; ba chức năng AI cốt lõi (gợi ý lộ trình, chấm điểm, phát hiện đạo văn) và hai chức năng AI mở rộng (trợ lý chat, sinh câu hỏi).

---

## 1. Mô hình ngôn ngữ lớn (LLM) sử dụng

| | Google Gemini | OpenAI GPT‑4o |
|---|---|---|
| Endpoint | `POST /v1beta/models/{model}:generateContent?key=...` | `POST /v1/chat/completions` |
| Xác thực | API key trong query | `Authorization: Bearer <key>` |
| Ép đầu ra JSON | `generationConfig.responseMimeType = "application/json"` | `response_format: { type: "json_object" }` |
| Model mặc định | `gemini-2.0-flash` (cấu hình qua `GEMINI_MODEL`) | `gpt-4o` (cấu hình qua `OPENAI_MODEL`) |

Ngoài ra hệ thống hỗ trợ **Groq** (nhà cung cấp mặc định khi triển khai): API tương thích OpenAI tại `https://api.groq.com/openai/v1/chat/completions`, tốc độ suy luận rất nhanh, có gói miễn phí. Model mặc định `openai/gpt-oss-120b` (cấu hình qua `GROQ_MODEL`). Vì tương thích OpenAI nên Groq và OpenAI dùng chung hàm `callOpenAICompatible()`.

Các nhà cung cấp đều gọi trực tiếp bằng `fetch` (REST), không phụ thuộc SDK → dễ đổi nhà cung cấp.

## 2. Kiến trúc lớp AI (`server/src/services/ai.js`)

```
recommendLearningPath / gradeSubmission / chatTutor / generateQuiz
                         │
                   withFallback(prompt, mockFn)
                         │
          complete(prompt) ── activeProvider()
           ├─ gemini  → callGemini()
           ├─ openai  → callOpenAI()
           └─ mock    → null  ⇒ dùng mockFn()
```

Nguyên tắc thiết kế:

1. **Đa nhà cung cấp**: chọn bằng biến môi trường `AI_PROVIDER`.
2. **Đầu ra tiếng Việt thuần**: mọi prompt được nối thêm yêu cầu viết bằng tiếng Việt; câu trả lời chat được lọc bỏ ký hiệu Markdown (`stripMarkdown`).
3. **Luôn có phương án dự phòng (fallback)**: thiếu API key, hết hạn mức, lỗi mạng hoặc AI trả JSON hỏng → tự động dùng thuật toán heuristic (mock). Hệ thống không bao giờ “chết” vì AI.
4. **Đầu ra có cấu trúc**: prompt yêu cầu JSON theo schema cố định; server dùng `extractJson()` để bóc tách an toàn.
5. **Kiểm soát giá trị**: điểm AI trả về luôn bị kẹp trong `[0, max_score]`.
6. **Minh bạch**: mỗi kết quả kèm trường `provider` (groq/gemini/openai/mock) để giảng viên biết nguồn.

## 3. Prompt engineering

Các kỹ thuật áp dụng:

- **Gán vai trò** (“Bạn là cố vấn học tập…”, “Bạn là giảng viên…”).
- **Cung cấp ngữ cảnh đầy đủ**: đề bài, tiêu chí chấm, danh sách khóa học thực tế, tiến độ hiện tại.
- **Ràng buộc phạm vi**: “chỉ dùng các khóa học trong danh sách” để tránh AI bịa khóa học.
- **Đặc tả đầu ra**: “Chỉ trả về JSON: {...}”.
- **Giới hạn độ dài đầu vào**: cắt bài làm ở 8.000 ký tự để kiểm soát chi phí token.

Ví dụ prompt chấm điểm:

```
Bạn là giảng viên. Chấm bài theo thang 0-10.
Đề bài: Trình bày về Promise và async/await
Tiêu chí chấm: Giải thích Promise; trạng thái pending fulfilled rejected; async await; ...
Bài làm của sinh viên: """..."""
Chỉ trả về JSON: {"score": number, "feedback": string, "strengths": [string], "improvements": [string]}
```

## 4. Ba chức năng AI cốt lõi

### 4.1. Gợi ý lộ trình học

- **Đầu vào**: mục tiêu (từ hồ sơ hoặc nhập mới), danh sách khóa học công khai, % tiến độ từng khóa, điểm trắc nghiệm trung bình.
- **Đầu ra**: `summary`, tối đa 5 `steps` (khóa học, số tuần, lý do), `tips`.
- **Thuật toán dự phòng**: tách từ mục tiêu, tính số từ trùng với tiêu đề/chủ đề/mô tả khóa học; loại khóa đã hoàn thành 100%; sắp xếp theo độ khớp rồi theo cấp độ (cơ bản → nâng cao).
- Lịch sử lộ trình được lưu bảng `learning_paths`.

### 4.2. Tự động chấm điểm

- Khi sinh viên nộp bài, AI chấm **sơ bộ** ngay (trạng thái `ai_graded`).
- Giảng viên xem điểm + nhận xét AI, có thể chấm lại bằng AI hoặc **xác nhận/sửa điểm chính thức** (`graded`). → Con người luôn là người quyết định cuối cùng (human‑in‑the‑loop).
- **Thuật toán dự phòng**: điểm = 55% × tỉ lệ bao phủ từ khóa trong rubric + 45% × độ đầy đủ (độ dài/150 từ).

### 4.3. Phát hiện đạo văn (`services/plagiarism.js`)

Chạy hoàn toàn cục bộ (không gửi bài làm ra ngoài, không tốn phí):

1. **Chuẩn hóa**: chữ thường, Unicode NFC, bỏ dấu câu, giữ dấu tiếng Việt.
2. **Shingling**: tách thành tập 3‑gram từ.
3. **Containment** = |A ∩ B| / |A| — tỉ lệ đoạn của bài A xuất hiện trong bài B (phát hiện chép một phần).
4. **Cosine similarity** trên vector tần suất từ (phát hiện viết lại/xáo trộn).
5. **Điểm** = 70% containment + 30% cosine (0–100%).

**Lọc cụm phổ biến**: khi có từ 4 bài trở lên, các cụm 3 từ xuất hiện ở ≥ 30% số bài (ví dụ cả lớp cùng trích đề bài, thuật ngữ bắt buộc) bị loại khỏi phép so sánh, khi đó điểm = 90% containment + 10% cosine. Nhờ vậy chỉ những đoạn trùng *riêng* giữa hai bài mới bị tính, tránh báo động giả.

Mỗi bài nộp được so với mọi bài khác cùng bài tập; lưu điểm cao nhất và bài nguồn. Vượt ngưỡng `PLAGIARISM_THRESHOLD` (mặc định 40%) → gửi thông báo cảnh báo tới giảng viên.

Kết quả kiểm thử thực tế: bài chép nguyên văn + thêm 1 câu → **95,6%**; hai bài khác chủ đề → < 10%.

## 5. Bảo mật & chi phí

- API key chỉ nằm ở server (`.env`), không bao giờ gửi xuống trình duyệt.
- Giới hạn độ dài đầu vào (chat 2.000 ký tự, bài làm 8.000 ký tự, lịch sử chat 10 tin gần nhất).
- Phát hiện đạo văn không dùng LLM → không lộ dữ liệu sinh viên.

## 6. Kiểm thử AI thật

`npm run test:ai` (file `server/tests/ai.live.js`) gọi Groq thật, kiểm tra 5 trường hợp — **đạt 5/5**:

| Kiểm thử | Kết quả thực tế |
|---|---|
| Nhận diện nhà cung cấp | `groq` |
| Chấm điểm bài tốt vs bài kém | 9/10 vs 1/10, nhận xét chi tiết bằng tiếng Việt |
| Gợi ý lộ trình | JavaScript → React → MySQL, kèm lý do |
| Trợ lý chat | Giải thích let/const bằng tiếng Việt |
| Sinh câu hỏi trắc nghiệm | 3 câu hợp lệ, có đáp án và giải thích |
