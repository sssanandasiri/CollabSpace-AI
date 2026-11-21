from pathlib import Path
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from tasks.models import TaskActivity
from teams.views import get_team_and_membership
from teams.models import TeamMembership
from .models import Document, ChatSession, ChatMessage
from .serializers import (
    ChatMessageSerializer,
    ChatSessionSerializer,
    DocumentSerializer,
)
from .services import answer_project_question, extract_and_chunk_document
from .ai_services import (
    analyze_assignment,
    get_progress_advice,
    summarize_document,
    generate_tasks_from_description,
    answer_with_full_context,
)


# Documents

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def document_list_create(request, team_id):
    team, membership = get_team_and_membership(request.user, team_id)

    if request.method == "GET":
        documents = Document.objects.filter(team=team).select_related("uploaded_by")
        return Response(DocumentSerializer(documents, many=True).data)

    # POST: Upload document
    uploaded_file = request.FILES.get("file")
    if not uploaded_file:
        return Response({"detail": "No file uploaded."}, status=status.HTTP_400_BAD_REQUEST)

    title = request.data.get("title") or uploaded_file.name
    ext = Path(uploaded_file.name).suffix.lower().replace(".", "")
    if ext not in ["pdf", "docx", "doc", "txt", "md"]:
        return Response(
            {"detail": "Unsupported file format. Please upload PDF, DOCX, or TXT."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    doc = Document.objects.create(
        team=team,
        uploaded_by=request.user,
        title=title,
        file=uploaded_file,
        file_type=ext,
        file_size=uploaded_file.size,
        processing_status=Document.ProcessingStatus.PROCESSING,
    )

    try:
        chunk_count = extract_and_chunk_document(doc)
    except Exception:
        chunk_count = 0

    TaskActivity.objects.create(
        team=team,
        user=request.user,
        action_type=TaskActivity.ActionType.UPLOADED_DOC,
        details=f"Uploaded document '{doc.title}' ({chunk_count} passages extracted)",
    )

    # Notify all team members
    _notify_team(
        team=team,
        exclude_user=request.user,
        notif_type="doc_uploaded",
        title=f"New document: {doc.title}",
        message=f"{request.user.get_full_name() or request.user.email} uploaded '{doc.title}'. The Project AI can now answer questions about it.",
    )

    return Response(DocumentSerializer(doc).data, status=status.HTTP_201_CREATED)


@api_view(["GET", "DELETE"])
@permission_classes([IsAuthenticated])
def document_detail(request, team_id, doc_id):
    team, membership = get_team_and_membership(request.user, team_id)
    doc = get_object_or_404(Document, id=doc_id, team=team)

    if request.method == "GET":
        return Response(DocumentSerializer(doc).data)

    if request.method == "DELETE":
        doc_title = doc.title
        try:
            if doc.file:
                doc.file.delete(save=False)
        except Exception:
            pass
        doc.delete()

        TaskActivity.objects.create(
            team=team,
            user=request.user,
            action_type=TaskActivity.ActionType.GENERAL,
            details=f"Deleted document '{doc_title}'",
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


# Chat / AI Assistant

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def chat_sessions(request, team_id):
    team, membership = get_team_and_membership(request.user, team_id)

    if request.method == "GET":
        sessions = ChatSession.objects.filter(team=team).select_related("user")
        return Response(ChatSessionSerializer(sessions, many=True).data)

    title = request.data.get("title", "New Project Discussion")
    session = ChatSession.objects.create(team=team, user=request.user, title=title)
    return Response(ChatSessionSerializer(session).data, status=status.HTTP_201_CREATED)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def chat_session_delete(request, team_id, session_id):
    """Delete a specific chat session."""
    team, membership = get_team_and_membership(request.user, team_id)
    session = get_object_or_404(ChatSession, id=session_id, team=team, user=request.user)
    session.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def session_messages(request, team_id, session_id):
    team, membership = get_team_and_membership(request.user, team_id)
    session = get_object_or_404(ChatSession, id=session_id, team=team)

    if request.method == "GET":
        msgs = session.messages.all()
        return Response(ChatMessageSerializer(msgs, many=True).data)

    question = request.data.get("content", "").strip()
    if not question:
        return Response({"detail": "Message content cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)

    user_msg = ChatMessage.objects.create(
        session=session,
        role=ChatMessage.Role.USER,
        content=question,
    )

    if session.messages.count() <= 2 and session.title == "New Project Discussion":
        session.title = question[:45] + ("..." if len(question) > 45 else "")
        session.save()

    # Use enhanced context-aware answer
    ai_result = answer_with_full_context(team_id=team.id, query=question)

    assistant_msg = ChatMessage.objects.create(
        session=session,
        role=ChatMessage.Role.ASSISTANT,
        content=ai_result["answer"],
        sources=ai_result["sources"],
    )

    return Response({
        "user_message": ChatMessageSerializer(user_msg).data,
        "assistant_message": ChatMessageSerializer(assistant_msg).data,
    }, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def quick_ask(request, team_id):
    team, membership = get_team_and_membership(request.user, team_id)
    question = request.data.get("question", "").strip()
    if not question:
        return Response({"detail": "Question is required."}, status=status.HTTP_400_BAD_REQUEST)

    session = ChatSession.objects.filter(team=team, user=request.user).first()
    if not session:
        session = ChatSession.objects.create(team=team, user=request.user, title=question[:40])

    ChatMessage.objects.create(session=session, role=ChatMessage.Role.USER, content=question)
    ai_result = answer_with_full_context(team_id=team.id, query=question)
    assistant_msg = ChatMessage.objects.create(
        session=session,
        role=ChatMessage.Role.ASSISTANT,
        content=ai_result["answer"],
        sources=ai_result["sources"],
    )

    return Response({
        "session_id": session.id,
        "answer": ai_result["answer"],
        "sources": ai_result["sources"],
    })


# AI Feature Endpoints

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def ai_analyze_assignment(request, team_id):
   
    team, membership = get_team_and_membership(request.user, team_id)
    result = analyze_assignment(team_id=team.id)
    return Response(result)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def ai_progress_advice(request, team_id):
    
    team, membership = get_team_and_membership(request.user, team_id)
    result = get_progress_advice(team_id=team.id)
    return Response(result)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def ai_summarize_document(request, team_id):
    
    team, membership = get_team_and_membership(request.user, team_id)
    doc_id = request.data.get("doc_id")
    if not doc_id:
        return Response({"detail": "doc_id is required."}, status=status.HTTP_400_BAD_REQUEST)
    result = summarize_document(team_id=team.id, doc_id=int(doc_id))
    return Response(result)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def ai_generate_tasks(request, team_id):
    
    team, membership = get_team_and_membership(request.user, team_id)
    description = request.data.get("description", "").strip()
    if not description:
        return Response({"detail": "description is required."}, status=status.HTTP_400_BAD_REQUEST)

    # Get team member names for context
    memberships = TeamMembership.objects.filter(team=team).select_related("user")
    member_names = [m.user.get_full_name() or m.user.email for m in memberships]

    result = generate_tasks_from_description(
        team_id=team.id,
        description=description,
        member_names=member_names,
    )
    return Response(result)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def ai_approve_tasks(request, team_id):
    
    from tasks.models import Task

    team, membership = get_team_and_membership(request.user, team_id)
    tasks_data = request.data.get("tasks", [])
    if not tasks_data:
        return Response({"detail": "No tasks provided."}, status=status.HTTP_400_BAD_REQUEST)

    created = []
    for t in tasks_data[:15]:  # safety limit
        priority = t.get("priority", "medium")
        if priority not in ["low", "medium", "high"]:
            priority = "medium"
        task = Task.objects.create(
            team=team,
            created_by=request.user,
            title=t.get("title", "Untitled Task")[:200],
            description=t.get("description", ""),
            priority=priority,
            status=Task.Status.TODO,
        )
        TaskActivity.objects.create(
            team=team,
            task=task,
            user=request.user,
            action_type=TaskActivity.ActionType.CREATED_TASK,
            details=f"AI-generated task approved and added: '{task.title}'",
        )
        created.append({"id": task.id, "title": task.title})

    _notify_team(
        team=team,
        exclude_user=None,
        notif_type="general",
        title=f"{len(created)} AI-generated tasks added",
        message=f"{request.user.get_full_name() or request.user.email} approved {len(created)} AI-suggested tasks to the board.",
    )

    return Response({"created": created, "count": len(created)}, status=status.HTTP_201_CREATED)


# Helper: notify all team members

def _notify_team(team, exclude_user, notif_type: str, title: str, message: str):
    """Create a Notification for every team member (optionally excluding one user)."""
    try:
        from notifications.models import Notification
        memberships = TeamMembership.objects.filter(team=team).select_related("user")
        for m in memberships:
            if exclude_user and m.user == exclude_user:
                continue
            Notification.objects.create(
                recipient=m.user,
                team=team,
                notif_type=notif_type,
                title=title,
                message=message,
            )
    except Exception:
        pass  # Notifications are non-critical
