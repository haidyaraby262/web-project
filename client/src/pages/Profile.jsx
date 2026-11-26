import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { PageHead, ErrorBox, OkBox, Loader } from '../components.jsx';

export function Profile() {
  const { user, setUser } = useAuth();
  const [f, setF] = useState({ fullName: user.FullName, phone: user.Phone || '', birthDate: user.BirthDate || '', gender: user.Gender || '', address: user.Address || '' });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [msg, setMsg] = useState(''); const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async (e) => {
    e.preventDefault(); setMsg(''); setErr('');
    try { setUser(await api.put('/profile', f)); setMsg('تم حفظ بياناتك'); } catch (x) { setErr(x.message); }
  };
  const changePw = async (e) => {
    e.preventDefault(); setMsg(''); setErr('');
    try { await api.put('/profile/password', pw); setMsg('تم تغيير كلمة المرور'); setPw({ currentPassword: '', newPassword: '' }); } catch (x) { setErr(x.message); }
  };
  return (
    <>
      <PageHead title="ملفي الشخصي" sub={user.Email} />
      <section className="section container two-col">
        <form className="card form" onSubmit={save}>
          <h3>تعديل البيانات</h3><ErrorBox msg={err} /><OkBox msg={msg} />
          <label>الاسم الكامل<input required value={f.fullName} onChange={set('fullName')} /></label>
          <label>رقم الهاتف<input value={f.phone} onChange={set('phone')} /></label>
          <label>تاريخ الميلاد<input type="date" value={f.birthDate} onChange={set('birthDate')} /></label>
          <label>النوع<select value={f.gender} onChange={set('gender')}><option value="">—</option><option value="female">أنثى</option><option value="male">ذكر</option></select></label>
          <label>العنوان<input value={f.address} onChange={set('address')} /></label>
          <button className="btn btn-primary">حفظ</button>
        </form>
        <form className="card form" onSubmit={changePw}>
          <h3>تغيير كلمة المرور</h3>
          <label>الحالية<input type="password" required value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></label>
          <label>الجديدة<input type="password" required minLength={6} value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></label>
          <button className="btn btn-ghost">تغيير</button>
        </form>
      </section>
    </>
  );
}

export function Notifications() {
  const [list, setList] = useState(null);
  const load = () => api.get('/notifications').then(setList);
  useEffect(() => { load(); }, []);
  const readAll = async () => { await api.put('/notifications/read-all'); load(); };
  if (!list) return <Loader />;
  return (
    <>
      <PageHead title="الإشعارات" />
      <section className="section container narrow">
        {list.length > 0 && <button className="btn btn-ghost" onClick={readAll}>تعليم الكل كمقروء</button>}
        {list.length === 0 && <p className="muted">لا توجد إشعارات.</p>}
        {list.map((n) => (
          <div key={n.Id} className={'card notif' + (n.IsRead ? '' : ' unread')}>
            <b>{n.Title}</b><p>{n.Message}</p><small className="muted">{n.CreatedAt}</small>
          </div>
        ))}
      </section>
    </>
  );
}
