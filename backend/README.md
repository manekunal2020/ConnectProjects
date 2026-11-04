# Connect Projects Account API

Spring Boot 3 / Java 17 API backed by PostgreSQL. Flyway manages the schema; account passwords are BCrypt-hashed and API sessions use short-lived JWTs.

## Run locally with Docker

From the `Login` project folder in PowerShell:

```powershell
Copy-Item .env.example .env
```

Edit `.env` and replace all example passwords/secrets with private values. Then run:

```powershell
docker compose up --build
```

The API listens on `http://localhost:8080`. The first Super User is created from the three `BOOTSTRAP_SUPERUSER_*` values. Keep those credentials private. To run the Vite frontend separately:

```powershell
npm run dev
```

Vite proxies `/api` requests to the local backend. For production, set `VITE_API_BASE_URL` to the public API origin at frontend build time, configure `CORS_ALLOWED_ORIGINS`, and use managed PostgreSQL and secret-manager values. Do not expose local `.env` values.

## Account enquiry API

- `POST /api/account-requests` (public): submit `{ "name", "username", "email" }`. The request is saved as pending; it does not create an account.
- `GET /api/account-requests` (Super User JWT): list pending enquiries.
- `POST /api/account-requests/{id}/approve` (Super User JWT): submit `{ "password" }`. This creates a Project Lead account with the supplied password and marks the enquiry approved.
- `POST /api/account-requests/{id}/reject` (Super User JWT): decline a pending enquiry.
- `POST /api/auth/login` (public): submit `{ "username", "password" }`; response contains a bearer token and user profile.

The Super User must share the temporary password with the approved applicant securely. No email sender is configured.
