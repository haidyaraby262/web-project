import React, { useEffect, useState } from 'react';
import { NavLink, Routes, Route } from 'react-router-dom';
import { api } from '../api.js';
import Icon, { ICON_KEYS } from '../Icon.jsx';
import { ErrorBox, OkBox, Loader, StatusBadge, fmtDay, fmtTime, DAYS } from '../components.jsx';

const links = [['', 'الإحصائيات'], ['appointments', 'الحجوزات'], ['patients', 'المرضى'], ['doctors', 'الأطباء'], ['clinics', 'العيادات'], ['reports', 'التقارير'], ['notifications', 'الإشعارات'], ['logs', 'السجل']];

export default function AdminLayout() {
  return (
    <div className="container admin">
      <aside className="side-nav">
        <h3>لوحة التحكم</h3>
        {links.map(([to, t]) => <NavLink key={to} to={'/admin/' + to} end={to === ''}>{t}</NavLink>)}
      </aside>
      <div className="admin-body">
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="appointments" element={<Appointments />} />
          <Route path="patients" element={<Patients />} />
          <Route path="doctors" element={<AdminDoctors />} />
          <Route path="clinics" element={<AdminClinics />} />
          <Route path="reports" element={<Reports />} />
          <Route path="notifications" element={<AdminNotifications />} />
          <Route path="logs" element={<Logs />} />
        </Routes>
      </div>
    </div>
  );
}

function useLoad(url) {
  const [data, setData] = useState(null);
  const load = () => api.get(url).then(setData);
  useEffect(() => { setData(null); load(); }, [url]); // eslint-disable-line
  return [data, load];
}

function Dashboard() {
  const [s] = useLoad('/admin/stats');
  if (!s) return <Loader />;
  const cards = [['المرضى', s.patients], ['الأطباء', s.doctors], ['العيادات', s.clinics], ['كل الحجوزات', s.appointments], ['قيد المراجعة', s.pending], ['مؤكدة', s.approved], ['مرفوضة', s.rejected], ['ملغاة', s.cancelled], ['حجوزات اليوم', s.today]];
  return (<><h2>الإحصائيات</h2><div className="grid four">{cards.map(([t, n]) => <div className="card stat" key={t}><b>{n}</b><span>{t}</span></div>)}</div></>);
}

function Appointments() {
  const [status, setStatus] = useState('Pending');
  const [list, load] = useLoad('/admin/appointments' + (status ? `?status=${status}` : ''));
  const [err, setErr] = useState('');
  const act = async (id, kind) => {
    const note = kind === 'reject' ? prompt('سبب الرفض (اختياري)') : '';
    if (note === null) return;
    try { await api.put(`/admin/appointments/${id}/${kind}`, { note }); load(); } catch (x) { setErr(x.message); }
  };
  return (
    <>
      <h2>الحجوزات</h2><ErrorBox msg={err} />
      <div className="tabs">{[['Pending', 'قيد المراجعة'], ['Approved', 'مؤكدة'], ['Rejected', 'مرفوضة'], ['Cancelled', 'ملغاة'], ['', 'الكل']].map(([v, t]) => <button key={v} className={status === v ? 'on' : ''} onClick={() => setStatus(v)}>{t}</button>)}</div>
      {!list ? <Loader /> : list.length === 0 ? <p className="muted">لا توجد حجوزات.</p> : (
        <table className="table"><thead><tr><th>المريض</th><th>الطبيب</th><th>الموعد</th><th>الحالة</th><th></th></tr></thead><tbody>
          {list.map((a) => (
            <tr key={a.Id}><td>{a.PatientName}<br /><small className="muted">{a.PatientPhone}</small></td><td>{a.DoctorName}<br /><small className="muted">{a.ClinicName}</small></td>
              <td>{fmtDay(a.SlotDate)}<br />{fmtTime(a.SlotTime)}</td><td><StatusBadge s={a.Status} /></td>
              <td>{a.Status === 'Pending' && <><button className="btn btn-primary sm" onClick={() => act(a.Id, 'approve')}>قبول</button> <button className="btn btn-danger sm" onClick={() => act(a.Id, 'reject')}>رفض</button></>}</td></tr>
          ))}</tbody></table>)}
    </>
  );
}

