// Dữ liệu mẫu cho EduTrack AI. Chạy: npm run db:seed (XÓA dữ liệu cũ)
// Sinh ngẫu nhiên có hạt giống cố định => chạy lại luôn ra cùng một bộ dữ liệu.
import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';
import { mockGrade } from '../services/ai.js';
import { findMostSimilar } from '../services/plagiarism.js';

const conn = await pool.getConnection();
const q = async (sql, params = []) => (await conn.query(sql, params))[0];

// PRNG mulberry32
let seed = 20261020;
const rand = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const int = (a, b) => a + Math.floor(rand() * (b - a + 1));
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const shuffle = (arr) => [...arr].sort(() => rand() - 0.5);
const daysAgo = (d, h = int(7, 22), m = int(0, 59)) => {
  const t = new Date();
  t.setDate(t.getDate() - d);
  t.setHours(h, m, 0, 0);
  return t.toISOString().slice(0, 19).replace('T', ' ');
};

/* ---------------- Xóa dữ liệu cũ ---------------- */
const TABLES = [
  'learning_paths', 'ai_chat_messages', 'notifications', 'comments', 'quiz_attempts', 'quiz_questions',
  'quizzes', 'submissions', 'assignments', 'lesson_progress', 'enrollments', 'lessons', 'courses', 'users',
];
await q('SET FOREIGN_KEY_CHECKS = 0');
for (const t of TABLES) await q(`TRUNCATE TABLE ${t}`);
await q('SET FOREIGN_KEY_CHECKS = 1');

/* ---------------- Người dùng ---------------- */
const hash = await bcrypt.hash('123456', 10);
const HO = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý'];
const DEM = ['Văn', 'Thị', 'Minh', 'Thu', 'Đức', 'Ngọc', 'Hữu', 'Thanh', 'Quang', 'Phương', 'Gia', 'Bảo'];
const TEN = ['An', 'Bình', 'Châu', 'Dũng', 'Giang', 'Hà', 'Hải', 'Hạnh', 'Hiếu', 'Hoa', 'Huy', 'Khánh', 'Lan', 'Linh',
  'Long', 'Mai', 'Nam', 'Nga', 'Ngân', 'Phúc', 'Quân', 'Quỳnh', 'Sơn', 'Tâm', 'Thảo', 'Trang', 'Trung', 'Tú', 'Vy', 'Yến'];
const GOALS = [
  'Trở thành lập trình viên Fullstack JavaScript',
  'Trở thành lập trình viên Frontend React',
  'Làm Backend Node.js cho doanh nghiệp',
  'Nắm vững cơ sở dữ liệu và SQL',
  'Ứng dụng AI vào phát triển phần mềm',
  'Thi chứng chỉ và tìm việc thực tập IT',
];
const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/\s+/g, '.');

const users = [
  ['Quản trị viên', 'admin@edutrack.vn', 'admin', null],
  ['Lê Anh Duy', 'teacher@edutrack.vn', 'teacher', null],
  ['Đặng Thị Thương', 'student@edutrack.vn', 'student', 'Trở thành lập trình viên Fullstack JavaScript'],
  ['Nguyễn Văn An', 'an@edutrack.vn', 'student', 'Trở thành lập trình viên Frontend React'],
  ['Trần Thị Bình', 'binh@edutrack.vn', 'student', 'Nắm vững cơ sở dữ liệu và SQL'],
  ['Trương Thị Hằng Nga', 'nga@edutrack.vn', 'teacher', null],
  ['Phạm Quốc Bảo', 'bao@edutrack.vn', 'teacher', null],
];
const usedEmails = new Set(users.map((u) => u[1]));
while (users.length < 7 + 45) {
  const name = `${pick(HO)} ${pick(DEM)} ${pick(TEN)}`;
  let email = `${slug(name)}@sv.edutrack.vn`;
  for (let i = 2; usedEmails.has(email); i++) email = `${slug(name)}${i}@sv.edutrack.vn`;
  usedEmails.add(email);
  users.push([name, email, 'student', pick(GOALS)]);
}
for (const [i, [name, email, role, goals]] of users.entries()) {
  await q('INSERT INTO users (name, email, password_hash, role, goals, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [
    name, email, hash, role, goals, i === users.length - 1 ? 0 : 1, daysAgo(int(35, 120)),
  ]);
}
const userRows = await q('SELECT id, role FROM users');
const studentIds = userRows.filter((u) => u.role === 'student').map((u) => u.id);
const teacherIds = userRows.filter((u) => u.role === 'teacher').map((u) => u.id);
const STUDENT = 3; // student@edutrack.vn

