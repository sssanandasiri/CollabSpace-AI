"""
CollabSpace AI — Extended AI Services
======================================
1. analyze_assignment   – Extract requirements, deliverables, deadlines, suggested tasks
2. progress_advice      – Identify delays, stale tasks, submission risks
3. summarize_document   – Summarize a single document with follow-up ready chunks
4. generate_tasks       – Turn a free-text description into a structured task list
5. answer_with_context  – Enhanced RAG: also injects meeting notes + decisions

All functions gracefully fall back to a built-in synthesizer if no GEMINI_API_KEY is set.
"""

import os
import re
from datetime import date, timedelta
from typing import List, Dict, Any, Optional
import requests
from django.conf import settings


# Shared Gemini caller

def _call_gemini(prompt: str, temperature: float = 0.4) -> Optional[str]:
    """Call Gemini Flash.  Returns text or None on failure."""
    api_key = os.getenv("GEMINI_API_KEY", getattr(settings, "GEMINI_API_KEY", None))
    if not api_key:
        return None
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/"
        f"models/gemini-2.5-flash:generateContent?key={api_key}"
    )
    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": temperature, "maxOutputTokens": 2048},
    }
    try:
        resp = requests.post(url, json=payload, timeout=30)
        if resp.status_code == 200:
            candidates = resp.json().get("candidates", [])
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                if parts and "text" in parts[0]:
                    return parts[0]["text"].strip()
    except Exception:
        pass
    return None


# 1. Analyze Assignment Brief

def analyze_assignment(team_id: int) -> Dict[str, Any]:
    """
    Scan all team documents and extract:
    - main_requirements  (list[str])
    - deliverables       (list[str])
    - deadlines          (list[dict] with label + date_hint)
    - suggested_tasks    (list[dict] with title, description, priority)
    """
    from .models import Document, DocumentChunk

    docs = Document.objects.filter(team_id=team_id, processing_status="ready").select_related()
    if not docs.exists():
        return {
            "error": "No ready documents found. Upload and process your assignment brief first."
        }

    all_text = ""
    for doc in docs:
        chunks = DocumentChunk.objects.filter(document=doc).order_by("chunk_index")[:30]
        for c in chunks:
            all_text += f"\n[{doc.title} p.{c.page_number}]\n{c.content}\n"
        if len(all_text) > 8000:
            break
    all_text = all_text[:8000]

    prompt = f"""You are CollabSpace AI, an assistant for university student groups.
Analyze the following assignment documents and extract structured information.

DOCUMENTS:
{all_text}

Respond ONLY as valid JSON with this exact structure:
{{
  "main_requirements": ["requirement 1", "requirement 2", ...],
  "deliverables": ["deliverable 1", "deliverable 2", ...],
  "deadlines": [
    {{"label": "Submission deadline", "date_hint": "Week 12 or specific date if found"}}
  ],
  "suggested_tasks": [
    {{
      "title": "Task title",
      "description": "Brief description of what to do",
      "priority": "high|medium|low",
      "effort_hours": 4
    }}
  ],
  "summary": "One paragraph summary of the assignment"
}}

Extract ONLY what is explicitly mentioned. If a field has no information, return an empty list."""

    gemini_response = _call_gemini(prompt, temperature=0.2)

    if gemini_response:
        # Parse JSON from response
        try:
            import json
            # Extract JSON block if wrapped in markdown
            json_match = re.search(r'\{[\s\S]*\}', gemini_response)
            if json_match:
                return json.loads(json_match.group())
        except Exception:
            pass

    # Fallback: basic extraction
    return _extract_assignment_fallback(all_text, docs)


