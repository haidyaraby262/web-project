import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { db, log, notify, ensureSlots, fmtDate } from './db.js';
import { auth, adminOnly, signToken } from './auth.js';

const app = express();
app.use(cors());
app.use(express.json());
const api = express.Router();
app.use('/api', api);

const wrap = (fn) => (req, res, next) => { try { fn(req, res, next); } catch (e) { next(e); } };
const bad = (res, msg, code = 400) => res.status(code).json({ error: msg });
const emailOk = (e) => /^\S+@\S+\.\S+$/.test(e || '');

// ---------- Auth ----------
const userRow = (id) => db.prepare(
  'SELECT u.Id, u.FullName, u.Email, u.Phone, u.BirthDate, u.Gender, u.Address, u.CreatedAt, r.Name AS Role FROM Users u JOIN Roles r ON r.Id=u.RoleId WHERE u.Id=?').get(id);

api.post('/auth/register', wrap((req, res) => {
  const { fullName, email, phone, password } = req.body || {};
  if (!fullName || fullName.trim().length < 3) return bad(res, 'الاسم لازم يكون 3 حروف على الأقل');
  if (!emailOk(email)) return bad(res, 'البريد الإلكتروني غير صحيح');
  if (!password || password.length < 6) return bad(res, 'كلمة المرور لازم تكون 6 أحرف على الأقل');
  if (db.prepare('SELECT 1 FROM Users WHERE Email=?').get(email.toLowerCase())) return bad(res, 'البريد مسجل من قبل', 409);
  const role = db.prepare("SELECT Id FROM Roles WHERE Name='Patient'").get();
  const r = db.prepare('INSERT INTO Users (FullName, Email, Phone, PasswordHash, RoleId) VALUES (?,?,?,?,?)')
    .run(fullName.trim(), email.toLowerCase(), phone || null, bcrypt.hashSync(password, 10), role.Id);
  const user = userRow(r.lastInsertRowid);
  log(user.Id, 'REGISTER', email);
  notify(user.Id, 'أهلاً بك في دَوْر', 'تم إنشاء حسابك بنجاح. يمكنك الآن حجز موعدك.');
  res.status(201).json({ token: signToken(user), user });
}));

api.post('/auth/login', wrap((req, res) => {
  const { email, password } = req.body || {};
  const u = db.prepare('SELECT * FROM Users WHERE Email=?').get((email || '').toLowerCase());
  if (!u || !bcrypt.compareSync(password || '', u.PasswordHash)) return bad(res, 'البريد أو كلمة المرور غير صحيحة', 401);
  const user = userRow(u.Id);
  log(u.Id, 'LOGIN', email);
  res.json({ token: signToken(user), user });
}));

// Generates a reset token. In production this token is emailed; in dev it is returned & printed.
api.post('/auth/forgot-password', wrap((req, res) => {
  const u = db.prepare('SELECT * FROM Users WHERE Email=?').get((req.body?.email || '').toLowerCase());
  const out = { message: 'لو البريد مسجل عندنا، هيوصلك رابط إعادة تعيين كلمة المرور.' };
  if (u) {
    const token = crypto.randomBytes(24).toString('hex');
    db.prepare('UPDATE Users SET ResetToken=?, ResetExpires=? WHERE Id=?').run(token, Date.now() + 3600_000, u.Id);
    log(u.Id, 'FORGOT_PASSWORD');
    console.log(`[reset-link] /reset-password?token=${token}`);
    if (process.env.NODE_ENV !== 'production') out.devToken = token;
  }
  res.json(out);
}));

api.post('/auth/reset-password', wrap((req, res) => {
  const { token, password } = req.body || {};
  if (!password || password.length < 6) return bad(res, 'كلمة المرور لازم تكون 6 أحرف على الأقل');
  const u = db.prepare('SELECT * FROM Users WHERE ResetToken=? AND ResetExpires>?').get(token || '-', Date.now());
  if (!u) return bad(res, 'الرابط غير صالح أو انتهت صلاحيته');
  db.prepare('UPDATE Users SET PasswordHash=?, ResetToken=NULL, ResetExpires=NULL WHERE Id=?').run(bcrypt.hashSync(password, 10), u.Id);
  log(u.Id, 'RESET_PASSWORD');
  res.json({ message: 'تم تغيير كلمة المرور' });
}));

