from django.conf import settings
from django.db import models
from teams.models import Team


class Task(models.Model):
    class Status(models.TextChoices):
        TODO = "todo", "To Do"
        IN_PROGRESS = "in_progress", "In Progress"
        DONE = "done", "Done"

    class Priority(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"

    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="tasks")
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.TODO)
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.MEDIUM)
    due_date = models.DateField(null=True, blank=True)
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="assigned_tasks",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="created_tasks",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} ({self.status}) - {self.team.name}"


class TaskActivity(models.Model):
    class ActionType(models.TextChoices):
        CREATED_TASK = "created_task", "Created Task"
        UPDATED_TASK = "updated_task", "Updated Task"
        UPDATED_STATUS = "updated_status", "Updated Status"
        COMPLETED_TASK = "completed_task", "Completed Task"
        ASSIGNED_TASK = "assigned_task", "Assigned Task"
        DELETED_TASK = "deleted_task", "Deleted Task"
        UPLOADED_DOC = "uploaded_document", "Uploaded Document"
        ADDED_NOTE = "added_note", "Added Note"
        GENERAL = "general", "General Activity"

    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="activities")
    task = models.ForeignKey(
        Task,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="activities",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="activities",
    )
    action_type = models.CharField(
        max_length=30, choices=ActionType.choices, default=ActionType.GENERAL
    )
    details = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user} - {self.action_type} at {self.created_at}"
