# 📘 HƯỚNG DẪN CÀI ĐẶT & CHẠY EDUTRACK AI (cho người mới bắt đầu)

Tài liệu này dành cho máy tính **Windows 10/11 chưa cài gì**. Làm lần lượt từng bước, mỗi bước chỉ cần làm **một lần duy nhất** (trừ Bước 6 — mở ứng dụng).

⏱ Thời gian: khoảng 20–30 phút (phần lớn là chờ tải).

| Bước | Việc cần làm | Làm mấy lần |
|---|---|---|
| 1 | Tải mã nguồn về máy | 1 lần |
| 2 | Cài Node.js | 1 lần |
| 3 | Cài MySQL | 1 lần |
| 4 | Lấy khóa AI Groq | 1 lần |
| 5 | Chạy `setup.bat` | 1 lần |
| 6 | Chạy `start.bat` để mở ứng dụng | Mỗi lần dùng |

---

## Bước 1 — Tải mã nguồn

1. Mở trình duyệt, vào: **https://github.com/huynhpham13790-rgb/Learning-Management-System**
2. Bấm nút màu xanh **`<> Code`** → chọn **Download ZIP**.
3. Mở thư mục *Downloads*, nhấp chuột phải vào file `Learning-Management-System-main.zip` → **Extract All… (Giải nén tất cả)** → **Extract**.
4. Chuyển thư mục vừa giải nén tới chỗ dễ tìm, ví dụ `C:\EduTrack`.

> ⚠️ Nên đặt ở đường dẫn **không có dấu tiếng Việt**, ví dụ `C:\EduTrack` (tránh `C:\Users\Nguyễn Văn A\Tài liệu\...`).

Bên trong thư mục phải thấy: `client`, `server`, `database`, `docs`, `setup.bat`, `start.bat`…

---

## Bước 2 — Cài Node.js (môi trường chạy ứng dụng)

1. Vào **https://nodejs.org**
2. Bấm nút tải bản **LTS** (bản khuyên dùng, ví dụ “22.x LTS” hoặc mới hơn) → tải file `.msi`.
3. Mở file vừa tải → bấm **Next** liên tục → tích **I accept…** → **Next** → **Install** → **Finish**.
   (Giữ nguyên mọi lựa chọn mặc định.)
4. **Kiểm tra:** nhấn phím `Windows`, gõ `cmd`, mở **Command Prompt**, gõ lệnh sau rồi nhấn Enter:
   ```
   node -v
   ```
   Hiện ra dạng `v22.x.x` là thành công. (Nếu báo *“not recognized”* → khởi động lại máy rồi thử lại.)

---

## Bước 3 — Cài MySQL (cơ sở dữ liệu)

Chọn **một trong hai** cách. Máy đã có XAMPP thì dùng cách 3A cho nhanh.

### Cách 3A — Dùng XAMPP (dễ nhất)

1. Tải XAMPP tại **https://www.apachefriends.org** → bản Windows → cài đặt, bấm **Next** liên tục (giữ mặc định, thư mục `C:\xampp`).
2. Mở **XAMPP Control Panel** → ở dòng **MySQL** bấm **Start** (chữ MySQL chuyển nền xanh là được).
   Mỗi lần dùng EduTrack đều phải Start MySQL trong XAMPP trước (hoặc bấm **Config → Autostart of modules → tích MySQL**).
3. XAMPP mặc định tài khoản `root` **không có mật khẩu** → ở Bước 5 khi được hỏi mật khẩu MySQL, **chỉ cần nhấn Enter** (để trống).

### Cách 3B — Cài MySQL chính thức

1. Vào **https://dev.mysql.com/downloads/installer/**
2. Chọn file **lớn hơn** (*mysql-installer-community-8.x.x.msi*, khoảng 300MB) → **Download**.
   Trang tiếp theo bấm dòng chữ nhỏ **“No thanks, just start my download.”** (không cần tạo tài khoản).
3. Mở file vừa tải. Nếu Windows hỏi quyền → **Yes**.
4. Màn hình **Choosing a Setup Type**: chọn **Server only** → **Next**.
5. Màn hình **Installation** → **Execute** → chờ hiện dấu ✔ xanh → **Next** → **Next**.
6. **Type and Networking**: giữ nguyên (*Development Computer*, Port **3306**) → **Next**.
7. **Authentication Method**: chọn **Use Strong Password Encryption…** (dòng trên) → **Next**.
8. **Accounts and Roles**: nhập **mật khẩu cho tài khoản `root`** vào 2 ô.
   📝 **GHI LẠI MẬT KHẨU NÀY** — Bước 5 sẽ cần. Nên dùng mật khẩu chỉ gồm chữ và số, ví dụ `Edutrack2026` (tránh ký tự `!`, `%`, `^`, `&`).
9. **Windows Service**: giữ nguyên (tích *Start the MySQL Server at System Startup*) → **Next**.
10. **Apply Configuration** → **Execute** → chờ tất cả dấu ✔ → **Finish** → **Next** → **Finish**.

MySQL sẽ tự chạy ngầm mỗi khi bật máy, không cần mở gì thêm.

