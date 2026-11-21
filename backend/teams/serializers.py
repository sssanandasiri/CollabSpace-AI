from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Team, TeamMembership


class TeamMemberSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    name = serializers.CharField(source="user.first_name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = TeamMembership
        fields = ["id", "user_id", "name", "email", "role", "joined_at"]


class TeamSerializer(serializers.ModelSerializer):
    my_role = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source="created_by.first_name", read_only=True)

    class Meta:
        model = Team
        fields = [
            "id",
            "name",
            "description",
            "created_at",
            "my_role",
            "member_count",
            "created_by_name",
        ]

    def get_my_role(self, team):
        user = self.context["request"].user
        membership = team.memberships.filter(user=user).first()
        return membership.role if membership else None

    def get_member_count(self, team):
        return team.memberships.count()


class TeamCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120)
    description = serializers.CharField(required=False, allow_blank=True, default="")


class AddMemberSerializer(serializers.Serializer):
    email = serializers.EmailField(required=False)
    user_id = serializers.IntegerField(required=False)
    role = serializers.ChoiceField(
        choices=TeamMembership.Role.choices, default=TeamMembership.Role.MEMBER
    )

    def validate(self, attrs):
        if not attrs.get("email") and not attrs.get("user_id"):
            raise serializers.ValidationError("Either email or user_id is required.")
        return attrs
