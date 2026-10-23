import { useEffect, useState } from "react";
import { apiRequest } from "./api";
import {
  LayoutDashboard,
  Users,
  UserRound,
  Clock3,
  CalendarDays,
  CalendarCheck,
  Cpu,
  TriangleAlert,
  Settings,
  FileText,
  Download,
  IndianRupee,
  Shield,
  CirclePlus,
  Folder,
  Search,
  BriefcaseBusiness,
  Plus,
  Pencil,
  Eye,
  Building2,
  ClipboardCheck,
  UserCheck,
  Scale,
  CircleUserRound,
  Repeat,
  IdCard,
  KeyRound,
} from "lucide-react";
import { Dashboard } from "./modules/dashboard";
import { UsersAccess } from "./modules/access";
import { useConfirm } from "./modules/useConfirm";
import { EmployeeProfile } from "./modules/employeeProfile";
import { ApprovalDelegation, LeaveCarryForward, MyApprovals, PayrollPolicy } from "./modules/admin";
import { ROLE_LABELS, canManage, initials, isAdmin, primaryButton, secondaryButton } from "./modules/helpers";
import { EmployeeSelect, Modal, Notice, PageHeader, Panel, StatGrid, StatusBadge } from "./modules/ui";
import { Sidebar, TopBar } from "./shell";
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

