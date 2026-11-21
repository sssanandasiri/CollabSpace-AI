import { useState } from "react";
import type { DocumentItem, TeamMember, AssignmentAnalysis, ProgressAdvice, DocumentSummary, TaskGenerationResult } from "../types";
import { api, errorMessage } from "../api";
import {
  FileTextIcon,
  TrendingUpIcon,
  BookOpenIcon,
  ListChecksIcon,
  BrainIcon,
  AlertCircleIcon,
  CheckIcon,
  ZapIcon,
  PlusIcon,
  ShieldCheckIcon,
} from "../components/Icons";

interface AIFeaturesProps {
  teamId: number;
  documents: DocumentItem[];
  members: TeamMember[];
  onTasksAdded: () => void;
  onOpenDocumentsTab: () => void;
  onOpenAIChat: () => void;
}

type AITab = "analyzer" | "advisor" | "summarizer" | "generator";

const TABS: { key: AITab; icon: React.ReactNode; label: string; badge?: string }[] = [
  { key: "analyzer",   icon: <FileTextIcon width={15} height={15} />,    label: "Assignment Analyzer" },
  { key: "advisor",    icon: <TrendingUpIcon width={15} height={15} />,  label: "Progress Advisor" },
  { key: "summarizer", icon: <BookOpenIcon width={15} height={15} />,    label: "Doc Summarizer" },
  { key: "generator",  icon: <ListChecksIcon width={15} height={15} />,  label: "Task Generator" },
];

// Reusable sub-components

function AIPill({ color = "red", children }: { color?: "red" | "gray" | "amber"; children: React.ReactNode }) {
  const colors = {
    red:   { bg: "rgba(232, 67, 31, 0.10)", border: "rgba(232, 67, 31, 0.25)", text: "var(--red-accent)" },
    gray:  { bg: "rgba(255, 255, 255, 0.05)", border: "var(--border-subtle)", text: "var(--text-secondary)" },
    amber: { bg: "rgba(245, 158, 11, 0.10)", border: "rgba(245, 158, 11, 0.25)", text: "#FBBF24" },
  }[color];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text, borderRadius: 9999, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
      {children}
    </span>
  );
}

function AICard({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <div
      className={`card${accent ? " card-accent" : ""}`}
      style={{ padding: 22, display: "flex", flexDirection: "column", gap: 14 }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
      <span style={{ width: 3, height: 16, background: "var(--red-accent)", borderRadius: 2, flexShrink: 0 }} />
      <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text-strong)", letterSpacing: "-0.01em" }}>
        {children}
      </span>
    </div>
  );
}

function PriorityBadge({ p }: { p: "high" | "medium" | "low" }) {
  return (
    <AIPill color={p === "high" ? "red" : p === "medium" ? "amber" : "gray"}>
      {p.toUpperCase()}
    </AIPill>
  );
}

function SpinnerIcon() {
  return (
    <div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "#FFFFFF", borderRadius: "50%", animation: "spin 0.75s linear infinite" }} />
  );
}

function ErrorBar({ msg, onDismiss }: { msg: string; onDismiss: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(220,38,38,0.12)", border: "1px solid rgba(220,38,38,0.3)", borderRadius: 12, padding: "11px 16px", fontSize: 13, color: "#F87171" }}>
      <AlertCircleIcon width={15} height={15} />
      <span style={{ flex: 1 }}>{msg}</span>
      <button onClick={onDismiss} style={{ background: "none", border: "none", color: "#F87171", cursor: "pointer", fontSize: 15, lineHeight: 1, font: "inherit" }}>✕</button>
    </div>
  );
}

// 1. Assignment Analyzer

