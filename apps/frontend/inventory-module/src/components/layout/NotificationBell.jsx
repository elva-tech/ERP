import { useEffect, useId, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDownLeft,
  Bell,
  BellOff,
  Check,
  ClipboardCheck,
  PackageX,
  Truck,
} from "lucide-react";
import { buildHref } from "../../hooks/useHashRoute.js";
import { useNotifications } from "../../hooks/useNotifications.js";
import {
  NOTIFICATION_TYPES,
  filterNotifications,
  formatRelativeTime,
  getNotificationCategory,
  groupByDate,
} from "../../features/notifications/services/notificationService.js";

const CLOCK_TICK_MS = 30000;

const PRIORITY_STYLES = {
  High: "bg-danger-soft text-danger",
  Medium: "bg-amber-100 text-amber-700",
  Low: "bg-success-soft text-emerald-700",
};

const TYPE_ICONS = {
  [NOTIFICATION_TYPES.lowStock]: { icon: AlertTriangle, tone: "bg-amber-100 text-amber-600" },
  [NOTIFICATION_TYPES.outOfStock]: { icon: PackageX, tone: "bg-danger-soft text-danger" },
  [NOTIFICATION_TYPES.pendingGrn]: { icon: ArrowDownLeft, tone: "bg-sky-100 text-sky-700" },
  [NOTIFICATION_TYPES.pendingDeliveryNote]: { icon: Truck, tone: "bg-indigo-100 text-indigo-700" },
  [NOTIFICATION_TYPES.stockDiscrepancy]: { icon: ClipboardCheck, tone: "bg-brand-soft text-brand" },
};

const BUTTON_STYLES = {
  default: "size-9 bg-workspace text-ink hover:bg-line",
  compact: "size-8 text-[#1b2631] hover:bg-workspace",
};

function NotificationItem({ notification, now, onSelect, onMarkRead }) {
  const { icon: Icon, tone } = TYPE_ICONS[notification.type] ?? TYPE_ICONS[NOTIFICATION_TYPES.lowStock];
  return (
    <li
      className={`relative flex items-start gap-3 border-b border-line-soft px-5 py-3.5 hover:bg-workspace ${
        notification.read ? "bg-surface" : "bg-[#f4f7fc]"
      }`}
    >
      {!notification.read && <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px] bg-navy" />}
      <span className={`grid size-10 shrink-0 place-items-center rounded-full ${tone}`}>
        <Icon size={18} aria-hidden="true" />
      </span>
      <button type="button" onClick={() => onSelect(notification)} className="min-w-0 flex-1 text-left">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className={`text-[14px] leading-5 text-ink ${notification.read ? "font-medium" : "font-semibold"}`}
          >
            {notification.title}
          </span>
          <span className="rounded-full border border-line bg-surface-muted px-2 py-0.5 text-[11px] font-medium leading-4 text-muted">
            {getNotificationCategory(notification)}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold leading-4 ${
              PRIORITY_STYLES[notification.priority] ?? PRIORITY_STYLES.Low
            }`}
          >
            {notification.priority}
          </span>
        </span>
        <span className="mt-1 line-clamp-3 block break-words text-[13px] leading-[18px] text-muted">{notification.message}</span>
      </button>
      <span className="flex shrink-0 flex-col items-end gap-1.5">
        <span className="text-[12px] leading-5 text-muted">{formatRelativeTime(notification.createdAt, now)}</span>
        {!notification.read && (
          <button
            type="button"
            onClick={() => onMarkRead(notification.id)}
            aria-label={`Mark ${notification.title} as read`}
            title="Mark as read"
            className="grid size-6 place-items-center rounded-full text-muted hover:bg-line hover:text-ink"
          >
            <Check size={13} aria-hidden="true" />
          </button>
        )}
      </span>
    </li>
  );
}

const FILTER_TABS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
];

function getEmptyText({ unreadOnly, hasAny }) {
  if (!hasAny) return "No notifications yet.";
  if (unreadOnly) return "You're all caught up. No unread notifications.";
  return "No notifications yet.";
}

function NotificationBell({ variant = "default" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [now, setNow] = useState(() => new Date());
  const containerRef = useRef(null);
  const panelId = useId();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  useEffect(() => {
    if (!isOpen) return undefined;
    setNow(new Date());
    const intervalId = window.setInterval(() => setNow(new Date()), CLOCK_TICK_MS);
    function handlePointerDown(event) {
      if (!containerRef.current?.contains(event.target)) setIsOpen(false);
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const unreadOnly = activeTab === "unread";
  const visible = filterNotifications(notifications, { unreadOnly });
  const groups = groupByDate(visible, now);

  function handleSelect(notification) {
    // Navigate first so the state updates below can never swallow the route change.
    window.location.hash = buildHref(notification.route).slice(1);
    markAsRead(notification.id);
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
        className={`relative grid place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy ${BUTTON_STYLES[variant]}`}
      >
        <Bell size={variant === "compact" ? 19 : 18} strokeWidth={2.25} aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            data-testid="notification-badge"
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold leading-4 text-white ring-2 ring-surface"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Notifications"
          className="fixed inset-x-3 top-[72px] z-30 flex max-h-[min(520px,calc(100dvh-88px))] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-2xl border border-navy/50 bg-surface shadow-[0_16px_40px_rgba(15,23,42,0.18)] sm:inset-x-auto sm:right-3 sm:w-[400px] md:absolute md:right-0 md:top-full md:mt-2 md:max-h-[min(520px,calc(100dvh-96px))]"
        >
          <div className="shrink-0">
            <div className="flex items-center justify-between gap-2.5 px-5 pt-4">
              <h2 className="text-[20px] font-bold leading-7 text-ink">Notifications</h2>
              <button
                type="button"
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
                className="whitespace-nowrap text-[13px] font-semibold text-navy hover:underline disabled:cursor-not-allowed disabled:text-placeholder disabled:no-underline"
              >
                Mark all as read
              </button>
            </div>

            <div
              role="tablist"
              aria-label="Notification filter"
              className="flex gap-5 overflow-x-auto overflow-y-hidden px-5 pt-1"
            >
              {FILTER_TABS.map((tab) => {
                const selected = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setActiveTab(tab.key)}
                    className={`shrink-0 border-b-2 py-2.5 text-[14px] font-semibold ${
                      selected ? "border-navy text-navy" : "border-transparent text-muted hover:text-ink"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="border-b border-line" />
          </div>

          {groups.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
              <BellOff size={26} className="text-placeholder" aria-hidden="true" />
              <p className="text-[13px] text-muted">
                {getEmptyText({ unreadOnly, hasAny: notifications.length > 0 })}
              </p>
            </div>
          ) : (
            <div data-testid="notification-scroll" className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain scroll-smooth">
              {groups.map((group) => (
                <section key={group.label} aria-label={group.label}>
                  <h3 className="border-b border-dashed border-line bg-surface px-5 pb-1.5 pt-3 text-[12px] font-semibold uppercase tracking-wide text-placeholder">
                    {group.label}
                  </h3>
                  <ul aria-label={`${group.label} notifications`}>
                    {group.items.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        now={now}
                        onSelect={handleSelect}
                        onMarkRead={markAsRead}
                      />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