/* ---------------- Khóa học, bài học, bài tập, trắc nghiệm ---------------- */
const COURSES = [
  {
    title: 'Lập trình JavaScript cơ bản', category: 'Lập trình', level: 'beginner',
    description: 'Nắm vững cú pháp, kiểu dữ liệu, hàm, mảng, đối tượng và xử lý bất đồng bộ trong JavaScript.',
    lessons: [
      ['Giới thiệu JavaScript', 'JavaScript là ngôn ngữ lập trình chạy trên trình duyệt và máy chủ. Nó được dùng để tạo trang web tương tác.\nBiến được khai báo bằng let và const. Dùng const cho giá trị không gán lại, let cho giá trị thay đổi.\nKiểu dữ liệu nguyên thủy gồm string, number, boolean, null, undefined, bigint và symbol.', 'https://www.youtube.com/watch?v=W6NZfCO5SIk'],
      ['Toán tử và câu lệnh điều kiện', 'Toán tử so sánh === kiểm tra cả giá trị và kiểu dữ liệu, nên dùng thay cho ==.\nCâu lệnh if, else if, else và switch giúp rẽ nhánh chương trình.\nToán tử ba ngôi điều_kiện ? a : b là cách viết gọn của if else.'],
      ['Vòng lặp', 'Vòng lặp for lặp với số lần xác định. Vòng lặp while lặp khi điều kiện còn đúng.\nfor...of duyệt các phần tử của mảng, for...in duyệt các khóa của đối tượng.\nbreak dùng để thoát vòng lặp, continue bỏ qua lần lặp hiện tại.'],
      ['Hàm và phạm vi', 'Hàm là khối lệnh có thể tái sử dụng. Arrow function là cú pháp ngắn gọn.\nPhạm vi của biến let và const là phạm vi khối. Closure là hàm ghi nhớ biến của phạm vi bên ngoài.'],
      ['Mảng và đối tượng', 'Mảng lưu danh sách giá trị có thứ tự. Phương thức map, filter, reduce giúp xử lý mảng.\nĐối tượng lưu dữ liệu dạng cặp khóa và giá trị. Destructuring giúp lấy giá trị nhanh.\nToán tử spread ... dùng để sao chép hoặc gộp mảng, đối tượng.'],
      ['Promise và async/await', 'Promise đại diện cho kết quả của thao tác bất đồng bộ, có ba trạng thái pending, fulfilled và rejected.\nTừ khóa async và await giúp viết mã bất đồng bộ dễ đọc như mã đồng bộ. Lỗi được bắt bằng try catch.'],
    ],
    assignments: [
      ['Trình bày về Promise và async/await', 'Viết bài (150-300 từ) giải thích Promise, async/await và cho ví dụ.', 'Giải thích Promise; trạng thái pending fulfilled rejected; async await; xử lý lỗi try catch; ví dụ minh họa', 14],
      ['So sánh var, let và const', 'Trình bày điểm khác nhau giữa var, let và const kèm ví dụ.', 'phạm vi khối; hoisting; gán lại giá trị; khai báo lại; ví dụ', -5],
    ],
    quiz: ['Kiểm tra nhanh JavaScript', [
      ['Từ khóa nào khai báo hằng số?', ['var', 'let', 'const', 'static'], 2, 'const khai báo biến không thể gán lại.'],
      ['Phương thức nào tạo mảng mới từ kết quả của hàm?', ['forEach', 'map', 'push', 'find'], 1, 'map trả về mảng mới.'],
      ['await chỉ dùng được trong?', ['Mọi hàm', 'Hàm async', 'Vòng lặp for', 'Constructor'], 1, 'await dùng trong hàm async (hoặc top-level module).'],
      ['typeof null trả về?', ['"null"', '"undefined"', '"object"', '"number"'], 2, 'Đây là một đặc điểm lịch sử của JavaScript.'],
      ['Toán tử nào so sánh cả kiểu dữ liệu?', ['==', '===', '=', '!='], 1, '=== là so sánh nghiêm ngặt.'],
    ]],
  },
  {
    title: 'Node.js & Express xây dựng REST API', category: 'Backend', level: 'intermediate',
    description: 'Xây dựng REST API với Node.js, Express, middleware, xác thực JWT và kết nối MySQL.',
    lessons: [
      ['Node.js là gì', 'Node.js là môi trường chạy JavaScript phía máy chủ dựa trên V8.\nNode.js sử dụng mô hình vào ra không chặn và vòng lặp sự kiện, phù hợp ứng dụng nhiều thao tác I/O.', 'https://www.youtube.com/watch?v=TlB_eWDSMt4'],
      ['npm và module', 'npm là trình quản lý gói của Node.js. File package.json mô tả dự án và các thư viện phụ thuộc.\nES Modules dùng import và export để chia nhỏ mã nguồn.'],
      ['Express và Routing', 'Express là framework web tối giản cho Node.js. Router giúp tách các nhóm đường dẫn.\nMiddleware xử lý request trước khi tới handler, ví dụ kiểm tra đăng nhập hoặc ghi log.'],
      ['Thiết kế REST API', 'REST dùng phương thức HTTP GET, POST, PUT, DELETE để thao tác tài nguyên.\nMã trạng thái 200 thành công, 201 tạo mới, 400 dữ liệu sai, 401 chưa đăng nhập, 403 không có quyền, 404 không tìm thấy.'],
      ['Xác thực với JWT', 'JSON Web Token gồm ba phần header, payload và signature.\nMáy chủ ký token khi đăng nhập và kiểm tra token ở mỗi request thông qua header Authorization.'],
    ],
    assignments: [
      ['Thiết kế REST API quản lý sinh viên', 'Mô tả các endpoint CRUD, phương thức HTTP, mã trạng thái và cách xác thực.', 'Endpoint CRUD; phương thức GET POST PUT DELETE; mã trạng thái HTTP; middleware; xác thực JWT', 10],
    ],
    quiz: ['Kiểm tra Node.js & Express', [
      ['Node.js chạy trên engine nào?', ['SpiderMonkey', 'V8', 'Chakra', 'JVM'], 1, 'Node.js dùng V8 của Google.'],
      ['Mã trạng thái khi tạo mới thành công?', ['200', '201', '204', '301'], 1, '201 Created.'],
      ['Middleware trong Express nhận mấy tham số chính?', ['1', '2', '3 (req, res, next)', '5'], 2, 'Middleware có dạng (req, res, next).'],
      ['JWT gồm mấy phần?', ['2', '3', '4', '5'], 1, 'header.payload.signature'],
    ]],
  },
  {
    title: 'React từ cơ bản đến nâng cao', category: 'Frontend', level: 'intermediate',
    description: 'Component, props, state, hooks, React Router và gọi API trong ứng dụng React.',
    lessons: [
      ['Component và JSX', 'React xây dựng giao diện từ các component. JSX cho phép viết cú pháp giống HTML trong JavaScript.\nProps truyền dữ liệu từ component cha xuống component con.', 'https://www.youtube.com/watch?v=SqcY0GlETPk'],
      ['State và useState', 'useState lưu trạng thái của component. Khi state thay đổi, component được render lại.\nKhông sửa state trực tiếp mà dùng hàm setState.'],
      ['useEffect và gọi API', 'useEffect chạy hiệu ứng phụ như gọi API, đăng ký sự kiện.\nMảng phụ thuộc quyết định khi nào effect chạy lại. Hàm trả về dùng để dọn dẹp.'],
      ['React Router', 'React Router quản lý điều hướng trong ứng dụng một trang.\nRoute ánh xạ đường dẫn tới component tương ứng, useParams đọc tham số trên URL.'],
      ['Context và quản lý trạng thái', 'Context chia sẻ dữ liệu cho nhiều component mà không cần truyền props qua nhiều cấp.\nThường dùng cho thông tin đăng nhập, giao diện sáng tối, ngôn ngữ.'],
    ],
    assignments: [
      ['Giải thích vòng đời component với Hooks', 'Trình bày cách useState và useEffect hoạt động, cho ví dụ gọi API.', 'useState; useEffect; mảng phụ thuộc; render lại; dọn dẹp; ví dụ gọi API', 7],
    ],
    quiz: ['Kiểm tra React', [
      ['Hook nào dùng để lưu trạng thái?', ['useEffect', 'useState', 'useRef', 'useMemo'], 1, 'useState lưu state.'],
      ['Props truyền dữ liệu theo chiều nào?', ['Con → cha', 'Cha → con', 'Hai chiều', 'Không truyền được'], 1, 'Dữ liệu một chiều từ cha xuống con.'],
      ['Hook đọc tham số URL trong React Router?', ['useParams', 'useState', 'useUrl', 'useRoute'], 0, 'useParams trả về các tham số động.'],
      ['JSX được biên dịch thành?', ['HTML', 'Lời gọi React.createElement / jsx()', 'CSS', 'JSON'], 1, 'JSX là cú pháp đường.'],
    ]],
  },
  {
    title: 'Cơ sở dữ liệu MySQL', category: 'Cơ sở dữ liệu', level: 'beginner',
    description: 'Thiết kế CSDL quan hệ, chuẩn hóa, truy vấn SQL, JOIN, chỉ mục và giao dịch.',
    lessons: [
      ['Mô hình quan hệ', 'Cơ sở dữ liệu quan hệ lưu dữ liệu trong các bảng. Khóa chính định danh duy nhất mỗi dòng.\nKhóa ngoại liên kết các bảng với nhau và đảm bảo toàn vẹn tham chiếu.'],
      ['Truy vấn SELECT', 'Câu lệnh SELECT dùng để truy vấn dữ liệu. WHERE lọc dòng, ORDER BY sắp xếp, LIMIT giới hạn số dòng.'],
      ['JOIN và GROUP BY', 'INNER JOIN kết hợp các dòng khớp ở hai bảng, LEFT JOIN giữ toàn bộ dòng bảng trái.\nGROUP BY nhóm dữ liệu để tính tổng hợp với COUNT, SUM, AVG. HAVING lọc sau khi nhóm.'],
      ['Chuẩn hóa dữ liệu', 'Chuẩn hóa giúp loại bỏ dư thừa dữ liệu. 1NF yêu cầu giá trị nguyên tố, 2NF loại bỏ phụ thuộc bộ phận, 3NF loại bỏ phụ thuộc bắc cầu.'],
      ['Chỉ mục và giao dịch', 'Chỉ mục giúp tăng tốc truy vấn. Giao dịch đảm bảo tính ACID: nguyên tố, nhất quán, cô lập, bền vững.'],
    ],
    assignments: [
      ['Thiết kế CSDL quản lý thư viện', 'Thiết kế các bảng, khóa chính, khóa ngoại cho hệ thống quản lý thư viện và viết 3 câu truy vấn mẫu.', 'bảng; khóa chính; khóa ngoại; quan hệ; chuẩn hóa; truy vấn JOIN', 12],
      ['Viết truy vấn thống kê', 'Viết truy vấn thống kê số sách mượn theo tháng dùng GROUP BY.', 'SELECT; GROUP BY; COUNT; JOIN; ORDER BY', -10],
    ],
    quiz: ['Kiểm tra SQL', [
      ['Lệnh nào dùng để truy vấn dữ liệu?', ['INSERT', 'SELECT', 'UPDATE', 'DROP'], 1, 'SELECT đọc dữ liệu.'],
      ['LEFT JOIN giữ lại?', ['Chỉ dòng khớp', 'Toàn bộ bảng trái', 'Toàn bộ bảng phải', 'Không dòng nào'], 1, 'LEFT JOIN giữ mọi dòng bảng trái.'],
      ['Mệnh đề lọc sau GROUP BY?', ['WHERE', 'HAVING', 'ORDER BY', 'LIMIT'], 1, 'HAVING lọc nhóm.'],
      ['ACID chữ I nghĩa là?', ['Index', 'Isolation (cô lập)', 'Insert', 'Integer'], 1, 'Isolation.'],
    ]],
  },
  {
    title: 'HTML & CSS cho người mới', category: 'Frontend', level: 'beginner',
    description: 'Xây dựng trang web tĩnh với HTML5 ngữ nghĩa, CSS Flexbox, Grid và thiết kế responsive.',
    lessons: [
      ['Cấu trúc HTML', 'HTML mô tả cấu trúc trang web bằng các thẻ. Thẻ ngữ nghĩa như header, nav, main, footer giúp trang dễ hiểu với trình đọc màn hình và SEO.'],
      ['CSS cơ bản', 'CSS định dạng giao diện. Bộ chọn class, id, thẻ. Mô hình hộp gồm content, padding, border và margin.'],
      ['Flexbox', 'Flexbox sắp xếp phần tử theo một chiều. justify-content căn theo trục chính, align-items căn theo trục phụ.'],
      ['CSS Grid và Responsive', 'Grid sắp xếp bố cục hai chiều. Media query giúp giao diện thay đổi theo kích thước màn hình.'],
    ],
    assignments: [
      ['Phân biệt Flexbox và Grid', 'Trình bày khi nào nên dùng Flexbox, khi nào dùng Grid, có ví dụ.', 'flexbox; grid; một chiều; hai chiều; responsive; ví dụ', 20],
    ],
    quiz: ['Kiểm tra HTML & CSS', [
      ['Thẻ nào là thẻ ngữ nghĩa?', ['div', 'span', 'article', 'b'], 2, 'article có ý nghĩa nội dung.'],
      ['Thuộc tính căn theo trục chính trong Flexbox?', ['align-items', 'justify-content', 'flex-wrap', 'gap'], 1, 'justify-content.'],
      ['Media query dùng để?', ['Phát video', 'Thiết kế responsive', 'Nhúng font', 'Tạo animation'], 1, 'Thay đổi giao diện theo màn hình.'],
    ]],
  },
  {
    title: 'Git & GitHub làm việc nhóm', category: 'Công cụ', level: 'beginner',
    description: 'Quản lý phiên bản mã nguồn với Git, làm việc nhóm với branch, pull request trên GitHub.',
    lessons: [
      ['Git là gì', 'Git là hệ thống quản lý phiên bản phân tán. Mỗi commit là một ảnh chụp trạng thái dự án.'],
      ['Các lệnh cơ bản', 'git init tạo kho, git add đưa thay đổi vào vùng chờ, git commit lưu lại, git status xem trạng thái, git log xem lịch sử.'],
      ['Branch và merge', 'Branch cho phép phát triển tính năng độc lập. git merge gộp nhánh, xung đột cần được giải quyết thủ công.'],
      ['GitHub và Pull Request', 'GitHub lưu kho từ xa. git push đẩy mã lên, pull request để đồng đội xem xét trước khi gộp.'],
    ],
    assignments: [],
    quiz: ['Kiểm tra Git', [
      ['Lệnh lưu thay đổi vào lịch sử?', ['git add', 'git commit', 'git push', 'git status'], 1, 'git commit.'],
      ['Lệnh đẩy mã lên kho từ xa?', ['git pull', 'git fetch', 'git push', 'git clone'], 2, 'git push.'],
      ['Pull request dùng để?', ['Xóa nhánh', 'Đề nghị gộp mã và review', 'Tạo kho', 'Hoàn tác commit'], 1, 'Review trước khi merge.'],
    ]],
  },
  {
    title: 'Cấu trúc dữ liệu và giải thuật', category: 'Lập trình', level: 'advanced',
    description: 'Độ phức tạp thuật toán, mảng, danh sách liên kết, ngăn xếp, hàng đợi, cây, đồ thị, sắp xếp và tìm kiếm.',
    lessons: [
      ['Độ phức tạp thuật toán', 'Ký hiệu Big O mô tả tốc độ tăng của thời gian chạy theo kích thước đầu vào. O(1), O(log n), O(n), O(n log n), O(n^2).'],
      ['Ngăn xếp và hàng đợi', 'Ngăn xếp hoạt động theo nguyên tắc LIFO, hàng đợi theo nguyên tắc FIFO.'],
      ['Sắp xếp', 'Sắp xếp nổi bọt có độ phức tạp O(n^2). Sắp xếp trộn và sắp xếp nhanh trung bình O(n log n).'],
      ['Tìm kiếm nhị phân', 'Tìm kiếm nhị phân trên mảng đã sắp xếp có độ phức tạp O(log n), mỗi bước loại bỏ một nửa số phần tử.'],
      ['Cây và đồ thị', 'Cây nhị phân tìm kiếm cho phép tìm, thêm, xóa trung bình O(log n). Đồ thị duyệt bằng BFS và DFS.'],
    ],
    assignments: [
      ['Phân tích độ phức tạp thuật toán sắp xếp', 'So sánh độ phức tạp của sắp xếp nổi bọt, sắp xếp trộn và sắp xếp nhanh.', 'Big O; nổi bọt O(n^2); trộn O(n log n); nhanh; trường hợp xấu nhất; bộ nhớ', 9],
    ],
    quiz: ['Kiểm tra giải thuật', [
      ['Độ phức tạp tìm kiếm nhị phân?', ['O(n)', 'O(log n)', 'O(n^2)', 'O(1)'], 1, 'Mỗi bước chia đôi.'],
      ['Ngăn xếp hoạt động theo nguyên tắc?', ['FIFO', 'LIFO', 'Ngẫu nhiên', 'Ưu tiên'], 1, 'Last In First Out.'],
      ['Thuật toán duyệt đồ thị theo chiều rộng?', ['DFS', 'BFS', 'Dijkstra', 'Kruskal'], 1, 'Breadth First Search.'],
    ]],
  },
  {
    title: 'Ứng dụng AI trong phát triển phần mềm', category: 'Trí tuệ nhân tạo', level: 'advanced',
    description: 'Tích hợp mô hình ngôn ngữ lớn (Groq, Gemini, GPT-4o) vào ứng dụng: prompt engineering, JSON output, đánh giá kết quả.',
    lessons: [
      ['Mô hình ngôn ngữ lớn', 'Mô hình ngôn ngữ lớn được huấn luyện trên lượng văn bản khổng lồ. Chúng có thể sinh văn bản, tóm tắt và trả lời câu hỏi.'],
      ['Gọi API mô hình AI', 'Các nhà cung cấp như Groq, OpenAI, Gemini cung cấp REST API. Ứng dụng gửi prompt và nhận về văn bản hoặc JSON. API key phải được giữ bí mật ở máy chủ.'],
      ['Prompt engineering', 'Prompt rõ ràng, có vai trò, ngữ cảnh và định dạng đầu ra cụ thể giúp mô hình trả lời chính xác hơn. Yêu cầu đầu ra JSON giúp dễ xử lý trong ứng dụng.'],
      ['Đánh giá và an toàn', 'Kết quả AI có thể sai, cần con người kiểm duyệt với các quyết định quan trọng. Cần có phương án dự phòng khi dịch vụ AI lỗi.'],
    ],
    assignments: [
      ['Đề xuất ứng dụng AI cho giáo dục', 'Đề xuất một tính năng AI cho hệ thống học tập, mô tả prompt, dữ liệu đầu vào, đầu ra và rủi ro.', 'tính năng AI; prompt; đầu vào; đầu ra JSON; rủi ro; kiểm duyệt con người', 25],
    ],
    quiz: ['Kiểm tra AI ứng dụng', [
      ['API key của AI nên lưu ở đâu?', ['Mã nguồn frontend', 'Biến môi trường phía server', 'LocalStorage', 'Đăng lên GitHub'], 1, 'Giữ bí mật ở server.'],
      ['Yêu cầu đầu ra JSON giúp?', ['AI chạy nhanh hơn', 'Dễ xử lý kết quả trong ứng dụng', 'Giảm giá', 'Không có tác dụng'], 1, 'Dữ liệu có cấu trúc.'],
      ['Khi dịch vụ AI lỗi nên?', ['Dừng hệ thống', 'Có phương án dự phòng', 'Báo lỗi 500 mãi', 'Xóa dữ liệu'], 1, 'Fallback.'],
    ]],
  },
];

