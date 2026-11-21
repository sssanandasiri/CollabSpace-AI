# CollabSpace AI

**An AI-powered university group collaboration and project management platform.**

CollabSpace AI is a web-based platform designed to help university students organize group assignments, manage tasks, collaborate on documents, and monitor team progress through AI-assisted features.

The platform brings project management, document handling, knowledge management, and collaboration tools together in one workspace.

## Key Features

- **User Authentication** – User registration, login, and account management.
- **Dashboard** – A centralized workspace for accessing collaboration tools.
- **Team Management** – Backend functionality for managing teams.
- **Task Management** – Organize and manage group assignment tasks.
- **Document Management** – Upload, access, and manage project documents.
- **AI Features** – AI-assisted tools for academic collaboration and document-related workflows.
- **Knowledge Hub** – Organize and access shared project knowledge.
- **Knowledge AI** – AI-powered knowledge-related functionality.
- **Fair Contribution Tracking** – Support monitoring individual contributions within group work.
- **Readiness Checker** – Tools to help evaluate project readiness.
- **Notifications** – Keep users informed about relevant activities.

## Technology Stack

| Area | Technologies |
|---|---|
| Frontend | React, TypeScript |
| Backend | Python, Django, Django REST Framework |
| Database | MySQL-compatible configuration |
| Frontend tooling | Vite, ESLint |
| API communication | REST API |

## Project Structure

```text
CollabSpace-AI/
│
├── backend/
│   ├── accounts/
│   ├── config/
│   ├── documents/
│   ├── knowledge/
│   ├── notifications/
│   ├── tasks/
│   ├── teams/
│   ├── manage.py
│   ├── requirement.txt
│   └── .env.example
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── api.ts
│   │   ├── AuthContext.tsx
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
│
└── .gitignore
```

## Getting Started

### Prerequisites

Make sure you have installed:

- Python
- Node.js and npm
- A compatible database configured for the backend

### 1. Clone the Repository

```bash
git clone https://github.com/sssanandasiri/CollabSpace-AI.git
cd CollabSpace-AI
```

### 2. Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Create and activate a virtual environment:

```bash
python -m venv venv
```

Windows PowerShell:

```powershell
.\venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirement.txt
```

Create your environment file:

```powershell
Copy-Item .env.example .env
```

Update the environment variables in `.env` with your local database configuration and Django secret key.

Run migrations:

```bash
python manage.py migrate
```

Start the Django development server:

```bash
python manage.py runserver
```

### 3. Frontend Setup

Open another terminal and navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local URL displayed by Vite in your browser.

## Current Development Status

CollabSpace AI is an ongoing software engineering project. New features, improvements, and refinements are being developed as the project progresses.

## Future Improvements

- Further enhance AI-powered collaboration capabilities.
- Improve team analytics and contribution insights.
- Enhance document processing and knowledge management.
- Improve application security and performance.
- Deploy the application for public access.

## Author

**Shalani S. Abhisheka**

Software Engineering Undergraduate

[GitHub](https://github.com/sssanandasiri)

---

*Built to make university group collaboration smarter, more organized, and more effective.*
