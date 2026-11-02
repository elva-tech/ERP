import {
  Bell,
  Building2,
  Check,
  CheckCheck,
  ChevronDown,
  ClipboardList,
  FileText,
  MoreHorizontal,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Truck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNotifications } from "../../hooks/useNotifications.js";
import { buildHref } from "../../hooks/useHashRoute.js";
import {
  NOTIFICATION_MODULES,
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_TABS,
  NOTIFICATION_TYPES,
  filterNotifications,
  formatRelativeTime,
  getNotificationCategory,
  groupByDate,
} from "../../features/notifications/notificationService.js";

const TYPE_ICONS = {
  [NOTIFICATION_TYPES.pendingRequisition]: ClipboardList,
  [NOTIFICATION_TYPES.pendingPoApproval]: FileText,
  [NOTIFICATION_TYPES.poUpdate]: Truck,
  [NOTIFICATION_TYPES.supplierUpdate]: Building2,
  [NOTIFICATION_TYPES.workflowDecision]: ShieldCheck,
};

const PRIORITY_STYLES = {
  [NOTIFICATION_PRIORITIES.high]: { icon: "bg-danger-soft text-danger", dot: "bg-danger" },
  [NOTIFICATION_PRIORITIES.medium]: { icon: "bg-warning-soft text-warning-strong", dot: "bg-warning-strong" },
  [NOTIFICATION_PRIORITIES.low]: { icon: "bg-success-muted text-success", dot: "bg-success" },
};

function useOutsideDismiss(ref, open, onClose) {
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) onClose();
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [ref, open, onClose]);
}

