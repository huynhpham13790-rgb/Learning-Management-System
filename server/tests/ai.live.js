// Kiểm thử AI thật (Groq/Gemini/OpenAI theo .env). Chạy: npm run test:ai
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activeProvider, chatTutor, generateQuiz, gradeSubmission, recommendLearningPath } from '../src/services/ai.js';

const provider = activeProvider();
const skip = provider === 'mock' ? 'Chưa cấu hình API key AI trong server/.env' : false;

test(`nhà cung cấp AI đang dùng: ${provider}`, { skip }, () => assert.notEqual(provider, 'mock'));

test('AI chấm điểm: bài tốt điểm cao hơn bài kém', { skip }, async () => {
  const assignment = {
    title: 'Trình bày về Promise và async/await',
    rubric: 'Giải thích Promise; 3 trạng thái pending fulfilled rejected; async await; xử lý lỗi try catch; ví dụ',
    max_score: 10,
  };
  const good = await gradeSubmission({
    assignment,
    content: 'Promise là đối tượng đại diện cho kết quả của một thao tác bất đồng bộ. Promise có ba trạng thái: pending (đang chờ), fulfilled (thành công) và rejected (thất bại). Dùng async/await giúp viết mã bất đồng bộ như đồng bộ; lỗi được bắt bằng try/catch. Ví dụ: async function load(){ try { const r = await fetch(url); return await r.json(); } catch (e) { console.error(e); } }',
  });
  const bad = await gradeSubmission({ assignment, content: 'Em không biết làm.' });
  console.log('  tốt:', good.score, '-', good.feedback, '| kém:', bad.score);
  assert.equal(good.provider, provider);
  assert.ok(good.score > bad.score);
  assert.ok(typeof good.feedback === 'string' && good.feedback.length > 0);
});

test('AI gợi ý lộ trình học', { skip }, async () => {
  const plan = await recommendLearningPath({
    goal: 'Trở thành lập trình viên Frontend React',
    courses: [
      { id: 1, title: 'Lập trình JavaScript cơ bản', category: 'Lập trình', level: 'beginner' },
      { id: 2, title: 'React từ cơ bản đến nâng cao', category: 'Frontend', level: 'intermediate' },
      { id: 3, title: 'Cơ sở dữ liệu MySQL', category: 'CSDL', level: 'beginner' },
    ],
    progress: [{ course_id: 1, percent: 50 }],
    avgQuizScore: 7,
  });
  console.log('  lộ trình:', plan.summary, plan.steps.map((s) => s.title));
  assert.equal(plan.provider, provider);
  assert.ok(Array.isArray(plan.steps) && plan.steps.length > 0);
});

test('AI trợ lý trả lời tiếng Việt', { skip }, async () => {
  const { reply, provider: p } = await chatTutor([], 'let và const khác nhau thế nào?');
  console.log('  trả lời:', reply.slice(0, 120));
  assert.equal(p, provider);
  assert.ok(reply.length > 20);
});

test('AI sinh câu hỏi trắc nghiệm', { skip }, async () => {
  const r = await generateQuiz({
    title: 'Mảng và đối tượng',
    content: 'Mảng lưu danh sách giá trị có thứ tự. Phương thức map, filter, reduce giúp xử lý mảng. Đối tượng lưu dữ liệu dạng cặp khóa và giá trị.',
    count: 3,
  });
  console.log('  câu 1:', r.questions[0]?.question);
  assert.equal(r.provider, provider);
  assert.ok(r.questions.length >= 1);
  for (const q of r.questions) assert.ok(q.options.length >= 2 && q.options[q.correct_index] !== undefined);
});
