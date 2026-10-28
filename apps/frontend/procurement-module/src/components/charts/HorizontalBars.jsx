/**
 * Ranked horizontal bars (label left, value right, bar below). Widths are scaled to `axisMax` when the API
 * supplies one, otherwise to the top value; the scaling is for display only.
 * @param {{ rows: Array<{ key: string, label: string, value: string, valueLabel: string }>, axisMax?: string | null,
 *   ariaLabel: string }} props
 */
function HorizontalBars({ rows, axisMax, ariaLabel }) {
  const values = rows.map((row) => Math.max(0, Number(row.value) || 0));
  const max = Number(axisMax) > 0 ? Number(axisMax) : Math.max(...values, 0);
  return (
    <ul aria-label={ariaLabel} className="space-y-[9px]">
      {rows.map((row, index) => (
        <li key={row.key}>
          <div className="flex items-center justify-between gap-3 text-[11px] leading-[14px]">
            <span className="truncate text-ink">{row.label}</span>
            <span className="shrink-0 font-semibold text-brand">{row.valueLabel}</span>
          </div>
          <div aria-hidden="true" className="mt-[3px] h-[6px] overflow-hidden rounded-full bg-line-soft">
            <div className="h-full rounded-full bg-navy" style={{ width: `${max > 0 ? (values[index] / max) * 100 : 0}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default HorizontalBars;
