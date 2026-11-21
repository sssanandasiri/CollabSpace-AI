from django.urls import path
from . import views

urlpatterns = [
    # Documents
    path("teams/<int:team_id>/documents/",            views.document_list_create),
    path("teams/<int:team_id>/documents/<int:doc_id>/", views.document_detail),

    # Chat sessions
    path("teams/<int:team_id>/chat/sessions/",                              views.chat_sessions),
    path("teams/<int:team_id>/chat/sessions/<int:session_id>/",             views.chat_session_delete),
    path("teams/<int:team_id>/chat/sessions/<int:session_id>/messages/",    views.session_messages),
    path("teams/<int:team_id>/chat/quick-ask/",                             views.quick_ask),

    # AI Feature endpoints
    path("teams/<int:team_id>/ai/analyze-assignment/", views.ai_analyze_assignment),
    path("teams/<int:team_id>/ai/progress-advice/",    views.ai_progress_advice),
    path("teams/<int:team_id>/ai/summarize/",           views.ai_summarize_document),
    path("teams/<int:team_id>/ai/generate-tasks/",      views.ai_generate_tasks),
    path("teams/<int:team_id>/ai/approve-tasks/",       views.ai_approve_tasks),
]
