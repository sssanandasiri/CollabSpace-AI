import { useEffect, useState } from "react";
import type { Team, TeamMember, Task, DocumentItem, KnowledgeNote } from "../types";
import { useAuth } from "../AuthContext";
import { api, errorMessage } from "../api";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { smoothScrollTo } from "../smoothScroll";
import { TaskBoard } from "./TaskBoard";
import { KnowledgeAI } from "./KnowledgeAI";
import { AIFeatures } from "./AIFeatures";
import { DocumentLibrary } from "./DocumentLibrary";
import { KnowledgeHub } from "./KnowledgeHub";
import { FairContribution } from "./FairContribution";
import { ReadinessChecker } from "./ReadinessChecker";
import { UsersIcon, PlusIcon, ArrowRightIcon } from "../components/Icons";

type TabKey = "overview" | "tasks" | "ai" | "ai-tools" | "documents" | "knowledge" | "contribution" | "readiness" | "members";

export default function Dashboard() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  function handleSwitchTab(tab: TabKey) {
    setActiveTab(tab);
    smoothScrollTo(0);
  }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Data for active team
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [notes, setNotes] = useState<KnowledgeNote[]>([]);

  // Modals
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDesc, setNewTeamDesc] = useState("");
  const [creatingTeam, setCreatingTeam] = useState(false);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [inviting, setInviting] = useState(false);
  const [userSuggestions, setUserSuggestions] = useState<{ id: number; name: string; email: string }[]>([]);

  // Initial load of teams
  useEffect(() => {
    loadTeams();
  }, []);

  // When selected team changes, load all its resources
  useEffect(() => {
    if (selectedTeam) {
      loadTeamData(selectedTeam.id);
    }
  }, [selectedTeam]);

  async function loadTeams() {
    setLoading(true);
    try {
      const res = await api.get<Team[]>("/teams/");
      setTeams(res.data);
      if (res.data.length > 0 && !selectedTeam) {
        setSelectedTeam(res.data[0]);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function loadTeamData(teamId: number) {
    try {
      const [membersRes, tasksRes, docsRes, notesRes] = await Promise.all([
        api.get<TeamMember[]>(`/teams/${teamId}/members/`),
        api.get<Task[]>(`/teams/${teamId}/tasks/`),
        api.get<DocumentItem[]>(`/teams/${teamId}/documents/`),
        api.get<KnowledgeNote[]>(`/teams/${teamId}/notes/`),
      ]);
      setMembers(membersRes.data);
      setTasks(tasksRes.data);
      setDocuments(docsRes.data);
      setNotes(notesRes.data);
    } catch (err) {
      console.error(err);
    }
  }

  // Create Team
  async function handleCreateTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    setCreatingTeam(true);
    try {
      const res = await api.post<Team>("/teams/", {
        name: newTeamName,
        description: newTeamDesc,
      });
      setTeams((prev) => [res.data, ...prev]);
      setSelectedTeam(res.data);
      setNewTeamName("");
      setNewTeamDesc("");
      setShowCreateTeamModal(false);
    } catch (err) {
      alert(errorMessage(err));
    } finally {
      setCreatingTeam(false);
    }
  }

  // Search classmates to invite
  async function handleSearchUsers(query: string) {
    setInviteEmail(query);
    if (query.length >= 2) {
      try {
        const res = await api.get<{ id: number; name: string; email: string }[]>(`/users/search/?q=${query}`);
        setUserSuggestions(res.data);
      } catch {
        setUserSuggestions([]);
      }
    } else {
      setUserSuggestions([]);
    }
  }

  // Invite Teammate
  async function handleInviteTeammate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTeam || !inviteEmail.trim()) return;
    setInviting(true);
    try {
      const res = await api.post<TeamMember>(`/teams/${selectedTeam.id}/members/`, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setMembers((prev) => [...prev, res.data]);
      setInviteEmail("");
      setUserSuggestions([]);
      setShowInviteModal(false);
      setTeams((prev) =>
        prev.map((t) => (t.id === selectedTeam.id ? { ...t, member_count: t.member_count + 1 } : t))
      );
    } catch (err) {
      alert(errorMessage(err));
    } finally {
      setInviting(false);
    }
  }

  // Task Actions
  async function handleAddTask(taskData: Partial<Task>) {
    if (!selectedTeam) return;
    const res = await api.post<Task>(`/teams/${selectedTeam.id}/tasks/`, taskData);
    setTasks((prev) => [res.data, ...prev]);
  }

  async function handleUpdateTaskStatus(taskId: number, newStatus: Task["status"]) {
    if (!selectedTeam) return;
    const res = await api.patch<Task>(`/teams/${selectedTeam.id}/tasks/${taskId}/`, { status: newStatus });
    setTasks((prev) => prev.map((t) => (t.id === taskId ? res.data : t)));
  }

  async function handleDeleteTask(taskId: number) {
    if (!selectedTeam) return;
    await api.delete(`/teams/${selectedTeam.id}/tasks/${taskId}/`);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }

  // Document Actions
  async function handleUploadDocument(file: File, title: string) {
    if (!selectedTeam) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    const res = await api.post<DocumentItem>(`/teams/${selectedTeam.id}/documents/`, formData);
    setDocuments((prev) => [res.data, ...prev]);
  }

  async function handleDeleteDocument(docId: number) {
    if (!selectedTeam) return;
    await api.delete(`/teams/${selectedTeam.id}/documents/${docId}/`);
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
  }

  // Note Actions
  async function handleCreateNote(noteData: Partial<KnowledgeNote>) {
    if (!selectedTeam) return;
    const res = await api.post<KnowledgeNote>(`/teams/${selectedTeam.id}/notes/`, noteData);
    setNotes((prev) => [res.data, ...prev]);
  }

  async function handleDeleteNote(noteId: number) {
    if (!selectedTeam) return;
    await api.delete(`/teams/${selectedTeam.id}/notes/${noteId}/`);
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  }

  // Leave Team
  async function handleLeaveTeam() {
    if (!selectedTeam) return;
    if (!confirm(`Are you sure you want to leave ${selectedTeam.name}?`)) return;
    try {
      await api.post(`/teams/${selectedTeam.id}/leave/`);
      const nextTeams = teams.filter((t) => t.id !== selectedTeam.id);
      setTeams(nextTeams);
      setSelectedTeam(nextTeams.length > 0 ? nextTeams[0] : null);
    } catch (err) {
      alert(errorMessage(err));
    }
  }

  if (loading && teams.length === 0) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 32,
              height: 32,
              border: "3px solid var(--border-subtle)",
              borderTopColor: "var(--red-accent)",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <p style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Loading CollabSpace AI...</p>
        </div>
      </div>
    );
  }

  // If student has no teams yet
  if (!selectedTeam && teams.length === 0) {
    return (
      <div style={{ minHeight: "100vh", position: "relative" }}>
        <Navbar
          teams={teams}
          selectedTeam={null}
          onSelectTeam={() => {}}
          onCreateTeamClick={() => setShowCreateTeamModal(true)}
          onInviteMemberClick={() => {}}
        />
        <div style={{ maxWidth: 640, margin: "100px auto", padding: "0 24px", textAlign: "center" }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              backgroundColor: "var(--red-accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
              boxShadow: "0 0 35px var(--red-glow)",
            }}
          >
            <UsersIcon width={36} height={36} stroke="#FFFFFF" />
          </div>
          <h2 style={{ fontSize: 28, marginBottom: 12, letterSpacing: "-0.03em" }}>
            Welcome to CollabSpace AI, {user?.name}!
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 15, marginBottom: 28, lineHeight: 1.6 }}>
            You haven't joined any project teams yet. Create a workspace for your assignment or ask a teammate to invite you.
          </p>
          <button onClick={() => setShowCreateTeamModal(true)} className="btn btn-bubble-red btn-lg">
            <PlusIcon width={18} height={18} /> Create Your First Team Workspace
          </button>
        </div>

        {showCreateTeamModal && renderCreateTeamModal()}
      </div>
    );
  }

  const completedCount = tasks.filter((t) => t.status === "done").length;

  function renderCreateTeamModal() {
    return (
      <div className="modal-overlay" onClick={() => setShowCreateTeamModal(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <h3 style={{ marginBottom: 14, fontSize: 18 }}>Create Assignment Workspace</h3>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 14 }}>
            Set up an isolated project space for your university team, assign tasks, and upload course documents.
          </p>
          <form onSubmit={handleCreateTeam} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>Workspace Name *</label>
              <input
                required
                placeholder="e.g. Software Engineering Assignment (Group 4)"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>Course / Module Description</label>
              <textarea
                rows={3}
                placeholder="Briefly describe the project goals or milestone due date..."
                value={newTeamDesc}
                onChange={(e) => setNewTeamDesc(e.target.value)}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
              <button type="button" onClick={() => setShowCreateTeamModal(false)} className="btn btn-outline">
                Cancel
              </button>
              <button type="submit" disabled={creatingTeam} className="btn btn-bubble-red">
                {creatingTeam ? "Creating..." : "Create Workspace"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  function renderInviteModal() {
    return (
      <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <h3 style={{ marginBottom: 14, fontSize: 18 }}>Invite Teammate to {selectedTeam?.name}</h3>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 14 }}>
            Search for registered classmates by name or enter their university email address.
          </p>
          <form onSubmit={handleInviteTeammate} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ position: "relative" }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>Teammate Email or Name *</label>
              <input
                required
                placeholder="e.g. student@uni.edu"
                value={inviteEmail}
                onChange={(e) => handleSearchUsers(e.target.value)}
              />

              {userSuggestions.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    backgroundColor: "var(--bg-surface)",
                    border: "1px solid var(--border-card)",
                    borderRadius: 12,
                    boxShadow: "var(--shadow-md)",
                    maxHeight: 180,
                    overflowY: "auto",
                    zIndex: 10,
                  }}
                >
                  {userSuggestions.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => {
                        setInviteEmail(u.email);
                        setUserSuggestions([]);
                      }}
                      style={{
                        padding: "9px 14px",
                        fontSize: 13,
                        cursor: "pointer",
                        borderBottom: "1px solid var(--border-subtle)",
                      }}
                    >
                      <strong>{u.name}</strong> ({u.email})
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>Permission Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as "member" | "admin")}
              >
                <option value="member">Member (Can edit tasks, chat with AI, upload docs)</option>
                <option value="admin">Admin (Can manage members and team settings)</option>
              </select>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
              <button type="button" onClick={() => setShowInviteModal(false)} className="btn btn-outline">
                Cancel
              </button>
              <button type="submit" disabled={inviting} className="btn btn-bubble-red">
                {inviting ? "Inviting..." : "Add to Team"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar
        teams={teams}
        selectedTeam={selectedTeam}
        onSelectTeam={(t) => setSelectedTeam(t)}
        onCreateTeamClick={() => setShowCreateTeamModal(true)}
        onInviteMemberClick={() => setShowInviteModal(true)}
        activeTab={activeTab}
        onSelectTab={handleSwitchTab}
      />

      {/* Main Tab Content Container */}
      {error && (
        <div style={{ width: "100%", margin: "14px 0 0", padding: "0 32px", color: "var(--red)", fontSize: 13 }}>
          {error}
        </div>
      )}

      <main style={{ flex: 1, width: "100%", margin: 0, padding: activeTab === "overview" ? "16px 28px 48px" : "24px 32px 56px" }}>
        {selectedTeam && (
          <div key={activeTab} className="page-transition-scroll">
            {activeTab === "overview" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                {/* ── Master Hero Frame ── */}
                <div className="hero-master-frame">
                  <div className="hero-celestial-canvas">
                    <div className="hero-grid" />
                    <div className="hero-orb hero-orb-a" />
                    <div className="hero-orb hero-orb-b" />
                    <div className="hero-orb hero-orb-c" />
                    <div className="hero-celestial-arc" />
                  </div>

                  <div style={{ zIndex: 1, marginBottom: 20 }}>
                    <div className="hero-tag-pill">
                      <span className="hero-pulse-dot" />
                      Built for student teams
                    </div>
                  </div>

                  <div style={{ zIndex: 1, maxWidth: 840, margin: "0 auto" }}>
                    <h1 className="hero-display-title">
                      CollabSpace AI <br />
                      <span className="accent-text">for Smarter Teamwork</span>
                    </h1>

                    <p className="hero-sub">
                      Briefs, decisions and tasks in one place, with an AI that answers only from your files.
                    </p>

                    <div className="hero-actions">
                      <button onClick={() => handleSwitchTab("ai")} className="btn btn-bubble-red btn-lg">
                        Explore Project AI
                      </button>
                      <button onClick={() => handleSwitchTab("documents")} className="btn btn-bubble-glass btn-lg">
                        Upload Assignment Brief
                      </button>
                    </div>

                    <div className="hero-proof">
                      <span><i className="status-dot active" /> Grounded in your files</span>
                      <span><i className="status-dot active" /> Cited answers</span>
                      <span><i className="status-dot active" /> Fair contribution tracking</span>
                    </div>
                  </div>
                </div>

                {/* ── 3 Core Feature Cards ── */}
                <div className="feature-docked-cards-grid">
                  <div className="feature-docked-card" onClick={() => handleSwitchTab("ai")} title="Open Project AI">
                    <div>
                      <h3 className="feature-card-title">Ask Your Files</h3>
                      <p className="feature-card-text">Answers with page citations, straight from your documents.</p>
                    </div>
                    <div className="feature-card-foot">
                      <span className="btn btn-bubble-glass btn-sm">
                        Open Project AI <ArrowRightIcon width={13} height={13} stroke="var(--red-accent)" />
                      </span>
                      <span className="feature-card-meta">
                        {documents.length} doc{documents.length === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>

                  <div className="feature-docked-card" onClick={() => handleSwitchTab("ai-tools")} title="Open AI Tools">
                    <div>
                      <h3 className="feature-card-title">Plan in Seconds</h3>
                      <p className="feature-card-text">Turn briefs into deadlines and ready-to-go sprint tasks.</p>
                    </div>
                    <div className="feature-card-foot">
                      <span className="btn btn-bubble-glass btn-sm">
                        Launch AI Tools <ArrowRightIcon width={13} height={13} stroke="var(--red-accent)" />
                      </span>
                    </div>
                  </div>

                  <div className="feature-docked-card" onClick={() => handleSwitchTab("tasks")} title="Open Task Board">
                    <div>
                      <h3 className="feature-card-title">Ship On Time</h3>
                      <p className="feature-card-text">Track tasks and progress so nothing slips before the deadline.</p>
                    </div>
                    <div className="feature-card-foot">
                      <span className="btn btn-bubble-glass btn-sm">
                        View Task Board <ArrowRightIcon width={13} height={13} stroke="var(--red-accent)" />
                      </span>
                      <span className="feature-card-meta">
                        {completedCount}/{tasks.length} done
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── How it works ── */}
                <section className="how-section">
                  <h2 className="how-heading">How it works</h2>
                  <div className="how-grid">
                    <div className="how-step">
                      <span className="how-num">01</span>
                      <h3>Upload</h3>
                      <p>Add your brief and notes.</p>
                    </div>
                    <div className="how-step">
                      <span className="how-num">02</span>
                      <h3>Plan</h3>
                      <p>Let AI build your task list.</p>
                    </div>
                    <div className="how-step">
                      <span className="how-num">03</span>
                      <h3>Submit</h3>
                      <p>Check readiness and hand in.</p>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeTab === "tasks" && (
              <TaskBoard
                tasks={tasks}
                members={members}
                onAddTask={handleAddTask}
                onUpdateStatus={handleUpdateTaskStatus}
                onDeleteTask={handleDeleteTask}
              />
            )}

            {activeTab === "ai" && (
              <KnowledgeAI
                teamId={selectedTeam.id}
                documents={documents}
                onOpenDocumentsTab={() => handleSwitchTab("documents")}
              />
            )}

            {activeTab === "ai-tools" && (
              <AIFeatures
                teamId={selectedTeam.id}
                documents={documents}
                members={members}
                onTasksAdded={() => loadTeamData(selectedTeam.id)}
                onOpenDocumentsTab={() => handleSwitchTab("documents")}
                onOpenAIChat={() => handleSwitchTab("ai")}
              />
            )}

            {activeTab === "documents" && (
              <DocumentLibrary
                documents={documents}
                onUpload={handleUploadDocument}
                onDeleteDocument={handleDeleteDocument}
                onAskAIAboutDoc={() => {
                  handleSwitchTab("ai");
                }}
              />
            )}

            {activeTab === "knowledge" && (
              <KnowledgeHub
                teamId={selectedTeam.id}
                notes={notes}
                onCreateNote={handleCreateNote}
                onDeleteNote={handleDeleteNote}
                onTasksCreated={() => loadTeamData(selectedTeam.id)}
              />
            )}

            {activeTab === "contribution" && <FairContribution teamId={selectedTeam.id} />}

            {activeTab === "readiness" && <ReadinessChecker teamId={selectedTeam.id} />}

            {activeTab === "members" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h3 style={{ fontSize: 20 }}>Team Members ({members.length})</h3>
                    <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                      Manage teammate permissions and access to workspace documents.
                    </p>
                  </div>
                  <button onClick={() => setShowInviteModal(true)} className="btn btn-bubble-red">
                    <PlusIcon width={16} height={16} /> Add Member
                  </button>
                </div>

                <div className="card" style={{ padding: 0 }}>
                  {members.map((m, idx) => (
                    <div
                      key={m.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "16px 24px",
                        borderBottom: idx === members.length - 1 ? "none" : "1px solid var(--border-subtle)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: "50%",
                            backgroundColor: "var(--bg-surface-elevated)",
                            color: "var(--red-accent)",
                            border: "1px solid var(--border-card)",
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 15,
                          }}
                        >
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>{m.name}</div>
                          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{m.email}</div>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-secondary)", textTransform: "capitalize" }}>
                          <span className="status-dot active" /> {m.role}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Leave Team Zone */}
                <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 16, display: "flex", justifyContent: "flex-end" }}>
                  <button onClick={handleLeaveTeam} className="btn btn-outline btn-sm">
                    Leave Workspace
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer onSelectTab={handleSwitchTab} />

      {/* Modals */}
      {showCreateTeamModal && renderCreateTeamModal()}
      {showInviteModal && renderInviteModal()}
    </div>
  );
}
