from django.contrib.auth.models import User
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Team, TeamMembership
from .serializers import (
    AddMemberSerializer,
    TeamCreateSerializer,
    TeamMemberSerializer,
    TeamSerializer,
)


def get_team_and_membership(user, team_id):
    """Utility to enforce team membership and get user's role."""
    membership = TeamMembership.objects.filter(team_id=team_id, user=user).select_related("team").first()
    if not membership:
        raise PermissionDenied("You do not have access to this team.")
    return membership.team, membership


def teams_for(user):
    """The ONLY way views fetch teams: just the ones this user belongs to."""
    return Team.objects.filter(memberships__user=user)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def team_list(request):
    if request.method == "GET":
        teams = teams_for(request.user).order_by("-created_at")
        return Response(
            TeamSerializer(teams, many=True, context={"request": request}).data
        )

    serializer = TeamCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    with transaction.atomic():
        team = Team.objects.create(created_by=request.user, **serializer.validated_data)
        TeamMembership.objects.create(
            user=request.user, team=team, role=TeamMembership.Role.OWNER
        )
    return Response(
        TeamSerializer(team, context={"request": request}).data,
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def team_detail(request, team_id):
    team, membership = get_team_and_membership(request.user, team_id)

    if request.method == "GET":
        return Response(TeamSerializer(team, context={"request": request}).data)

    if request.method == "PATCH":
        if membership.role not in [TeamMembership.Role.OWNER, TeamMembership.Role.ADMIN]:
            raise PermissionDenied("Only owners and admins can edit team settings.")
        name = request.data.get("name")
        description = request.data.get("description")
        if name:
            team.name = name.strip()
        if description is not None:
            team.description = description.strip()
        team.save()
        return Response(TeamSerializer(team, context={"request": request}).data)

    if request.method == "DELETE":
        if membership.role != TeamMembership.Role.OWNER:
            raise PermissionDenied("Only the team owner can delete this workspace.")
        team.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def team_members(request, team_id):
    team, membership = get_team_and_membership(request.user, team_id)

    if request.method == "GET":
        members = team.memberships.select_related("user").order_by("joined_at")
        return Response(TeamMemberSerializer(members, many=True).data)

    # POST: Add teammate
    if membership.role not in [TeamMembership.Role.OWNER, TeamMembership.Role.ADMIN]:
        raise PermissionDenied("Only owners and admins can add team members.")

    serializer = AddMemberSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    target_user = None
    if data.get("email"):
        target_user = User.objects.filter(email__iexact=data["email"]).first()
        if not target_user:
            target_user = User.objects.filter(username__iexact=data["email"]).first()
    elif data.get("user_id"):
        target_user = User.objects.filter(id=data["user_id"]).first()

    if not target_user:
        raise ValidationError({"detail": "User not found with provided email/ID."})

    if TeamMembership.objects.filter(team=team, user=target_user).exists():
        raise ValidationError({"detail": "This user is already a member of this team."})

    new_member = TeamMembership.objects.create(
        team=team,
        user=target_user,
        role=data.get("role", TeamMembership.Role.MEMBER),
    )
    return Response(
        TeamMemberSerializer(new_member).data, status=status.HTTP_201_CREATED
    )


@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def team_member_detail(request, team_id, user_id):
    team, membership = get_team_and_membership(request.user, team_id)

    target_membership = get_object_or_404(TeamMembership, team=team, user_id=user_id)

    # Check permission
    if membership.role not in [TeamMembership.Role.OWNER, TeamMembership.Role.ADMIN]:
        raise PermissionDenied("Only owners and admins can manage members.")

    # Prevent removing last owner
    if target_membership.role == TeamMembership.Role.OWNER:
        owner_count = team.memberships.filter(role=TeamMembership.Role.OWNER).count()
        if owner_count <= 1:
            raise ValidationError({"detail": "A team must have at least one owner."})

    if request.method == "PATCH":
        new_role = request.data.get("role")
        if new_role not in [r.value for r in TeamMembership.Role]:
            raise ValidationError({"role": f"Invalid role. Choices are: {TeamMembership.Role.values}"})
        target_membership.role = new_role
        target_membership.save()
        return Response(TeamMemberSerializer(target_membership).data)

    if request.method == "DELETE":
        target_membership.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def leave_team(request, team_id):
    team, membership = get_team_and_membership(request.user, team_id)

    if membership.role == TeamMembership.Role.OWNER:
        owner_count = team.memberships.filter(role=TeamMembership.Role.OWNER).count()
        if owner_count <= 1:
            raise ValidationError({"detail": "As the sole owner, you cannot leave. Transfer ownership or delete the team."})

    membership.delete()
    return Response({"detail": "Successfully left the team."}, status=status.HTTP_200_OK)
