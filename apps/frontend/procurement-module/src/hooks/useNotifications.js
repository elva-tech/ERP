import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "../features/auth/sessionContext.js";
import { notificationService } from "../features/notifications/notificationService.js";

const SYNC_INTERVAL_MS = 60000;

/**
 * Notification state for the shell. Business rules live in notificationService.
 */
export function useNotifications() {
  const { session, status } = useSession();
  const userId = session?.user?.id ?? null;
  const signedIn = status === "authenticated" && Boolean(userId);

  const [state, setState] = useState(() => (signedIn ? notificationService.load(userId) : notificationService.load(null)));
  const stateRef = useRef(state);
  const userIdRef = useRef(userId);
  const syncGenerationRef = useRef(0);

  useEffect(() => {
    syncGenerationRef.current += 1;
    userIdRef.current = userId;
    const next = signedIn ? notificationService.load(userId) : notificationService.load(null);
    stateRef.current = next;
    // Reload per-user notification state when the signed-in user changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- account switch must reset UI immediately
    setState(next);
  }, [userId, signedIn]);

  const commit = useCallback((next) => {
    if (next === stateRef.current) return;
    if (!signedIn) return;
    stateRef.current = next;
    notificationService.save(next, userIdRef.current);
    setState(next);
  }, [signedIn]);

  const sync = useCallback(
    async (signal) => {
      if (!signedIn) return;
      const generation = syncGenerationRef.current;
      const uid = userIdRef.current;
      try {
        const { snapshot, loadedTypes } = await notificationService.fetchSnapshot(signal);
        if (
          signal?.aborted ||
          generation !== syncGenerationRef.current ||
          uid !== userIdRef.current ||
          !signedIn
        ) {
          return;
        }
        if (loadedTypes.length === 0) return;
        const conditions = notificationService.detectConditions(snapshot);
        const next = notificationService.reconcile(stateRef.current, conditions, { loadedTypes });
        if (generation !== syncGenerationRef.current || uid !== userIdRef.current) return;
        commit(next);
      } catch {
        // A failed fetch must not resolve conditions; try again on the next sync.
      }
    },
    [commit, signedIn],
  );

  useEffect(() => {
    if (!signedIn) return undefined;
    const controller = new AbortController();
    sync(controller.signal);
    const intervalId = window.setInterval(() => sync(controller.signal), SYNC_INTERVAL_MS);
    const handleHashChange = () => sync(controller.signal);
    window.addEventListener("hashchange", handleHashChange);
    return () => {
      controller.abort();
      syncGenerationRef.current += 1;
      window.clearInterval(intervalId);
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, [sync, signedIn]);

  const markAsRead = useCallback((id) => commit(notificationService.markAsRead(stateRef.current, id)), [commit]);
  const markAllAsRead = useCallback(() => commit(notificationService.markAllAsRead(stateRef.current)), [commit]);

  return {
    notifications: state.notifications,
    unreadCount: notificationService.getUnreadCount(state),
    markAsRead,
    markAllAsRead,
    refresh: sync,
  };
}