import re
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from documents.models import DocumentChunk
from tasks.models import Task, TaskActivity
from teams.views import get_team_and_membership
from .models import KnowledgeNote, SubmissionRequirement
from .serializers import KnowledgeNoteSerializer, SubmissionRequirementSerializer


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def note_list(request, team_id):
    team, membership = get_team_and_membership(request.user, team_id)

    if request.method == "GET":
        notes = KnowledgeNote.objects.filter(team=team).select_related("author")

        category = request.query_params.get("category")
        if category:
            notes = notes.filter(category=category)

        search = request.query_params.get("search")
        if search:
            notes = notes.filter(
                Q(title__icontains=search)
                | Q(content__icontains=search)
                | Q(tags__icontains=search)
            )

        return Response(KnowledgeNoteSerializer(notes, many=True).data)

    # POST: Create Note
    serializer = KnowledgeNoteSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    note = serializer.save(team=team, author=request.user)

    cat_label = dict(KnowledgeNote.Category.choices).get(note.category, "note")
    TaskActivity.objects.create(
        team=team,
        user=request.user,
        action_type=TaskActivity.ActionType.ADDED_NOTE,
        details=f"Posted {cat_label.lower()}: '{note.title}'",
    )

    return Response(KnowledgeNoteSerializer(note).data, status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def note_detail(request, team_id, note_id):
    team, membership = get_team_and_membership(request.user, team_id)
    note = get_object_or_404(KnowledgeNote.objects.select_related("author"), id=note_id, team=team)

    if request.method == "GET":
        return Response(KnowledgeNoteSerializer(note).data)

    if request.method == "PATCH":
        serializer = KnowledgeNoteSerializer(note, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()
        return Response(KnowledgeNoteSerializer(updated).data)

    if request.method == "DELETE":
        title = note.title
        note.delete()
        TaskActivity.objects.create(
            team=team,
            user=request.user,
            action_type=TaskActivity.ActionType.GENERAL,
            details=f"Deleted note '{title}'",
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def suggest_tasks_from_note(request, team_id, note_id):
    """
    Parses a meeting note or decision to find actionable task items.
    Looks for bullet points, checkboxes, action verbs, or 'TODO:' markers.
    """
    team, membership = get_team_and_membership(request.user, team_id)
    note = get_object_or_404(KnowledgeNote, id=note_id, team=team)

    suggested = []
    lines = note.content.split("\n")

    action_verbs = {
        "create", "build", "design", "implement", "write", "prepare", "test", "deploy",
        "review", "setup", "configure", "draft", "document", "investigate", "fix", "analyze"
    }

    for line in lines:
        cleaned = line.strip()
        if not cleaned:
            continue

        # Check for list markers like - [ ], *, -, 1.
        is_bullet = bool(re.match(r"^(\s*[-*+]|\d+\.|\- \[[ xX]\])", cleaned))
        item_text = re.sub(r"^(\s*[-*+]|\d+\.|\- \[[ xX]\])\s*", "", cleaned).strip()

        if len(item_text) < 5:
            continue

        first_word = item_text.split()[0].lower() if item_text.split() else ""
        if is_bullet or first_word in action_verbs or "todo" in cleaned.lower() or "action item" in cleaned.lower():
            suggested.append({
                "title": item_text[:120],
                "description": f"Extracted from note: {note.title}\nContext: {cleaned}",
                "priority": "medium",
            })

    if not suggested:
        # Default suggestion from title if no bullets
        suggested.append({
            "title": f"Follow up on: {note.title}",
            "description": f"Action items from note: {note.title}",
            "priority": "medium",
        })

    return Response({"suggested_tasks": suggested})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_tasks_from_note(request, team_id, note_id):
    """Bulk creates selected tasks extracted from a meeting note."""
    team, membership = get_team_and_membership(request.user, team_id)
    note = get_object_or_404(KnowledgeNote, id=note_id, team=team)

    tasks_data = request.data.get("tasks", [])
    if not isinstance(tasks_data, list) or not tasks_data:
        return Response({"detail": "Tasks list is required."}, status=status.HTTP_400_BAD_REQUEST)

    created_tasks = []
    for item in tasks_data:
        title = item.get("title", "").strip()
        if not title:
            continue
        task = Task.objects.create(
            team=team,
            created_by=request.user,
            title=title,
            description=item.get("description", f"Extracted from note: {note.title}"),
            priority=item.get("priority", Task.Priority.MEDIUM),
            status=Task.Status.TODO,
        )
        created_tasks.append(task)

    if created_tasks:
        TaskActivity.objects.create(
            team=team,
            user=request.user,
            action_type=TaskActivity.ActionType.CREATED_TASK,
            details=f"Created {len(created_tasks)} tasks from note '{note.title}'",
        )

    return Response({
        "message": f"Successfully created {len(created_tasks)} tasks.",
        "tasks": [{"id": t.id, "title": t.title} for t in created_tasks],
    }, status=status.HTTP_201_CREATED)


# --- Submission Readiness Checker ---

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def readiness_overview(request, team_id):
    team, membership = get_team_and_membership(request.user, team_id)

    if request.method == "GET":
        requirements = SubmissionRequirement.objects.filter(team=team)
        req_data = SubmissionRequirementSerializer(requirements, many=True).data

        total = requirements.count()
        covered = requirements.filter(status=SubmissionRequirement.Status.COVERED).count()
        in_prog = requirements.filter(status=SubmissionRequirement.Status.IN_PROGRESS).count()
        pending = requirements.filter(status=SubmissionRequirement.Status.PENDING).count()

        readiness_score = round((covered / total * 100), 1) if total > 0 else 0

        # Flag requirements not covered
        unaddressed = requirements.filter(status=SubmissionRequirement.Status.PENDING)
        unaddressed_data = [
            {"id": r.id, "title": r.title, "source": r.source_reference}
            for r in unaddressed
        ]

        return Response({
            "summary": {
                "total_requirements": total,
                "covered": covered,
                "in_progress": in_prog,
                "pending": pending,
                "readiness_score": readiness_score,
                "ready_for_submission": readiness_score >= 100 and total > 0,
            },
            "unaddressed_flags": unaddressed_data,
            "requirements": req_data,
        })

    # POST: Add requirement
    serializer = SubmissionRequirementSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    req = serializer.save(team=team)
    return Response(SubmissionRequirementSerializer(req).data, status=status.HTTP_201_CREATED)


@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def requirement_detail(request, team_id, req_id):
    team, membership = get_team_and_membership(request.user, team_id)
    req = get_object_or_404(SubmissionRequirement, id=req_id, team=team)

    if request.method == "PATCH":
        serializer = SubmissionRequirementSerializer(req, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()
        return Response(SubmissionRequirementSerializer(updated).data)

    if request.method == "DELETE":
        req.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def auto_extract_requirements(request, team_id):
    """
    Scans the team's uploaded documents (assignment brief / specifications)
    and extracts key deliverables and requirements into the checklist!
    """
    team, membership = get_team_and_membership(request.user, team_id)

    chunks = DocumentChunk.objects.filter(team=team).select_related("document")
    if not chunks.exists():
        return Response(
            {"detail": "No documents found. Please upload your assignment brief first."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Heuristic requirement pattern scanner
    extracted = []
    seen_titles = set(SubmissionRequirement.objects.filter(team=team).values_list("title", flat=True))

    keywords = ["require", "deliverable", "objective", "must provide", "specification", "rubric", "submission", "functional requirement"]

    for chunk in chunks:
        lines = chunk.content.split("\n")
        for line in lines:
            line_str = line.strip()
            if len(line_str) < 15 or len(line_str) > 200:
                continue

            # Look for numbered or bullet items that sound like requirements
            is_match = any(k in line_str.lower() for k in keywords) or re.match(r"^(\d+\.|\*|-)\s+[A-Z]", line_str)
            if is_match:
                cleaned_title = re.sub(r"^(\d+\.|\*|-)\s*", "", line_str).strip()
                if cleaned_title not in seen_titles and len(cleaned_title) > 10:
                    seen_titles.add(cleaned_title)
                    extracted.append(
                        SubmissionRequirement(
                            team=team,
                            title=cleaned_title,
                            description=f"Auto-extracted requirement from {chunk.document.title}",
                            source_reference=f"{chunk.document.title}, p. {chunk.page_number}",
                            status=SubmissionRequirement.Status.PENDING,
                        )
                    )
            if len(extracted) >= 10:
                break
        if len(extracted) >= 10:
            break

    if not extracted and not seen_titles:
        # Fallback starter requirements if brief is unstructured
        first_doc = chunks.first().document
        extracted = [
            SubmissionRequirement(
                team=team,
                title="Define system scope and functional requirements",
                source_reference=f"{first_doc.title}, p. 1",
            ),
            SubmissionRequirement(
                team=team,
                title="Design system architecture & database schema",
                source_reference=f"{first_doc.title}, p. 1",
            ),
            SubmissionRequirement(
                team=team,
                title="Implement core functionality with team contribution",
                source_reference=f"{first_doc.title}, p. 1",
            ),
            SubmissionRequirement(
                team=team,
                title="Prepare test plan and final submission report",
                source_reference=f"{first_doc.title}, p. 1",
            ),
        ]

    if extracted:
        SubmissionRequirement.objects.bulk_create(extracted)

    return Response({
        "message": f"Extracted {len(extracted)} requirements from project documents.",
        "requirements": SubmissionRequirementSerializer(SubmissionRequirement.objects.filter(team=team), many=True).data,
    }, status=status.HTTP_201_CREATED)
