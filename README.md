# Connect Projects

Combined React + Vite application: sign in first, then open the project dashboard.
The dashboard data and sign-in accounts are demo data; no backend is connected.

## Run locally

From the repository root:

```sh
npm install
npm run dev
```

Open the local URL printed by Vite (normally http://localhost:5173).

## Demo sign-ins

| Role | Username | Password |
| --- | --- | --- |
| Admin | `admin` | `admin123` |
| Project Lead | `lead` | `lead123` |
| Team Member | `member` | `member123` |

Use **Sign out** in the dashboard to return to the login screen. The signed-in
demo user is kept in session storage for the current browser tab.

## Deploy the combined app to Netlify

The GitHub repository `manekunal2020/connect-projects-dashboard` is the
combined app repository. Its root contains the Vite app, so Netlify should
build from the repository root.

1. Push the latest `main` branch to
   https://github.com/manekunal2020/connect-projects-dashboard.
2. Sign in to Netlify and choose **Add new site** → **Import an existing project**.
3. Choose GitHub, authorize Netlify if asked, and select
   `manekunal2020/connect-projects-dashboard`.
4. Configure the site:
   - **Base directory:** leave blank (repository root)
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Environment variables:** none required for this demo
5. Choose **Deploy site**. Netlify installs dependencies and publishes the
   generated `dist` directory.
6. Open the Netlify site URL and sign in with one of the demo accounts above.
   Later pushes to `main` trigger a new deploy automatically.

The checked-in `netlify.toml` already defines the build command, publish
directory, and single-page-app fallback so direct page refreshes work.

## Important: demo authentication

The demo usernames/passwords are included in browser-delivered JavaScript.
This login is for demonstration only; it is not secure authentication and
must not be used to protect real data. Before production use, connect a
backend authentication API, enforce authorization on that backend, and remove
the demo accounts from the login screen.

## Project layout

- `src/auth/authService.js` — demo sign-in and session storage
- `src/pages/Login.jsx` — login page
- `src/pages/Dashboard.jsx` — dashboard and mock project data
- `netlify.toml` — Netlify build and SPA routing configuration
