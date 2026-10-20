// Lớp tích hợp AI: hỗ trợ Groq, Gemini, OpenAI (GPT-4o) và chế độ mock offline.
// Mọi hàm đều tự động rơi về mock nếu nhà cung cấp lỗi, để hệ thống không bị gián đoạn.
import { env } from '../config/env.js';
import { normalize } from './plagiarism.js';

async function callGemini(prompt, json) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.ai.geminiModel}:generateContent?key=${env.ai.geminiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: json ? { responseMimeType: 'application/json' } : {},
    }),
  });
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
}

// Groq dùng API tương thích OpenAI nên chung một hàm gọi
async function callOpenAICompatible(url, key, model, prompt, json) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      ...(json ? { response_format: { type: 'json_object' } } : {}),
    }),
  });
  if (!res.ok) throw new Error(`${model} HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

const callOpenAI = (prompt, json) =>
  callOpenAICompatible('https://api.openai.com/v1/chat/completions', env.ai.openaiKey, env.ai.openaiModel, prompt, json);
const callGroq = (prompt, json) =>
  callOpenAICompatible('https://api.groq.com/openai/v1/chat/completions', env.ai.groqKey, env.ai.groqModel, prompt, json);

export function activeProvider() {
  const { provider, geminiKey, openaiKey, groqKey } = env.ai;
  if (provider === 'groq' && groqKey) return 'groq';
  if (provider === 'gemini' && geminiKey) return 'gemini';
  if (provider === 'openai' && openaiKey) return 'openai';
  return 'mock';
}

const CALLERS = { groq: (...a) => callGroq(...a), gemini: (...a) => callGemini(...a), openai: (...a) => callOpenAI(...a) };

async function complete(prompt, { json = false } = {}) {
  const call = CALLERS[activeProvider()];
  if (!call) return null;
  try {
    return await call(prompt, json);
  } catch (err) {
    // Lỗi mạng tạm thời: thử lại 1 lần sau 1 giây
    console.warn('[AI] thử lại:', err.message);
    await new Promise((r) => setTimeout(r, 1000));
    return call(prompt, json);
  }
}

function extractJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  return JSON.parse(match ? match[0] : text);
}

const VI = '\nLuôn viết mọi nội dung bằng tiếng Việt.';

// Bỏ ký hiệu Markdown để hiển thị dạng văn bản thuần
export const stripMarkdown = (t) =>
  t.replace(/\*\*(.+?)\*\*/g, '$1').replace(/^#{1,6}\s+/gm, '').replace(/`([^`]+)`/g, '$1');

async function withFallback(prompt, mockFn, { json = true } = {}) {
  try {
    const text = await complete(prompt + VI, { json });
    if (text == null) return { ...mockFn(), provider: 'mock' };
    return { ...(json ? extractJson(text) : { text }), provider: activeProvider() };
  } catch (err) {
    console.warn('[AI] lỗi, dùng mock:', err.message);
    return { ...mockFn(), provider: 'mock' };
  }
}

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/* ---------- 1. Gợi ý lộ trình học ---------- */
export function mockLearningPath({ goal = '', courses, progress }) {
  const done = new Map(progress.map((p) => [p.course_id, p.percent]));
  const order = { beginner: 0, intermediate: 1, advanced: 2 };
  const goalWords = new Set(normalize(goal));
  const scored = courses
    .map((c) => {
      const words = normalize(`${c.title} ${c.category || ''} ${c.description || ''}`);
      const match = words.filter((w) => goalWords.has(w)).length;
      return { ...c, match, percent: done.get(c.id) || 0 };
    })
    .filter((c) => c.percent < 100)
    .sort((a, b) => b.match - a.match || order[a.level] - order[b.level]);
  const steps = scored.slice(0, 5).map((c, i) => ({
    order: i + 1,
    courseId: c.id,
    title: c.title,
    weeks: c.level === 'advanced' ? 3 : 2,
    reason:
      c.percent > 0
        ? `Bạn đã hoàn thành ${c.percent}% — hãy tiếp tục để củng cố kiến thức.`
        : c.match > 0
          ? `Khóa học liên quan trực tiếp tới mục tiêu "${goal}".`
          : `Kiến thức nền tảng cấp độ ${c.level} giúp bạn tiến xa hơn.`,
  }));
  return {
    summary: `Lộ trình ${steps.length} bước hướng tới mục tiêu: ${goal || 'nâng cao kỹ năng'}.`,
    steps,
    tips: [
      'Học đều đặn 45–60 phút mỗi ngày thay vì dồn vào cuối tuần.',
      'Làm bài kiểm tra sau mỗi chương để tự đánh giá.',
      'Hỏi Trợ lý AI khi gặp khái niệm khó hiểu.',
    ],
  };
}

export async function recommendLearningPath(input) {
  const prompt = `Bạn là cố vấn học tập. Dựa trên mục tiêu, danh sách khóa học và tiến độ của sinh viên, hãy đề xuất lộ trình học tối đa 5 bước, chỉ dùng các khóa học trong danh sách.
Mục tiêu: ${input.goal}
Khóa học (JSON): ${JSON.stringify(input.courses.map(({ id, title, category, level }) => ({ id, title, category, level })))}
Tiến độ (% hoàn thành theo course_id): ${JSON.stringify(input.progress)}
Điểm kiểm tra trung bình: ${input.avgQuizScore ?? 'chưa có'}
Chỉ trả về JSON dạng: {"summary": string, "steps": [{"order": number, "courseId": number, "title": string, "weeks": number, "reason": string}], "tips": [string]}`;
  return withFallback(prompt, () => mockLearningPath(input));
}

/* ---------- 2. Chấm điểm tự động ---------- */
export function mockGrade({ assignment, content }) {
  const words = normalize(content);
  const rubricWords = [...new Set(normalize(`${assignment.rubric || ''} ${assignment.title}`))].filter(
    (w) => w.length > 3,
  );
  const set = new Set(words);
  const covered = rubricWords.filter((w) => set.has(w));
  const coverage = rubricWords.length ? covered.length / rubricWords.length : 0.5;
  const lengthScore = clamp(words.length / 150, 0, 1);
  const ratio = 0.55 * coverage + 0.45 * lengthScore;
  const score = Math.round(ratio * assignment.max_score * 10) / 10;
  const missing = rubricWords.filter((w) => !set.has(w)).slice(0, 5);
  return {
    score,
    feedback: `Bài làm có ${words.length} từ, bao quát ${covered.length}/${rubricWords.length} ý chính trong tiêu chí chấm.`,
    strengths: [
      words.length >= 150 ? 'Bài viết có độ dài đầy đủ.' : 'Bài viết ngắn gọn.',
      covered.length ? `Đề cập tới: ${covered.slice(0, 5).join(', ')}.` : 'Có nỗ lực hoàn thành bài.',
    ],
    improvements: missing.length
      ? [`Nên bổ sung các nội dung: ${missing.join(', ')}.`]
      : ['Có thể thêm ví dụ minh họa để bài thuyết phục hơn.'],
  };
}

export async function gradeSubmission({ assignment, content }) {
  const prompt = `Bạn là giảng viên. Chấm bài theo thang 0-${assignment.max_score}.
Đề bài: ${assignment.title}
Mô tả: ${assignment.description || ''}
Tiêu chí chấm: ${assignment.rubric || 'Đúng, đủ, rõ ràng'}
Bài làm của sinh viên:
"""${content.slice(0, 8000)}"""
Chỉ trả về JSON: {"score": number, "feedback": string, "strengths": [string], "improvements": [string]}`;
  const result = await withFallback(prompt, () => mockGrade({ assignment, content }));
  result.score = clamp(Number(result.score) || 0, 0, assignment.max_score);
  return result;
}

/* ---------- 3. Trợ lý AI (chat) ---------- */
export function mockChat(message) {
  const m = message.toLowerCase();
  if (m.includes('react')) return 'React là thư viện JavaScript để xây dựng giao diện theo component. Hãy bắt đầu với JSX, props, state và hook useState/useEffect.';
  if (m.includes('sql')) return 'MySQL là hệ quản trị CSDL quan hệ. Bạn nên nắm SELECT, JOIN, GROUP BY và cách thiết kế khóa chính/khóa ngoại.';
  if (m.includes('node') || m.includes('express')) return 'Node.js chạy JavaScript phía server; Express giúp định nghĩa route và middleware. Thử viết một API GET /hello trước nhé.';
  return `(Chế độ mock) Hãy chia vấn đề "${message.slice(0, 80)}" thành các phần nhỏ, xem lại bài giảng liên quan và thử tự giải trước khi xem đáp án. Cấu hình AI_PROVIDER=gemini hoặc openai để nhận câu trả lời chi tiết.`;
}

export async function chatTutor(history, message) {
  const transcript = history.map((h) => `${h.role === 'user' ? 'Sinh viên' : 'Trợ lý'}: ${h.content}`).join('\n');
  const prompt = `Bạn là trợ lý học tập thân thiện của hệ thống EduTrack AI, trả lời bằng tiếng Việt, ngắn gọn, có ví dụ khi cần, khuyến khích sinh viên tự tư duy. Trả lời bằng văn bản thuần, không dùng định dạng Markdown (không dùng **, #).
${transcript}
Sinh viên: ${message}
Trợ lý:`;
  const result = await withFallback(prompt, () => ({ text: mockChat(message) }), { json: false });
  return { reply: stripMarkdown(result.text).trim(), provider: result.provider };
}

/* ---------- 4. Sinh câu hỏi trắc nghiệm (chức năng mở rộng) ---------- */
export function mockQuiz({ title, content, count }) {
  const sentences = (content || title)
    .split(/[.!?\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.split(' ').length >= 5);
  const pool = sentences.length ? sentences : [`${title} là nội dung trọng tâm của bài học`];
  return {
    questions: Array.from({ length: count }, (_, i) => ({
      question: `Phát biểu sau đúng hay sai: "${pool[i % pool.length]}"?`,
      options: ['Đúng', 'Sai', 'Không đề cập trong bài', 'Chỉ đúng một phần'],
      correct_index: 0,
      explanation: 'Phát biểu được trích trực tiếp từ nội dung bài học.',
    })),
  };
}

export async function generateQuiz({ title, content, count = 5 }) {
  const prompt = `Tạo ${count} câu hỏi trắc nghiệm tiếng Việt (4 lựa chọn, 1 đáp án đúng) từ bài học sau.
Tiêu đề: ${title}
Nội dung: """${(content || '').slice(0, 6000)}"""
Chỉ trả về JSON: {"questions": [{"question": string, "options": [string,string,string,string], "correct_index": number, "explanation": string}]}`;
  return withFallback(prompt, () => mockQuiz({ title, content, count }));
}
