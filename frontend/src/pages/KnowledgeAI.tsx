import { useState, useEffect, useRef, useCallback } from "react";
import type { ChatMessage, ChatSession, DocumentItem } from "../types";
import { api, errorMessage } from "../api";
import {
  SendIcon,
  FileTextIcon,
  PlusIcon,
  BookOpenIcon,
  ShieldCheckIcon,
  AlertCircleIcon,
  TrashIcon,
  SearchIcon,
} from "../components/Icons";

interface KnowledgeAIProps {
  teamId: number;
  documents: DocumentItem[];
  onOpenDocumentsTab: () => void;
}

/* ── Tiny markdown renderer (bold, inline code, clean list items) ───── */
function renderContent(text: string) {
  const lines = text.split("\n");
  return lines.map((line, li) => {
    const isBullet = /^[-*•]\s+/.test(line);
    const isNumbered = /^\d+\.\s+/.test(line);
    const stripped = isBullet
      ? line.replace(/^[-*•]\s+/, "")
      : isNumbered
      ? line.replace(/^\d+\.\s+/, "")
      : line;

    const parts = stripped.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    const richParts = parts.map((p, pi) => {
      if (p.startsWith("**") && p.endsWith("**"))
        return <strong key={pi} style={{ color: "var(--text-strong)" }}>{p.slice(2, -2)}</strong>;
      if (p.startsWith("`") && p.endsWith("`"))
        return (
          <code
            key={pi}
            style={{
              background: "rgba(232, 67, 31, 0.08)",
              color: "var(--red-accent)",
              borderRadius: 6,
              padding: "2px 6px",
              fontSize: "0.88em",
              fontFamily: "monospace",
            }}
          >
            {p.slice(1, -1)}
          </code>
        );
      return <span key={pi}>{p}</span>;
    });

    if (isBullet || isNumbered) {
      return (
        <div key={li} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 5 }}>
          <span
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "rgba(232, 67, 31, 0.12)",
              color: "var(--red-accent)",
              fontSize: 10,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginTop: 2,
              flexShrink: 0,
            }}
          >
            {isNumbered ? line.match(/^(\d+)\./)?.[1] : "•"}
          </span>
          <span style={{ flex: 1, lineHeight: 1.6 }}>{richParts}</span>
        </div>
      );
    }

    if (line.trim() === "") return <div key={li} style={{ height: 8 }} />;
    return (
      <div key={li} style={{ marginBottom: 4, lineHeight: 1.65 }}>
        {richParts}
      </div>
    );
  });
}

const SUGGESTED_PROMPTS = [
  {
    title: "Requirements Breakdown",
    text: "What are the core requirements in our assignment brief, and what should our group do next?",
  },
  {
    title: "Deadlines & Deliverables",
    text: "What submission deadlines, rubrics, and deliverable items are defined in our project files?",
  },
  {
    title: "System Architecture",
    text: "Summarize the database schema, technologies, and architecture decisions from our documents.",
  },
  {
    title: "Next Sprint Steps",
    text: "Based on our project decisions, suggest concrete next actions for the team.",
  },
];

