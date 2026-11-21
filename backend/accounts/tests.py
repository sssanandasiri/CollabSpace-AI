from django.test import TestCase
from rest_framework.test import APIClient


class AuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.payload = {"name": "Alice", "email": "Alice@Example.com", "password": "StrongPass123"}

    def test_register_login_me_logout(self):
        r = self.client.post("/api/auth/register/", self.payload, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data["user"]["email"], "alice@example.com")
        self.assertNotIn("password", r.data["user"])

        r = self.client.post("/api/auth/login/", {"email": "alice@example.com", "password": "StrongPass123"}, format="json")
        self.assertEqual(r.status_code, 200)
        token = r.data["token"]

        self.assertEqual(self.client.get("/api/auth/me/").status_code, 401)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
        self.assertEqual(self.client.get("/api/auth/me/").data["name"], "Alice")

        self.assertEqual(self.client.post("/api/auth/logout/").status_code, 204)
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 401)

    def test_duplicate_email_and_weak_password(self):
        self.client.post("/api/auth/register/", self.payload, format="json")
        r = self.client.post("/api/auth/register/", self.payload, format="json")
        self.assertEqual(r.status_code, 400)
        r = self.client.post("/api/auth/register/", {"name": "B", "email": "b@x.com", "password": "12345678"}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_wrong_password(self):
        self.client.post("/api/auth/register/", self.payload, format="json")
        r = self.client.post("/api/auth/login/", {"email": "alice@example.com", "password": "nope"}, format="json")
        self.assertEqual(r.status_code, 401)
