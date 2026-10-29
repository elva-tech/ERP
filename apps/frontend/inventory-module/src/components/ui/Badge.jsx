import React from "react";
import { BADGE_BASE_CLASS, badgeToneClass } from "./badgeStyles.js";

function Badge({ tone, className = "", children }) {
  return <span className={`${BADGE_BASE_CLASS} ${badgeToneClass(tone)} ${className}`}>{children}</span>;
}

/**
 * Renders a backend status value using a feature's status->{label, tone} map.
 * Unknown statuses are shown verbatim in a neutral badge rather than hidden.
 */
export function StatusBadge({ status, statusMap, className }) {
  if (!status) return <span className="text-muted">—</span>;
  const config = statusMap[status] ?? { label: status, tone: "neutral" };
  return (
    <Badge tone={config.tone} className={className}>
      {config.label}
    </Badge>
  );
}

export default Badge;