def _extract_assignment_fallback(text: str, docs) -> Dict[str, Any]:
    """Rule-based fallback when Gemini is not available."""
    lines = [l.strip() for l in text.splitlines() if l.strip()]

    req_keywords = ["must", "shall", "required", "requirement", "objective", "implement", "design", "develop"]
    deliver_keywords = ["submit", "report", "deliverable", "presentation", "demo", "final"]
    deadline_keywords = ["deadline", "due", "submit by", "week ", "date:"]

    requirements = []
    deliverables = []
    deadlines = []

    for line in lines:
        ll = line.lower()
        if len(line) < 10 or line.startswith("["):
            continue
        if any(k in ll for k in req_keywords) and line not in requirements:
            requirements.append(line[:120])
        if any(k in ll for k in deliver_keywords) and line not in deliverables:
            deliverables.append(line[:120])
        if any(k in ll for k in deadline_keywords) and line not in deadlines:
            deadlines.append({"label": line[:80], "date_hint": "See document"})

    suggested_tasks = [
        {"title": "Review assignment brief together", "description": "Have all team members read the brief and highlight requirements", "priority": "high", "effort_hours": 1},
        {"title": "Divide requirements among team members", "description": "Assign each requirement to a responsible owner", "priority": "high", "effort_hours": 2},
        {"title": "Create project timeline", "description": "Map deadlines to weekly milestones on the task board", "priority": "high", "effort_hours": 1},
        {"title": "Draft initial design document", "description": "Outline system architecture and database design", "priority": "medium", "effort_hours": 4},
        {"title": "Prepare final report template", "description": "Set up the report structure so members can fill in their sections", "priority": "medium", "effort_hours": 2},
    ]

    doc_titles = [d.title for d in docs]
    return {
        "main_requirements": requirements[:8] or ["See uploaded documents for full requirements"],
        "deliverables": deliverables[:5] or ["Final report", "Presentation / demo"],
        "deadlines": deadlines[:4] or [{"label": "Check brief for exact dates", "date_hint": "Review uploaded documents"}],
        "suggested_tasks": suggested_tasks,
        "summary": f"Assignment analysis based on: {', '.join(doc_titles)}. Upload your assignment brief PDF for a detailed AI analysis.",
    }


# 2. Progress Advisor

