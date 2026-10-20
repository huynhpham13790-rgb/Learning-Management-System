import { Router } from 'express';
import { query, queryOne } from '../config/db.js';
import { env } from '../config/env.js';
import { authenticate, isStaff } from '../middleware/auth.js';
import { asyncHandler, HttpError, requireFields, parseJson } from '../utils/http.js';
import { gradeSubmission } from '../services/ai.js';
import { findMostSimilar } from '../services/plagiarism.js';
import { notify } from '../services/notify.js';

const router = Router();
router.use(authenticate);

async function getAssignment(id) {
  const a = await queryOne(
    `SELECT a.*, c.title AS course_title FROM assignments a JOIN courses c ON c.id = a.course_id WHERE a.id = ?`,
    [id],
  );
  if (!a) throw new HttpError(404, 'Không tìm thấy bài tập');
  return a;
}

async function checkPlagiarism(submission) {
  const others = await query('SELECT id, content FROM submissions WHERE assignment_id = ? AND id <> ?', [
    submission.assignment_id,
    submission.id,
  ]);
  const best = findMostSimilar(submission.content, others);
  await query('UPDATE submissions SET plagiarism_score = ?, plagiarism_source_id = ? WHERE id = ?', [
    best.score,
    best.sourceId,
    submission.id,
  ]);
  return best;
}

async function runAiGrading(submission, assignment) {
  const result = await gradeSubmission({ assignment, content: submission.content });
  const feedback = JSON.stringify({
    feedback: result.feedback,
    strengths: result.strengths || [],
    improvements: result.improvements || [],
    provider: result.provider,
  });
  await query(
    `UPDATE submissions SET ai_score = ?, ai_feedback = ?,
      score = IF(status = 'graded', score, ?), status = IF(status = 'graded', status, 'ai_graded')
     WHERE id = ?`,
    [result.score, feedback, result.score, submission.id],
  );
  return result;
}

const formatSubmission = (s) => s && { ...s, ai_feedback: parseJson(s.ai_feedback, null) };

// Bài tập của sinh viên (theo các khóa đã ghi danh)
router.get(
  '/my',
  asyncHandler(async (req, res) => {
    const rows = await query(
      `SELECT a.id, a.title, a.max_score, a.due_date, c.id AS course_id, c.title AS course_title,
        s.id AS submission_id, s.status, s.score, s.submitted_at
       FROM assignments a
       JOIN courses c ON c.id = a.course_id
       JOIN enrollments e ON e.course_id = a.course_id AND e.user_id = ?
       LEFT JOIN submissions s ON s.assignment_id = a.id AND s.user_id = ?
       ORDER BY a.due_date IS NULL, a.due_date`,
      [req.user.id, req.user.id],
    );
    res.json(rows);
  }),
);

// Danh sách tất cả bài tập (quản trị)
router.get(
  '/',
  isStaff,
  asyncHandler(async (req, res) => {
    const params = [];
    let where = '';
    if (req.query.course_id) {
      where = 'WHERE a.course_id = ?';
      params.push(req.query.course_id);
    }
    res.json(
      await query(
        `SELECT a.*, c.title AS course_title,
          (SELECT COUNT(*) FROM submissions s WHERE s.assignment_id = a.id) AS submission_count,
          (SELECT COUNT(*) FROM submissions s WHERE s.assignment_id = a.id AND s.status <> 'graded') AS pending_count
         FROM assignments a JOIN courses c ON c.id = a.course_id ${where} ORDER BY a.created_at DESC`,
        params,
      ),
    );
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const a = await getAssignment(req.params.id);
    const submission = await queryOne('SELECT * FROM submissions WHERE assignment_id = ? AND user_id = ?', [
      a.id,
      req.user.id,
    ]);
    res.json({ ...a, submission: formatSubmission(submission) });
  }),
);

// Nộp bài: kiểm tra đạo văn + AI chấm điểm sơ bộ
router.post(
  '/:id/submit',
  asyncHandler(async (req, res) => {
    requireFields(req.body, ['content']);
    const a = await getAssignment(req.params.id);
    const enrolled = await queryOne('SELECT 1 FROM enrollments WHERE user_id = ? AND course_id = ?', [
      req.user.id,
      a.course_id,
    ]);
    if (!enrolled) throw new HttpError(403, 'Bạn chưa ghi danh khóa học này');
    if (a.due_date && new Date(a.due_date) < new Date()) throw new HttpError(400, 'Đã quá hạn nộp bài');
    const existing = await queryOne('SELECT id, status FROM submissions WHERE assignment_id = ? AND user_id = ?', [
      a.id,
      req.user.id,
    ]);
    if (existing?.status === 'graded') throw new HttpError(400, 'Bài đã được giảng viên chấm, không thể nộp lại');

    await query(
      `INSERT INTO submissions (assignment_id, user_id, content) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE content = VALUES(content), submitted_at = NOW(), status = 'submitted',
         score = NULL, ai_score = NULL, ai_feedback = NULL`,
      [a.id, req.user.id, req.body.content],
    );
    const sub = await queryOne('SELECT * FROM submissions WHERE assignment_id = ? AND user_id = ?', [a.id, req.user.id]);
    const plagiarism = await checkPlagiarism(sub);
    await runAiGrading(sub, a);

    if (plagiarism.score >= env.plagiarismThreshold) {
      const staff = await query("SELECT id FROM users WHERE role IN ('admin','teacher')");
      await notify(
        staff.map((s) => s.id),
        {
          title: 'Cảnh báo đạo văn',
          message: `Bài nộp #${sub.id} (${a.title}) trùng ${plagiarism.score}% với bài #${plagiarism.sourceId}.`,
          link: `/admin/assignments/${a.id}`,
        },
      );
    }
    await notify(req.user.id, {
      title: 'Đã nộp bài',
      message: `Bài "${a.title}" đã được AI chấm sơ bộ. Giảng viên sẽ xác nhận điểm sau.`,
      link: `/assignments/${a.id}`,
    });
    const saved = await queryOne('SELECT * FROM submissions WHERE id = ?', [sub.id]);
    res.status(201).json(formatSubmission(saved));
  }),
);

