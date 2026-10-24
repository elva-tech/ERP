/**
 * Vertical bars for backend-supplied series. Bar heights are scaled to the largest value purely for
 * display; the figures themselves come from the API and are exposed to assistive tech as a list.
 * @param {{ points: Array<{ key: string, label: string, value: string, valueLabel?: string }>, height?: number,
 *   barWidth?: number, ariaLabel: string, className?: string }} props
 */
function ColumnChart({ points, height = 120, barWidth = 32, ariaLabel, className = "" }) {
  const values = points.map((point) => Math.max(0, Number(point.value) || 0));
  const max = Math.max(...values, 0);

  return (
    <figure className={`flex flex-col ${className}`}>
      <ul aria-label={ariaLabel} className="flex flex-1 items-end justify-around gap-2">
        {points.map((point, index) => {
          const barHeight = max > 0 ? Math.max(2, Math.round((values[index] / max) * height)) : 2;
          return (
            <li key={point.key} className="flex min-w-0 flex-col items-center gap-[7px]">
              <span
                aria-hidden="true"
                className="block rounded-t-[3px] bg-navy"
                style={{ height: barHeight, width: barWidth }}
              />
              <span className="text-[10px] leading-3 text-muted">{point.label}</span>
              <span className="sr-only">{point.valueLabel ?? point.value}</span>
            </li>
          );
        })}
      </ul>
    </figure>
  );
}

export default ColumnChart;