function AssignmentAnalyzer({ teamId, documents, onOpenDocumentsTab }: { teamId: number; documents: DocumentItem[]; onOpenDocumentsTab: () => void }) {
  const [result, setResult] = useState<AssignmentAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    if (!documents.some((d) => d.processing_status === "ready")) {
      setError("No ready documents found. Upload your assignment brief first.");
      return;
    }
    setLoading(true); setError("");
    try {
      const res = await api.post<AssignmentAnalysis>(`/teams/${teamId}/ai/analyze-assignment/`);
      if (res.data.error) { setError(res.data.error); }
      else { setResult(res.data); }
    } catch (e) { setError(errorMessage(e)); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header card */}
      <AICard accent>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: "12px", background: "linear-gradient(180deg, rgba(232, 67, 31, 0.16) 0%, rgba(232, 67, 31, 0.04) 100%)", border: "1px solid rgba(232, 67, 31, 0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <FileTextIcon width={22} height={22} stroke="var(--red-accent)" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: "-0.02em" }}>Assignment Analyzer</div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 3 }}>
                AI reads your brief and extracts requirements, deliverables, deadlines, and suggests tasks.
              </div>
            </div>
          </div>
          <button onClick={run} disabled={loading} className="btn btn-primary">
            {loading ? <><SpinnerIcon /> Analyzing…</> : <><FileTextIcon width={15} height={15} stroke="#FFFFFF" /> Analyze Documents</>}
          </button>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-muted)" }}>
            <span className="status-dot success" />
            <span>{documents.filter(d => d.processing_status === "ready").length} docs ready</span>
          </div>
          {documents.length === 0 && (
            <button onClick={onOpenDocumentsTab} className="btn btn-outline btn-sm">Upload Brief →</button>
          )}
        </div>
      </AICard>

      {error && <ErrorBar msg={error} onDismiss={() => setError("")} />}

      {!result && !loading && (
        <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-muted)" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>Ready to analyze your assignment</div>
          <div style={{ fontSize: 13 }}>Click "Analyze Documents" to extract requirements, deliverables, and deadlines from all uploaded files.</div>
        </div>
      )}

      {result && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Summary */}
          {result.summary && (
            <div style={{ gridColumn: "1 / -1" }}>
              <AICard>
                <SectionTitle>Assignment Summary</SectionTitle>
                <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7 }}>{result.summary}</p>
              </AICard>
            </div>
          )}

          {/* Requirements */}
          <AICard>
            <SectionTitle>Main Requirements</SectionTitle>
            {result.main_requirements.length === 0
              ? <p style={{ fontSize: 13, color: "var(--text-muted)" }}>None found — ensure a brief is uploaded.</p>
              : result.main_requirements.map((r, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(232, 67, 31, 0.12)", color: "var(--red-accent)", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>{i + 1}</span>
                    <span style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.6 }}>{r}</span>
                  </div>
                ))
            }
          </AICard>

          {/* Deliverables */}
          <AICard>
            <SectionTitle>Deliverables</SectionTitle>
            {result.deliverables.length === 0
              ? <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No specific deliverables found.</p>
              : result.deliverables.map((d, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <CheckIcon width={14} height={14} stroke="var(--red-accent)" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{d}</span>
                  </div>
                ))
            }
          </AICard>

          {/* Deadlines */}
          {result.deadlines.length > 0 && (
            <AICard>
              <SectionTitle>Deadlines Found</SectionTitle>
              {result.deadlines.map((dl, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 10 }}>
                  <span style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 600 }}>{dl.label}</span>
                  <AIPill color="amber">{dl.date_hint}</AIPill>
                </div>
              ))}
            </AICard>
          )}

          {/* Suggested tasks */}
          {result.suggested_tasks.length > 0 && (
            <div style={{ gridColumn: "1 / -1" }}>
              <AICard>
                <SectionTitle>AI-Suggested Tasks</SectionTitle>
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>These tasks were generated from your brief. Go to the Task Generator tab to refine and add them to your board.</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
                  {result.suggested_tasks.map((t, i) => (
                    <div key={i} style={{ padding: "12px 14px", background: "var(--bg-surface-elevated)", border: "1px solid var(--border-subtle)", borderRadius: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{t.title}</span>
                        <PriorityBadge p={t.priority} />
                      </div>
                      <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>{t.description}</p>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>⏱ ~{t.effort_hours}h effort</div>
                    </div>
                  ))}
                </div>
              </AICard>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 2. Progress Advisor

function ProgressAdvisor({ teamId }: { teamId: number }) {
  const [result, setResult] = useState<ProgressAdvice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setLoading(true); setError("");
    try {
      const res = await api.get<ProgressAdvice>(`/teams/${teamId}/ai/progress-advice/`);
      setResult(res.data);
    } catch (e) { setError(errorMessage(e)); }
    finally { setLoading(false); }
  }

  const scoreColor = (s: number) => s >= 70 ? "var(--red-accent)" : s >= 40 ? "#F59E0B" : "var(--text-muted)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <AICard accent>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: "12px", background: "linear-gradient(180deg, rgba(232, 67, 31, 0.16) 0%, rgba(232, 67, 31, 0.04) 100%)", border: "1px solid rgba(232, 67, 31, 0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <TrendingUpIcon width={22} height={22} stroke="var(--red-accent)" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: "-0.02em" }}>AI Progress Advisor</div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 3 }}>
                Scans your task board for delays, risks, and gives specific advice to keep your submission on track.
              </div>
            </div>
          </div>
          <button onClick={run} disabled={loading} className="btn btn-primary">
            {loading ? <><SpinnerIcon /> Analyzing…</> : <><TrendingUpIcon width={15} height={15} stroke="#FFFFFF" /> Analyze Progress</>}
          </button>
        </div>
      </AICard>

      {error && <ErrorBar msg={error} onDismiss={() => setError("")} />}

      {!result && !loading && (
        <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-muted)" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>Ready to audit your project</div>
          <div style={{ fontSize: 13 }}>Click "Analyze Progress" to get a health score, risk report, and actionable suggestions.</div>
        </div>
      )}

      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Health score + stats */}
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 16, alignItems: "center" }}>
            {/* Score ring */}
            <div style={{ textAlign: "center", padding: "24px 32px", background: "var(--bg-glass-card)", border: "1px solid var(--border-card)", borderRadius: 20, backdropFilter: "blur(16px)" }}>
              <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: "-0.04em", color: scoreColor(result.health_score), lineHeight: 1 }}>
                {result.health_score}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginTop: 6 }}>Health Score</div>
              <div style={{ marginTop: 12 }}>
                <div className="progress-bar-bg" style={{ height: 6, background: "rgba(255,255,255,0.08)" }}>
                  <div className="progress-bar-fill" style={{ width: `${result.health_score}%`, background: `linear-gradient(90deg, ${scoreColor(result.health_score)}, ${scoreColor(result.health_score)}aa)` }} />
                </div>
              </div>
            </div>

            {/* Stats grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {[
                { label: "Total", value: result.stats.total, color: "var(--text-primary)" },
                { label: "Done", value: result.stats.done, color: "#34D399" },
                { label: "In Progress", value: result.stats.in_progress, color: "#FBBF24" },
                { label: "To Do", value: result.stats.todo, color: "var(--text-secondary)" },
                { label: "Overdue", value: result.stats.overdue, color: "#F87171" },
                { label: "Unassigned", value: result.stats.unassigned, color: "#F87171" },
              ].map((s, i) => (
                <div key={i} style={{ padding: "14px 16px", background: "var(--bg-glass-card)", border: "1px solid var(--border-subtle)", borderRadius: 14, backdropFilter: "blur(12px)" }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: s.color, letterSpacing: "-0.03em", lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <AICard>
            <SectionTitle>Summary</SectionTitle>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7 }}>{result.summary}</p>
          </AICard>

          {/* Risks + Suggestions side by side */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <AICard>
              <SectionTitle>Risks Identified</SectionTitle>
              {result.risks.map((r, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "9px 12px", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 10 }}>
                  <span style={{ color: "#F87171", fontSize: 14, flexShrink: 0, fontWeight: 800 }}>!</span>
                  <span style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.5 }}>{r}</span>
                </div>
              ))}
            </AICard>
            <AICard>
              <SectionTitle>AI Suggestions</SectionTitle>
              {result.suggestions.map((s, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "9px 12px", background: "rgba(232, 67, 31, 0.06)", border: "1px solid rgba(232, 67, 31, 0.18)", borderRadius: 10 }}>
                  <span style={{ color: "var(--red-accent)", fontSize: 14, flexShrink: 0 }}>→</span>
                  <span style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.5 }}>{s}</span>
                </div>
              ))}
            </AICard>
          </div>

          {/* Overdue tasks */}
          {result.overdue_tasks.length > 0 && (
            <AICard>
              <SectionTitle>Overdue Tasks — Action Required</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {result.overdue_tasks.map((t) => (
                  <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.25)", borderRadius: 11 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{t.title}</span>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <AIPill color="red">Was due {t.due_date}</AIPill>
                    </div>
                  </div>
                ))}
              </div>
            </AICard>
          )}

          {/* Coming up */}
          {result.stale_tasks.length > 0 && (
            <AICard>
              <SectionTitle> Due Within 3 Days</SectionTitle>
              {result.stale_tasks.map((t) => (
                <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 11 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{t.title}</span>
                  <AIPill color="amber">{t.due_date}</AIPill>
                </div>
              ))}
            </AICard>
          )}
        </div>
      )}
    </div>
  );
}

