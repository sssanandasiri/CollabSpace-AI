from rest_framework import serializers
from .models import Task, TaskActivity


class TaskSerializer(serializers.ModelSerializer):
    assignee_name = serializers.CharField(source="assignee.first_name", read_only=True)
    assignee_email = serializers.CharField(source="assignee.email", read_only=True)
    created_by_name = serializers.CharField(source="created_by.first_name", read_only=True)

    class Meta:
        model = Task
        fields = [
            "id",
            "team",
            "title",
            "description",
            "status",
            "priority",
            "due_date",
            "assignee",
            "assignee_name",
            "assignee_email",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "team", "created_by", "created_at", "updated_at"]


class TaskActivitySerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.first_name", read_only=True)
    user_email = serializers.CharField(source="user.email", read_only=True)
    task_title = serializers.CharField(source="task.title", read_only=True, default=None)

    class Meta:
        model = TaskActivity
        fields = [
            "id",
            "team",
            "task",
            "task_title",
            "user",
            "user_name",
            "user_email",
            "action_type",
            "details",
            "created_at",
        ]