// ---------- Patient profile ----------
api.get('/profile', auth, wrap((req, res) => res.json(userRow(req.user.Id))));
api.put('/profile', auth, wrap((req, res) => {
  const { fullName, phone, birthDate, gender, address } = req.body || {};
  if (!fullName || fullName.trim().length < 3) return bad(res, 'الاسم مطلوب');
  db.prepare('UPDATE Users SET FullName=?, Phone=?, BirthDate=?, Gender=?, Address=? WHERE Id=?')
    .run(fullName.trim(), phone || null, birthDate || null, gender || null, address || null, req.user.Id);
  log(req.user.Id, 'UPDATE_PROFILE');
  res.json(userRow(req.user.Id));
}));
api.put('/profile/password', auth, wrap((req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  const u = db.prepare('SELECT * FROM Users WHERE Id=?').get(req.user.Id);
  if (!bcrypt.compareSync(currentPassword || '', u.PasswordHash)) return bad(res, 'كلمة المرور الحالية غير صحيحة');
  if (!newPassword || newPassword.length < 6) return bad(res, 'كلمة المرور الجديدة قصيرة');
  db.prepare('UPDATE Users SET PasswordHash=? WHERE Id=?').run(bcrypt.hashSync(newPassword, 10), u.Id);
  log(u.Id, 'CHANGE_PASSWORD');
  res.json({ message: 'تم تغيير كلمة المرور' });
}));

// ---------- Clinics (public read, admin write) ----------
api.get('/clinics', wrap((req, res) => {
  res.json(db.prepare(`SELECT c.*, (SELECT COUNT(*) FROM Doctors d WHERE d.ClinicId=c.Id AND d.IsActive=1) AS DoctorCount
    FROM Clinics c WHERE c.IsActive=1 ORDER BY c.Id`).all());
}));
api.get('/clinics/:id', wrap((req, res) => {
  const c = db.prepare('SELECT * FROM Clinics WHERE Id=?').get(req.params.id);
  c ? res.json(c) : bad(res, 'العيادة غير موجودة', 404);
}));
api.post('/clinics', auth, adminOnly, wrap((req, res) => {
  const { name, description, icon, floor } = req.body || {};
  if (!name) return bad(res, 'اسم العيادة مطلوب');
  const r = db.prepare('INSERT INTO Clinics (Name, Description, Icon, Floor) VALUES (?,?,?,?)').run(name, description || '', icon || 'stethoscope', floor || '');
  log(req.user.Id, 'CREATE_CLINIC', name);
  res.status(201).json(db.prepare('SELECT * FROM Clinics WHERE Id=?').get(r.lastInsertRowid));
}));
api.put('/clinics/:id', auth, adminOnly, wrap((req, res) => {
  const { name, description, icon, floor, isActive } = req.body || {};
  if (!name) return bad(res, 'اسم العيادة مطلوب');
  db.prepare('UPDATE Clinics SET Name=?, Description=?, Icon=?, Floor=?, IsActive=? WHERE Id=?')
    .run(name, description || '', icon || 'stethoscope', floor || '', isActive === false ? 0 : 1, req.params.id);
  log(req.user.Id, 'UPDATE_CLINIC', req.params.id);
  res.json(db.prepare('SELECT * FROM Clinics WHERE Id=?').get(req.params.id));
}));
api.delete('/clinics/:id', auth, adminOnly, wrap((req, res) => {
  const used = db.prepare('SELECT COUNT(*) n FROM Appointments WHERE ClinicId=?').get(req.params.id).n;
  if (used) { db.prepare('UPDATE Clinics SET IsActive=0 WHERE Id=?').run(req.params.id); }
  else db.prepare('DELETE FROM Clinics WHERE Id=?').run(req.params.id);
  log(req.user.Id, 'DELETE_CLINIC', req.params.id);
  res.json({ ok: true, softDeleted: !!used });
}));

// ---------- Doctors ----------
const doctorSelect = `SELECT d.*, c.Name AS ClinicName,
  (SELECT MIN(SlotDate) FROM AvailableSlots s WHERE s.DoctorId=d.Id AND s.IsBooked=0 AND s.SlotDate>=date('now')) AS NextSlotDate
  FROM Doctors d JOIN Clinics c ON c.Id=d.ClinicId`;

