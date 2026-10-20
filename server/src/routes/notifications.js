import { Router } from 'express';
import { query, queryOne } from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const items = await query('SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 50', [req.user.id]);
    const { unread } = await queryOne('SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND is_read = 0', [
      req.user.id,
    ]);
    res.json({ unread, items });
  }),
);

router.put(
  '/read-all',
  asyncHandler(async (req, res) => {
    await query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
    res.json({ ok: true });
  }),
);

router.put(
  '/:id/read',
  asyncHandler(async (req, res) => {
    await query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ ok: true });
  }),
);

export default router;
