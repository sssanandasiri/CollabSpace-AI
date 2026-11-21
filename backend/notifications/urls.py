from django.urls import path
from . import views

urlpatterns = [
    path("notifications/",                    views.notification_list),
    path("notifications/unread-count/",       views.unread_count),
    path("notifications/mark-all-read/",      views.mark_all_read),
    path("notifications/clear/",              views.clear_all),
    path("notifications/<int:notif_id>/read/",views.mark_one_read),
]
