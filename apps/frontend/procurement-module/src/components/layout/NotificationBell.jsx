import {
  Bell,
  ClipboardList,
  FileText,
  FileWarning,
  HardHat,
  Receipt,
  ReceiptText,
  ShieldCheck,
  Undo2,
} from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useNotifications } from "../../hooks/useNotifications.js";
import { buildHref } from "../../hooks/useHashRoute.js";
import {
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_TYPES,
  filterNotifications,
  formatRelativeTime,
  groupByDate,
} from "../../features/notifications/notificationService.js";

const TYPE_ICONS = {
  [NOTIFICATION_TYPES.pendingRequisition]: ClipboardList,
  [NOTIFICATION_TYPES.requisitionUpdate]: ShieldCheck,
  [NOTIFICATION_TYPES.pendingPoApproval]: FileText,
  [NOTIFICATION_TYPES.poUpdate]: FileText,
  [NOTIFICATION_TYPES.invoiceException]: FileWarning,
  [NOTIFICATION_TYPES.returnUpdate]: Undo2,
  [NOTIFICATION_TYPES.agreementUpdate]: HardHat,
  [NOTIFICATION_TYPES.subcontractBillUpdate]: ReceiptText,
};

const PRIORITY_STYLES = {
  [NOTIFICATION_PRIORITIES.high]: { icon: "bg-danger-soft text-danger", dot: "bg-danger" },
  [NOTIFICATION_PRIORITIES.medium]: { icon: "bg-warning-soft text-warning-strong", dot: "bg-warning-strong" },
  [NOTIFICATION_PRIORITIES.low]: { icon: "bg-success-muted text-success", dot: "bg-success" },
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
];

function NotificationItem({ notification, now, onOpen, onMarkRead }) {
  const Icon = TYPE_ICONS[notification.type] ?? Receipt;
  const style = PRIORITY_STYLES[notification.priority] ?? PRIORITY_STYLES[NOTIFICATION_PRIORITIES.medium];

  return (
    <li
      data-testid="notification-item"
      data-read={notification.read}
      className={`flex items-start gap-2 border-b border-line-soft px-3 py-2.5 sm:px-4 sm:py-3 ${
        notification.read ? "bg-surface" : "bg-brand-soft/40"
      }`}
    >
      <span className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-full ${style.icon}`}>
        <Icon size={17} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => onOpen(notification)}
          className="w-full text-left hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
        >
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className={`text-[13px] text-ink ${notification.read ? "font-medium" : "font-semibold"}`}>
              {notification.title}
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-muted">
              <span className={`size-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
              <span className="sr-only">{notification.priority} priority</span>
              <span aria-hidden="true" className="text-[10px] font-medium uppercase">
                {notification.priority}
              </span>
              <time dateTime={notification.createdAt}>{formatRelativeTime(notification.createdAt, now)}</time>
            </span>
          </span>
          <span className="mt-0.5 block break-words text-[12px] leading-4 text-muted">{notification.message}</span>
        </button>
      </div>
      {!notification.read ? (
        <button
          type="button"
          aria-label={`Mark ${notification.title} as read`}
          onClick={() => onMarkRead(notification.id)}
          className="shrink-0 self-center rounded-md border border-line bg-surface px-2 py-1 text-[10px] font-semibold text-navy hover:bg-workspace focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
        >
          Read
        </button>
      ) : null}
    </li>
  );
}

function NotificationBell({ size = "default" }) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [now, setNow] = useState(() => new Date());
  const rootRef = useRef(null);
  const panelId = useId();
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return undefined;
    const id = window.setInterval(() => setNow(new Date()), 30000);
    function onPointerDown(event) {
      if (!rootRef.current?.contains(event.target)) close();
    }
    function onKeyDown(event) {
      if (event.key === "Escape") close();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  const unreadOnly = filter === "unread";
  const visible = useMemo(() => filterNotifications(notifications, { unreadOnly }), [notifications, unreadOnly]);
  const groups = useMemo(() => groupByDate(visible, now), [visible, now]);

  const handleOpen = (notification) => {
    const href = buildHref(notification.route, notification.query ?? undefined);
    if (notification.route) {
      window.location.hash = href.slice(1);
    }
    markAsRead(notification.id);
    close();
  };

  const toggleOpen = () => {
    if (!open) setNow(new Date());
    setOpen((value) => !value);
  };

  const compact = size === "compact";
  const buttonClass = compact
    ? "relative grid size-8 place-items-center rounded-full text-[#1b2631] hover:bg-workspace focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
    : "relative grid size-9 place-items-center rounded-full bg-workspace text-ink hover:bg-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy";
  const emptyText =
    notifications.length === 0
      ? "No notifications yet."
      : unreadOnly
        ? "You're all caught up. No unread notifications."
        : "No notifications yet.";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={toggleOpen}
        className={buttonClass}
      >
        <Bell size={compact ? 19 : 18} strokeWidth={compact ? 2 : 2.25} aria-hidden="true" />
        {unreadCount > 0 ? (
          <span
            data-testid="notification-badge"
            className="absolute -right-0.5 -top-0.5 grid min-w-[17px] place-items-center rounded-full bg-danger px-1 text-[10px] font-bold leading-[17px] text-white"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <section
          id={panelId}
          role="dialog"
          aria-label="Notifications"
          data-testid="notification-panel"
          className="fixed inset-x-3 top-[72px] z-50 flex max-h-[min(520px,calc(100dvh-96px))] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl sm:inset-x-auto sm:right-3 sm:w-[min(400px,calc(100vw-1.5rem))] md:absolute md:right-0 md:top-11"
        >
          <header className="flex shrink-0 items-center justify-between px-4 pb-1 pt-3">
            <h2 className="text-[16px] font-bold text-ink">Notifications</h2>
            <button
              type="button"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className="text-[12px] font-semibold text-navy hover:underline disabled:cursor-not-allowed disabled:text-placeholder disabled:no-underline"
            >
              Mark all as read
            </button>
          </header>

          <div role="tablist" aria-label="Notification filter" className="flex shrink-0 gap-1 border-b border-line px-3">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={filter === f.key}
                onClick={() => setFilter(f.key)}
                className={`border-b-2 px-2.5 py-2 text-[13px] font-medium ${
                  filter === f.key ? "border-navy text-navy" : "border-transparent text-muted hover:text-ink"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div
            data-testid="notification-scroll"
            className="min-h-[120px] flex-1 overflow-y-auto overflow-x-hidden overscroll-contain scroll-smooth"
          >
            {groups.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
                <Bell size={26} className="text-placeholder" aria-hidden="true" />
                <p className="text-[13px] font-medium text-ink-soft">{emptyText}</p>
              </div>
            ) : (
              groups.map((group) => (
                <section key={group.label} aria-label={group.label}>
                  <h3 className="sticky top-0 bg-surface-muted px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
                    {group.label}
                  </h3>
                  <ul>
                    {group.items.map((n) => (
                      <NotificationItem key={n.id} notification={n} now={now} onOpen={handleOpen} onMarkRead={markAsRead} />
                    ))}
                  </ul>
                </section>
              ))
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default NotificationBell;