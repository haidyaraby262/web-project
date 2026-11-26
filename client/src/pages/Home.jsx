import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { DoctorCard } from '../components.jsx';
import Icon from '../Icon.jsx';

export default function Home() {
  const [clinics, setClinics] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [clinicId, setClinicId] = useState('');
  const nav = useNavigate();
  useEffect(() => {
    api.get('/clinics').then(setClinics).catch(() => {});
    api.get('/doctors').then((d) => setDoctors(d.slice(0, 3))).catch(() => {});
  }, []);
  return (
    <>
      <section className="hero">
        <div className="container">
          <span className="pill">● رعاية متكاملة لك ولعائلتك</span>
          <h1>كل التخصصات الطبية<br /><span>في مكان واحد</span></h1>
          <p>في مركز أركان الطبي، نجمع الخبرة الطبية والتقنيات الحديثة لنقدم لك رحلة علاجية أكثر سهولة واهتمامًا من أول خطوة.</p>
          <div className="row center">
            <Link to="/book" className="btn btn-primary btn-lg"><Icon name="calendar" size={20} /> احجز موعدك الآن</Link>
            <Link to="/clinics" className="btn btn-light btn-lg">اكتشف العيادات</Link>
          </div>
          <div className="stats">
            <div><b>+25</b><span>طبيب متخصص</span></div>
            <div><b>+12</b><span>عيادة طبية</span></div>
            <div><b>4.9</b><span>تقييم مرضانا</span></div>
          </div>
        </div>
      </section>

      <div className="container">
        <div className="finder card">
          <div><h3>ابحث عن الرعاية المناسبة</h3><p className="muted">ما التخصص الذي تبحث عنه؟</p></div>
          <select value={clinicId} onChange={(e) => setClinicId(e.target.value)}>
            <option value="">كل التخصصات</option>
            {clinics.map((c) => <option key={c.Id} value={c.Id}>{c.Name}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => nav('/doctors' + (clinicId ? `?clinic=${clinicId}` : ''))}>عرض الأطباء</button>
        </div>
      </div>

      <section className="section container about-teaser">
        <div>
          <span className="eyebrow">عن مركز أركان الطبي</span>
          <h2>رعاية طبية تدور حول احتياجاتك</h2>
          <p>مركز طبي خاص متكامل يجمع تخصصات متعددة تحت سقف واحد، لتكون رحلتك العلاجية أوضح وأسرع وأكثر راحة.</p>
          <Link to="/about" className="btn btn-ghost">تعرّف على خدماتنا</Link>
        </div>
        <div className="feats">
          {[['فريق طبي متميز', 'نخبة من الاستشاريين والمتخصصين.'], ['تقنيات تشخيص حديثة', 'فحوصات دقيقة تدعم قرارًا علاجيًا أفضل.'], ['متابعة منظمة', 'من الحجز وحتى الاطمئنان على صحتك.']].map(([t, s]) => (
            <div className="card" key={t}><h4>{t}</h4><p className="muted">{s}</p></div>
          ))}
        </div>
      </section>

      <section className="section alt"><div className="container">
        <span className="eyebrow">عياداتنا</span><h2>تخصصات طبية متكاملة</h2>
        <p className="muted">اختر التخصص المناسب واطّلع على أطباء المركز ومواعيد كل طبيب.</p>
        <div className="grid">
          {clinics.map((c) => (
            <div className="card clinic" key={c.Id}>
              <div className="ico"><Icon name={c.Icon} size={28} /></div><h3>{c.Name}</h3><p className="muted">{c.Description}</p>
              <p className="small">{c.DoctorCount} أطباء متخصصين</p>
              <Link to={`/doctors?clinic=${c.Id}`} className="link">عرض الأطباء ←</Link>
            </div>
          ))}
        </div>
        <div className="row center"><Link to="/clinics" className="btn btn-ghost">عرض كل العيادات</Link></div>
      </div></section>

      <section className="section container">
        <span className="eyebrow">فريقنا الطبي</span><h2>أطباء تثق بهم</h2>
        <p className="muted">خبرات متنوعة تعمل معًا لتقديم رعاية متكاملة داخل مركز أركان الطبي.</p>
        <div className="grid">{doctors.map((d) => <DoctorCard key={d.Id} d={d} />)}</div>
      </section>

      <section className="section alt"><div className="container">
        <span className="eyebrow">حجزك في أربع خطوات</span><h2>موعدك الطبي أصبح أسهل</h2>
        <p className="muted">طلب الحجز يحتاج موافقة المركز قبل أن يصبح مؤكدًا.</p>
        <div className="grid four">
          {[['اختر العيادة', 'حدد التخصص الطبي المناسب.'], ['اختر الطبيب', 'اطّلع على الخبرة والمواعيد.'], ['اختر الموعد', 'التاريخ والوقت المتاح.'], ['تابع الحجز', 'تصلك الموافقة في الإشعارات.']].map(([t, s], i) => (
            <div className="card step" key={t}><b>0{i + 1}</b><h4>{t}</h4><p className="muted">{s}</p></div>
          ))}
        </div>
      </div></section>
    </>
  );
}
