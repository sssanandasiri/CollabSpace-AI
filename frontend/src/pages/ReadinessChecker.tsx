import { useState, useEffect } from "react";
import type { ReadinessSummary, SubmissionRequirement } from "../types";
import { api, errorMessage } from "../api";
import {
  PlusIcon,
  SparklesIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  TrashIcon,
} from "../components/Icons";

interface ReadinessCheckerProps {
  teamId: number;
}

export function ReadinessChecker({ teamId }: ReadinessCheckerProps) {
  const [data, setData] = useState<ReadinessSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState("");

  // New Requirement Form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sourceReference, setSourceReference] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadReadiness();
  }, [teamId]);

  async function loadReadiness() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get<ReadinessSummary>(`/teams/${teamId}/readiness/`);
      setData(res.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleAutoExtract() {
    setExtracting(true);
    setError("");
    try {
      await api.post(`/teams/${teamId}/readiness/auto-extract/`);
      await loadReadiness();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setExtracting(false);
    }
  }

  async function handleUpdateStatus(reqId: number, newStatus: SubmissionRequirement["status"]) {
    try {
      await api.patch(`/teams/${teamId}/readiness/${reqId}/`, { status: newStatus });
      loadReadiness();
    } catch (err) {
      alert(errorMessage(err));
    }
  }

  async function handleDeleteRequirement(reqId: number) {
    try {
      await api.delete(`/teams/${teamId}/readiness/${reqId}/`);
      loadReadiness();
    } catch (err) {
      alert(errorMessage(err));
    }
  }

  async function handleAddRequirement(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await api.post(`/teams/${teamId}/readiness/`, {
        title,
        description,
        source_reference: sourceReference,
        status: "pending",
      });
      setTitle("");
      setDescription("");
      setSourceReference("");
      setShowAddModal(false);
      loadReadiness();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Analyzing submission requirements...</div>;
  }

  const summary = data?.summary;
  const isReady = summary?.ready_for_submission;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Top Readiness Score Meter */}
      <div
        className="card page-section"
        style={{
          background: isReady
            ? "radial-gradient(circle at 90% 10%, rgba(206, 255, 82, 0.25), transparent 60%), radial-gradient(circle at 10% 80%, rgba(6, 78, 59, 0.4), transparent 60%), var(--bg-surface)"
            : "radial-gradient(circle at 90% 10%, rgba(245, 158, 11, 0.2), transparent 60%), radial-gradient(circle at 10% 80%, rgba(21, 46, 64, 0.5), transparent 60%), var(--bg-surface)",
          border: isReady ? "1px solid rgba(206, 255, 82, 0.3)" : "1px solid var(--border-card)",
          padding: 32,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 24,
          boxShadow: isReady ? "0 0 35px var(--red-glow-subtle)" : "var(--shadow-md)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 540 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: isReady ? "var(--red-accent)" : "var(--amber)" }}>
              <span className={`status-dot ${isReady ? "active" : "neutral"}`} style={{ backgroundColor: isReady ? "var(--red-accent)" : "var(--amber)" }} />
              {isReady ? "Submission Ready" : "Work in Progress"}
            </span>
            <span style={{ color: "var(--text-muted)", fontSize: 12 }}>•</span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Requirement Compliance</span>
          </div>

          <h2 style={{ fontSize: 32, letterSpacing: "-0.03em" }}>
            {summary?.readiness_score || 0}% Requirements Addressed
          </h2>

          <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>
            Compare your uploaded brief's rubric with current project work. Unaddressed items are flagged below for team review.
          </p>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={handleAutoExtract}
            disabled={extracting}
            className="btn btn-bubble-red btn-lg"
          >
            <SparklesIcon width={17} height={17} stroke="#FFFFFF" />
            {extracting ? "Extracting from Brief..." : "Auto-Extract from Brief"}
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn btn-bubble-glass btn-lg">
            <PlusIcon width={16} height={16} /> Add Requirement
          </button>
        </div>
      </div>

      {error && <div style={{ color: "var(--red)", fontSize: 13 }}>{error}</div>}

      {/* Flagged Unaddressed Requirements Alert Box */}
      {data?.unaddressed_flags && data.unaddressed_flags.length > 0 && (
        <div
          className="card page-section"
          style={{
            backgroundColor: "rgba(245, 158, 11, 0.08)",
            border: "1px solid rgba(245, 158, 11, 0.3)",
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#FBBF24", fontWeight: 800, fontSize: 15 }}>
            <AlertCircleIcon width={20} height={20} stroke="#FBBF24" /> Flagged Unaddressed Requirements ({data.unaddressed_flags.length})
          </div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            The following requirements from your assignment have not been addressed yet. Review them with your teammates before submitting:
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.unaddressed_flags.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: "var(--bg-surface)",
                  padding: "10px 16px",
                  borderRadius: 12,
                  border: "1px solid rgba(245, 158, 11, 0.2)",
                  fontSize: 13,
                  color: "var(--text-primary)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: "var(--red)", fontWeight: 800 }}>•</span>
                  <span>{item.title}</span>
                </div>
                {item.source && (
                  <span className="badge badge-gray" style={{ fontSize: 10 }}>{item.source}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Checklist Table */}
      <div className="card page-section" style={{ padding: 0, backgroundColor: "var(--bg-surface)" }}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <h3 style={{ fontSize: 17 }}>Assignment Requirements Checklist ({data?.requirements.length || 0})</h3>
          <div style={{ display: "flex", gap: 14, fontSize: 12 }}>
            <span style={{ color: "#34D399", fontWeight: 700 }}>✓ Covered: {summary?.covered || 0}</span>
            <span style={{ color: "var(--amber)", fontWeight: 700 }}>◷ In Progress: {summary?.in_progress || 0}</span>
            <span style={{ color: "var(--red)", fontWeight: 700 }}>! Pending: {summary?.pending || 0}</span>
          </div>
        </div>

        {data?.requirements.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
            No requirements defined yet. Click "Auto-Extract from Brief" to scan your uploaded assignment brief or add items manually.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {data?.requirements.map((req, idx) => (
              <div
                key={req.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  padding: "16px 24px",
                  borderBottom: idx === data.requirements.length - 1 ? "none" : "1px solid var(--border-subtle)",
                  backgroundColor: req.status === "covered" ? "rgba(6, 78, 59, 0.15)" : "transparent",
                  transition: "background-color 0.2s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flex: 1 }}>
                  <button
                    onClick={() => {
                      const next = req.status === "covered" ? "pending" : "covered";
                      handleUpdateStatus(req.id, next);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                      marginTop: 2,
                    }}
                  >
                    {req.status === "covered" ? (
                      <CheckCircleIcon width={22} height={22} stroke="var(--lime)" />
                    ) : (
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          border: "2px solid var(--text-muted)",
                          transition: "border-color 0.2s ease",
                        }}
                      />
                    )}
                  </button>

                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        textDecoration: req.status === "covered" ? "line-through" : "none",
                        opacity: req.status === "covered" ? 0.75 : 1,
                      }}
                    >
                      {req.title}
                    </div>
                    {req.description && (
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{req.description}</div>
                    )}
                    {req.source_reference && (
                      <div style={{ fontSize: 11, color: "var(--lime)", fontWeight: 700 }}>
                        Source: {req.source_reference}
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Switcher */}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <select
                    value={req.status}
                    onChange={(e) => handleUpdateStatus(req.id, e.target.value as SubmissionRequirement["status"])}
                    style={{
                      width: "auto",
                      fontSize: 12,
                      padding: "6px 10px",
                      borderRadius: 8,
                      fontWeight: 700,
                      borderColor: req.status === "covered" ? "var(--lime)" : req.status === "in_progress" ? "var(--amber)" : "var(--border-subtle)",
                    }}
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="covered">Covered</option>
                  </select>

                  <button
                    onClick={() => handleDeleteRequirement(req.id)}
                    title="Delete requirement"
                    style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4 }}
                  >
                    <TrashIcon width={14} height={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Requirement Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 16, fontSize: 20 }}>Add Assignment Requirement</h3>
            <form onSubmit={handleAddRequirement} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                  Requirement Title *
                </label>
                <input
                  required
                  placeholder="e.g. System architecture diagrams and component model"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                  Deliverable Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Details, rubric guidelines, or formatting criteria..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                  Source Reference
                </label>
                <input
                  placeholder="e.g. Assignment_Brief.pdf, page 3"
                  value={sourceReference}
                  onChange={(e) => setSourceReference(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 14 }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn btn-lime">
                  {saving ? "Adding..." : "Add Requirement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
