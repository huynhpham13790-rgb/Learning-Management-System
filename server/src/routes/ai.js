import { Router } from 'express';
import { query, queryOne } from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler, requireFields, parseJson } from '../utils/http.js';
import { activeProvider, chatTutor, recommendLearningPath } from '../services/ai.js';

const router = Router();
router.use(authenticate);

router.get('/status', (_req, res) => res.json({ provider: activeProvider() }));

/* ----- Gợi ý lộ trình học ----- */
router.post(
  '/learning-path',
  asyncHandler(async (req, res) => {
    const user = await queryOne('SELECT goals FROM users WHERE id = ?', [req.user.id]);
    const goal = (req.body.goal || user.goals || '').trim();
    const courses = await query('SELECT id, title, category, level, description FROM courses WHERE published = 1');
    const progress = await query(
      `SELECT l.course_id, ROUND(COUNT(lp.lesson_id) / COUNT(l.id) * 100) AS percent
       FROM lessons l LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = ?
       GROUP BY l.course_id`,
      [req.user.id],
    );
    const quiz = await queryOne('SELECT ROUND(AVG(score), 1) AS avg FROM quiz_attempts WHERE user_id = ?', [req.user.id]);
    const plan = await recommendLearningPath({
      goal,
      courses,
      progress: progress.map((p) => ({ course_id: p.course_id, percent: Number(p.percent) })),
      avgQuizScore: quiz?.avg,
    });
    const r = await query('INSERT INTO learning_paths (user_id, goal, plan) VALUES (?, ?, ?)', [
      req.user.id,
      goal,
      JSON.stringify(plan),
    ]);
    res.status(201).json({ id: r.insertId, goal, plan });
  }),
);

router.get(
  '/learning-path/latest',
  asyncHandler(async (req, res) => {
    const row = await queryOne('SELECT * FROM learning_paths WHERE user_id = ? ORDER BY id DESC LIMIT 1', [req.user.id]);
    res.json(row ? { ...row, plan: parseJson(row.plan, null) } : null);
  }),
);

/* ----- Trợ lý học tập AI ----- */
router.get(
  '/chat',
  asyncHandler(async (req, res) => {
    res.json(
      await query('SELECT id, role, content, created_at FROM ai_chat_messages WHERE user_id = ? ORDER BY id', [
        req.user.id,
      ]),
    );
  }),
);

router.post(
  '/chat',
  asyncHandler(async (req, res) => {
    requireFields(req.body, ['message']);
    const message = req.body.message.trim().slice(0, 2000);
    const history = (
      await query('SELECT role, content FROM ai_chat_messages WHERE user_id = ? ORDER BY id DESC LIMIT 10', [req.user.id])
    ).reverse();
    const { reply, provider } = await chatTutor(history, message);
    await query('INSERT INTO ai_chat_messages (user_id, role, content) VALUES (?, ?, ?), (?, ?, ?)', [
      req.user.id,
      'user',
      message,
      req.user.id,
      'assistant',
      reply,
    ]);
    res.json({ reply, provider });
  }),
);

router.delete(
  '/chat',
  asyncHandler(async (req, res) => {
    await query('DELETE FROM ai_chat_messages WHERE user_id = ?', [req.user.id]);
    res.status(204).end();
  }),
);

export default router;
