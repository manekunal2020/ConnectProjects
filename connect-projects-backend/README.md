# Connect Projects — Express backend starter

This is a starter backend for the uploaded Connect Projects React + Vite frontend. It provides a working local REST API with JWT authentication and JSON-file persistence. It does **not** require MongoDB or a separate database server.

## Requirements
- Node.js 18 or newer
- npm

## Setup in VS Code (PowerShell)
1. Extract this ZIP into a folder, for example `C:\Users\<you>\Downloads\Connect Projects\backend`.
2. In VS Code choose **File → Open Folder** and open the extracted `backend` folder.
3. Choose **Terminal → New Terminal**. Confirm the prompt is inside the backend folder (`PS ...\backend>`).
4. Create your local environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

5. Open `.env` and replace `JWT_SECRET` with a long random secret (at least 24 characters). To enable scheduled report emails and password resets, also set `EMAIL_USER` and `EMAIL_APP_PASSWORD` to a Gmail account and its app password. Keep `.env` private; do not upload it or commit it.
6. Install and start:

   ```powershell
   npm install
   npm run dev
   ```

   If PowerShell blocks `npm.ps1`, use `npm.cmd install` and `npm.cmd run dev` instead.
7. Test in a browser: `http://localhost:5000/api/health`. Expected response: `{"status":"ok","service":"connect-projects-api"}`.

## Starter sign-in accounts
These match the demo accounts shown in the current frontend. The backend stores password hashes, not plain-text passwords.

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | `admin123` |
| Project Lead | `lead` | `lead123` |
| Team Member | `member` | `member123` |

Change these credentials and configure a production-grade database before deploying or using real data. These are development-only starter credentials.

## API routes
All routes except health and login require `Authorization: Bearer <token>`.

- `POST /api/auth/login` — body `{ "username": "admin", "password": "..." }`; returns `{ token, user }`.
- `GET /api/auth/me` — returns the authenticated user.
- `GET /api/dashboard` — dashboard summary, projects, tasks, activity and workload.
- `GET /api/projects`, `POST /api/projects`, `PATCH /api/projects/:id`, `DELETE /api/projects/:id`.
- `GET /api/tasks`, `POST /api/tasks`, `PATCH /api/tasks/:id`, `DELETE /api/tasks/:id`.
- `GET /api/tickets` — list tickets visible to the authenticated user, including SLA targets and response/resolution timestamps used by Reports & analytics.
- `GET /api/reports/schedules` — list the current user's email report schedules.
- `POST /api/reports/schedules` — schedule a daily, weekly, or monthly ticket report.
- `DELETE /api/reports/schedules/:id` — remove the current user's schedule.
- `GET /api/users`, `POST /api/users`, `DELETE /api/users/:id`.

The Reports & analytics page calculates productivity, SLA compliance, and pending-ticket ageing from ticket data. CSV and Excel-compatible exports are downloaded directly; PDF uses the browser print dialog. The API checks due schedules every 30 seconds and emails the report to the configured recipient at the selected time zone. Email delivery requires `EMAIL_USER` and `EMAIL_APP_PASSWORD`.

Role rules are enforced in the API: Admin can manage users and delete projects; Admin and Project Lead can create/update projects and manage tasks; Team Member can read their assigned tasks and update their own task status.

## Data storage
The first server start creates `data/db.json` with sample records. Changes persist in this file. This JSON-file store is suitable for local development and demonstration only. For production, migrate to PostgreSQL, MySQL or MongoDB, add validation/audit logging/rate limiting, configure HTTPS and secure token handling, and replace the starter credentials.

## Connect the frontend
The frontend ZIP currently uses demo authentication and hardcoded dashboard arrays; this backend ZIP alone does not modify those frontend files. The frontend needs to be updated to:
1. POST credentials to `http://localhost:5000/api/auth/login`.
2. Store the returned token using an appropriate secure session strategy and send `Authorization: Bearer <token>` with protected API requests.
3. Load dashboard/projects/tasks from the API instead of the hardcoded arrays.

A Vite development proxy can be configured to forward `/api` to `http://localhost:5000`. Do not expose secrets in frontend environment variables.