def get_progress_advice(team_id: int) -> Dict[str, Any]:
    """
    Examine the team's current tasks and generate:
    - risks        (list of risk strings)
    - suggestions  (list of action strings)
    - overdue_tasks (list[dict])
    - stale_tasks   (list[dict])  — in_progress but not updated for >3 days
    - health_score  (0–100)
    - summary       (str)
    """
    from tasks.models import Task

    tasks = list(Task.objects.filter(team_id=team_id).select_related("assignee"))
    today = date.today()

    if not tasks:
        return {
            "risks": ["No tasks have been created yet."],
            "suggestions": ["Create tasks from your assignment requirements to start tracking progress."],
            "overdue_tasks": [],
            "stale_tasks": [],
            "health_score": 0,
            "summary": "No tasks found. Add tasks to get progress advice.",
        }

    overdue = []
    stale = []
    unassigned = []
    no_due_date = []
    done_count = sum(1 for t in tasks if t.status == "done")
    in_progress_count = sum(1 for t in tasks if t.status == "in_progress")
    todo_count = sum(1 for t in tasks if t.status == "todo")

    for t in tasks:
        if t.due_date and t.status != "done":
            if t.due_date < today:
                overdue.append({"id": t.id, "title": t.title, "due_date": str(t.due_date), "status": t.status})
            elif t.due_date <= today + timedelta(days=3):
                stale.append({"id": t.id, "title": t.title, "due_date": str(t.due_date), "status": t.status, "warning": "Due within 3 days"})

        if t.assignee is None and t.status != "done":
            unassigned.append(t.title)

        if t.due_date is None and t.status != "done":
            no_due_date.append(t.title)

    total = len(tasks)
    health_score = int((done_count / total) * 100) if total > 0 else 0

    # Penalize for overdue / unassigned
    health_score = max(0, health_score - len(overdue) * 10 - len(unassigned) * 5)

    risks = []
    suggestions = []

    if overdue:
        risks.append(f"{len(overdue)} task(s) are past their deadline and not yet completed.")
        suggestions.append("Prioritize overdue tasks immediately — reassign or reschedule them.")

    if len(stale) > 0:
        risks.append(f"{len(stale)} task(s) are due within 3 days.")
        suggestions.append("Review upcoming deadlines with the team today.")

    if unassigned:
        risks.append(f"{len(unassigned)} task(s) have no assignee: {', '.join(unassigned[:3])}.")
        suggestions.append("Assign every task to a team member so accountability is clear.")

    if no_due_date:
        risks.append(f"{len(no_due_date)} task(s) have no due date set.")
        suggestions.append("Add due dates to all tasks so the AI can track your timeline.")

    if todo_count > in_progress_count * 3 and total > 5:
        risks.append("Too many tasks are sitting in 'To Do'. The team may be blocked.")
        suggestions.append("Move the highest-priority To-Do tasks to In Progress and start working.")

    if done_count == 0 and total > 3:
        risks.append("No tasks have been marked as Done yet.")
        suggestions.append("Complete smaller tasks first to build momentum.")

    if not risks:
        risks.append("No critical risks detected. The project looks on track!")
        suggestions.append("Keep the momentum — review the task board daily.")

    # Try to enrich advice with Gemini
    task_summary_text = "\n".join([
        f"- [{t.status.upper()}] {t.title} | Priority: {t.priority} | Due: {t.due_date or 'no date'} | Assignee: {t.assignee.get_full_name() if t.assignee else 'unassigned'}"
        for t in tasks[:20]
    ])

    prompt = f"""You are CollabSpace AI, a project advisor for university students.
Analyze this task list and give 3–5 specific, actionable suggestions to keep the project on track.
Be direct, like a helpful tutor. Focus on the biggest risks.

TASKS:
{task_summary_text}

Today: {today}
Done: {done_count}/{total}  Overdue: {len(overdue)}  Unassigned: {len(unassigned)}

Write 3–5 bullet-point suggestions. Be specific about which tasks to focus on."""

    gemini_advice = _call_gemini(prompt, temperature=0.5)
    if gemini_advice:
        # Add AI suggestions to the list
        ai_bullets = [line.lstrip("-•* ").strip() for line in gemini_advice.splitlines() if line.strip().startswith(("-", "•", "*", "1", "2", "3", "4", "5"))]
        if ai_bullets:
            suggestions = ai_bullets[:5] + suggestions

    summary = (
        f"Your team has {total} tasks: {done_count} done, {in_progress_count} in progress, {todo_count} to do. "
        f"Health score: {health_score}/100. "
        f"{'⚠ ' + str(len(overdue)) + ' overdue tasks need attention.' if overdue else '✓ No overdue tasks.'}"
    )

    return {
        "risks": risks,
        "suggestions": suggestions[:6],
        "overdue_tasks": overdue,
        "stale_tasks": stale,
        "health_score": health_score,
        "summary": summary,
        "stats": {
            "total": total,
            "done": done_count,
            "in_progress": in_progress_count,
            "todo": todo_count,
            "overdue": len(overdue),
            "unassigned": len(unassigned),
        }
    }


# 3. Summarize Document

def summarize_document(team_id: int, doc_id: int) -> Dict[str, Any]:
    """
    Returns a structured summary of a single document:
    - summary       (str)
    - key_points    (list[str])
    - word_count    (int)
    """
    from .models import Document, DocumentChunk

    try:
        doc = Document.objects.get(id=doc_id, team_id=team_id)
    except Document.DoesNotExist:
        return {"error": "Document not found or not part of this team."}

    chunks = DocumentChunk.objects.filter(document=doc).order_by("chunk_index")
    if not chunks.exists():
        return {"error": "Document has not been processed yet. Wait for processing to complete."}

    # Take up to 6000 chars of content
    full_text = "\n".join(c.content for c in chunks)[:6000]
    word_count = len(full_text.split())

    prompt = f"""You are CollabSpace AI. Summarize the following student project document clearly and concisely.

DOCUMENT: {doc.title}
CONTENT:
{full_text}

Respond as JSON:
{{
  "summary": "2–3 paragraph summary of the document",
  "key_points": ["key point 1", "key point 2", "key point 3", "key point 4", "key point 5"],
  "document_type": "assignment_brief|lecture_notes|meeting_minutes|research|other"
}}"""

    gemini_response = _call_gemini(prompt, temperature=0.3)
    if gemini_response:
        try:
            import json
            json_match = re.search(r'\{[\s\S]*\}', gemini_response)
            if json_match:
                result = json.loads(json_match.group())
                result["word_count"] = word_count
                result["doc_title"] = doc.title
                return result
        except Exception:
            pass

    # Fallback
    sentences = re.split(r'(?<=[.!?])\s+', full_text)
    key_points = [s.strip() for s in sentences if len(s.strip()) > 40][:5]
    summary_text = " ".join(sentences[:6]).strip()

    return {
        "summary": summary_text[:600] or "Could not generate summary. Document may be too short.",
        "key_points": key_points,
        "word_count": word_count,
        "doc_title": doc.title,
        "document_type": "other",
    }


