# مركز أركان الطبي - Arkan Medical Center (React + Express + SQLite)

Full stack project: Arabic RTL React UI (Vite) + Node/Express REST API with JWT login + SQLite database.

## Requirements
Node.js 22.13 or newer (the database uses Node's built-in node:sqlite). Node 18/20 will NOT work.
Check with:  node -v

## Run on Windows (first time)
Open the arkan folder in VS Code (File > Open Folder), open a terminal in it, then run each command:
1. npm run setup      (installs packages, creates and seeds the database)
2. npm start          (builds the React app and starts the server)
3. Open http://localhost:5000 in the browser.
Next times only: npm start. If Windows asks about the firewall, press Cancel.
If npm is not recognized, reopen VS Code after installing Node.

## Roles and demo accounts
Admin: admin@arkan.com   Patient: patient@arkan.com   (demo passwords are in server/seed.js, line 47)
- Patient: register/login, browse clinics and doctors, book appointments, notifications, profile.
- Admin: after login use "لوحة التحكم": stats, bookings (approve/reject), patients, doctors, clinics, schedules, reports, notifications, logs.
To reset the data: stop the server, delete server/arkan.db, run: npm --prefix server run seed

## Where the code is
- client/src/pages: Home, Static, Directory (clinics/doctors), Booking, AuthPages, Profile
- client/src/admin/AdminLayout.jsx: all admin screens
- client/src/App.jsx: routes
- server/index.js: all API endpoints; auth.js (JWT); db.js (9 tables); seed.js (demo data)

## Limitations
- Demo project run locally; not deployed to a public host.
- Forgot password is demo only: no email is sent, the reset link is shown on the page.
- Set JWT_SECRET in the environment for any real use.
- npm may show audit warnings about the Vite dev server; they do not affect npm start. Do not run npm audit fix --force.
