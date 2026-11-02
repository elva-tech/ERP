# ELVA TECH HR & Payroll ERP — Frontend

React 19 + Vite + Tailwind UI for the ELVA TECH HRMS.

```powershell
npm install
npm run dev      # http://localhost:5173
npm run lint
npm run build
```

The API address comes from `VITE_API_BASE_URL` (see `.env.example`;
defaults to `http://localhost:3000`). The backend must list this app's origin in
`ALLOWED_ORIGINS` in production.

The sidebar is filtered by role. Company admins see every page, including
Payroll Policy (approve), Leave Carry Forward and Approval Delegation. HR
managers see the operational pages; Payroll Policy is read-only for them.
Employees see My Profile, the directory and their own attendance, leave,
payslips and advances. **My Approvals** appears for admins, HR managers and
approval delegates. My Profile appears when the login is linked to an employee. The
backend enforces the same rules; hiding a page is not the security boundary.

The employee profile (Employee Directory → an employee, or My Profile) has
Personal Info, Employment, Documents, Salary, Attendance and Leave tabs, all
loaded from the backend. Colleagues see directory fields only.

Full setup, database and test instructions:
[`../../backend/hr-module/README.md`](../../backend/hr-module/README.md).