// 3. Document Summarizer

function DocumentSummarizer({ teamId, documents }: { teamId: number; documents: DocumentItem[] }) {
  const [selectedDocId, setSelectedDocId] = useState<number | "">("");
  const [result, setResult] = useState<DocumentSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [followUp, setFollowUp] = useState("");

  const readyDocs = documents.filter((d) => d.processing_status === "ready");

  async function summarize() {
    if (!selectedDocId) { setError("Please select a document to summarize."); return; }
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await api.post<DocumentSummary>(`/teams/${teamId}/ai/summarize/`, { doc_id: selectedDocId });
      if (res.data.error) { setError(res.data.error); } else { setResult(res.data); }
    } catch (e) { setError(errorMessage(e)); }
    finally { setLoading(false); }
  }

  const DOC_TYPE_LABEL: Record<string, string> = {
    assignment_brief: "Assignment Brief",
    lecture_notes: "Lecture Notes",
    meeting_minutes: "Meeting Minutes",
    research: "Research Document",
    other: "Document",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <AICard accent>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: "12px", background: "linear-gradient(180deg, rgba(232, 67, 31, 0.16) 0%, rgba(232, 67, 31, 0.04) 100%)", border: "1px solid rgba(232, 67, 31, 0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <BookOpenIcon width={22} height={22} stroke="var(--red-accent)" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: "-0.02em" }}>AI Document Summarizer</div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 3 }}>
              Summarizes long PDFs and notes into key points. Upload a document and select it below.
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <select
              value={selectedDocId}
              onChange={(e) => { setSelectedDocId(Number(e.target.value) || ""); setResult(null); }}
              style={{ fontSize: 13 }}
            >
              <option value="">— Select a document —</option>
              {readyDocs.map((d) => (
                <option key={d.id} value={d.id}>{d.title}</option>
              ))}
            </select>
          </div>
          <button onClick={summarize} disabled={loading || !selectedDocId} className="btn btn-primary">
            {loading ? <><SpinnerIcon /> Summarizing…</> : <><BookOpenIcon width={15} height={15} stroke="#FFFFFF" /> Summarize</>}
          </button>
        </div>

        {readyDocs.length === 0 && (
          <div style={{ fontSize: 12, color: "var(--amber)" }}>No ready documents. Upload files in the Documents tab first.</div>
        )}
      </AICard>

      {error && <ErrorBar msg={error} onDismiss={() => setError("")} />}

      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Doc type badge + word count */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <AIPill color="red">{DOC_TYPE_LABEL[result.document_type] || "Document"}</AIPill>
            <AIPill color="gray">~{result.word_count.toLocaleString()} words processed</AIPill>
          </div>

          <AICard>
            <SectionTitle>AI Summary</SectionTitle>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{result.summary}</p>
          </AICard>

          {result.key_points.length > 0 && (
            <AICard>
              <SectionTitle>Key Points</SectionTitle>
              {result.key_points.map((kp, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(232, 67, 31, 0.12)", color: "var(--red-accent)", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.6 }}>{kp}</span>
                </div>
              ))}
            </AICard>
          )}

          {/* Follow-up prompt */}
          <AICard>
            <SectionTitle>Ask a Follow-up Question</SectionTitle>
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Use the Project Knowledge AI tab to ask a detailed follow-up about this document with source citations.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <input
                placeholder={`e.g. "What does ${result.doc_title} say about the testing plan?"`}
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
                style={{ fontSize: 13 }}
              />
              <button
                className="btn btn-dark"
                disabled={!followUp.trim()}
                onClick={() => {
                  if (followUp.trim()) {
                    alert("Go to the Project Knowledge AI tab and paste your question there to get a grounded, cited answer.");
                  }
                }}
              >
                Open in AI Chat →
              </button>
            </div>
          </AICard>
        </div>
      )}

      {!result && !loading && !error && (
        <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-muted)" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>Select a document to summarize</div>
          <div style={{ fontSize: 13 }}>The AI will read the full document and extract a summary and key points in seconds.</div>
        </div>
      )}
    </div>
  );
}