// Sinh bài làm ngẫu nhiên: mỗi câu ghép từ nhiều mảnh 1-2 từ chọn từ kho lớn,
// nên các cụm 3 từ hiếm khi trùng giữa hai sinh viên — giống văn viết thật hơn.
const W = {
  open: ['Theo em', 'Em nghĩ', 'Có thể nói', 'Thực tế', 'Nhìn chung', 'Đầu tiên', 'Tiếp theo', 'Mặt khác', 'Cụ thể', 'Hiểu đơn giản', 'Trước hết', 'Sau cùng', 'Bên cạnh đó', 'Rõ ràng'],
  adv: ['thật sự', 'khá', 'rất', 'luôn', 'thường', 'hẳn', 'chắc chắn', 'đôi khi', 'phần lớn', 'gần như'],
  verb: ['quan trọng', 'cần thiết', 'hữu ích', 'dễ nhầm', 'phức tạp', 'cơ bản', 'thú vị', 'then chốt', 'phổ biến', 'mới mẻ', 'đáng nhớ', 'khó hiểu'],
  why: ['vì', 'do', 'bởi', 'nhờ', 'khi', 'nếu', 'dù', 'lúc'],
  who: ['em', 'nhóm em', 'bạn em', 'cả lớp', 'mọi người', 'tụi em', 'chúng em', 'người mới'],
  act: ['làm', 'viết', 'thử', 'sửa', 'đọc', 'chạy', 'học', 'ôn', 'xem', 'debug', 'test', 'dựng'],
  obj: ['đồ án', 'bài lab', 'project', 'website', 'ứng dụng', 'bài tập', 'mini game', 'API', 'trang quản trị', 'bài thi', 'demo', 'module'],
  where: ['tuần trước', 'hôm qua', 'ở nhà', 'trên lớp', 'kỳ này', 'tháng rồi', 'buổi tối', 'cuối tuần', 'năm ngoái', 'gần đây'],
  extra: ['em thấy vậy', 'theo kinh nghiệm', 'nói chung', 'đúng không ạ', 'em nghĩ thế', 'em đoán vậy', 'đại khái thế', 'về cơ bản'],
};
const sentence = (k) => `${pick(W.open)} ${k} ${pick(W.adv)} ${pick(W.verb)} ${pick(W.why)} ${pick(W.who)} ${pick(W.act)} ${pick(W.obj)} ${pick(W.where)}, ${pick(W.extra)}.`;

