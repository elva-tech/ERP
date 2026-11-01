// Map API rows (snake_case) to the records the employee, department and designation pages use.

export function toEmployeeRecord(row) {
  return {
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
  };
}

export function toDepartmentRecord(row) {
  return {
    id: String(row.id),
    name: row.department_name,
    employees: row.employee_count ?? 0,
    description: row.description || "",
    status: row.status || "Active",
    created: row.created_at ? new Date(row.created_at).toLocaleDateString("en-GB") : "",
  };
}

export function toDesignationRecord(row) {
  return {
    id: String(row.id),
    title: row.designation_name,
    departments: (row.departments || []).map((d) => ({ id: String(d.id), name: d.department_name, status: d.status })),
    description: row.description || "",
    status: row.status || "Active",
  };
}

/** Replaces the record with the same id, or appends it. */
export function upsertById(list, saved) {
  return list.some((item) => String(item.id) === saved.id)
    ? list.map((item) => (String(item.id) === saved.id ? saved : item))
    : [...list, saved];
}
