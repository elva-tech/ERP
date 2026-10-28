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
import { canManage, isAdmin } from "./modules/helpers";

// access: all members | manager (company_admin, hr_manager) | admin (company_admin)
// | self (login linked to an employee) | approver (manager or approval delegate).
// The sidebar only hides pages; every API enforces the same rules server-side.
// hidden: routable (profile links, employee search, account menu) but not listed in the sidebar.
export const menuSections = [
  {
    title: "Main",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, access: "all" },
      { label: "My Profile", icon: CircleUserRound, access: "self", hidden: true },
      { label: "My Approvals", icon: ClipboardCheck, access: "approver" },
    ],
  },
  {
    title: "Employees",
    items: [
      { label: "Departments", icon: BriefcaseBusiness, access: "manager" },
      { label: "Employee Directory", icon: Users, access: "all" },
      { label: "Designations", icon: UserRound, access: "manager" },
      { label: "Employee Profile", icon: IdCard, access: "all", hidden: true },
    ],
  },
  {
    title: "Attendance",
    items: [
      { label: "Attendance Dashboard", icon: Clock3, access: "manager" },
      { label: "Daily Attendance", icon: CalendarDays, access: "manager" },
      { label: "Monthly Attendance", icon: CalendarCheck, access: "manager" },
      { label: "Biometric Devices", icon: Cpu, access: "manager" },
      { label: "Attendance Exceptions", icon: TriangleAlert, access: "manager" },
      { label: "Employee Attendance", icon: Users, access: "all" },
      { label: "Raw Punches", icon: Clock3, access: "manager" },
      { label: "Attendance Regularization", icon: CalendarCheck, access: "all" },
      { label: "Shift Management", icon: Settings, access: "manager" },
      { label: "Roster Management", icon: CalendarDays, access: "manager" },
      { label: "Overtime", icon: Clock3, access: "manager" },
    ],
  },
  {
    title: "Leave",
    items: [
      { label: "Leave Dashboard", icon: Clock3, access: "all" },
      { label: "Leave Types", icon: FileText, access: "manager" },
      { label: "Leave Requests", icon: Clock3, access: "all" },
      { label: "Leave Approvals", icon: CalendarCheck, access: "manager" },
      { label: "Leave Balance", icon: CalendarDays, access: "all" },
      { label: "Holiday Calendar", icon: CalendarDays, access: "all" },
      { label: "Leave Carry Forward", icon: Repeat, access: "admin" },
    ],
  },
  {
    title: "Payroll",
    items: [
      { label: "Salary Structure", icon: FileText, access: "manager" },
      { label: "Payroll Processing", icon: Settings, access: "manager" },
      { label: "Payslips", icon: Download, access: "all" },
      { label: "Employee Advances", icon: IndianRupee, access: "all" },
      { label: "Payroll Policy", icon: Scale, access: "manager" },
    ],
  },
  {
    title: "Statutory & Reports",
    items: [
      { label: "PF", icon: Shield, access: "manager" },
      { label: "ESIC", icon: CirclePlus, access: "manager" },
      { label: "Statutory Reports", icon: Folder, access: "manager" },
    ],
  },
  {
    title: "Settings",
    items: [
      { label: "Users & Access", icon: KeyRound, access: "manager" },
      { label: "Approval Delegation", icon: UserCheck, access: "admin" },
    ],
  },
];

export function canAccess(access, { role, ownEmployeeId, isApprovalDelegate }) {
  if (access === "all") return true;
  if (access === "manager") return canManage(role);
  if (access === "admin") return isAdmin(role);
  if (access === "self") return Boolean(ownEmployeeId);
  if (access === "approver") return canManage(role) || isApprovalDelegate;
  return false;
}

/** Sections and items the member may open (including hidden ones), in menu order. */
export function accessibleSectionsFor(context) {
  return menuSections
    .map((section) => ({ ...section, items: section.items.filter((item) => canAccess(item.access, context)) }))
    .filter((section) => section.items.length > 0);
}

/** What the sidebar and page search list: accessible items that are not hidden. */
export function visibleSectionsFor(context) {
  return accessibleSectionsFor(context)
    .map((section) => ({ ...section, items: section.items.filter((item) => !item.hidden) }))
    .filter((section) => section.items.length > 0);
}