function makeAnswer(rubric, quality) {
  const keys = rubric.split(';').map((s) => s.trim()).filter(Boolean);
  const used = shuffle(keys).slice(0, Math.max(1, Math.round(keys.length * quality)));
  const sentences = [];
  for (const k of used) {
    const n = quality > 0.7 ? int(2, 3) : int(1, 2);
    for (let i = 0; i < n; i++) sentences.push(sentence(k));
  }
  return shuffle(sentences).join(' ');
}

const courseIds = [];
for (const [ci, c] of COURSES.entries()) {
  const created = daysAgo(int(60, 100));
  const r = await q('INSERT INTO courses (title, description, category, level, teacher_id, created_at) VALUES (?, ?, ?, ?, ?, ?)', [
    c.title, c.description, c.category, c.level, teacherIds[ci % teacherIds.length], created,
  ]);
  c.id = r.insertId;
  courseIds.push(c.id);
  c.lessonIds = [];
  for (const [pi, [title, content, video]] of c.lessons.entries()) {
    const l = await q('INSERT INTO lessons (course_id, title, content, video_url, position, duration_min) VALUES (?, ?, ?, ?, ?, ?)', [
      c.id, title, content, video || null, pi + 1, int(8, 30),
    ]);
    c.lessonIds.push(l.insertId);
  }
  c.assignmentRows = [];
  for (const [title, description, rubric, dueIn] of c.assignments) {
    const due = new Date();
    due.setDate(due.getDate() + dueIn);
    due.setHours(23, 59, 0, 0);
    const a = await q('INSERT INTO assignments (course_id, title, description, rubric, max_score, due_date, created_at) VALUES (?, ?, ?, ?, 10, ?, ?)', [
      c.id, title, description, rubric, due.toISOString().slice(0, 19).replace('T', ' '), daysAgo(int(20, 40)),
    ]);
    c.assignmentRows.push({ id: a.insertId, title, description, rubric, max_score: 10, dueIn });
  }
  const [qt, questions] = c.quiz;
  const qz = await q('INSERT INTO quizzes (course_id, title) VALUES (?, ?)', [c.id, qt]);
  c.quizId = qz.insertId;
  c.questionIds = [];
  for (const [question, options, correct, explanation] of questions) {
    const qq = await q('INSERT INTO quiz_questions (quiz_id, question, options, correct_index, explanation) VALUES (?, ?, ?, ?, ?)', [
      c.quizId, question, JSON.stringify(options), correct, explanation,
    ]);
    c.questionIds.push({ id: qq.insertId, correct, n: options.length });
  }
}
// Một khóa học nháp (chưa công khai)
await q("INSERT INTO courses (title, description, category, level, teacher_id, published) VALUES ('Docker & triển khai ứng dụng', 'Đóng gói ứng dụng bằng Docker và triển khai lên máy chủ. (Đang soạn)', 'Công cụ', 'intermediate', ?, 0)", [teacherIds[0]]);

