export function StatCard({ label, value, subtext, tone = "default", isLoading = false }) {
  if (isLoading) {
    return (
      <div className="flex flex-col justify-between rounded-xl border border-line bg-surface p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-5">
        <div className="h-3.5 w-28 animate-pulse rounded bg-slate-200" />
        <div className="mt-3 h-8 w-20 animate-pulse rounded bg-slate-200" />
        <div className="mt-2 h-3 w-16 animate-pulse rounded bg-slate-100" />
      </div>
    );
  }

  const tonePills = {
    default: "text-muted bg-slate-100",
    success: "text-emerald-700 bg-emerald-50 border border-emerald-200/60",
    warning: "text-amber-700 bg-amber-50 border border-amber-200/60",
    danger: "text-rose-700 bg-rose-50 border border-rose-200/60",
    info: "text-blue-700 bg-blue-50 border border-blue-200/60",
  };

  return (
    <div className="flex flex-col justify-between rounded-xl border border-line bg-surface p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0_2px_6px_rgba(0,0,0,0.06)] sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          {label}
        </span>
        {subtext && (
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium leading-none ${tonePills[tone] || tonePills.default}`}>
            {subtext}
          </span>
        )}
      </div>
      <div className="mt-2.5">
        <span className="text-[26px] font-bold tracking-tight text-ink sm:text-[28px]">
          {value}
        </span>
      </div>
    </div>
  );
}

