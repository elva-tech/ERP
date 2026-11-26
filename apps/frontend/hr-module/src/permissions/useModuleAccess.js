import { HR } from "./catalog";
import { useAccess } from "./AccessProvider";

/**
 * Permission-backed action flags for HR screens. UI only — APIs enforce access.
 */
export function useModuleAccess() {
  const access = useAccess();

  return {
    can: access.canPerform,
    has: access.hasPermission,
    canApproveInbox: access.canApproveInbox(),
    employees: {
      create: access.canPerform(HR.employees.directory.create),
      edit: access.canPerform(HR.employees.directory.edit),
      export: access.canPerform(HR.employees.directory.export),
    },
    organization: {
      manageDepartments: access.canPerform(HR.organization.departments.manage),
      manageDesignations: access.canPerform(HR.organization.designations.manage),
    },
    attendance: {
      manageDaily: access.canPerform(HR.attendance.daily.manage),
      manageMonthly: access.canPerform(HR.attendance.monthly.manage),
      manageDevices: access.canPerform(HR.attendance.devices.manage),
      manageExceptions: access.canPerform(HR.attendance.exceptions.manage),
      manageShifts: access.canPerform(HR.attendance.shifts.manage),
      manageRoster: access.canPerform(HR.attendance.roster.manage),
      manageOvertime: access.canPerform(HR.attendance.overtime.manage),
      createRegularization: access.canPerform(HR.attendance.regularization.create),
      viewPunches: access.hasPermission(HR.attendance.punches.view),
    },
    leave: {
      manageTypes: access.canPerform(HR.leave.types.manage),
      createRequest: access.canPerform(HR.leave.requests.create),
      approve: access.canPerform(HR.leave.approvals.approve),
      viewApprovals: access.hasPermission(HR.leave.approvals.view),
      manageCarryForward: access.canPerform(HR.leave.carryForward.manage),
    },
    payroll: {
      manageStructure: access.canPerform(HR.payroll.salaryStructure.manage),
      manageProcessing: access.canPerform(HR.payroll.processing.manage),
      finalizeRun: access.canPerform(HR.payroll.processing.finalize),
      cancelRun: access.canPerform(HR.payroll.processing.cancel),
      managePolicy: access.canPerform(HR.payroll.policy.manage),
      approvePolicy: access.canPerform(HR.payroll.policy.manage),
      createAdvance: access.canPerform(HR.payroll.advances.create),
      exportPayslips: access.canPerform(HR.payroll.payslips.export),
      viewRuns: access.hasPermission(HR.payroll.processing.view),
    },
    statutory: {
      export: (kind) => {
        if (kind === "PF") return access.canPerform(HR.statutory.pf.export);
        if (kind === "ESIC") return access.canPerform(HR.statutory.esic.export);
        return access.canPerform(HR.statutory.reports.export);
      },
    },
    settings: {
      manageUsers: access.canPerform(HR.settings.users.manage),
      manageDelegation: access.canPerform(HR.settings.delegation.manage),
      grantAdminRoles: access.canPerform(HR.settings.delegation.manage),
    },
  };
}