api.get('/doctors', wrap((req, res) => {
  const { clinicId, q } = req.query;
  let sql = doctorSelect + ' WHERE d.IsActive=1';
  const args = [];
  if (clinicId) { sql += ' AND d.ClinicId=?'; args.push(clinicId); }
  if (q) { sql += ' AND (d.FullName LIKE ? OR c.Name LIKE ?)'; args.push(`%${q}%`, `%${q}%`); }
  res.json(db.prepare(sql + ' ORDER BY d.Id').all(...args));
}));
api.get('/doctors/:id', wrap((req, res) => {
  const d = db.prepare(doctorSelect + ' WHERE d.Id=?').get(req.params.id);
  if (!d) return bad(res, 'الطبيب غير موجود', 404);
  d.schedule = db.prepare('SELECT * FROM DoctorSchedules WHERE DoctorId=? ORDER BY DayOfWeek, StartTime').all(d.Id);
  res.json(d);
}));
api.post('/doctors', auth, adminOnly, wrap((req, res) => {
  const { clinicId, fullName, title, bio, experienceYears, fee } = req.body || {};
  if (!clinicId || !fullName) return bad(res, 'العيادة والاسم مطلوبين');
  const r = db.prepare('INSERT INTO Doctors (ClinicId, FullName, Title, Bio, ExperienceYears, Fee) VALUES (?,?,?,?,?,?)')
    .run(clinicId, fullName, title || '', bio || '', experienceYears || 0, fee || 0);
  log(req.user.Id, 'CREATE_DOCTOR', fullName);
  res.status(201).json(db.prepare('SELECT * FROM Doctors WHERE Id=?').get(r.lastInsertRowid));
}));
api.put('/doctors/:id', auth, adminOnly, wrap((req, res) => {
  const { clinicId, fullName, title, bio, experienceYears, fee, isActive } = req.body || {};
  if (!clinicId || !fullName) return bad(res, 'العيادة والاسم مطلوبين');
  db.prepare('UPDATE Doctors SET ClinicId=?, FullName=?, Title=?, Bio=?, ExperienceYears=?, Fee=?, IsActive=? WHERE Id=?')
    .run(clinicId, fullName, title || '', bio || '', experienceYears || 0, fee || 0, isActive === false ? 0 : 1, req.params.id);
  log(req.user.Id, 'UPDATE_DOCTOR', req.params.id);
  res.json(db.prepare('SELECT * FROM Doctors WHERE Id=?').get(req.params.id));
}));
api.delete('/doctors/:id', auth, adminOnly, wrap((req, res) => {
  const used = db.prepare('SELECT COUNT(*) n FROM Appointments WHERE DoctorId=?').get(req.params.id).n;
  if (used) db.prepare('UPDATE Doctors SET IsActive=0 WHERE Id=?').run(req.params.id);
  else db.prepare('DELETE FROM Doctors WHERE Id=?').run(req.params.id);
  log(req.user.Id, 'DELETE_DOCTOR', req.params.id);
  res.json({ ok: true, softDeleted: !!used });
}));

// ---------- Doctor schedule ----------
api.get('/doctors/:id/schedule', wrap((req, res) =>
  res.json(db.prepare('SELECT * FROM DoctorSchedules WHERE DoctorId=? ORDER BY DayOfWeek, StartTime').all(req.params.id))));
api.post('/doctors/:id/schedule', auth, adminOnly, wrap((req, res) => {
  const { dayOfWeek, startTime, endTime, slotMinutes } = req.body || {};
  if (dayOfWeek == null || !startTime || !endTime || startTime >= endTime) return bad(res, 'بيانات الجدول غير صحيحة');
  const r = db.prepare('INSERT INTO DoctorSchedules (DoctorId, DayOfWeek, StartTime, EndTime, SlotMinutes) VALUES (?,?,?,?,?)')
    .run(req.params.id, dayOfWeek, startTime, endTime, slotMinutes || 30);
  log(req.user.Id, 'ADD_SCHEDULE', `doctor ${req.params.id}`);
  res.status(201).json({ Id: r.lastInsertRowid });
}));
api.delete('/schedules/:id', auth, adminOnly, wrap((req, res) => {
  db.prepare('DELETE FROM DoctorSchedules WHERE Id=?').run(req.params.id);
  res.json({ ok: true });
}));

