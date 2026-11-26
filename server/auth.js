import jwt from 'jsonwebtoken';
import { db } from './db.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'dawr-dev-secret-change-me';

export const signToken = (user) =>
  jwt.sign({ id: user.Id, role: user.Role }, JWT_SECRET, { expiresIn: '7d' });

export function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'غير مصرح، سجل الدخول أولاً' });
  try {
    const p = jwt.verify(token, JWT_SECRET);
    const u = db.prepare('SELECT u.Id, u.FullName, u.Email, r.Name AS Role FROM Users u JOIN Roles r ON r.Id=u.RoleId WHERE u.Id=?').get(p.id);
    if (!u) return res.status(401).json({ error: 'المستخدم غير موجود' });
    req.user = u;
    next();
  } catch {
    res.status(401).json({ error: 'الجلسة انتهت، سجل الدخول مرة أخرى' });
  }
}

export const adminOnly = (req, res, next) =>
  req.user?.Role === 'Admin' ? next() : res.status(403).json({ error: 'للمشرف فقط' });
