import { Router } from 'express';
import { query, queryOne } from '../config/db.js';
import { authenticate, isStaff } from '../middleware/auth.js';
import { asyncHandler, HttpError, requireFields } from '../utils/http.js';
import { notify } from '../services/notify.js';

const router = Router();
router.use(authenticate);

const isStaffUser = (user) => user.role === 'admin' || user.role === 'teacher';

// Danh sách khóa học (+ tìm kiếm, lọc) kèm trạng thái ghi danh và % tiến độ của người dùng
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { q = '', category = '', level = '' } = req.query;
    const where = [];
    const params = [req.user.id, req.user.id];
    if (!isStaffUser(req.user)) where.push('c.published = 1');
    if (q) {
      where.push('(c.title LIKE ? OR c.description LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }
    if (category) {
      where.push('c.category = ?');
      params.push(category);
    }
    if (level) {
      where.push('c.level = ?');
      params.push(level);
    }
    const rows = await query(
      `SELECT c.*, u.name AS teacher_name,
        (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) AS lesson_count,
        (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS student_count,
        EXISTS(SELECT 1 FROM enrollments e WHERE e.course_id = c.id AND e.user_id = ?) AS enrolled,
        (SELECT COUNT(*) FROM lesson_progress lp JOIN lessons l ON l.id = lp.lesson_id
          WHERE l.course_id = c.id AND lp.user_id = ?) AS completed_count
       FROM courses c LEFT JOIN users u ON u.id = c.teacher_id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY c.created_at DESC`,
      params,
    );
    res.json(
      rows.map((r) => ({
        ...r,
        enrolled: !!r.enrolled,
        progress: r.lesson_count ? Math.round((r.completed_count / r.lesson_count) * 100) : 0,
      })),
    );
  }),
);

router.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    const rows = await query('SELECT DISTINCT category FROM courses WHERE category IS NOT NULL ORDER BY category');
    res.json(rows.map((r) => r.category));
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const course = await queryOne(
      `SELECT c.*, u.name AS teacher_name FROM courses c LEFT JOIN users u ON u.id = c.teacher_id WHERE c.id = ?`,
      [req.params.id],
    );
    if (!course || (!course.published && !isStaffUser(req.user))) throw new HttpError(404, 'Không tìm thấy khóa học');
    const lessons = await query(
      `SELECT l.id, l.title, l.position, l.duration_min, l.video_url,
        EXISTS(SELECT 1 FROM lesson_progress lp WHERE lp.lesson_id = l.id AND lp.user_id = ?) AS completed
       FROM lessons l WHERE l.course_id = ? ORDER BY l.position, l.id`,
      [req.user.id, course.id],
    );
    const assignments = await query(
      `SELECT a.id, a.title, a.max_score, a.due_date,
        s.status AS submission_status, s.score
       FROM assignments a LEFT JOIN submissions s ON s.assignment_id = a.id AND s.user_id = ?
       WHERE a.course_id = ? ORDER BY a.due_date IS NULL, a.due_date`,
      [req.user.id, course.id],
    );
    const quizzes = await query(
      `SELECT q.id, q.title, (SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id = q.id) AS question_count,
        (SELECT MAX(score) FROM quiz_attempts qa WHERE qa.quiz_id = q.id AND qa.user_id = ?) AS best_score
       FROM quizzes q WHERE q.course_id = ?`,
      [req.user.id, course.id],
    );
    const enrolled = !!(await queryOne('SELECT 1 FROM enrollments WHERE user_id = ? AND course_id = ?', [
      req.user.id,
      course.id,
    ]));
    const done = lessons.filter((l) => l.completed).length;
    res.json({
      ...course,
      enrolled,
      progress: lessons.length ? Math.round((done / lessons.length) * 100) : 0,
      lessons: lessons.map((l) => ({ ...l, completed: !!l.completed })),
      assignments,
      quizzes,
    });
  }),
);

router.post(
  '/:id/enroll',
  asyncHandler(async (req, res) => {
    const course = await queryOne('SELECT id, title FROM courses WHERE id = ? AND published = 1', [req.params.id]);
    if (!course) throw new HttpError(404, 'Không tìm thấy khóa học');
    await query('INSERT IGNORE INTO enrollments (user_id, course_id) VALUES (?, ?)', [req.user.id, course.id]);
    await notify(req.user.id, {
      title: 'Ghi danh thành công',
      message: `Bạn đã ghi danh khóa học "${course.title}".`,
      link: `/courses/${course.id}`,
    });
    res.status(201).json({ enrolled: true });
  }),
);

router.delete(
  '/:id/enroll',
  asyncHandler(async (req, res) => {
    await query('DELETE FROM enrollments WHERE user_id = ? AND course_id = ?', [req.user.id, req.params.id]);
    res.json({ enrolled: false });
  }),
);

/* ----- Quản trị khóa học (admin, giảng viên) ----- */
router.post(
  '/',
  isStaff,
  asyncHandler(async (req, res) => {
    requireFields(req.body, ['title']);
    const { title, description = '', category = null, level = 'beginner', published = 1 } = req.body;
    const r = await query(
      'INSERT INTO courses (title, description, category, level, teacher_id, published) VALUES (?, ?, ?, ?, ?, ?)',
      [title, description, category, level, req.user.id, published ? 1 : 0],
    );
    res.status(201).json(await queryOne('SELECT * FROM courses WHERE id = ?', [r.insertId]));
  }),
);

router.put(
  '/:id',
  isStaff,
  asyncHandler(async (req, res) => {
    requireFields(req.body, ['title']);
    const { title, description = '', category = null, level = 'beginner', published = 1 } = req.body;
    const r = await query(
      'UPDATE courses SET title = ?, description = ?, category = ?, level = ?, published = ? WHERE id = ?',
      [title, description, category, level, published ? 1 : 0, req.params.id],
    );
    if (!r.affectedRows) throw new HttpError(404, 'Không tìm thấy khóa học');
    res.json(await queryOne('SELECT * FROM courses WHERE id = ?', [req.params.id]));
  }),
);

router.delete(
  '/:id',
  isStaff,
  asyncHandler(async (req, res) => {
    await query('DELETE FROM courses WHERE id = ?', [req.params.id]);
    res.status(204).end();
  }),
);

router.post(
  '/:id/lessons',
  isStaff,
  asyncHandler(async (req, res) => {
    requireFields(req.body, ['title']);
    const { title, content = '', video_url = null, duration_min = 10 } = req.body;
    const course = await queryOne('SELECT id, title FROM courses WHERE id = ?', [req.params.id]);
    if (!course) throw new HttpError(404, 'Không tìm thấy khóa học');
    const { next } = await queryOne('SELECT COALESCE(MAX(position), 0) + 1 AS next FROM lessons WHERE course_id = ?', [
      course.id,
    ]);
    const r = await query(
      'INSERT INTO lessons (course_id, title, content, video_url, position, duration_min) VALUES (?, ?, ?, ?, ?, ?)',
      [course.id, title, content, video_url, req.body.position ?? next, duration_min],
    );
    const students = await query('SELECT user_id FROM enrollments WHERE course_id = ?', [course.id]);
    await notify(
      students.map((s) => s.user_id),
      { title: 'Bài học mới', message: `"${title}" vừa được thêm vào ${course.title}.`, link: `/lessons/${r.insertId}` },
    );
    res.status(201).json(await queryOne('SELECT * FROM lessons WHERE id = ?', [r.insertId]));
  }),
);

export default router;
