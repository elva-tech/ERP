/**
 * Permission code constants. Keep in sync with
 * apps/backend/hr-module/lib/hrms-permission-catalog.js
 */
export const HR = {
  main: { dashboard: { view: "hr.main.dashboard.view" } },
  approvals: {
    my: { view: "hr.approvals.my.view", approve: "hr.approvals.my.approve" },
  },
  profile: { self: { view: "hr.profile.self.view" } },
  employees: {
    directory: {
      view: "hr.employees.directory.view",
      create: "hr.employees.directory.create",
      edit: "hr.employees.directory.edit",
      export: "hr.employees.directory.export",
    },
  },
  organization: {
    departments: {
      view: "hr.organization.departments.view",
      manage: "hr.organization.departments.manage",
    },
    designations: {
      view: "hr.organization.designations.view",
      manage: "hr.organization.designations.manage",
    },
  },
  attendance: {
    dashboard: { view: "hr.attendance.dashboard.view" },
    daily: {
      view: "hr.attendance.daily.view",
      manage: "hr.attendance.daily.manage",
    },
    monthly: {
      view: "hr.attendance.monthly.view",
      manage: "hr.attendance.monthly.manage",
    },
    devices: {
      view: "hr.attendance.devices.view",
      manage: "hr.attendance.devices.manage",
    },
    exceptions: {
      view: "hr.attendance.exceptions.view",
      manage: "hr.attendance.exceptions.manage",
    },
    employee: { view: "hr.attendance.employee.view" },
    punches: { view: "hr.attendance.punches.view" },
    regularization: {
      view: "hr.attendance.regularization.view",
      create: "hr.attendance.regularization.create",
    },
    shifts: {
      view: "hr.attendance.shifts.view",
      manage: "hr.attendance.shifts.manage",
    },
    roster: {
      view: "hr.attendance.roster.view",
      manage: "hr.attendance.roster.manage",
    },
    overtime: {
      view: "hr.attendance.overtime.view",
      manage: "hr.attendance.overtime.manage",
    },
  },
  leave: {
    dashboard: { view: "hr.leave.dashboard.view" },
    types: { view: "hr.leave.types.view", manage: "hr.leave.types.manage" },
    requests: {
      view: "hr.leave.requests.view",
      create: "hr.leave.requests.create",
    },
    approvals: {
      view: "hr.leave.approvals.view",
      approve: "hr.leave.approvals.approve",
    },
    balance: { view: "hr.leave.balance.view" },
    holidays: { view: "hr.leave.holidays.view" },
    carryForward: {
      view: "hr.leave.carry_forward.view",
      manage: "hr.leave.carry_forward.manage",
    },
  },
  payroll: {
    salaryStructure: {
      view: "hr.payroll.salary_structure.view",
      manage: "hr.payroll.salary_structure.manage",
    },
    processing: {
      view: "hr.payroll.processing.view",
      manage: "hr.payroll.processing.manage",
      finalize: "hr.payroll.processing.finalize",
      cancel: "hr.payroll.processing.cancel",
    },
    payslips: {
      view: "hr.payroll.payslips.view",
      export: "hr.payroll.payslips.export",
    },
    advances: {
      view: "hr.payroll.advances.view",
      create: "hr.payroll.advances.create",
    },
    policy: {
      view: "hr.payroll.policy.view",
      manage: "hr.payroll.policy.manage",
    },
  },
  statutory: {
    pf: { view: "hr.statutory.pf.view", export: "hr.statutory.pf.export" },
    esic: { view: "hr.statutory.esic.view", export: "hr.statutory.esic.export" },
    reports: {
      view: "hr.statutory.reports.view",
      export: "hr.statutory.reports.export",
    },
  },
  settings: {
    users: { view: "hr.settings.users.view", manage: "hr.settings.users.manage" },
    delegation: {
      view: "hr.settings.delegation.view",
      manage: "hr.settings.delegation.manage",
    },
  },
};

export const ROUTE_VIEW_PERMISSION = {
  dashboard: HR.main.dashboard.view,
  "my-profile": HR.profile.self.view,
  "my-approvals": HR.approvals.my.view,
  departments: HR.organization.departments.view,
  "employee-directory": HR.employees.directory.view,
  designations: HR.organization.designations.view,
  "employee-profile": HR.employees.directory.view,
  "attendance-dashboard": HR.attendance.dashboard.view,
  "daily-attendance": HR.attendance.daily.view,
  "monthly-attendance": HR.attendance.monthly.view,
  "biometric-devices": HR.attendance.devices.view,
  "attendance-exceptions": HR.attendance.exceptions.view,
  "employee-attendance": HR.attendance.employee.view,
  "raw-punches": HR.attendance.punches.view,
  "attendance-regularization": HR.attendance.regularization.view,
  "shift-management": HR.attendance.shifts.view,
  "roster-management": HR.attendance.roster.view,
  overtime: HR.attendance.overtime.view,
  "leave-dashboard": HR.leave.dashboard.view,
  "leave-types": HR.leave.types.view,
  "leave-requests": HR.leave.requests.view,
  "leave-approvals": HR.leave.approvals.view,
  "leave-balance": HR.leave.balance.view,
  "holiday-calendar": HR.leave.holidays.view,
  "leave-carry-forward": HR.leave.carryForward.view,
  "salary-structure": HR.payroll.salaryStructure.view,
  "payroll-processing": HR.payroll.processing.view,
  payslips: HR.payroll.payslips.view,
  "employee-advances": HR.payroll.advances.view,
  "payroll-policy": HR.payroll.policy.view,
  pf: HR.statutory.pf.view,
  esic: HR.statutory.esic.view,
  "statutory-reports": HR.statutory.reports.view,
  "users-access": HR.settings.users.view,
  "approval-delegation": HR.settings.delegation.view,
};

/** @deprecated use HR.* */
export const RESOURCE_MUTATE_PERMISSION = {
  departments: HR.organization.departments.manage,
  designations: HR.organization.designations.manage,
  employees: HR.employees.directory.edit,
  employeesCreate: HR.employees.directory.create,
  leaveTypes: HR.leave.types.manage,
  payrollProcessing: HR.payroll.processing.manage,
  users: HR.settings.users.manage,
};