import bcrypt from 'bcryptjs';
import { db, ensureSlots, fmtDate } from './db.js';

if (db.prepare('SELECT COUNT(*) n FROM Roles').get().n) {
  console.log('Database already seeded. Delete server/arkan.db to reseed.');
  process.exit(0);
}
const role = db.prepare('INSERT INTO Roles (Name) VALUES (?)');
role.run('Admin'); role.run('Patient');
const mkUser = db.prepare('INSERT INTO Users (FullName, Email, Phone, PasswordHash, RoleId) VALUES (?,?,?,?,(SELECT Id FROM Roles WHERE Name=?))');
mkUser.run('مدير النظام', 'admin@arkan.com', '01000000000', bcrypt.hashSync('Admin@123', 10), 'Admin');
mkUser.run('مريض تجريبي', 'patient@arkan.com', '01111111111', bcrypt.hashSync('Patient@123', 10), 'Patient');

const clinics = [
  ['الباطنة العامة', 'تشخيص وعلاج أمراض الباطنة ومتابعة الحالات المزمنة.', 'stethoscope', 'الدور الأول'],
  ['طب الأطفال', 'رعاية متكاملة لصحة طفلك من حديثي الولادة حتى المراهقة.', 'baby', 'الدور الأول'],
  ['طب الأسنان', 'علاجات الأسنان التجميلية والترميمية بأحدث التقنيات.', 'tooth', 'الدور الثاني'],
  ['القلب والأوعية', 'فحوصات دقيقة ومتابعة شاملة لصحة القلب والدورة الدموية.', 'heart', 'الدور الثاني'],
  ['الجلدية', 'علاج الأمراض الجلدية والشعر والعناية الطبية بالبشرة.', 'skin', 'الدور الثالث'],
  ['العظام', 'تشخيص وعلاج إصابات العظام والمفاصل والعلاج الطبيعي.', 'bone', 'الدور الثالث'],
];
const insC = db.prepare('INSERT INTO Clinics (Name, Description, Icon, Floor) VALUES (?,?,?,?)');
clinics.forEach((c) => insC.run(...c));

const doctors = [
  [1, 'د. أحمد محمد', 'استشاري الباطنة والسكري', 14, 400], [1, 'د. هاني سمير', 'أخصائي الباطنة والجهاز الهضمي', 9, 300],
  [2, 'د. سارة خالد', 'استشاري طب الأطفال وحديثي الولادة', 11, 350], [2, 'د. ياسمين عادل', 'أخصائي طب الأطفال', 7, 250],
  [3, 'د. كريم نبيل', 'استشاري تقويم وتجميل الأسنان', 12, 450], [3, 'د. رنا مصطفى', 'أخصائي علاج جذور', 8, 300],
  [4, 'د. منى إبراهيم', 'أستاذ مساعد أمراض القلب', 16, 500], [4, 'د. طارق فؤاد', 'استشاري قسطرة القلب', 18, 600],
  [5, 'د. دينا حسن', 'استشاري الأمراض الجلدية', 10, 350], [5, 'د. عمر السيد', 'أخصائي جلدية وليزر', 6, 300],
  [6, 'د. خالد عبد الله', 'استشاري جراحة العظام', 15, 450], [6, 'د. نهى رضا', 'أخصائي علاج طبيعي', 8, 250],
];
const insD = db.prepare('INSERT INTO Doctors (ClinicId, FullName, Title, Bio, ExperienceYears, Fee) VALUES (?,?,?,?,?,?)');
const insS = db.prepare('INSERT INTO DoctorSchedules (DoctorId, DayOfWeek, StartTime, EndTime, SlotMinutes) VALUES (?,?,?,?,30)');
doctors.forEach((d, i) => {
  const id = insD.run(d[0], d[1], d[2], `${d[1]} بخبرة ${d[3]} سنة في مجال ${d[2]}، ويهتم براحة المريض ووضوح خطة العلاج.`, d[3], d[4]).lastInsertRowid;
  const days = [[0, 2, 4], [1, 3, 6], [0, 1, 3]][i % 3]; // Sun..Sat
  days.forEach((day) => insS.run(id, day, i % 2 ? '14:00' : '10:00', i % 2 ? '19:00' : '15:00'));
});

// pre-generate two weeks of slots
const today = new Date();
for (let i = 0; i < 14; i++) {
  const d = new Date(today); d.setDate(d.getDate() + i);
  for (let doc = 1; doc <= doctors.length; doc++) ensureSlots(doc, fmtDate(d));
}
console.log('Seeded. Admin: admin@arkan.com / Admin@123   Patient: patient@arkan.com / Patient@123');
