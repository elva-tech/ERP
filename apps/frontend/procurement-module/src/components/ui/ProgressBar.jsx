/** Backend-reported completion percentage. Red while in progress, green once complete, as designed. */
function ProgressBar({ percent, label }) {
  const value = Number(percent);
  if (percent === null || percent === undefined || percent === "" || Number.isNaN(value)) {
    return <span className="text-placeholder">—</span>;
  }
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className="w-[110px]">
      <span className="block text-[10px] leading-3 text-muted">{percent}%</span>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
        aria-label={label}
        className="mt-[3px] h-1 overflow-hidden rounded-full bg-line-soft"
      >
        <div className={`h-full rounded-full ${clamped >= 100 ? "bg-success" : "bg-brand"}`} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}

export default ProgressBar;
