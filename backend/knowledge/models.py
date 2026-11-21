from django.conf import settings
from django.db import models
from teams.models import Team


class KnowledgeNote(models.Model):
    class Category(models.TextChoices):
        MEETING_NOTES = "meeting_notes", "Meeting Notes"
        DECISION = "decision", "Project Decision"
        ARCHITECTURE = "architecture", "Architecture & Design"
        RESEARCH = "research", "Research & References"
        ANNOUNCEMENT = "announcement", "Team Announcement"

    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="notes")
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="authored_notes",
    )
    title = models.CharField(max_length=200)
    content = models.TextField()
    category = models.CharField(
        max_length=30, choices=Category.choices, default=Category.MEETING_NOTES
    )
    tags = models.CharField(max_length=200, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"[{self.category}] {self.title} - {self.team.name}"


class SubmissionRequirement(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        IN_PROGRESS = "in_progress", "In Progress"
        COVERED = "covered", "Covered"

    team = models.ForeignKey(
        Team, on_delete=models.CASCADE, related_name="readiness_requirements"
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    source_reference = models.CharField(max_length=255, blank=True, default="")
    matched_task_ids = models.JSONField(default=list, blank=True)
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"{self.title} ({self.status}) - {self.team.name}"
