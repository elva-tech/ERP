import StatCard from "./StatCard.jsx";

/**
 * Row of four KPI tiles fed by a summary resource. Values are formatted API figures;
 * while loading or on error each tile shows an em dash instead of a misleading zero.
 * @param {{ resource: { status: string, data: any }, cards: Array<{ key: string, label: string | ((data: any) => string),
 *   tone?: string, format: (data: any) => string | null }> }} props
 */
function SummaryCards({ resource, cards, className = "" }) {
  const data = resource.status === "success" ? resource.data : null;
  return (
    <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 ${className}`}>
      {cards.map((card) => (
        <StatCard
          key={card.key}
          label={typeof card.label === "function" ? card.label(data) : card.label}
          value={data ? card.format(data) : null}
          tone={card.tone}
        />
      ))}
    </div>
  );
}

export default SummaryCards;