// ---------- Available slots ----------
api.get('/doctors/:id/slots', wrap((req, res) => {
  const date = req.query.date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return bad(res, 'التاريخ مطلوب (YYYY-MM-DD)');
  if (date < fmtDate(new Date())) return res.json([]);
  ensureSlots(req.params.id, date);
  let slots = db.prepare('SELECT Id, SlotDate, SlotTime, IsBooked FROM AvailableSlots WHERE DoctorId=? AND SlotDate=? ORDER BY SlotTime').all(req.params.id, date);
  const now = new Date();
  if (date === fmtDate(now)) {
    const cur = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    slots = slots.filter((s) => s.SlotTime > cur);
  }
  res.json(slots);
}));

// ---------- Appointments ----------
const apptSelect = `SELECT a.*, s.SlotDate, s.SlotTime, d.FullName AS DoctorName, d.Title AS DoctorTitle, c.Name AS ClinicName,
  u.FullName AS PatientName, u.Phone AS PatientPhone, u.Email AS PatientEmail
  FROM Appointments a JOIN AvailableSlots s ON s.Id=a.SlotId JOIN Doctors d ON d.Id=a.DoctorId
  JOIN Clinics c ON c.Id=a.ClinicId JOIN Users u ON u.Id=a.PatientId`;

api.post('/appointments', auth, wrap((req, res) => {
  const { clinicId, doctorId, slotId, notes } = req.body || {};
  const doc = db.prepare('SELECT * FROM Doctors WHERE Id=? AND IsActive=1').get(doctorId);
  if (!doc || String(doc.ClinicId) !== String(clinicId)) return bad(res, 'الطبيب لا يتبع هذه العيادة');
  const tx = db.transaction(() => {
    const slot = db.prepare('SELECT * FROM AvailableSlots WHERE Id=? AND DoctorId=?').get(slotId, doctorId);
    if (!slot) return { err: 'الموعد غير موجود' };
    if (slot.IsBooked) return { err: 'الموعد ده اتحجز، اختار موعد تاني', code: 409 };
    if (`${slot.SlotDate}T${slot.SlotTime}` <= new Date().toISOString().slice(0, 16)) {
      const now = new Date();
      if (new Date(`${slot.SlotDate}T${slot.SlotTime}:00`) <= now) return { err: 'الموعد فات' };
    }
    db.prepare('UPDATE AvailableSlots SET IsBooked=1 WHERE Id=?').run(slotId);
    const r = db.prepare('INSERT INTO Appointments (PatientId, DoctorId, ClinicId, SlotId, Notes) VALUES (?,?,?,?,?)')
      .run(req.user.Id, doctorId, clinicId, slotId, notes || '');
    return { id: r.lastInsertRowid, slot };
  });
  const out = tx();
  if (out.err) return bad(res, out.err, out.code || 400);
  log(req.user.Id, 'CREATE_APPOINTMENT', String(out.id));
  notify(req.user.Id, 'تم استلام طلب الحجز', `طلب حجزك مع ${doc.FullName} يوم ${out.slot.SlotDate} الساعة ${out.slot.SlotTime} في انتظار موافقة المركز.`);
  for (const a of db.prepare("SELECT u.Id FROM Users u JOIN Roles r ON r.Id=u.RoleId WHERE r.Name='Admin'").all())
    notify(a.Id, 'طلب حجز جديد', `${req.user.FullName} طلب موعد مع ${doc.FullName}.`);
  res.status(201).json(db.prepare(apptSelect + ' WHERE a.Id=?').get(out.id));
}));

api.get('/appointments/mine', auth, wrap((req, res) =>
  res.json(db.prepare(apptSelect + ' WHERE a.PatientId=? ORDER BY s.SlotDate DESC, s.SlotTime DESC').all(req.user.Id))));

