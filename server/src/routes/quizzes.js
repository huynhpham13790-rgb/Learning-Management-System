import { Router } from 'express';
import { query, queryOne, pool } from '../config/db.js';
import { authenticate, isStaff } from '../middleware/auth.js';
import { asyncHandler, HttpError, requireFields, parseJson } from '../utils/http.js';
import { generateQuiz } from '../services/ai.js';

const router = Router();
router.use(authenticate);

async function loadQuestions(quizId) {
  const rows = await query('SELECT * FROM quiz_questions WHERE quiz_id = ? ORDER BY id', [quizId]);
  return rows.map((q) => ({ ...q, options: parseJson(q.options, []) }));
}

function validateQuestions(questions) {
  if (!Array.isArray(questions) || !questions.length) throw new HttpError(400, 'Cần ít nhất 1 câu hỏi');
  for (const q of questions) {
    if (!q.question || !Array.isArray(q.options) || q.options.length < 2) {
      throw new HttpError(400, 'Mỗi câu hỏi cần nội dung và ít nhất 2 lựa chọn');
    }
    if (!(q.correct_index >= 0 && q.correct_index < q.options.length)) throw new HttpError(400, 'Đáp án đúng không hợp lệ');
  }
}

async function insertQuestions(conn, quizId, questions) {
  await conn.query('INSERT INTO quiz_questions (quiz_id, question, options, correct_index, explanation) VALUES ?', [
    questions.map((q) => [quizId, q.question, JSON.stringify(q.options), q.correct_index, q.explanation || null]),
  ]);
}

router.get(
  '/',
  isStaff,
  asyncHandler(async (_req, res) => {
    res.json(
      await query(
        `SELECT q.*, c.title AS course_title,
          (SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id = q.id) AS question_count,
          (SELECT COUNT(*) FROM quiz_attempts qa WHERE qa.quiz_id = q.id) AS attempt_count,
          (SELECT ROUND(AVG(score), 1) FROM quiz_attempts qa WHERE qa.quiz_id = q.id) AS avg_score
         FROM quizzes q JOIN courses c ON c.id = q.course_id ORDER BY q.created_at DESC`,
      ),
    );
  }),
);

// Sinh viên lấy đề (ẩn đáp án)
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const quiz = await queryOne(
      'SELECT q.*, c.title AS course_title FROM quizzes q JOIN courses c ON c.id = q.course_id WHERE q.id = ?',
      [req.params.id],
    );
    if (!quiz) throw new HttpError(404, 'Không tìm thấy bài kiểm tra');
    const staff = req.user.role !== 'student';
    const questions = (await loadQuestions(quiz.id)).map(({ correct_index, explanation, ...q }) =>
      staff ? { ...q, correct_index, explanation } : q,
    );
    const attempts = await query(
      'SELECT id, score, created_at FROM quiz_attempts WHERE quiz_id = ? AND user_id = ? ORDER BY created_at DESC',
      [quiz.id, req.user.id],
    );
    res.json({ ...quiz, questions, attempts });
  }),
);

// Nộp bài trắc nghiệm - chấm tự động
router.post(
  '/:id/attempt',
  asyncHandler(async (req, res) => {
    const { answers } = req.body;
    if (!answers || typeof answers !== 'object') throw new HttpError(400, 'Thiếu câu trả lời');
    const questions = await loadQuestions(req.params.id);
    if (!questions.length) throw new HttpError(404, 'Không tìm thấy bài kiểm tra');
    const detail = questions.map((q) => {
      const chosen = answers[q.id] ?? null;
      return {
        question_id: q.id,
        question: q.question,
        options: q.options,
        chosen,
        correct_index: q.correct_index,
        correct: Number(chosen) === q.correct_index,
        explanation: q.explanation,
      };
    });
    const correct = detail.filter((d) => d.correct).length;
    const score = Math.round((correct / questions.length) * 100) / 10; // thang 10
    await query('INSERT INTO quiz_attempts (quiz_id, user_id, answers, score) VALUES (?, ?, ?, ?)', [
      req.params.id,
      req.user.id,
      JSON.stringify(answers),
      score,
    ]);
    res.status(201).json({ score, correct, total: questions.length, detail });
  }),
);

/* ----- Quản trị ----- */
router.post(
  '/',
  isStaff,
  asyncHandler(async (req, res) => {
    requireFields(req.body, ['course_id', 'title']);
    validateQuestions(req.body.questions);
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [r] = await conn.query('INSERT INTO quizzes (course_id, title) VALUES (?, ?)', [
        req.body.course_id,
        req.body.title,
      ]);
      await insertQuestions(conn, r.insertId, req.body.questions);
      await conn.commit();
      res.status(201).json({ id: r.insertId });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }),
);

router.put(
  '/:id',
  isStaff,
  asyncHandler(async (req, res) => {
    requireFields(req.body, ['title']);
    validateQuestions(req.body.questions);
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('UPDATE quizzes SET title = ? WHERE id = ?', [req.body.title, req.params.id]);
      await conn.query('DELETE FROM quiz_questions WHERE quiz_id = ?', [req.params.id]);
      await insertQuestions(conn, req.params.id, req.body.questions);
      await conn.commit();
      res.json({ id: Number(req.params.id) });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }),
);

router.delete(
  '/:id',
  isStaff,
  asyncHandler(async (req, res) => {
    await query('DELETE FROM quizzes WHERE id = ?', [req.params.id]);
    res.status(204).end();
  }),
);

// AI sinh câu hỏi từ nội dung bài học (chưa lưu, để giảng viên duyệt)
router.post(
  '/generate',
  isStaff,
  asyncHandler(async (req, res) => {
    requireFields(req.body, ['lesson_id']);
    const lesson = await queryOne('SELECT title, content FROM lessons WHERE id = ?', [req.body.lesson_id]);
    if (!lesson) throw new HttpError(404, 'Không tìm thấy bài học');
    const count = Math.min(Math.max(Number(req.body.count) || 5, 1), 15);
    res.json(await generateQuiz({ ...lesson, count }));
  }),
);

export default router;
