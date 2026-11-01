export const TABS = ["Personal Info", "Employment", "Documents", "Salary", "Attendance", "Leave"];
export const GENDERS = ["Male", "Female", "Other", "Prefer not to say"];
export const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Intern", "Consultant"];
export const DOCUMENT_CATEGORIES = ["Identity", "Address Proof", "Education", "Employment", "Payroll", "Photo", "Other"];
export const HISTORY_EVENTS = ["Joined", "Promotion", "Transfer", "Role Change", "Status Change", "Previous Employment", "Other"];

export const ADDRESS_FIELDS = [
  { key: "addressType", column: "address_type", label: "Address type", type: "select", options: ["Current", "Permanent"], required: true },
  { key: "line1", column: "line1", label: "Address line 1", required: true, wide: true },
  { key: "line2", column: "line2", label: "Address line 2", wide: true },
  { key: "city", column: "city", label: "City", required: true },
  { key: "state", column: "state", label: "State" },
  { key: "postalCode", column: "postal_code", label: "Postal code" },
  { key: "country", column: "country", label: "Country" },
];
export const CONTACT_FIELDS = [
  { key: "name", column: "name", label: "Name", required: true },
  { key: "relationship", column: "relationship", label: "Relationship", required: true },
  { key: "phone", column: "phone", label: "Phone", required: true, type: "tel" },
  { key: "alternatePhone", column: "alternate_phone", label: "Alternate phone", type: "tel" },
  { key: "email", column: "email", label: "Email", type: "email" },
  { key: "isPrimary", column: "is_primary", label: "Primary contact", type: "checkbox" },
];
export const BANK_FIELDS = [
  { key: "accountHolderName", column: "account_holder_name", label: "Account holder name", required: true },
  { key: "bankName", column: "bank_name", label: "Bank name", required: true },
  { key: "branch", column: "branch", label: "Branch" },
  { key: "accountNumber", column: "account_number", label: "Account number", required: true },
  { key: "ifscCode", column: "ifsc_code", label: "IFSC code", required: true },
  { key: "accountType", column: "account_type", label: "Account type", type: "select", options: ["Savings", "Current", "Salary"] },
  { key: "isPrimary", column: "is_primary", label: "Primary salary account", type: "checkbox" },
];
export const HISTORY_FIELDS = [
  { key: "eventType", column: "event_type", label: "Event", type: "select", options: HISTORY_EVENTS, required: true },
  { key: "effectiveDate", column: "effective_date", label: "Effective date", type: "date", required: true },
  { key: "organization", column: "organization", label: "Organization (for previous employment)" },
  { key: "department", column: "department", label: "Department" },
  { key: "designation", column: "designation", label: "Designation / position" },
  { key: "notes", column: "notes", label: "Notes", type: "textarea", wide: true },
];