---

## Bước 4 — Lấy khóa AI (Groq API key)

Ứng dụng dùng AI của **Groq** (miễn phí) để chấm bài, gợi ý lộ trình, trả lời câu hỏi.

- Nếu **người gửi phần mềm đã đưa sẵn khóa** (chuỗi bắt đầu bằng `gsk_...`) → dùng khóa đó, bỏ qua bước này.
- Nếu chưa có:
  1. Vào **https://console.groq.com/keys** → đăng nhập bằng Google.
  2. Bấm **Create API Key** → đặt tên bất kỳ → **Submit**.
  3. **Sao chép** chuỗi `gsk_...` hiện ra và lưu lại (chỉ hiển thị một lần).

> Không có khóa vẫn chạy được: ứng dụng tự dùng **chế độ AI giả lập** (chấm điểm theo quy tắc đơn giản), nhưng kết quả không thông minh bằng AI thật.
> 🔒 Không chia sẻ khóa công khai (đăng lên mạng, GitHub…).

---

## Bước 5 — Cài đặt ứng dụng (chạy `setup.bat`)

1. Mở thư mục `C:\EduTrack`, **nhấp đúp** file **`setup.bat`**.
   - Nếu Windows hiện *“Windows protected your PC”* → bấm **More info** → **Run anyway**.
2. Cửa sổ đen hiện ra và hỏi:
   - `Nhap mat khau MySQL...` → gõ mật khẩu đã ghi ở Bước 3 → **Enter**.
   - `Nhap Groq API key...` → dán khóa `gsk_...` (nhấp chuột phải để dán) → **Enter**.
3. Chờ 2–5 phút để tải thư viện (cần có mạng Internet). Dòng chữ chạy liên tục là bình thường; các dòng `warn`/`vulnerabilities` có thể bỏ qua.
4. Khi thấy **`CAI DAT THANH CONG!`** → nhấn phím bất kỳ để đóng.

> Lỡ nhập sai mật khẩu/khóa? Xóa file `server\.env` rồi chạy lại `setup.bat`.
> ⚠️ Chạy lại `setup.bat` sẽ **xóa toàn bộ dữ liệu** và nạp lại dữ liệu mẫu.

---

## Bước 6 — Mở ứng dụng (mỗi lần sử dụng)

1. Nhấp đúp **`start.bat`**.
2. Hai cửa sổ đen mở ra (**Server** và **Giao diện**) — **không đóng chúng** trong lúc dùng.
3. Sau vài giây trình duyệt tự mở **http://localhost:5173**. (Nếu không tự mở, hãy tự gõ địa chỉ này vào trình duyệt; nếu trang trắng hãy chờ 5 giây rồi nhấn F5.)
4. Đăng nhập bằng tài khoản mẫu (mật khẩu đều là **`123456`**):

| Vai trò | Email | Dùng để |
|---|---|---|
| Quản trị viên | `admin@edutrack.vn` | Toàn quyền, quản lý người dùng |
| Giảng viên | `teacher@edutrack.vn` | Quản lý khóa học, bài tập, chấm bài |
| Sinh viên | `student@edutrack.vn` | Học, nộp bài, dùng AI |
| Sinh viên | `an@edutrack.vn`, `binh@edutrack.vn` | Sinh viên khác |

**Tắt ứng dụng:** đóng 2 cửa sổ đen *Server* và *Giao diện*.

---

## Thử nhanh các chức năng AI

Đăng nhập **student@edutrack.vn**:
1. **🧭 Lộ trình AI** (menu trái) → nhập mục tiêu, ví dụ “Trở thành lập trình viên React” → **Tạo lộ trình**.
2. **🤖 Trợ lý AI** → hỏi “let và const khác nhau thế nào?”.
3. **📝 Bài tập** → mở *Trình bày về Promise và async/await* → viết bài → **Nộp bài** → xem điểm và nhận xét AI.

Đăng nhập **teacher@edutrack.vn**:
4. **Bài tập & chấm điểm** → **Chấm bài** → xem điểm AI, % đạo văn → **Xem & chấm** → xác nhận điểm.
5. **Trắc nghiệm** → **Tạo bài trắc nghiệm** → chọn khóa học → chọn bài học → **Sinh câu hỏi** (AI tự tạo câu hỏi).

---

## Xử lý lỗi thường gặp

