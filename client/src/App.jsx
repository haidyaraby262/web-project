import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Navbar, Footer, Protected } from './components.jsx';
import Home from './pages/Home.jsx';
import { About, Contact } from './pages/Static.jsx';
import { Login, Register, Forgot, Reset } from './pages/AuthPages.jsx';
import { Profile, Notifications } from './pages/Profile.jsx';
import { Clinics, Doctors, DoctorDetails } from './pages/Directory.jsx';
import { Book, MyAppointments } from './pages/Booking.jsx';
import AdminLayout from './admin/AdminLayout.jsx';

export default function App() {
  return (
    <>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/clinics" element={<Clinics />} />
          <Route path="/doctors" element={<Doctors />} />
          <Route path="/doctors/:id" element={<DoctorDetails />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<Forgot />} />
          <Route path="/reset-password" element={<Reset />} />
          <Route path="/profile" element={<Protected><Profile /></Protected>} />
          <Route path="/notifications" element={<Protected><Notifications /></Protected>} />
          <Route path="/book" element={<Protected><Book /></Protected>} />
          <Route path="/my-appointments" element={<Protected><MyAppointments /></Protected>} />
          <Route path="/admin/*" element={<Protected admin><AdminLayout /></Protected>} />
          <Route path="*" element={<div className="container section"><h2>الصفحة غير موجودة</h2></div>} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
