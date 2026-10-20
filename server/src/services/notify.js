import { query } from '../config/db.js';

export async function notify(userIds, { title, message = '', link = null }) {
  const ids = [].concat(userIds).filter(Boolean);
  if (!ids.length) return;
  await query('INSERT INTO notifications (user_id, title, message, link) VALUES ?', [
    ids.map((id) => [id, title, message, link]),
  ]);
}