/* ---------------- Ghi danh, tiến độ, bài nộp, trắc nghiệm ---------------- */
const stats = { enroll: 0, progress: 0, sub: 0, attempt: 0, comment: 0 };
const notifs = [];
const submissionsByAssignment = new Map();

for (const uid of studentIds) {
  // Sinh viên demo (student@) có lịch học cố định để trang tổng quan đẹp: học 3 khóa, chuỗi 5 ngày
  const myCourses = uid === STUDENT ? [COURSES[0], COURSES[1], COURSES[2], COURSES[3]] : shuffle(COURSES).slice(0, int(2, 5));
  const diligence = uid === STUDENT ? 0.75 : rand(); // mức chăm chỉ
  for (const c of myCourses) {
    const enrolledDaysAgo = int(15, 50);
    await q('INSERT INTO enrollments (user_id, course_id, enrolled_at) VALUES (?, ?, ?)', [uid, c.id, daysAgo(enrolledDaysAgo)]);
    stats.enroll++;
    notifs.push([uid, 'Ghi danh thành công', `Bạn đã ghi danh khóa học "${c.title}".`, `/courses/${c.id}`, 1, daysAgo(enrolledDaysAgo)]);

    const doneCount = uid === STUDENT ? Math.min(c.lessonIds.length, [5, 3, 2, 1][COURSES.indexOf(c)]) : Math.round(c.lessonIds.length * Math.min(1, diligence * rand() * 1.6));
    for (let i = 0; i < doneCount; i++) {
      const d = uid === STUDENT ? Math.max(0, 4 - ((i + COURSES.indexOf(c)) % 5)) : int(0, enrolledDaysAgo);
      await q('INSERT INTO lesson_progress (user_id, lesson_id, completed_at) VALUES (?, ?, ?)', [uid, c.lessonIds[i], daysAgo(d)]);
      stats.progress++;
    }

    // Trắc nghiệm
    const attempts = uid === STUDENT ? (c === COURSES[0] ? 2 : 0) : rand() < 0.3 + diligence * 0.5 ? int(1, 3) : 0;
    for (let a = 0; a < attempts; a++) {
      const answers = {};
      let correct = 0;
      for (const qq of c.questionIds) {
        const ok = rand() < 0.35 + diligence * 0.5 + a * 0.1;
        const choice = ok ? qq.correct : (qq.correct + int(1, qq.n - 1)) % qq.n;
        answers[qq.id] = choice;
        if (ok) correct++;
      }
      const score = Math.round((correct / c.questionIds.length) * 100) / 10;
      await q('INSERT INTO quiz_attempts (quiz_id, user_id, answers, score, created_at) VALUES (?, ?, ?, ?, ?)', [
        c.quizId, uid, JSON.stringify(answers), score, daysAgo(int(0, 20)),
      ]);
      stats.attempt++;
    }

    // Bài tập: sinh viên demo để trống bài đầu tiên của khóa 1 để tự thử nộp
    for (const a of c.assignmentRows) {
      if (uid === STUDENT && a === COURSES[0].assignmentRows[0]) continue;
      const submitChance = a.dueIn < 0 ? 0.9 : 0.55;
      if (uid !== STUDENT && rand() > submitChance * (0.4 + diligence * 0.6)) continue;
      const list = submissionsByAssignment.get(a.id) || [];
      // ~8% sinh viên chép bài của bạn
      const content = list.length && rand() < 0.08
        ? `${pick(list).content} Em xin trình bày như trên.`
        : makeAnswer(a.rubric, Math.min(1, 0.2 + diligence * 0.8 + rand() * 0.2));
      list.push({ uid, content, assignment: a });
      submissionsByAssignment.set(a.id, list);
    }
  }
}

