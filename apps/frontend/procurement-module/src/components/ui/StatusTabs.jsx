/**
 * @param {{ tabs: Array<{ value: string, label: string }>, value: string, onChange: (value: string) => void, ariaLabel: string }} props
 */
function StatusTabs({ tabs, value, onChange, ariaLabel }) {
  return (
    <div role="group" aria-label={ariaLabel} className="flex flex-wrap items-center gap-2">
      {tabs.map((tab) => {
        const isActive = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(tab.value)}
            className={`h-[31px] rounded-md border px-3 text-[12px] leading-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy ${
              isActive
                ? "border-line bg-navy font-semibold text-white"
                : "border-line bg-surface text-muted hover:bg-workspace"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export default StatusTabs;
