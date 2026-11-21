import { useState, useRef, useEffect } from "react";
import { useNotifications } from "../NotificationContext";
import { BellIcon, TrashIcon } from "./Icons";

const NOTIF_COLORS: Record<string, { bg: string; border: string; dot: string }> = {
  task_assigned:  { bg: "rgba(232, 67, 31, 0.08)",  border: "rgba(232, 67, 31, 0.2)",  dot: "var(--red-accent)" },
  task_completed: { bg: "rgba(255, 255, 255, 0.04)", border: "var(--border-subtle)", dot: "var(--text-primary)" },
  task_overdue:   { bg: "rgba(220, 38, 38, 0.10)",  border: "rgba(220, 38, 38, 0.25)", dot: "#EF4444" },
  doc_uploaded:   { bg: "rgba(255, 255, 255, 0.04)", border: "var(--border-subtle)", dot: "var(--red-accent)" },
  member_joined:  { bg: "rgba(255, 255, 255, 0.04)", border: "var(--border-subtle)", dot: "var(--text-secondary)" },
  ai_insight:     { bg: "rgba(232, 67, 31, 0.08)",  border: "rgba(232, 67, 31, 0.2)",  dot: "var(--red-accent)" },
  note_added:     { bg: "rgba(255, 255, 255, 0.04)", border: "var(--border-subtle)", dot: "var(--text-secondary)" },
  general:        { bg: "rgba(255, 255, 255, 0.04)", border: "var(--border-subtle)", dot: "var(--text-muted)" },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function NotificationBell() {
  const { notifications, unreadCount, markAllRead, markOneRead, clearRead, loading } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((p) => !p)}
        style={{
          position: "relative",
          background: open ? "rgba(232, 67, 31, 0.12)" : "rgba(255, 255, 255, 0.05)",
          border: `1px solid ${open ? "rgba(232, 67, 31, 0.35)" : "var(--border-subtle)"}`,
          borderRadius: "50%",
          width: 36,
          height: 36,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "all 0.18s ease",
          color: open ? "var(--red-accent)" : "var(--text-secondary)",
        }}
        title="Notifications"
      >
        <BellIcon width={17} height={17} />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: -3,
              right: -3,
              background: "#EF4444",
              color: "#fff",
              borderRadius: "50%",
              width: 17,
              height: 17,
              fontSize: 10,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid var(--bg-nav)",
              animation: "pulseGlow 2s ease-in-out infinite",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 10px)",
            right: 0,
            width: 360,
            background: "var(--bg-surface)",
            border: "1px solid var(--border-card)",
            borderRadius: 18,
            boxShadow: "var(--shadow-lg), 0 0 40px rgba(0,0,0,0.4)",
            zIndex: 500,
            overflow: "hidden",
            animation: "scaleUp 0.22s var(--ease-spring)",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "14px 16px",
              borderBottom: "1px solid var(--border-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "var(--bg-surface-elevated)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <BellIcon width={15} height={15} stroke="var(--red-accent)" />
              <span style={{ fontWeight: 700, fontSize: 14 }}>Notifications</span>
              {unreadCount > 0 && (
                <span style={{ fontSize: 11, color: "var(--red-accent)", fontWeight: 700 }}>
                  ({unreadCount} new)
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  style={{
                    fontSize: 11,
                    color: "var(--red-accent)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 600,
                    font: "inherit",
                    padding: "2px 6px",
                  }}
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={clearRead}
                title="Clear read notifications"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  display: "flex",
                  padding: 4,
                }}
              >
                <TrashIcon width={13} height={13} />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div style={{ maxHeight: 420, overflowY: "auto" }}>
            {loading && notifications.length === 0 ? (
              <div style={{ padding: "30px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                Loading…
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: "36px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  No notifications yet.<br />Activity from your team will appear here.
                </div>
              </div>
            ) : (
              notifications.map((n) => {
                const style = NOTIF_COLORS[n.notif_type] || NOTIF_COLORS["general"];
                return (
                  <div
                    key={n.id}
                    onClick={() => !n.is_read && markOneRead(n.id)}
                    style={{
                      padding: "12px 16px",
                      borderBottom: "1px solid var(--border-subtle)",
                      display: "flex",
                      gap: 12,
                      alignItems: "flex-start",
                      cursor: n.is_read ? "default" : "pointer",
                      background: n.is_read ? "transparent" : style.bg,
                      transition: "background 0.15s",
                    }}
                  >
                    {/* Color dot */}
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: n.is_read ? "var(--border-mid)" : style.dot,
                        marginTop: 5,
                        flexShrink: 0,
                        boxShadow: n.is_read ? "none" : `0 0 8px ${style.dot}`,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: n.is_read ? 500 : 700,
                          color: "var(--text-primary)",
                          marginBottom: 3,
                        }}
                      >
                        {n.title}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--text-secondary)",
                          lineHeight: 1.5,
                        }}
                      >
                        {n.message}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "var(--text-muted)",
                          marginTop: 5,
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        {n.team_name && (
                          <span
                            style={{
                              background: "rgba(255,255,255,0.07)",
                              borderRadius: 9999,
                              padding: "1px 7px",
                              fontSize: 10,
                            }}
                          >
                            {n.team_name}
                          </span>
                        )}
                        {timeAgo(n.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
