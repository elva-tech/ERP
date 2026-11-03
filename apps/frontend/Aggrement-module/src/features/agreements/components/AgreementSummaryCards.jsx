import { StatCard } from "../../../components/ui/StatCard.jsx";
import { formatInrCompact } from "../../../lib/formatters.js";

export function AgreementSummaryCards({ summary, isLoading = false }) {
  const cards = [
    {
      key: "active",
      label: "Total Active Agreements",
      value: summary?.activeCount ?? 0,
      subtext: summary?.activeCount > 0 ? "Active portfolio" : undefined,
      tone: "info",
    },
    {
      key: "value",
      label: "Cumulative Contract Value",
      value: formatInrCompact(summary?.cumulativeValue ?? 0, { fractionDigits: 2 }),
      subtext: "Total committed",
      tone: "default",
    },
    {
      key: "completed",
      label: summary?.completedPeriodLabel
        ? `Completed (${summary.completedPeriodLabel})`
        : "Completed (FY 25)",
      value: summary?.completedCount ?? 0,
      subtext: "Discharged",
      tone: "success",
    },
    {
      key: "expired",
      label: "Expired / Pending Renewal",
      value: summary?.expiredOrPendingRenewalCount ?? 0,
      subtext: summary?.expiredOrPendingRenewalCount > 0 ? "Requires action" : "All current",
      tone: summary?.expiredOrPendingRenewalCount > 0 ? "warning" : "default",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <StatCard
          key={card.key}
          label={card.label}
          value={card.value}
          subtext={card.subtext}
          tone={card.tone}
          isLoading={isLoading}
        />
      ))}
    </div>
  );
}

