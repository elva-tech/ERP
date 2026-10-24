import { useCallback, useState } from "react";
import { Calendar } from "lucide-react";
import { ResourceBoundary } from "../components/ui/AsyncState.jsx";
import FilterSelect from "../components/ui/FilterSelect.jsx";
import ListFooter from "../components/ui/ListFooter.jsx";
import Panel from "../components/ui/Panel.jsx";
import { useAsyncResource } from "../hooks/useAsyncResource.js";
import { useLookupOptions } from "../hooks/useLookupOptions.js";
import { useServerList } from "../hooks/useServerList.js";
import { createIdempotencyKey } from "../lib/apiClient.js";
import { downloadFile } from "../lib/downloadFile.js";
import GeneratedReportsTable from "../features/reports/components/GeneratedReportsTable.jsx";
import ReportCard from "../features/reports/components/ReportCard.jsx";
import {
  downloadGeneratedReport,
  generateReport,
  listGeneratedReports,
  listReportDefinitions,
} from "../features/reports/reportService.js";

function PurchaseReportsPage({ onNotify }) {
  const periods = useLookupOptions("reportingPeriods");
  const [periodId, setPeriodId] = useState("");
  const loadDefinitions = useCallback((signal) => listReportDefinitions("purchase", signal), []);
  const definitions = useAsyncResource(loadDefinitions, "report-definitions:purchase");
  const generated = useServerList(listGeneratedReports, {}, { pageSize: 5 });
  const [generatingKey, setGeneratingKey] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const reports = definitions.status === "success" ? (definitions.data?.items ?? []) : [];
  const periodValue = periodId || periods.defaultValue;
  const periodOptions = periods.options.length ? periods.options : [{ value: "", label: "—" }];

  async function handleGenerate(report) {
    setGeneratingKey(report.key);
    try {
      await generateReport(
        { reportKey: report.key, periodId: periodValue, format: report.formats?.[0] ?? "pdf" },
        { idempotencyKey: createIdempotencyKey() },
      );
      generated.resource.reload();
      onNotify(`${report.title} requested. It will appear in Recently Generated when ready.`);
    } catch (error) {
      onNotify(error.message, "error");
    } finally {
      setGeneratingKey(null);
    }
  }

  async function handleDownload(report) {
    setDownloadingId(report.id);
    try {
      downloadFile(await downloadGeneratedReport(report.id), report.fileName);
    } catch (error) {
      onNotify(error.message, "error");
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div>
        <FilterSelect
          label="Reporting Period"
          icon={Calendar}
          value={periodValue}
          options={periodOptions}
          disabled={periods.status !== "success"}
          onChange={setPeriodId}
        />
      </div>

      {definitions.status === "success" && reports.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {reports.map((report) => (
            <ReportCard key={report.key} report={report} onGenerate={handleGenerate} isGenerating={generatingKey === report.key} />
          ))}
        </div>
      ) : (
        <Panel>
          <ResourceBoundary resource={definitions} isEmpty emptyTitle="No reports available for your role" compact />
        </Panel>
      )}

      <Panel className="px-4 pb-4 pt-[15px]">
        <h2 className="mb-2 text-[13px] font-bold leading-5 text-ink">Recently Generated &amp; Schedules</h2>
        <GeneratedReportsTable
          reports={generated.items}
          resource={generated.resource}
          onDownload={handleDownload}
          downloadingId={downloadingId}
        />
        <ListFooter pagination={generated.pagination} itemCount={generated.items.length} noun="reports" onPageChange={generated.setPage} />
      </Panel>
    </div>
  );
}

export default PurchaseReportsPage;
