import { Router } from 'express';
import { query, queryOne } from '../config/db.js';
import { authenticate, isStaff } from '../middleware/auth.js';
import { asyncHandler } from '../utils/http.js';
import { env } from '../config/env.js';

const router = Router();
router.use(authenticate);

// Tổng quan học tập của sinh viên
router.get(
  '/me',
  asyncHandler(async (req, res) => {
    const uid = req.user.id;
    const courses = await query(
      `SELECT c.id, c.title, COUNT(l.id) AS lesson_count, COUNT(lp.lesson_id) AS completed
       FROM enrollments e JOIN courses c ON c.id = e.course_id
       LEFT JOIN lessons l ON l.course_id = c.id
       LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = e.user_id
       WHERE e.user_id = ? GROUP BY c.id, c.title ORDER BY e.enrolled_at DESC`,
      [uid],
    );
    const quiz = await queryOne(
      'SELECT COUNT(*) AS attempts, ROUND(AVG(score), 1) AS avg_score FROM quiz_attempts WHERE user_id = ?',
      [uid],
    );
    const sub = await queryOne(
      'SELECT COUNT(*) AS submitted, ROUND(AVG(score), 1) AS avg_score FROM submissions WHERE user_id = ?',
      [uid],
    );
    const upcoming = await query(
      `SELECT a.id, a.title, a.due_date, c.title AS course_title FROM assignments a
       JOIN enrollments e ON e.course_id = a.course_id AND e.user_id = ?
       JOIN courses c ON c.id = a.course_id
       LEFT JOIN submissions s ON s.assignment_id = a.id AND s.user_id = ?
       WHERE s.id IS NULL AND (a.due_date IS NULL OR a.due_date >= NOW())
       ORDER BY a.due_date IS NULL, a.due_date LIMIT 5`,
      [uid, uid],
    );
    // Hoạt động 7 ngày gần nhất (số bài học hoàn thành mỗi ngày)
    const activity = await query(
      `SELECT DATE(completed_at) AS day, COUNT(*) AS lessons FROM lesson_progress
       WHERE user_id = ? AND completed_at >= CURDATE() - INTERVAL 6 DAY GROUP BY DATE(completed_at)`,
      [uid],
    );
    const streakRows = await query(
      'SELECT DISTINCT DATE(completed_at) AS day FROM lesson_progress WHERE user_id = ? ORDER BY day DESC LIMIT 60',
      [uid],
    );
    res.json({
      courses: courses.map((c) => ({
        ...c,
        progress: c.lesson_count ? Math.round((c.completed / c.lesson_count) * 100) : 0,
      })),
      quiz,
      submissions: sub,
      upcoming,
      activity,
      streak: computeStreak(streakRows.map((r) => r.day)),
    });
  }),
);

// Số ngày học liên tiếp tính tới hôm nay (hoặc hôm qua)
export function computeStreak(days, today = new Date()) {
  const set = new Set(days.map((d) => String(d).slice(0, 10)));
  const fmt = (d) => d.toISOString().slice(0, 10);
  const cur = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  if (!set.has(fmt(cur))) cur.setUTCDate(cur.getUTCDate() - 1);
  let streak = 0;
  while (set.has(fmt(cur))) {
    streak++;
    cur.setUTCDate(cur.getUTCDate() - 1);
  }
  return streak;
}

