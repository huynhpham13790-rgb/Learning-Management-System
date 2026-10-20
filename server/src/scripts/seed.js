// Dữ liệu mẫu cho EduTrack AI. Chạy: npm run db:seed (sẽ xóa dữ liệu cũ)
import bcrypt from 'bcryptjs';
import { pool, query } from '../config/db.js';

const TABLES = [
  'learning_paths', 'ai_chat_messages', 'notifications', 'comments', 'quiz_attempts', 'quiz_questions',
  'quizzes', 'submissions', 'assignments', 'lesson_progress', 'enrollments', 'lessons', 'courses', 'users',
];

await query('SET FOREIGN_KEY_CHECKS = 0');
for (const t of TABLES) await query(`TRUNCATE TABLE ${t}`);
await query('SET FOREIGN_KEY_CHECKS = 1');

const hash = await bcrypt.hash('123456', 10);
const users = [
  ['Quản trị viên', 'admin@edutrack.vn', 'admin'],
  ['Lê Anh Duy', 'teacher@edutrack.vn', 'teacher'],
  ['Đặng Thị Thương', 'student@edutrack.vn', 'student'],
  ['Nguyễn Văn An', 'an@edutrack.vn', 'student'],
  ['Trần Thị Bình', 'binh@edutrack.vn', 'student'],
];
for (const [name, email, role] of users) {
  await query('INSERT INTO users (name, email, password_hash, role, goals) VALUES (?, ?, ?, ?, ?)', [
    name, email, hash, role, role === 'student' ? 'Trở thành lập trình viên Fullstack JavaScript' : null,
  ]);
}

const courses = [
  {
    title: 'Lập trình JavaScript cơ bản', category: 'Lập trình', level: 'beginner',
    description: 'Nắm vững cú pháp, kiểu dữ liệu, hàm, mảng, đối tượng và xử lý bất đồng bộ trong JavaScript.',
    lessons: [
      ['Giới thiệu JavaScript', 'JavaScript là ngôn ngữ lập trình chạy trên trình duyệt và máy chủ. Nó được dùng để tạo trang web tương tác. Biến được khai báo bằng let và const.'],
      ['Hàm và phạm vi', 'Hàm là khối lệnh có thể tái sử dụng. Arrow function là cú pháp ngắn gọn. Phạm vi của biến let và const là phạm vi khối.'],
      ['Mảng và đối tượng', 'Mảng lưu danh sách giá trị có thứ tự. Phương thức map, filter, reduce giúp xử lý mảng. Đối tượng lưu dữ liệu dạng cặp khóa và giá trị.'],
      ['Promise và async/await', 'Promise đại diện cho kết quả của thao tác bất đồng bộ. Từ khóa async và await giúp viết mã bất đồng bộ dễ đọc như mã đồng bộ.'],
    ],
  },
  {
    title: 'Node.js & Express xây dựng REST API', category: 'Backend', level: 'intermediate',
    description: 'Xây dựng REST API với Node.js, Express, middleware, xác thực JWT và kết nối MySQL.',
    lessons: [
      ['Node.js là gì', 'Node.js là môi trường chạy JavaScript phía máy chủ dựa trên V8. Node.js sử dụng mô hình vào ra không chặn và vòng lặp sự kiện.'],
      ['Express và Routing', 'Express là framework web tối giản cho Node.js. Router giúp tách các nhóm đường dẫn. Middleware xử lý request trước khi tới handler.'],
      ['Xác thực với JWT', 'JSON Web Token gồm ba phần header, payload và signature. Máy chủ ký token khi đăng nhập và kiểm tra token ở mỗi request.'],
    ],
  },
  {
    title: 'React từ cơ bản đến nâng cao', category: 'Frontend', level: 'intermediate',
    description: 'Component, props, state, hooks, React Router và gọi API trong ứng dụng React.',
    lessons: [
      ['Component và JSX', 'React xây dựng giao diện từ các component. JSX cho phép viết cú pháp giống HTML trong JavaScript. Props truyền dữ liệu từ cha xuống con.'],
      ['State và Hooks', 'useState lưu trạng thái của component. useEffect chạy hiệu ứng phụ như gọi API. Khi state thay đổi, component được render lại.'],
      ['React Router', 'React Router quản lý điều hướng trong ứng dụng một trang. Route ánh xạ đường dẫn tới component tương ứng.'],
    ],
  },
  {
    title: 'Cơ sở dữ liệu MySQL', category: 'Cơ sở dữ liệu', level: 'beginner',
    description: 'Thiết kế CSDL quan hệ, chuẩn hóa, truy vấn SQL, JOIN, chỉ mục và giao dịch.',
    lessons: [
      ['Mô hình quan hệ', 'Cơ sở dữ liệu quan hệ lưu dữ liệu trong các bảng. Khóa chính định danh duy nhất mỗi dòng. Khóa ngoại liên kết các bảng với nhau.'],
      ['Truy vấn SELECT và JOIN', 'Câu lệnh SELECT dùng để truy vấn dữ liệu. INNER JOIN kết hợp các dòng khớp ở hai bảng. GROUP BY nhóm dữ liệu để tính tổng hợp.'],
    ],
  },
  {
    title: 'Ứng dụng AI trong phát triển phần mềm', category: 'Trí tuệ nhân tạo', level: 'advanced',
    description: 'Tích hợp mô hình ngôn ngữ lớn (Gemini, GPT-4o) vào ứng dụng: prompt engineering, JSON output, đánh giá kết quả.',
    lessons: [
      ['Mô hình ngôn ngữ lớn', 'Mô hình ngôn ngữ lớn được huấn luyện trên lượng văn bản khổng lồ. Chúng có thể sinh văn bản, tóm tắt và trả lời câu hỏi.'],
      ['Prompt engineering', 'Prompt rõ ràng, có ngữ cảnh và định dạng đầu ra cụ thể giúp mô hình trả lời chính xác hơn. Yêu cầu đầu ra JSON giúp dễ xử lý trong ứng dụng.'],
    ],
  },
];