| Hiện tượng | Cách xử lý |
|---|---|
| `setup.bat` báo **Chưa cài Node.js** | Làm lại Bước 2, sau đó **khởi động lại máy**. |
| Lỗi **`Access denied for user 'root'`** | Sai mật khẩu MySQL. Xóa file `server\.env` rồi chạy lại `setup.bat`. |
| Lỗi **`ECONNREFUSED ... 3306`** / **không đăng nhập được** | MySQL chưa chạy. XAMPP: mở XAMPP Control Panel → **Start** MySQL. MySQL cài riêng: nhấn `Windows` → gõ **Services** → tìm **MySQL80** → chuột phải → **Start**. |
| Đăng nhập báo **“Email hoặc mật khẩu không đúng”** dù gõ đúng / lỗi **`Unknown database 'edutrack'`** | Chưa tạo dữ liệu: chạy `setup.bat` hoặc nhập file `database\edutrack.sql` (Phụ lục 0). |
| Lỗi **`EADDRINUSE ... 4000`** hoặc **5173** | Ứng dụng đang chạy rồi (có cửa sổ cũ). Đóng hết cửa sổ đen cũ rồi chạy lại `start.bat`. |
| Đăng nhập báo **“Lỗi máy chủ”** / không phản hồi | Kiểm tra cửa sổ *Server* còn mở và không có chữ đỏ báo lỗi. |
| Trả lời AI có chữ **“(Chế độ mock)”** | Chưa có/sai khóa Groq. Mở file `server\.env` bằng Notepad, sửa dòng `GROQ_API_KEY=gsk_...` và `AI_PROVIDER=groq`, lưu lại, đóng cửa sổ *Server* rồi chạy lại `start.bat`. |
| `npm install` lỗi mạng | Kiểm tra Internet / tắt VPN, chạy lại `setup.bat`. |

---

## Phụ lục 0 — Nhập sẵn dữ liệu bằng file `database/edutrack.sql`

Repo có sẵn file **`database/edutrack.sql`**: toàn bộ CSDL kèm dữ liệu mẫu (52 người dùng gồm 48 sinh viên, 3 giảng viên, 1 quản trị; 9 khóa học, 38 bài học, 9 bài tập, 167 lượt ghi danh, 80 bài nộp có điểm AI và kết quả kiểm tra đạo văn — trong đó có vài cặp bài chép nhau để thử chức năng phát hiện đạo văn, 195 lượt làm trắc nghiệm, 93 bình luận, thông báo). Đã thử nhập thành công vào cả **XAMPP (MariaDB 10.4)** và **MySQL 8.4**.

`setup.bat` đã tự tạo dữ liệu nên **không bắt buộc** dùng file này. Chỉ dùng khi muốn nạp dữ liệu vào MySQL có sẵn mà không chạy `setup.bat`, hoặc muốn khôi phục lại dữ liệu mẫu.

**Cách nhập bằng phpMyAdmin (XAMPP):**
1. XAMPP Control Panel → Start **Apache** và **MySQL** → bấm **Admin** ở dòng MySQL (mở http://localhost/phpmyadmin).
2. Bấm tab **Import (Nhập)** ở trên cùng (không cần chọn database trước).
3. **Choose File** → chọn `database\edutrack.sql` → kéo xuống bấm **Import / Go**.
4. Bên trái xuất hiện database **edutrack** là xong.

**Cách nhập bằng dòng lệnh:**
```bash
# XAMPP
C:\xampp\mysql\bin\mysql.exe -u root --default-character-set=utf8mb4 < database\edutrack.sql
# MySQL cài riêng (sẽ hỏi mật khẩu)
mysql -u root -p --default-character-set=utf8mb4 < database/edutrack.sql
```

> ⚠️ File sẽ **xóa và tạo lại** các bảng trong database `edutrack`.
> 📅 Ngày tháng trong file được tạo ngày 20/10/2026 nên một số hạn nộp bài có thể đã qua. Muốn dữ liệu mới theo ngày hiện tại: trong thư mục `server` chạy `npm run db:seed`.

Sau khi nhập, vẫn cần có file `server\.env` (tạo bằng `setup.bat`, hoặc copy `server\.env.example` thành `.env` rồi điền mật khẩu và key), sau đó chạy `start.bat`.

## Phụ lục A — Cấu hình nâng cao (file `server\.env`)

Mở bằng Notepad. Các dòng quan trọng:

```env
PORT=4000                       # cổng của server
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=mat-khau-mysql
DB_NAME=edutrack

AI_PROVIDER=groq                # groq | gemini | openai | mock
GROQ_API_KEY=gsk_...
GROQ_MODEL=openai/gpt-oss-120b  # đổi model tại https://console.groq.com/docs/models

PLAGIARISM_THRESHOLD=40         # % trùng lặp để cảnh báo đạo văn
```

Sửa xong phải tắt và mở lại ứng dụng (`start.bat`).

## Phụ lục B — Cài thủ công bằng lệnh (macOS / Linux / người rành kỹ thuật)

Yêu cầu: Node.js ≥ 18, MySQL 8 đang chạy.

```bash
git clone https://github.com/huynhpham13790-rgb/Learning-Management-System.git
cd Learning-Management-System

# Server
cd server
cp .env.example .env        # rồi sửa DB_PASSWORD, GROQ_API_KEY
npm install
npm run db:init             # tạo CSDL + bảng
npm run db:seed             # dữ liệu mẫu (xóa dữ liệu cũ!)
npm start                   # http://localhost:4000

# Giao diện (mở terminal khác)
cd client
npm install
npm run dev                 # http://localhost:5173
```

Kiểm thử:

```bash
cd server
npm test        # unit test (không cần mạng)
npm run test:ai # gọi AI thật để kiểm tra khóa Groq
```