// Bảng xếp hạng: điểm = 10 * bài học hoàn thành + tổng điểm quiz cao nhất + tổng điểm bài tập
router.get(
  '/leaderboard',
  asyncHandler(async (_req, res) => {
    const rows = await query(
      `SELECT u.id, u.name,
        (SELECT COUNT(*) FROM lesson_progress lp WHERE lp.user_id = u.id) AS lessons,
        COALESCE((SELECT SUM(best) FROM (SELECT qa.user_id, MAX(qa.score) AS best FROM quiz_attempts qa GROUP BY qa.user_id, qa.quiz_id) t WHERE t.user_id = u.id), 0) AS quiz_points,
        COALESCE((SELECT SUM(s.score) FROM submissions s WHERE s.user_id = u.id), 0) AS assignment_points
       FROM users u WHERE u.role = 'student' AND u.is_active = 1`,
    );
    const ranked = rows
      .map((r) => ({
        ...r,
        points: Math.round(r.lessons * 10 + Number(r.quiz_points) + Number(r.assignment_points)),
      }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 20);
    res.json(ranked);
  }),
);

/* ----- Thống kê quản trị ----- */
router.get(
  '/admin',
  isStaff,
  asyncHandler(async (_req, res) => {
    const counts = await queryOne(
      `SELECT (SELECT COUNT(*) FROM users WHERE role = 'student') AS students,
        (SELECT COUNT(*) FROM users WHERE role = 'teacher') AS teachers,
        (SELECT COUNT(*) FROM courses) AS courses,
        (SELECT COUNT(*) FROM lessons) AS lessons,
        (SELECT COUNT(*) FROM enrollments) AS enrollments,
        (SELECT COUNT(*) FROM submissions) AS submissions,
        (SELECT COUNT(*) FROM submissions WHERE status <> 'graded') AS pending_grading,
        (SELECT COUNT(*) FROM submissions WHERE plagiarism_score >= ?) AS plagiarism_flags`,
      [env.plagiarismThreshold],
    );
    const topCourses = await query(
      `SELECT c.id, c.title, COUNT(e.id) AS students FROM courses c
       LEFT JOIN enrollments e ON e.course_id = c.id GROUP BY c.id, c.title ORDER BY students DESC LIMIT 5`,
    );
    const scoreDist = await query(
      `SELECT FLOOR(score / a.max_score * 10) AS bucket, COUNT(*) AS total FROM submissions s
       JOIN assignments a ON a.id = s.assignment_id WHERE s.score IS NOT NULL GROUP BY bucket ORDER BY bucket`,
    );
    const recent = await query(
      `SELECT s.id, s.submitted_at, s.status, s.plagiarism_score, u.name AS student_name, a.title AS assignment_title, a.id AS assignment_id
       FROM submissions s JOIN users u ON u.id = s.user_id JOIN assignments a ON a.id = s.assignment_id
       ORDER BY s.submitted_at DESC LIMIT 8`,
    );
    res.json({ counts, topCourses, scoreDist, recent });
  }),
);

// Xuất bảng điểm CSV theo khóa học
router.get(
  '/admin/export/:courseId',
  isStaff,
  asyncHandler(async (req, res) => {
    const rows = await query(
      `SELECT u.name, u.email,
        (SELECT COUNT(*) FROM lesson_progress lp JOIN lessons l ON l.id = lp.lesson_id WHERE lp.user_id = u.id AND l.course_id = e.course_id) AS lessons_done,
        (SELECT ROUND(AVG(s.score), 2) FROM submissions s JOIN assignments a ON a.id = s.assignment_id WHERE s.user_id = u.id AND a.course_id = e.course_id) AS assignment_avg,
        (SELECT ROUND(AVG(qa.score), 2) FROM quiz_attempts qa JOIN quizzes q ON q.id = qa.quiz_id WHERE qa.user_id = u.id AND q.course_id = e.course_id) AS quiz_avg
       FROM enrollments e JOIN users u ON u.id = e.user_id WHERE e.course_id = ? ORDER BY u.name`,
      [req.params.courseId],
    );
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [
      ['Họ tên', 'Email', 'Bài học hoàn thành', 'TB bài tập', 'TB trắc nghiệm'].map(esc).join(','),
      ...rows.map((r) => [r.name, r.email, r.lessons_done, r.assignment_avg, r.quiz_avg].map(esc).join(',')),
    ].join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="bang-diem-khoa-${req.params.courseId}.csv"`);
    res.send('﻿' + csv); // BOM để Excel đọc đúng tiếng Việt
  }),
);

export default router;
