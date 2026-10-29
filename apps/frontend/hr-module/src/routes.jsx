/* eslint-disable react-refresh/only-export-components -- This file intentionally combines lazy page components with the shared route registry. */
import { lazy } from "react";
import {
  BriefcaseBusiness,
  CalendarCheck,
  CalendarDays,
  CircleUserRound,
  CirclePlus,
  ClipboardCheck,
  Clock3,
  Cpu,
  Download,
  FileText,
  Folder,
  IdCard,
  IndianRupee,
  KeyRound,
  LayoutDashboard,
  Repeat,
  Scale,
  Settings,
  Shield,
  TriangleAlert,
  UserCheck,
  UserRound,
  Users,
} from "lucide-react";

import { Dashboard } from "./modules/dashboard";
import { UsersAccess } from "./modules/access";
import { EmployeeDirectory, EmployeeProfilePicker } from "./modules/directory";
import { EmployeeProfile } from "./modules/employeeProfile";
import { Departments, Designations } from "./modules/organization";
import {
  ApprovalDelegation,
  LeaveCarryForward,
  MyApprovals,
  PayrollPolicy,
} from "./modules/admin";

const AttendanceDashboard = lazy(() =>
  import("./modules/attendance").then((m) => ({ default: m.AttendanceDashboard })),
);
const AttendanceExceptions = lazy(() =>
  import("./modules/attendance").then((m) => ({ default: m.AttendanceExceptions })),
);
const AttendanceRegularization = lazy(() =>
  import("./modules/attendance").then((m) => ({ default: m.AttendanceRegularization })),
);
const BiometricDevices = lazy(() =>
  import("./modules/attendance").then((m) => ({ default: m.BiometricDevices })),
);
const DailyAttendance = lazy(() =>
  import("./modules/attendance").then((m) => ({ default: m.DailyAttendance })),
);
const EmployeeAttendance = lazy(() =>
  import("./modules/attendance").then((m) => ({ default: m.EmployeeAttendance })),
);
const MonthlyAttendance = lazy(() =>
  import("./modules/attendance").then((m) => ({ default: m.MonthlyAttendance })),
);
const Overtime = lazy(() =>
  import("./modules/attendance").then((m) => ({ default: m.Overtime })),
);
const RawPunches = lazy(() =>
  import("./modules/attendance").then((m) => ({ default: m.RawPunches })),
);
const RosterManagement = lazy(() =>
  import("./modules/attendance").then((m) => ({ default: m.RosterManagement })),
);
const ShiftManagement = lazy(() =>
  import("./modules/attendance").then((m) => ({ default: m.ShiftManagement })),
);

const HolidayCalendar = lazy(() =>
  import("./modules/leave").then((m) => ({ default: m.HolidayCalendar })),
);
const LeaveApprovals = lazy(() =>
  import("./modules/leave").then((m) => ({ default: m.LeaveApprovals })),
);
const LeaveBalance = lazy(() =>
  import("./modules/leave").then((m) => ({ default: m.LeaveBalance })),
);
const LeaveDashboard = lazy(() =>
  import("./modules/leave").then((m) => ({ default: m.LeaveDashboard })),
);
const LeaveRequests = lazy(() =>
  import("./modules/leave").then((m) => ({ default: m.LeaveRequests })),
);
const LeaveTypes = lazy(() =>
  import("./modules/leave").then((m) => ({ default: m.LeaveTypes })),
);

const EmployeeAdvances = lazy(() =>
  import("./modules/payroll").then((m) => ({ default: m.EmployeeAdvances })),
);
const PayrollProcessing = lazy(() =>
  import("./modules/payroll").then((m) => ({ default: m.PayrollProcessing })),
);
const Payslips = lazy(() =>
  import("./modules/payroll").then((m) => ({ default: m.Payslips })),
);
const SalaryStructure = lazy(() =>
  import("./modules/payroll").then((m) => ({ default: m.SalaryStructure })),
);
const StatutoryReport = lazy(() =>
  import("./modules/payroll").then((m) => ({ default: m.StatutoryReport })),
);