for (const [assignmentId, list] of submissionsByAssignment) {
  // Quét đạo văn trên toàn bộ bài nộp (giống nút "Quét đạo văn" của giảng viên)
  const plags = list.map((s, i) =>
    findMostSimilar(s.content, list.map((o, j) => ({ id: j, content: o.content })).filter((o) => o.id !== i)),
  );
  const ids = [];
  for (const [i, s] of list.entries()) {
    const a = s.assignment;
    const plag = plags[i];
    const ai = mockGrade({ assignment: a, content: s.content });
    // Bài đã quá hạn hoặc nộp sớm có xác suất đã được giảng viên chấm
    const graded = a.dueIn < 0 ? rand() < 0.85 : rand() < 0.4;
    const finalScore = graded
      ? Math.max(0, Math.min(10, Math.round((Number(ai.score) + (rand() * 2 - 0.6) - (plag.score >= 40 ? 4 : 0)) * 2) / 2))
      : ai.score;
    const submittedAgo = a.dueIn < 0 ? int(-a.dueIn + 1, -a.dueIn + 8) : int(0, 6);
    const r = await q(
      `INSERT INTO submissions (assignment_id, user_id, content, score, ai_score, ai_feedback, teacher_feedback,
        plagiarism_score, status, submitted_at, graded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        assignmentId, s.uid, s.content, finalScore, ai.score,
        JSON.stringify({ feedback: ai.feedback, strengths: ai.strengths, improvements: ai.improvements, provider: 'mock' }),
        graded ? (plag.score >= 40 ? 'Bài có dấu hiệu sao chép, trừ điểm.' : pick(['Bài làm tốt.', 'Cần thêm ví dụ minh họa.', 'Trình bày rõ ràng, đủ ý.', 'Nội dung còn sơ sài.'])) : null,
        plag.score, graded ? 'graded' : 'ai_graded', daysAgo(submittedAgo), graded ? daysAgo(Math.max(0, submittedAgo - 1)) : null,
      ],
    );
    ids.push(r.insertId);
    s.submittedAgo = submittedAgo;
    stats.sub++;
    if (graded) notifs.push([s.uid, 'Bài tập đã được chấm', `"${a.title}": ${finalScore}/10`, `/assignments/${assignmentId}`, rand() < 0.6 ? 1 : 0, daysAgo(Math.max(0, submittedAgo - 1))]);
  }
  for (const [i, s] of list.entries()) {
    const plag = plags[i];
    if (plag.sourceId == null) continue;
    await q('UPDATE submissions SET plagiarism_source_id = ? WHERE id = ?', [ids[plag.sourceId], ids[i]]);
    if (plag.score >= 40) {
      for (const t of [1, ...teacherIds]) {
        notifs.push([t, 'Cảnh báo đạo văn', `Bài nộp #${ids[i]} (${s.assignment.title}) trùng ${plag.score}% với bài #${ids[plag.sourceId]}.`, `/admin/assignments/${assignmentId}`, 0, daysAgo(s.submittedAgo)]);
      }
    }
  }
}

