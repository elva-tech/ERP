import { useState } from "react";
import { Plus, Download, SlidersHorizontal } from "lucide-react";
import { PrimaryButton } from "../components/ui/PrimaryButton.jsx";
import { SecondaryButton } from "../components/ui/SecondaryButton.jsx";
import { SearchInput } from "../components/ui/SearchInput.jsx";
import { FilterDropdown } from "../components/ui/FilterDropdown.jsx";
import { Pagination } from "../components/ui/Pagination.jsx";
import { Toast } from "../components/ui/Toast.jsx";
import { AgreementSummaryCards } from "../features/agreements/components/AgreementSummaryCards.jsx";
import { AgreementRegisterTable } from "../features/agreements/components/AgreementRegisterTable.jsx";
import { NewAgreementModal } from "../features/agreements/components/NewAgreementModal.jsx";
import { AgreementDetailDrawer } from "../features/agreements/components/AgreementDetailDrawer.jsx";
import { useAgreementsList } from "../features/agreements/hooks/useAgreementsList.js";
import { useAgreementSummary } from "../features/agreements/hooks/useAgreementSummary.js";
import { STATUS_FILTER_OPTIONS } from "../features/agreements/schemas/agreementSchema.js";
import { exportAgreements } from "../features/agreements/services/agreementService.js";
import { useSession } from "../features/auth/sessionContext.js";

const TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "subcontract", label: "Subcontract" },
  { value: "lease", label: "Lease" },
  { value: "contract", label: "EPC Contract" },
  { value: "amc", label: "AMC Maintenance" },
  { value: "access", label: "Access & Easement" },
  { value: "rental", label: "Commercial Rental" },
];

const DEPARTMENT_OPTIONS = [
  { value: "", label: "All Departments" },
  { value: "project", label: "Project Dept" },
  { value: "legal", label: "Legal & Compliance" },
  { value: "admin", label: "Admin & Operations" },
  { value: "infrastructure", label: "Infrastructure" },
  { value: "electrical", label: "Electrical Engineering" },
];

export function SubcontractAgreementsPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedAgreement, setSelectedAgreement] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  // Extended filters
  const [selectedType, setSelectedType] = useState("");
  const [selectedDept, setSelectedDept] = useState("");

  const {
    items,
    pagination,
    statusFilter,
    searchQuery,
    isLoading,
    error,
    setPage,
    setStatus,
    setSearch,
    reload: reloadList,
  } = useAgreementsList();

  const {
    data: summaryData,
    isLoading: isSummaryLoading,
    reload: reloadSummary,
  } = useAgreementSummary();

  function handleAgreementCreated(created) {
    setIsCreateModalOpen(false);
    reloadList();
    reloadSummary();
    setToastMessage({
      type: "success",
      text: created?.agreementNumber
        ? `Agreement ${created.agreementNumber} created successfully.`
        : "Agreement created successfully.",
    });
  }

  async function handleExport() {
    setIsExporting(true);
    try {
      const result = await exportAgreements({
        status: statusFilter,
        search: searchQuery,
      });
      if (result?.blob) {
        const url = window.URL.createObjectURL(result.blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.fileName || `agreements_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        setToastMessage({ type: "success", text: "Agreements exported successfully." });
      }
    } catch {
      setToastMessage({ type: "error", text: "Failed to export agreements." });
    } finally {
      setIsExporting(false);
    }
  }

  function handleClearAllFilters() {
    setStatus("");
    setSearch("");
    setSelectedType("");
    setSelectedDept("");
  }

  const hasActiveFilters = Boolean(statusFilter || searchQuery || selectedType || selectedDept);

  const { session } = useSession();
  const companyName = session?.tenant?.name || "SB Patil Group";

  return (
    <div className="flex flex-col gap-5">
      {/* Page Header: Title, Subtitle, & Primary Actions */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-[20px] font-bold text-ink sm:text-[22px]">
            Subcontract Agreements
          </h2>
          <p className="mt-0.5 text-[12px] text-muted">
            Manage all agreements across {companyName}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <PrimaryButton
            onClick={() => setIsCreateModalOpen(true)}
            icon={Plus}
          >
            New Agreement
          </PrimaryButton>

          <SecondaryButton
            onClick={handleExport}
            disabled={isExporting}
            icon={Download}
          >
            {isExporting ? "Exporting..." : "Export"}
          </SecondaryButton>

          <SecondaryButton
            onClick={handleClearAllFilters}
            icon={SlidersHorizontal}
          >
            {hasActiveFilters ? "Reset Filters" : "Advanced Filters"}
          </SecondaryButton>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <AgreementSummaryCards
        summary={summaryData}
        isLoading={isSummaryLoading}
      />

      {/* Register Table Container */}
      <div className="rounded-xl border border-line bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        {/* Table Filters Toolbar */}
        <div className="border-b border-line/70 p-4 sm:p-5">
          {/* Main Search Bar */}
          <div className="mb-3.5 max-w-xl">
            <SearchInput
              value={searchQuery}
              onChange={setSearch}
              placeholder="Search agreement number, title, party or owner..."
              size="md"
            />
          </div>

          {/* Filter Pills Row */}
          <div className="flex flex-wrap items-center gap-2">
            <FilterDropdown
              label="Status: All Agreements"
              prefix="Status"
              value={statusFilter}
              options={STATUS_FILTER_OPTIONS}
              onChange={setStatus}
            />

            <FilterDropdown
              label="Agreement Type"
              prefix="Type"
              value={selectedType}
              options={TYPE_OPTIONS}
              onChange={setSelectedType}
            />

            <FilterDropdown
              label="Department"
              prefix="Dept"
              value={selectedDept}
              options={DEPARTMENT_OPTIONS}
              onChange={setSelectedDept}
            />

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="text-[12px] font-semibold text-rose-600 hover:underline px-2 py-1"
              >
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* Register Table */}
        <AgreementRegisterTable
          agreements={items}
          isLoading={isLoading}
          error={error}
          onRetry={reloadList}
          onViewAgreement={(agr) => setSelectedAgreement(agr)}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={handleClearAllFilters}
        />

        {/* Pagination & Results Count Footer */}
        <Pagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          totalItems={pagination.totalItems}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
          noun="agreements"
        />
      </div>

      {/* New Agreement Modal */}
      {isCreateModalOpen && (
        <NewAgreementModal
          onClose={() => setIsCreateModalOpen(false)}
          onCreated={handleAgreementCreated}
        />
      )}

      {/* Agreement Detail Drawer */}
      {selectedAgreement && (
        <AgreementDetailDrawer
          agreement={selectedAgreement}
          onClose={() => setSelectedAgreement(null)}
        />
      )}

      {/* Toast Feedback */}
      {toastMessage && (
        <Toast
          message={toastMessage.text}
          type={toastMessage.type}
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}

