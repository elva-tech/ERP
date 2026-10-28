import { useEffect, useState } from "react";
import { apiRequest } from "./api";
import { Dashboard } from "./modules/dashboard";
import { UsersAccess } from "./modules/access";
import { EmployeeDirectory, EmployeeProfilePicker } from "./modules/directory";
import { EmployeeProfile } from "./modules/employeeProfile";
import { Departments, Designations } from "./modules/organization";
import { ApprovalDelegation, LeaveCarryForward, MyApprovals, PayrollPolicy } from "./modules/admin";
import { canManage, primaryButton } from "./modules/helpers";
import { toDepartmentRecord, toDesignationRecord, toEmployeeRecord } from "./modules/records";
import { Notice } from "./modules/ui";
import { accessibleSectionsFor, visibleSectionsFor } from "./navigation";
import { SIDEBAR_COLLAPSED_WIDTH, SIDEBAR_WIDTH, Sidebar, TopBar } from "./shell";
import {
  AttendanceDashboard,
  AttendanceExceptions,
  AttendanceRegularization,
  BiometricDevices,
  DailyAttendance,
  EmployeeAttendance,
  MonthlyAttendance,
  Overtime,
  RawPunches,
  RosterManagement,
  ShiftManagement,
} from "./modules/attendance";
import {
  HolidayCalendar,
  LeaveApprovals,
  LeaveBalance,
  LeaveDashboard,
  LeaveRequests,
  LeaveTypes,
} from "./modules/leave";
import {
  EmployeeAdvances,
  PayrollProcessing,
  Payslips,
  SalaryStructure,
  StatutoryReport,
} from "./modules/payroll";

const PfReport = (props) => <StatutoryReport {...props} kind="PF" />;
const EsicReport = (props) => <StatutoryReport {...props} kind="ESIC" />;

const MODULE_PAGES = {
  Dashboard,
  "Attendance Dashboard": AttendanceDashboard,
  "Daily Attendance": DailyAttendance,
  "Monthly Attendance": MonthlyAttendance,
  "Biometric Devices": BiometricDevices,
  "Attendance Exceptions": AttendanceExceptions,
  "Employee Attendance": EmployeeAttendance,
  "Raw Punches": RawPunches,
  "Attendance Regularization": AttendanceRegularization,
  "Shift Management": ShiftManagement,
  "Roster Management": RosterManagement,
  Overtime,
  "Leave Dashboard": LeaveDashboard,
  "Leave Types": LeaveTypes,
  "Leave Requests": LeaveRequests,
  "Leave Approvals": LeaveApprovals,
  "Leave Balance": LeaveBalance,
  "Holiday Calendar": HolidayCalendar,
  "Salary Structure": SalaryStructure,
  "Payroll Processing": PayrollProcessing,
  Payslips,
  "Employee Advances": EmployeeAdvances,
  PF: PfReport,
  ESIC: EsicReport,
  "Statutory Reports": StatutoryReport,
  "Payroll Policy": PayrollPolicy,
  "Approval Delegation": ApprovalDelegation,
  "My Approvals": MyApprovals,
  "Leave Carry Forward": LeaveCarryForward,
  "Users & Access": UsersAccess,
};

function UnavailablePage({ title, message, onBack }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-8">
      <h3 className="text-xl font-bold text-ink">{title}</h3>
      <p className="mt-2 text-[13px] text-muted">{message}</p>
      <button type="button" onClick={onBack} className={`${primaryButton} mt-5`}>
        Back to Dashboard
      </button>
    </div>
  );
}