/* ---------------- Thảo luận ---------------- */
const QUESTIONS = [
  'Phần này em chưa hiểu lắm, thầy/cô có thể giải thích thêm không ạ?',
  'Có tài liệu tham khảo thêm cho bài này không ạ?',
  'Bài giảng rất dễ hiểu, cảm ơn thầy/cô!',
  'Ví dụ trong bài chạy thử bị lỗi, mọi người kiểm tra giúp em với.',
  'Em nghĩ phần này nên có thêm bài tập thực hành.',
  'Cho em hỏi phần này có trong bài kiểm tra không ạ?',
];
const ANSWERS = [
  'Em xem lại ví dụ ở cuối bài và thử chạy từng dòng nhé.',
  'Câu hỏi hay! Thầy sẽ bổ sung ví dụ trong buổi tới.',
  'Bạn thử kiểm tra lại cú pháp, mình cũng bị lỗi đó và sửa được rồi.',
  'Có nhé, nội dung này sẽ xuất hiện trong bài kiểm tra.',
];
for (const c of COURSES) {
  for (const lid of c.lessonIds.slice(0, 3)) {
    const n = int(0, 4);
    for (let i = 0; i < n; i++) {
      const d = int(1, 25);
      await q('INSERT INTO comments (lesson_id, user_id, content, created_at) VALUES (?, ?, ?, ?)', [lid, pick(studentIds), pick(QUESTIONS), daysAgo(d)]);
      if (rand() < 0.6) {
        await q('INSERT INTO comments (lesson_id, user_id, content, created_at) VALUES (?, ?, ?, ?)', [
          lid, rand() < 0.6 ? pick(teacherIds) : pick(studentIds), pick(ANSWERS), daysAgo(Math.max(0, d - 1)),
        ]);
        stats.comment++;
      }
      stats.comment++;
    }
  }
}

