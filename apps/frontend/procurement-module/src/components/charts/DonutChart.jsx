const SEGMENT_COLORS = {
  navy: "#1b2a4a",
  brand: "#c41e3a",
  success: "#10b981",
  warning: "#f59e0b",
};

/**
 * Donut drawn from backend share percentages; the legend repeats the labels so colour is not the only cue.
 * @param {{ segments: Array<{ key: string, label: string, sharePercent: string, color: keyof typeof SEGMENT_COLORS }>,
 *   size?: number, thickness?: number, centerCaption?: string, centerValue?: string, ariaLabel: string }} props
 */
function DonutChart({ segments, size = 112, thickness = 20, centerCaption, centerValue, ariaLabel }) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const lengths = segments.map((segment) => (Math.max(0, Number(segment.sharePercent) || 0) / 100) * circumference);
  const offsets = lengths.map((_, index) => lengths.slice(0, index).reduce((sum, length) => sum + length, 0));

  return (
    <figure className="flex flex-wrap items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={ariaLabel} className="shrink-0">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f1f5f9" strokeWidth={thickness} />
          {segments.map((segment, index) => (
            <circle
              key={segment.key}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={SEGMENT_COLORS[segment.color] ?? SEGMENT_COLORS.navy}
              strokeWidth={thickness}
              strokeDasharray={`${lengths[index]} ${circumference - lengths[index]}`}
              strokeDashoffset={-offsets[index]}
            />
          ))}
        </g>
        {centerValue && (
          <>
            <text x="50%" y="44%" textAnchor="middle" className="fill-muted text-[8px] uppercase">
              {centerCaption}
            </text>
            <text x="50%" y="60%" textAnchor="middle" className="fill-ink text-[13px] font-bold">
              {centerValue}
            </text>
          </>
        )}
      </svg>
      <ul className="space-y-[7px]">
        {segments.map((segment) => (
          <li key={segment.key} className="flex items-center gap-2 text-[11px] leading-4 text-muted">
            <span
              aria-hidden="true"
              className="size-[9px] shrink-0 rounded-[2px]"
              style={{ backgroundColor: SEGMENT_COLORS[segment.color] ?? SEGMENT_COLORS.navy }}
            />
            {segment.label} ({segment.sharePercent}%)
          </li>
        ))}
      </ul>
    </figure>
  );
}

export default DonutChart;