# 4. Generate Tasks from Description


def generate_tasks_from_description(team_id: int, description: str, member_names: List[str] = None) -> Dict[str, Any]:
    """
    Takes a free-text project description and returns a list of suggested tasks.
    Students must approve before tasks are created on the board.
    """
    members_text = ", ".join(member_names) if member_names else "Team members"

    prompt = f"""You are CollabSpace AI helping university students break a project description into concrete tasks.

PROJECT DESCRIPTION:
{description}

TEAM MEMBERS AVAILABLE: {members_text}

Generate 5–10 specific, actionable tasks. Each task should be small enough to complete in 1–8 hours.
Consider dependencies (e.g., design before implementation).

Respond ONLY as valid JSON:
{{
  "tasks": [
    {{
      "title": "Short task title (max 60 chars)",
      "description": "What needs to be done and why",
      "priority": "high|medium|low",
      "effort_hours": 3,
      "depends_on": "title of prerequisite task or null",
      "suggested_assignee_hint": "e.g. backend developer, researcher, or null"
    }}
  ],
  "project_overview": "One sentence about what this project is building"
}}"""

    gemini_response = _call_gemini(prompt, temperature=0.6)
    if gemini_response:
        try:
            import json
            json_match = re.search(r'\{[\s\S]*\}', gemini_response)
            if json_match:
                return json.loads(json_match.group())
        except Exception:
            pass

    # Fallback: generic decomposition
    return {
        "tasks": [
            {"title": "Define project scope and objectives", "description": "Write a clear 1-page scope document covering goals, non-goals, and success criteria.", "priority": "high", "effort_hours": 2, "depends_on": None, "suggested_assignee_hint": "Team lead"},
            {"title": "Research and literature review", "description": "Gather reference materials, existing solutions, and relevant theory.", "priority": "high", "effort_hours": 4, "depends_on": "Define project scope and objectives", "suggested_assignee_hint": "Research member"},
            {"title": "System architecture design", "description": "Design high-level architecture diagram including components, data flows, and technology choices.", "priority": "high", "effort_hours": 3, "depends_on": "Research and literature review", "suggested_assignee_hint": None},
            {"title": "Database schema design", "description": "Design and document all database tables, relationships, and constraints.", "priority": "medium", "effort_hours": 3, "depends_on": "System architecture design", "suggested_assignee_hint": None},
            {"title": "Implementation — core features", "description": "Build the main features as defined in the scope document.", "priority": "high", "effort_hours": 8, "depends_on": "Database schema design", "suggested_assignee_hint": None},
            {"title": "Testing and bug fixing", "description": "Write test cases and fix any identified issues before submission.", "priority": "medium", "effort_hours": 4, "depends_on": "Implementation — core features", "suggested_assignee_hint": None},
            {"title": "Write final report", "description": "Document the system design, implementation, and results in the required report format.", "priority": "high", "effort_hours": 5, "depends_on": None, "suggested_assignee_hint": None},
            {"title": "Prepare presentation or demo", "description": "Create slides and rehearse the demo for submission or presentation day.", "priority": "medium", "effort_hours": 3, "depends_on": "Write final report", "suggested_assignee_hint": None},
        ],
        "project_overview": f"Project based on: {description[:100]}",
    }


