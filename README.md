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