function useCopy() {
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const copy = useCallback((id: number, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, []);
  return { copiedId, copy };
}

export function KnowledgeAI({ teamId, documents, onOpenDocumentsTab }: KnowledgeAIProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [expandedSource, setExpandedSource] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { copiedId, copy } = useCopy();

  useEffect(() => { loadSessions(); }, [teamId]);

  useEffect(() => {
    if (currentSessionId) loadMessages(currentSessionId);
    else setMessages([]);
  }, [currentSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function loadSessions() {
    try {
      const res = await api.get<ChatSession[]>(`/teams/${teamId}/chat/sessions/`);
      setSessions(res.data);
      if (res.data.length > 0 && !currentSessionId) {
        setCurrentSessionId(res.data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function loadMessages(sessionId: number) {
    try {
      const res = await api.get<ChatMessage[]>(`/teams/${teamId}/chat/sessions/${sessionId}/messages/`);
      setMessages(res.data);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function createNewSession(initialTitle?: string) {
    try {
      const res = await api.post<ChatSession>(`/teams/${teamId}/chat/sessions/`, {
        title: initialTitle || "New Project Discussion",
      });
      setSessions((prev) => [res.data, ...prev]);
      setCurrentSessionId(res.data.id);
      setMessages([]);
      return res.data.id;
    } catch (err) {
      setError(errorMessage(err));
      return null;
    }
  }

  async function deleteSession(sessionId: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Delete this conversation?")) return;
    try {
      await api.delete(`/teams/${teamId}/chat/sessions/${sessionId}/`);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        const remaining = sessions.filter((s) => s.id !== sessionId);
        setCurrentSessionId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function handleSendMessage(queryToSend?: string) {
    const text = (queryToSend || inputPrompt).trim();
    if (!text || loading) return;

    setError("");
    setInputPrompt("");
    setLoading(true);
    inputRef.current?.focus();

    try {
      let activeSessionId = currentSessionId;
      if (!activeSessionId) {
        activeSessionId = await createNewSession(text.slice(0, 50));
        if (!activeSessionId) return;
      }

      const optimisticMsg: ChatMessage = {
        id: Date.now(),
        session: activeSessionId,
        role: "user",
        content: text,
        sources: [],
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticMsg]);

      const res = await api.post<{
        user_message: ChatMessage;
        assistant_message: ChatMessage;
      }>(`/teams/${teamId}/chat/sessions/${activeSessionId}/messages/`, {
        content: text,
      });

      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimisticMsg.id),
        res.data.user_message,
        res.data.assistant_message,
      ]);

      loadSessions();
    } catch (err) {
      setError(errorMessage(err));
      setMessages((prev) => prev.filter((m) => m.id !== Date.now()));
    } finally {
      setLoading(false);
    }
  }

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(sidebarSearch.toLowerCase())
  );

  const readyDocs = documents.filter((d) => d.processing_status === "ready");

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "260px 1fr",
        gap: 16,
        height: "calc(100vh - 140px)",
        minHeight: 560,
      }}
    >
      {/* ── LEFT SIDEBAR ─────────────────────────────────────────── */}
      <div
        className="card"
        style={{
          padding: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "14px", borderBottom: "1px solid var(--border-subtle)" }}>
          <button
            onClick={() => createNewSession()}
            className="btn btn-primary btn-sm"
            style={{ width: "100%", justifyContent: "center", marginBottom: 10 }}
          >
            <PlusIcon width={13} height={13} /> New Conversation
          </button>

          <div style={{ position: "relative" }}>
            <SearchIcon
              width={13}
              height={13}
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
              }}
            />
            <input
              placeholder="Search chats…"
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              style={{
                fontSize: 12,
                padding: "6px 10px 6px 30px",
                borderRadius: 8,
                height: 32,
              }}
            />
          </div>
        </div>

        {/* Sessions */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 10px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "6px 4px 8px" }}>
            Conversations ({filteredSessions.length})
          </div>

          {filteredSessions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px 12px", color: "var(--text-muted)", fontSize: 12 }}>
              {sidebarSearch ? "No matches" : "No chats yet"}
            </div>
          ) : (
            filteredSessions.map((s) => {
              const isActive = currentSessionId === s.id;
              return (
                <div
                  key={s.id}
                  onClick={() => setCurrentSessionId(s.id)}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 10,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 6,
                    backgroundColor: isActive ? "var(--bg-surface-elevated)" : "transparent",
                    color: isActive ? "var(--text-strong)" : "var(--text-secondary)",
                    fontWeight: isActive ? 700 : 500,
                    marginBottom: 2,
                    borderLeft: isActive ? "2px solid var(--red-accent)" : "2px solid transparent",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                    {s.title}
                  </span>
                  <button
                    onClick={(e) => deleteSession(s.id, e)}
                    title="Delete conversation"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--text-muted)",
                      padding: 2,
                      display: "flex",
                    }}
                  >
                    <TrashIcon width={12} height={12} />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Grounding Docs text (No chunky button) */}
        <div style={{ borderTop: "1px solid var(--border-subtle)", padding: "12px 14px", fontSize: 11 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontWeight: 700, color: "var(--text-strong)" }}>Grounding Documents</span>
            <span style={{ color: "var(--text-muted)" }}>{readyDocs.length} ready</span>
          </div>
          <p style={{ color: "var(--text-muted)", margin: "0 0 8px" }}>
            Answers strictly derived from uploaded team files.
          </p>
          {readyDocs.slice(0, 3).map((d) => (
            <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-secondary)", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              <FileTextIcon width={11} height={11} stroke="var(--red-accent)" />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{d.title}</span>
            </div>
          ))}
          {documents.length === 0 && (
            <button onClick={onOpenDocumentsTab} className="btn btn-outline btn-sm" style={{ width: "100%", marginTop: 4 }}>
              Upload Assignment Brief
            </button>
          )}
        </div>
      </div>

      {/* ── MAIN CHAT AREA ───────────────────────────────────────── */}
      <div
        className="card"
        style={{
          padding: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header (Clean, Zero Green, Zero Stars) */}
        <div
          style={{
            padding: "14px 22px",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--bg-surface)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Water bubble badge */}
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "10px",
                background: "linear-gradient(180deg, rgba(232, 67, 31, 0.16) 0%, rgba(232, 67, 31, 0.04) 100%)",
                border: "1px solid rgba(232, 67, 31, 0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <BookOpenIcon width={18} height={18} stroke="var(--red-accent)" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: "var(--text-strong)" }}>
                Project Knowledge AI
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 5 }}>
                <ShieldCheckIcon width={12} height={12} stroke="var(--red-accent)" />
                Grounded strictly in team documents · Cites filenames & pages
              </div>
            </div>
          </div>

          {/* Clean text indicator without button method */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-muted)" }}>
              <span className={`status-dot ${readyDocs.length > 0 ? "active" : "neutral"}`} />
              <span>{readyDocs.length} doc{readyDocs.length !== 1 ? "s" : ""} indexed</span>
            </div>

            {currentSessionId && (
              <button onClick={() => createNewSession()} className="btn btn-dark btn-sm">
                <PlusIcon width={12} height={12} /> New Chat
              </button>
            )}
          </div>
        </div>

        {/* Message Stream */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
          {messages.length === 0 ? (
            /* ── Clean Welcome State ── */
            <div style={{ margin: "auto", textAlign: "center", maxWidth: 540, display: "flex", flexDirection: "column", gap: 18 }}>
              {/* Water bubble central emblem */}
              <div
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: "20px",
                  background: "linear-gradient(180deg, rgba(232, 67, 31, 0.16) 0%, rgba(232, 67, 31, 0.04) 100%)",
                  border: "1.5px solid rgba(232, 67, 31, 0.3)",
                  boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.2), 0 12px 30px rgba(232, 67, 31, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto",
                }}
              >
                <BookOpenIcon width={32} height={32} stroke="var(--red-accent)" />
              </div>

              <div>
                <h3 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-strong)", marginBottom: 8, letterSpacing: "-0.025em" }}>
                  Ask your team's documents anything
                </h3>
                <p style={{ fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.65, margin: 0 }}>
                  CollabSpace AI searches your uploaded assignment brief, lecture slides, and decisions to give honest, verifiable answers with exact source citations.
                </p>
              </div>

              {/* Clean text metadata points — no button wrappers */}
              <div style={{ display: "flex", justifyContent: "center", gap: 18, fontSize: 12, color: "var(--text-muted)" }}>
                <span>• Reads PDFs & DOCX</span>
                <span>• Verifiable Citations</span>
                <span>• Strict Grounding</span>
              </div>

              {/* Suggested prompts in water bubble styling */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
                {SUGGESTED_PROMPTS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(p.text)}
                    className="prompt-card"
                    style={{
                      borderRadius: 14,
                      padding: "12px 14px",
                      textAlign: "left",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      fontFamily: "inherit",
                    }}
                  >
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-strong)" }}>
                      {p.title}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.45 }}>
                      "{p.text.slice(0, 52)}…"
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* ── Chat Messages ── */
            messages.map((m) => (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: m.role === "user" ? "flex-end" : "flex-start",
                  gap: 6,
                }}
              >
                <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--text-muted)", padding: "0 4px" }}>
                  {m.role === "assistant" ? "CollabSpace AI" : "You"}
                </div>

                <div
                  style={{
                    maxWidth: "80%",
                    borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                    padding: m.role === "user" ? "10px 16px" : "14px 18px",
                    fontSize: 13.5,
                    lineHeight: 1.65,
                    color: m.role === "user" ? "#FFFFFF" : "var(--text-primary)",
                    background:
                      m.role === "user"
                        ? "linear-gradient(180deg, #FF7A4A 0%, #E8431F 100%)"
                        : "var(--bg-surface-elevated)",
                    border: m.role === "assistant" ? "1px solid var(--border-subtle)" : "none",
                    boxShadow:
                      m.role === "user"
                        ? "inset 0 1px 1px rgba(255,255,255,0.4), 0 4px 14px rgba(232, 67, 31, 0.3)"
                        : "var(--shadow-sm)",
                  }}
                >
                  {m.role === "user" ? m.content : renderContent(m.content)}
                </div>

                {/* AI Citations & Copy */}
                {m.role === "assistant" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, paddingLeft: 4 }}>
                    <button
                      onClick={() => copy(m.id, m.content)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 11,
                        color: copiedId === m.id ? "var(--red-accent)" : "var(--text-muted)",
                        fontFamily: "inherit",
                        padding: 0,
                      }}
                    >
                      {copiedId === m.id ? "✓ Copied" : "Copy"}
                    </button>
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                      {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                )}

                {/* Source References */}
                {m.role === "assistant" && m.sources && m.sources.length > 0 && (
                  <div
                    style={{
                      maxWidth: "80%",
                      background: "var(--bg-surface-elevated)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: 12,
                      padding: "10px 14px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      fontSize: 12,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, color: "var(--red-accent)", fontSize: 11 }}>
                      <ShieldCheckIcon width={12} height={12} stroke="var(--red-accent)" />
                      Verified Source References
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {m.sources.map((s, idx) => {
                        const key = `${m.id}-${idx}`;
                        const isOpen = expandedSource === key;
                        return (
                          <div key={idx} style={{ position: "relative" }}>
                            <button
                              onClick={() => setExpandedSource(isOpen ? null : key)}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                background: "var(--bg-surface)",
                                border: "1px solid var(--border-subtle)",
                                borderRadius: 9999,
                                padding: "4px 10px",
                                fontSize: 11,
                                color: "var(--text-secondary)",
                                cursor: "pointer",
                                fontFamily: "inherit",
                              }}
                            >
                              <FileTextIcon width={11} height={11} stroke="var(--red-accent)" />
                              <span>{s.document_title}</span>
                              <span style={{ color: "var(--red-accent)", fontWeight: 700 }}>p.{s.page_number}</span>
                            </button>

                            {isOpen && s.excerpt && (
                              <div
                                style={{
                                  position: "absolute",
                                  bottom: "calc(100% + 6px)",
                                  left: 0,
                                  zIndex: 50,
                                  background: "var(--bg-surface)",
                                  border: "1px solid var(--border-card)",
                                  borderRadius: 10,
                                  padding: "10px 12px",
                                  fontSize: 11.5,
                                  color: "var(--text-secondary)",
                                  maxWidth: 300,
                                  boxShadow: "var(--shadow-lg)",
                                  lineHeight: 1.55,
                                }}
                              >
                                "{s.excerpt}"
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          {loading && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--text-muted)", fontSize: 13, padding: 8 }}>
              <div style={{ width: 14, height: 14, border: "2px solid var(--border-subtle)", borderTopColor: "var(--red-accent)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
              Searching project documents and synthesizing grounded response…
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {error && (
          <div style={{ background: "rgba(220, 38, 38, 0.1)", borderTop: "1px solid rgba(220, 38, 38, 0.2)", color: "#EF4444", padding: "8px 18px", fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <AlertCircleIcon width={14} height={14} /> {error}
          </div>
        )}

        {/* Input Bar with Water Bubble Button */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          style={{
            padding: "12px 16px",
            borderTop: "1px solid var(--border-subtle)",
            background: "var(--bg-surface)",
            display: "flex",
            gap: 10,
          }}
        >
          <input
            ref={inputRef}
            placeholder="Ask anything about assignment requirements, deadlines, architecture, rubric..."
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            disabled={loading}
            style={{ fontSize: 13.5 }}
          />
          <button
            type="submit"
            disabled={loading || !inputPrompt.trim()}
            className="btn btn-primary"
            style={{ padding: "8px 20px" }}
          >
            <SendIcon width={15} height={15} stroke="#FFFFFF" />
            {loading ? "Thinking…" : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