# 5. Project-aware enhanced RAG (injects notes + decisions)

def answer_with_full_context(team_id: int, query: str) -> Dict[str, Any]:
    
    from .services import retrieve_relevant_chunks, synthesize_grounded_answer, generate_gemini_answer
    from knowledge.models import KnowledgeNote
    from tasks.models import Task
    from teams.models import Team

    # 1. Retrieve relevant doc chunks
    relevant_chunks = retrieve_relevant_chunks(team_id=team_id, query=query, top_k=5)

    # 2. Gather knowledge notes (decisions + meeting notes)
    notes = KnowledgeNote.objects.filter(team_id=team_id).order_by("-updated_at")[:8]
    notes_text = ""
    if notes.exists():
        notes_text = "\n\n=== TEAM MEETING NOTES & DECISIONS ===\n"
        for n in notes:
            notes_text += f"\n[{n.get_category_display()}] {n.title}:\n{n.content[:400]}\n"

    # 3. Recent tasks for context
    tasks = Task.objects.filter(team_id=team_id).order_by("-updated_at")[:10]
    tasks_text = ""
    if tasks.exists():
        tasks_text = "\n\n=== CURRENT PROJECT TASKS ===\n"
        for t in tasks:
            tasks_text += f"- [{t.status.upper()}] {t.title} (Priority: {t.priority})\n"

    # 4. Sources
    sources_summary = []
    seen_sources = set()
    for rc in relevant_chunks:
        source_key = f"{rc['document_title']}:{rc['page_number']}"
        if source_key not in seen_sources:
            seen_sources.add(source_key)
            sources_summary.append({
                "document_id": rc["document_id"],
                "document_title": rc["document_title"],
                "page_number": rc["page_number"],
                "excerpt": rc["content"][:200] + ("..." if len(rc["content"]) > 200 else ""),
            })

    # 5. Build enriched Gemini prompt
    if relevant_chunks or notes.exists():
        api_key = os.getenv("GEMINI_API_KEY", getattr(settings, "GEMINI_API_KEY", None))
        if api_key:
            context_text = "\n\n".join([
                f"--- Source: {c['document_title']} (Page {c['page_number']}) ---\n{c['content']}"
                for c in relevant_chunks
            ])
            full_context = context_text + notes_text + tasks_text

            system_prompt = (
                "You are CollabSpace AI, an intelligent assistant for university student project groups.\n"
                "You have access to: (1) the team's uploaded documents, (2) their meeting notes and decisions, (3) their current task list.\n"
                "Rules:\n"
                "1. Answer based on ALL provided context — documents, notes, and tasks.\n"
                "2. If asked about past decisions or meetings, check the TEAM MEETING NOTES section.\n"
                "3. If context doesn't have the answer, say so honestly.\n"
                "4. Format your answer clearly with bullet points or numbered lists where appropriate.\n"
                "5. Cite document name and page number when referencing uploaded files."
            )

            full_prompt = f"{system_prompt}\n\nContext:\n{full_context}\n\nStudent Question:\n{query}"
            answer = _call_gemini(full_prompt, temperature=0.4)
            if answer:
                return {"answer": answer, "sources": sources_summary}

    if not relevant_chunks and not notes.exists():
        return {
            "answer": "Your team has not uploaded any documents or added any meeting notes yet. Upload your assignment brief in the Documents tab, and add meeting notes in the Knowledge Hub to get the most helpful answers.",
            "sources": [],
        }

    # Fallback to built-in synthesizer for doc chunks
    if relevant_chunks:
        from .services import synthesize_grounded_answer
        answer = synthesize_grounded_answer(query, relevant_chunks)
    else:
        # Answer from notes only
        note_content = "\n".join([f"[{n.title}]: {n.content[:300]}" for n in notes])
        answer = f"Based on your team's meeting notes and decisions:\n\n{note_content[:800]}"

    return {"answer": answer, "sources": sources_summary}
