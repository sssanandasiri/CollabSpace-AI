import { useState } from "react";
import type { Task, TeamMember } from "../types";
import { PlusIcon, SearchIcon, ClockIcon, TrashIcon, CheckCircleIcon } from "../components/Icons";

interface TaskBoardProps {
  tasks: Task[];
  members: TeamMember[];
  onAddTask: (taskData: Partial<Task>) => Promise<void>;
  onUpdateStatus: (taskId: number, newStatus: Task["status"]) => Promise<void>;
  onDeleteTask: (taskId: number) => Promise<void>;
}

export function TaskBoard({ tasks, members, onAddTask, onUpdateStatus, onDeleteTask }: TaskBoardProps) {
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("medium");
  const [dueDate, setDueDate] = useState("");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    const matchSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase());
    const matchPriority = priorityFilter === "all" || t.priority === priorityFilter;
    const matchAssignee = assigneeFilter === "all" || (t.assignee && String(t.assignee) === assigneeFilter);
    return matchSearch && matchPriority && matchAssignee;
  });

  const todoTasks = filteredTasks.filter((t) => t.status === "todo");
  const inProgressTasks = filteredTasks.filter((t) => t.status === "in_progress");
  const doneTasks = filteredTasks.filter((t) => t.status === "done");

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onAddTask({
        title,
        description,
        priority,
        due_date: dueDate || null,
        assignee: assigneeId ? Number(assigneeId) : null,
        status: "todo",
      });
      setTitle("");
      setDescription("");
      setDueDate("");
      setAssigneeId("");
      setShowAddModal(false);
    } finally {
      setSaving(false);
    }
  }

  function renderPriorityBadge(p: Task["priority"]) {
    if (p === "high") return <span className="badge badge-red">High Priority</span>;
    if (p === "medium") return <span className="badge badge-amber">Medium</span>;
    return <span className="badge badge-gray">Low</span>;
  }

  function isOverdue(dueDateStr: string | null, status: Task["status"]) {
    if (!dueDateStr || status === "done") return false;
    const due = new Date(dueDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  }

  function renderColumn(
    colTitle: string,
    colStatus: Task["status"],
    colTasks: Task[],
    headerBadgeClass: string
  ) {
    return (
      <div
        className="kanban-col"
        style={{
          flex: 1,
          minWidth: 310,
          backgroundColor: "var(--bg-glass-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 20,
          padding: 18,
          display: "flex",
          flexDirection: "column",
          gap: 14,
          backdropFilter: "blur(12px)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h4 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{colTitle}</h4>
            <span className={`badge ${headerBadgeClass}`} style={{ fontSize: 11, padding: "2px 8px" }}>
              {colTasks.length}
            </span>
          </div>
          {colStatus === "todo" && (
            <button
              onClick={() => setShowAddModal(true)}
              className="btn btn-lime btn-sm"
              title="Add task"
            >
              <PlusIcon width={13} height={13} /> Add
            </button>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 220 }}>
          {colTasks.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "36px 16px",
                color: "var(--text-muted)",
                fontSize: 13,
                border: "2px dashed var(--border-subtle)",
                borderRadius: 14,
              }}
            >
              No tasks in {colTitle.toLowerCase()}
            </div>
          ) : (
            colTasks.map((task) => (
              <div
                key={task.id}
                className="card card-interactive task-row"
                style={{
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  backgroundColor: "var(--bg-surface)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>{task.title}</div>
                  <button
                    onClick={() => onDeleteTask(task.id)}
                    title="Delete task"
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      padding: 2,
                    }}
                  >
                    <TrashIcon width={14} height={14} />
                  </button>
                </div>

                {task.description && (
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", whiteSpace: "pre-line", lineHeight: 1.5 }}>
                    {task.description}
                  </p>
                )}

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, paddingTop: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {renderPriorityBadge(task.priority)}
                    {task.due_date && (
                      <span
                        className={`badge ${isOverdue(task.due_date, task.status) ? "badge-red" : "badge-gray"}`}
                        style={{ display: "flex", alignItems: "center", gap: 4 }}
                      >
                        <ClockIcon width={11} height={11} />
                        {task.due_date}
                      </span>
                    )}
                  </div>

                  {task.assignee_name && (
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--lime)", display: "flex", alignItems: "center", gap: 6 }}>
                      <span
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          backgroundColor: "var(--lime)",
                          color: "#080F14",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 10,
                          fontWeight: 800,
                        }}
                      >
                        {task.assignee_name.charAt(0).toUpperCase()}
                      </span>
                      {task.assignee_name}
                    </div>
                  )}
                </div>

                {/* Status action buttons */}
                <div style={{ display: "flex", gap: 6, borderTop: "1px solid var(--border-subtle)", paddingTop: 10, marginTop: 4 }}>
                  {task.status !== "todo" && (
                    <button
                      onClick={() => onUpdateStatus(task.id, "todo")}
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: 11, padding: "3px 8px" }}
                    >
                      ← To Do
                    </button>
                  )}
                  {task.status !== "in_progress" && (
                    <button
                      onClick={() => onUpdateStatus(task.id, "in_progress")}
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: 11, padding: "3px 8px" }}
                    >
                      In Progress
                    </button>
                  )}
                  {task.status !== "done" && (
                    <button
                      onClick={() => onUpdateStatus(task.id, "done")}
                      className="btn btn-lime btn-sm"
                      style={{ fontSize: 11, padding: "3px 10px", marginLeft: "auto" }}
                    >
                      <CheckCircleIcon width={12} height={12} /> Done
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Controls Bar */}
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
          <div style={{ position: "relative", width: "100%", maxWidth: 300 }}>
            <SearchIcon
              width={16}
              height={16}
              style={{ position: "absolute", left: 12, top: 13, color: "var(--text-muted)" }}
            />
            <input
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 36, fontSize: 13 }}
            />
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={{ width: "auto", fontSize: 13 }}
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>

          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            style={{ width: "auto", fontSize: 13 }}
          >
            <option value="all">All Assignees</option>
            {members.map((m) => (
              <option key={m.user_id} value={String(m.user_id)}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <button onClick={() => setShowAddModal(true)} className="btn btn-lime">
          <PlusIcon width={16} height={16} /> New Task
        </button>
      </div>

      {/* Kanban Board Columns */}
      <div className="page-section" style={{ display: "flex", gap: 18, overflowX: "auto", paddingBottom: 10 }}>
        {renderColumn("To Do", "todo", todoTasks, "badge-gray")}
        {renderColumn("In Progress", "in_progress", inProgressTasks, "badge-amber")}
        {renderColumn("Done", "done", doneTasks, "badge-green")}
      </div>

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 16, fontSize: 20 }}>Create Assignment Task</h3>
            <form onSubmit={handleCreateTask} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                  Task Title *
                </label>
                <input
                  required
                  placeholder="e.g. Design Relational ER Diagram"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Requirements, acceptance criteria, or file references..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                    Priority
                  </label>
                  <select value={priority} onChange={(e) => setPriority(e.target.value as Task["priority"])}>
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                  Assignee
                </label>
                <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.user_id} value={String(m.user_id)}>
                      {m.name} ({m.email})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 14 }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn btn-lime">
                  {saving ? "Creating..." : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
