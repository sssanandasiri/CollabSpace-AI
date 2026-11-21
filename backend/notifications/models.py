from django.conf import settings
from django.db import models
from teams.models import Team


class Notification(models.Model):
    class NotifType(models.TextChoices):
        TASK_ASSIGNED   = "task_assigned",   "Task Assigned to You"
        TASK_COMPLETED  = "task_completed",  "Task Completed"
        TASK_OVERDUE    = "task_overdue",    "Task Overdue"
        DOC_UPLOADED    = "doc_uploaded",    "Document Uploaded"
        MEMBER_JOINED   = "member_joined",   "New Member Joined"
        AI_INSIGHT      = "ai_insight",      "AI Progress Insight"
        NOTE_ADDED      = "note_added",      "New Knowledge Note"
        GENERAL         = "general",         "General"

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        related_name="notifications",
        null=True,
        blank=True,
    )
    notif_type = models.CharField(
        max_length=30,
        choices=NotifType.choices,
        default=NotifType.GENERAL,
    )
    title   = models.CharField(max_length=200)
    message = models.TextField()
    link    = models.CharField(max_length=200, blank=True, default="")
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.notif_type}] {self.title} → {self.recipient}"
