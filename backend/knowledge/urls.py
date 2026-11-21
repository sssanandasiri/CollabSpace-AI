from django.urls import path
from . import views

urlpatterns = [
    path("teams/<int:team_id>/notes/", views.note_list),
    path("teams/<int:team_id>/notes/<int:note_id>/", views.note_detail),
    path("teams/<int:team_id>/notes/<int:note_id>/suggest-tasks/", views.suggest_tasks_from_note),
    path("teams/<int:team_id>/notes/<int:note_id>/create-tasks/", views.create_tasks_from_note),
    path("teams/<int:team_id>/readiness/", views.readiness_overview),
    path("teams/<int:team_id>/readiness/<int:req_id>/", views.requirement_detail),
    path("teams/<int:team_id>/readiness/auto-extract/", views.auto_extract_requirements),
]
