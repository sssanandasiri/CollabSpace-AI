import io
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient

from teams.models import Team, TeamMembership
from tasks.models import Task, TaskActivity
from documents.models import Document, ChatSession, ChatMessage
from knowledge.models import KnowledgeNote, SubmissionRequirement


class CollabSpaceEndToEndTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user1 = User.objects.create_user(
            username="student1@uni.edu",
            email="student1@uni.edu",
            password="Password123!",
            first_name="Student One",
        )
        self.user2 = User.objects.create_user(
            username="student2@uni.edu",
            email="student2@uni.edu",
            password="Password123!",
            first_name="Student Two",
        )
        r = self.client.post("/api/auth/login/", {"email": "student1@uni.edu", "password": "Password123!"})
        self.token1 = r.data["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token1}")

    def test_full_project_workflow(self):
        # 1. Create team
        r = self.client.post("/api/teams/", {"name": "Software Engineering Team 4", "description": "Assignment 2 Workspace"})
        self.assertEqual(r.status_code, 201)
        team_id = r.data["id"]

        # 2. Add teammate
        r = self.client.post(f"/api/teams/{team_id}/members/", {"email": "student2@uni.edu", "role": "member"})
        self.assertEqual(r.status_code, 201)

        # Verify members
        r = self.client.get(f"/api/teams/{team_id}/members/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data), 2)

        # 3. Create tasks (Kanban)
        r = self.client.post(f"/api/teams/{team_id}/tasks/", {
            "title": "Design Database Schema",
            "description": "Design MySQL ER diagram and write DDL",
            "priority": "high",
            "status": "todo",
            "assignee": self.user2.id,
        })
        self.assertEqual(r.status_code, 201)
        task_id = r.data["id"]

        # Update task status to in_progress then done
        r = self.client.patch(f"/api/teams/{team_id}/tasks/{task_id}/", {"status": "in_progress"})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["status"], "in_progress")

        r = self.client.patch(f"/api/teams/{team_id}/tasks/{task_id}/", {"status": "done"})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["status"], "done")

        # 4. Upload project document (TXT/PDF simulation)
        brief_content = (
            "CollabSpace Software Engineering Assignment Brief.\n"
            "Objective: Develop a collaborative student platform.\n"
            "Requirements:\n"
            "1. Define the problem and system objectives.\n"
            "2. Document the functional requirements.\n"
            "3. Design the system architecture and database.\n"
            "4. Prepare a testing plan and final report.\n"
            "Deliverables must be submitted before Friday."
        )
        fake_file = SimpleUploadedFile("Assignment_Brief.txt", brief_content.encode("utf-8"), content_type="text/plain")
        r = self.client.post(f"/api/teams/{team_id}/documents/", {"file": fake_file, "title": "Assignment_Brief.txt"})
        self.assertEqual(r.status_code, 201)
        doc_id = r.data["id"]

        # Verify document chunking
        r = self.client.get(f"/api/teams/{team_id}/documents/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data), 1)

        # 5. Project Knowledge AI Q&A
        r = self.client.post(f"/api/teams/{team_id}/chat/quick-ask/", {
            "question": "What are the main requirements of our assignment and what should we do next?"
        })
        self.assertEqual(r.status_code, 200)
        self.assertIn("requirements", r.data["answer"].lower())
        self.assertTrue(len(r.data["sources"]) > 0)
        self.assertEqual(r.data["sources"][0]["document_title"], "Assignment_Brief.txt")

        # 6. Meeting Notes & turn into tasks
        r = self.client.post(f"/api/teams/{team_id}/notes/", {
            "title": "Sprint 1 Sync Minutes",
            "category": "meeting_notes",
            "content": "Discussed assignment brief.\nAction items:\n- Implement authentication views\n- Design MySQL relational schema\n- Write unit tests for API",
        })
        self.assertEqual(r.status_code, 201)
        note_id = r.data["id"]

        # Extract tasks from note
        r = self.client.post(f"/api/teams/{team_id}/notes/{note_id}/suggest-tasks/")
        self.assertEqual(r.status_code, 200)
        self.assertTrue(len(r.data["suggested_tasks"]) >= 2)

        # Create tasks from note
        suggested = r.data["suggested_tasks"]
        r = self.client.post(
            f"/api/teams/{team_id}/notes/{note_id}/create-tasks/",
            {"tasks": suggested[:2]},
            format="json",
        )
        self.assertEqual(r.status_code, 201)

        # 7. Submission Readiness Checker
        r = self.client.post(f"/api/teams/{team_id}/readiness/auto-extract/")
        self.assertEqual(r.status_code, 201)

        r = self.client.get(f"/api/teams/{team_id}/readiness/")
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data["summary"]["total_requirements"] > 0)

        # 8. Fair Contribution History & Activity Timeline
        r = self.client.get(f"/api/teams/{team_id}/activities/")
        self.assertEqual(r.status_code, 200)
        self.assertTrue(len(r.data) >= 3)

        r = self.client.get(f"/api/teams/{team_id}/contribution-stats/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["team_summary"]["total_tasks"], 3)