api.put('/appointments/:id/cancel', auth, wrap((req, res) => {
  const a = db.prepare('SELECT * FROM Appointments WHERE Id=?').get(req.params.id);
  if (!a || (a.PatientId !== req.user.Id && req.user.Role !== 'Admin')) return bad(res, 'الحجز غير موجود', 404);
  if (!['Pending', 'Approved'].includes(a.Status)) return bad(res, 'لا يمكن إلغاء هذا الحجز');
  db.prepare("UPDATE Appointments SET Status='Cancelled' WHERE Id=?").run(a.Id);
  db.prepare('UPDATE AvailableSlots SET IsBooked=0 WHERE Id=?').run(a.SlotId);
  log(req.user.Id, 'CANCEL_APPOINTMENT', String(a.Id));
  res.json({ ok: true });
}));

// ---------- Admin ----------
const admin = express.Router();
admin.use(auth, adminOnly);
api.use('/admin', admin);

admin.get('/stats', wrap((req, res) => {
  const n = (sql, ...a) => db.prepare(sql).get(...a).n;
  const byStatus = Object.fromEntries(db.prepare('SELECT Status, COUNT(*) n FROM Appointments GROUP BY Status').all().map((r) => [r.Status, r.n]));
  res.json({
    patients: n("SELECT COUNT(*) n FROM Users u JOIN Roles r ON r.Id=u.RoleId WHERE r.Name='Patient'"),
    doctors: n('SELECT COUNT(*) n FROM Doctors WHERE IsActive=1'),
    clinics: n('SELECT COUNT(*) n FROM Clinics WHERE IsActive=1'),
    appointments: n('SELECT COUNT(*) n FROM Appointments'),
    pending: byStatus.Pending || 0, approved: byStatus.Approved || 0,
    rejected: byStatus.Rejected || 0, cancelled: byStatus.Cancelled || 0,
    today: n("SELECT COUNT(*) n FROM Appointments a JOIN AvailableSlots s ON s.Id=a.SlotId WHERE s.SlotDate=date('now','localtime') AND a.Status='Approved'"),
  });
}));

admin.get('/patients', wrap((req, res) => {
  const q = `%${req.query.q || ''}%`;
  res.json(db.prepare(`SELECT u.Id, u.FullName, u.Email, u.Phone, u.CreatedAt,
    (SELECT COUNT(*) FROM Appointments a WHERE a.PatientId=u.Id) AS AppointmentCount
    FROM Users u JOIN Roles r ON r.Id=u.RoleId WHERE r.Name='Patient' AND (u.FullName LIKE ? OR u.Email LIKE ? OR u.Phone LIKE ?)
    ORDER BY u.Id DESC`).all(q, q, q));
}));
admin.put('/patients/:id', wrap((req, res) => {
  const { fullName, phone } = req.body || {};
  if (!fullName) return bad(res, 'الاسم مطلوب');
  db.prepare("UPDATE Users SET FullName=?, Phone=? WHERE Id=? AND RoleId=(SELECT Id FROM Roles WHERE Name='Patient')").run(fullName, phone || null, req.params.id);
  log(req.user.Id, 'UPDATE_PATIENT', req.params.id);
  res.json({ ok: true });
}));
admin.delete('/patients/:id', wrap((req, res) => {
  db.prepare("UPDATE AvailableSlots SET IsBooked=0 WHERE Id IN (SELECT SlotId FROM Appointments WHERE PatientId=? AND Status IN ('Pending','Approved'))").run(req.params.id);
  db.prepare("DELETE FROM Users WHERE Id=? AND RoleId=(SELECT Id FROM Roles WHERE Name='Patient')").run(req.params.id);
  log(req.user.Id, 'DELETE_PATIENT', req.params.id);
  res.json({ ok: true });
}));

