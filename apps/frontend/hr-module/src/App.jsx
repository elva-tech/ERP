import { useState } from "react";
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
  DollarSign,
  Shield,
  CirclePlus,
  Folder,
  Search,
  Bell,
  ChevronDown,
  Menu,
  BriefcaseBusiness,
  Plus,
  Pencil,
  Eye,
  X,
} from "lucide-react";

const menuSections = [
  {
    title: "MAIN",
    items: [{ label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "EMPLOYEES",
    items: [
      { label: "Departments", icon: BriefcaseBusiness },
      { label: "Employee Directory", icon: Users },
      { label: "Designations", icon: UserRound },
    ],
  },
  {
    title: "ATTENDANCE",
    items: [
      { label: "Attendance Dashboard", icon: Clock3 },
      { label: "Daily Attendance", icon: CalendarDays },
      { label: "Monthly Attendance", icon: CalendarCheck },
      { label: "Biometric Devices", icon: Cpu },
      { label: "Attendance Exceptions", icon: TriangleAlert },
      { label: "Employee Attendance", icon: Users },
      { label: "Raw Punches", icon: Clock3 },
      { label: "Attendance Regularization", icon: CalendarCheck },
      { label: "Shift Management", icon: Settings },
      { label: "Roster Management", icon: CalendarDays },
      { label: "Overtime", icon: Clock3 },
    ],
  },
  {
    title: "LEAVE",
    items: [
      { label: "Leave Dashboard", icon: Clock3 },
      { label: "Leave Requests", icon: Clock3 },
      { label: "Leave Approvals", icon: CalendarCheck },
      { label: "Leave Balance", icon: CalendarDays },
      { label: "Holiday Calendar", icon: CalendarDays },
    ],
  },
  {
    title: "PAYROLL",
    items: [
      { label: "Salary Structure", icon: FileText },
      { label: "Payroll Processing", icon: Settings },
      { label: "Payslips", icon: Download },
      { label: "Employee Advances", icon: DollarSign },
    ],
  },
  {
    title: "STATUTORY",
    items: [
      { label: "PF", icon: Shield },
      { label: "ESIC", icon: CirclePlus },
      { label: "Statutory Reports", icon: Folder },
    ],
  },
];

const departments = [];

const attendance = [];

const leaveRequests = [];

const initialDepartments = [];

const initialEmployees = [];

const emptyEmployeeForm = {
  name: "",
  department: "Engineering",
  designation: "",
  email: "",
  phone: "",
};

function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [search, setSearch] = useState("");
  const [requests, setRequests] = useState(leaveRequests);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [attendancePeriod, setAttendancePeriod] = useState("7 Days");
  const [attendanceDate, setAttendanceDate] = useState("2026-10-15");
  const [attendanceDepartment, setAttendanceDepartment] = useState("All Departments");
  const [attendanceLocation, setAttendanceLocation] = useState("All Locations");
  const [attendanceEmployee, setAttendanceEmployee] = useState("All Employees");
  const [attendanceShift, setAttendanceShift] = useState("All Shifts");
  const [attendanceStatus, setAttendanceStatus] = useState("All Statuses");


  // Biometric device management state
  const [biometricDevices, setBiometricDevices] = useState([]);
  const [showDeviceForm, setShowDeviceForm] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [deviceSearch, setDeviceSearch] = useState("");
  const emptyDeviceForm = { name: "", brand: "", model: "", location: "", connection: "LAN", status: "Unknown" };
  const [deviceForm, setDeviceForm] = useState({ ...emptyDeviceForm });

  

  // Departments state
  const [departmentRecords, setDepartmentRecords] = useState(initialDepartments);
  const [departmentSearch, setDepartmentSearch] = useState("");
  const [showDepartmentForm, setShowDepartmentForm] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const emptyDepartmentForm = {
    name: "", code: "", head: "", employees: 0, description: "", status: "Active", parent: "",
  };
  const [departmentForm, setDepartmentForm] = useState({ ...emptyDepartmentForm });

  // Employee Directory state
  const [employees, setEmployees] = useState(initialEmployees);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [employeeForm, setEmployeeForm] = useState(emptyEmployeeForm);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [profileTab, setProfileTab] = useState("Personal Info");

  // Designations state
  const [designationRecords, setDesignationRecords] = useState([]);
  const [designationSearch, setDesignationSearch] = useState("");
  const [showDesignationForm, setShowDesignationForm] = useState(false);
  const [editingDesignation, setEditingDesignation] = useState(null);
  const emptyDesignationForm = {
    title: "",
    code: "",
    departments: [],
    level: "L1 - Entry Level",
    minSalary: "",
    maxSalary: "",
    description: "",
    status: "Active",
  };
  const [designationForm, setDesignationForm] = useState({ ...emptyDesignationForm });
  
  // Holiday Calendar state
  const [holidayRecords, setHolidayRecords] = useState([
    {
      id: 1,
      name: "Independence Day",
      date: "2026-08-15",
      type: "National",
      location: "All Locations",
      description: "Independence Day",
    },
    {
      id: 2,
      name: "Gandhi Jayanti",
      date: "2026-10-02",
      type: "National",
      location: "All Locations",
      description: "Gandhi Jayanti",
    },
    {
      id: 3,
      name: "Kannada Rajyotsava",
      date: "2026-11-01",
      type: "Regional",
      location: "Karnataka",
      description: "Karnataka Rajyotsava",
    },
    {
      id: 4,
      name: "Christmas",
      date: "2026-12-25",
      type: "National",
      location: "All Locations",
      description: "Christmas Day",
    },
  ]);

  const [showHolidayForm, setShowHolidayForm] = useState(false);
  const [editingHolidayId, setEditingHolidayId] = useState(null);
  const [holidaySearch, setHolidaySearch] = useState("");
  const [holidayYear, setHolidayYear] = useState(
  String(new Date().getFullYear())
  );
  const [holidayMonth, setHolidayMonth] = useState(
  String(new Date().getMonth())
  );
  const [selectedCalendarDate, setSelectedCalendarDate] = useState("");
  const emptyHolidayForm = {
    name: "",
    date: "",
    type: "National",
    location: "All Locations",
    description: "",
  };

  const [holidayForm, setHolidayForm] = useState({
    ...emptyHolidayForm,
  });

  // Generate calendar days for the selected year and month
  const calendarYear = Number(holidayYear);
  const calendarMonth = Number(holidayMonth);

  const firstDayOfMonth = new Date(
    calendarYear,
    calendarMonth,
    1
  ).getDay();

  const daysInMonth = new Date(
    calendarYear,
    calendarMonth + 1,
    0
  ).getDate();

  const calendarDays = [
    ...Array(firstDayOfMonth).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  const monthName = new Date(
    calendarYear,
    calendarMonth,
    1
  ).toLocaleString("en-IN", { month: "long" });

  // Add or update a holiday in the calendar.
  function saveHoliday(event) {
    event.preventDefault();

    const name = holidayForm.name.trim();
    if (!name || !holidayForm.date) {
      window.alert("Please enter the holiday name and date.");
      return;
    }

    const duplicateDate = holidayRecords.some(
      (holiday) =>
        holiday.date === holidayForm.date && holiday.id !== editingHolidayId
    );
    if (duplicateDate) {
      window.alert("A holiday is already registered on this date.");
      return;
    }

    if (editingHolidayId !== null) {
      setHolidayRecords((previous) =>
        previous.map((holiday) =>
          holiday.id === editingHolidayId
            ? { ...holiday, ...holidayForm, name }
            : holiday
        )
      );
    } else {
      setHolidayRecords((previous) => [
        ...previous,
        {
          ...holidayForm,
          name,
          id: Math.max(0, ...previous.map((holiday) => holiday.id)) + 1,
        },
      ]);
    }

    setHolidayYear(holidayForm.date.slice(0, 4));
    setHolidayMonth(String(Number(holidayForm.date.slice(5, 7)) - 1));
    setSelectedCalendarDate(holidayForm.date);
    setShowHolidayForm(false);
    setEditingHolidayId(null);
    setHolidayForm({ ...emptyHolidayForm });
  }

  // Attendance module records start empty until real data is connected.
  const [rawPunchFilters, setRawPunchFilters] = useState({ date: "", employee: "", device: "All Devices", location: "All Locations", status: "All Statuses" });
  const [regularizationStatus, setRegularizationStatus] = useState("All Statuses");
  const [shiftRecords, setShiftRecords] = useState([]);
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState(null);
  const emptyShiftForm = { name: "", startTime: "09:00", endTime: "18:00", grace: "15", breakDuration: "60", overtimeThreshold: "30", weeklyOff: "Sunday", location: "All Locations", status: "Active" };
  const [shiftForm, setShiftForm] = useState({ ...emptyShiftForm });
  const [rosterView, setRosterView] = useState("Week");
  const [rosterDepartment, setRosterDepartment] = useState("All Departments");
  const [rosterLocation, setRosterLocation] = useState("All Locations");
  const [rosterPeriod, setRosterPeriod] = useState("Current week");
  const [overtimeStatus, setOvertimeStatus] = useState("All Statuses");

  const pendingCount = requests.filter((request) => request.status === "Pending").length;

  const filteredRequests = requests.filter((request) =>
    `${request.name} ${request.department} ${request.type}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const filteredEmployees = employees.filter((employee) => {
    const query = employeeSearch.toLowerCase();
    const matchesSearch =
      `${employee.id} ${employee.name} ${employee.email} ${employee.phone}`
        .toLowerCase()
        .includes(query);
    const matchesDepartment =
      departmentFilter === "All" || employee.department === departmentFilter;

    return matchesSearch && matchesDepartment;
  });

  const filteredDepartments = departmentRecords.filter((department) =>
    `${department.name} ${department.code} ${department.head}`
      .toLowerCase()
      .includes(departmentSearch.toLowerCase())
  );

  function openDepartmentForm(department = null) {
    setEditingDepartment(department);
    setDepartmentForm(
      department
        ? { ...department }
        : {
            ...emptyDepartmentForm,
            code: `DEPT-${String(Math.max(0, ...departmentRecords.map((d) => d.id)) + 1).padStart(3, "0")}`,
          }
    );
    setShowDepartmentForm(true);
  }

  function saveDepartment(event) {
    event.preventDefault();
    const duplicateCode = departmentRecords.some(
      (department) => department.code.toLowerCase() === departmentForm.code.trim().toLowerCase() && department.id !== editingDepartment?.id
    );
    if (duplicateCode) {
      window.alert("This department code already exists.");
      return;
    }
    const data = {
      ...departmentForm,
      name: departmentForm.name.trim(),
      code: departmentForm.code.trim(),
      head: departmentForm.head.trim(),
      employees: Number(departmentForm.employees) || 0,
    };
    if (editingDepartment) {
      setDepartmentRecords((previous) => previous.map((department) => department.id === editingDepartment.id ? { ...department, ...data } : department));
    } else {
      setDepartmentRecords((previous) => [
        ...previous,
        { ...data, id: Math.max(0, ...previous.map((d) => d.id)) + 1, created: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) },
      ]);
    }
    setShowDepartmentForm(false);
    setEditingDepartment(null);
    setDepartmentForm({ ...emptyDepartmentForm });
  }

  function toggleDepartmentStatus(id) {
    setDepartmentRecords((previous) => previous.map((department) => department.id === id ? { ...department, status: department.status === "Active" ? "Inactive" : "Active" } : department));
  }

  function updateStatus(name, status) {
    setRequests((previous) =>
      previous.map((request) =>
        request.name === name ? { ...request, status } : request
      )
    );
  }

  function openEmployeeForm(employee = null) {
    setEditingEmployee(employee);
    setEmployeeForm(
      employee
        ? {
            name: employee.name,
            department: employee.department,
            designation: employee.designation,
            email: employee.email,
            phone: employee.phone,
          }
        : { ...emptyEmployeeForm }
    );
    setShowEmployeeForm(true);
  }

  function saveEmployee(event) {
    event.preventDefault();

    if (editingEmployee) {
      setEmployees((previous) =>
        previous.map((employee) =>
          employee.id === editingEmployee.id
            ? { ...employeeForm, id: employee.id, status: employee.status }
            : employee
        )
      );
    } else {
      const newEmployee = {
        ...employeeForm,
        id: `EMP${String(Date.now()).slice(-6)}`,
        status: "Active",
      };
      setEmployees((previous) => [...previous, newEmployee]);
    }

    setShowEmployeeForm(false);
    setEditingEmployee(null);
    setEmployeeForm({ ...emptyEmployeeForm });
  }

  const filteredBiometricDevices = biometricDevices.filter((device) =>
    `${device.name} ${device.brand} ${device.model} ${device.location} ${device.connection} ${device.status}`
      .toLowerCase()
      .includes(deviceSearch.toLowerCase())
  );

  function openDeviceForm(device = null) {
    setEditingDevice(device);
    setDeviceForm(device ? { ...device } : { ...emptyDeviceForm });
    setShowDeviceForm(true);
  }

  function saveDevice(event) {
    event.preventDefault();
    if (!deviceForm.name.trim()) { window.alert("Please enter a device name or ID."); return; }
    const duplicate = biometricDevices.some((device) => device.name.toLowerCase() === deviceForm.name.trim().toLowerCase() && device.id !== editingDevice?.id);
    if (duplicate) { window.alert("A device with this name or ID already exists."); return; }
    const data = { ...deviceForm, name: deviceForm.name.trim(), brand: deviceForm.brand.trim(), model: deviceForm.model.trim(), location: deviceForm.location.trim() };
    if (editingDevice) {
      setBiometricDevices((previous) => previous.map((device) => device.id === editingDevice.id ? { ...device, ...data } : device));
    } else {
      setBiometricDevices((previous) => [...previous, { ...data, id: Date.now(), lastSync: "Not synced", employees: null, punches: null }]);
    }
    setShowDeviceForm(false); setEditingDevice(null); setDeviceForm({ ...emptyDeviceForm });
  }

  const filteredDesignations = designationRecords.filter((designation) =>
    `${designation.title} ${designation.code} ${(designation.departments || []).join(" ")} ${designation.level}`
      .toLowerCase()
      .includes(designationSearch.toLowerCase())
  );

  function openDesignationForm(designation = null) {
    setEditingDesignation(designation);
    setDesignationForm(
      designation
        ? { ...designation }
        : {
            ...emptyDesignationForm,
            code: `DESG-${String(Math.max(0, ...designationRecords.map((item) => item.id)) + 1).padStart(3, "0")}`,
          }
    );
    setShowDesignationForm(true);
  }

  function saveDesignation(event) {
    event.preventDefault();

    const title = designationForm.title.trim();
    const code = designationForm.code.trim();

    if (!title || !code) {
      window.alert("Please enter the designation title and code.");
      return;
    }

    if (
      designationForm.minSalary !== "" &&
      designationForm.maxSalary !== "" &&
      Number(designationForm.minSalary) > Number(designationForm.maxSalary)
    ) {
      window.alert("Minimum salary cannot be greater than maximum salary.");
      return;
    }

    const duplicateCode = designationRecords.some(
      (item) =>
        item.code.toLowerCase() === code.toLowerCase() &&
        item.id !== editingDesignation?.id
    );

    if (duplicateCode) {
      window.alert("This designation code already exists.");
      return;
    }

    const data = {
      ...designationForm,
      title,
      code,
      departments: [...designationForm.departments],
      description: designationForm.description.trim(),
    };

    if (editingDesignation) {
      setDesignationRecords((previous) =>
        previous.map((item) =>
          item.id === editingDesignation.id ? { ...item, ...data } : item
        )
      );
    } else {
      setDesignationRecords((previous) => [
        ...previous,
        {
          ...data,
          id: Math.max(0, ...previous.map((item) => item.id)) + 1,
        },
      ]);
    }

    setShowDesignationForm(false);
    setEditingDesignation(null);
    setDesignationForm({ ...emptyDesignationForm });
  }

  function toggleDesignationStatus(id) {
    setDesignationRecords((previous) => previous.map((item) => item.id === id ? { ...item, status: item.status === "Active" ? "Inactive" : "Active" } : item));
  }

  function toggleEmployeeStatus(employeeId) {
    setEmployees((previous) =>
      previous.map((employee) =>
        employee.id === employeeId
          ? {
              ...employee,
              status: employee.status === "Active" ? "Inactive" : "Active",
            }
          : employee
      )
    );
  }

  const employeeDepartments = [
    "Engineering",
    "Human Resources",
    "Finance",
    "Operations",
    "Sales",
    "IT",
  ];

  const pageConfigs = {
    "Leave Dashboard": {
      subtitle: "Track and manage employee leave across the organization",
      action: "+ Apply Leave",
      stats: [["TOTAL EMPLOYEES", "—", "Connect employee records"], ["ON LEAVE TODAY", "—", "No attendance data connected"], ["PENDING REQUESTS", "—", "No leave requests available"], ["APPROVED THIS MONTH", "—", "No approvals available"]],
      columns: ["Employee", "Leave Type", "From", "To", "Days", "Status"],
      rows: [],
    },
    "Leave Requests": {
      subtitle: "Submit and track leave applications",
      action: "+ New Leave Request",
      stats: [["TOTAL REQUESTS", "0", "No records"], ["PENDING", "0", "No pending requests"], ["APPROVED", "0", "No approvals"], ["REJECTED", "0", "No rejected requests"]],
      columns: ["Employee", "Employee ID", "Department", "Leave Type", "From", "To", "Days", "Reason", "Status", "Action"],
      rows: [],
    },
    "Leave Approvals": {
      subtitle: "Review and approve pending leave requests",
      action: "Refresh Queue",
      stats: [["PENDING REQUESTS", "0", "No requests awaiting approval"]],
      columns: ["Employee", "Department", "Leave Type", "From", "To", "Days", "Reason", "Applied On", "Status"],
      rows: [],
    },
    "Leave Balance": {
      subtitle: "View employee leave entitlements and balances",
      action: "Export",
      stats: [["TOTAL LEAVE TYPES", "—", "Configure leave policies"], ["AVERAGE BALANCE", "—", "No employee balances"], ["MOST USED", "—", "No usage data"], ["LEAST USED", "—", "No usage data"]],
      columns: ["Employee", "Employee ID", "Department", "Casual Leave", "Sick Leave", "Earned Leave", "Comp Off", "Total Balance"],
      rows: [],
    },
    "Holiday Calendar": {
      subtitle: "Organization holidays and restricted holidays",
      action: "+ Add Holiday",
      stats: [["HOLIDAYS CONFIGURED", "0", "No holidays added"], ["NATIONAL", "0", "No records"], ["REGIONAL", "0", "No records"], ["COMPANY", "0", "No records"]],
      columns: ["Date", "Day", "Holiday Name", "Type", "Applicable To"],
      rows: [],
    },
    "Salary Structure": {
      subtitle: "Configure and assign base pay policies, allowances, and tax/PF deductions",
      action: "+ Create Structure",
      stats: [["TOTAL STRUCTURES", "0", "No salary templates configured"], ["ACTIVE EMPLOYEES ASSIGNED", "0", "No employee assignments"], ["AVERAGE GROUP CTC", "—", "No salary data available"]],
      columns: ["Structure Name", "Base Range (Monthly)", "Allowances", "Deductions", "CTC Range (Annual)", "Employees Assigned", "Actions"],
      rows: [],
    },
    "Payroll Processing": {
      subtitle: "Verify timesheets, calculate monthly payroll, deductions, and payslips",
      action: "Process Payroll",
      stats: [["TOTAL EMPLOYEES", "0", "No employee payroll records"], ["GROSS PAYROLL COST", "—", "No payroll calculation"], ["TOTAL DEDUCTIONS", "—", "No deduction records"], ["NET BANK DISBURSEMENT", "—", "No payroll run"]],
      columns: ["Employee Name", "Basic", "HRA", "DA", "Other Allow.", "Gross Pay", "PF Ded.", "ESIC Ded.", "PT", "TDS", "Net Salary"],
      rows: [],
    },
    "Payslips": {
      subtitle: "Manage and generate monthly employee salary payslips",
      action: "Download PDF",
      stats: [],
      columns: ["Employee ID", "Employee Name", "Department", "Pay Month", "Net Salary", "Status", "Actions"],
      rows: [],
    },
    "Employee Advances": {
      subtitle: "Monitor short-term loans, EMI deductions, and pending manager approvals",
      action: "+ Request Advance",
      stats: [["TOTAL ACTIVE ADVANCES", "—", "No advance records"], ["PENDING APPROVAL", "—", "No pending requests"], ["ACTIVE ADVANCES COUNT", "0", "No employee advances"], ["RECOVERED THIS MONTH", "—", "No recovery records"]],
      columns: ["Employee Name", "Advance Amount", "Request Date", "Purpose", "EMI Amount", "Remaining Balance", "Status", "Actions"],
      rows: [],
    },
    PF: {
      subtitle: "Employee Provident Fund contributions, ECR files, and statutory compliance",
      action: "Generate ECR",
      stats: [["TOTAL PF CONTRIBUTION", "—", "No contribution data"], ["EMPLOYEE SHARE (12%)", "—", "No salary data"], ["EMPLOYER SHARE (12%)", "—", "No contribution data"], ["PENDING FILINGS", "—", "No filing status available"]],
      columns: ["Employee Name", "Employee ID", "UAN Number", "PF Number", "Basic (₹)", "Employee 12%", "Employer 12%", "Total PF", "Status"],
      rows: [],
    },
    ESIC: {
      subtitle: "Manage employee state insurance contributions and challan generation",
      action: "Generate ESIC Challan",
      stats: [["TOTAL ESIC CONTRIBUTION", "—", "No contribution data"], ["EMPLOYEE SHARE (0.75%)", "—", "No salary data"], ["EMPLOYER SHARE (3.25%)", "—", "No contribution data"], ["ELIGIBLE EMPLOYEES", "0", "No employee records"]],
      columns: ["Employee", "ESIC Number", "Gross Salary", "Employee Share (0.75%)", "Employer Share (3.25%)", "Total Contribution", "Status"],
      rows: [],
    },
    "Statutory Reports": {
      subtitle: "Generate, download, and schedule strategic HR and payroll reports",
      action: "Export",
      stats: [["ATTENDANCE REPORTS", "12 Configured", "Logs, device status, metrics"], ["PAYROLL REPORTS", "8 Active", "Allowances, advances, structures"], ["EMPLOYEE REPORTS", "15 Active", "Joining, directory, exits"], ["STATUTORY REPORTS", "6 Compliant", "PF, ESIC, Professional tax"]],
      columns: ["Report Name", "Category", "Frequency", "Report Type", "Actions"],
      rows: [],
    },
  };

  return (
    <div className="min-h-screen bg-[#f1f3f4] text-[#1c2733]">
      {mobileMenuOpen && (
        <button
          aria-label="Close sidebar"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[302px] flex-col border-r border-white/10 bg-[#1b2833] text-[#c7cdd3] transition-transform lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex min-h-[80px] items-center gap-3 px-5">
          <div className="flex h-12 w-[60px] shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#1b2833]">
            <img
              src="/image/Screenshot%202026-10-15%20183343.png"
              alt="ELVA Tech company logo"
              className="h-14 w-14 shrink-0 object-contain"
            />
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-white">ELVA TECH</h1>
            <p className="mt-0.5 text-[11px] text-[#aab3bd]">HR & Payroll Portal</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-3 pt-1">
          {menuSections.map((section) => (
            <div key={section.title} className="mb-4">
              <p className="mb-2 px-2 pt-2 text-[11px] font-bold tracking-wide text-[#758391]">
                {section.title}
              </p>
              <div className="space-y-1">
                {section.items.map(({ label, icon: Icon }) => (
                  <button
                    key={label}
                    onClick={() => {
                      setActivePage(label);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-left text-[13px] transition ${
                      activePage === label
                        ? "bg-[#3076d1] font-semibold text-white"
                        : "text-[#c7cdd3] hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <Icon size={16} strokeWidth={2.2} />
                    <span>{label}</span>
                    {label === "Leave Requests" && pendingCount > 0 && (
                      <span className="ml-auto rounded bg-white/15 px-1.5 py-0.5 text-[10px]">
                        {pendingCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 px-4 py-3 text-center text-xs text-[#aab3bd]">
          Powered by ELVA
        </div>
      </aside>

      <div className="min-h-screen lg:ml-[302px]">
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-[#e0e3e6] bg-white px-4 sm:px-7">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open sidebar"
              className="rounded p-2 hover:bg-slate-100 lg:hidden"
            >
              <Menu size={20} />
            </button>
            <div>
              <p className="hidden text-xs text-slate-500 sm:block">
                HRMS&nbsp; / &nbsp;
                <span className="font-semibold text-slate-800">{activePage}</span>
              </p>
              <h2 className="text-lg font-semibold">{activePage}</h2>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-5">
            <div className="hidden items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 sm:flex">
              <Search size={16} className="text-slate-400" />
              {activePage === "Employee Directory" ? (
                <input
                  value={employeeSearch}
                  onChange={(event) => setEmployeeSearch(event.target.value)}
                  placeholder="Search employees..."
                  className="w-36 bg-transparent text-xs outline-none lg:w-48"
                />
              ) : (
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search leave requests..."
                  className="w-36 bg-transparent text-xs outline-none lg:w-48"
                />
              )}
            </div>
            <button
              aria-label="Notifications"
              className="relative rounded-full p-2 hover:bg-slate-100"
            >
              <Bell size={20} />
              {pendingCount > 0 && (
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
              )}
            </button>
            <div className="hidden h-8 border-l border-slate-200 sm:block" />
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e7edf4] text-xs font-bold">
                ET
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-slate-800">HR Administrator</p>
                <p className="text-[11px] text-slate-500">HR Department</p>
              </div>
              <ChevronDown size={15} className="hidden sm:block" />
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-7">
          {activePage === "Dashboard" ? (
            <>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-2xl font-bold">HR & Operations Overview</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Employee, attendance and leave summary
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
                  Live data will appear after backend integration
                </div>
              </div>

              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
                {[
                  { label: "TOTAL EMPLOYEES", value: employees.length, note: "Live data will appear after backend integration" },
                  { label: "PRESENT TODAY", value: "—", note: "Attendance data not connected" },
                  { label: "OPEN POSITIONS", value: "—", note: "Hiring data not connected" },
                  { label: "PENDING LEAVE REQUESTS", value: pendingCount, note: "Requires Approval" },
                ].map((item, index) => (
                  <div
                    key={item.label}
                    className={`rounded-lg border bg-white p-5 ${
                      index === 3 ? "border-red-400" : "border-[#dedede]"
                    }`}
                  >
                    <p className="text-xs font-semibold text-slate-600">{item.label}</p>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <p className={`text-3xl font-bold ${index === 3 ? "text-red-600" : ""}`}>
                        {item.value}
                      </p>
                      <span className="rounded bg-[#eaf2f8] px-2 py-1 text-xs text-[#205778]">
                        {item.note}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-2">
                <section className="rounded-lg border border-[#dedede] bg-white p-5">
                  <h4 className="mb-5 font-bold">Department Headcount</h4>
                  <div className="space-y-4">
                    {departments.map((department) => (
                      <div key={department.name}>
                        <div className="mb-1.5 flex justify-between text-sm">
                          <span>{department.name}</span>
                          <strong className="text-[#205778]">{department.count} Members</strong>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-[#e9ecec]">
                          <div
                            className="h-full bg-[#205778]"
                            style={{ width: `${(department.count / 420) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-lg border border-[#dedede] bg-white p-5">
                  <h4 className="mb-5 font-bold">Monthly Attendance Rate (%)</h4>
                  <div className="flex h-[210px] items-end justify-around gap-3 border-b border-slate-100 px-2">
                    {attendance.map((item) => (
                      <div
                        key={item.month}
                        className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                      >
                        <div
                          className="w-full max-w-10 rounded-t bg-[#205778]"
                          style={{ height: `${item.rate}%` }}
                        />
                        <span className="whitespace-nowrap text-xs text-slate-500">
                          {item.month} ({item.rate}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <section className="overflow-hidden rounded-lg border border-[#dedede] bg-white">
                <div className="p-5">
                  <h4 className="font-bold">Recent Leave Requests</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[750px] text-left text-sm">
                    <thead className="bg-[#f0f2f3] text-xs">
                      <tr>
                        <th className="px-4 py-3">Employee Name</th>
                        <th className="px-4 py-3">Department</th>
                        <th className="px-4 py-3">Leave Type</th>
                        <th className="px-4 py-3">From</th>
                        <th className="px-4 py-3">To</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRequests.map((request) => (
                        <tr key={request.name} className="border-t border-slate-200">
                          <td className="px-4 py-3">{request.name}</td>
                          <td className="px-4 py-3">{request.department}</td>
                          <td className="px-4 py-3 text-slate-500">{request.type}</td>
                          <td className="px-4 py-3">{request.from}</td>
                          <td className="px-4 py-3">{request.to}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded px-2 py-1 text-xs ${
                                request.status === "Approved"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : request.status === "Rejected"
                                    ? "bg-red-50 text-red-600"
                                    : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {request.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {request.status === "Pending" ? (
                              <div className="flex gap-2 text-xs">
                                <button
                                  onClick={() => updateStatus(request.name, "Approved")}
                                  className="text-emerald-700 hover:underline"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => updateStatus(request.name, "Rejected")}
                                  className="text-red-600 hover:underline"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">Reviewed</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {filteredRequests.length === 0 && (
                        <tr>
                          <td colSpan="7" className="px-4 py-8 text-center text-slate-500">
                            No leave request records available.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          ) : activePage === "Attendance Dashboard" ? (
            <section className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-2xl font-bold">Attendance Dashboard</h3>
                  <p className="mt-1 text-sm text-slate-500">Track employee attendance, biometric activity, exceptions and overtime</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setActivePage("Attendance Regularization")} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50">+ Regularize Attendance</button>
                  <button onClick={() => setActivePage("Attendance Exceptions")} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50">View Exceptions</button>
                  <button onClick={() => setActivePage("Biometric Devices")} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50">Sync Devices</button>
                  <button onClick={() => window.print()} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50">Export</button>
                </div>
              </div>

              <section className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
                  <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-slate-400" />Attendance data and device sync status will appear after backend integration.</span>
                  <button onClick={() => window.alert("Attendance data is not connected yet. Connect the backend to refresh live records.")} className="rounded-md border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50">↻ Refresh</button>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-7">
                  <div><label className="mb-1 block text-xs font-medium text-slate-500">Date</label><input type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></div>
                  <div><label className="mb-1 block text-xs font-medium text-slate-500">Department</label><select value={attendanceDepartment} onChange={(e) => setAttendanceDepartment(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"><option>All Departments</option>{employeeDepartments.map((d) => <option key={d}>{d}</option>)}</select></div>
                  <div><label className="mb-1 block text-xs font-medium text-slate-500">Location</label><select value={attendanceLocation} onChange={(e) => setAttendanceLocation(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"><option>All Locations</option></select></div>
                  <div><label className="mb-1 block text-xs font-medium text-slate-500">Employee</label><select value={attendanceEmployee} onChange={(e) => setAttendanceEmployee(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"><option>All Employees</option>{employees.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.id})</option>)}</select></div>
                  <div><label className="mb-1 block text-xs font-medium text-slate-500">Shift</label><select value={attendanceShift} onChange={(e) => setAttendanceShift(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"><option>All Shifts</option></select></div>
                  <div><label className="mb-1 block text-xs font-medium text-slate-500">Status</label><select value={attendanceStatus} onChange={(e) => setAttendanceStatus(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"><option>All Statuses</option><option>Present</option><option>Absent</option><option>Late</option><option>Half Day</option><option>Missing Punch</option></select></div>
                  <div className="flex items-end"><button onClick={() => window.alert("Filters are ready. Attendance records will be filtered when the backend is connected.")} className="w-full rounded-md bg-[#205778] px-4 py-2 text-sm font-semibold text-white hover:bg-[#17445e]">Apply</button></div>
                </div>
              </section>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 2xl:grid-cols-8">
                {[
                  ["TOTAL EMPLOYEES", employees.length, "text-[#2583bd]"],
                  ["PRESENT", "—", "text-emerald-600"],
                  ["ABSENT", "—", "text-red-600"],
                  ["LATE ARRIVALS", "—", "text-orange-600"],
                  ["HALF DAY", "—", "text-amber-600"],
                  ["MISSING PUNCHES", "—", "text-red-600"],
                  ["OVERTIME HOURS", "—", "text-[#2583bd]"],
                  ["ATTENDANCE %", "—", "text-emerald-600"],
                ].map(([label, value, color]) => <div key={label} className="rounded-lg border border-slate-200 bg-white p-4"><p className="text-[10px] font-bold text-slate-500">{label}</p><p className={`mt-2 text-2xl font-bold ${color}`}>{value}</p><p className="mt-1 text-xs text-slate-400">No live data</p></div>)}
              </div>

              <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
                <section className="rounded-lg border border-slate-200 bg-white p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3"><h4 className="text-lg font-bold">Attendance Trend</h4><div className="flex gap-2">{["7 Days", "30 Days", "This Month"].map((period) => <button key={period} onClick={() => setAttendancePeriod(period)} className={`rounded-md px-3 py-1.5 text-xs ${attendancePeriod === period ? "bg-[#205778] text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}>{period}</button>)}</div></div>
                  <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500"><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-emerald-600" />Present %</span><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-red-600" />Absent %</span><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-orange-600" />Late %</span><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-amber-600" />Half Day %</span></div>
                  <div className="flex min-h-44 items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center"><div><p className="font-semibold text-slate-700">No attendance trend available</p><p className="mt-1 text-sm text-slate-500">{attendancePeriod} data will appear when attendance records are connected.</p></div></div>
                </section>

                <section className="overflow-hidden rounded-lg border border-slate-200 bg-white p-5">
                  <h4 className="text-lg font-bold">Department Attendance</h4>
                  <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[580px] text-left text-xs"><thead className="bg-slate-50 text-slate-700"><tr>{["Department", "Total", "Present", "Absent", "Late", "Attendance %"].map((heading) => <th key={heading} className="px-3 py-3">{heading}</th>)}</tr></thead><tbody><tr><td colSpan="6" className="border-t border-slate-200 px-3 py-10 text-center text-sm text-slate-500">No department attendance records available.</td></tr></tbody></table></div>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-5">
                  <h4 className="text-lg font-bold">Attention Required</h4>
                  <div className="mt-4 rounded-md bg-slate-50 p-5 text-sm text-slate-500">No attendance exceptions are available. Connect attendance data to identify missing punches, late arrivals, regularization requests, biometric issues, and overtime approvals.</div>
                  <div className="mt-4 flex flex-wrap gap-2"><button onClick={() => setActivePage("Attendance Exceptions")} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50">Review Exceptions</button><button onClick={() => setActivePage("Attendance Regularization")} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50">Review Regularization</button></div>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-5">
                  <h4 className="text-lg font-bold">Biometric System Health</h4>
                  <div className="mt-4 space-y-4 text-sm"><div className="flex justify-between gap-3"><span className="text-slate-500">Total Devices</span><span className="font-semibold">—</span></div><div className="flex justify-between gap-3"><span className="text-slate-500">Online</span><span className="font-semibold text-emerald-600">—</span></div><div className="flex justify-between gap-3"><span className="text-slate-500">Offline</span><span className="font-semibold text-red-600">—</span></div><div className="flex justify-between gap-3"><span className="text-slate-500">Sync Issues</span><span className="font-semibold text-orange-600">—</span></div></div>
                  <p className="mt-4 border-t border-slate-200 pt-3 text-xs text-slate-500">Device status and last sync time are unavailable until device integration.</p><button onClick={() => setActivePage("Biometric Devices")} className="mt-4 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50">View Devices</button>
                </section>
              </div>
            </section>
          ) : activePage === "Employee Directory" ? (
            <>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-2xl font-bold">Employee Directory</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Add, search, edit and manage employee records.
                  </p>
                </div>
                <button
                  onClick={() => openEmployeeForm()}
                  className="inline-flex items-center gap-2 rounded-md bg-[#3076d1] px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <Plus size={17} />
                  Add Employee
                </button>
              </div>

              <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-[#dedede] bg-white p-4">
                  <p className="text-xs font-semibold text-slate-500">TOTAL EMPLOYEES</p>
                  <p className="mt-2 text-2xl font-bold">{employees.length}</p>
                </div>
                <div className="rounded-lg border border-[#dedede] bg-white p-4">
                  <p className="text-xs font-semibold text-slate-500">ACTIVE EMPLOYEES</p>
                  <p className="mt-2 text-2xl font-bold text-emerald-700">
                    {employees.filter((employee) => employee.status === "Active").length}
                  </p>
                </div>
                <div className="rounded-lg border border-[#dedede] bg-white p-4">
                  <p className="text-xs font-semibold text-slate-500">INACTIVE EMPLOYEES</p>
                  <p className="mt-2 text-2xl font-bold text-slate-500">
                    {employees.filter((employee) => employee.status === "Inactive").length}
                  </p>
                </div>
              </div>

              <section className="overflow-hidden rounded-lg border border-[#dedede] bg-white">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
                  <h4 className="font-bold">Employee Records</h4>
                  <div className="flex items-center gap-2">
                    <label htmlFor="department-filter" className="text-sm text-slate-600">
                      Department
                    </label>
                    <select
                      id="department-filter"
                      value={departmentFilter}
                      onChange={(event) => setDepartmentFilter(event.target.value)}
                      className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                    >
                      <option value="All">All Departments</option>
                      {employeeDepartments.map((department) => (
                        <option key={department} value={department}>
                          {department}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[950px] text-left text-sm">
                    <thead className="bg-[#f0f2f3] text-xs text-slate-600">
                      <tr>
                        <th className="px-4 py-3">Employee ID</th>
                        <th className="px-4 py-3">Employee</th>
                        <th className="px-4 py-3">Department</th>
                        <th className="px-4 py-3">Designation</th>
                        <th className="px-4 py-3">Contact</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEmployees.map((employee) => (
                        <tr key={employee.id} className="border-t border-slate-200 hover:bg-slate-50">
                          <td className="px-4 py-4 font-medium text-[#205778]">{employee.id}</td>
                          <td className="px-4 py-4">
                            <p className="font-semibold">{employee.name}</p>
                            <p className="mt-1 text-xs text-slate-500">{employee.email}</p>
                          </td>
                          <td className="px-4 py-4">{employee.department}</td>
                          <td className="px-4 py-4">{employee.designation}</td>
                          <td className="px-4 py-4">{employee.phone}</td>
                          <td className="px-4 py-4">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                employee.status === "Active"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {employee.status}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-wrap items-center gap-3">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedEmployee(employee);
                                  setProfileTab("Personal Info");
                                  setActivePage("Employee Profile");
                                }}
                                title="View employee profile"
                                aria-label={`View ${employee.name} profile`}
                                className="inline-flex items-center gap-1 rounded-md bg-[#205778] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#17445e]"
                              >
                                <Eye size={15} />
                                View
                              </button>
                              <button
                                onClick={() => openEmployeeForm(employee)}
                                title="Edit employee"
                                aria-label={`Edit ${employee.name}`}
                                className="text-blue-700 hover:text-blue-900"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                onClick={() => toggleEmployeeStatus(employee.id)}
                                className={`text-xs font-medium ${
                                  employee.status === "Active"
                                    ? "text-red-600 hover:text-red-800"
                                    : "text-emerald-700 hover:text-emerald-900"
                                }`}
                              >
                                {employee.status === "Active" ? "Deactivate" : "Activate"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredEmployees.length === 0 && (
                        <tr>
                          <td colSpan="7" className="px-4 py-10 text-center text-slate-500">
                            No employee records available. Add a verified employee or connect the backend.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              {showEmployeeForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                  <section className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-200 p-5">
                      <div>
                        <h3 className="text-lg font-bold">
                          {editingEmployee ? "Edit Employee" : "Add Employee"}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          Enter the employee details below.
                        </p>
                      </div>
                      <button
                        onClick={() => setShowEmployeeForm(false)}
                        aria-label="Close employee form"
                        className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
                      >
                        <X size={19} />
                      </button>
                    </div>

                    <form onSubmit={saveEmployee} className="space-y-4 p-5">
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
                          className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
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
                            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                          >
                            {employeeDepartments.map((department) => (
                              <option key={department} value={department}>
                                {department}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label htmlFor="employee-designation" className="mb-1.5 block text-sm font-medium">
                            Designation *
                          </label>
                          <input
                            id="employee-designation"
                            required
                            value={employeeForm.designation}
                            onChange={(event) =>
                              setEmployeeForm({ ...employeeForm, designation: event.target.value })
                            }
                            placeholder="e.g. HR Executive"
                            className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                          />
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
                          className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
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
                          className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                        <button
                          type="button"
                          onClick={() => setShowEmployeeForm(false)}
                          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="rounded-md bg-[#3076d1] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                        >
                          {editingEmployee ? "Save Changes" : "Add Employee"}
                        </button>
                      </div>
                    </form>
                  </section>
                </div>
              )}
            </>
          ) : activePage === "Designations" ? (
            <section className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-bold">Designations</h3>
                  <p className="mt-1 text-sm text-slate-500">Create and manage job titles and designation levels.</p>
                </div>
                <button
                  type="button"
                  onClick={() => openDesignationForm()}
                  className="inline-flex items-center gap-2 rounded-md bg-[#205778] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#17445e]"
                >
                  <Plus size={17} /> Add Designation
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-[#dedede] bg-white p-5">
                  <p className="text-xs font-semibold text-slate-600">TOTAL DESIGNATIONS</p>
                  <p className="mt-3 text-3xl font-bold">{designationRecords.length}</p>
                </div>
                <div className="rounded-lg border border-[#dedede] bg-white p-5">
                  <p className="text-xs font-semibold text-slate-600">ACTIVE DESIGNATIONS</p>
                  <p className="mt-3 text-3xl font-bold text-emerald-700">{designationRecords.filter((item) => item.status === "Active").length}</p>
                </div>
                <div className="rounded-lg border border-[#dedede] bg-white p-5">
                  <p className="text-xs font-semibold text-slate-600">INACTIVE DESIGNATIONS</p>
                  <p className="mt-3 text-3xl font-bold text-slate-500">{designationRecords.filter((item) => item.status === "Inactive").length}</p>
                </div>
              </div>

              <section className="overflow-hidden rounded-lg border border-[#dedede] bg-white">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
                  <h4 className="font-bold">Designation Records</h4>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                    <Search size={16} className="text-slate-400" />
                    <input value={designationSearch} onChange={(event) => setDesignationSearch(event.target.value)} placeholder="Search designations..." className="w-44 bg-transparent text-sm outline-none" />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Code</th>
                        <th className="px-4 py-3">Designation</th>
                        <th className="px-4 py-3">Department</th>
                        <th className="px-4 py-3">Level</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredDesignations.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-4 py-4 font-medium text-slate-700">{item.code}</td>
                          <td className="px-4 py-4"><p className="font-semibold text-slate-800">{item.title}</p><p className="mt-1 max-w-xs text-xs text-slate-500">{item.description || "No description provided."}</p></td>
                          <td className="px-4 py-4">{(item.departments || []).join(", ") || "Not assigned"}</td>
                          <td className="px-4 py-4">{item.level || "Not specified"}</td>
                          <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{item.status}</span></td>
                          <td className="px-4 py-4"><div className="flex items-center gap-2"><button type="button" onClick={() => openDesignationForm(item)} title="Edit designation" aria-label={`Edit ${item.title}`} className="rounded-md border border-slate-300 p-2 hover:bg-slate-100"><Pencil size={15} /></button><button type="button" onClick={() => toggleDesignationStatus(item.id)} className={`text-xs font-semibold ${item.status === "Active" ? "text-red-600 hover:underline" : "text-emerald-700 hover:underline"}`}>{item.status === "Active" ? "Deactivate" : "Activate"}</button></div></td>
                        </tr>
                      ))}
                      {filteredDesignations.length === 0 && (
                        <tr><td colSpan="6" className="px-4 py-12 text-center"><p className="font-semibold text-slate-700">No designations found</p><p className="mt-1 text-sm text-slate-500">Add a designation to get started. No sample records have been added.</p></td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              {showDesignationForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                  <section className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                      <h3 className="text-2xl font-bold text-slate-800">
                        {editingDesignation ? "Edit Designation" : "Create New Designation"}
                      </h3>
                      <button type="button" onClick={() => setShowDesignationForm(false)} aria-label="Close designation form" className="rounded-full p-2 hover:bg-slate-100">
                        <X size={20} />
                      </button>
                    </div>

                    <form onSubmit={saveDesignation} className="space-y-5 p-6">
                      <div>
                        <label htmlFor="designation-title" className="mb-2 block text-sm font-semibold">Designation Title <span className="text-red-500">*</span></label>
                        <input id="designation-title" required value={designationForm.title} onChange={(e) => setDesignationForm({ ...designationForm, title: e.target.value })} placeholder="Enter designation title..." className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#205778]" />
                      </div>

                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <div>
                          <label htmlFor="designation-code" className="mb-2 block text-sm font-semibold">Designation Code</label>
                          <input id="designation-code" value={designationForm.code} onChange={(e) => setDesignationForm({ ...designationForm, code: e.target.value })} className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#205778]" />
                        </div>
                        <div>
                          <label htmlFor="designation-level" className="mb-2 block text-sm font-semibold">Grade / Level</label>
                          <select id="designation-level" value={designationForm.level} onChange={(e) => setDesignationForm({ ...designationForm, level: e.target.value })} className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm">
                            <option value="L1 - Entry Level">L1 - Entry Level</option>
                            <option value="L2 - Junior">L2 - Junior</option>
                            <option value="L3 - Mid Level">L3 - Mid Level</option>
                            <option value="L4 - Senior">L4 - Senior</option>
                            <option value="L5 - Mid-Senior">L5 - Mid-Senior</option>
                            <option value="L6 - Manager">L6 - Manager</option>
                            <option value="L7 - Leadership">L7 - Leadership</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <p className="mb-2 text-sm font-semibold">Assign to Departments</p>
                        <div className="space-y-3 rounded-lg border border-slate-300 bg-slate-50 p-4">
                          {["Engineering", "Human Resources", "Finance", "Operations", "Sales", "IT"].map((department) => (
                            <label key={department} className="flex cursor-pointer items-center gap-3 text-sm">
                              <input type="checkbox" checked={designationForm.departments.includes(department)} onChange={(e) => {
                                const departments = e.target.checked
                                  ? [...designationForm.departments, department]
                                  : designationForm.departments.filter((item) => item !== department);
                                setDesignationForm({ ...designationForm, departments });
                              }} className="h-4 w-4 accent-[#205778]" />
                              {department}
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <div>
                          <label htmlFor="designation-min-salary" className="mb-2 block text-sm font-semibold">Min Salary (LPA)</label>
                          <input id="designation-min-salary" type="number" min="0" step="0.01" value={designationForm.minSalary} onChange={(e) => setDesignationForm({ ...designationForm, minSalary: e.target.value })} placeholder="0.00" className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm" />
                        </div>
                        <div>
                          <label htmlFor="designation-max-salary" className="mb-2 block text-sm font-semibold">Max Salary (LPA)</label>
                          <input id="designation-max-salary" type="number" min="0" step="0.01" value={designationForm.maxSalary} onChange={(e) => setDesignationForm({ ...designationForm, maxSalary: e.target.value })} placeholder="0.00" className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm" />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="designation-description" className="mb-2 block text-sm font-semibold">Description</label>
                        <textarea id="designation-description" rows={4} value={designationForm.description} onChange={(e) => setDesignationForm({ ...designationForm, description: e.target.value })} placeholder="Provide role details and main responsibilities..." className="w-full resize-y rounded-lg border border-slate-300 px-4 py-3 text-sm" />
                      </div>

                      <label className="flex items-center justify-between gap-4">
                        <span><span className="block text-sm font-semibold">Status</span><span className="text-xs text-slate-500">Toggle initial designation state</span></span>
                        <input type="checkbox" checked={designationForm.status === "Active"} onChange={(e) => setDesignationForm({ ...designationForm, status: e.target.checked ? "Active" : "Inactive" })} className="h-5 w-10 cursor-pointer accent-emerald-600" />
                      </label>

                      <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
                        <button type="button" onClick={() => setShowDesignationForm(false)} className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold hover:bg-slate-50">Cancel</button>
                        <button type="submit" className="rounded-lg bg-[#205778] px-5 py-3 text-sm font-semibold text-white hover:bg-[#17445e]">{editingDesignation ? "Save Changes" : "Create Designation"}</button>
                      </div>
                    </form>
                  </section>
                </div>
              )}

            </section>
          ) : activePage === "Daily Attendance" ? (
            <section className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-2xl font-bold">Daily Attendance</h3>
                  <p className="mt-1 text-sm text-slate-500">Review and manage attendance for {new Date(`${attendanceDate}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                {[
                  ["TOTAL EMPLOYEES", String(employees.length), "text-[#2583bd]"],
                  ["PRESENT", "—", "text-emerald-600"],
                  ["ABSENT", "—", "text-red-600"],
                  ["LATE", "—", "text-orange-600"],
                  ["HALF DAY", "—", "text-amber-600"],
                  ["MISSING PUNCH", "—", "text-red-600"],
                ].map(([label, value, color]) => (
                  <div key={label} className="rounded-lg border border-slate-200 bg-white p-4">
                    <p className="text-[10px] font-bold text-slate-500">{label}</p>
                    <p className={`mt-2 text-2xl font-bold ${color}`}>{value}</p>
                  </div>
                ))}
              </div>

              <section className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-slate-500">Attendance records will appear here when verified data is connected.</p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => window.print()} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50">Export</button>
                    <button type="button" onClick={() => window.print()} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50">Print</button>
                    <button type="button" onClick={() => window.alert("Bulk approval will be available after attendance records and permissions are connected.")} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50">Bulk Approve</button>
                    <button type="button" onClick={() => window.alert("Attendance data is not connected yet. Connect the backend to refresh live records.")} className="rounded-md bg-[#205778] px-3 py-2 text-sm font-semibold text-white hover:bg-[#17445e]">Refresh Attendance</button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
                  <div><label htmlFor="daily-date" className="mb-1 block text-xs font-medium text-slate-500">Date</label><input id="daily-date" type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-3 text-sm" /></div>
                  <div><label htmlFor="daily-department" className="mb-1 block text-xs font-medium text-slate-500">Department</label><select id="daily-department" value={attendanceDepartment} onChange={(e) => setAttendanceDepartment(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-sm"><option>All Departments</option>{[...new Set([...employeeDepartments, ...departmentRecords.map((d) => d.name)])].map((d) => <option key={d}>{d}</option>)}</select></div>
                  <div><label htmlFor="daily-location" className="mb-1 block text-xs font-medium text-slate-500">Location</label><select id="daily-location" value={attendanceLocation} onChange={(e) => setAttendanceLocation(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-sm"><option>All Locations</option></select></div>
                  <div><label htmlFor="daily-shift" className="mb-1 block text-xs font-medium text-slate-500">Shift</label><select id="daily-shift" value={attendanceShift} onChange={(e) => setAttendanceShift(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-sm"><option>All Shifts</option></select></div>
                  <div><label htmlFor="daily-status" className="mb-1 block text-xs font-medium text-slate-500">Status</label><select id="daily-status" value={attendanceStatus} onChange={(e) => setAttendanceStatus(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-sm"><option>All Statuses</option><option>Present</option><option>Absent</option><option>Late</option><option>Half Day</option><option>Missing Punch</option></select></div>
                  <div><label htmlFor="daily-employee-search" className="mb-1 block text-xs font-medium text-slate-500">Search Employee</label><input id="daily-employee-search" value={attendanceEmployee === "All Employees" ? "" : attendanceEmployee} onChange={(e) => setAttendanceEmployee(e.target.value || "All Employees")} placeholder="Name or ID" className="w-full rounded-md border border-slate-300 px-3 py-3 text-sm" /></div>
                </div>
              </section>

              <section className="overflow-hidden rounded-lg border border-slate-200 bg-white p-4">
                <h4 className="mb-4 text-lg font-bold">Employee Attendance</h4>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1200px] text-left text-xs">
                    <thead className="bg-slate-50 text-slate-700"><tr>{["Employee ID", "Employee", "Department", "Location", "Shift", "First In", "Last Out", "Working Hours", "Status", "Actions"].map((heading) => <th key={heading} className="whitespace-nowrap px-3 py-3 font-bold">{heading}</th>)}</tr></thead>
                    <tbody>
                      <tr><td colSpan={10} className="border-t border-slate-200 px-4 py-14 text-center"><p className="font-semibold text-slate-700">No attendance records available</p><p className="mt-1 text-sm text-slate-500">Verified daily attendance records will appear here after backend integration. No sample employees have been added.</p></td></tr>
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 text-xs text-slate-500">
                  <span>Showing 0 records</span>
                  <div className="flex items-center gap-2"><button type="button" disabled className="rounded-md border border-slate-300 px-3 py-2 disabled:opacity-40">Prev</button><span className="rounded-md bg-[#205778] px-3 py-2 font-semibold text-white">1</span><button type="button" disabled className="rounded-md border border-slate-300 px-3 py-2 disabled:opacity-40">Next</button></div>
                </div>
              </section>
            </section>
          
          ) : activePage === "Attendance Exceptions" ? (
            <section className="space-y-5">
              <div>
                <h3 className="text-2xl font-bold text-slate-800">
                  Attendance Exceptions
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Review attendance discrepancies and correction requests.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-3">
                <label className="text-sm font-medium text-slate-600">
                  From date
                  <input
                    type="date"
                    className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2"
                  />
                </label>

                <label className="text-sm font-medium text-slate-600">
                  To date
                  <input
                    type="date"
                    className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2"
                  />
                </label>

                <label className="text-sm font-medium text-slate-600">
                  Exception type
                  <select className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2">
                    <option>All exception types</option>
                    <option>Missing punch</option>
                    <option>Late arrival</option>
                    <option>Early departure</option>
                    <option>Absent record</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[
                  ["Total Exceptions", "—"],
                  ["Pending Review", "—"],
                  ["Resolved", "—"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-slate-200 bg-white p-5"
                  >
                    <p className="text-sm font-medium text-slate-500">
                      {label}
                    </p>
                    <p className="mt-3 text-2xl font-bold text-[#205778]">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="border-b border-slate-200 p-5">
                  <h4 className="font-bold text-slate-800">
                    Exception Records
                  </h4>
                  <p className="mt-1 text-sm text-slate-500">
                    Records will appear when verified attendance data is connected.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px] text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        {[
                          "Employee ID",
                          "Employee",
                          "Date",
                          "Exception Type",
                          "Details",
                          "Status",
                          "Action",
                        ].map((heading) => (
                          <th key={heading} className="px-4 py-3 font-semibold">
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-12 text-center text-slate-500"
                        >
                          No attendance exceptions available.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            </section>
          
          ) : activePage === "Employee Attendance" ? (
            <section className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-2xl font-bold text-slate-800">
                    Employee Attendance
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Review employee check-in, check-out, and daily attendance.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                >
                  Export / Print
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-4">
                <label className="text-sm font-medium text-slate-600">
                  Date
                  <input
                    type="date"
                    className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2"
                  />
                </label>

                <label className="text-sm font-medium text-slate-600">
                  Department
                  <select className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2">
                    <option>All Departments</option>
                    {departmentRecords.map((department) => (
                      <option key={department.id} value={department.name}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-medium text-slate-600">
                  Attendance Status
                  <select className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2">
                    <option>All Statuses</option>
                    <option>Present</option>
                    <option>Absent</option>
                    <option>Late</option>
                    <option>On Leave</option>
                  </select>
                </label>

                <label className="text-sm font-medium text-slate-600">
                  Search Employee
                  <input
                    type="search"
                    placeholder="Employee name or ID"
                    className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ["Total Employees", employees.length],
                  ["Present", "—"],
                  ["Absent", "—"],
                  ["Late Arrivals", "—"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-slate-200 bg-white p-5"
                  >
                    <p className="text-sm font-medium text-slate-500">
                      {label}
                    </p>
                    <p className="mt-3 text-2xl font-bold text-[#205778]">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="border-b border-slate-200 p-5">
                  <h4 className="font-bold text-slate-800">
                    Employee Attendance Records
                  </h4>
                  <p className="mt-1 text-sm text-slate-500">
                    Records will appear when verified attendance data is available.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        {[
                          "Employee ID",
                          "Employee Name",
                          "Department",
                          "Date",
                          "Check In",
                          "Check Out",
                          "Working Hours",
                          "Status",
                        ].map((heading) => (
                          <th key={heading} className="whitespace-nowrap px-4 py-3">
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td
                          colSpan={8}
                          className="px-4 py-12 text-center text-slate-500"
                        >
                          No employee attendance records available.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            </section>

          ) : activePage === "Monthly Attendance" ? (
            <section className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-2xl font-bold">Monthly Attendance</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Review attendance records for a selected month.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                >
                  Export / Print
                </button>
              </div>

              <section className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-600">
                  Month
                  <input
                    type="month"
                    defaultValue=""
                    className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </label>
                <label className="text-sm font-medium text-slate-600">
                  Department
                  <select className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm">
                    <option>All Departments</option>
                    {departmentRecords.map((department) => (
                      <option key={department.id} value={department.name}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                </label>
              </section>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                {[
                  ["TOTAL EMPLOYEES", employees.length],
                  ["PRESENT DAYS", "—"],
                  ["ABSENT DAYS", "—"],
                  ["LATE ARRIVALS", "—"],
                  ["LEAVE DAYS", "—"],
                  ["ATTENDANCE RATE", "—"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-lg border border-slate-200 bg-white p-4"
                  >
                    <p className="text-xs font-bold text-slate-500">{label}</p>
                    <p className="mt-3 text-2xl font-bold text-[#205778]">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                <div className="border-b border-slate-200 p-5">
                  <h4 className="font-bold">Monthly Attendance Records</h4>
                  <p className="mt-1 text-sm text-slate-500">
                    Attendance figures will appear when verified attendance
                    data is available.
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs text-slate-600">
                      <tr>
                        {[
                          "Employee ID",
                          "Employee Name",
                          "Department",
                          "Working Days",
                          "Present",
                          "Absent",
                          "Leave",
                          "Attendance %",
                        ].map((heading) => (
                          <th key={heading} className="whitespace-nowrap px-4 py-3">
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td
                          colSpan={8}
                          className="px-4 py-12 text-center text-slate-500"
                        >
                          No monthly attendance records available. Connect
                          verified attendance data to populate this table.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
                  Showing 0 attendance records
                </div>
              </section>
            </section>

          ) : activePage === "Employee Profile" && selectedEmployee ? (
            <section className="space-y-6">
              <button
                type="button"
                onClick={() => setActivePage("Employee Directory")}
                className="inline-flex items-center rounded-md text-sm font-semibold text-[#205778] hover:underline"
              >
                ← Back to Employee Directory
              </button>

              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Employee Profile</p>
                    <h3 className="mt-2 text-2xl font-bold text-slate-800">{selectedEmployee.name || "Name not provided"}</h3>
                    <p className="mt-1 text-sm text-slate-500">Employee ID: {selectedEmployee.id || "Not provided"}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${selectedEmployee.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                    {selectedEmployee.status || "Status not provided"}
                  </span>
                </div>
                <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    ["Department", selectedEmployee.department],
                    ["Designation", selectedEmployee.designation],
                    ["Email Address", selectedEmployee.email],
                    ["Phone Number", selectedEmployee.phone],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-slate-50 p-4">
                      <p className="text-xs font-medium text-slate-500">{label}</p>
                      <p className="mt-2 break-words text-sm font-semibold text-slate-800">{value || "Not provided"}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {["Personal Info", "Employment", "Documents", "Salary", "Attendance", "Leave"].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setProfileTab(tab)}
                    className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${profileTab === tab ? "bg-[#205778] text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h4 className="text-lg font-bold text-slate-800">{profileTab}</h4>
                {profileTab === "Personal Info" ? (
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {[["Full Name", selectedEmployee.name], ["Email Address", selectedEmployee.email], ["Phone Number", selectedEmployee.phone]].map(([label, value]) => (
                      <div key={label} className="border-b border-slate-100 pb-3">
                        <p className="text-xs text-slate-500">{label}</p>
                        <p className="mt-1 text-sm font-medium text-slate-800">{value || "Not provided"}</p>
                      </div>
                    ))}
                    <p className="text-sm text-slate-500 sm:col-span-2">Address, emergency contact, and bank details are not available yet.</p>
                  </div>
                ) : (
                  <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
                    <p className="font-medium text-slate-700">No {profileTab.toLowerCase()} information available</p>
                    <p className="mt-1 text-sm text-slate-500">This information can be displayed after verified employee data or backend integration is available.</p>
                  </div>
                )}
              </div>
            </section>
          ) : activePage === "Departments" ? (
            <section className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-bold">Departments</h3>
                  <p className="mt-1 text-sm text-slate-500">Manage organizational departments and team structure.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <Search size={16} className="text-slate-400" />
                    <input value={departmentSearch} onChange={(event) => setDepartmentSearch(event.target.value)} placeholder="Search departments..." className="w-40 bg-transparent text-sm outline-none sm:w-52" />
                  </div>
                  <button onClick={() => openDepartmentForm()} className="inline-flex items-center gap-2 rounded-md bg-[#205778] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#17445e]">
                    <Plus size={17} /> Create Department
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
                {[
                  { label: "TOTAL DEPARTMENTS", value: departmentRecords.length, note: "All Registered" },
                  { label: "ACTIVE DEPARTMENTS", value: departmentRecords.filter((d) => d.status === "Active").length, note: "Operations Online" },
                  { label: "TOTAL EMPLOYEES", value: departmentRecords.reduce((sum, d) => sum + Number(d.employees || 0), 0), note: "Assigned Staff" },
                  { label: "AVG TEAM SIZE", value: departmentRecords.length ? Math.round(departmentRecords.reduce((sum, d) => sum + Number(d.employees || 0), 0) / departmentRecords.length) : 0, note: "Average Capacity" },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg border border-[#dedede] bg-white p-5">
                    <p className="text-xs font-semibold text-slate-600">{item.label}</p>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-3xl font-bold">{item.value}</p>
                      <span className="rounded bg-[#eaf2f8] px-2 py-1 text-xs text-[#205778]">{item.note}</span>
                    </div>
                  </div>
                ))}
              </div>

              {filteredDepartments.length ? (
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                  {filteredDepartments.map((department) => (
                    <article key={department.id} className="rounded-lg border border-[#dedede] bg-white p-6 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="text-xl font-bold">{department.name}</h4>
                          <p className="mt-1 text-sm text-slate-500">Code: <span className="font-medium text-slate-700">{department.code}</span></p>
                          <p className="mt-1 text-sm text-slate-600">Head: <span className="font-semibold text-slate-800">{department.head || "Not assigned"}</span></p>
                        </div>
                        <span className={`rounded-md px-3 py-1 text-xs font-semibold ${department.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{department.status}</span>
                      </div>
                      <p className="mt-5 min-h-12 text-sm leading-6 text-slate-600">{department.description || "No department description provided."}</p>
                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                        <div>
                          <p className="font-semibold text-slate-800"><Users size={16} className="mr-2 inline" />{department.employees} Employees</p>
                          <p className="mt-1 text-xs text-slate-400">Created: {department.created || "Recently"}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => setSelectedDepartment(department)} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50">View Details</button>
                          <button onClick={() => openDepartmentForm(department)} aria-label={`Edit ${department.name}`} title="Edit department" className="rounded-md border border-slate-300 p-2 hover:bg-slate-50"><Pencil size={16} /></button>
                          <button onClick={() => toggleDepartmentStatus(department.id)} className={`rounded-md px-3 py-2 text-sm font-medium ${department.status === "Active" ? "text-red-600 hover:bg-red-50" : "text-emerald-700 hover:bg-emerald-50"}`}>{department.status === "Active" ? "Deactivate" : "Activate"}</button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-[#dedede] bg-white p-10 text-center text-slate-500">No departments found. Try another search.</div>
              )}

              {showDepartmentForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                  <section className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-200 p-5">
                      <div><h3 className="text-xl font-bold">{editingDepartment ? "Edit Department" : "Create New Department"}</h3><p className="mt-1 text-sm text-slate-500">Enter department information below.</p></div>
                      <button onClick={() => setShowDepartmentForm(false)} aria-label="Close department form" className="rounded-md p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button>
                    </div>
                    <form onSubmit={saveDepartment} className="space-y-4 p-5">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1.5fr_0.8fr]">
                        <div><label htmlFor="department-name" className="mb-1.5 block text-sm font-medium">Department Name *</label><input id="department-name" required value={departmentForm.name} onChange={(event) => setDepartmentForm({ ...departmentForm, name: event.target.value })} placeholder="e.g. Quality Assurance" className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500" /></div>
                        <div><label htmlFor="department-code" className="mb-1.5 block text-sm font-medium">Department Code *</label><input id="department-code" required value={departmentForm.code} onChange={(event) => setDepartmentForm({ ...departmentForm, code: event.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500" /></div>
                      </div>
                      <div><label htmlFor="department-head" className="mb-1.5 block text-sm font-medium">Department Head</label><input id="department-head" value={departmentForm.head} onChange={(event) => setDepartmentForm({ ...departmentForm, head: event.target.value })} placeholder="Enter department head" className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500" /></div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div><label htmlFor="department-count" className="mb-1.5 block text-sm font-medium">Initial Staff Count</label><input id="department-count" type="number" min="0" value={departmentForm.employees} onChange={(event) => setDepartmentForm({ ...departmentForm, employees: event.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500" /></div>
                        <div><label htmlFor="department-parent" className="mb-1.5 block text-sm font-medium">Parent Department</label><select id="department-parent" value={departmentForm.parent} onChange={(event) => setDepartmentForm({ ...departmentForm, parent: event.target.value })} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"><option value="">None</option>{departmentRecords.filter((d) => d.id !== editingDepartment?.id).map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}</select></div>
                      </div>
                      <div><label htmlFor="department-description" className="mb-1.5 block text-sm font-medium">Description</label><textarea id="department-description" rows="3" value={departmentForm.description} onChange={(event) => setDepartmentForm({ ...departmentForm, description: event.target.value })} placeholder="Brief description of department responsibilities..." className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500" /></div>
                      <div className="flex items-center gap-3"><span className="text-sm font-medium">Status</span><select value={departmentForm.status} onChange={(event) => setDepartmentForm({ ...departmentForm, status: event.target.value })} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"><option>Active</option><option>Inactive</option></select></div>
                      <div className="flex justify-end gap-3 border-t border-slate-200 pt-4"><button type="button" onClick={() => setShowDepartmentForm(false)} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50">Cancel</button><button type="submit" className="rounded-md bg-[#205778] px-4 py-2 text-sm font-semibold text-white hover:bg-[#17445e]">{editingDepartment ? "Save Changes" : "Create Department"}</button></div>
                    </form>
                  </section>
                </div>
              )}

              {selectedDepartment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                  <section className="w-full max-w-lg rounded-xl bg-white shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-200 p-5"><h3 className="text-xl font-bold">Department Details</h3><button onClick={() => setSelectedDepartment(null)} aria-label="Close details" className="rounded-md p-2 hover:bg-slate-100"><X size={20} /></button></div>
                    <div className="space-y-3 p-5 text-sm">
                      <p><span className="text-slate-500">Name:</span> <strong>{selectedDepartment.name}</strong></p><p><span className="text-slate-500">Code:</span> <strong>{selectedDepartment.code}</strong></p><p><span className="text-slate-500">Department Head:</span> <strong>{selectedDepartment.head || "Not assigned"}</strong></p><p><span className="text-slate-500">Employees:</span> <strong>{selectedDepartment.employees}</strong></p><p><span className="text-slate-500">Parent Department:</span> <strong>{selectedDepartment.parent || "None"}</strong></p><p><span className="text-slate-500">Status:</span> <strong>{selectedDepartment.status}</strong></p><p><span className="text-slate-500">Description:</span> {selectedDepartment.description || "No description provided."}</p>
                    </div>
                    <div className="flex justify-end p-5 pt-0"><button onClick={() => setSelectedDepartment(null)} className="rounded-md bg-[#205778] px-4 py-2 text-sm font-semibold text-white">Close</button></div>
                  </section>
                </div>
              )}
            </section>
          ) : activePage === "Biometric Devices" ? (
            <section className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-2xl font-bold">Biometric Devices</h3>
                  <p className="mt-1 text-sm text-slate-500">Monitor biometric machines and attendance synchronization</p>
                </div>
                <button type="button" onClick={() => openDeviceForm()} className="rounded-md bg-[#205778] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#17445e]">+ Add Device</button>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                {[
                  ["TOTAL DEVICES", String(biometricDevices.length), "text-[#2583bd]"],
                  ["ONLINE", "—", "text-emerald-600"],
                  ["OFFLINE", "—", "text-red-600"],
                  ["SYNC ERRORS", "—", "text-orange-600"],
                  ["LAST SYNC", "Unavailable", "text-[#2583bd]"],
                  ["EMPLOYEES SYNCED", "—", "text-emerald-600"],
                ].map(([label, value, color]) => (
                  <div key={label} className="rounded-lg border border-slate-200 bg-white p-4">
                    <p className="text-[10px] font-bold text-slate-500">{label}</p>
                    <p className={`mt-2 text-2xl font-bold ${color}`}>{value}</p>
                  </div>
                ))}
              </div>

              <section className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h4 className="text-lg font-bold">Registered biometric devices</h4>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => window.alert("Device logs will be available after connecting a real biometric device or backend service.")} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50">View Logs</button>
                    <button type="button" onClick={() => window.alert("No device integration is connected. Sync was not performed.")} className="rounded-md bg-[#205778] px-3 py-2 text-sm font-semibold text-white hover:bg-[#17445e]">Sync Now</button>
                  </div>
                </div>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex w-full max-w-sm items-center gap-2 rounded-md border border-slate-300 px-3 py-2">
                    <Search size={16} className="text-slate-400" />
                    <input value={deviceSearch} onChange={(e) => setDeviceSearch(e.target.value)} placeholder="Search devices..." className="w-full text-sm outline-none" />
                  </div>
                  <span className="text-xs text-slate-500">{filteredBiometricDevices.length} device(s)</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1050px] text-left text-xs">
                    <thead className="bg-slate-50 text-slate-700"><tr>{["Device Name", "Brand", "Model", "Location", "Connection", "Employees", "Today's Punches", "Last Sync", "Status", "Actions"].map((heading) => <th key={heading} className="whitespace-nowrap px-3 py-3 font-bold">{heading}</th>)}</tr></thead>
                    <tbody>
                      {filteredBiometricDevices.map((device) => (
                        <tr key={device.id} className="border-t border-slate-200 hover:bg-slate-50">
                          <td className="px-3 py-5 font-bold">{device.name}</td>
                          <td className="px-3 py-5">{device.brand || "—"}</td>
                          <td className="px-3 py-5">{device.model || "—"}</td>
                          <td className="px-3 py-5">{device.location || "—"}</td>
                          <td className="px-3 py-5">{device.connection}</td>
                          <td className="px-3 py-5">—</td><td className="px-3 py-5">—</td>
                          <td className="px-3 py-5">{device.lastSync || "Not synced"}</td>
                          <td className="px-3 py-5"><span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">{device.status}</span></td>
                          <td className="px-3 py-5"><button type="button" onClick={() => openDeviceForm(device)} className="font-semibold text-[#205778] hover:underline">Edit</button><button type="button" onClick={() => setBiometricDevices((previous) => previous.filter((item) => item.id !== device.id))} className="ml-3 font-semibold text-red-600 hover:underline">Remove</button></td>
                        </tr>
                      ))}
                      {filteredBiometricDevices.length === 0 && <tr><td colSpan={10} className="px-4 py-14 text-center"><p className="font-semibold text-slate-700">No biometric devices registered</p><p className="mt-1 text-sm text-slate-500">Add actual device details or connect the device-management backend. No sample devices or sync figures have been added.</p></td></tr>}
                    </tbody>
                  </table>
                </div>
              </section>

              {showDeviceForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                  <section className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-200 p-5"><div><h3 className="text-xl font-bold">{editingDevice ? "Edit Biometric Device" : "Add Biometric Device"}</h3><p className="mt-1 text-sm text-slate-500">Enter verified device details.</p></div><button type="button" onClick={() => setShowDeviceForm(false)} aria-label="Close device form" className="rounded-md p-2 hover:bg-slate-100"><X size={20} /></button></div>
                    <form onSubmit={saveDevice} className="space-y-4 p-5">
                      <div><label htmlFor="device-name" className="mb-1.5 block text-sm font-medium">Device Name / ID *</label><input id="device-name" required value={deviceForm.name} onChange={(e) => setDeviceForm({ ...deviceForm, name: e.target.value })} placeholder="Enter device ID" className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm" /></div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div><label htmlFor="device-brand" className="mb-1.5 block text-sm font-medium">Brand</label><input id="device-brand" value={deviceForm.brand} onChange={(e) => setDeviceForm({ ...deviceForm, brand: e.target.value })} placeholder="Enter brand" className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm" /></div>
                        <div><label htmlFor="device-model" className="mb-1.5 block text-sm font-medium">Model</label><input id="device-model" value={deviceForm.model} onChange={(e) => setDeviceForm({ ...deviceForm, model: e.target.value })} placeholder="Enter model" className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm" /></div>
                        <div><label htmlFor="device-location" className="mb-1.5 block text-sm font-medium">Location</label><input id="device-location" value={deviceForm.location} onChange={(e) => setDeviceForm({ ...deviceForm, location: e.target.value })} placeholder="Enter location" className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm" /></div>
                        <div><label htmlFor="device-connection" className="mb-1.5 block text-sm font-medium">Connection</label><select id="device-connection" value={deviceForm.connection} onChange={(e) => setDeviceForm({ ...deviceForm, connection: e.target.value })} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm"><option>LAN</option><option>Wi-Fi</option><option>USB</option><option>Cloud</option></select></div>
                      </div>
                      <div><label htmlFor="device-status" className="mb-1.5 block text-sm font-medium">Status</label><select id="device-status" value={deviceForm.status} onChange={(e) => setDeviceForm({ ...deviceForm, status: e.target.value })} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm"><option>Unknown</option><option>Online</option><option>Offline</option><option>Sync Error</option></select><p className="mt-1 text-xs text-slate-500">Choose a status only if you have verified the device state.</p></div>
                      <div className="flex justify-end gap-3 border-t border-slate-200 pt-4"><button type="button" onClick={() => setShowDeviceForm(false)} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium">Cancel</button><button type="submit" className="rounded-md bg-[#205778] px-4 py-2 text-sm font-semibold text-white">{editingDevice ? "Save Changes" : "Add Device"}</button></div>
                    </form>
                  </section>
                </div>
              )}
            </section>
          ) : activePage === "Raw Punches" ? (
            <section className="space-y-5">
              <div><h2 className="text-2xl font-bold text-slate-800">Raw Biometric Punches</h2><p className="mt-1 text-sm text-slate-500">Immutable record of biometric events from devices</p></div>
              <div className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-2 xl:grid-cols-5">
                {[ ["Date", "date"], ["Employee", "employee"], ["Device", "device"], ["Location", "location"], ["Sync Status", "status"] ].map(([label, key]) => <label key={key} className="block text-xs font-semibold text-slate-500">{label}{key === "date" ? <input type="date" value={rawPunchFilters.date} onChange={e=>setRawPunchFilters({...rawPunchFilters,date:e.target.value})} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal text-slate-700"/> : key === "employee" ? <input value={rawPunchFilters.employee} onChange={e=>setRawPunchFilters({...rawPunchFilters,employee:e.target.value})} placeholder="Search employee" className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal"/> : <select value={rawPunchFilters[key]} onChange={e=>setRawPunchFilters({...rawPunchFilters,[key]:e.target.value})} className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal">{(key === "device" ? ["All Devices"] : key === "location" ? ["All Locations"] : ["All Statuses","Synced","Pending","Error"]).map(x=><option key={x}>{x}</option>)}</select>}</label>)}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-sky-200 bg-sky-50 p-4"><p className="text-sm text-sky-700">ⓘ Raw biometric records are retained as an audit trail and should not be edited.</p><div className="flex gap-2"><button onClick={()=>window.print()} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">Print</button><button onClick={()=>window.alert("No raw punch records are available to export.")} className="rounded-md bg-[#205778] px-4 py-2 text-sm font-semibold text-white">Export</button></div></div>
              <section className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-4"><h3 className="mb-4 font-bold">Biometric event log</h3><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-600"><tr>{["Employee","Employee ID","Device","Timestamp","Punch Type","Verification Mode","Sync Time","Status"].map(x=><th key={x} className="px-3 py-3">{x}</th>)}</tr></thead><tbody><tr><td colSpan="8" className="px-3 py-16 text-center"><p className="font-semibold text-slate-700">No raw biometric punches available</p><p className="mt-1 text-sm text-slate-500">Connect a biometric device or load verified punch records to view the audit log.</p></td></tr></tbody></table></section>
            </section>
          ) : activePage === "Attendance Regularization" ? (
            <section className="space-y-5"><div><h2 className="text-2xl font-bold text-slate-800">Attendance Regularization</h2><p className="mt-1 text-sm text-slate-500">Attendance correction workflow and approvals</p></div>
              <div className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-3"><label className="text-xs font-semibold text-slate-500">Search requests<input placeholder="Employee or request ID" className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label><label className="text-xs font-semibold text-slate-500">Status<select value={regularizationStatus} onChange={e=>setRegularizationStatus(e.target.value)} className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal"><option>All Statuses</option><option>Pending HR</option><option>Pending Manager</option><option>Approved</option><option>Rejected</option></select></label><div className="flex items-end"><button onClick={()=>window.alert("Employees can submit regularization requests after employee and attendance data are connected.")} className="rounded-md bg-[#205778] px-4 py-2 text-sm font-semibold text-white">New Regularization Request</button></div></div>
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.3fr_0.7fr]"><section className="rounded-lg border border-slate-200 bg-white p-5"><h3 className="font-bold">Request review</h3><div className="mt-5 rounded-lg bg-slate-50 p-8 text-center"><p className="font-semibold text-slate-700">No regularization request selected</p><p className="mt-1 text-sm text-slate-500">Requests will appear here when real records are available.</p></div></section><section className="rounded-lg border border-slate-200 bg-white p-5"><h3 className="font-bold">Workflow</h3><ol className="mt-4 space-y-3 text-sm text-slate-600"><li>1. Raw biometric punch</li><li>2. Regularization request</li><li>3. Manager / HR approval</li><li>4. Processed attendance</li></ol><p className="mt-5 rounded-md bg-amber-50 p-3 text-sm text-amber-800">Original biometric records must remain unchanged for audit purposes.</p><h4 className="mt-5 font-semibold">Audit trail</h4><p className="mt-2 text-sm text-slate-500">No audit events available.</p></section></div>
              <section className="rounded-lg border border-slate-200 bg-white p-4"><h3 className="mb-4 font-bold">All regularization requests</h3><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50 text-xs"><tr>{["Request","Employee","Employee ID","Date","Correction","Reason","Status","Action"].map(x=><th key={x} className="px-3 py-3">{x}</th>)}</tr></thead><tbody><tr><td colSpan="8" className="px-3 py-12 text-center text-slate-500">No regularization requests found.</td></tr></tbody></table></div></section>
            </section>
          ) : activePage === "Shift Management" ? (
            <section className="space-y-4">
              {/* Page heading */}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">
                    Shift Management
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Configure and manage employee work shifts
                  </p>
                </div>

                <button
                  onClick={() => {
                    setEditingShiftId(null);
                    setShiftForm({ ...emptyShiftForm });
                    setShowShiftForm(true);
                  }}
                  className="rounded-md bg-[#205778] px-4 py-2 text-sm font-semibold text-white hover:bg-[#17435d]"
                >
                  + Create Shift
                </button>
              </div>

              {/* Work shifts table */}
              <section className="overflow-hidden rounded-lg border border-slate-200 bg-white p-4">
                <div className="mb-3">
                  <h3 className="font-bold text-slate-800">Work shifts</h3>
                  <p className="text-xs text-slate-500">
                    {shiftRecords.length} configured shift
                    {shiftRecords.length === 1 ? "" : "s"}
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1050px] text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-slate-800">
                      <tr>
                        {[
                          "Shift Name",
                          "Start Time",
                          "End Time",
                          "Grace Period",
                          "Break Duration",
                          "Overtime Threshold",
                          "Weekly Off",
                          "Location",
                          "Status",
                          "Actions",
                        ].map((heading) => (
                          <th key={heading} className="whitespace-nowrap px-3 py-3 font-semibold">
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {shiftRecords.length > 0 ? (
                        shiftRecords.map((shift) => (
                          <tr key={shift.id} className="border-t border-slate-200 hover:bg-slate-50">
                            <td className="whitespace-nowrap px-3 py-4 font-medium">
                              {shift.name}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4">{shift.startTime}</td>
                            <td className="whitespace-nowrap px-3 py-4">{shift.endTime}</td>
                            <td className="whitespace-nowrap px-3 py-4">{shift.grace} min</td>
                            <td className="whitespace-nowrap px-3 py-4">{shift.breakDuration} min</td>
                            <td className="whitespace-nowrap px-3 py-4">
                              {shift.overtimeThreshold} min
                            </td>
                            <td className="whitespace-nowrap px-3 py-4">{shift.weeklyOff}</td>
                            <td className="whitespace-nowrap px-3 py-4">{shift.location}</td>
                            <td className="px-3 py-4">
                              <span
                                className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                  shift.status === "Active"
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {shift.status || "Active"}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() =>
                                    window.alert(
                                      `${shift.name}\n${shift.startTime} – ${shift.endTime}\nLocation: ${shift.location}`
                                    )
                                  }
                                  className="text-sky-700 hover:underline"
                                >
                                  View
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingShiftId(shift.id);
                                    setShiftForm({ ...emptyShiftForm, ...shift });
                                    setShowShiftForm(true);
                                  }}
                                  className="text-sky-700 hover:underline"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => {
                                    if (window.confirm(`Delete "${shift.name}"?`)) {
                                      setShiftRecords((previous) =>
                                        previous.filter((item) => item.id !== shift.id)
                                      );
                                    }
                                  }}
                                  className="text-red-600 hover:underline"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={10} className="px-4 py-10 text-center text-slate-500">
                            No shifts configured. Select Create Shift to add a work shift.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Shift configuration panel */}
              {showShiftForm && (
                <section className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-slate-800">Shift configuration</h3>
                      <p className="text-xs text-slate-500">
                        Create a new shift or edit an existing schedule
                      </p>
                    </div>

                    <span className="rounded-full bg-orange-50 px-2 py-1 text-xs font-semibold text-orange-600">
                      Draft
                    </span>
                  </div>

                  <form
                    onSubmit={(event) => {
                      event.preventDefault();

                      if (editingShiftId !== null) {
                        setShiftRecords((previous) =>
                          previous.map((shift) =>
                            shift.id === editingShiftId
                              ? { ...shiftForm, id: editingShiftId }
                              : shift
                          )
                        );
                      } else {
                        setShiftRecords((previous) => [
                          ...previous,
                          { ...shiftForm, id: Date.now(), status: "Active" },
                        ]);
                      }

                      setShowShiftForm(false);
                      setEditingShiftId(null);
                      setShiftForm({ ...emptyShiftForm });
                    }}
                    className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
                  >
                    <label className="text-xs font-medium text-slate-500">
                      Shift Name
                      <input
                        required
                        type="text"
                        value={shiftForm.name}
                        onChange={(event) =>
                          setShiftForm({ ...shiftForm, name: event.target.value })
                        }
                        placeholder="e.g. General Shift"
                        className="mt-1 block w-full rounded border border-slate-300 bg-slate-50 px-2.5 py-2 text-sm text-slate-800 outline-none focus:border-sky-600"
                      />
                    </label>

                    <label className="text-xs font-medium text-slate-500">
                      Start Time
                      <input
                        required
                        type="time"
                        value={shiftForm.startTime}
                        onChange={(event) =>
                          setShiftForm({ ...shiftForm, startTime: event.target.value })
                        }
                        className="mt-1 block w-full rounded border border-slate-300 bg-slate-50 px-2.5 py-2 text-sm text-slate-800"
                      />
                    </label>

                    <label className="text-xs font-medium text-slate-500">
                      End Time
                      <input
                        required
                        type="time"
                        value={shiftForm.endTime}
                        onChange={(event) =>
                          setShiftForm({ ...shiftForm, endTime: event.target.value })
                        }
                        className="mt-1 block w-full rounded border border-slate-300 bg-slate-50 px-2.5 py-2 text-sm text-slate-800"
                      />
                    </label>

                    <label className="text-xs font-medium text-slate-500">
                      Grace Period
                      <input
                        required
                        min="0"
                        type="number"
                        value={shiftForm.grace}
                        onChange={(event) =>
                          setShiftForm({ ...shiftForm, grace: event.target.value })
                        }
                        className="mt-1 block w-full rounded border border-slate-300 bg-slate-50 px-2.5 py-2 text-sm text-slate-800"
                      />
                    </label>

                    <label className="text-xs font-medium text-slate-500">
                      Break Duration
                      <input
                        required
                        min="0"
                        type="number"
                        value={shiftForm.breakDuration}
                        onChange={(event) =>
                          setShiftForm({ ...shiftForm, breakDuration: event.target.value })
                        }
                        className="mt-1 block w-full rounded border border-slate-300 bg-slate-50 px-2.5 py-2 text-sm text-slate-800"
                      />
                    </label>

                    <label className="text-xs font-medium text-slate-500">
                      Overtime Threshold
                      <input
                        required
                        min="0"
                        type="number"
                        value={shiftForm.overtimeThreshold}
                        onChange={(event) =>
                          setShiftForm({
                            ...shiftForm,
                            overtimeThreshold: event.target.value,
                          })
                        }
                        className="mt-1 block w-full rounded border border-slate-300 bg-slate-50 px-2.5 py-2 text-sm text-slate-800"
                      />
                    </label>

                    <label className="text-xs font-medium text-slate-500">
                      Weekly Off
                      <select
                        value={shiftForm.weeklyOff}
                        onChange={(event) =>
                          setShiftForm({ ...shiftForm, weeklyOff: event.target.value })
                        }
                        className="mt-1 block w-full rounded border border-slate-300 bg-slate-50 px-2.5 py-2 text-sm text-slate-800"
                      >
                        {["Sunday", "Saturday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "None"].map(
                          (day) => (
                            <option key={day} value={day}>
                              {day}
                            </option>
                          )
                        )}
                      </select>
                    </label>

                    <label className="text-xs font-medium text-slate-500">
                      Location
                      <input
                        required
                        value={shiftForm.location}
                        onChange={(event) =>
                          setShiftForm({ ...shiftForm, location: event.target.value })
                        }
                        placeholder="All Locations"
                        className="mt-1 block w-full rounded border border-slate-300 bg-slate-50 px-2.5 py-2 text-sm text-slate-800"
                      />
                    </label>

                    <div className="flex flex-wrap gap-2 pt-1 sm:col-span-2 xl:col-span-4">
                      <button
                        type="submit"
                        className="rounded bg-[#205778] px-4 py-2 text-sm font-semibold text-white hover:bg-[#17435d]"
                      >
                        Save Shift
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowShiftForm(false);
                          setEditingShiftId(null);
                          setShiftForm({ ...emptyShiftForm });
                        }}
                        className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </section>
              )}
            </section>
          ) : activePage === "Roster Management" ? (
            <section className="space-y-5"><div><h2 className="text-2xl font-bold text-slate-800">Roster Management</h2><p className="mt-1 text-sm text-slate-500">Assign employees to shifts and locations</p></div><section className="rounded-lg border border-slate-200 bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex gap-2"><button onClick={()=>setRosterView("Week")} className={`rounded-md px-4 py-2 text-sm ${rosterView==="Week"?"bg-[#205778] text-white":"border"}`}>Week</button><button onClick={()=>setRosterView("Month")} className={`rounded-md px-4 py-2 text-sm ${rosterView==="Month"?"bg-[#205778] text-white":"border"}`}>Month</button></div><div className="flex gap-2"><button onClick={()=>window.alert("No roster records available to export.")} className="rounded-md border px-4 py-2 text-sm">Export</button><button onClick={()=>window.alert("No roster changes to save.")} className="rounded-md border px-4 py-2 text-sm">Save Roster</button><button onClick={()=>window.alert("Roster cannot be published until real employees and assignments are available.")} className="rounded-md bg-[#205778] px-4 py-2 text-sm font-semibold text-white">Publish</button></div></div><div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3"><label className="text-xs font-semibold text-slate-500">Department<select value={rosterDepartment} onChange={e=>setRosterDepartment(e.target.value)} className="mt-1.5 w-full rounded-md border bg-white px-3 py-2 text-sm font-normal"><option>All Departments</option>{departmentRecords.map(d=><option key={d.id}>{d.name}</option>)}</select></label><label className="text-xs font-semibold text-slate-500">Location<select value={rosterLocation} onChange={e=>setRosterLocation(e.target.value)} className="mt-1.5 w-full rounded-md border bg-white px-3 py-2 text-sm font-normal"><option>All Locations</option></select></label><label className="text-xs font-semibold text-slate-500">{rosterView}<input value={rosterPeriod} onChange={e=>setRosterPeriod(e.target.value)} className="mt-1.5 w-full rounded-md border px-3 py-2 text-sm font-normal" placeholder={rosterView==="Week"?"Week range":"Month and year"}/></label></div></section><div className="flex flex-wrap gap-2"><button onClick={()=>window.alert("Employee assignments require real employee records.")} className="rounded-md bg-[#205778] px-4 py-2 text-sm font-semibold text-white">Assign employees to shifts</button><button onClick={()=>window.alert("Employee assignments require real employee records.")} className="rounded-md border px-4 py-2 text-sm">Assign to locations</button><button onClick={()=>window.alert("Create shifts first, then assign real employees.")} className="rounded-md border px-4 py-2 text-sm">Change shift</button></div><section className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-4"><h3 className="mb-4 font-bold">Roster matrix</h3><table className="w-full min-w-[800px] text-left text-sm"><thead className="bg-slate-50 text-xs"><tr>{["Employee","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].map(x=><th key={x} className="px-3 py-3">{x}</th>)}</tr></thead><tbody><tr><td colSpan="8" className="px-3 py-14 text-center text-slate-500">No roster assignments available. Add real employees and assign shifts to populate this view.</td></tr></tbody></table></section></section>
          ) : activePage === "Overtime" ? (
            <section className="space-y-5"><div><h2 className="text-2xl font-bold text-slate-800">Overtime Dashboard</h2><p className="mt-1 text-sm text-slate-500">Track and approve employee overtime</p></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">{[["Total Overtime Hours","—"],["Pending Approval","—"],["Approved","—"],["Rejected","—"],["Estimated Overtime Cost","—"]].map(([label,value])=><div key={label} className="rounded-lg border border-slate-200 bg-white p-5"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-3 text-2xl font-bold text-[#205778]">{value}</p></div>)}</div><div className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-4"><label className="text-xs font-semibold text-slate-500">Date range<input type="date" className="mt-1.5 w-full rounded-md border px-3 py-2 text-sm font-normal"/></label><label className="text-xs font-semibold text-slate-500">Department<select className="mt-1.5 w-full rounded-md border bg-white px-3 py-2 text-sm font-normal"><option>All Departments</option>{departmentRecords.map(d=><option key={d.id}>{d.name}</option>)}</select></label><label className="text-xs font-semibold text-slate-500">Location<select className="mt-1.5 w-full rounded-md border bg-white px-3 py-2 text-sm font-normal"><option>All Locations</option></select></label><label className="text-xs font-semibold text-slate-500">Status<select value={overtimeStatus} onChange={e=>setOvertimeStatus(e.target.value)} className="mt-1.5 w-full rounded-md border bg-white px-3 py-2 text-sm font-normal">{["All Statuses","Pending","Approved","Rejected"].map(x=><option key={x}>{x}</option>)}</select></label></div><div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_0.6fr]"><section className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-4"><h3 className="mb-4 font-bold">Overtime requests</h3><table className="w-full min-w-[800px] text-left text-sm"><thead className="bg-slate-50 text-xs"><tr>{["Employee","Date","Shift","Regular Hours","Overtime Hours","Reason","Approval Status","Approver","Actions"].map(x=><th key={x} className="px-3 py-3">{x}</th>)}</tr></thead><tbody><tr><td colSpan="9" className="px-3 py-12 text-center text-slate-500">No overtime requests available.</td></tr></tbody></table></section><section className="rounded-lg border border-slate-200 bg-white p-5"><h3 className="font-bold">Overtime Detail</h3><p className="mt-4 text-sm text-slate-500">Select an overtime request to review its details.</p><div className="mt-5 grid grid-cols-2 gap-2"><button onClick={()=>window.alert("Select a real overtime request first.")} className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">Approve</button><button onClick={()=>window.alert("Select a real overtime request first.")} className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white">Reject</button></div></section></div></section>
                    ) : activePage === "Holiday Calendar" ? (
            <section className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">
                    Holiday Calendar
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Manage national, regional, and company holidays.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEditingHolidayId(null);
                    setHolidayForm({ ...emptyHolidayForm });
                    setShowHolidayForm(true);
                  }}
                  className="rounded-md bg-[#205778] px-4 py-2 text-sm font-semibold text-white hover:bg-[#17435d]"
                >
                  + Add Holiday
                </button>
              </div>

              {/* Holiday summary cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    label: "Total Holidays",
                    value: holidayRecords.length,
                  },
                  {
                    label: "National",
                    value: holidayRecords.filter(
                      (h) => h.type === "National"
                    ).length,
                  },
                  {
                    label: "Regional",
                    value: holidayRecords.filter(
                      (h) => h.type === "Regional"
                    ).length,
                  },
                  {
                    label: "Company",
                    value: holidayRecords.filter(
                      (h) => h.type === "Company"
                    ).length,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-lg border border-slate-200 bg-white p-5"
                  >
                    <p className="text-sm text-slate-500">{item.label}</p>
                    <p className="mt-3 text-2xl font-bold text-[#205778]">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              
              
              {/* Search and calendar navigation */}
              <section className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <input
                    value={holidaySearch}
                    onChange={(e) => setHolidaySearch(e.target.value)}
                    placeholder="Search holiday name or location..."
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />

                  <label className="text-sm font-medium text-slate-600">
                    Year
                    <input
                      type="number"
                      min="1"
                      max="9999"
                      value={holidayYear}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (
                          value === "" ||
                          (Number(value) >= 1 && Number(value) <= 9999)
                        ) {
                          setHolidayYear(value);
                        }
                      }}
                      className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
                    />
                  </label>

                  <label className="text-sm font-medium text-slate-600">
                    Month
                    <select
                      value={holidayMonth}
                      onChange={(e) => setHolidayMonth(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                    >
                      {Array.from({ length: 12 }, (_, index) => (
                        <option key={index} value={String(index)}>
                          {new Date(2000, index, 1).toLocaleString("en-IN", {
                            month: "long",
                          })}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </section>

              {/* Monthly calendar */}
              <section className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">
                      {monthName} {holidayYear}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Select a day to view its holidays.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const previous = new Date(
                          calendarYear,
                          calendarMonth - 1,
                          1
                        );
                        setHolidayYear(String(previous.getFullYear()));
                        setHolidayMonth(String(previous.getMonth()));
                        setSelectedCalendarDate("");
                      }}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
                    >
                      Previous
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const next = new Date(
                          calendarYear,
                          calendarMonth + 1,
                          1
                        );
                        setHolidayYear(String(next.getFullYear()));
                        setHolidayMonth(String(next.getMonth()));
                        setSelectedCalendarDate("");
                      }}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
                    >
                      Next
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                    (day) => (
                      <div
                        key={day}
                        className="py-2 text-center text-xs font-bold text-slate-500 sm:text-sm"
                      >
                        {day}
                      </div>
                    )
                  )}

                  {calendarDays.map((day, index) => {
                    if (day === null) {
                      return <div key={`empty-${index}`} />;
                    }

                    const dateString = [
                      String(calendarYear).padStart(4, "0"),
                      String(calendarMonth + 1).padStart(2, "0"),
                      String(day).padStart(2, "0"),
                    ].join("-");

                    const dayHolidays = holidayRecords.filter(
                      (holiday) => holiday.date === dateString
                    );

                    const isSelected = selectedCalendarDate === dateString;

                    return (
                      <button
                        key={dateString}
                        type="button"
                        onClick={() => setSelectedCalendarDate(dateString)}
                        title={
                          dayHolidays.map((holiday) => holiday.name).join(", ") ||
                          dateString
                        }
                        className={`min-h-12 overflow-hidden rounded-md border p-1 text-center sm:min-h-16 sm:p-2 ${
                          isSelected
                            ? "border-[#205778] bg-blue-100"
                            : dayHolidays.length
                              ? "border-emerald-300 bg-emerald-50 hover:bg-emerald-100"
                              : "border-slate-100 hover:bg-slate-50"
                        }`}
                      >
                        <span className="text-sm font-semibold">{day}</span>

                        {dayHolidays.length > 0 && (
                          <span className="mt-1 block truncate text-[9px] text-emerald-800 sm:text-xs">
                            {dayHolidays[0].name}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {selectedCalendarDate && (
                  <div className="mt-4 rounded-md bg-slate-50 p-3">
                    <p className="font-semibold text-slate-800">
                      {new Date(
                        `${selectedCalendarDate}T12:00:00`
                      ).toLocaleDateString("en-IN", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>

                    {holidayRecords.filter(
                      (holiday) => holiday.date === selectedCalendarDate
                    ).length > 0 ? (
                      holidayRecords
                        .filter(
                          (holiday) => holiday.date === selectedCalendarDate
                        )
                        .map((holiday) => (
                          <p
                            key={holiday.id}
                            className="mt-1 text-sm text-emerald-700"
                          >
                            {holiday.name} — {holiday.type}
                          </p>
                        ))
                    ) : (
                      <p className="mt-1 text-sm text-slate-500">
                        No holiday added for this date.
                      </p>
                    )}
                  </div>
                )}
              </section>

              {/* Add Holiday modal */}
              {showHolidayForm && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                  onMouseDown={(event) => {
                    if (event.target === event.currentTarget) {
                      setShowHolidayForm(false);
                    }
                  }}
                >
                  <section
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="holiday-form-title"
                    className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white shadow-xl"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200 p-5">
                      <div>
                        <h3 id="holiday-form-title" className="text-xl font-bold text-slate-800">
                          {editingHolidayId !== null ? "Edit Holiday" : "Add Holiday"}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">Enter the holiday details below.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowHolidayForm(false)}
                        aria-label="Close holiday form"
                        className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <form onSubmit={saveHoliday} className="space-y-4 p-5">
                      <label className="block text-sm font-semibold text-slate-600">
                        Holiday name <span className="text-red-500">*</span>
                        <input
                          required
                          autoFocus
                          value={holidayForm.name}
                          onChange={(event) => setHolidayForm((previous) => ({ ...previous, name: event.target.value }))}
                          placeholder="e.g. Diwali"
                          className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 font-normal outline-none focus:border-[#205778]"
                        />
                      </label>

                      <label className="block text-sm font-semibold text-slate-600">
                        Date <span className="text-red-500">*</span>
                        <input
                          required
                          type="date"
                          value={holidayForm.date}
                          onChange={(event) => setHolidayForm((previous) => ({ ...previous, date: event.target.value }))}
                          className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 font-normal outline-none focus:border-[#205778]"
                        />
                      </label>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <label className="block text-sm font-semibold text-slate-600">
                          Holiday type
                          <select
                            value={holidayForm.type}
                            onChange={(event) => setHolidayForm((previous) => ({ ...previous, type: event.target.value }))}
                            className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-normal"
                          >
                            <option value="National">National</option>
                            <option value="Regional">Regional</option>
                            <option value="Company">Company</option>
                          </select>
                        </label>

                        <label className="block text-sm font-semibold text-slate-600">
                          Location
                          <input
                            value={holidayForm.location}
                            onChange={(event) => setHolidayForm((previous) => ({ ...previous, location: event.target.value }))}
                            placeholder="All Locations"
                            className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 font-normal"
                          />
                        </label>
                      </div>

                      <label className="block text-sm font-semibold text-slate-600">
                        Description
                        <textarea
                          rows={3}
                          value={holidayForm.description}
                          onChange={(event) => setHolidayForm((previous) => ({ ...previous, description: event.target.value }))}
                          placeholder="Optional details"
                          className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 font-normal"
                        />
                      </label>

                      <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                        <button
                          type="button"
                          onClick={() => {
                            setShowHolidayForm(false);
                            setEditingHolidayId(null);
                            setHolidayForm({ ...emptyHolidayForm });
                          }}
                          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="rounded-md bg-[#205778] px-4 py-2 text-sm font-semibold text-white hover:bg-[#17435d]"
                        >
                          {editingHolidayId !== null ? "Save Changes" : "Save Holiday"}
                        </button>
                      </div>
                    </form>
                  </section>
                </div>
              )}
            </section>
          ) : (
            <section className="space-y-6">
              {(() => {
                const config = pageConfigs[activePage];
                if (!config) {
                  return (
                    <div className="rounded-lg border border-[#dedede] bg-white p-8">
                      <h3 className="text-xl font-bold">{activePage}</h3>
                      <p className="mt-2 text-sm text-slate-500">
                        This module is ready for the next frontend development step.
                      </p>
                      <button
                        onClick={() => setActivePage("Dashboard")}
                        className="mt-5 rounded-md bg-[#3076d1] px-4 py-2 text-sm text-white hover:bg-blue-700"
                      >
                        Back to Dashboard
                      </button>
                    </div>
                  );
                }
                return (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-2xl font-bold">{activePage}</h3>
                        <p className="mt-1 text-sm text-slate-500">{config.subtitle}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => window.print()}
                          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                        >
                          Print
                        </button>
                        <button
                          onClick={() => window.alert(`${config.action} is a frontend demo. Backend functionality will be connected later.`)}
                          className="rounded-md bg-[#205778] px-4 py-2 text-sm font-semibold text-white hover:bg-[#17445e]"
                        >
                          {config.action}
                        </button>
                      </div>
                    </div>

                    {config.stats && (
                      <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${config.stats.length === 3 ? "xl:grid-cols-3" : "xl:grid-cols-4"}`}>
                        {config.stats.map(([label, value, note], index) => (
                          <div key={label} className="rounded-lg border border-[#dedede] bg-white p-5">
                            <p className="text-xs font-semibold text-slate-600">{label}</p>
                            <p className={`mt-3 text-2xl font-bold ${index === 1 && activePage === "PF" ? "text-emerald-600" : "text-[#205778]"}`}>{value}</p>
                            <p className="mt-1 text-xs text-slate-400">{note}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {activePage === "Payroll Processing" && (
                      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4">
                        <div><p className="font-bold">Payroll Run</p><p className="mt-1 text-sm text-slate-500">Choose a pay period after employee and attendance data are connected.</p></div>
                        <div className="flex flex-wrap items-center gap-2"><label className="text-sm text-slate-600">Pay period <input type="month" className="ml-2 rounded-md border border-slate-300 px-3 py-2" /></label><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">Not processed</span></div>
                        <div className="flex flex-wrap gap-2 text-xs text-slate-500">{["1. Attendance", "2. Calculation", "3. Deductions", "4. Review", "5. Process"].map((step) => <span key={step} className="rounded-full bg-slate-100 px-3 py-2">{step}</span>)}</div>
                      </div>
                    )}
                    {activePage === "Payslips" && (
                      <div className="flex flex-wrap items-end gap-4 rounded-lg border border-slate-200 bg-white p-4">
                        <label className="text-xs font-semibold text-slate-500">Employee ID<input placeholder="Enter employee ID" className="mt-1.5 block rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
                        <label className="text-xs font-semibold text-slate-500">Payslip month<input type="month" className="mt-1.5 block rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" /></label>
                        <button onClick={() => window.alert("Payslips can be generated after real employee and payroll records are connected.")} className="rounded-md border border-[#205778] px-4 py-2 text-sm font-semibold text-[#205778]">Find Payslip</button>
                      </div>
                    )}
                    {activePage === "Salary Structure" && <p className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">Configure salary components and statutory rules only after confirming your company’s payroll policy. No salary templates or employee assignments have been added yet.</p>}
                    {activePage === "PF" && <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4"><label className="text-sm font-medium text-slate-600">Contribution period <input type="month" className="ml-2 rounded-md border border-slate-300 px-3 py-2" /></label><button onClick={() => window.alert("An ECR file can be generated after verified employee UAN, PF wage, and contribution data are available.")} className="rounded-md border border-[#205778] px-4 py-2 text-sm font-semibold text-[#205778]">Download Report</button></div>}
                    {activePage === "ESIC" && <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4"><label className="text-sm font-medium text-slate-600">Contribution period <input type="month" className="ml-2 rounded-md border border-slate-300 px-3 py-2" /></label><button onClick={() => window.alert("An ESIC challan can be generated after verified insurance numbers, wages, and contribution data are available.")} className="rounded-md border border-[#205778] px-4 py-2 text-sm font-semibold text-[#205778]">Download Report</button></div>}
                    {activePage === "Statutory Reports" && <div className="flex flex-wrap items-end gap-4 rounded-lg border border-slate-200 bg-white p-4"><label className="text-xs font-semibold text-slate-500">Date range<select className="mt-1.5 block rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal"><option>Choose date range</option><option>Last 30 days</option><option>This month</option><option>Custom range</option></select></label><label className="text-xs font-semibold text-slate-500">Department<select className="mt-1.5 block rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal"><option>All Departments</option>{departmentRecords.map(d=><option key={d.id}>{d.name}</option>)}</select></label><label className="text-xs font-semibold text-slate-500">Export format<select className="mt-1.5 block rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal"><option>PDF</option><option>Excel</option><option>CSV</option></select></label></div>}

                    <section className="overflow-hidden rounded-lg border border-[#dedede] bg-white">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
                        <div>
                          <h4 className="font-bold">{activePage === "Statutory Reports" ? "Quick Reports List" : activePage === "Holiday Calendar" ? "Holiday List" : `${activePage} Overview`}</h4>
                          <p className="mt-1 text-xs text-slate-500">No records available. Connect the backend or add verified records to display data.</p>
                        </div>
                        {activePage === "Holiday Calendar" && (
                          <select className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" defaultValue="2026">
                            <option value="2026">2026</option>
                            <option value="2027">2027</option>
                          </select>
                        )}
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-max text-left text-sm">
                          <thead className="bg-[#f0f2f3] text-xs text-slate-600">
                            <tr>
                              {config.columns.map((column) => (
                                <th key={column} className="whitespace-nowrap px-4 py-3">{column}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {config.rows.length === 0 ? (
                              <tr><td colSpan={config.columns.length} className="px-4 py-12 text-center text-sm text-slate-500">No records available. Connect the backend or add verified records to display data.</td></tr>
                            ) : config.rows.map((row, rowIndex) => (
                              <tr key={`${activePage}-${rowIndex}`} className="border-t border-slate-200 hover:bg-slate-50">
                                {row.map((cell, cellIndex) => (
                                  <td key={`${rowIndex}-${cellIndex}`} className={`whitespace-nowrap px-4 py-4 ${cellIndex === 0 ? "font-semibold text-slate-800" : "text-slate-600"}`}>
                                    {cellIndex === row.length - 1 && /Status/.test(config.columns[cellIndex]) ? (
                                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${cell === "Pending" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{cell}</span>
                                    ) : cellIndex === row.length - 1 && config.columns[cellIndex] === "Actions" ? (
                                      <button
                                        onClick={() => window.alert(`${cell} for ${row[0]} is a frontend demo.`)}
                                        className="rounded border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-100"
                                      >
                                        {cell}
                                      </button>
                                    ) : (
                                      cell
                                    )}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="border-t border-slate-200 px-5 py-3 text-xs text-slate-400">
                        Showing {config.rows.length} records
                      </div>
                    </section>
                  </>
                );
              })()}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
