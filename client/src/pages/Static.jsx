import React, { useState } from 'react';
import { api } from '../api.js';
import Icon from '../Icon.jsx';
import { PageHead, ErrorBox, OkBox } from '../components.jsx';

export function About() {
  return (
    <>
      <PageHead eyebrow="عن مركز دَوْر" title="رعاية طبية تدور حول احتياجاتك" sub="مركز طبي خاص متكامل يجمع تخصصات متعددة تحت سقف واحد." />
      <section className="section container">
        <div className="grid">
          {[['خبرات موثوقة', 'فريق طبي مختار بعناية وخبرة ممتدة.'], ['تخصصات متكاملة', 'عيادات متعددة داخل مركز واحد.'], ['حجز أكثر سهولة', 'اختر الموعد المناسب واطلب حجزك.'], ['اهتمام إنساني', 'رعاية تضع المريض في قلب كل قرار.']].map(([t, s]) => (
            <div className="card" key={t}><h3>{t}</h3><p className="muted">{s}</p></div>
          ))}
        </div>
        <div className="stats dark">
          <div><b>15+</b><span>عامًا من الرعاية</span></div><div><b>+25</b><span>طبيب متخصص</span></div><div><b>+12</b><span>عيادة طبية</span></div>
        </div>
      </section>
    </>
  );
}

export function Contact() {
  const [f, setF] = useState({ name: '', email: '', message: '' });
  const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setOk('');
    try { const r = await api.post('/contact', f); setOk(r.message); setF({ name: '', email: '', message: '' }); }
    catch (x) { setErr(x.message); }
  };
  return (
    <>
      <PageHead eyebrow="تواصل معنا" title="يسعدنا سماعك" sub="أرسل لنا رسالتك وسنرد في أقرب وقت." />
      <section className="section container two-col">
        <div className="card info">
          <h3>بيانات التواصل</h3>
          <p className="ic"><Icon name="phone" /> 0100 000 0000</p><p className="ic"><Icon name="mail" /> info@dawr.com</p><p className="ic"><Icon name="pin" /> المنصورة، مصر</p><p className="ic"><Icon name="clock" /> يوميًا من 10 ص إلى 10 م</p>
        </div>
        <form className="card form" onSubmit={submit}>
          <ErrorBox msg={err} /><OkBox msg={ok} />
          <label>الاسم<input value={f.name} onChange={set('name')} required /></label>
          <label>البريد الإلكتروني<input type="email" value={f.email} onChange={set('email')} required /></label>
          <label>رسالتك<textarea rows="5" value={f.message} onChange={set('message')} required /></label>
          <button className="btn btn-primary">إرسال</button>
        </form>
      </section>
    </>
  );
}
