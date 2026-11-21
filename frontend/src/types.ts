export interface User {
  id: number;
  name: string;
  email: string;
}

export interface TeamMember {
  id: number;
  user_id: number;
  name: string;
  email: string;
  role: "owner" | "admin" | "member";
  joined_at: string;
}

export interface Team {
  id: number;
  name: string;
  description: string;
  created_at: string;
  my_role: "owner" | "admin" | "member" | null;
  member_count: number;
  created_by_name?: string;
}

export interface Task {
  id: number;
  team: number;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
  due_date: string | null;
  assignee: number | null;
  assignee_name?: string;
  assignee_email?: string;
  created_by: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface TaskActivity {
  id: number;
  team: number;
  task: number | null;
  task_title: string | null;
  user: number;
  user_name: string;
  user_email: string;
  action_type: string;
  details: string;
  created_at: string;
}

export interface MemberContribution {
  user_id: number;
  name: string;
  email: string;
  role: string;
  assigned_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  todo_tasks: number;
  activity_count: number;
  completion_rate: number;
}

export interface TeamContributionSummary {
  team_summary: {
    total_tasks: number;
    completed_tasks: number;
    in_progress_tasks: number;
    todo_tasks: number;
    overdue_tasks: number;
    progress_percent: number;
  };
  member_stats: MemberContribution[];
}

export interface DocumentItem {
  id: number;
  team: number;
  title: string;
  file: string;
  file_type: string;
  file_size: number;
  processing_status: "pending" | "processing" | "ready" | "failed";
  page_count: number;
  summary: string;
  uploaded_by: number;
  uploaded_by_name: string;
  chunk_count: number;
  created_at: string;
}

export interface SourceCitation {
  document_id: number;
  document_title: string;
  page_number: number;
  excerpt: string;
}

export interface ChatMessage {
  id: number;
  session: number;
  role: "user" | "assistant";
  content: string;
  sources: SourceCitation[];
  created_at: string;
}

export interface ChatSession {
  id: number;
  team: number;
  user: number;
  user_name: string;
  title: string;
  created_at: string;
  updated_at: string;
  last_message?: {
    role: string;
    content: string;
    created_at: string;
  } | null;
}

export interface KnowledgeNote {
  id: number;
  team: number;
  author: number;
  author_name: string;
  author_email: string;
  title: string;
  content: string;
  category: "meeting_notes" | "decision" | "architecture" | "research" | "announcement";
  tags: string;
  created_at: string;
  updated_at: string;
}

export interface SubmissionRequirement {
  id: number;
  team: number;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "covered";
  source_reference: string;
  matched_task_ids: number[];
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface ReadinessSummary {
  summary: {
    total_requirements: number;
    covered: number;
    in_progress: number;
    pending: number;
    readiness_score: number;
    ready_for_submission: boolean;
  };
  unaddressed_flags: {
    id: number;
    title: string;
    source: string;
  }[];
  requirements: SubmissionRequirement[];
}

// ── Notifications ──────────────────────────────────────────────────────────

export interface Notification {
  id: number;
  team: number | null;
  team_name: string | null;
  notif_type: string;
  title: string;
  message: string;
  link: string;
  is_read: boolean;
  created_at: string;
}

// ── AI Features ────────────────────────────────────────────────────────────

export interface AssignmentAnalysis {
  error?: string;
  summary?: string;
  main_requirements: string[];
  deliverables: string[];
  deadlines: { label: string; date_hint: string }[];
  suggested_tasks: {
    title: string;
    description: string;
    priority: "high" | "medium" | "low";
    effort_hours: number;
  }[];
}

export interface ProgressAdvice {
  risks: string[];
  suggestions: string[];
  overdue_tasks: { id: number; title: string; due_date: string; status: string }[];
  stale_tasks: { id: number; title: string; due_date: string; status: string; warning: string }[];
  health_score: number;
  summary: string;
  stats: {
    total: number;
    done: number;
    in_progress: number;
    todo: number;
    overdue: number;
    unassigned: number;
  };
}

export interface DocumentSummary {
  error?: string;
  doc_title?: string;
  summary: string;
  key_points: string[];
  word_count: number;
  document_type: string;
}

export interface GeneratedTask {
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  effort_hours: number;
  depends_on: string | null;
  suggested_assignee_hint: string | null;
  selected?: boolean;
}

export interface TaskGenerationResult {
  tasks: GeneratedTask[];
  project_overview: string;
}
