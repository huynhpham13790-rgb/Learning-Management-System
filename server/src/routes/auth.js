import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query, queryOne } from '../config/db.js';
import { authenticate, signToken } from '../middleware/auth.js';
import { asyncHandler, HttpError, requireFields } from '../utils/http.js';

const router = Router();
const PUBLIC_FIELDS = 'id, name, email, role, bio, goals, is_active, created_at';

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    requireFields(req.body, ['name', 'email', 'password']);
    const { name, email, password } = req.body;
    if (password.length < 6) throw new HttpError(400, 'Mật khẩu tối thiểu 6 ký tự');
    const hash = await bcrypt.hash(password, 10);
    const result = await query('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)', [
      name.trim(),
      email.trim().toLowerCase(),
      hash,
    ]);
    const user = await queryOne(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = ?`, [result.insertId]);
    res.status(201).json({ token: signToken(user), user });
  }),
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    requireFields(req.body, ['email', 'password']);
    const row = await queryOne('SELECT * FROM users WHERE email = ?', [req.body.email.trim().toLowerCase()]);
    if (!row || !(await bcrypt.compare(req.body.password, row.password_hash))) {
      throw new HttpError(401, 'Email hoặc mật khẩu không đúng');
    }
    if (!row.is_active) throw new HttpError(403, 'Tài khoản đã bị khóa');
    const { password_hash: _ignored, ...user } = row;
    res.json({ token: signToken(user), user });
  }),
);

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await queryOne(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = ?`, [req.user.id]);
    if (!user) throw new HttpError(404, 'Không tìm thấy người dùng');
    res.json(user);
  }),
);

router.put(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const { name, bio = null, goals = null } = req.body;
    requireFields(req.body, ['name']);
    await query('UPDATE users SET name = ?, bio = ?, goals = ? WHERE id = ?', [name, bio, goals, req.user.id]);
    res.json(await queryOne(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = ?`, [req.user.id]));
  }),
);

router.put(
  '/me/password',
  authenticate,
  asyncHandler(async (req, res) => {
    requireFields(req.body, ['currentPassword', 'newPassword']);
    if (req.body.newPassword.length < 6) throw new HttpError(400, 'Mật khẩu tối thiểu 6 ký tự');
    const row = await queryOne('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    if (!(await bcrypt.compare(req.body.currentPassword, row.password_hash))) {
      throw new HttpError(400, 'Mật khẩu hiện tại không đúng');
    }
    await query('UPDATE users SET password_hash = ? WHERE id = ?', [
      await bcrypt.hash(req.body.newPassword, 10),
      req.user.id,
    ]);
    res.json({ message: 'Đổi mật khẩu thành công' });
  }),
);

export default router;