function Patients() {
  const [q, setQ] = useState('');
  const [list, load] = useLoad('/admin/patients?q=' + encodeURIComponent(q));
  const edit = async (p) => {
    const fullName = prompt('الاسم', p.FullName); if (!fullName) return;
    const phone = prompt('الهاتف', p.Phone || '');
    await api.put('/admin/patients/' + p.Id, { fullName, phone }); load();
  };
  const del = async (p) => { if (confirm(`حذف ${p.FullName}؟ سيتم حذف حجوزاته.`)) { await api.del('/admin/patients/' + p.Id); load(); } };
  return (
    <>
      <h2>إدارة المرضى</h2>
      <input placeholder="بحث بالاسم أو البريد أو الهاتف" value={q} onChange={(e) => setQ(e.target.value)} />
      {!list ? <Loader /> : (
        <table className="table"><thead><tr><th>الاسم</th><th>البريد</th><th>الهاتف</th><th>الحجوزات</th><th></th></tr></thead><tbody>
          {list.map((p) => <tr key={p.Id}><td>{p.FullName}</td><td>{p.Email}</td><td>{p.Phone}</td><td>{p.AppointmentCount}</td>
            <td><button className="btn btn-ghost sm" onClick={() => edit(p)}>تعديل</button> <button className="btn btn-danger sm" onClick={() => del(p)}>حذف</button></td></tr>)}</tbody></table>)}
    </>
  );
}