/* ----- Quản trị ----- */
router.post(
  '/',
  isStaff,
  asyncHandler(async (req, res) => {
    requireFields(req.body, ['course_id', 'title']);
    const { course_id, title, description = '', rubric = '', max_score = 10, due_date = null } = req.body;
    const r = await query(
      'INSERT INTO assignments (course_id, title, description, rubric, max_score, due_date) VALUES (?, ?, ?, ?, ?, ?)',
      [course_id, title, description, rubric, max_score, due_date || null],
    );
    const students = await query('SELECT user_id FROM enrollments WHERE course_id = ?', [course_id]);
    await notify(
      students.map((s) => s.user_id),
      { title: 'Bài tập mới', message: title, link: `/assignments/${r.insertId}` },
    );
    res.status(201).json(await getAssignment(r.insertId));
  }),
);

router.put(
  '/:id',
  isStaff,
  asyncHandler(async (req, res) => {
    requireFields(req.body, ['title']);
    const { title, description = '', rubric = '', max_score = 10, due_date = null } = req.body;
    await query('UPDATE assignments SET title = ?, description = ?, rubric = ?, max_score = ?, due_date = ? WHERE id = ?', [
      title,
      description,
      rubric,
      max_score,
      due_date || null,
      req.params.id,
    ]);
    res.json(await getAssignment(req.params.id));
  }),
);

router.delete(
  '/:id',
  isStaff,
  asyncHandler(async (req, res) => {
    await query('DELETE FROM assignments WHERE id = ?', [req.params.id]);
    res.status(204).end();
  }),
);

router.get(
  '/:id/submissions',
  isStaff,
  asyncHandler(async (req, res) => {
    const rows = await query(
      `SELECT s.*, u.name AS student_name, u.email AS student_email
       FROM submissions s JOIN users u ON u.id = s.user_id WHERE s.assignment_id = ? ORDER BY s.submitted_at DESC`,
      [req.params.id],
    );
    res.json(rows.map(formatSubmission));
  }),
);

// Quét lại đạo văn cho toàn bộ bài nộp của một bài tập
router.post(
  '/:id/plagiarism-scan',
  isStaff,
  asyncHandler(async (req, res) => {
    const subs = await query('SELECT id, assignment_id, content FROM submissions WHERE assignment_id = ?', [req.params.id]);
    const results = [];
    for (const s of subs) results.push({ id: s.id, ...(await checkPlagiarism(s)) });
    res.json(results);
  }),
);

router.post(
  '/submissions/:sid/ai-grade',
  isStaff,
  asyncHandler(async (req, res) => {
    const sub = await queryOne('SELECT * FROM submissions WHERE id = ?', [req.params.sid]);
    if (!sub) throw new HttpError(404, 'Không tìm thấy bài nộp');
    await runAiGrading(sub, await getAssignment(sub.assignment_id));
    res.json(formatSubmission(await queryOne('SELECT * FROM submissions WHERE id = ?', [sub.id])));
  }),
);

// Giảng viên xác nhận / chỉnh điểm cuối cùng
router.put(
  '/submissions/:sid/grade',
  isStaff,
  asyncHandler(async (req, res) => {
    requireFields(req.body, ['score']);
    const sub = await queryOne('SELECT * FROM submissions WHERE id = ?', [req.params.sid]);
    if (!sub) throw new HttpError(404, 'Không tìm thấy bài nộp');
    const a = await getAssignment(sub.assignment_id);
    const score = Number(req.body.score);
    if (Number.isNaN(score) || score < 0 || score > a.max_score) {
      throw new HttpError(400, `Điểm phải trong khoảng 0 - ${a.max_score}`);
    }
    await query(
      "UPDATE submissions SET score = ?, teacher_feedback = ?, status = 'graded', graded_at = NOW() WHERE id = ?",
      [score, req.body.teacher_feedback || null, sub.id],
    );
    await notify(sub.user_id, {
      title: 'Bài tập đã được chấm',
      message: `"${a.title}": ${score}/${a.max_score}`,
      link: `/assignments/${a.id}`,
    });
    res.json(formatSubmission(await queryOne('SELECT * FROM submissions WHERE id = ?', [sub.id])));
  }),
);

export default router;
