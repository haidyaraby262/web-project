import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import Icon from '../Icon.jsx';
import { PageHead, ErrorBox, OkBox, Loader, StatusBadge, fmtDay, fmtTime } from '../components.jsx';

const ymd = (d) => d.toLocaleDateString('sv');

export function Book() {
  const [sp] = useSearchParams();
  const [clinics, setClinics] = useState([]); const [doctors, setDoctors] = useState([]); const [slots, setSlots] = useState([]);
  const [clinicId, setClinicId] = useState(sp.get('clinic') || ''); const [doctorId, setDoctorId] = useState(sp.get('doctor') || '');
  const [date, setDate] = useState(''); const [slotId, setSlotId] = useState(null); const [notes, setNotes] = useState('');
  const [err, setErr] = useState(''); const [done, setDone] = useState(null); const [busy, setBusy] = useState(false);

  useEffect(() => { api.get('/clinics').then(setClinics); }, []);
  useEffect(() => {
    setDoctors([]);
    if (clinicId) api.get('/doctors?clinicId=' + clinicId).then(setDoctors);
  }, [clinicId]);
  const loadSlots = () => { if (doctorId && date) api.get(`/doctors/${doctorId}/slots?date=${date}`).then(setSlots).catch((e) => setErr(e.message)); };
  useEffect(() => { setSlotId(null); setSlots([]); loadSlots(); }, [doctorId, date]); // eslint-disable-line

  const days = Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return ymd(d); });
  const submit = async () => {
    setErr(''); setBusy(true);
    try { setDone(await api.post('/appointments', { clinicId, doctorId, slotId, notes })); }
    catch (x) { setErr(x.message); loadSlots(); setSlotId(null); }
    setBusy(false);
  };

  if (done) return (
    <section className="section container narrow"><div className="card done">
      <div className="ico"><Icon name="check" size={30} /></div><h2>تم إرسال طلب الحجز</h2>
      <p>{done.DoctorName} · {done.ClinicName}</p><p>{fmtDay(done.SlotDate)} الساعة {fmtTime(done.SlotTime)}</p>
      <p className="muted">طلبك الآن <StatusBadge s={done.Status} />، وسيصلك إشعار عند موافقة المركز.</p>
      <Link to="/my-appointments" className="btn btn-primary">متابعة حجوزاتي</Link>
    </div></section>
  );

  return (
    <>
      <PageHead eyebrow="حجز موعد" title="احجز موعدك في أربع خطوات" />
      <section className="section container narrow">
        <div className="card form">
          <ErrorBox msg={err} />
          <h4>1. اختر العيادة</h4>
          <select value={clinicId} onChange={(e) => { setClinicId(e.target.value); setDoctorId(''); }}>
            <option value="">— اختر —</option>{clinics.map((c) => <option key={c.Id} value={c.Id}>{c.Name}</option>)}
          </select>
          {clinicId && <><h4>2. اختر الطبيب</h4>
            <div className="choices">{doctors.map((d) => (
              <button type="button" key={d.Id} className={'choice' + (String(d.Id) === String(doctorId) ? ' on' : '')} onClick={() => setDoctorId(String(d.Id))}>
                <b>{d.FullName}</b><small>{d.Title} · {d.Fee} ج.م</small></button>))}</div></>}
          {doctorId && <><h4>3. اختر التاريخ</h4>
            <div className="choices days">{days.map((d) => (
              <button type="button" key={d} className={'choice' + (d === date ? ' on' : '')} onClick={() => setDate(d)}><b>{fmtDay(d)}</b></button>))}</div></>}
          {doctorId && date && <><h4>4. اختر الوقت المتاح</h4>
            {slots.length === 0 ? <p className="muted">لا توجد مواعيد في هذا اليوم، جرّب يوم آخر.</p> :
              <div className="choices times">{slots.map((s) => (
                <button type="button" key={s.Id} disabled={!!s.IsBooked} className={'choice' + (s.Id === slotId ? ' on' : '')} onClick={() => setSlotId(s.Id)}>{fmtTime(s.SlotTime)}</button>))}</div>}</>}
          {slotId && <>
            <label>ملاحظات للطبيب (اختياري)<textarea rows="3" value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
            <button className="btn btn-primary btn-lg" disabled={busy} onClick={submit}>إنشاء الحجز</button></>}
        </div>
      </section>
    </>
  );
}

export function MyAppointments() {
  const [list, setList] = useState(null); const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  const load = () => api.get('/appointments/mine').then(setList);
  useEffect(() => { load(); }, []);
  const cancel = async (id) => {
    if (!confirm('هل تريد إلغاء هذا الحجز؟')) return;
    try { await api.put(`/appointments/${id}/cancel`); setOk('تم إلغاء الحجز'); load(); } catch (x) { setErr(x.message); }
  };
  if (!list) return <Loader />;
  return (
    <>
      <PageHead title="حجوزاتي" sub="متابعة حالة طلبات الحجز" />
      <section className="section container narrow">
        <ErrorBox msg={err} /><OkBox msg={ok} />
        {list.length === 0 && <p className="muted">لا توجد حجوزات بعد. <Link to="/book">احجز الآن</Link></p>}
        {list.map((a) => (
          <div className="card appt" key={a.Id}>
            <div><h3>{a.DoctorName}</h3><p className="muted">{a.ClinicName}</p><p>{fmtDay(a.SlotDate)} · {fmtTime(a.SlotTime)}</p>
              {a.AdminNote && <p className="small">ملاحظة المركز: {a.AdminNote}</p>}</div>
            <div className="side"><StatusBadge s={a.Status} />
              {['Pending', 'Approved'].includes(a.Status) && <button className="btn btn-ghost" onClick={() => cancel(a.Id)}>إلغاء</button>}</div>
          </div>
        ))}
      </section>
    </>
  );
}
