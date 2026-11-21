from django.contrib.auth.models import User
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from teams.models import TeamMembership
from teams.views import get_team_and_membership
from .models import Task, TaskActivity
from .serializers import TaskActivitySerializer, TaskSerializer


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def task_list(request, team_id):
    team, membership = get_team_and_membership(request.user, team_id)

    if request.method == "GET":
        tasks = Task.objects.filter(team=team).select_related("assignee", "created_by")

        # Filters
        status_filter = request.query_params.get("status")
        if status_filter:
            tasks = tasks.filter(status=status_filter)

        assignee_id = request.query_params.get("assignee")
        if assignee_id:
            tasks = tasks.filter(assignee_id=assignee_id)

        priority_filter = request.query_params.get("priority")
        if priority_filter:
            tasks = tasks.filter(priority=priority_filter)

        search = request.query_params.get("search")
        if search:
            tasks = tasks.filter(Q(title__icontains=search) | Q(description__icontains=search))

        tasks = tasks.order_by("-updated_at")
        return Response(TaskSerializer(tasks, many=True).data)

    # POST: Create Task
    serializer = TaskSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    task = serializer.save(team=team, created_by=request.user)

    # Log activity
    assignee_str = f" assigned to {task.assignee.first_name}" if task.assignee else " (unassigned)"
    TaskActivity.objects.create(
        team=team,
        task=task,
        user=request.user,
        action_type=TaskActivity.ActionType.CREATED_TASK,
        details=f"Created task '{task.title}'{assignee_str}",
    )

    return Response(TaskSerializer(task).data, status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def task_detail(request, team_id, task_id):
    team, membership = get_team_and_membership(request.user, team_id)
    task = get_object_or_404(Task.objects.select_related("assignee", "created_by"), id=task_id, team=team)

    if request.method == "GET":
        return Response(TaskSerializer(task).data)

    if request.method == "PATCH":
        old_status = task.status
        old_assignee = task.assignee
        old_title = task.title

        serializer = TaskSerializer(task, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_task = serializer.save()

        # Track what changed for fair contribution history
        changes = []
        action_type = TaskActivity.ActionType.UPDATED_TASK

        if old_status != updated_task.status:
            changes.append(f"status from '{old_status}' to '{updated_task.status}'")
            if updated_task.status == Task.Status.DONE:
                action_type = TaskActivity.ActionType.COMPLETED_TASK
            else:
                action_type = TaskActivity.ActionType.UPDATED_STATUS

        if old_assignee != updated_task.assignee:
            new_name = updated_task.assignee.first_name if updated_task.assignee else "unassigned"
            changes.append(f"reassigned to {new_name}")
            action_type = TaskActivity.ActionType.ASSIGNED_TASK

        if old_title != updated_task.title:
            changes.append("updated title")

        if "due_date" in request.data:
            changes.append("updated due date")

        if not changes:
            changes.append("updated task details")

        TaskActivity.objects.create(
            team=team,
            task=updated_task,
            user=request.user,
            action_type=action_type,
            details=f"Updated '{updated_task.title}': {', '.join(changes)}",
        )

        return Response(TaskSerializer(updated_task).data)

    if request.method == "DELETE":
        task_title = task.title
        task.delete()
        TaskActivity.objects.create(
            team=team,
            task=None,
            user=request.user,
            action_type=TaskActivity.ActionType.DELETED_TASK,
            details=f"Deleted task '{task_title}'",
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def team_activities(request, team_id):
    team, membership = get_team_and_membership(request.user, team_id)
    activities = TaskActivity.objects.filter(team=team).select_related("user", "task")[:50]
    return Response(TaskActivitySerializer(activities, many=True).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def contribution_stats(request, team_id):
    team, membership = get_team_and_membership(request.user, team_id)

    memberships = team.memberships.select_related("user").all()
    tasks = Task.objects.filter(team=team)
    today = timezone.now().date()

    total_tasks = tasks.count()
    completed_tasks = tasks.filter(status=Task.Status.DONE).count()
    in_progress_tasks = tasks.filter(status=Task.Status.IN_PROGRESS).count()
    todo_tasks = tasks.filter(status=Task.Status.TODO).count()
    overdue_tasks = tasks.filter(~Q(status=Task.Status.DONE), due_date__lt=today).count()

    member_stats = []
    for m in memberships:
        u = m.user
        member_tasks = tasks.filter(assignee=u)
        assigned_count = member_tasks.count()
        completed_count = member_tasks.filter(status=Task.Status.DONE).count()
        in_progress_count = member_tasks.filter(status=Task.Status.IN_PROGRESS).count()
        todo_count = member_tasks.filter(status=Task.Status.TODO).count()
        activity_count = TaskActivity.objects.filter(team=team, user=u).count()

        member_stats.append({
            "user_id": u.id,
            "name": u.first_name or u.username,
            "email": u.email,
            "role": m.role,
            "assigned_tasks": assigned_count,
            "completed_tasks": completed_count,
            "in_progress_tasks": in_progress_count,
            "todo_tasks": todo_count,
            "activity_count": activity_count,
            "completion_rate": round((completed_count / assigned_count * 100), 1) if assigned_count > 0 else 0,
        })

    return Response({
        "team_summary": {
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "in_progress_tasks": in_progress_tasks,
            "todo_tasks": todo_tasks,
            "overdue_tasks": overdue_tasks,
            "progress_percent": round((completed_tasks / total_tasks * 100), 1) if total_tasks > 0 else 0,
        },
        "member_stats": member_stats,
    })