admin.get('/appointments', wrap((req, res) => {
  const { status } = req.query;
  const rows = status
    ? db.prepare(apptSelect + ' WHERE a.Status=? ORDER BY a.CreatedAt DESC').all(status)
    : db.prepare(apptSelect + ' ORDER BY a.CreatedAt DESC').all();
  res.json(rows);
}));
const decide = (status, title) => wrap((req, res) => {
  const a = db.prepare('SELECT * FROM Appointments WHERE Id=?').get(req.params.id);
  if (!a) return bad(res, 'الحجز غير موجود', 404);
  if (a.Status !== 'Pending') return bad(res, 'تم البت في هذا الحجز بالفعل');
  db.prepare('UPDATE Appointments SET Status=?, AdminNote=? WHERE Id=?').run(status, req.body?.note || null, a.Id);
  if (status === 'Rejected') db.prepare('UPDATE AvailableSlots SET IsBooked=0 WHERE Id=?').run(a.SlotId);
  const full = db.prepare(apptSelect + ' WHERE a.Id=?').get(a.Id);
  notify(a.PatientId, title, `حجزك مع ${full.DoctorName} يوم ${full.SlotDate} الساعة ${full.SlotTime}.${req.body?.note ? ' ملاحظة: ' + req.body.note : ''}`);
  log(req.user.Id, status.toUpperCase() + '_APPOINTMENT', String(a.Id));
  res.json(full);
});
admin.put('/appointments/:id/approve', decide('Approved', 'تمت الموافقة على حجزك'));
admin.put('/appointments/:id/reject', decide('Rejected', 'تم رفض طلب الحجز'));

admin.get('/reports', wrap((req, res) => {
  res.json({
    byClinic: db.prepare(`SELECT c.Name AS name, COUNT(a.Id) AS total,
      SUM(a.Status='Approved') AS approved, SUM(a.Status='Pending') AS pending, SUM(a.Status='Rejected') AS rejected
      FROM Clinics c LEFT JOIN Appointments a ON a.ClinicId=c.Id GROUP BY c.Id ORDER BY total DESC`).all(),
    byDoctor: db.prepare(`SELECT d.FullName AS name, COUNT(a.Id) AS total FROM Doctors d LEFT JOIN Appointments a ON a.DoctorId=d.Id
      GROUP BY d.Id ORDER BY total DESC LIMIT 10`).all(),
    byDay: db.prepare(`SELECT s.SlotDate AS date, COUNT(*) AS total FROM Appointments a JOIN AvailableSlots s ON s.Id=a.SlotId
      GROUP BY s.SlotDate ORDER BY s.SlotDate DESC LIMIT 14`).all(),
  });
}));
admin.get('/logs', wrap((req, res) =>
  res.json(db.prepare('SELECT l.*, u.FullName FROM Logs l LEFT JOIN Users u ON u.Id=l.UserId ORDER BY l.Id DESC LIMIT 200').all())));

// ---------- Notifications (current user) ----------
api.get('/notifications', auth, wrap((req, res) =>
  res.json(db.prepare('SELECT * FROM Notifications WHERE UserId=? ORDER BY Id DESC LIMIT 100').all(req.user.Id))));
api.put('/notifications/read-all', auth, wrap((req, res) => {
  db.prepare('UPDATE Notifications SET IsRead=1 WHERE UserId=?').run(req.user.Id);
  res.json({ ok: true });
}));
api.put('/notifications/:id/read', auth, wrap((req, res) => {
  db.prepare('UPDATE Notifications SET IsRead=1 WHERE Id=? AND UserId=?').run(req.params.id, req.user.Id);
  res.json({ ok: true });
}));

// ---------- Contact form ----------
api.post('/contact', wrap((req, res) => {
  const { name, email, message } = req.body || {};
  if (!name || !emailOk(email) || !message) return bad(res, 'الاسم والبريد والرسالة مطلوبين');
  log(null, 'CONTACT_MESSAGE', JSON.stringify({ name, email, message }));
  for (const a of db.prepare("SELECT u.Id FROM Users u JOIN Roles r ON r.Id=u.RoleId WHERE r.Name='Admin'").all())
    notify(a.Id, 'رسالة جديدة من نموذج التواصل', `${name} (${email}): ${message}`);
  res.status(201).json({ message: 'وصلتنا رسالتك، هنرد عليك قريب.' });
}));

api.use((req, res) => bad(res, 'المسار غير موجود', 404));

// ---------- Serve built React app in production ----------
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'client', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use((err, req, res, next) => { // eslint-disable-line
  console.error(err);
  res.status(500).json({ error: 'حصل خطأ في السيرفر' });
});

const PORT = process.env.PORT || 5000;
if (!process.env.NO_LISTEN) app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
