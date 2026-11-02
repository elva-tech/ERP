import { useEffect, useId, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDownLeft,
  Bell,
  BellOff,
  Check,
  ChevronDown,
  ClipboardCheck,
  EllipsisVertical,
  PackageX,
  RefreshCw,
  Truck,
} from "lucide-react";
import { buildHref } from "../../hooks/useHashRoute.js";
import { useNotifications } from "../../hooks/useNotifications.js";
import {
  NOTIFICATION_MODULES,
  NOTIFICATION_TABS,
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

const MENU_PANEL = "absolute top-full z-10 mt-1 overflow-hidden rounded-lg border border-line bg-surface py-1 shadow-[0_8px_24px_rgba(15,23,42,0.12)]";
const MENU_ITEM =
  "flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium text-ink hover:bg-workspace disabled:cursor-not-allowed disabled:text-placeholder disabled:hover:bg-transparent";

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
        <span className="mt-1 line-clamp-3 block text-[13px] leading-[18px] text-muted">{notification.message}</span>
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

function ModuleFilter({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);
  const current = NOTIFICATION_MODULES.find((m) => m.key === value) ?? NOTIFICATION_MODULES[0];

  useEffect(() => {
    if (!isOpen) return undefined;
    function handlePointerDown(event) {
      if (!ref.current?.contains(event.target)) setIsOpen(false);
    }
    function handleKeyDown(event) {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      setIsOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isOpen]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Module filter: ${current.label}`}
        className="flex items-center gap-1 rounded-md py-1 text-[13px] font-semibold text-ink hover:text-navy"
      >
        {current.label}
        <ChevronDown size={14} aria-hidden="true" className={isOpen ? "rotate-180" : ""} />
      </button>
      {isOpen && (
        <div role="listbox" aria-label="Modules" className={`${MENU_PANEL} left-0 w-44`}>
          {NOTIFICATION_MODULES.map((module) => (
            <button
              key={module.key}
              type="button"
              role="option"
              aria-selected={module.key === value}
              disabled={!module.available}
              onClick={() => {
                onChange(module.key);
                setIsOpen(false);
              }}
              className={MENU_ITEM}
            >
              <span className="flex-1">{module.label}</span>
              {!module.available && <span className="text-[10px] font-normal">Soon</span>}
              {module.key === value && <Check size={13} aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MoreMenu({ unreadCount, hasRead, onMarkAll, onClearRead, onRefresh }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    function handlePointerDown(event) {
      if (!ref.current?.contains(event.target)) setIsOpen(false);
    }
    function handleKeyDown(event) {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      setIsOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isOpen]);

  function run(action) {
    setIsOpen(false);
    action();
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="More notification actions"
        className="grid size-7 place-items-center rounded-full text-muted hover:bg-line hover:text-ink"
      >
        <EllipsisVertical size={16} aria-hidden="true" />
      </button>
      {isOpen && (
        <div role="menu" aria-label="Notification actions" className={`${MENU_PANEL} right-0 w-52`}>
          <button type="button" role="menuitem" disabled={unreadCount === 0} onClick={() => run(onMarkAll)} className={MENU_ITEM}>
            Mark all as read
          </button>
          <button type="button" role="menuitem" disabled={!hasRead} onClick={() => run(onClearRead)} className={MENU_ITEM}>
            Clear read notifications
          </button>
          <button type="button" role="menuitem" onClick={() => run(onRefresh)} className={MENU_ITEM}>
            Refresh notifications
          </button>
        </div>
      )}
    </div>
  );
}

function getEmptyText({ unreadOnly, tab, module, hasAny }) {
  if (!hasAny) return "No notifications yet.";
  if (unreadOnly) return "You're all caught up. No unread notifications.";
  if (tab !== "all" || module !== "all") return "No notifications match these filters.";
  return "No notifications yet.";
}

function NotificationBell({ variant = "default" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const containerRef = useRef(null);
  const panelId = useId();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearRead, refresh } = useNotifications();

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

  const visible = filterNotifications(notifications, { tab: activeTab, module: moduleFilter, unreadOnly });
  const groups = groupByDate(visible, now);

  function handleSelect(notification) {
    markAsRead(notification.id);
    setIsOpen(false);
    window.location.hash = buildHref(notification.route).slice(1);
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    await refresh();
    setNow(new Date());
    setIsRefreshing(false);
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
          className="fixed inset-x-3 top-[72px] z-30 flex max-h-[min(540px,calc(100vh-88px))] flex-col overflow-hidden rounded-2xl border border-navy/50 bg-surface shadow-[0_16px_40px_rgba(15,23,42,0.18)] md:absolute md:inset-x-auto md:right-0 md:top-full md:mt-2 md:w-[540px] md:max-h-[min(540px,calc(100vh-96px))]"
        >
          <div className="shrink-0">
            <div className="flex items-center gap-2.5 px-5 pt-4">
              <h2 className="text-[20px] font-bold leading-7 text-ink">Notifications</h2>
              <button
                type="button"
                onClick={handleRefresh}
                aria-label="Refresh notifications"
                className="grid size-7 place-items-center rounded-full text-muted hover:bg-workspace hover:text-ink"
              >
                <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} aria-hidden="true" />
              </button>
            </div>

            <div
              role="tablist"
              aria-label="Notification categories"
              className="flex gap-5 overflow-x-auto overflow-y-hidden px-5 pt-1"
            >
              {NOTIFICATION_TABS.map((tab) => {
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

            <div className="flex items-center gap-4 border-y border-line bg-surface-muted px-5 py-2.5">
              <ModuleFilter value={moduleFilter} onChange={setModuleFilter} />
              <div className="ml-auto flex items-center gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink-soft">
                  <input
                    type="checkbox"
                    checked={unreadOnly}
                    onChange={(event) => setUnreadOnly(event.target.checked)}
                    className="size-4 rounded border-field-line accent-navy"
                  />
                  Unread
                </label>
                <button
                  type="button"
                  onClick={markAllAsRead}
                  disabled={unreadCount === 0}
                  className="whitespace-nowrap text-[13px] font-semibold text-navy hover:underline disabled:cursor-not-allowed disabled:text-placeholder disabled:no-underline"
                >
                  Mark all as read
                </button>
                <span aria-hidden="true" className="h-4 w-px bg-line" />
                <MoreMenu
                  unreadCount={unreadCount}
                  hasRead={notifications.some((n) => n.read)}
                  onMarkAll={markAllAsRead}
                  onClearRead={clearRead}
                  onRefresh={handleRefresh}
                />
              </div>
            </div>
          </div>

          {groups.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
              <BellOff size={26} className="text-placeholder" aria-hidden="true" />
              <p className="text-[13px] text-muted">
                {getEmptyText({
                  unreadOnly,
                  tab: activeTab,
                  module: moduleFilter,
                  hasAny: notifications.length > 0,
                })}
              </p>
            </div>
          ) : (
            <div data-testid="notification-scroll" className="min-h-0 flex-1 overflow-y-auto">
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