// 4. Task Generator


function TaskGenerator({ teamId, onTasksAdded }: { teamId: number; members?: TeamMember[]; onTasksAdded: () => void }) {
  const [description, setDescription] = useState("");
  const [result, setResult] = useState<TaskGenerationResult | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function generate() {
    if (!description.trim()) { setError("Please describe your project first."); return; }
    setLoading(true); setError(""); setResult(null); setSuccess(""); setSelectedTasks(new Set());
    try {
      const res = await api.post<TaskGenerationResult>(`/teams/${teamId}/ai/generate-tasks/`, { description });
      setResult(res.data);
      setSelectedTasks(new Set(res.data.tasks.map((_, i) => i)));
    } catch (e) { setError(errorMessage(e)); }
    finally { setLoading(false); }
  }

  async function approveSelected() {
    if (!result || selectedTasks.size === 0) return;
    const tasksToAdd = result.tasks.filter((_, i) => selectedTasks.has(i));
    setApproving(true); setError("");
    try {
      const res = await api.post<{ count: number }>(`/teams/${teamId}/ai/approve-tasks/`, { tasks: tasksToAdd });
      setSuccess(`${res.data.count} tasks added to your board!`);
      setResult(null); setDescription(""); setSelectedTasks(new Set());
      onTasksAdded();
    } catch (e) { setError(errorMessage(e)); }
    finally { setApproving(false); }
  }

  const toggleTask = (i: number) => {
    setSelectedTasks((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const EXAMPLE_PROMPTS = [
    "We need to build a university course registration system with student login, course catalog, and enrollment management.",
    "Our group is making a mobile app for tracking gym workouts with exercise logging and progress charts.",
    "We're developing a food delivery platform with restaurant listing, order tracking, and payment integration.",
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <AICard accent>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: "12px", background: "linear-gradient(180deg, rgba(232, 67, 31, 0.16) 0%, rgba(232, 67, 31, 0.04) 100%)", border: "1px solid rgba(232, 67, 31, 0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <ZapIcon width={22} height={22} stroke="var(--red-accent)" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: "-0.02em" }}>AI Task Generator</div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 3 }}>
              Describe your project and AI breaks it into actionable tasks with priorities and estimated effort. You approve before anything is added.
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label>Describe your project or feature</label>
          <textarea
            placeholder="e.g. We need to develop a university management system with student registration, course enrollment, and grade management modules..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            style={{ resize: "vertical", fontSize: 14 }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {EXAMPLE_PROMPTS.map((p, i) => (
                <button key={i} onClick={() => setDescription(p)} style={{ fontSize: 11, background: "rgba(255, 255, 255, 0.05)", border: "1px solid var(--border-subtle)", borderRadius: 9999, padding: "4px 12px", cursor: "pointer", color: "var(--text-secondary)", font: "inherit" }}>
                  Example {i + 1}
                </button>
              ))}
            </div>
            <button onClick={generate} disabled={loading || !description.trim()} className="btn btn-primary">
              {loading ? <><SpinnerIcon /> Generating…</> : <><ZapIcon width={15} height={15} stroke="#FFFFFF" /> Generate Tasks</>}
            </button>
          </div>
        </div>
      </AICard>

      {error && <ErrorBar msg={error} onDismiss={() => setError("")} />}
      {success && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(232, 67, 31, 0.08)", border: "1px solid rgba(232, 67, 31, 0.25)", borderRadius: 12, padding: "12px 16px", fontSize: 14, color: "var(--red-accent)", fontWeight: 600 }}>
          <CheckIcon width={16} height={16} stroke="var(--red-accent)" /> {success}
        </div>
      )}

      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {result.project_overview && (
            <div style={{ padding: "12px 16px", background: "rgba(232, 67, 31, 0.06)", border: "1px solid rgba(232, 67, 31, 0.18)", borderRadius: 12, fontSize: 13, color: "var(--text-secondary)" }}>
              <strong style={{ color: "var(--red-accent)" }}>AI understood: </strong>{result.project_overview}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div>
              <span style={{ fontWeight: 700, fontSize: 15 }}>{result.tasks.length} tasks generated</span>
              <span style={{ color: "var(--text-muted)", fontSize: 13, marginLeft: 10 }}>{selectedTasks.size} selected to add</span>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setSelectedTasks(new Set(result.tasks.map((_, i) => i)))} className="btn btn-dark btn-sm">Select All</button>
              <button onClick={() => setSelectedTasks(new Set())} className="btn btn-outline btn-sm">Deselect All</button>
              <button onClick={approveSelected} disabled={approving || selectedTasks.size === 0} className="btn btn-bubble-red">
                {approving ? <><SpinnerIcon /> Adding…</> : <><PlusIcon width={14} height={14} stroke="#FFFFFF" /> Add {selectedTasks.size} to Board</>}
              </button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {result.tasks.map((t, i) => {
              const isSelected = selectedTasks.has(i);
              return (
                <div
                  key={i}
                  onClick={() => toggleTask(i)}
                  style={{
                    padding: "16px 18px",
                    background: isSelected ? "rgba(232, 67, 31, 0.06)" : "var(--bg-glass-card)",
                    border: `1.5px solid ${isSelected ? "rgba(232, 67, 31, 0.35)" : "var(--border-subtle)"}`,
                    borderRadius: 14,
                    cursor: "pointer",
                    display: "flex",
                    gap: 14,
                    alignItems: "flex-start",
                    backdropFilter: "blur(12px)",
                    transition: "all 0.18s ease",
                  }}
                >
                  {/* Checkbox */}
                  <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${isSelected ? "var(--red-accent)" : "var(--border-mid)"}`, background: isSelected ? "var(--red-accent)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2, transition: "all 0.15s" }}>
                    {isSelected && <CheckIcon width={12} height={12} stroke="#FFFFFF" />}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>{t.title}</span>
                      <div style={{ display: "flex", gap: 8 }}>
                        <PriorityBadge p={t.priority} />
                        <AIPill color="gray">~{t.effort_hours}h</AIPill>
                      </div>
                    </div>
                    <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.55, margin: 0 }}>{t.description}</p>
                    {t.depends_on && (
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>
                        Depends on: <em>{t.depends_on}</em>
                      </div>
                    )}
                    {t.suggested_assignee_hint && (
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                        Suggested: {t.suggested_assignee_hint}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", justifyContent: "center" }}>
            <button onClick={approveSelected} disabled={approving || selectedTasks.size === 0} className="btn btn-bubble-red btn-lg">
              {approving ? <><SpinnerIcon /> Adding to board…</> : <><ShieldCheckIcon width={16} height={16} stroke="#FFFFFF" /> Approve & Add {selectedTasks.size} Tasks to Board</>}
            </button>
          </div>
        </div>
      )}

      {!result && !loading && (
        <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-muted)" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>Describe your project above</div>
          <div style={{ fontSize: 13 }}>AI will suggest a full set of tasks with priorities and effort estimates. You pick which ones to add.</div>
        </div>
      )}
    </div>
  );
}

// Main AI Features Page

export function AIFeatures({ teamId, documents, members, onTasksAdded, onOpenDocumentsTab, onOpenAIChat }: AIFeaturesProps) {
  const [activeTab, setActiveTab] = useState<AITab>("analyzer");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Page header */}
      <div style={{ padding: "22px 26px", background: "var(--bg-glass-card)", backdropFilter: "blur(16px)", border: "1px solid var(--border-card)", borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: "12px", background: "linear-gradient(180deg, rgba(232, 67, 31, 0.16) 0%, rgba(232, 67, 31, 0.04) 100%)", border: "1px solid rgba(232, 67, 31, 0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <BrainIcon width={22} height={22} stroke="var(--red-accent)" />
          </div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.025em", margin: 0 }}>AI Tools Suite</h2>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0, marginTop: 2 }}>
              Four specialized AI tools that understand your project context
            </p>
          </div>
        </div>
        <button onClick={onOpenAIChat} className="btn btn-dark btn-sm">
          Open AI Chat →
        </button>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 6, background: "var(--bg-glass-card)", backdropFilter: "blur(12px)", border: "1px solid var(--border-subtle)", borderRadius: 14, padding: 5, flexWrap: "wrap" }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: "1 1 auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
                padding: "9px 16px",
                borderRadius: 10,
                border: "none",
                background: isActive ? "var(--red-accent)" : "transparent",
                color: isActive ? "#FFFFFF" : "var(--text-secondary)",
                fontWeight: isActive ? 700 : 500,
                fontSize: 13,
                cursor: "pointer",
                transition: "all 0.18s var(--ease-spring)",
                font: "inherit",
                whiteSpace: "nowrap",
                boxShadow: isActive ? "0 0 16px var(--red-glow)" : "none",
              }}
            >
              {tab.icon} {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="tab-panel-enter">
        {activeTab === "analyzer" && (
          <AssignmentAnalyzer teamId={teamId} documents={documents} onOpenDocumentsTab={onOpenDocumentsTab} />
        )}
        {activeTab === "advisor" && <ProgressAdvisor teamId={teamId} />}
        {activeTab === "summarizer" && (
          <DocumentSummarizer teamId={teamId} documents={documents} />
        )}
        {activeTab === "generator" && (
          <TaskGenerator teamId={teamId} members={members} onTasksAdded={onTasksAdded} />
        )}
      </div>
    </div>
  );
}