const teacherId = 2;
for (const c of courses) {
  const r = await query('INSERT INTO courses (title, description, category, level, teacher_id) VALUES (?, ?, ?, ?, ?)', [
    c.title, c.description, c.category, c.level, teacherId,
  ]);
  let pos = 1;
  for (const [title, content] of c.lessons) {
    await query('INSERT INTO lessons (course_id, title, content, position, duration_min) VALUES (?, ?, ?, ?, ?)', [
      r.insertId, title, content, pos++, 15,
    ]);
  }
}

// Ghi danh & tiến độ
for (const [uid, cid] of [[3, 1], [3, 2], [3, 3], [4, 1], [4, 4], [5, 1], [5, 3]]) {
  await query('INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)', [uid, cid]);
}
for (const [uid, lid, daysAgo] of [[3, 1, 2], [3, 2, 1], [3, 3, 0], [3, 5, 0], [4, 1, 3], [4, 11, 1], [5, 1, 0]]) {
  await query('INSERT INTO lesson_progress (user_id, lesson_id, completed_at) VALUES (?, ?, NOW() - INTERVAL ? DAY)', [
    uid, lid, daysAgo,
  ]);
}

// Bài tập
await query(
  `INSERT INTO assignments (course_id, title, description, rubric, max_score, due_date) VALUES
  (1, 'Trình bày về Promise và async/await', 'Viết bài (150-300 từ) giải thích Promise, async/await và cho ví dụ.',
   'Giải thích Promise; trạng thái pending fulfilled rejected; async await; xử lý lỗi try catch; ví dụ minh họa', 10, NOW() + INTERVAL 14 DAY),
  (2, 'Thiết kế REST API quản lý sinh viên', 'Mô tả các endpoint CRUD, phương thức HTTP, mã trạng thái và cách xác thực.',
   'Endpoint CRUD; phương thức GET POST PUT DELETE; mã trạng thái HTTP; middleware; xác thực JWT', 10, NOW() + INTERVAL 10 DAY)`,
);

// Bài kiểm tra trắc nghiệm
const quiz = await query("INSERT INTO quizzes (course_id, title) VALUES (1, 'Kiểm tra nhanh JavaScript')");
const qs = [
  ['Từ khóa nào khai báo hằng số?', ['var', 'let', 'const', 'static'], 2, 'const khai báo biến không thể gán lại.'],
  ['Phương thức nào tạo mảng mới từ kết quả của hàm?', ['forEach', 'map', 'push', 'find'], 1, 'map trả về mảng mới.'],
  ['await chỉ dùng được trong?', ['Mọi hàm', 'Hàm async', 'Vòng lặp for', 'Constructor'], 1, 'await dùng trong hàm async (hoặc top-level module).'],
  ['typeof null trả về?', ['"null"', '"undefined"', '"object"', '"number"'], 2, 'Đây là một đặc điểm lịch sử của JavaScript.'],
];
for (const [question, options, correct, explanation] of qs) {
  await query('INSERT INTO quiz_questions (quiz_id, question, options, correct_index, explanation) VALUES (?, ?, ?, ?, ?)', [
    quiz.insertId, question, JSON.stringify(options), correct, explanation,
  ]);
}
await query(`INSERT INTO quiz_attempts (quiz_id, user_id, answers, score) VALUES (1, 4, '{}', 7.5), (1, 5, '{}', 5)`);

await query(`INSERT INTO notifications (user_id, title, message, link) VALUES
  (3, 'Chào mừng tới EduTrack AI', 'Hãy thử tính năng Gợi ý lộ trình học bằng AI!', '/learning-path')`);

console.log('Đã tạo dữ liệu mẫu. Tài khoản (mật khẩu 123456): admin@edutrack.vn, teacher@edutrack.vn, student@edutrack.vn');
await pool.end();