const renderModule = (Component) => (context) => (
  <Component {...context.moduleProps} />
);

export const routeSections = [
  {
    title: "Main",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, access: "all", render: renderModule(Dashboard) },
      {
        id: "my-profile",
        label: "My Profile",
        icon: CircleUserRound,
        access: "self",
        hidden: true,
        render: (ctx) => (
          <EmployeeProfile
            key={`own-${ctx.ownEmployeeId}`}
            companyId={ctx.companyId}
            employeeId={ctx.ownEmployeeId}
            ownEmployeeId={ctx.ownEmployeeId}
            employees={ctx.employees}
            onEmployeeUpdated={ctx.refreshCompanyRecords}
          />
        ),
      },
      { id: "my-approvals", label: "My Approvals", icon: ClipboardCheck, access: "approver", render: renderModule(MyApprovals) },
    ],
  },
  {
    title: "Employees",
    items: [
      {
        id: "departments",
        label: "Departments",
        icon: BriefcaseBusiness,
        access: "manager",
        render: (ctx) => (
          <Departments
            companyId={ctx.companyId}
            canWrite={ctx.canWrite}
            departments={ctx.departments}
            setDepartments={ctx.setDepartments}
            refresh={ctx.refreshCompanyRecords}
            onError={ctx.setNotice}
          />
        ),
      },
      {
        id: "employee-directory",
        label: "Employee Directory",
        icon: Users,
        access: "all",
        render: (ctx) => (
          <EmployeeDirectory
            companyId={ctx.companyId}
            canWrite={ctx.canWrite}
            employees={ctx.employees}
            setEmployees={ctx.setEmployees}
            departments={ctx.departments}
            designations={ctx.designations}
            members={ctx.members}
            refresh={ctx.refreshCompanyRecords}
            onOpenProfile={ctx.openEmployeeProfile}
            onError={ctx.setNotice}
            onSuccess={ctx.setSuccessNotice}
          />
        ),
      },
      {
        id: "designations",
        label: "Designations",
        icon: UserRound,
        access: "manager",
        render: (ctx) => (
          <Designations
            companyId={ctx.companyId}
            canWrite={ctx.canWrite}
            designations={ctx.designations}
            setDesignations={ctx.setDesignations}
            departments={ctx.departments}
            refresh={ctx.refreshCompanyRecords}
            onError={ctx.setNotice}
          />
        ),
      },
      {
        id: "employee-profile",
        label: "Employee Profile",
        icon: IdCard,
        access: "all",
        hidden: true,
        render: (ctx) =>
          ctx.selectedEmployee ? (
            <EmployeeProfile
              key={ctx.selectedEmployee.id}
              companyId={ctx.companyId}
              employeeId={ctx.selectedEmployee.id}
              ownEmployeeId={ctx.ownEmployeeId}
              employees={ctx.employees}
              onBack={() => ctx.navigate("employee-directory")}
              onEmployeeUpdated={ctx.refreshCompanyRecords}
            />
          ) : (
            <EmployeeProfilePicker
              employees={ctx.employees}
              ownEmployeeId={ctx.ownEmployeeId}
              onOpenProfile={ctx.openEmployeeProfile}
              onOpenOwnProfile={() => ctx.navigate("my-profile")}
            />
          ),
      },
    ],
  },
  {
    title: "Attendance",
    items: [
      { id: "attendance-dashboard", label: "Attendance Dashboard", icon: Clock3, access: "manager", render: renderModule(AttendanceDashboard) },
      { id: "daily-attendance", label: "Daily Attendance", icon: CalendarDays, access: "manager", render: renderModule(DailyAttendance) },
      { id: "monthly-attendance", label: "Monthly Attendance", icon: CalendarCheck, access: "manager", render: renderModule(MonthlyAttendance) },
      { id: "biometric-devices", label: "Biometric Devices", icon: Cpu, access: "manager", render: renderModule(BiometricDevices) },
      { id: "attendance-exceptions", label: "Attendance Exceptions", icon: TriangleAlert, access: "manager", render: renderModule(AttendanceExceptions) },
      { id: "employee-attendance", label: "Employee Attendance", icon: Users, access: "all", render: renderModule(EmployeeAttendance) },
      { id: "raw-punches", label: "Raw Punches", icon: Clock3, access: "manager", render: renderModule(RawPunches) },
      { id: "attendance-regularization", label: "Attendance Regularization", icon: CalendarCheck, access: "all", render: renderModule(AttendanceRegularization) },
      { id: "shift-management", label: "Shift Management", icon: Settings, access: "manager", render: renderModule(ShiftManagement) },
      { id: "roster-management", label: "Roster Management", icon: CalendarDays, access: "manager", render: renderModule(RosterManagement) },
      { id: "overtime", label: "Overtime", icon: Clock3, access: "manager", render: renderModule(Overtime) },
    ],
  },
  {
    title: "Leave",
    items: [
      { id: "leave-dashboard", label: "Leave Dashboard", icon: Clock3, access: "all", render: renderModule(LeaveDashboard) },
      { id: "leave-types", label: "Leave Types", icon: FileText, access: "manager", render: renderModule(LeaveTypes) },
      { id: "leave-requests", label: "Leave Requests", icon: Clock3, access: "all", render: renderModule(LeaveRequests) },
      { id: "leave-approvals", label: "Leave Approvals", icon: CalendarCheck, access: "manager", render: renderModule(LeaveApprovals) },
      { id: "leave-balance", label: "Leave Balance", icon: CalendarDays, access: "all", render: renderModule(LeaveBalance) },
      { id: "holiday-calendar", label: "Holiday Calendar", icon: CalendarDays, access: "all", render: renderModule(HolidayCalendar) },
      { id: "leave-carry-forward", label: "Leave Carry Forward", icon: Repeat, access: "admin", render: renderModule(LeaveCarryForward) },
    ],
  },
  {
    title: "Payroll",
    items: [
      { id: "salary-structure", label: "Salary Structure", icon: FileText, access: "manager", render: renderModule(SalaryStructure) },
      { id: "payroll-processing", label: "Payroll Processing", icon: Settings, access: "manager", render: renderModule(PayrollProcessing) },
      { id: "payslips", label: "Payslips", icon: Download, access: "all", render: renderModule(Payslips) },
      { id: "employee-advances", label: "Employee Advances", icon: IndianRupee, access: "all", render: renderModule(EmployeeAdvances) },
      { id: "payroll-policy", label: "Payroll Policy", icon: Scale, access: "manager", render: renderModule(PayrollPolicy) },
    ],
  },
  {
    title: "Statutory & Reports",
    items: [
      { id: "pf", label: "PF", icon: Shield, access: "manager", render: (ctx) => <StatutoryReport {...ctx.moduleProps} kind="PF" /> },
      { id: "esic", label: "ESIC", icon: CirclePlus, access: "manager", render: (ctx) => <StatutoryReport {...ctx.moduleProps} kind="ESIC" /> },
      { id: "statutory-reports", label: "Statutory Reports", icon: Folder, access: "manager", render: renderModule(StatutoryReport) },
    ],
  },
  {
    title: "Settings",
    items: [
      { id: "users-access", label: "Users & Access", icon: KeyRound, access: "manager", render: renderModule(UsersAccess) },
      { id: "approval-delegation", label: "Approval Delegation", icon: UserCheck, access: "admin", render: renderModule(ApprovalDelegation) },
    ],
  },
];

export const routeItems = routeSections.flatMap((section) =>
  section.items.map((item) => ({ ...item, section: section.title })),
);

export function findRoute(identifier) {
  return routeItems.find(
    (item) => item.id === identifier || item.label === identifier,
  );
}