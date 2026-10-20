import { Router } from 'express';
import { query, queryOne } from '../config/db.js';
import { authenticate, isStaff } from '../middleware/auth.js';
import { asyncHandler, HttpError, requireFields } from '../utils/http.js';

const router = Router();
router.use(authenticate);

async function loadLessonForUser(id, user) {
  const lesson = await queryOne('SELECT * FROM lessons WHERE id = ?', [id]);
  if (!lesson) throw new HttpError(404, 'Không tìm thấy bài học');
  if (user.role === 'student') {
    const enrolled = await queryOne('SELECT 1 FROM enrollments WHERE user_id = ? AND course_id = ?', [
      user.id,
      lesson.course_id,
    ]);
    if (!enrolled) throw new HttpError(403, 'Bạn cần ghi danh khóa học để xem bài này');
  }
  return lesson;
}

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const lesson = await loadLessonForUser(req.params.id, req.user);
    const siblings = await query('SELECT id, title FROM lessons WHERE course_id = ? ORDER BY position, id', [
      lesson.course_id,
    ]);
    const idx = siblings.findIndex((s) => s.id === lesson.id);
    const completed = !!(await queryOne('SELECT 1 FROM lesson_progress WHERE user_id = ? AND lesson_id = ?', [
      req.user.id,
      lesson.id,
    ]));
    const course = await queryOne('SELECT id, title FROM courses WHERE id = ?', [lesson.course_id]);
    res.json({
      ...lesson,
      course,
      completed,
      prev: siblings[idx - 1] || null,
      next: siblings[idx + 1] || null,
    });
  }),
);

router.post(
  '/:id/complete',
  asyncHandler(async (req, res) => {
    const lesson = await loadLessonForUser(req.params.id, req.user);
    await query('INSERT IGNORE INTO lesson_progress (user_id, lesson_id) VALUES (?, ?)', [req.user.id, lesson.id]);
    res.json({ completed: true });
  }),
);

router.delete(
  '/:id/complete',
  asyncHandler(async (req, res) => {
    await query('DELETE FROM lesson_progress WHERE user_id = ? AND lesson_id = ?', [req.user.id, req.params.id]);
    res.json({ completed: false });
  }),
);

/* ----- Thảo luận theo bài học ----- */
router.get(
  '/:id/comments',
  asyncHandler(async (req, res) => {
    await loadLessonForUser(req.params.id, req.user);
    res.json(
      await query(
        `SELECT c.id, c.content, c.created_at, c.user_id, u.name AS user_name, u.role AS user_role
         FROM comments c JOIN users u ON u.id = c.user_id WHERE c.lesson_id = ? ORDER BY c.created_at`,
        [req.params.id],
      ),
    );
  }),
);

router.post(
  '/:id/comments',
  asyncHandler(async (req, res) => {
    requireFields(req.body, ['content']);
    const lesson = await loadLessonForUser(req.params.id, req.user);
    const r = await query('INSERT INTO comments (lesson_id, user_id, content) VALUES (?, ?, ?)', [
      lesson.id,
      req.user.id,
      req.body.content.trim(),
    ]);
    res.status(201).json(
      await queryOne(
        `SELECT c.id, c.content, c.created_at, c.user_id, u.name AS user_name, u.role AS user_role
         FROM comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?`,
        [r.insertId],
      ),
    );
  }),
);

router.delete(
  '/comments/:commentId',
  asyncHandler(async (req, res) => {
    const c = await queryOne('SELECT user_id FROM comments WHERE id = ?', [req.params.commentId]);
    if (!c) throw new HttpError(404, 'Không tìm thấy bình luận');
    if (c.user_id !== req.user.id && req.user.role === 'student') throw new HttpError(403, 'Không có quyền xóa');
    await query('DELETE FROM comments WHERE id = ?', [req.params.commentId]);
    res.status(204).end();
  }),
);

/* ----- Quản trị bài học ----- */
router.put(
  '/:id',
  isStaff,
  asyncHandler(async (req, res) => {
    requireFields(req.body, ['title']);
    const { title, content = '', video_url = null, position = 0, duration_min = 10 } = req.body;
    const r = await query(
      'UPDATE lessons SET title = ?, content = ?, video_url = ?, position = ?, duration_min = ? WHERE id = ?',
      [title, content, video_url, position, duration_min, req.params.id],
    );
    if (!r.affectedRows) throw new HttpError(404, 'Không tìm thấy bài học');
    res.json(await queryOne('SELECT * FROM lessons WHERE id = ?', [req.params.id]));
  }),
);

router.delete(
  '/:id',
  isStaff,
  asyncHandler(async (req, res) => {
    await query('DELETE FROM lessons WHERE id = ?', [req.params.id]);
    res.status(204).end();
  }),
);

export default router;
