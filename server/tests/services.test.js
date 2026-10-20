import './setup-mock.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { similarity, findMostSimilar, normalize } from '../src/services/plagiarism.js';
import { mockGrade, mockLearningPath, mockQuiz, gradeSubmission, stripMarkdown } from '../src/services/ai.js';
import { computeStreak } from '../src/routes/stats.js';

test('normalize giữ dấu tiếng Việt và bỏ ký tự đặc biệt', () => {
  assert.deepEqual(normalize('Xin chào, Việt Nam!'), ['xin', 'chào', 'việt', 'nam']);
});

test('similarity: văn bản giống hệt = 100, khác hoàn toàn ~ 0', () => {
  const a = 'Promise đại diện cho kết quả của một thao tác bất đồng bộ trong JavaScript';
  assert.equal(similarity(a, a), 100);
  assert.ok(similarity(a, 'Hôm nay trời nắng đẹp, chúng tôi đi dã ngoại ở công viên') < 10);
});

test('findMostSimilar tìm đúng bài bị sao chép', () => {
  const src = 'React xây dựng giao diện từ các component và JSX cho phép viết cú pháp giống HTML';
  const copied = `${src}. Ngoài ra props truyền dữ liệu.`;
  const best = findMostSimilar(copied, [
    { id: 1, content: 'MySQL là hệ quản trị cơ sở dữ liệu quan hệ' },
    { id: 2, content: src },
  ]);
  assert.equal(best.sourceId, 2);
  assert.ok(best.score > 60);
});

test('mockGrade: bài đầy đủ ý được điểm cao hơn bài sơ sài', () => {
  const assignment = { title: 'Promise', rubric: 'promise pending fulfilled rejected async await', max_score: 10 };
  const good = mockGrade({
    assignment,
    content: 'Promise có ba trạng thái pending fulfilled rejected. Dùng async await để viết gọn. '.repeat(15),
  });
  const bad = mockGrade({ assignment, content: 'Em không biết' });
  assert.ok(good.score > bad.score);
  assert.ok(good.score <= 10 && bad.score >= 0);
});

test('gradeSubmission (mock) giới hạn điểm trong thang', async () => {
  const r = await gradeSubmission({ assignment: { title: 'X', max_score: 5 }, content: 'nội dung '.repeat(400) });
  assert.equal(r.provider, 'mock');
  assert.ok(r.score >= 0 && r.score <= 5);
});

test('mockLearningPath ưu tiên khóa khớp mục tiêu và bỏ khóa đã xong', () => {
  const courses = [
    { id: 1, title: 'MySQL', category: 'CSDL', level: 'beginner' },
    { id: 2, title: 'React nâng cao', category: 'Frontend', level: 'advanced' },
    { id: 3, title: 'JavaScript', category: 'Lập trình', level: 'beginner' },
  ];
  const plan = mockLearningPath({ goal: 'học React', courses, progress: [{ course_id: 3, percent: 100 }] });
  assert.equal(plan.steps[0].courseId, 2);
  assert.ok(!plan.steps.some((s) => s.courseId === 3));
});

test('mockQuiz sinh đủ số câu hỏi hợp lệ', () => {
  const { questions } = mockQuiz({ title: 'JS', content: 'JavaScript là ngôn ngữ lập trình phổ biến nhất thế giới.', count: 3 });
  assert.equal(questions.length, 3);
  for (const q of questions) assert.ok(q.options[q.correct_index]);
});

test('computeStreak đếm ngày học liên tiếp', () => {
  const today = new Date(2026, 9, 20);
  assert.equal(computeStreak(['2026-10-20', '2026-10-19', '2026-10-18', '2026-10-15'], today), 3);
  assert.equal(computeStreak(['2026-10-19', '2026-10-18'], today), 2);
  assert.equal(computeStreak(['2026-10-10'], today), 0);
});

test('stripMarkdown bỏ ký hiệu định dạng', () => {
  assert.equal(stripMarkdown('## Tiêu đề\n**let** và `const`'), 'Tiêu đề\nlet và const');
  assert.equal(stripMarkdown('Ví dụ:\n```js\nlet a = 1;\n```'), 'Ví dụ:\n\nlet a = 1;\n');
});

test('findMostSimilar không báo oan khi nhiều bài cùng trích đề bài', () => {
  const de = 'Promise có ba trạng thái pending fulfilled rejected và async await giúp xử lý bất đồng bộ';
  const others = [
    `${de}. Em dùng nó khi gọi API lấy danh sách sản phẩm cho website bán hàng.`,
    `${de}. Nhóm em áp dụng trong đồ án quản lý thư viện ở kỳ trước.`,
    `${de}. Mình thấy phần xử lý lỗi bằng try catch là khó nhất khi mới học.`,
    `${de}. Bài lab tuần trước thầy cho đọc file JSON và hiển thị bảng điểm.`,
  ];
  const mine = `${de}. Tôi viết thử một hàm tải ảnh đại diện người dùng rồi hiện thông báo.`;
  assert.ok(findMostSimilar(mine, others.map((content, id) => ({ id, content }))).score < 40);
  const copied = `${others[1]} Em xin hết.`;
  const best = findMostSimilar(copied, others.map((content, id) => ({ id, content })));
  assert.equal(best.sourceId, 1);
  assert.ok(best.score >= 40);
});
