import { useCallback, useEffect, useRef, useState } from "react";
import { notificationService } from "../features/notifications/services/notificationService.js";

const SYNC_INTERVAL_MS = 60000;

/**
 * Owns the notification state for the UI. All rules live in notificationService;
 * this hook only wires state, persistence and refresh timing.
 */
export function useNotifications() {
  const [state, setState] = useState(() => notificationService.load());
  const stateRef = useRef(state);

  const commit = useCallback((next) => {
    if (next === stateRef.current) return;
    stateRef.current = next;
    notificationService.save(next);
    setState(next);
  }, []);

  const sync = useCallback(
    async (signal) => {
      try {
        const snapshot = await notificationService.fetchSnapshot(signal);
        if (signal?.aborted) return;
        const conditions = notificationService.detectConditions(snapshot);
        commit(notificationService.reconcile(stateRef.current, conditions));
      } catch {
        // A failed fetch must not resolve conditions; try again on the next sync.
      }
    },
    [commit],
  );

  useEffect(() => {
    const controller = new AbortController();
    sync(controller.signal);
    const intervalId = window.setInterval(() => sync(controller.signal), SYNC_INTERVAL_MS);
    const handleHashChange = () => sync(controller.signal);
    window.addEventListener("hashchange", handleHashChange);
    return () => {
      controller.abort();
      window.clearInterval(intervalId);
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, [sync]);

  const markAsRead = useCallback((id) => commit(notificationService.markAsRead(stateRef.current, id)), [commit]);
  const markAllAsRead = useCallback(() => commit(notificationService.markAllAsRead(stateRef.current)), [commit]);

  const clearRead = useCallback(() => commit(notificationService.clearRead(stateRef.current)), [commit]);

  return {
    clearRead,
    notifications: state.notifications,
    unreadCount: notificationService.getUnreadCount(state),
    markAsRead,
    markAllAsRead,
    refresh: sync,
  };
}
