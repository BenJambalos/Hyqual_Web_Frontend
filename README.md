# HyQual Frontend

This folder is the standalone React/Vite web app. It can be developed
independently from the API and has its own `package.json` and lockfile.

From the repository root:

```sh
npm ci --prefix frontend
npm run dev --prefix frontend
```

The Vite dev server proxies `/api` requests to `http://localhost:3000`; start
the API separately with `npm start --prefix backend`. Production builds can be
created with `npm run build --prefix frontend`.

The app uses the backend's HTTP-only session cookies. If hosting the web app on
a separate public domain, coordinate CORS and cross-site cookie settings in the
backend before deploying it independently.


## Deploying the frontend separately from the backend

If the React frontend and Node.js backend are deployed as separate Railway services, configure `VITE_API_BASE_URL` in the **frontend service** to the backend's public origin, for example `https://your-backend-domain.up.railway.app` (do not append `/api`). Rebuild/redeploy the frontend after changing this variable. If the backend serves the built frontend from the same origin, leave `VITE_API_BASE_URL` empty.

The backend's `CORS_ORIGIN` must include the frontend's exact public origin when they are separate services. The backend exposes `GET /api/health` for a non-authenticated backend/database check. ML analytics requires a signed-in session.
