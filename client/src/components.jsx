import React, { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import { api } from './api.js';
import Icon from './Icon.jsx';

export function Logo() {
  return (
    <Link to="/" className="logo">
      <span className="logo-mark">+</span>
      <span><b>أركان</b><small>مركز طبي متكامل</small></span>
    </Link>
  );
}

export function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const nav = useNavigate();
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);
  useEffect(() => {
    if (user) api.get('/notifications').then((n) => setUnread(n.filter((x) => !x.IsRead).length)).catch(() => {});
  }, [user, loc.pathname]);
  const links = [['/', 'الرئيسية'], ['/clinics', 'العيادات'], ['/doctors', 'الأطباء'], ['/about', 'عن المركز'], ['/contact', 'تواصل معنا']];
  return (
    <header className="nav">
      <div className="container nav-in">
        <Logo />
        <nav className={'nav-links' + (open ? ' open' : '')}>
          {links.map(([to, t]) => <NavLink key={to} to={to} end={to === '/'}>{t}</NavLink>)}
          {user?.Role === 'Admin' && <NavLink to="/admin">لوحة التحكم</NavLink>}
          {user && <NavLink to="/my-appointments">حجوزاتي</NavLink>}
        </nav>
        <div className="nav-actions">
          {user ? (
            <>
              <Link to="/notifications" className="icon-btn" title="الإشعارات"><Icon name="bell" size={22} />{unread > 0 && <i className="badge">{unread}</i>}</Link>
              <Link to="/profile" className="btn btn-ghost">{user.FullName.split(' ')[0]}</Link>
              <button className="btn btn-ghost" onClick={() => { logout(); nav('/'); }}>خروج</button>
            </>
          ) : <Link to="/login" className="btn btn-ghost">تسجيل الدخول</Link>}
          <Link to="/book" className="btn btn-primary"><Icon name="calendar" size={18} /> احجز موعدك</Link>
          <button className="icon-btn menu" onClick={() => setOpen(!open)} aria-label="القائمة"><Icon name="menu" size={24} /></button>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-in">
        <div><Logo /><p>مركز طبي خاص متكامل يجمع تخصصات متعددة تحت سقف واحد.</p></div>
        <div><h4>روابط</h4><Link to="/clinics">العيادات</Link><Link to="/doctors">الأطباء</Link><Link to="/book">احجز موعد</Link></div>
        <div><h4>تواصل</h4><span className="ic"><Icon name="phone" size={16} /> 0100 000 0000</span><span className="ic"><Icon name="mail" size={16} /> info@arkan.com</span><span className="ic"><Icon name="pin" size={16} /> المنصورة، مصر</span></div>
      </div>
      <div className="copy">© {new Date().getFullYear()} مركز أركان الطبي. جميع الحقوق محفوظة.</div>
    </footer>
  );
}

export function Protected({ children, admin }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname + loc.search }} replace />;
  if (admin && user.Role !== 'Admin') return <Navigate to="/" replace />;
  return children;
}

export const Loader = () => <div className="loader">جاري التحميل...</div>;
export const ErrorBox = ({ msg }) => (msg ? <div className="alert alert-err">{msg}</div> : null);
export const OkBox = ({ msg }) => (msg ? <div className="alert alert-ok">{msg}</div> : null);
export const PageHead = ({ eyebrow, title, sub }) => (
  <div className="page-head"><div className="container">
    {eyebrow && <span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1>{sub && <p>{sub}</p>}
  </div></div>
);

export const STATUS = { Pending: ['قيد المراجعة', 'st-pending'], Approved: ['مؤكد', 'st-ok'], Rejected: ['مرفوض', 'st-no'], Cancelled: ['ملغي', 'st-cancel'] };
export const StatusBadge = ({ s }) => <span className={'status ' + (STATUS[s]?.[1] || '')}>{STATUS[s]?.[0] || s}</span>;
export const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
export const fmtDay = (d) => new Date(d + 'T00:00:00').toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' });
export const fmtTime = (t) => { const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'م' : 'ص'}`; };

export function DoctorCard({ d }) {
  return (
    <div className="card doctor">
      <div className="avatar">{d.FullName.replace('د. ', '')[0]}</div>
      <span className="tag">{d.ClinicName}</span>
      <h3>{d.FullName}</h3>
      <p className="muted">{d.Title}</p>
      <p className="small">خبرة {d.ExperienceYears} عامًا · كشف {d.Fee} ج.م</p>
      {d.NextSlotDate && <p className="small next">أقرب موعد: {fmtDay(d.NextSlotDate)}</p>}
      <div className="row">
        <Link className="btn btn-primary" to={`/book?clinic=${d.ClinicId}&doctor=${d.Id}`}>احجز موعد</Link>
        <Link className="btn btn-ghost" to={`/doctors/${d.Id}`}>التفاصيل</Link>
      </div>
    </div>
  );
}
