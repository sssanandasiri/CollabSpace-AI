import { useState } from "react";
import type { Team } from "../types";
import { useAuth } from "../AuthContext";
import { useTheme } from "../ThemeContext";
import {
  PlusIcon,
  LogOutIcon,
  UsersIcon,
  ChevronDownIcon,
  SunIcon,
  MoonIcon,
  MenuIcon,
  CloseIcon,
  SparklesIcon,
  KanbanIcon,
  BrainIcon,
  FileTextIcon,
  BookOpenIcon,
  ClipboardCheckIcon,
} from "./Icons";
import { NotificationBell } from "./NotificationBell";

export type NavTabKey =
  | "overview"
  | "tasks"
  | "ai"
  | "ai-tools"
  | "documents"
  | "knowledge"
  | "contribution"
  | "readiness"
  | "members";

interface NavbarProps {
  teams: Team[];
  selectedTeam: Team | null;
  onSelectTeam: (team: Team) => void;
  onCreateTeamClick: () => void;
  onInviteMemberClick: () => void;
  activeTab?: NavTabKey;
  onSelectTab?: (tab: NavTabKey) => void;
}

export function Navbar({
  teams,
  selectedTeam,
  onSelectTeam,
  onCreateTeamClick,
  onInviteMemberClick,
  activeTab = "overview",
  onSelectTab,
}: NavbarProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: { key: NavTabKey; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: "Overview", icon: <SparklesIcon width={14} height={14} /> },
    { key: "tasks", label: "Tasks", icon: <KanbanIcon width={14} height={14} /> },
    { key: "ai", label: "Project AI", icon: <SparklesIcon width={14} height={14} stroke="var(--red-accent)" /> },
    { key: "ai-tools", label: "AI Tools", icon: <BrainIcon width={14} height={14} stroke="var(--red-accent)" /> },
    { key: "documents", label: "Docs", icon: <FileTextIcon width={14} height={14} /> },
    { key: "knowledge", label: "Hub", icon: <BookOpenIcon width={14} height={14} /> },
    { key: "readiness", label: "Readiness", icon: <ClipboardCheckIcon width={14} height={14} /> },
    { key: "members", label: "Team", icon: <UsersIcon width={14} height={14} /> },
  ];

  function handleTabClick(key: NavTabKey) {
    if (onSelectTab) {
      onSelectTab(key);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    setMobileMenuOpen(false);
  }

  return (
    <header
      style={{
        backgroundColor: "var(--bg-nav)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--border-subtle)",
        color: "var(--text-primary)",
        padding: "12px 28px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 100,
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* ── Left: Creative CollabSpace Logo + Workspace Selector ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {/* Creative Logo */}
        <div
          onClick={() => onSelectTab && onSelectTab("overview")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          {/* Futuristic Hexagonal Orbital Emblem */}
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "11px",
              background: "linear-gradient(135deg, #181B22 0%, #090A0D 100%)",
              border: "1.5px solid rgba(255, 46, 77, 0.45)",
              boxShadow: "0 0 20px rgba(255, 46, 77, 0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              flexShrink: 0,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="3.5" fill="var(--red-accent)" />
              <path
                d="M4.5 12C4.5 7.85786 7.85786 4.5 12 4.5C14.7614 4.5 17.1812 5.98634 18.5 8.2"
                stroke="var(--red-accent)"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M19.5 12C19.5 16.1421 16.1421 19.5 12 19.5C9.23858 19.5 6.81881 18.0137 5.5 15.8"
                stroke="#FFFFFF"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div>
            <div
              style={{
                fontSize: 18,
                letterSpacing: "-0.035em",
                display: "flex",
                alignItems: "center",
                gap: 6,
                lineHeight: 1.15,
              }}
            >
              <span style={{ fontWeight: 900, color: "var(--text-strong)" }}>Collab</span>
              <span style={{ fontWeight: 900, color: "var(--red-accent)" }}>Space</span>
              <span
                style={{
                  backgroundColor: "rgba(255, 46, 77, 0.15)",
                  border: "1px solid rgba(255, 46, 77, 0.35)",
                  color: "var(--red-accent)",
                  fontSize: 10,
                  padding: "1px 6px",
                  borderRadius: 6,
                  fontWeight: 800,
                  letterSpacing: "0.06em",
                }}
              >
                AI
              </span>
            </div>
            <div style={{ fontSize: 10.5, color: "var(--text-muted)", letterSpacing: "0.02em" }}>
              Grounded Assignment Intelligence
            </div>
          </div>
        </div>

        <div style={{ height: 24, width: 1, backgroundColor: "var(--border-subtle)" }} />

        {/* Assignment / Workspace Dropdown */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-primary)",
              padding: "6px 14px",
              borderRadius: 9999,
              cursor: "pointer",
              fontSize: 12.5,
              fontWeight: 600,
              backdropFilter: "blur(10px)",
              transition: "all 0.2s ease",
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                backgroundColor: "var(--red-accent)",
                boxShadow: "0 0 8px var(--red-glow)",
              }}
            />
            <span style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {selectedTeam ? selectedTeam.name : "Select Workspace"}
            </span>
            <ChevronDownIcon width={12} height={12} />
          </button>

          {dropdownOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                left: 0,
                backgroundColor: "var(--bg-surface)",
                color: "var(--text-primary)",
                borderRadius: 16,
                boxShadow: "var(--shadow-lg), 0 0 35px rgba(0, 0, 0, 0.5)",
                border: "1px solid var(--border-card)",
                minWidth: 260,
                zIndex: 200,
                padding: "8px",
                animation: "scaleUp 0.18s ease-out",
              }}
            >
              <div style={{ padding: "6px 12px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                Assignment Workspaces
              </div>
              {teams.map((t) => (
                <div
                  key={t.id}
                  onClick={() => {
                    onSelectTeam(t);
                    setDropdownOpen(false);
                  }}
                  style={{
                    padding: "9px 12px",
                    borderRadius: 10,
                    cursor: "pointer",
                    fontSize: 13,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    backgroundColor: selectedTeam?.id === t.id ? "var(--bg-surface-elevated)" : "transparent",
                    fontWeight: selectedTeam?.id === t.id ? 700 : 500,
                    color: selectedTeam?.id === t.id ? "var(--red-accent)" : "inherit",
                    transition: "background-color 0.15s ease",
                  }}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
                  <span className="badge badge-gray" style={{ fontSize: 10 }}>{t.my_role || "member"}</span>
                </div>
              ))}
              <div style={{ borderTop: "1px solid var(--border-subtle)", marginTop: 6, paddingTop: 6 }}>
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    onCreateTeamClick();
                  }}
                  className="btn btn-bubble-red btn-sm"
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  <PlusIcon width={14} height={14} /> New Workspace
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Center: Minimalist Clean Text Navigation (Desktop) ── */}
      {onSelectTab && (
        <nav className="nav-desktop">
          {navItems.map((item) => {
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => handleTabClick(item.key)}
                className={`nav-link ${isActive ? "active" : ""}`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      )}

      {/* ── Right: Controls + Mobile Hamburger ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {selectedTeam && (
          <button onClick={onInviteMemberClick} className="btn btn-dark btn-sm nav-desktop">
            <UsersIcon width={13} height={13} stroke="var(--red-accent)" /> Invite
          </button>
        )}

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-primary)",
            width: 36,
            height: 36,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          {theme === "dark" ? <SunIcon width={16} height={16} /> : <MoonIcon width={16} height={16} />}
        </button>

        {/* Notification Bell */}
        <NotificationBell />

        {/* User Profile Pill (Desktop) */}
        <div
          className="nav-desktop-user"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "4px 8px 4px 12px",
            borderRadius: 9999,
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div className="nav-desktop-user-text" style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.1 }}>
              {user?.name}
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{user?.email}</div>
          </div>
          <button
            onClick={logout}
            title="Log out"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              width: 26,
              height: 26,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <LogOutIcon width={13} height={13} />
          </button>
        </div>

        {/* Mobile Hamburger Toggle Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="nav-mobile-toggle"
          title={mobileMenuOpen ? "Close menu" : "Open menu"}
          aria-label="Navigation menu"
        >
          {mobileMenuOpen ? <CloseIcon width={18} height={18} /> : <MenuIcon width={18} height={18} />}
        </button>
      </div>

      {/* ── Mobile Navigation Drawer ── */}
      {mobileMenuOpen && (
        <div className="mobile-nav-drawer">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {navItems.map((item) => {
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => handleTabClick(item.key)}
                  className={`mobile-nav-item ${isActive ? "active" : ""}`}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {item.icon}
                    <span>{item.label}</span>
                  </span>
                  {isActive && <span className="status-dot active" />}
                </button>
              );
            })}
          </div>

          <div style={{ borderTop: "1px solid var(--border-subtle)", marginTop: 12, paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            {selectedTeam && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onInviteMemberClick();
                }}
                className="btn btn-dark btn-sm"
              >
                <UsersIcon width={13} height={13} stroke="var(--red-accent)" /> Invite
              </button>
            )}
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {user?.name}
            </div>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                logout();
              }}
              className="btn btn-outline btn-sm"
              style={{ color: "var(--red-accent)" }}
            >
              <LogOutIcon width={13} height={13} /> Log out
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
