import { useState } from "react";
import type { KnowledgeNote } from "../types";
import { api, errorMessage } from "../api";
import {
  PlusIcon,
  SearchIcon,
  TrashIcon,
  KanbanIcon,
  TagIcon,
  CheckCircleIcon,
} from "../components/Icons";

interface KnowledgeHubProps {
  teamId: number;
  notes: KnowledgeNote[];
  onCreateNote: (noteData: Partial<KnowledgeNote>) => Promise<void>;
  onDeleteNote: (noteId: number) => Promise<void>;
  onTasksCreated: () => void;
}

export function KnowledgeHub({
  teamId,
  notes,
  onCreateNote,
  onDeleteNote,
  onTasksCreated,
}: KnowledgeHubProps) {
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  // New Note Form
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<KnowledgeNote["category"]>("meeting_notes");
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);

  // Turn Notes into Tasks Modal
  const [activeNoteForTasks, setActiveNoteForTasks] = useState<KnowledgeNote | null>(null);
  const [extractedTasks, setExtractedTasks] = useState<{ title: string; description: string; priority: string; selected: boolean }[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [creatingTasks, setCreatingTasks] = useState(false);
  const [actionSuccess, setActionSuccess] = useState("");

  const filteredNotes = notes.filter((n) => {
    const matchCat = categoryFilter === "all" || n.category === categoryFilter;
    const matchSearch =
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase()) ||
      n.tags.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  async function handleCreateNote(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      await onCreateNote({ title, content, category, tags });
      setTitle("");
      setContent("");
      setTags("");
      setShowAddModal(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleOpenTaskExtractor(note: KnowledgeNote) {
    setActiveNoteForTasks(note);
    setExtracting(true);
    setActionSuccess("");
    try {
      const res = await api.post<{ suggested_tasks: { title: string; description: string; priority: string }[] }>(
        `/teams/${teamId}/notes/${note.id}/suggest-tasks/`
      );
      setExtractedTasks(res.data.suggested_tasks.map((t) => ({ ...t, selected: true })));
    } catch (err) {
      console.error(err);
    } finally {
      setExtracting(false);
    }
  }

  async function handleConfirmCreateTasks() {
    if (!activeNoteForTasks) return;
    const selected = extractedTasks.filter((t) => t.selected);
    if (selected.length === 0) return;

    setCreatingTasks(true);
    try {
      await api.post(`/teams/${teamId}/notes/${activeNoteForTasks.id}/create-tasks/`, {
        tasks: selected,
      });
      setActionSuccess(`Successfully added ${selected.length} tasks to the Task Board!`);
      onTasksCreated();
      setTimeout(() => {
        setActiveNoteForTasks(null);
        setActionSuccess("");
      }, 1400);
    } catch (err) {
      alert(errorMessage(err));
    } finally {
      setCreatingTasks(false);
    }
  }

  function renderCategoryBadge(cat: KnowledgeNote["category"]) {
    switch (cat) {
      case "decision":
        return <span className="badge badge-green">Project Decision</span>;
      case "architecture":
        return <span className="badge badge-red">Architecture</span>;
      case "research":
        return <span className="badge badge-amber">Research</span>;
      case "announcement":
        return <span className="badge badge-red">Announcement</span>;
      default:
        return <span className="badge badge-gray">Meeting Notes</span>;
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Search & Filters */}
      <div
        className="card page-section"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 14,
          padding: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 260 }}>
          <div style={{ position: "relative", width: "100%", maxWidth: 320 }}>
            <SearchIcon
              width={16}
              height={16}
              style={{ position: "absolute", left: 12, top: 13, color: "var(--text-muted)" }}
            />
            <input
              placeholder="Search notes & decisions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 36, fontSize: 13 }}
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ width: "auto", fontSize: 13 }}
          >
            <option value="all">All Categories</option>
            <option value="meeting_notes">Meeting Notes</option>
            <option value="decision">Project Decisions</option>
            <option value="architecture">Architecture & Design</option>
            <option value="research">Research & References</option>
            <option value="announcement">Team Announcements</option>
          </select>
        </div>

        <button onClick={() => setShowAddModal(true)} className="btn btn-bubble-red">
          <PlusIcon width={16} height={16} /> New Note / Decision
        </button>
      </div>

      {/* Notes Grid */}
      {filteredNotes.length === 0 ? (
        <div
          className="card"
          style={{
            padding: "54px 24px",
            textAlign: "center",
            color: "var(--text-muted)",
            fontSize: 14,
          }}
        >
          No notes found. Keep your team aligned by recording meeting decisions and action items here.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 18 }}>
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              className="card card-interactive task-row"
              style={{
                padding: 20,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: 14,
                backgroundColor: "var(--bg-surface)",
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {renderCategoryBadge(note.category)}
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {new Date(note.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h4 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{note.title}</h4>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>By {note.author_name}</span>
                  </div>

                  <button
                    onClick={() => onDeleteNote(note.id)}
                    title="Delete note"
                    style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 2 }}
                  >
                    <TrashIcon width={14} height={14} />
                  </button>
                </div>

                <p style={{ fontSize: 13, color: "var(--text-secondary)", whiteSpace: "pre-line", marginTop: 10, lineHeight: 1.6 }}>
                  {note.content}
                </p>

                {note.tags && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 12, flexWrap: "wrap" }}>
                    <TagIcon width={12} height={12} stroke="var(--red-accent)" />
                    {note.tags.split(",").map((tag, idx) => (
                      <span key={idx} className="badge badge-gray" style={{ fontSize: 10 }}>
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action: Turn Meeting Notes into Tasks */}
              <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 12, display: "flex", justifyContent: "flex-end" }}>
                <button
                  onClick={() => handleOpenTaskExtractor(note)}
                  className="btn btn-outline btn-sm"
                  style={{ gap: 6 }}
                  title="Extract action items into Kanban tasks"
                >
                  <KanbanIcon width={13} height={13} stroke="var(--red-accent)" /> Turn into Tasks
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Note Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 16, fontSize: 20 }}>Post Knowledge Note / Decision</h3>
            <form onSubmit={handleCreateNote} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                  Title *
                </label>
                <input
                  required
                  placeholder="e.g. Architecture Decision: MySQL vs PostgreSQL"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as KnowledgeNote["category"])}
                  >
                    <option value="meeting_notes">Meeting Notes</option>
                    <option value="decision">Project Decision</option>
                    <option value="architecture">Architecture & Design</option>
                    <option value="research">Research & References</option>
                    <option value="announcement">Team Announcement</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                    Tags (comma-separated)
                  </label>
                  <input
                    placeholder="database, sprint-1, api"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                  Content & Action Items *
                </label>
                <textarea
                  required
                  rows={6}
                  placeholder="Summarize meeting discussions, decisions made, or list action items with bullet points (e.g. - Design MySQL schema)..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 14 }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn btn-bubble-red">
                  {saving ? "Posting..." : "Post Note"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Turn Meeting Notes into Tasks Modal */}
      {activeNoteForTasks && (
        <div className="modal-overlay" onClick={() => setActiveNoteForTasks(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 580 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ backgroundColor: "var(--red-accent)", padding: 6, borderRadius: "50%", display: "flex" }}>
                <KanbanIcon width={18} height={18} stroke="#FFFFFF" />
              </div>
              <h3 style={{ fontSize: 20 }}>Turn Note into Tasks</h3>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
              Action items extracted from <strong>"{activeNoteForTasks.title}"</strong>. Review and select which ones to add to your Kanban board:
            </p>

            {extracting ? (
              <div style={{ textAlign: "center", padding: 28, color: "var(--text-muted)" }}>
                Extracting action items...
              </div>
            ) : extractedTasks.length === 0 ? (
              <div style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>
                No action items detected in this note.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 320, overflowY: "auto" }}>
                {extractedTasks.map((t, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      backgroundColor: t.selected ? "var(--bg-surface-elevated)" : "var(--bg-surface)",
                      border: t.selected ? "1px solid var(--red-accent)" : "1px solid var(--border-subtle)",
                      padding: "12px 14px",
                      borderRadius: 14,
                      transition: "all 0.15s ease",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={t.selected}
                      onChange={(e) => {
                        const next = [...extractedTasks];
                        next[idx].selected = e.target.checked;
                        setExtractedTasks(next);
                      }}
                      style={{ width: "auto", marginTop: 3 }}
                    />
                    <div style={{ flex: 1 }}>
                      <input
                        value={t.title}
                        onChange={(e) => {
                          const next = [...extractedTasks];
                          next[idx].title = e.target.value;
                          setExtractedTasks(next);
                        }}
                        style={{ fontSize: 13, padding: "6px 10px", marginBottom: 4 }}
                      />
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{t.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {actionSuccess && (
              <div style={{ backgroundColor: "rgba(232, 67, 31, 0.08)", border: "1px solid rgba(232, 67, 31, 0.25)", color: "var(--red-accent)", padding: 10, borderRadius: 10, fontSize: 13, marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircleIcon width={16} height={16} /> {actionSuccess}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 18 }}>
              <button onClick={() => setActiveNoteForTasks(null)} className="btn btn-outline">
                Cancel
              </button>
              <button
                onClick={handleConfirmCreateTasks}
                disabled={creatingTasks || extractedTasks.filter((t) => t.selected).length === 0}
                className="btn btn-bubble-red"
              >
                {creatingTasks ? "Adding..." : `Create ${extractedTasks.filter((t) => t.selected).length} Tasks`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
