import { useEffect } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export function Toast({ message, type = "success", onClose, duration = 4000 }) {
  useEffect(() => {
    if (!duration) return undefined;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />,
    error: <AlertCircle size={18} className="shrink-0 text-rose-600" />,
    info: <Info size={18} className="shrink-0 text-blue-600" />,
  };

  const borders = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    error: "border-rose-200 bg-rose-50 text-rose-900",
    info: "border-blue-200 bg-blue-50 text-blue-900",
  };

  return (
    <div
      role="status"
      className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-xl border px-4 py-3 shadow-[0_10px_25px_rgba(0,0,0,0.12)] text-[13px] font-medium transition-all ${
        borders[type] || borders.success
      }`}
    >
      {icons[type]}
      <span>{message}</span>
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss toast"
        className="ml-2 rounded-md p-1 hover:bg-black/5"
      >
        <X size={14} />
      </button>
    </div>
  );
}

