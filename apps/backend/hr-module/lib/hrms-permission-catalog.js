/**
 * HRMS permission codes and route/view mappings.
 *
 * This catalog is the interim source of truth until ELVA IAM supplies
 * application permissions per tenant. Role templates below mirror current
 * company membership roles; they must not be duplicated in UI code.
 *
 * Permission code shape: hr.<area>.<resource>.<action>
 * Actions: view | create | edit | delete | approve | export | manage
 */

export const HRMS_APPLICATION = "hrms";

/** @type {readonly string[]} */
export const ALL_PERMISSION_CODES = [
  "hr.main.dashboard.view",
  "hr.approvals.my.view",
  "hr.approvals.my.approve",
  "hr.profile.self.view",
  "hr.employees.directory.view",
  "hr.employees.directory.create",
  "hr.employees.directory.edit",
  "hr.employees.directory.export",
  "hr.organization.departments.view",
  "hr.organization.departments.manage",
  "hr.organization.designations.view",
  "hr.organization.designations.manage",
  "hr.attendance.dashboard.view",
  "hr.attendance.daily.view",
  "hr.attendance.daily.manage",
  "hr.attendance.monthly.view",
  "hr.attendance.monthly.manage",
  "hr.attendance.devices.view",
  "hr.attendance.devices.manage",
  "hr.attendance.exceptions.view",
  "hr.attendance.exceptions.manage",
  "hr.attendance.employee.view",
  "hr.attendance.punches.view",
  "hr.attendance.regularization.view",
  "hr.attendance.regularization.create",
  "hr.attendance.shifts.view",
  "hr.attendance.shifts.manage",
  "hr.attendance.roster.view",
  "hr.attendance.roster.manage",
  "hr.attendance.overtime.view",
  "hr.attendance.overtime.manage",
  "hr.leave.dashboard.view",
  "hr.leave.types.view",
  "hr.leave.types.manage",
  "hr.leave.requests.view",
  "hr.leave.requests.create",
  "hr.leave.approvals.view",
  "hr.leave.approvals.approve",
  "hr.leave.balance.view",
  "hr.leave.holidays.view",
  "hr.leave.carry_forward.view",
  "hr.leave.carry_forward.manage",
  "hr.payroll.salary_structure.view",
  "hr.payroll.salary_structure.manage",
  "hr.payroll.processing.view",
  "hr.payroll.processing.manage",
  "hr.payroll.processing.finalize",
  "hr.payroll.processing.cancel",
  "hr.payroll.payslips.view",
  "hr.payroll.payslips.export",
  "hr.payroll.advances.view",
  "hr.payroll.advances.create",
  "hr.payroll.policy.view",
  "hr.payroll.policy.manage",
  "hr.statutory.pf.view",
  "hr.statutory.pf.export",
  "hr.statutory.esic.view",
  "hr.statutory.esic.export",
  "hr.statutory.reports.view",
  "hr.statutory.reports.export",
  "hr.settings.users.view",
  "hr.settings.users.manage",
  "hr.settings.delegation.view",
  "hr.settings.delegation.manage",
];

/** Stable route ids (hash navigation) → view permission. */
export const ROUTE_VIEW_PERMISSION = {
  dashboard: "hr.main.dashboard.view",
  "my-profile": "hr.profile.self.view",
  "my-approvals": "hr.approvals.my.view",
  departments: "hr.organization.departments.view",
  "employee-directory": "hr.employees.directory.view",
  designations: "hr.organization.designations.view",
  "employee-profile": "hr.employees.directory.view",
  "attendance-dashboard": "hr.attendance.dashboard.view",
  "daily-attendance": "hr.attendance.daily.view",
  "monthly-attendance": "hr.attendance.monthly.view",
  "biometric-devices": "hr.attendance.devices.view",
  "attendance-exceptions": "hr.attendance.exceptions.view",
  "employee-attendance": "hr.attendance.employee.view",
  "raw-punches": "hr.attendance.punches.view",
  "attendance-regularization": "hr.attendance.regularization.view",
  "shift-management": "hr.attendance.shifts.view",
  "roster-management": "hr.attendance.roster.view",
  overtime: "hr.attendance.overtime.view",
  "leave-dashboard": "hr.leave.dashboard.view",
  "leave-types": "hr.leave.types.view",
  "leave-requests": "hr.leave.requests.view",
  "leave-approvals": "hr.leave.approvals.view",
  "leave-balance": "hr.leave.balance.view",
  "holiday-calendar": "hr.leave.holidays.view",
  "leave-carry-forward": "hr.leave.carry_forward.view",
  "salary-structure": "hr.payroll.salary_structure.view",
  "payroll-processing": "hr.payroll.processing.view",
  payslips: "hr.payroll.payslips.view",
  "employee-advances": "hr.payroll.advances.view",
  "payroll-policy": "hr.payroll.policy.view",
  pf: "hr.statutory.pf.view",
  esic: "hr.statutory.esic.view",
  "statutory-reports": "hr.statutory.reports.view",
  "users-access": "hr.settings.users.view",
  "approval-delegation": "hr.settings.delegation.view",
};

/**
 * TL role division v1.0 (menu + actions):
 * - HR ADMIN → membership.role `company_admin` (full catalog)
 * - HR → `hr_manager` (operational HR; no admin-only configuration menus)
 * - EMPLOYEE → `employee` (self-service only)
 */
