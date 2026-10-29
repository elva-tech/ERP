
import { Suspense, useEffect, useState } from "react";
import { apiRequest } from "./api";
import { canManage, primaryButton } from "./modules/helpers";
import {
  toDepartmentRecord,
  toDesignationRecord,
  toEmployeeRecord,
} from "./modules/records";
import { Notice } from "./modules/ui";
import { accessibleSectionsFor, visibleSectionsFor } from "./navigation";
import { findRoute } from "./routes";
import {
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_WIDTH,
  Sidebar,
  TopBar,
} from "./shell";

function UnavailablePage({ title, message, onBack }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-8">
      <h3 className="text-xl font-bold text-ink">{title}</h3>
      <p className="mt-2 text-[13px] text-muted">{message}</p>
      <button
        type="button"
        onClick={onBack}
        className={`${primaryButton} mt-5`}
      >
        Back to Dashboard
      </button>
    </div>
  );
}

function App({
  companyId,
  role = "",
  companyName = "",
  ownEmployeeId = null,
  isApprovalDelegate = false,
  session = {},
}) {
  // Store a stable route ID internally, not the displayed page label.
  const [activePage, setActivePage] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem("elvaSidebarCollapsed") === "1",
  );
  const [dataVersion, setDataVersion] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [successNotice, setSuccessNotice] = useState("");
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const refreshCompanyRecords = () => {
    setDataVersion((version) => version + 1);
  };

  // Load records for the active company.
  useEffect(() => {
    if (!companyId) return undefined;

    let cancelled = false;

    async function loadCompanyRecords() {
      try {
        const query = `?companyId=${encodeURIComponent(companyId)}`;

        const [
          employeeResult,
          departmentResult,
          designationResult,
          memberResult,
        ] = await Promise.all([
          apiRequest(`/api/employees${query}`),
          apiRequest(`/api/departments${query}`),
          apiRequest(`/api/designations${query}`),
          canManage(role)
            ? apiRequest(`/api/members${query}`)
            : Promise.resolve({ members: [] }),
        ]);

        if (cancelled) return;

        setEmployees(
          (employeeResult.employees || []).map(toEmployeeRecord),
        );
        setMembers(memberResult.members || []);
        setDepartments(
          (departmentResult.departments || []).map(toDepartmentRecord),
        );
        setDesignations(
          (designationResult.designations || []).map(toDesignationRecord),
        );
        setLoadError("");
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error.message || "Unable to load company records.",
          );
        }
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

  // Resolve the ID or legacy label to the shared route definition.
  const activeRoute = findRoute(activePage);

  // A route must exist and be present in the user's accessible sections.
  const pageAllowed = Boolean(
    activeRoute &&
      accessibleSections.some((section) =>
        section.items.some((item) => item.id === activeRoute.id),
      ),
  );

  const currentSection = accessibleSections.find((section) =>
    section.items.some((item) => item.id === activeRoute?.id),
  )?.title;

  // Search continues to receive the page labels and icons for display.
  const searchPages = visibleSections.flatMap((section) =>
    section.items.map((item) => ({
      ...item,
      section: section.title,
    })),
  );

  const showApprovals = canManage(role) || isApprovalDelegate;

  // Accept route IDs and existing labels while callers are migrated.
  function navigate(identifier) {
    const route = findRoute(identifier);

    if (!route) return;

    if (route.id === findRoute("Employee Profile")?.id) {
      setSelectedEmployee(null);
    }

    setActivePage(route.id);
    setSuccessNotice("");
    setMobileMenuOpen(false);
  }

  function openEmployeeProfile(employee) {
    const route = findRoute("Employee Profile");

    if (!route) return;

    setSelectedEmployee(employee);
    setActivePage(route.id);
    setSuccessNotice("");
    setMobileMenuOpen(false);
  }

  function toggleSidebar() {
    setSidebarCollapsed((current) => {
      localStorage.setItem(
        "elvaSidebarCollapsed",
        current ? "0" : "1",
      );
      return !current;
    });
  }

  function renderPage() {
    if (!pageAllowed) {
      return (
        <UnavailablePage
          title={activeRoute?.label || activePage}
          message="This page is not available for your role."
          onBack={() => navigate("dashboard")}
        />
      );
    }

    if (typeof activeRoute.render !== "function") {
      return (
        <UnavailablePage
          title={activeRoute.label}
          message="This page is not available."
          onBack={() => navigate("dashboard")}
        />
      );
    }

    const context = {
      companyId,
      role,
      companyName,
      employees,
      setEmployees,
      departments,
      setDepartments,
      designations,
      setDesignations,
      members,
      canWrite,
      ownEmployeeId,
      selectedEmployee,
      refreshCompanyRecords,
      openEmployeeProfile,
      setNotice,
      setSuccessNotice,
      navigate,
      moduleProps: {
        companyId,
        role,
        companyName,
        employees,
        departments,
        designations,
        onNavigate: navigate,
        ownEmployeeId,
        currentUserId: session.user?.id,
      },
    };

    return activeRoute.render(context);
  }

  return (
    <div className="min-h-screen bg-workspace text-ink">
      <Sidebar
        sections={visibleSections}
        // Preserve compatibility with the existing label-based Sidebar.
        activePage={activePage}
        onNavigate={navigate}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={toggleSidebar}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div
        className={`min-h-screen transition-[margin] duration-200 print:ml-0 ${
          sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH
        }`}
      >
        <TopBar
          section={currentSection}
          title={
            activeRoute?.label === "Employee Profile" && selectedEmployee
              ? selectedEmployee.name
              : activeRoute?.label || activePage
          }
          onOpenMobileNav={() => setMobileMenuOpen(true)}
          searchPages={searchPages}
          employees={employees}
          onOpenPage={navigate}
          onOpenEmployee={openEmployeeProfile}
          onOpenOwnProfile={
            ownEmployeeId ? () => navigate("my-profile") : undefined
          }
          showApprovals={showApprovals}
          session={session}
          role={role}
          companyId={companyId}
          companyName={companyName}
        />

        <main className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-7 print:max-w-none print:p-0">
          {(session.error || loadError || notice || successNotice) && (
            <div className="mb-5 space-y-3 print:hidden">
              {session.error && (
                <Notice
                  notice={{ type: "error", message: session.error }}
                />
              )}

              {loadError && (
                <Notice
                  notice={{ type: "error", message: loadError }}
                  action={{
                    label: "Retry",
                    onClick: refreshCompanyRecords,
                  }}
                />
              )}

              {notice && (
                <Notice
                  notice={{ type: "error", message: notice }}
                  action={{
                    label: "Dismiss",
                    onClick: () => setNotice(""),
                  }}
                />
              )}

              {successNotice && (
                <Notice
                  notice={{ type: "success", message: successNotice }}
                  onClose={() => setSuccessNotice("")}
                />
              )}
            </div>
          )}

          <Suspense
            fallback={
              <div role="status" className="p-6 text-sm text-muted">
                Loading module...
              </div>
            }
          >
            {renderPage()}
          </Suspense>
        </main>
      </div>
    </div>
  );
}

export default App;
