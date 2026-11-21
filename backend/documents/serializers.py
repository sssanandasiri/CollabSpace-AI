from rest_framework import serializers
from .models import Document, DocumentChunk, ChatSession, ChatMessage


class DocumentChunkSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentChunk
        fields = ["id", "chunk_index", "page_number", "content", "created_at"]


class DocumentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source="uploaded_by.first_name", read_only=True)
    chunk_count = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            "id",
            "team",
            "title",
            "file",
            "file_type",
            "file_size",
            "processing_status",
            "page_count",
            "summary",
            "uploaded_by",
            "uploaded_by_name",
            "chunk_count",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "team",
            "file_type",
            "file_size",
            "processing_status",
            "page_count",
            "uploaded_by",
            "uploaded_by_name",
            "chunk_count",
            "created_at",
        ]

    def get_chunk_count(self, doc):
        return doc.chunks.count()


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ["id", "session", "role", "content", "sources", "created_at"]
        read_only_fields = ["id", "sources", "created_at"]


class ChatSessionSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.first_name", read_only=True)
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = ChatSession
        fields = ["id", "team", "user", "user_name", "title", "created_at", "updated_at", "last_message"]
        read_only_fields = ["id", "team", "user", "user_name", "created_at", "updated_at", "last_message"]

    def get_last_message(self, session):
        last = session.messages.order_by("-created_at").first()
        if last:
            return {"role": last.role, "content": last.content[:80], "created_at": last.created_at}
        return None
