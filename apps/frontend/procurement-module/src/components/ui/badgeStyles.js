const TONE_CLASSES = {
  success: "bg-success-soft text-success",
  successMuted: "bg-success-muted text-success",
  warning: "bg-warning-soft text-warning",
  warningStrong: "bg-warning-soft text-warning-strong",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
  navy: "bg-sent-soft text-navy",
  neutral: "bg-workspace text-muted",
};

export const BADGE_BASE_CLASS =
  "inline-flex h-[21px] items-center justify-center rounded px-2 text-[11px] font-semibold leading-[13px] whitespace-nowrap";

export function badgeToneClass(tone) {
  return TONE_CLASSES[tone] ?? TONE_CLASSES.neutral;
}
