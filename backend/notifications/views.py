from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import Notification
from .serializers import NotificationSerializer


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def notification_list(request):
    """Return all notifications for the current user (unread first)."""
    notifs = Notification.objects.filter(recipient=request.user).order_by("is_read", "-created_at")[:50]
    return Response(NotificationSerializer(notifs, many=True).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_all_read(request):
    """Mark all notifications as read for the current user."""
    Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
    return Response({"detail": "All notifications marked as read."})


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def mark_one_read(request, notif_id):
    """Mark a single notification as read."""
    try:
        notif = Notification.objects.get(id=notif_id, recipient=request.user)
        notif.is_read = True
        notif.save()
        return Response(NotificationSerializer(notif).data)
    except Notification.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def clear_all(request):
    """Delete all read notifications for the current user."""
    Notification.objects.filter(recipient=request.user, is_read=True).delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def unread_count(request):
    """Return just the unread count for fast polling."""
    count = Notification.objects.filter(recipient=request.user, is_read=False).count()
    return Response({"unread": count})
