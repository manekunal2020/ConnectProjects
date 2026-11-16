# Connect Projects

Connect Projects is a React + Vite frontend backed by a Spring Boot API and PostgreSQL database.

## Run locally

1. In PowerShell, copy the example settings: `Copy-Item .env.example .env`.
2. Replace the example passwords and JWT secret in `.env`.
3. From this folder, run `docker compose up --build` to start PostgreSQL and the API.
4. In a second terminal, run `npm install` and `npm run dev`, then open http://localhost:5173.

The backend creates the first Super User from the `BOOTSTRAP_SUPERUSER_*` settings. The configured Super User email is `manekunal2020@gmail.com`; on startup, the backend replaces an existing bootstrap placeholder email with this address. Passwords are BCrypt-hashed; API sessions use JWTs.

## Backend features

The Spring Boot API is the source of truth for authentication and application data. PostgreSQL schema changes are managed by Flyway. The API provides account requests, password reset and profile updates, role-based permissions, user management, projects, tasks, tickets and history, dashboard metrics, report data, and scheduled reports. Admins and Super Users with task permissions can assign tasks to any enabled user. Project setup adds clients, project manager and team-leader assignments, support shifts, priorities, ticket categories, and project-specific SLA targets to the existing projects.

SMTP is optional for general use. For the existing Gmail setup, copy the address from `connect-projects-backend/.env`'s `EMAIL_USER` into `MAIL_USERNAME` in the project-root `.env`, and copy `EMAIL_APP_PASSWORD` into `MAIL_PASSWORD`. The sender address defaults to `MAIL_USERNAME`, so it uses that same email address; set `MAIL_FROM` only if you later want a different sender. You can update these values in `.env` at any time. `MAIL_HOST` and `MAIL_PORT` are configurable for other providers. Report schedules use the creator's selected time zone. Without SMTP configuration, email-dependent operations return an error rather than silently succeeding.

Reports & analytics includes daily, weekly, and monthly views, productivity and SLA metrics, ticket ageing, charts, CSV/Excel-compatible exports, recurring email schedules with up to 10 recipients, and a per-user history of the 50 most recent successful recipient deliveries.

The older `connect-projects-backend/` Express implementation is not used by the application runtime. Vite proxies `/api` to the Spring Boot service on port 8080.

## Deployment

The repository includes `netlify.toml` for the Vite build and single-page-app routing. Build the frontend with `npm run build` and publish `dist`. Deploy the Spring Boot API and PostgreSQL separately; configure `VITE_API_BASE_URL` to the public API origin at frontend build time and set the API's `CORS_ALLOWED_ORIGINS`. Use managed database and secret-manager values in production, not development secrets.

## Structure

- `src/auth/authService.js` — API requests and client session handling
- `src/pages/Login.jsx` — sign-in and account-request flows
- `src/pages/Dashboard.jsx` — permission-aware navigation and dashboard
- `src/pages/WorkspacePage.jsx` — projects, tasks, tickets, and profile settings
- `src/pages/ProjectManagementPage.jsx` — project clients, teams, support hours, categories, priorities, and SLAs
- `src/pages/ReportsPage.jsx` — report metrics, charts, exports, and email schedules
- `backend/` — Spring Boot API, PostgreSQL integration, and Flyway migrations (including project configuration V3 and report delivery history V4)
