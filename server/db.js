import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.dirname(fileURLToPath(import.meta.url));
// Thin wrapper over Node's built-in SQLite (node:sqlite, Node 22.13+): no native compile step needed.
const raw = new DatabaseSync(process.env.DB_FILE || path.join(dir, 'arkan.db'));
raw.exec('PRAGMA journal_mode = WAL');
raw.exec('PRAGMA foreign_keys = ON');
const plain = (row) => (row ? { ...row } : undefined);
export const db = {
  exec: (sql) => raw.exec(sql),
  prepare(sql) {
    const st = raw.prepare(sql);
    return {
      run: (...a) => { const r = st.run(...a); return { changes: Number(r.changes), lastInsertRowid: Number(r.lastInsertRowid) }; },
      get: (...a) => plain(st.get(...a)),
      all: (...a) => st.all(...a).map(plain),
    };
  },
  transaction: (fn) => (...a) => {
    raw.exec('BEGIN');
    try { const r = fn(...a); raw.exec('COMMIT'); return r; } catch (e) { raw.exec('ROLLBACK'); throw e; }
  },
};

db.exec(`
CREATE TABLE IF NOT EXISTS Roles (
  Id INTEGER PRIMARY KEY AUTOINCREMENT,
  Name TEXT UNIQUE NOT NULL
);
CREATE TABLE IF NOT EXISTS Users (
  Id INTEGER PRIMARY KEY AUTOINCREMENT,
  FullName TEXT NOT NULL,
  Email TEXT UNIQUE NOT NULL,
  Phone TEXT,
  PasswordHash TEXT NOT NULL,
  RoleId INTEGER NOT NULL REFERENCES Roles(Id),
  BirthDate TEXT,
  Gender TEXT,
  Address TEXT,
  ResetToken TEXT,
  ResetExpires INTEGER,
  CreatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS Clinics (
  Id INTEGER PRIMARY KEY AUTOINCREMENT,
  Name TEXT NOT NULL,
  Description TEXT,
  Icon TEXT,
  Floor TEXT,
  IsActive INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS Doctors (
  Id INTEGER PRIMARY KEY AUTOINCREMENT,
  ClinicId INTEGER NOT NULL REFERENCES Clinics(Id) ON DELETE CASCADE,
  FullName TEXT NOT NULL,
  Title TEXT,
  Bio TEXT,
  ExperienceYears INTEGER DEFAULT 0,
  Fee INTEGER DEFAULT 0,
  IsActive INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS DoctorSchedules (
  Id INTEGER PRIMARY KEY AUTOINCREMENT,
  DoctorId INTEGER NOT NULL REFERENCES Doctors(Id) ON DELETE CASCADE,
  DayOfWeek INTEGER NOT NULL,          -- 0 = Sunday ... 6 = Saturday
  StartTime TEXT NOT NULL,             -- HH:MM
  EndTime TEXT NOT NULL,
  SlotMinutes INTEGER DEFAULT 30
);
CREATE TABLE IF NOT EXISTS AvailableSlots (
  Id INTEGER PRIMARY KEY AUTOINCREMENT,
  DoctorId INTEGER NOT NULL REFERENCES Doctors(Id) ON DELETE CASCADE,
  SlotDate TEXT NOT NULL,              -- YYYY-MM-DD
  SlotTime TEXT NOT NULL,              -- HH:MM
  IsBooked INTEGER DEFAULT 0,
  UNIQUE (DoctorId, SlotDate, SlotTime)
);
CREATE TABLE IF NOT EXISTS Appointments (
  Id INTEGER PRIMARY KEY AUTOINCREMENT,
  PatientId INTEGER NOT NULL REFERENCES Users(Id) ON DELETE CASCADE,
  DoctorId INTEGER NOT NULL REFERENCES Doctors(Id),
  ClinicId INTEGER NOT NULL REFERENCES Clinics(Id),
  SlotId INTEGER NOT NULL REFERENCES AvailableSlots(Id),
  Notes TEXT,
  Status TEXT NOT NULL DEFAULT 'Pending',  -- Pending | Approved | Rejected | Cancelled
  AdminNote TEXT,
  CreatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS Notifications (
  Id INTEGER PRIMARY KEY AUTOINCREMENT,
  UserId INTEGER NOT NULL REFERENCES Users(Id) ON DELETE CASCADE,
  Title TEXT NOT NULL,
  Message TEXT,
  IsRead INTEGER DEFAULT 0,
  CreatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS Logs (
  Id INTEGER PRIMARY KEY AUTOINCREMENT,
  UserId INTEGER,
  Action TEXT NOT NULL,
  Details TEXT,
  CreatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

export function log(userId, action, details = '') {
  db.prepare('INSERT INTO Logs (UserId, Action, Details) VALUES (?,?,?)').run(userId ?? null, action, details);
}
export function notify(userId, title, message) {
  db.prepare('INSERT INTO Notifications (UserId, Title, Message) VALUES (?,?,?)').run(userId, title, message);
}

const pad = (n) => String(n).padStart(2, '0');
export const fmtDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Create AvailableSlots rows for a doctor on a date from DoctorSchedules.
export function ensureSlots(doctorId, dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d)) return;
  const schedules = db.prepare('SELECT * FROM DoctorSchedules WHERE DoctorId=? AND DayOfWeek=?').all(doctorId, d.getDay());
  const ins = db.prepare('INSERT OR IGNORE INTO AvailableSlots (DoctorId, SlotDate, SlotTime) VALUES (?,?,?)');
  for (const s of schedules) {
    let [h, m] = s.StartTime.split(':').map(Number);
    const [eh, em] = s.EndTime.split(':').map(Number);
    while (h * 60 + m + s.SlotMinutes <= eh * 60 + em) {
      ins.run(doctorId, dateStr, `${pad(h)}:${pad(m)}`);
      m += s.SlotMinutes;
      h += Math.floor(m / 60);
      m %= 60;
    }
  }
}
