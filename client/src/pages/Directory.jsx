import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import Icon from '../Icon.jsx';
import { PageHead, Loader, DoctorCard, DAYS, fmtTime } from '../components.jsx';

export function Clinics() {
  const [list, setList] = useState(null);
  useEffect(() => { api.get('/clinics').then(setList); }, []);
  if (!list) return <Loader />;
  return (
    <>
      <PageHead eyebrow="عياداتنا" title="تخصصات طبية متكاملة" sub="اختر التخصص المناسب واطّلع على أطباء المركز." />
      <section className="section container"><div className="grid">
        {list.map((c) => (
          <div className="card clinic" key={c.Id}>
            <div className="ico"><Icon name={c.Icon} size={28} /></div><h3>{c.Name}</h3><p className="muted">{c.Description}</p>
            <p className="small">{c.DoctorCount} أطباء · {c.Floor}</p>
            <div className="row"><Link className="btn btn-ghost" to={`/doctors?clinic=${c.Id}`}>عرض الأطباء</Link><Link className="btn btn-primary" to={`/book?clinic=${c.Id}`}>احجز</Link></div>
          </div>
        ))}
      </div></section>
    </>
  );
}

export function Doctors() {
  const [sp, setSp] = useSearchParams();
  const clinic = sp.get('clinic') || ''; const [q, setQ] = useState('');
  const [clinics, setClinics] = useState([]); const [list, setList] = useState(null);
  useEffect(() => { api.get('/clinics').then(setClinics); }, []);
  useEffect(() => {
    const p = new URLSearchParams(); if (clinic) p.set('clinicId', clinic); if (q) p.set('q', q);
    api.get('/doctors?' + p).then(setList);
  }, [clinic, q]);
  return (
    <>
      <PageHead eyebrow="فريقنا الطبي" title="أطباء تثق بهم" />
      <section className="section container">
        <div className="filters">
          <select value={clinic} onChange={(e) => setSp(e.target.value ? { clinic: e.target.value } : {})}>
            <option value="">كل التخصصات</option>{clinics.map((c) => <option key={c.Id} value={c.Id}>{c.Name}</option>)}
          </select>
          <input placeholder="ابحث باسم الطبيب..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {!list ? <Loader /> : list.length === 0 ? <p className="muted">لا نتائج.</p> : <div className="grid">{list.map((d) => <DoctorCard key={d.Id} d={d} />)}</div>}
      </section>
    </>
  );
}

export function DoctorDetails() {
  const { id } = useParams(); const [d, setD] = useState(null); const [err, setErr] = useState('');
  useEffect(() => { api.get('/doctors/' + id).then(setD).catch((e) => setErr(e.message)); }, [id]);
  if (err) return <div className="container section"><p className="alert alert-err">{err}</p></div>;
  if (!d) return <Loader />;
  return (
    <>
      <PageHead eyebrow={d.ClinicName} title={d.FullName} sub={d.Title} />
      <section className="section container two-col">
        <div className="card">
          <div className="avatar lg">{d.FullName.replace('د. ', '')[0]}</div>
          <h3>نبذة</h3><p>{d.Bio}</p>
          <p className="small">الخبرة: {d.ExperienceYears} عامًا · سعر الكشف: {d.Fee} ج.م</p>
          <Link className="btn btn-primary" to={`/book?clinic=${d.ClinicId}&doctor=${d.Id}`}>احجز موعد</Link>
        </div>
        <div className="card">
          <h3>جدول الطبيب</h3>
          {d.schedule.length === 0 ? <p className="muted">لا يوجد جدول حالياً.</p> : (
            <table className="table"><thead><tr><th>اليوم</th><th>من</th><th>إلى</th></tr></thead>
              <tbody>{d.schedule.map((s) => <tr key={s.Id}><td>{DAYS[s.DayOfWeek]}</td><td>{fmtTime(s.StartTime)}</td><td>{fmtTime(s.EndTime)}</td></tr>)}</tbody></table>
          )}
        </div>
      </section>
    </>
  );
}
