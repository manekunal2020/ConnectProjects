# Connect Projects API

Spring Boot 3 / Java 17 API backed by PostgreSQL. Flyway manages the schema; account passwords are BCrypt-hashed and API sessions use JWTs.

## Run locally with Docker

From the `Login` project folder in PowerShell:

```powershell
Copy-Item .env.example .env
```

Edit `.env` and replace all example passwords/secrets with private values. Then run:

```powershell
docker compose up --build
```

The API listens on `http://localhost:8080`. The first Super User is created from the `BOOTSTRAP_SUPERUSER_*` values. The configured email is `manekunal2020@gmail.com`; the API also updates an existing bootstrap placeholder email on startup. The Super User can later change their email from Profile settings. Keep passwords private. To run the Vite frontend separately, use `npm run dev` from the `Login` folder; Vite proxies `/api` requests to the local API.

## API areas

- `/api/auth/*` — login, current profile, forgot password, and password reset
- `/api/account-requests` — public account enquiries and Super User approval/rejection
- `/api/users` — Super User user management and ticket assignees
- `/api/projects`, `/api/tasks`, `/api/tickets` — permission-checked work management; `/api/tasks/assignees` is restricted to Admins and Super Users with task access
- `/api/project-management/*` — clients and project-lead choices
- `/api/projects/{id}/shifts`, `/priorities`, `/categories`, `/slas` — per-project setup; uses the existing project and user records
- `/api/dashboard` — role-scoped dashboard summaries
- `/api/reports/tickets`, `/api/reports/schedules`, `/api/reports/deliveries` — report data, automatic email report schedules, and the current user's 50 most recent successful deliveries

The current user must have the corresponding permission for protected operations. The Super User has full access; other users' permissions can be changed through User permissions. Team Member ticket and task data is scoped to their assignments.

Flyway migration `V3__add_project_management_configuration.sql` adds the project client/team links and support-shift, priority, category, subcategory, and SLA tables. Project setup reads and updates the same project records used by tasks and tickets; it does not create a second projects table.

Flyway migration `V4__add_report_delivery_history.sql` records successful scheduled report emails and imports each existing schedule's most recent known send into the delivery history.

Flyway migration `V5__add_report_schedule_recipients.sql` adds ordered recipients to report schedules and migrates each existing schedule's email address. A schedule supports up to 10 validated recipient addresses.

## Email reports and password reset

SMTP is optional. For the existing Gmail setup, copy the address from `connect-projects-backend/.env`'s `EMAIL_USER` into the project-root `.env` as `MAIL_USERNAME`, and copy `EMAIL_APP_PASSWORD` into `MAIL_PASSWORD`. The sender defaults to `MAIL_USERNAME`; set `MAIL_FROM` only to override it. These values remain editable in `.env`, and `MAIL_HOST`/`MAIL_PORT` can be changed for another provider. Scheduled reports use the requested time zone and daily, weekly, or monthly cadence. Email-dependent requests fail explicitly when mail is not configured.

## Deployment

For production, set `VITE_API_BASE_URL` to the public API origin at frontend build time, configure `CORS_ALLOWED_ORIGINS`, and use managed PostgreSQL and secret-manager values. Do not expose local `.env` values.