function ModuleFilter({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOutsideDismiss(ref, open, () => setOpen(false));
  const current = NOTIFICATION_MODULES.find((m) => m.key === value) ?? NOTIFICATION_MODULES[0];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={`Module filter: ${current.label}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 items-center gap-1.5 rounded-md border border-field-line bg-surface px-2.5 text-[12px] font-medium text-ink-soft hover:bg-workspace"
      >
        {current.label}
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open ? (
        <ul role="listbox" aria-label="Modules" className="absolute left-0 top-9 z-10 w-40 rounded-lg border border-line bg-surface py-1 shadow-lg">
          {NOTIFICATION_MODULES.map((module) => (
            <li key={module.key} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={module.key === value}
                disabled={!module.available}
                onClick={() => {
                  onChange(module.key);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between px-3 py-1.5 text-left text-[12px] text-ink-soft hover:bg-workspace disabled:cursor-not-allowed disabled:text-placeholder disabled:hover:bg-transparent"
              >
                {module.label}
                {module.available ? (
                  module.key === value ? <Check size={14} aria-hidden="true" /> : null
                ) : (
                  <span className="text-[10px] uppercase">Soon</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function MoreMenu({ onMarkAll, onClearRead, onRefresh }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOutsideDismiss(ref, open, () => setOpen(false));
  const run = (action) => () => {
    action();
    setOpen(false);
  };
  const itemClass = "flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-ink-soft hover:bg-workspace";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="More notification actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="grid size-8 place-items-center rounded-md text-muted hover:bg-workspace"
      >
        <MoreHorizontal size={17} aria-hidden="true" />
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 top-9 z-10 w-44 rounded-lg border border-line bg-surface py-1 shadow-lg">
          <button type="button" role="menuitem" onClick={run(onMarkAll)} className={itemClass}>
            <CheckCheck size={14} aria-hidden="true" /> Mark all as read
          </button>
          <button type="button" role="menuitem" onClick={run(onClearRead)} className={itemClass}>
            <Trash2 size={14} aria-hidden="true" /> Clear read
          </button>
          <button type="button" role="menuitem" onClick={run(onRefresh)} className={itemClass}>
            <RefreshCw size={14} aria-hidden="true" /> Refresh
          </button>
        </div>
      ) : null}
    </div>
  );
}

function NotificationItem({ notification, now, onOpen, onMarkRead }) {
  const Icon = TYPE_ICONS[notification.type] ?? Bell;
  const style = PRIORITY_STYLES[notification.priority] ?? PRIORITY_STYLES[NOTIFICATION_PRIORITIES.medium];

  return (
    <li
      data-testid="notification-item"
      data-read={notification.read}
      className={`group relative border-b border-line-soft ${notification.read ? "bg-surface" : "bg-brand-soft/40"}`}
    >
      <button
        type="button"
        onClick={() => onOpen(notification)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-workspace"
      >
        <span className={`grid size-9 shrink-0 place-items-center rounded-full ${style.icon}`}>
          <Icon size={17} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className={`truncate text-[13px] text-ink ${notification.read ? "font-medium" : "font-semibold"}`}>
              {notification.title}
            </span>
            <span className="shrink-0 rounded bg-workspace px-1.5 py-0.5 text-[10px] font-medium text-muted">
              {getNotificationCategory(notification)}
            </span>
            <span className="ml-auto flex shrink-0 items-center gap-1.5 text-[11px] text-muted">
              <span className={`size-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
              <span className="sr-only">{notification.priority} priority</span>
              <span aria-hidden="true" className="text-[10px] font-medium uppercase">{notification.priority}</span>
              <time dateTime={notification.createdAt}>{formatRelativeTime(notification.createdAt, now)}</time>
            </span>
          </span>
          <span className="mt-0.5 block text-[12px] leading-4 text-muted">{notification.message}</span>
        </span>
        {!notification.read ? <span data-testid="unread-dot" className="mt-2 size-2 shrink-0 rounded-full bg-brand" aria-hidden="true" /> : null}
      </button>
      {!notification.read ? (
        <button
          type="button"
          aria-label={`Mark ${notification.title} as read`}
          onClick={() => onMarkRead(notification.id)}
          className="absolute bottom-1.5 right-3 hidden rounded px-1.5 py-0.5 text-[10px] font-medium text-brand hover:bg-brand-soft group-hover:block focus:block"
        >
          Mark as read
        </button>
      ) : null}
    </li>
  );
}

function NotificationBell({ size = "default" }) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearRead, refresh } = useNotifications();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("all");
  const [module, setModule] = useState("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const rootRef = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useOutsideDismiss(rootRef, open, close);

  useEffect(() => {
    if (!open) return undefined;
    const id = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(id);
  }, [open]);

  const visible = useMemo(
    () => filterNotifications(notifications, { tab, module, unreadOnly }),
    [notifications, tab, module, unreadOnly],
  );
  const groups = useMemo(() => groupByDate(visible, now), [visible, now]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
      setNow(new Date());
    } finally {
      setRefreshing(false);
    }
  };

  const handleOpen = (notification) => {
    markAsRead(notification.id);
    setOpen(false);
    window.location.hash = buildHref(notification.route, notification.query ?? undefined).slice(1);
  };

  const toggleOpen = () => {
    if (!open) setNow(new Date());
    setOpen(!open);
  };

  const compact = size === "compact";
  const buttonClass = compact
    ? "relative grid size-8 place-items-center rounded-full text-[#1b2631] hover:bg-workspace"
    : "relative grid size-9 place-items-center rounded-full bg-workspace text-ink hover:bg-line";
  const emptyText =
    notifications.length === 0
      ? "No notifications yet"
      : unreadOnly
        ? "You're all caught up"
        : "No notifications in this view";

  return (
    <div ref={rootRef} className="md:relative">
      <button
        type="button"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-haspopup="dialog"
        aria-expanded={open}
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
          role="dialog"
          aria-label="Notifications"
          data-testid="notification-panel"
          className="fixed inset-x-3 top-[72px] z-50 flex max-h-[min(540px,calc(100vh-96px))] flex-col overflow-hidden rounded-2xl border border-navy/50 bg-surface shadow-2xl md:absolute md:inset-x-auto md:right-0 md:top-11 md:w-[540px]"
        >
          <header className="flex shrink-0 items-center justify-between px-4 pb-1 pt-3">
            <div className="flex items-center gap-2">
              <h2 className="text-[16px] font-bold text-ink">Notifications</h2>
              <button
                type="button"
                aria-label="Refresh notifications"
                onClick={handleRefresh}
                disabled={refreshing}
                className="grid size-7 place-items-center rounded-full text-muted hover:bg-workspace"
              >
                <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} aria-hidden="true" />
              </button>
            </div>
          </header>

          <div role="tablist" aria-label="Notification categories" className="flex shrink-0 gap-1 overflow-x-auto border-b border-line px-3">
            {NOTIFICATION_TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={`flex shrink-0 items-center gap-1 border-b-2 px-2.5 py-2 text-[13px] font-medium ${
                  tab === t.key ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-3 border-b border-line bg-surface-muted px-4 py-2">
            <ModuleFilter value={module} onChange={setModule} />
            <label className="flex cursor-pointer items-center gap-1.5 text-[12px] text-ink-soft">
              <input
                type="checkbox"
                checked={unreadOnly}
                onChange={(e) => setUnreadOnly(e.target.checked)}
                className="size-3.5 accent-brand"
              />
              Unread
            </label>
            <button
              type="button"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className="ml-auto text-[12px] font-medium text-brand hover:underline disabled:cursor-not-allowed disabled:text-placeholder disabled:no-underline"
            >
              Mark all as read
            </button>
            <MoreMenu onMarkAll={markAllAsRead} onClearRead={clearRead} onRefresh={handleRefresh} />
          </div>

          <div data-testid="notification-scroll" className="min-h-[120px] flex-1 overflow-y-auto">
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
