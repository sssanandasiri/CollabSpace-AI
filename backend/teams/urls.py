from django.urls import path
from . import views

urlpatterns = [
    path("teams/", views.team_list),
    path("teams/<int:team_id>/", views.team_detail),
    path("teams/<int:team_id>/members/", views.team_members),
    path("teams/<int:team_id>/members/<int:user_id>/", views.team_member_detail),
    path("teams/<int:team_id>/leave/", views.leave_team),
]
