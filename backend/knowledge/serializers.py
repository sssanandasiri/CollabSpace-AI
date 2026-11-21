from rest_framework import serializers
from .models import KnowledgeNote, SubmissionRequirement


class KnowledgeNoteSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.first_name", read_only=True)
    author_email = serializers.CharField(source="author.email", read_only=True)

    class Meta:
        model = KnowledgeNote
        fields = [
            "id",
            "team",
            "author",
            "author_name",
            "author_email",
            "title",
            "content",
            "category",
            "tags",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "team", "author", "created_at", "updated_at"]


class SubmissionRequirementSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubmissionRequirement
        fields = [
            "id",
            "team",
            "title",
            "description",
            "status",
            "source_reference",
            "matched_task_ids",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "team", "created_at", "updated_at"]