function App({ companyId, role = "", companyName = "", ownEmployeeId = null, isApprovalDelegate = false, session = {} }) {
  const [activePage, setActivePage] = useState("Dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem("elvaSidebarCollapsed") === "1");
  const [dataVersion, setDataVersion] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [successNotice, setSuccessNotice] = useState("");
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const refreshCompanyRecords = () => setDataVersion((version) => version + 1);

  // Load only records belonging to the active company.
  useEffect(() => {
    if (!companyId) return undefined;

    let cancelled = false;

    async function loadCompanyRecords() {
      try {
        const query = `?companyId=${encodeURIComponent(companyId)}`;
        const [employeeResult, departmentResult, designationResult, memberResult] = await Promise.all([
          apiRequest(`/api/employees${query}`),
          apiRequest(`/api/departments${query}`),
          apiRequest(`/api/designations${query}`),
          canManage(role) ? apiRequest(`/api/members${query}`) : Promise.resolve({ members: [] }),
        ]);

        if (cancelled) return;

        setEmployees((employeeResult.employees || []).map(toEmployeeRecord));
        setMembers(memberResult.members || []);
        setLoadError("");
        setDepartments((departmentResult.departments || []).map(toDepartmentRecord));
        setDesignations((designationResult.designations || []).map(toDesignationRecord));
      } catch (error) {
        if (!cancelled) setLoadError(error.message || "Unable to load company records.");
      }
    }

    loadCompanyRecords();

    return () => {
      cancelled = true;
    };
  }, [companyId, dataVersion, role]);

  const canWrite = canManage(role);
  const accessContext = { role, ownEmployeeId, isApprovalDelegate };
  const visibleSections = visibleSectionsFor(accessContext);
  const accessibleSections = accessibleSectionsFor(accessContext);
  const pageAllowed = accessibleSections.some((section) => section.items.some((item) => item.label === activePage));
  const ModulePage = pageAllowed ? MODULE_PAGES[activePage] : null;
  const currentSection = accessibleSections.find((section) => section.items.some((item) => item.label === activePage))?.title;
  const searchPages = visibleSections.flatMap((section) => section.items.map((item) => ({ ...item, section: section.title })));
  const showApprovals = canManage(role) || isApprovalDelegate;

  function navigate(label) {
    if (label === "Employee Profile") setSelectedEmployee(null);
    setActivePage(label);
    setSuccessNotice("");
    setMobileMenuOpen(false);
  }

  function openEmployeeProfile(employee) {
    setSelectedEmployee(employee);
    setActivePage("Employee Profile");
    setSuccessNotice("");
    setMobileMenuOpen(false);
  }

  function toggleSidebar() {
    setSidebarCollapsed((current) => {
      localStorage.setItem("elvaSidebarCollapsed", current ? "0" : "1");
      return !current;
    });
  }

  function renderPage() {
    if (!pageAllowed) {
      return <UnavailablePage title={activePage} message="This page is not available for your role." onBack={() => navigate("Dashboard")} />;
    }
    if (ModulePage) {
      return (
        <ModulePage
          companyId={companyId}
          role={role}
          companyName={companyName}
          employees={employees}
          departments={departments}
          designations={designations}
          onNavigate={navigate}
          ownEmployeeId={ownEmployeeId}
          currentUserId={session.user?.id}
        />
      );
    }
    switch (activePage) {
      case "My Profile":
        return (
          <EmployeeProfile
            key={`own-${ownEmployeeId}`}
            companyId={companyId}
            employeeId={ownEmployeeId}
            ownEmployeeId={ownEmployeeId}
            employees={employees}
            onEmployeeUpdated={refreshCompanyRecords}
          />
        );
      case "Employee Directory":
        return (
          <EmployeeDirectory
            companyId={companyId}
            canWrite={canWrite}
            employees={employees}
            setEmployees={setEmployees}
            departments={departments}
            designations={designations}
            members={members}
            refresh={refreshCompanyRecords}
            onOpenProfile={openEmployeeProfile}
            onError={setNotice}
            onSuccess={setSuccessNotice}
          />
        );
      case "Designations":
        return (
          <Designations
            companyId={companyId}
            canWrite={canWrite}
            designations={designations}
            setDesignations={setDesignations}
            departments={departments}
            refresh={refreshCompanyRecords}
            onError={setNotice}
          />
        );
      case "Employee Profile":
        return selectedEmployee ? (
          <EmployeeProfile
            key={selectedEmployee.id}
            companyId={companyId}
            employeeId={selectedEmployee.id}
            ownEmployeeId={ownEmployeeId}
            employees={employees}
            onBack={() => navigate("Employee Directory")}
            onEmployeeUpdated={refreshCompanyRecords}
          />
        ) : (
          <EmployeeProfilePicker
            employees={employees}
            ownEmployeeId={ownEmployeeId}
            onOpenProfile={openEmployeeProfile}
            onOpenOwnProfile={() => navigate("My Profile")}
          />
        );
      case "Departments":
        return (
          <Departments
            companyId={companyId}
            canWrite={canWrite}
            departments={departments}
            setDepartments={setDepartments}
            refresh={refreshCompanyRecords}
            onError={setNotice}
          />
        );
      default:
        return <UnavailablePage title={activePage} message="This page is not available." onBack={() => navigate("Dashboard")} />;
    }
  }

  return (
    <div className="min-h-screen bg-workspace text-ink">
      <Sidebar
        sections={visibleSections}
        activePage={activePage}
        onNavigate={navigate}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={toggleSidebar}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className={`min-h-screen transition-[margin] duration-200 print:ml-0 ${sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH}`}>
        <TopBar
          section={currentSection}
          title={activePage === "Employee Profile" && selectedEmployee ? selectedEmployee.name : activePage}
          onOpenMobileNav={() => setMobileMenuOpen(true)}
          searchPages={searchPages}
          employees={employees}
          onOpenPage={navigate}
          onOpenEmployee={openEmployeeProfile}
          onOpenOwnProfile={ownEmployeeId ? () => navigate("My Profile") : undefined}
          showApprovals={showApprovals}
          session={session}
          role={role}
          companyId={companyId}
          companyName={companyName}
        />

        <main className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-7 print:max-w-none print:p-0">
          {(session.error || loadError || notice || successNotice) && (
            <div className="mb-5 space-y-3 print:hidden">
              {session.error && <Notice notice={{ type: "error", message: session.error }} />}
              {loadError && <Notice notice={{ type: "error", message: loadError }} action={{ label: "Retry", onClick: refreshCompanyRecords }} />}
              {notice && <Notice notice={{ type: "error", message: notice }} action={{ label: "Dismiss", onClick: () => setNotice("") }} />}
              {successNotice && <Notice notice={{ type: "success", message: successNotice }} onClose={() => setSuccessNotice("")} />}
            </div>
          )}
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

export default App;