/** Day-to-day HR (TL §2). Explicit grants can add payslips/statutory/delegation/advances later via IAM. */
const HR_MANAGER_PERMISSIONS = [
  "hr.main.dashboard.view",
  "hr.profile.self.view",
  "hr.approvals.my.view",
  "hr.approvals.my.approve",
  "hr.organization.departments.view",
  "hr.organization.designations.view",
  "hr.employees.directory.view",
  "hr.employees.directory.create",
  "hr.employees.directory.edit",
  "hr.employees.directory.export",
  "hr.attendance.dashboard.view",
  "hr.attendance.daily.view",
  "hr.attendance.daily.manage",
  "hr.attendance.monthly.view",
  "hr.attendance.monthly.manage",
  "hr.attendance.exceptions.view",
  "hr.attendance.exceptions.manage",
  "hr.attendance.employee.view",
  "hr.attendance.regularization.view",
  "hr.attendance.regularization.create",
  "hr.attendance.overtime.view",
  "hr.attendance.overtime.manage",
  "hr.leave.dashboard.view",
  "hr.leave.requests.view",
  "hr.leave.requests.create",
  "hr.leave.approvals.view",
  "hr.leave.approvals.approve",
  "hr.leave.balance.view",
  "hr.leave.holidays.view",
  "hr.payroll.payslips.view",
  "hr.payroll.payslips.export",
  "hr.statutory.reports.view",
];

const EMPLOYEE_PERMISSIONS = [
  "hr.main.dashboard.view",
  "hr.profile.self.view",
  "hr.attendance.employee.view",
  "hr.attendance.regularization.view",
  "hr.attendance.regularization.create",
  "hr.leave.dashboard.view",
  "hr.leave.requests.view",
  "hr.leave.requests.create",
  "hr.leave.balance.view",
  "hr.leave.holidays.view",
  "hr.payroll.payslips.view",
  "hr.payroll.payslips.export",
];

/** Payroll-focused role template (IAM-ready; assigned when membership.role supports it). */
const PAYROLL_EXECUTIVE_PERMISSIONS = [
  "hr.main.dashboard.view",
  "hr.profile.self.view",
  "hr.employees.directory.view",
  "hr.employees.directory.export",
  "hr.payroll.salary_structure.view",
  "hr.payroll.salary_structure.manage",
  "hr.payroll.processing.view",
  "hr.payroll.processing.manage",
  "hr.payroll.payslips.view",
  "hr.payroll.payslips.export",
  "hr.payroll.advances.view",
  "hr.payroll.policy.view",
  "hr.payroll.policy.manage",
  "hr.statutory.pf.view",
  "hr.statutory.pf.export",
  "hr.statutory.esic.view",
  "hr.statutory.esic.export",
  "hr.statutory.reports.view",
  "hr.statutory.reports.export",
];

/** Recruitment-focused role template (IAM-ready). */
const RECRUITER_PERMISSIONS = [
  "hr.main.dashboard.view",
  "hr.profile.self.view",
  "hr.employees.directory.view",
  "hr.employees.directory.create",
  "hr.employees.directory.edit",
  "hr.employees.directory.export",
  "hr.organization.departments.view",
  "hr.organization.designations.view",
];

const ROLE_TEMPLATE_PERMISSIONS = {
  company_admin: ALL_PERMISSION_CODES,
  hr_manager: HR_MANAGER_PERMISSIONS,
  employee: EMPLOYEE_PERMISSIONS,
  payroll_executive: PAYROLL_EXECUTIVE_PERMISSIONS,
  hr_payroll_executive: PAYROLL_EXECUTIVE_PERMISSIONS,
  recruiter: RECRUITER_PERMISSIONS,
  hr_recruiter: RECRUITER_PERMISSIONS,
};

const DELEGATE_PERMISSIONS = [
  "hr.approvals.my.view",
  "hr.approvals.my.approve",
];

function unique(list) {
  return [...new Set(list)];
}

/**
 * Resolves effective permission codes for a company membership.
 * When IAM provides explicit permission codes on the membership, those win.
 */
export function resolveMembershipPermissions({
  role,
  employeeId = null,
  isApprovalDelegate = false,
  explicitPermissions = null,
}) {
  if (Array.isArray(explicitPermissions) && explicitPermissions.length > 0) {
    return unique(explicitPermissions);
  }

  const template = ROLE_TEMPLATE_PERMISSIONS[role] || EMPLOYEE_PERMISSIONS;
  let permissions = [...template];

  if (!employeeId) {
    permissions = permissions.filter((code) => code !== "hr.profile.self.view");
  }

  if (isApprovalDelegate) {
    permissions.push(...DELEGATE_PERMISSIONS);
  }

  return unique(permissions);
}

/** Groups flat codes by resource prefix for IAM-style action payloads. */
export function permissionsToActionMap(permissionCodes) {
  /** @type {Record<string, string[]>} */
  const actions = {};

  for (const code of permissionCodes) {
    const parts = code.split(".");
    if (parts.length < 2) continue;
    const action = parts[parts.length - 1];
    const resource = parts.slice(0, -1).join(".");
    if (!actions[resource]) actions[resource] = [];
    if (!actions[resource].includes(action)) {
      actions[resource].push(action);
    }
  }

  return actions;
}

export function buildMembershipAccessContext(membership) {
  const permissions = resolveMembershipPermissions({
    role: membership.role,
    employeeId: membership.employeeId,
    isApprovalDelegate: membership.isApprovalDelegate,
    explicitPermissions: membership.permissions,
  });

  return {
    application: HRMS_APPLICATION,
    companyId: String(membership.companyId),
    companyName: membership.companyName,
    roles: [membership.role],
    permissionCodes: permissions,
    actions: permissionsToActionMap(permissions),
    scopes: {
      // Reserved for legal entity / branch / department filters from IAM.
      legalEntityIds: [],
      branchIds: [],
      departmentIds: [],
    },
  };
}