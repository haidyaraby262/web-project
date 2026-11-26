import React, { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { api } from '../api.js';
import { ErrorBox, OkBox } from '../components.jsx';

const Shell = ({ title, sub, children }) => (
  <section className="auth"><div className="card form auth-card"><h2>{title}</h2><p className="muted">{sub}</p>{children}</div></section>
);

export function Login() {
  const { login } = useAuth();
  const nav = useNavigate(); const loc = useLocation();
  const [f, setF] = useState({ email: '', password: '' }); const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    try { const u = await login(f.email, f.password); nav(loc.state?.from || (u.Role === 'Admin' ? '/admin' : '/')); }
    catch (x) { setErr(x.message); }
  };
  return (
    <Shell title="تسجيل الدخول" sub="أهلاً بعودتك إلى دَوْر">
      <form onSubmit={submit}>
        <ErrorBox msg={err} />
        <label>البريد الإلكتروني<input type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
        <label>كلمة المرور<input type="password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></label>
        <button className="btn btn-primary block">دخول</button>
      </form>
      <p className="small center-t"><Link to="/forgot-password">نسيت كلمة المرور؟</Link></p>
      <p className="small center-t">ليس لديك حساب؟ <Link to="/register">أنشئ حساب</Link></p>
    </Shell>
  );
}

export function Register() {
  const { register } = useAuth(); const nav = useNavigate();
  const [f, setF] = useState({ fullName: '', email: '', phone: '', password: '', confirm: '' }); const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    if (f.password !== f.confirm) return setErr('كلمتا المرور غير متطابقتين');
    try { await register({ fullName: f.fullName, email: f.email, phone: f.phone, password: f.password }); nav('/'); }
    catch (x) { setErr(x.message); }
  };
  return (
    <Shell title="إنشاء حساب" sub="سجّل لتتمكن من حجز مواعيدك ومتابعتها">
      <form onSubmit={submit}>
        <ErrorBox msg={err} />
        <label>الاسم الكامل<input required value={f.fullName} onChange={set('fullName')} /></label>
        <label>البريد الإلكتروني<input type="email" required value={f.email} onChange={set('email')} /></label>
        <label>رقم الهاتف<input value={f.phone} onChange={set('phone')} /></label>
        <label>كلمة المرور<input type="password" required minLength={6} value={f.password} onChange={set('password')} /></label>
        <label>تأكيد كلمة المرور<input type="password" required value={f.confirm} onChange={set('confirm')} /></label>
        <button className="btn btn-primary block">إنشاء الحساب</button>
      </form>
      <p className="small center-t">لديك حساب؟ <Link to="/login">سجّل الدخول</Link></p>
    </Shell>
  );
}

export function Forgot() {
  const [email, setEmail] = useState(''); const [msg, setMsg] = useState(''); const [dev, setDev] = useState(''); const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    try { const r = await api.post('/auth/forgot-password', { email }); setMsg(r.message); setDev(r.devToken || ''); }
    catch (x) { setErr(x.message); }
  };
  return (
    <Shell title="نسيت كلمة المرور" sub="اكتب بريدك وسنرسل لك رابط إعادة التعيين">
      <form onSubmit={submit}>
        <ErrorBox msg={err} /><OkBox msg={msg} />
        {dev && <p className="small">وضع التطوير (بدون خدمة إيميل): <Link to={`/reset-password?token=${dev}`}>افتح رابط إعادة التعيين</Link></p>}
        <label>البريد الإلكتروني<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <button className="btn btn-primary block">إرسال</button>
      </form>
    </Shell>
  );
}

export function Reset() {
  const [sp] = useSearchParams(); const nav = useNavigate();
  const [password, setPassword] = useState(''); const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    try { const r = await api.post('/auth/reset-password', { token: sp.get('token'), password }); setOk(r.message); setTimeout(() => nav('/login'), 1200); }
    catch (x) { setErr(x.message); }
  };
  return (
    <Shell title="كلمة مرور جديدة" sub="اختر كلمة مرور قوية">
      <form onSubmit={submit}>
        <ErrorBox msg={err} /><OkBox msg={ok} />
        <label>كلمة المرور الجديدة<input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        <button className="btn btn-primary block">حفظ</button>
      </form>
    </Shell>
  );
}
