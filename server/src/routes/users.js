import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query, queryOne } from '../config/db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { asyncHandler, HttpError, requireFields } from '../utils/http.js';

const router = Router();
router.use(authenticate, authorize('admin'));

const FIELDS = 'id, name, email, role, is_active, created_at';
const ROLES = ['admin', 'teacher', 'student'];

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { q = '', role = '' } = req.query;
    const where = [];
    const params = [];
    if (q) {
      where.push('(name LIKE ? OR email LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }
    if (role) {
      where.push('role = ?');
      params.push(role);
    }
    res.json(
      await query(`SELECT ${FIELDS} FROM users ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY id DESC`, params),
    );
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    requireFields(req.body, ['name', 'email', 'password']);
    const role = ROLES.includes(req.body.role) ? req.body.role : 'student';
    const r = await query('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', [
      req.body.name,
      req.body.email.toLowerCase(),
      await bcrypt.hash(req.body.password, 10),
      role,
    ]);
    res.status(201).json(await queryOne(`SELECT ${FIELDS} FROM users WHERE id = ?`, [r.insertId]));
  }),
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    requireFields(req.body, ['name', 'email', 'role']);
    if (!ROLES.includes(req.body.role)) throw new HttpError(400, 'Vai trò không hợp lệ');
    if (Number(req.params.id) === req.user.id && (req.body.role !== 'admin' || !req.body.is_active)) {
      throw new HttpError(400, 'Không thể tự hạ quyền hoặc khóa chính mình');
    }
    await query('UPDATE users SET name = ?, email = ?, role = ?, is_active = ? WHERE id = ?', [
      req.body.name,
      req.body.email.toLowerCase(),
      req.body.role,
      req.body.is_active ? 1 : 0,
      req.params.id,
    ]);
    if (req.body.password) {
      await query('UPDATE users SET password_hash = ? WHERE id = ?', [await bcrypt.hash(req.body.password, 10), req.params.id]);
    }
    res.json(await queryOne(`SELECT ${FIELDS} FROM users WHERE id = ?`, [req.params.id]));
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    if (Number(req.params.id) === req.user.id) throw new HttpError(400, 'Không thể xóa chính mình');
    await query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.status(204).end();
  }),
);

export default router;