// access: all members | manager (company_admin, hr_manager) | admin (company_admin)
// | self (login linked to an employee) | approver (manager or approval delegate).
// The sidebar only hides pages; every API enforces the same rules server-side.
const menuSections = [
  {
    title: "Main",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, access: "all" },
      { label: "My Profile", icon: CircleUserRound, access: "self" },
      { label: "My Approvals", icon: ClipboardCheck, access: "approver" },
    ],
  },
  {
    title: "Employees",
    items: [
      { label: "Departments", icon: BriefcaseBusiness, access: "manager" },
      { label: "Employee Directory", icon: Users, access: "all" },
      { label: "Designations", icon: UserRound, access: "manager" },
      { label: "Employee Profile", icon: IdCard, access: "all" },
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

function canAccess(access, { role, ownEmployeeId, isApprovalDelegate }) {
  if (access === "all") return true;
  if (access === "manager") return canManage(role);
  if (access === "admin") return isAdmin(role);
  if (access === "self") return Boolean(ownEmployeeId);
  if (access === "approver") return canManage(role) || isApprovalDelegate;
  return false;
}

const initialDepartments = [];

const initialEmployees = [];

const emptyEmployeeForm = {
  employeeCode: "",
  name: "",
  department: "",
  designation: "",
  email: "",
  phone: "",
  userId: "",
  dateOfJoining: "",
  employmentType: "",
  workLocation: "",
  reportingManagerId: "",
};

const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Intern", "Consultant"];

function toDesignationRecord(row) {
  return {
    id: String(row.id),
    title: row.designation_name,
    departments: (row.departments || []).map((d) => ({ id: String(d.id), name: d.department_name, status: d.status })),
    description: row.description || "",
    status: row.status || "Active",
  };
}

function FormError({ message }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {message}
    </p>
  );
}

function App({ companyId, role = "", companyName = "", ownEmployeeId = null, isApprovalDelegate = false, session = {} }) {
  const [activePage, setActivePage] = useState("Dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem("elvaSidebarCollapsed") === "1");
  const [dataVersion, setDataVersion] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [successNotice, setSuccessNotice] = useState("");
  const confirm = useConfirm();
  const [members, setMembers] = useState([]);
  const refreshCompanyRecords = () => setDataVersion((version) => version + 1);
  // Departments state
  const [departmentRecords, setDepartmentRecords] = useState(initialDepartments);
  const [departmentSearch, setDepartmentSearch] = useState("");
  const [showDepartmentForm, setShowDepartmentForm] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const emptyDepartmentForm = { name: "", description: "", status: "Active" };
  const [departmentForm, setDepartmentForm] = useState({ ...emptyDepartmentForm });

  // Employee Directory state
  const [employees, setEmployees] = useState(initialEmployees);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [employeeForm, setEmployeeForm] = useState(emptyEmployeeForm);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Designations state
  const [designationRecords, setDesignationRecords] = useState([]);
  const [designationSearch, setDesignationSearch] = useState("");
  const [showDesignationForm, setShowDesignationForm] = useState(false);
  const [editingDesignation, setEditingDesignation] = useState(null);
  const emptyDesignationForm = {
    title: "",
    departmentIds: [],
    description: "",
    status: "Active",
  };
  const [designationForm, setDesignationForm] = useState({ ...emptyDesignationForm });
  
  const filteredEmployees = employees.filter((employee) => {
    const query = employeeSearch.toLowerCase();
    const matchesSearch =
      `${employee.employeeCode} ${employee.name} ${employee.email} ${employee.phone} ${employee.department} ${employee.designation}`
        .toLowerCase()
        .includes(query);
    const matchesDepartment =
      departmentFilter === "All" || employee.department === departmentFilter;

    return matchesSearch && matchesDepartment;
  });

  // Load only records belonging to the active company.
  useEffect(() => {
    if (!companyId) return undefined;

    let cancelled = false;

    async function loadCompanyRecords() {
      try {
        const query = `?companyId=${encodeURIComponent(companyId)}`;

        const [employeeResult, departmentResult, designationResult, memberResult] =
          await Promise.all([
            apiRequest(`/api/employees${query}`),
            apiRequest(`/api/departments${query}`),
            apiRequest(`/api/designations${query}`),
            canManage(role) ? apiRequest(`/api/members${query}`) : Promise.resolve({ members: [] }),
          ]);

        if (cancelled) return;

        const loadedEmployees = (employeeResult.employees || []).map((row) => ({
          id: String(row.id),
          employeeCode: row.employee_code || "",
          name: row.name || "",
          department: row.department || "",
          designation: row.designation || "",
          email: row.email || "",
          phone: row.phone || "",
          status: row.status || "Active",
          userId: row.user_id ? String(row.user_id) : "",
          dateOfJoining: row.date_of_joining || "",
          employmentType: row.employment_type || "",
          workLocation: row.work_location || "",
          reportingManagerId: row.reporting_manager_id ? String(row.reporting_manager_id) : "",
        }));

        setEmployees(loadedEmployees);
        setMembers(memberResult.members || []);

        setLoadError("");
        setDepartmentRecords((departmentResult.departments || []).map((row) => ({
          id: String(row.id),
          name: row.department_name,
          employees: row.employee_count ?? 0,
          description: row.description || "",
          status: row.status || "Active",
          created: row.created_at
            ? new Date(row.created_at).toLocaleDateString("en-GB")
            : "",
        })));

        setDesignationRecords((designationResult.designations || []).map(toDesignationRecord));
      } catch (error) {
        if (!cancelled) {
          setLoadError(error.message || "Unable to load company records.");
        }
      }
    }

    loadCompanyRecords();

    return () => {
      cancelled = true;
    };
  }, [companyId, dataVersion, role]);
  const filteredDepartments = departmentRecords.filter((department) =>
    `${department.name} ${department.description}`
      .toLowerCase()
      .includes(departmentSearch.toLowerCase())
  );

  function openDepartmentForm(department = null) {
    setEditingDepartment(department);
    setDepartmentForm(
      department
        ? { name: department.name, description: department.description, status: department.status }
        : { ...emptyDepartmentForm }
    );
    setFormError("");
    setShowDepartmentForm(true);
  }

  async function saveDepartment(event) {
    event.preventDefault();
    setFormError("");

    if (!companyId) {
      setFormError("Select an active company before saving.");
      return;
    }

    const name = departmentForm.name.trim();
    if (name.length < 2) {
      setFormError("Enter a department name with at least 2 characters.");
      return;
    }

    const description = departmentForm.description.trim();
    const status = departmentForm.status || "Active";

    try {
      const editing = Boolean(editingDepartment);
      const query = `?companyId=${encodeURIComponent(companyId)}`;
      const result = editing
        ? await apiRequest(
            `/api/departments/${encodeURIComponent(editingDepartment.id)}${query}`,
            {
              method: "PATCH",
              body: JSON.stringify({
                departmentName: name,
                description,
                status,
              }),
            }
          )
        : await apiRequest("/api/departments", {
            method: "POST",
            body: JSON.stringify({
              companyId,
              departmentName: name,
              description,
              status,
            }),
          });

      const row = result.department;
      const saved = {
        id: String(row.id),
        name: row.department_name,
        employees: editingDepartment?.employees || 0,
        description: row.description || "",
        status: row.status,
        created: row.created_at
          ? new Date(row.created_at).toLocaleDateString("en-GB")
          : "",
      };

      setDepartmentRecords((previous) =>
        editing
          ? previous.map((item) =>
              String(item.id) === saved.id ? saved : item
            )
          : [...previous, saved]
      );

      setShowDepartmentForm(false);
      setEditingDepartment(null);
      setDepartmentForm({ ...emptyDepartmentForm });
      refreshCompanyRecords();
    } catch (error) {
      setFormError(error.message || "Unable to save department.");
    }
  }

  async function toggleDepartmentStatus(id) {
    const department = departmentRecords.find(
      (item) => String(item.id) === String(id)
    );
    if (!department || !companyId) return;

    const status = department.status === "Active" ? "Inactive" : "Active";
    setNotice("");

    try {
      const result = await apiRequest(
        `/api/departments/${encodeURIComponent(id)}?companyId=${encodeURIComponent(companyId)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status }),
        }
      );

      setDepartmentRecords((previous) =>
        previous.map((item) =>
          String(item.id) === String(id)
            ? { ...item, status: result.department.status }
            : item
        )
      );
    } catch (error) {
      setNotice(error.message || "Unable to update department status.");
    }
  }

  function openEmployeeForm(employee = null) {
    setEditingEmployee(employee);
    setEmployeeForm(
      employee
        ? {
            employeeCode: employee.employeeCode,
            name: employee.name,
            department: employee.department,
            designation: employee.designation,
            email: employee.email,
            phone: employee.phone,
            userId: employee.userId || "",
            dateOfJoining: employee.dateOfJoining || "",
            employmentType: employee.employmentType || "",
            workLocation: employee.workLocation || "",
            reportingManagerId: employee.reportingManagerId || "",
          }
        : { ...emptyEmployeeForm }
    );
    setFormError("");
    setShowEmployeeForm(true);
  }

  async function saveEmployee(event) {
    event.preventDefault();
    setFormError("");

    if (!companyId) {
      setFormError("Select an active company before saving.");
      return;
    }

    const payload = {
      companyId,
      employeeCode: employeeForm.employeeCode.trim(),
      name: employeeForm.name.trim(),
      department: employeeForm.department.trim(),
      designation: employeeForm.designation.trim(),
      email: employeeForm.email.trim().toLowerCase(),
      phone: employeeForm.phone.trim(),
      status: editingEmployee?.status || "Active",
      userId: employeeForm.userId || null,
      dateOfJoining: employeeForm.dateOfJoining || null,
      employmentType: employeeForm.employmentType || null,
      workLocation: employeeForm.workLocation.trim() || null,
      reportingManagerId: employeeForm.reportingManagerId || null,
    };

    if (
      !payload.employeeCode ||
      !payload.name ||
      !payload.department ||
      !payload.designation ||
      !payload.email
    ) {
      setFormError("Complete all required employee fields.");
      return;
    }

    try {
      const result = editingEmployee
        ? await apiRequest(
            `/api/employees/${encodeURIComponent(editingEmployee.id)}?companyId=${encodeURIComponent(companyId)}`,
            {
              method: "PATCH",
              body: JSON.stringify(payload),
            }
          )
        : await apiRequest("/api/employees", {
            method: "POST",
            body: JSON.stringify(payload),
          });

      const row = result.employee;
      const saved = {
        id: String(row.id),
        employeeCode: row.employee_code,
        name: row.name,
        department: row.department,
        designation: row.designation,
        email: row.email,
        phone: row.phone || "",
        status: row.status,
        userId: row.user_id ? String(row.user_id) : "",
        dateOfJoining: row.date_of_joining || "",
        employmentType: row.employment_type || "",
        workLocation: row.work_location || "",
        reportingManagerId: row.reporting_manager_id ? String(row.reporting_manager_id) : "",
      };

      setEmployees((previous) =>
        editingEmployee
          ? previous.map((item) =>
              String(item.id) === saved.id ? saved : item
            )
          : [...previous, saved]
      );

      setShowEmployeeForm(false);
      setEditingEmployee(null);
      setEmployeeForm({ ...emptyEmployeeForm });
      refreshCompanyRecords();
    } catch (error) {
      setFormError(error.message || "Unable to save employee.");
    }
  }

  const filteredDesignations = designationRecords.filter((designation) =>
    `${designation.title} ${designation.description} ${designation.departments.map((d) => d.name).join(" ")}`
      .toLowerCase()
      .includes(designationSearch.toLowerCase())
  );

  function openDesignationForm(designation = null) {
    setEditingDesignation(designation);
    setDesignationForm(
      designation
        ? {
            title: designation.title,
            departmentIds: designation.departments.map((d) => d.id),
            description: designation.description,
            status: designation.status,
          }
        : { ...emptyDesignationForm }
    );
    setFormError("");
    setShowDesignationForm(true);
  }

  async function saveDesignation(event) {
    event.preventDefault();
    setFormError("");

    const title = designationForm.title.trim();

    if (!title || !companyId) {
      setFormError("Enter a designation and select an active company.");
      return;
    }

    const payload = {
      companyId,
      designationName: title,
      description: designationForm.description.trim(),
      status: designationForm.status || "Active",
      departmentIds: designationForm.departmentIds,
    };

    try {
      const editing = Boolean(editingDesignation);
      const query = `?companyId=${encodeURIComponent(companyId)}`;
      const result = editing
        ? await apiRequest(
            `/api/designations/${encodeURIComponent(editingDesignation.id)}${query}`,
            {
              method: "PATCH",
              body: JSON.stringify({
                designationName: payload.designationName,
                description: payload.description,
                status: payload.status,
                departmentIds: payload.departmentIds,
              }),
            }
          )
        : await apiRequest("/api/designations", {
            method: "POST",
            body: JSON.stringify(payload),
          });

      const saved = toDesignationRecord(result.designation);

      setDesignationRecords((previous) =>
        editing
          ? previous.map((item) =>
              String(item.id) === saved.id ? saved : item
            )
          : [...previous, saved]
      );

      setShowDesignationForm(false);
      setEditingDesignation(null);
      setDesignationForm({ ...emptyDesignationForm });
      refreshCompanyRecords();
    } catch (error) {
      setFormError(error.message || "Unable to save designation.");
    }
  }

  async function toggleDesignationStatus(id) {
    const item = designationRecords.find(
      (record) => String(record.id) === String(id)
    );
    if (!item || !companyId) return;

    const status = item.status === "Active" ? "Inactive" : "Active";
    setNotice("");

    try {
      const result = await apiRequest(
        `/api/designations/${encodeURIComponent(id)}?companyId=${encodeURIComponent(companyId)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status }),
        }
      );

      setDesignationRecords((previous) =>
        previous.map((record) =>
          String(record.id) === String(id)
            ? { ...record, status: result.designation.status }
            : record
        )
      );
    } catch (error) {
      setNotice(error.message || "Unable to update designation status.");
    }
  }

  async function toggleEmployeeStatus(employeeId) {
    const employee = employees.find(
      (item) => String(item.id) === String(employeeId)
    );
    if (!employee || !companyId) return;

    const status = employee.status === "Active" ? "Inactive" : "Active";
    setNotice("");
    setSuccessNotice("");

    if (status === "Inactive" && employee.userId) {
      const ok = await confirm.ask({
        title: "Deactivate employee",
        message: `${employee.name} has a login for this company. Deactivating the record also suspends that access here (other companies are not affected). Reactivating the record later does not restore access; use Users & Access for that.`,
        confirmLabel: "Deactivate",
        danger: true,
      });
      if (!ok) return;
    }

    try {
      const result = await apiRequest(
        `/api/employees/${encodeURIComponent(employee.id)}?companyId=${encodeURIComponent(companyId)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status }),
        }
      );

      setEmployees((previous) =>
        previous.map((item) =>
          String(item.id) === String(employeeId)
            ? {
                ...item,
                status: result.employee.status,
              }
            : item
        )
      );
      if (result.accessSuspended) setSuccessNotice(result.message);
      refreshCompanyRecords();
    } catch (error) {
      setNotice(error.message || "Unable to update employee status.");
    }
  }

  const departmentNames = departmentRecords.map((department) => department.name);
  const activeDepartmentNames = departmentRecords
    .filter((department) => department.status === "Active" || department.name === employeeForm.department)
    .map((department) => department.name);
  const activeDesignationTitles = designationRecords
    .filter((designation) => designation.status === "Active" || designation.title === employeeForm.designation)
    .map((designation) => designation.title);
  const linkableMembers = members.filter(
    (member) =>
      !member.employee_id ||
      (editingEmployee && String(member.employee_id) === String(editingEmployee.id))
  );
  const reportingManagerOptions = employees.filter(
    (employee) =>
      String(employee.id) !== String(editingEmployee?.id) &&
      (employee.status === "Active" || String(employee.id) === employeeForm.reportingManagerId)
  );
  const designationDepartmentOptions = departmentRecords.filter(
    (department) => department.status === "Active" || designationForm.departmentIds.includes(department.id)
  );
  const canWrite = canManage(role);
  const accessContext = { role, ownEmployeeId, isApprovalDelegate };
  const visibleSections = menuSections
    .map((section) => ({ ...section, items: section.items.filter((item) => canAccess(item.access, accessContext)) }))
    .filter((section) => section.items.length > 0);
  const pageAllowed = visibleSections.some((section) => section.items.some((item) => item.label === activePage));
  const ModulePage = pageAllowed ? MODULE_PAGES[activePage] : null;
  const currentSection = visibleSections.find((section) => section.items.some((item) => item.label === activePage))?.title;
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

  return (
    <div className="min-h-screen bg-canvas text-slate-800">
      <Sidebar
        sections={visibleSections}
        activePage={activePage}
        onNavigate={navigate}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={toggleSidebar}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className={`min-h-screen transition-[margin] duration-200 ${sidebarCollapsed ? "lg:ml-[76px]" : "lg:ml-[272px]"}`}>
        <TopBar
          section={currentSection}
          title={activePage === "Employee Profile" && selectedEmployee ? selectedEmployee.name : activePage}
          onOpenMobileNav={() => setMobileMenuOpen(true)}
          searchPages={searchPages}
          employees={employees}
          onOpenPage={navigate}
          onOpenEmployee={openEmployeeProfile}
          showApprovals={showApprovals}
          session={session}
          role={role}
          companyId={companyId}
          companyName={companyName}
        />

        <main className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
          {session.error && (
            <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{session.error}</div>
          )}
          {loadError && (
            <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <span>{loadError}</span>
              <button type="button" onClick={refreshCompanyRecords} className="rounded-md border border-red-300 px-3 py-1 text-xs font-semibold hover:bg-red-100">Retry</button>
            </div>
          )}
          {notice && (
            <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <span>{notice}</span>
              <button type="button" onClick={() => setNotice("")} className="rounded-md border border-red-300 px-3 py-1 text-xs font-semibold hover:bg-red-100">Dismiss</button>
            </div>
          )}
          {successNotice && (
            <div className="mb-5">
              <Notice notice={{ type: "success", message: successNotice }} onClose={() => setSuccessNotice("")} />
            </div>
          )}
          {!pageAllowed ? (
            <div className="rounded-xl border border-line bg-white p-8 shadow-sm">
              <h3 className="text-xl font-bold">{activePage}</h3>
              <p className="mt-2 text-sm text-slate-500">This page is not available for your role.</p>
              <button type="button" onClick={() => navigate("Dashboard")} className={`${primaryButton} mt-5`}>
                Back to Dashboard
              </button>
            </div>
          ) : ModulePage ? (
            <ModulePage
              companyId={companyId}
              role={role}
              companyName={companyName}
              employees={employees}
              departments={departmentRecords}
              onNavigate={navigate}
              ownEmployeeId={ownEmployeeId}
              currentUserId={session.user?.id}
            />
          ) : activePage === "My Profile" ? (
            <EmployeeProfile
              key={`own-${ownEmployeeId}`}
              companyId={companyId}
              employeeId={ownEmployeeId}
              ownEmployeeId={ownEmployeeId}
              employees={employees}
              onEmployeeUpdated={refreshCompanyRecords}
            />
          ) : activePage === "Employee Directory" ? (
            <>
              <div className="mb-6">
                <PageHeader title="Employee Directory" subtitle="Add, search, edit and manage employee records.">
                  {canWrite && (
                    <button type="button" onClick={() => openEmployeeForm()} className={primaryButton}>
                      <Plus size={17} aria-hidden="true" />
                      Add Employee
                    </button>
                  )}
                </PageHeader>
              </div>

              <div className="mb-6">
                <StatGrid
                  stats={[
                    { label: "Total Employees", value: employees.length, icon: Users },
                    { label: "Active", value: employees.filter((employee) => employee.status === "Active").length, icon: UserCheck, iconTone: "green", tone: "text-emerald-700" },
                    { label: "Inactive", value: employees.filter((employee) => employee.status === "Inactive").length, icon: UserRound, iconTone: "slate", tone: "text-slate-500" },
                  ]}
                />
              </div>

              <section className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
                  <h4 className="font-semibold text-slate-900">Employee Records <span className="ml-1 text-sm font-normal text-slate-500">({filteredEmployees.length})</span></h4>
                  <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                    <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-sm focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100 sm:w-56 sm:flex-none">
                      <Search size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
                      <span className="sr-only">Search employees</span>
                      <input
                        type="search"
                        value={employeeSearch}
                        onChange={(event) => setEmployeeSearch(event.target.value)}
                        placeholder="Name, code, email…"
                        className="w-full min-w-0 bg-transparent text-sm outline-none"
                      />
                    </label>
                    <label htmlFor="department-filter" className="sr-only">
                      Department
                    </label>
                    <select
                      id="department-filter"
                      value={departmentFilter}
                      onChange={(event) => setDepartmentFilter(event.target.value)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-brand-500"
                    >
                      <option value="All">All Departments</option>
                      {departmentNames.map((department) => (
                        <option key={department} value={department}>
                          {department}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="border-b border-line bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th scope="col" className="px-4 py-3">Employee</th>
                        <th scope="col" className="px-4 py-3">Code</th>
                        <th scope="col" className="px-4 py-3">Department</th>
                        <th scope="col" className="px-4 py-3">Designation</th>
                        <th scope="col" className="px-4 py-3">Contact</th>
                        <th scope="col" className="px-4 py-3">Status</th>
                        <th scope="col" className="px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredEmployees.map((employee) => (
                        <tr key={employee.id} className="transition-colors hover:bg-brand-50/40">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700" aria-hidden="true">{initials(employee.name)}</span>
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-900">{employee.name}</p>
                                <p className="text-xs text-slate-500">{employee.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-medium text-brand-600">{employee.employeeCode || "—"}</td>
                          <td className="px-4 py-3 text-slate-700">{employee.department}</td>
                          <td className="px-4 py-3 text-slate-700">{employee.designation}</td>
                          <td className="px-4 py-3 text-slate-700">{employee.phone || "—"}</td>
                          <td className="px-4 py-3"><StatusBadge status={employee.status} /></td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openEmployeeProfile(employee)}
                                aria-label={`View ${employee.name} profile`}
                                className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
                              >
                                <Eye size={14} aria-hidden="true" />
                                View
                              </button>
                              {canWrite && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => openEmployeeForm(employee)}
                                    title="Edit employee"
                                    aria-label={`Edit ${employee.name}`}
                                    className="rounded-lg border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-50"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => toggleEmployeeStatus(employee.id)}
                                    className={`rounded px-1 text-xs font-semibold hover:underline ${
                                      employee.status === "Active" ? "text-red-600" : "text-emerald-700"
                                    }`}
                                  >
                                    {employee.status === "Active" ? "Deactivate" : "Activate"}
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredEmployees.length === 0 && (
                        <tr>
                          <td colSpan="7" className="px-4 py-10 text-center text-slate-500">
                            {employees.length ? "No employees match your search." : "No employee records yet."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              {showEmployeeForm && (
                <Modal title={editingEmployee ? "Edit Employee" : "Add Employee"} onClose={() => setShowEmployeeForm(false)}>
                    <form onSubmit={saveEmployee} className="space-y-4">
                      <div>
                        <label htmlFor="employee-code" className="mb-1.5 block text-sm font-medium">
                          Employee Code *
                        </label>
                        <input
                          id="employee-code"
                          required
                          maxLength={30}
                          value={employeeForm.employeeCode}
                          onChange={(event) =>
                            setEmployeeForm({ ...employeeForm, employeeCode: event.target.value })
                          }
                          placeholder="Company-issued employee code"
                          className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                        />
                      </div>

                      <div>
                        <label htmlFor="employee-name" className="mb-1.5 block text-sm font-medium">
                          Full Name *
                        </label>
                        <input
                          id="employee-name"
                          required
                          value={employeeForm.name}
                          onChange={(event) =>
                            setEmployeeForm({ ...employeeForm, name: event.target.value })
                          }
                          placeholder="Enter full name"
                          className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label htmlFor="employee-department" className="mb-1.5 block text-sm font-medium">
                            Department *
                          </label>
                          <select
                            id="employee-department"
                            required
                            value={employeeForm.department}
                            onChange={(event) =>
                              setEmployeeForm({ ...employeeForm, department: event.target.value })
                            }
                            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                          >
                            <option value="">Select Department</option>
                            {activeDepartmentNames.map((department) => (
                              <option key={department} value={department}>
                                {department}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label
                            htmlFor="employee-designation"
                            className="mb-1.5 block text-sm font-medium"
                          >
                            Designation *
                          </label>

                          <select
                            id="employee-designation"
                            required
                            value={employeeForm.designation}
                            onChange={(event) =>
                              setEmployeeForm({
                                ...employeeForm,
                                designation: event.target.value,
                              })
                            }
                            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                          >
                            <option value="">Select Designation</option>

                            {activeDesignationTitles.map((title) => (
                              <option key={title} value={title}>
                                {title}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label htmlFor="employee-email" className="mb-1.5 block text-sm font-medium">
                          Email Address *
                        </label>
                        <input
                          id="employee-email"
                          type="email"
                          required
                          value={employeeForm.email}
                          onChange={(event) =>
                            setEmployeeForm({ ...employeeForm, email: event.target.value })
                          }
                          placeholder="name@company.com"
                          className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                        />
                      </div>

                      <div>
                        <label htmlFor="employee-phone" className="mb-1.5 block text-sm font-medium">
                          Phone Number *
                        </label>
                        <input
                          id="employee-phone"
                          type="tel"
                          required
                          pattern="[0-9+() -]{7,20}"
                          value={employeeForm.phone}
                          onChange={(event) =>
                            setEmployeeForm({ ...employeeForm, phone: event.target.value })
                          }
                          placeholder="Enter phone number"
                          className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label htmlFor="employee-joining" className="mb-1.5 block text-sm font-medium">
                            Date of Joining
                          </label>
                          <input
                            id="employee-joining"
                            type="date"
                            value={employeeForm.dateOfJoining}
                            onChange={(event) =>
                              setEmployeeForm({ ...employeeForm, dateOfJoining: event.target.value })
                            }
                            className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                          />
                        </div>
                        <div>
                          <label htmlFor="employee-type" className="mb-1.5 block text-sm font-medium">
                            Employment Type
                          </label>
                          <select
                            id="employee-type"
                            value={employeeForm.employmentType}
                            onChange={(event) =>
                              setEmployeeForm({ ...employeeForm, employmentType: event.target.value })
                            }
                            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                          >
                            <option value="">Not specified</option>
                            {EMPLOYMENT_TYPES.map((type) => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label htmlFor="employee-location" className="mb-1.5 block text-sm font-medium">
                            Work Location
                          </label>
                          <input
                            id="employee-location"
                            maxLength={200}
                            value={employeeForm.workLocation}
                            onChange={(event) =>
                              setEmployeeForm({ ...employeeForm, workLocation: event.target.value })
                            }
                            placeholder="Office or site"
                            className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                          />
                        </div>
                        <div>
                          <label htmlFor="employee-manager" className="mb-1.5 block text-sm font-medium">
                            Reporting Manager
                          </label>
                          <select
                            id="employee-manager"
                            value={employeeForm.reportingManagerId}
                            onChange={(event) =>
                              setEmployeeForm({ ...employeeForm, reportingManagerId: event.target.value })
                            }
                            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                          >
                            <option value="">None</option>
                            {reportingManagerOptions.map((manager) => (
                              <option key={manager.id} value={manager.id}>
                                {manager.name} ({manager.employeeCode})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">
                        Documents, photo, addresses, emergency contacts and bank details are managed from the employee's profile after saving.
                      </p>

                      <div>
                        <label htmlFor="employee-login" className="mb-1.5 block text-sm font-medium">
                          Linked Login
                        </label>
                        <select
                          id="employee-login"
                          aria-describedby="employee-login-help"
                          value={employeeForm.userId}
                          onChange={(event) =>
                            setEmployeeForm({ ...employeeForm, userId: event.target.value })
                          }
                          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                        >
                          <option value="">Not linked</option>
                          {linkableMembers.map((member) => (
                            <option key={member.user_id} value={String(member.user_id)}>
                              {member.full_name} ({member.email}) · {ROLE_LABELS[member.role] || member.role}
                            </option>
                          ))}
                        </select>
                        <p id="employee-login-help" className="mt-2 text-xs text-slate-500">
                          The login that may see this employee's own attendance, leave and payslips. Choose it deliberately; matching emails are not linked automatically.
                        </p>
                      </div>

                      <FormError message={formError} />

                      <div className="flex justify-end gap-3 border-t border-line pt-4">
                        <button type="button" onClick={() => setShowEmployeeForm(false)} className={secondaryButton}>
                          Cancel
                        </button>
                        <button type="submit" className={primaryButton}>
                          {editingEmployee ? "Save Changes" : "Add Employee"}
                        </button>
                      </div>
                    </form>
                </Modal>
              )}
            </>
          ) : activePage === "Designations" ? (
            <section className="space-y-6">
              <PageHeader title="Designations" subtitle="Create and manage job titles and the departments they belong to.">
                {canWrite && (
                  <button type="button" onClick={() => openDesignationForm()} className={primaryButton}>
                    <Plus size={16} aria-hidden="true" /> Add Designation
                  </button>
                )}
              </PageHeader>

              <StatGrid
                stats={[
                  { label: "Total Designations", value: designationRecords.length, icon: BriefcaseBusiness, iconTone: "brand" },
                  { label: "Active", value: designationRecords.filter((item) => item.status === "Active").length, icon: BriefcaseBusiness, iconTone: "green", tone: "text-emerald-700" },
                  { label: "Inactive", value: designationRecords.filter((item) => item.status === "Inactive").length, icon: BriefcaseBusiness, iconTone: "slate" },
                ]}
              />

              <Panel
                title="Designation Records"
                padded={false}
                actions={
                  <label className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
                    <Search size={16} className="text-slate-400" aria-hidden="true" />
                    <span className="sr-only">Search designations</span>
                    <input value={designationSearch} onChange={(event) => setDesignationSearch(event.target.value)} placeholder="Search designations..." className="w-40 bg-transparent text-sm outline-none sm:w-52" />
                  </label>
                }
              >
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-left text-sm">
                    <thead className="border-b border-line bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th scope="col" className="px-4 py-3">Designation</th>
                        <th scope="col" className="px-4 py-3">Departments</th>
                        <th scope="col" className="px-4 py-3">Status</th>
                        <th scope="col" className="px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredDesignations.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/70">
                          <td className="px-4 py-4"><p className="font-semibold text-slate-800">{item.title}</p><p className="mt-1 max-w-xs text-xs text-slate-500">{item.description || "No description provided."}</p></td>
                          <td className="px-4 py-4">{item.departments.length ? item.departments.map((d) => d.name).join(", ") : <span className="text-slate-400">Not linked</span>}</td>
                          <td className="px-4 py-4"><StatusBadge status={item.status} /></td>
                          <td className="px-4 py-4">{canWrite ? <div className="flex items-center gap-2"><button type="button" onClick={() => openDesignationForm(item)} title="Edit designation" aria-label={`Edit ${item.title}`} className="rounded-md border border-slate-300 p-2 hover:bg-slate-100"><Pencil size={15} /></button><button type="button" onClick={() => toggleDesignationStatus(item.id)} className={`text-xs font-semibold ${item.status === "Active" ? "text-red-600 hover:underline" : "text-emerald-700 hover:underline"}`}>{item.status === "Active" ? "Deactivate" : "Activate"}</button></div> : <span className="text-xs text-slate-400">View only</span>}</td>
                        </tr>
                      ))}
                      {filteredDesignations.length === 0 && (
                        <tr><td colSpan="4" className="px-4 py-12 text-center"><p className="font-semibold text-slate-700">No designations found</p><p className="mt-1 text-sm text-slate-500">Add a designation to get started. No sample records have been added.</p></td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Panel>

              {showDesignationForm && (
                <Modal title={editingDesignation ? "Edit Designation" : "Create New Designation"} onClose={() => setShowDesignationForm(false)}>
                    <form onSubmit={saveDesignation} className="space-y-5">
                      <div>
                        <label htmlFor="designation-title" className="mb-2 block text-sm font-semibold">Designation Title <span className="text-red-500">*</span></label>
                        <input id="designation-title" required value={designationForm.title} onChange={(e) => setDesignationForm({ ...designationForm, title: e.target.value })} placeholder="Enter designation title..." className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
                      </div>

                      <div>
                        <p className="mb-2 text-sm font-semibold">Assign to Departments</p>
                        <div className="max-h-56 space-y-3 overflow-y-auto rounded-lg border border-slate-300 bg-slate-50 p-4">
                          {designationDepartmentOptions.length === 0 && (
                            <p className="text-sm text-slate-500">No departments yet. Create departments first to link them.</p>
                          )}
                          {designationDepartmentOptions.map((department) => (
                            <label key={department.id} className="flex cursor-pointer items-center gap-3 text-sm">
                              <input type="checkbox" checked={designationForm.departmentIds.includes(department.id)} onChange={(e) => {
                                const departmentIds = e.target.checked
                                  ? [...designationForm.departmentIds, department.id]
                                  : designationForm.departmentIds.filter((id) => id !== department.id);
                                setDesignationForm({ ...designationForm, departmentIds });
                              }} className="h-4 w-4 accent-brand-600" />
                              {department.name}
                              {department.status !== "Active" && <span className="text-xs text-slate-400">(inactive)</span>}
                            </label>
                          ))}
                        </div>
                        <p className="mt-1 text-xs text-slate-500">Optional: link the departments that use this designation.</p>
                      </div>

                      <div>
                        <label htmlFor="designation-description" className="mb-2 block text-sm font-semibold">Description</label>
                        <textarea id="designation-description" rows={4} value={designationForm.description} onChange={(e) => setDesignationForm({ ...designationForm, description: e.target.value })} placeholder="Provide role details and main responsibilities..." className="w-full resize-y rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
                      </div>

                      <label className="flex items-center justify-between gap-4">
                        <span><span className="block text-sm font-semibold">Status</span><span className="text-xs text-slate-500">Toggle initial designation state</span></span>
                        <input type="checkbox" checked={designationForm.status === "Active"} onChange={(e) => setDesignationForm({ ...designationForm, status: e.target.checked ? "Active" : "Inactive" })} className="h-5 w-10 cursor-pointer accent-emerald-600" />
                      </label>

                      <FormError message={formError} />
                      <div className="flex justify-end gap-3 border-t border-line pt-5">
                        <button type="button" onClick={() => setShowDesignationForm(false)} className={secondaryButton}>Cancel</button>
                        <button type="submit" className={primaryButton}>{editingDesignation ? "Save Changes" : "Create Designation"}</button>
                      </div>
                    </form>
                </Modal>
              )}

            </section>
          ) : activePage === "Employee Profile" && selectedEmployee ? (
            <EmployeeProfile
              key={selectedEmployee.id}
              companyId={companyId}
              employeeId={selectedEmployee.id}
              ownEmployeeId={ownEmployeeId}
              employees={employees}
              onBack={() => navigate("Employee Directory")}
              onEmployeeUpdated={refreshCompanyRecords}
            />
          ) : activePage === "Employee Profile" ? (
            <section className="space-y-6">
              <PageHeader title="Employee Profile" subtitle="Choose an employee to open their 360° profile. What you can see depends on your role." />
              <Panel title="Select employee">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <label className="block flex-1 text-xs font-semibold text-slate-600">
                    Employee
                    <div className="mt-1.5 font-normal">
                      <EmployeeSelect
                        employees={employees}
                        activeOnly={false}
                        value=""
                        onChange={(id) => {
                          const employee = employees.find((e) => String(e.id) === String(id));
                          if (employee) openEmployeeProfile(employee);
                        }}
                      />
                    </div>
                  </label>
                  {ownEmployeeId && (
                    <button type="button" onClick={() => navigate("My Profile")} className={secondaryButton}>
                      <CircleUserRound size={16} aria-hidden="true" /> Open my profile
                    </button>
                  )}
                </div>
                {employees.length === 0 && <p className="mt-4 text-sm text-slate-500">No employee records are available yet.</p>}
              </Panel>
            </section>
          ) : activePage === "Departments" ? (
            <section className="space-y-6">
              <PageHeader title="Departments" subtitle="Manage organizational departments and team structure.">
                <label className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
                  <Search size={16} className="text-slate-400" aria-hidden="true" />
                  <span className="sr-only">Search departments</span>
                  <input value={departmentSearch} onChange={(event) => setDepartmentSearch(event.target.value)} placeholder="Search departments..." className="w-40 bg-transparent text-sm outline-none sm:w-52" />
                </label>
                {canWrite && (
                  <button type="button" onClick={() => openDepartmentForm()} className={primaryButton}>
                    <Plus size={16} aria-hidden="true" /> Create Department
                  </button>
                )}
              </PageHeader>

              <StatGrid
                stats={[
                  { label: "Total Departments", value: departmentRecords.length, icon: Building2, iconTone: "brand" },
                  { label: "Active Departments", value: departmentRecords.filter((d) => d.status === "Active").length, icon: Building2, iconTone: "green" },
                  { label: "Assigned Employees", value: departmentRecords.reduce((sum, d) => sum + Number(d.employees || 0), 0), icon: Users, iconTone: "brand", note: "Employees linked to a department" },
                  { label: "Average Team Size", value: departmentRecords.length ? Math.round(departmentRecords.reduce((sum, d) => sum + Number(d.employees || 0), 0) / departmentRecords.length) : 0, icon: Users, iconTone: "slate", note: "Assigned employees per department" },
                ]}
              />

              {filteredDepartments.length ? (
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                  {filteredDepartments.map((department) => (
                    <article key={department.id} className="flex flex-col rounded-xl border border-line bg-white p-5 shadow-sm sm:p-6">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600" aria-hidden="true"><Building2 size={18} /></span>
                          <h4 className="truncate text-lg font-semibold text-slate-900">{department.name}</h4>
                        </div>
                        <StatusBadge status={department.status} />
                      </div>
                      <p className="mt-4 min-h-12 flex-1 text-sm leading-6 text-slate-600">{department.description || "No department description provided."}</p>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                        <div>
                          <p className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Users size={16} className="text-slate-400" aria-hidden="true" />{department.employees} {Number(department.employees) === 1 ? "Employee" : "Employees"}</p>
                          {department.created && <p className="mt-1 text-xs text-slate-400">Created: {department.created}</p>}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => setSelectedDepartment(department)} className={secondaryButton}>View Details</button>
                          {canWrite && (
                            <>
                              <button type="button" onClick={() => openDepartmentForm(department)} aria-label={`Edit ${department.name}`} title="Edit department" className="rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-50"><Pencil size={16} /></button>
                              <button type="button" onClick={() => toggleDepartmentStatus(department.id)} className={`rounded-lg px-3 py-2 text-sm font-medium ${department.status === "Active" ? "text-red-600 hover:bg-red-50" : "text-emerald-700 hover:bg-emerald-50"}`}>{department.status === "Active" ? "Deactivate" : "Activate"}</button>
                            </>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-line bg-white p-10 text-center">
                  <p className="font-semibold text-slate-700">{departmentRecords.length ? "No departments match your search." : "No departments yet."}</p>
                  {!departmentRecords.length && canWrite && <p className="mt-1 text-sm text-slate-500">Create a department to start organising employees.</p>}
                </div>
              )}

              {showDepartmentForm && (
                <Modal title={editingDepartment ? "Edit Department" : "Create New Department"} onClose={() => setShowDepartmentForm(false)}>
                    <form onSubmit={saveDepartment} className="space-y-4">
                      <div><label htmlFor="department-name" className="mb-1.5 block text-sm font-medium">Department Name *</label><input id="department-name" required maxLength={150} value={departmentForm.name} onChange={(event) => setDepartmentForm({ ...departmentForm, name: event.target.value })} placeholder="e.g. Quality Assurance" className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" /></div>
                      <div><label htmlFor="department-description" className="mb-1.5 block text-sm font-medium">Description</label><textarea id="department-description" rows="3" value={departmentForm.description} onChange={(event) => setDepartmentForm({ ...departmentForm, description: event.target.value })} placeholder="Brief description of department responsibilities..." className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" /></div>
                      <div className="flex items-center gap-3"><label htmlFor="department-status" className="text-sm font-medium">Status</label><select id="department-status" value={departmentForm.status} onChange={(event) => setDepartmentForm({ ...departmentForm, status: event.target.value })} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"><option>Active</option><option>Inactive</option></select></div>
                      <FormError message={formError} />
                      <div className="flex justify-end gap-3 border-t border-line pt-4"><button type="button" onClick={() => setShowDepartmentForm(false)} className={secondaryButton}>Cancel</button><button type="submit" className={primaryButton}>{editingDepartment ? "Save Changes" : "Create Department"}</button></div>
                    </form>
                </Modal>
              )}

              {selectedDepartment && (
                <Modal title="Department Details" onClose={() => setSelectedDepartment(null)}>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
                    <dt className="text-slate-500">Name</dt><dd className="font-semibold text-slate-900">{selectedDepartment.name}</dd>
                    <dt className="text-slate-500">Employees</dt><dd className="font-semibold text-slate-900">{selectedDepartment.employees}</dd>
                    <dt className="text-slate-500">Created</dt><dd className="font-semibold text-slate-900">{selectedDepartment.created || "—"}</dd>
                    <dt className="text-slate-500">Status</dt><dd><StatusBadge status={selectedDepartment.status} /></dd>
                    <dt className="text-slate-500">Description</dt><dd className="text-slate-700">{selectedDepartment.description || "No description provided."}</dd>
                  </dl>
                  <div className="mt-5 flex justify-end border-t border-line pt-4"><button type="button" onClick={() => setSelectedDepartment(null)} className={primaryButton}>Close</button></div>
                </Modal>
              )}
            </section>
          ) : (
            <div className="rounded-xl border border-line bg-white p-8 shadow-sm">
              <h3 className="text-xl font-bold">{activePage}</h3>
              <p className="mt-2 text-sm text-slate-500">This page is not available.</p>
              <button type="button" onClick={() => navigate("Dashboard")} className={`${primaryButton} mt-5`}>
                Back to Dashboard
              </button>
            </div>
          )}
        </main>
      </div>
      {confirm.dialog}
    </div>
  );
}

export default App;

