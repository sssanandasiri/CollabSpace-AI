import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import type { Notification } from "./types";
import { api } from "./api";

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  refresh: () => void;
  markAllRead: () => void;
  markOneRead: (id: number) => void;
  clearRead: () => void;
}

const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
  unreadCount: 0,
  loading: false,
  refresh: () => {},
  markAllRead: () => {},
  markOneRead: () => {},
  clearRead: () => {},
});

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<Notification[]>("/notifications/");
      setNotifications(res.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await api.post("/notifications/mark-all-read/");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch { /* ignore */ }
  }, []);

  const markOneRead = useCallback(async (id: number) => {
    try {
      await api.patch(`/notifications/${id}/read/`);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    } catch { /* ignore */ }
  }, []);

  const clearRead = useCallback(async () => {
    try {
      await api.delete("/notifications/clear/");
      setNotifications((prev) => prev.filter((n) => !n.is_read));
    } catch { /* ignore */ }
  }, []);

  // Poll every 30 seconds
  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, loading, refresh, markAllRead, markOneRead, clearRead }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