/* ---------------- Thông báo, lộ trình, chat mẫu cho sinh viên demo ---------------- */
notifs.push([STUDENT, 'Chào mừng tới EduTrack AI', 'Hãy thử tính năng Gợi ý lộ trình học bằng AI!', '/learning-path', 0, daysAgo(0)]);
notifs.push([STUDENT, 'Bài tập mới', 'Trình bày về Promise và async/await', `/assignments/${COURSES[0].assignmentRows[0].id}`, 0, daysAgo(1)]);
await q('INSERT INTO notifications (user_id, title, message, link, is_read, created_at) VALUES ?', [notifs]);

await q('INSERT INTO learning_paths (user_id, goal, plan, created_at) VALUES (?, ?, ?, ?)', [
  STUDENT,
  'Trở thành lập trình viên Fullstack JavaScript',
  JSON.stringify({
    summary: 'Lộ trình 4 bước hướng tới mục tiêu: Trở thành lập trình viên Fullstack JavaScript.',
    steps: [
      { order: 1, courseId: COURSES[1].id, title: COURSES[1].title, weeks: 2, reason: 'Bạn đã hoàn thành 60% — hãy tiếp tục để nắm vững backend.' },
      { order: 2, courseId: COURSES[2].id, title: COURSES[2].title, weeks: 2, reason: 'Frontend React là nửa còn lại của Fullstack.' },
      { order: 3, courseId: COURSES[3].id, title: COURSES[3].title, weeks: 2, reason: 'Cơ sở dữ liệu cần cho mọi ứng dụng web.' },
      { order: 4, courseId: COURSES[7].id, title: COURSES[7].title, weeks: 3, reason: 'Ứng dụng AI giúp sản phẩm nổi bật hơn.' },
    ],
    tips: ['Học đều 45–60 phút mỗi ngày.', 'Làm dự án nhỏ sau mỗi khóa.', 'Hỏi Trợ lý AI khi gặp khó khăn.'],
    provider: 'mock',
  }),
  daysAgo(3),
]);
await q('INSERT INTO ai_chat_messages (user_id, role, content, created_at) VALUES ?', [[
  [STUDENT, 'user', 'Closure trong JavaScript là gì?', daysAgo(2, 20, 10)],
  [STUDENT, 'assistant', 'Closure là khi một hàm "ghi nhớ" các biến ở phạm vi bên ngoài nơi nó được tạo, kể cả khi phạm vi đó đã kết thúc. Ví dụ: function dem() { let n = 0; return () => ++n; } const tang = dem(); tang(); // 1, tang(); // 2. Biến n vẫn được giữ lại nhờ closure.', daysAgo(2, 20, 10)],
]]);

conn.release();
await pool.end();
console.log(
  `Đã tạo dữ liệu mẫu: ${users.length} người dùng (${studentIds.length} sinh viên), ${COURSES.length + 1} khóa học, ` +
    `${stats.enroll} lượt ghi danh, ${stats.progress} bài học hoàn thành, ${stats.sub} bài nộp, ${stats.attempt} lượt trắc nghiệm, ${stats.comment} bình luận.`,
);
console.log('Tài khoản (mật khẩu 123456): admin@edutrack.vn, teacher@edutrack.vn, student@edutrack.vn');
