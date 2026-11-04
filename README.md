# Connect Projects - Frontend (Login + Dashboard)

React + Vite frontend for the Connect Projects Platform.

## Run
    npm install
    npm run dev

Open http://localhost:5173

## Account requests
- Applicants submit their name, requested username, and email from the sign-in page.
- A Super User reviews enquiries under **Account requests**. Approving an enquiry creates a Project Lead account with a temporary password set by the Super User.
- The Super User must share the temporary password with the applicant securely; email delivery is not configured.
- Forgot password requests must be handled by the Super User.

## Backend
The frontend requires the Spring Boot and PostgreSQL service in `backend/`.

1. In PowerShell, copy the example settings: `Copy-Item .env.example .env`.
2. Edit `.env` and replace every example password/secret with private values.
3. From this folder, run `docker compose up --build` to start PostgreSQL and the API.
4. In a second terminal, run `npm install` and `npm run dev`.

The backend bootstraps the first Super User from `BOOTSTRAP_SUPERUSER_USERNAME`, `BOOTSTRAP_SUPERUSER_PASSWORD`, and `BOOTSTRAP_SUPERUSER_NAME`. Passwords are BCrypt-hashed. For deployment, configure a managed PostgreSQL database, set all backend environment variables securely, and set `VITE_API_BASE_URL` to the backend's public origin. Do not use development secrets in production.

## Deploy the frontend to Netlify
The repository includes `netlify.toml` for the Vite build and single-page-app routing. Deploy the frontend from the repository root with `npm run build` and `dist` as the publish directory. Deploy the Spring Boot API and PostgreSQL separately, then set `VITE_API_BASE_URL` in Netlify to the public API origin and redeploy. The frontend cannot process account requests unless that API is reachable.

## Structure
- src/App.jsx                 shows Login until a user is signed in, then the Dashboard
- src/auth/authService.js     API login, account enquiries, approvals, and logout
- src/pages/Login.jsx / .css  login page
- src/pages/Dashboard.jsx / .css  dashboard (menu and panels change by role)
- backend/                    Spring Boot API and PostgreSQL migration

The dashboard project/task data remains mock data in `src/pages/Dashboard.jsx`.
