from django.urls import path
from . import views

urlpatterns = [
    path("teams/<int:team_id>/tasks/", views.task_list),
    path("teams/<int:team_id>/tasks/<int:task_id>/", views.task_detail),
    path("teams/<int:team_id>/activities/", views.team_activities),
    path("teams/<int:team_id>/contribution-stats/", views.contribution_stats),
]
