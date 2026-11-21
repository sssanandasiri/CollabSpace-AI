import { useState, useEffect } from "react";
import type { TaskActivity, TeamContributionSummary } from "../types";
import { api, errorMessage } from "../api";
import {
  ActivityIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  ClockIcon,
  ShieldCheckIcon,
} from "../components/Icons";

interface FairContributionProps {
  teamId: number;
}

export function FairContribution({ teamId }: FairContributionProps) {
  const [stats, setStats] = useState<TeamContributionSummary | null>(null);
  const [activities, setActivities] = useState<TaskActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadContributionData();
  }, [teamId]);

  async function loadContributionData() {
    setLoading(true);
    setError("");
    try {
      const [statsRes, actRes] = await Promise.all([
        api.get<TeamContributionSummary>(`/teams/${teamId}/contribution-stats/`),
        api.get<TaskActivity[]>(`/teams/${teamId}/activities/`),
      ]);
      setStats(statsRes.data);
      setActivities(actRes.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function renderActionIcon(actionType: string) {
    switch (actionType) {
      case "completed_task":
        return <CheckCircleIcon width={14} height={14} stroke="var(--red-accent)" />;
      case "created_task":
        return <ActivityIcon width={14} height={14} stroke="var(--text-primary)" />;
      case "uploaded_document":
        return <ShieldCheckIcon width={14} height={14} stroke="var(--amber)" />;
      default:
        return <ClockIcon width={14} height={14} stroke="var(--text-muted)" />;
    }
  }

  if (loading) {
    return <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Loading contribution analytics...</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Educational Notice Banner */}
      <div
        className="card page-section"
        style={{
          backgroundColor: "rgba(232, 67, 31, 0.05)",
          border: "1px solid rgba(232, 67, 31, 0.2)",
          padding: "16px 22px",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div style={{ color: "var(--red-accent)", display: "flex" }}>
          <AlertCircleIcon width={22} height={22} stroke="var(--red-accent)" />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
            Fair Contribution Framework
          </div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
            Activity and task metrics are recorded as transparent <strong>evidence</strong> of project participation to help teams balance workloads, not as a definitive measure of someone's individual effort or ability.
          </div>
        </div>
      </div>

      {error && <div style={{ color: "var(--red)", fontSize: 13 }}>{error}</div>}

      {/* Team Summary Row */}
      {stats && (
        <div className="page-section" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          <div className="card anim-pillar anim-d1" style={{ padding: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Total Tasks</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)", margin: "4px 0" }}>{stats.team_summary.total_tasks}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Across all milestones</div>
          </div>

          <div className="card anim-pillar anim-d2" style={{ padding: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Completed</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "var(--red-accent)", margin: "4px 0" }}>{stats.team_summary.completed_tasks}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{stats.team_summary.progress_percent}% project done</div>
          </div>

          <div className="card anim-pillar anim-d3" style={{ padding: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>In Progress</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "var(--amber)", margin: "4px 0" }}>{stats.team_summary.in_progress_tasks}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Currently being worked on</div>
          </div>

          <div className="card anim-pillar anim-d4" style={{ padding: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Overdue Tasks</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: stats.team_summary.overdue_tasks > 0 ? "var(--red)" : "var(--text-primary)", margin: "4px 0" }}>
              {stats.team_summary.overdue_tasks}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Needs immediate attention</div>
          </div>
        </div>
      )}

      {/* Member Workload Breakdown */}
      <div className="page-section" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <h3 style={{ fontSize: 18 }}>Member Workload & Status Distribution</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
          {stats?.member_stats.map((m) => (
            <div
              key={m.user_id}
              className="card card-interactive"
              style={{ display: "flex", flexDirection: "column", gap: 14, backgroundColor: "var(--bg-surface)" }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      backgroundColor: "var(--bg-surface-elevated)",
                      color: "var(--red-accent)",
                      border: "1px solid var(--border-card)",
                      fontWeight: 800,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 15,
                    }}
                  >
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>{m.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{m.email}</div>
                  </div>
                </div>

                <span style={{ fontSize: 11, color: "var(--text-secondary)", display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <span className="status-dot active" /> {m.role}
                </span>
              </div>

              {/* Progress & Stats */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                  <span style={{ color: "var(--text-secondary)" }}>Completion Rate</span>
                  <span style={{ fontWeight: 800, color: "var(--red-accent)" }}>{m.completion_rate}%</span>
                </div>
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill" style={{ width: `${m.completion_rate}%` }} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, textAlign: "center", backgroundColor: "var(--bg-surface-elevated)", padding: 10, borderRadius: 12 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>{m.assigned_tasks}</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>Assigned</div>
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "var(--amber)" }}>{m.in_progress_tasks}</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>In Progress</div>
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "var(--red-accent)" }}>{m.completed_tasks}</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>Done</div>
                </div>
              </div>

              <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 5 }}>
                <ActivityIcon width={13} height={13} /> {m.activity_count} total team contributions logged
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Project Activity Timeline */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <h3 style={{ fontSize: 18 }}>Project Activity Timeline</h3>
        <div className="card" style={{ padding: 0, backgroundColor: "var(--bg-surface)" }}>
          {activities.length === 0 ? (
            <div style={{ textAlign: "center", padding: 36, color: "var(--text-muted)", fontSize: 14 }}>
              No recorded team activities yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {activities.map((a, idx) => (
                <div
                  key={a.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 14,
                    padding: "14px 22px",
                    borderBottom: idx === activities.length - 1 ? "none" : "1px solid var(--border-subtle)",
                    transition: "background-color 0.15s ease",
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      backgroundColor: "var(--bg-surface-elevated)",
                      border: "1px solid var(--border-subtle)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: 2,
                    }}
                  >
                    {renderActionIcon(a.action_type)}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, color: "var(--text-primary)" }}>
                      <strong style={{ color: "var(--red-accent)" }}>{a.user_name}</strong> {a.details}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>
                      {new Date(a.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