const emptyDoc = { clinicId: '', fullName: '', title: '', bio: '', experienceYears: 0, fee: 0 };
function AdminDoctors() {
  const [list, load] = useLoad('/doctors'); const [clinics] = useLoad('/clinics');
  const [f, setF] = useState(emptyDoc); const [editing, setEditing] = useState(null); const [err, setErr] = useState('');
  const [sched, setSched] = useState(null); const [sf, setSf] = useState({ dayOfWeek: 0, startTime: '10:00', endTime: '15:00' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async (e) => {
    e.preventDefault(); setErr('');
    try { editing ? await api.put('/doctors/' + editing, f) : await api.post('/doctors', f); setF(emptyDoc); setEditing(null); load(); } catch (x) { setErr(x.message); }
  };
  const del = async (d) => { if (confirm('حذف ' + d.FullName + '؟')) { await api.del('/doctors/' + d.Id); load(); } };
  const openSched = async (d) => setSched({ doctor: d, rows: await api.get(`/doctors/${d.Id}/schedule`) });
  const addSched = async () => { await api.post(`/doctors/${sched.doctor.Id}/schedule`, sf).catch((x) => setErr(x.message)); openSched(sched.doctor); };
  const delSched = async (id) => { await api.del('/schedules/' + id); openSched(sched.doctor); };
  return (
    <>
      <h2>إدارة الأطباء</h2><ErrorBox msg={err} />
      <form className="card form grid-form" onSubmit={save}>
        <select required value={f.clinicId} onChange={set('clinicId')}><option value="">العيادة</option>{clinics?.map((c) => <option key={c.Id} value={c.Id}>{c.Name}</option>)}</select>
        <input required placeholder="الاسم" value={f.fullName} onChange={set('fullName')} />
        <input placeholder="المسمى الوظيفي" value={f.title} onChange={set('title')} />
        <input type="number" placeholder="سنوات الخبرة" value={f.experienceYears} onChange={set('experienceYears')} />
        <input type="number" placeholder="سعر الكشف" value={f.fee} onChange={set('fee')} />
        <input placeholder="نبذة" value={f.bio} onChange={set('bio')} />
        <button className="btn btn-primary">{editing ? 'حفظ التعديل' : 'إضافة طبيب'}</button>
        {editing && <button type="button" className="btn btn-ghost" onClick={() => { setEditing(null); setF(emptyDoc); }}>إلغاء</button>}
      </form>
      {!list ? <Loader /> : (
        <table className="table"><thead><tr><th>الطبيب</th><th>العيادة</th><th>الكشف</th><th></th></tr></thead><tbody>
          {list.map((d) => <tr key={d.Id}><td>{d.FullName}<br /><small className="muted">{d.Title}</small></td><td>{d.ClinicName}</td><td>{d.Fee}</td>
            <td><button className="btn btn-ghost sm" onClick={() => openSched(d)}>الجدول</button> <button className="btn btn-ghost sm" onClick={() => { setEditing(d.Id); setF({ clinicId: d.ClinicId, fullName: d.FullName, title: d.Title, bio: d.Bio, experienceYears: d.ExperienceYears, fee: d.Fee }); window.scrollTo(0, 0); }}>تعديل</button> <button className="btn btn-danger sm" onClick={() => del(d)}>حذف</button></td></tr>)}</tbody></table>)}
      {sched && (
        <div className="card"><h3>جدول {sched.doctor.FullName}</h3>
          <ul className="plain">{sched.rows.map((r) => <li key={r.Id}>{DAYS[r.DayOfWeek]}: {r.StartTime} - {r.EndTime} <button className="btn btn-danger sm" onClick={() => delSched(r.Id)}>حذف</button></li>)}</ul>
          <div className="row">
            <select value={sf.dayOfWeek} onChange={(e) => setSf({ ...sf, dayOfWeek: +e.target.value })}>{DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}</select>
            <input type="time" value={sf.startTime} onChange={(e) => setSf({ ...sf, startTime: e.target.value })} />
            <input type="time" value={sf.endTime} onChange={(e) => setSf({ ...sf, endTime: e.target.value })} />
            <button className="btn btn-primary" onClick={addSched}>إضافة</button>
          </div></div>)}
    </>
  );
}

function AdminClinics() {
  const [list, load] = useLoad('/clinics');
  const [f, setF] = useState({ name: '', description: '', icon: 'stethoscope', floor: '' }); const [editing, setEditing] = useState(null); const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async (e) => {
    e.preventDefault(); setErr('');
    try { editing ? await api.put('/clinics/' + editing, f) : await api.post('/clinics', f); setF({ name: '', description: '', icon: 'stethoscope', floor: '' }); setEditing(null); load(); } catch (x) { setErr(x.message); }
  };
  const del = async (c) => { if (confirm('حذف ' + c.Name + '؟')) { await api.del('/clinics/' + c.Id); load(); } };
  return (
    <>
      <h2>إدارة العيادات</h2><ErrorBox msg={err} />
      <form className="card form grid-form" onSubmit={save}>
        <input required placeholder="اسم العيادة" value={f.name} onChange={set('name')} />
        <select value={f.icon} onChange={set('icon')}>{ICON_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}</select>
        <input placeholder="الدور" value={f.floor} onChange={set('floor')} />
        <input placeholder="الوصف" value={f.description} onChange={set('description')} />
        <button className="btn btn-primary">{editing ? 'حفظ التعديل' : 'إضافة عيادة'}</button>
      </form>
      {!list ? <Loader /> : (
        <table className="table"><thead><tr><th></th><th>العيادة</th><th>الأطباء</th><th></th></tr></thead><tbody>
          {list.map((c) => <tr key={c.Id}><td><Icon name={c.Icon} /></td><td>{c.Name}<br /><small className="muted">{c.Floor}</small></td><td>{c.DoctorCount}</td>
            <td><button className="btn btn-ghost sm" onClick={() => { setEditing(c.Id); setF({ name: c.Name, description: c.Description, icon: c.Icon, floor: c.Floor }); }}>تعديل</button> <button className="btn btn-danger sm" onClick={() => del(c)}>حذف</button></td></tr>)}</tbody></table>)}
    </>
  );
}

function Reports() {
  const [r] = useLoad('/admin/reports');
  if (!r) return <Loader />;
  const max = Math.max(1, ...r.byClinic.map((c) => c.total));
  return (
    <>
      <h2>التقارير</h2>
      <div className="card"><h3>الحجوزات حسب العيادة</h3>
        {r.byClinic.map((c) => <div className="bar-row" key={c.name}><span>{c.name}</span><div className="bar"><i style={{ width: (c.total / max) * 100 + '%' }} /></div><b>{c.total}</b></div>)}</div>
      <div className="card"><h3>أكثر الأطباء حجزًا</h3>
        <table className="table"><tbody>{r.byDoctor.map((d) => <tr key={d.name}><td>{d.name}</td><td>{d.total}</td></tr>)}</tbody></table></div>
      <div className="card"><h3>آخر 14 يومًا (حسب تاريخ الموعد)</h3>
        <table className="table"><tbody>{r.byDay.map((d) => <tr key={d.date}><td>{d.date}</td><td>{d.total}</td></tr>)}</tbody></table></div>
    </>
  );
}

function AdminNotifications() {
  const [list, load] = useLoad('/notifications');
  if (!list) return <Loader />;
  return (<><h2>الإشعارات</h2><button className="btn btn-ghost" onClick={async () => { await api.put('/notifications/read-all'); load(); }}>تعليم الكل كمقروء</button>
    {list.map((n) => <div key={n.Id} className={'card notif' + (n.IsRead ? '' : ' unread')}><b>{n.Title}</b><p>{n.Message}</p><small className="muted">{n.CreatedAt}</small></div>)}</>);
}

function Logs() {
  const [list] = useLoad('/admin/logs');
  if (!list) return <Loader />;
  return (<><h2>سجل النشاط</h2><table className="table"><thead><tr><th>الوقت</th><th>المستخدم</th><th>الإجراء</th><th>تفاصيل</th></tr></thead><tbody>
    {list.map((l) => <tr key={l.Id}><td>{l.CreatedAt}</td><td>{l.FullName || '—'}</td><td>{l.Action}</td><td className="small">{l.Details}</td></tr>)}</tbody></table></>);
}
